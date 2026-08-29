// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
import database from './database_connection.js';
import { create_slug } from './slug_generator.js';
import { serializeTracks } from './entry_formatter.js';
import { sizedAlbumArt } from './music_data_api.js';

// Album art is sized on the way out rather than on the way in, so the row
// keeps whatever URL it was saved with — the full-resolution master. That's
// deliberate: the Echo session uses the big image as a full-screen backdrop,
// and a URL pasted by hand into the dashboard's album_art field gets sized
// down here too, without anyone having to remember to do it. The size is a
// read-time decision, so changing it later is a number, not a migration.
//
// Sized here in the data layer and not in the API routes because /shuffle
// calls pull_all_entries directly, without going through an HTTP endpoint.
const LIST_ART_PX = 600;   // grid tiles and the homepage strip — tens at once,
                           // none rendered wider than ~190pt
const ENTRY_ART_PX = 1200; // one album page, one cover, up to ~291pt on a
                           // phone — 1200 keeps it sharp at 3x

// The stored URL travels alongside the sized one as album_art_source. The
// dashboard's edit form binds to that: it seeds its fields from an entry and
// PATCHes the whole object back, so without this it would quietly save the
// 600px URL over the master the row was created with — and every later edit
// would size it down again from there.
function withSizedArt(row, px) {
  return { ...row, album_art: sizedAlbumArt(row.album_art, px), album_art_source: row.album_art };
}

// Who sent you an album is somebody else's name, and these reads all go out to
// the public site — the entry page hands its whole row to the browser, so a
// column nothing renders still ships in the HTML. The chain is private until
// there's a considered decision about showing it, so it's dropped on the way
// out unless the caller is holding a wristband and asks for it.
const CHAIN_FIELDS = ['source_entry_id', 'received_from', 'received_date'];

export function withoutChain(row) {
  if (!row) return row;
  const clean = { ...row };
  for (const field of CHAIN_FIELDS) delete clean[field];
  return clean;
}

// ── Listens ────────────────────────────────────────────────────────────────
// An album has many listens and each one is its own entry, so every entry sits
// somewhere in a sequence: the third time you played this record, of four.
//
// Counted at read time rather than written into a column. A stored number goes
// wrong the moment a listen in the middle is deleted, and it can only be fixed
// by rewriting rows — which is the thing the additive rule exists to avoid.
// Derived, it is never wrong and never needed a migration.
//
// Grouped on album_key, the generated column that already knows lower-cased
// artist + album with the accents flattened, so a Beyoncé listen and a Beyonce
// listen count as the same record.
//
// Ordered by created_at with id as the tie-break: two entries saved in the same
// second would otherwise swap places between reads, and a listen number that
// moves is worse than one that is arbitrary.
const WITH_LISTEN_NUMBERS = `
  SELECT *,
         ROW_NUMBER() OVER (PARTITION BY album_key ORDER BY created_at, id)::int AS listen_number,
         COUNT(*)     OVER (PARTITION BY album_key)::int                        AS listen_total
  FROM entries
`;

export async function pull_all_entries({ includeChain = false } = {}) {
  const rows = await database.query(
    `${WITH_LISTEN_NUMBERS} ORDER BY created_at DESC`
  );
  return rows.map(row => {
    const sized = withSizedArt(row, LIST_ART_PX);
    return includeChain ? sized : withoutChain(sized);
  });
}

// ── The public feed ────────────────────────────────────────────────────────
// What another journal is allowed to read. This is an allow-list rather than a
// blocklist on purpose: a column added later should stay private until someone
// decides otherwise, not leak because nobody remembered to exclude it.
//
// The writing is deliberately absent — no notes, no per-track notes, no
// background. A feed that carries the whole entry gives a reader no reason to
// visit the journal, which is the same rule the export card follows. What is
// here is enough to say *which record this was and how it landed*: the album,
// the rating, how it was heard, and a link.
//
// `horizon` is the borderline one and it's included. It's the track ratings
// drawn as blocks — the shape of a listen rather than anything written — and
// it makes a comparison between two people worth looking at. `tracks` and
// `track_notes` stay out; those are writing.
const PUBLIC_FIELDS = [
  'slug', 'album', 'artist', 'year', 'genre',
  'album_key', 'rating', 'rating_value', 'entry_type',
  'favorite', 'masterpiece', 'formative', 'horizon', 'album_art', 'created_at',
  'listen_number', 'listen_total',
];

export async function pull_public_entries() {
  // created_at is `timestamp without time zone` holding a UTC value, which the
  // driver reads as though it were local and "converts" — adding the reader's
  // offset to a time that was already UTC. On a machine at UTC-7 every entry
  // came back seven hours late, and a feed is exactly where that shows: dates
  // on items, and sorting against anyone else's.
  //
  // Casting to text in the query sidesteps the driver's conversion entirely
  // and gives the stored value verbatim, which can then be labelled UTC — the
  // one thing it actually is. Deterministic, and independent of wherever this
  // happens to be running.
  const rows = await database.query(
    `SELECT *, created_at::text AS created_at_utc
     FROM (${WITH_LISTEN_NUMBERS}) ranked
     ORDER BY created_at DESC`
  );
  // Picked in JS rather than named in the SELECT so the allow-list is applied
  // in exactly one place and cannot drift away from the list above.
  return rows.map(row => {
    const out = {};
    for (const field of PUBLIC_FIELDS) out[field] = row[field];
    out.album_art = sizedAlbumArt(row.album_art, LIST_ART_PX);
    out.created_at = row.created_at_utc
      ? row.created_at_utc.replace(' ', 'T') + 'Z'
      : null;
    return out;
  });
}

export async function pull_entry_by_slug(slug, { includeChain = false } = {}) {
  // The window has to run over the whole album before one row can be picked
  // out of it, so the filter goes outside rather than in the FROM.
  const result = await database.query(
    `SELECT * FROM (${WITH_LISTEN_NUMBERS}) ranked WHERE slug = $1 LIMIT 1`,
    [slug]
  );
  const row = result[0];
  if (!row) return null;
  const sized = withSizedArt(row, ENTRY_ART_PX);
  return includeChain ? sized : withoutChain(sized);
}

// Everything here belongs to one person until there are accounts to tell them
// apart — so "the owner" is simply the row that has been there longest.
//
// This used to look the owner up by a handle written into this file, and the
// handle was the first journal's name. Which made it a piece of that journal's
// identity doing structural work: a copy whose owner row was called anything
// else found nobody, silently, and started filing its entries against no user
// at all. Nothing in the software seeds that row either, so on a fresh copy
// the name it was looking for was never going to be there.
//
// Ordering by id rather than matching a string means it finds whoever set the
// copy up, whatever they called themselves. On a single-owner journal the two
// are the same row; the difference is that this one is true everywhere.
const OWNER_ROW = 'SELECT id FROM users ORDER BY id LIMIT 1';

// ── Discovery chain ────────────────────────────────────────────────────
// Where an album came from. source_entry_id points at the *sender's entry*,
// not at the album — null means this was a find of your own. Walking the
// column upward gives the whole lineage; that's the entire tree mechanic.
//
// Deliberately not a foreign key. An FK would either refuse to let you delete
// a mis-logged entry that something descends from, or quietly null out its
// children's source and rewrite their history. The chain is recorded fact, so
// a pointer at a deleted entry stays a pointer at a deleted entry — and since
// id is a serial that never reuses numbers, it can't drift onto a different
// album later. Phase 2 can draw that as an unknown node.

// Empty strings arrive from every text input on the form. The column means
// "nothing recorded", and '' is not that.
const blankToNull = v => (v === '' || v === undefined ? null : v);

// A source is an entries.id or nothing. Anything unparseable is nothing —
// better an unrecorded origin than a pointer at whatever row id 0 rounds to.
function entryRef(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// An album can't be sent back up its own chain. Walks from the proposed source
// upward looking for the entry being edited, so both self-linking and the
// longer A→B→C→A loops are caught. The depth guard is belt-and-braces: nothing
// should be able to write a cycle, but a recursive CTE that meets one never
// returns.
async function wouldFormCycle(entry_id, source_entry_id) {
  if (!entry_id || !source_entry_id) return false;
  if (entry_id === source_entry_id) return true;
  const hit = await database`
    WITH RECURSIVE chain(id, source_entry_id, depth) AS (
      SELECT id, source_entry_id, 1 FROM entries WHERE id = ${source_entry_id}
      UNION ALL
      SELECT e.id, e.source_entry_id, c.depth + 1
        FROM entries e JOIN chain c ON e.id = c.source_entry_id
       WHERE c.depth < 50
    )
    SELECT 1 FROM chain WHERE id = ${entry_id} LIMIT 1
  `;
  return hit.length > 0;
}

// masterpiece is a column, not a rating. The session used to write the word
// into `rating` instead of setting the boolean, which cost the star score, left
// the column false, and — because parseFloat('Masterpiece') is NaN — drew no
// stars at all on the entry it produced.
// ── Slugs ──────────────────────────────────────────────────────────────────
// An album gets listened to more than once, and each listen is its own entry
// rather than an overwrite. That breaks the old arrangement: the slug came
// from the album title alone, and (user_id, slug) is unique, so the second
// listen of In Rainbows produced `in-rainbows` a second time and the save died
// on a constraint violation.
//
// So the first entry for a title keeps the bare slug — every URL already
// posted, linked or printed on a card stays exactly where it is — and later
// ones take the next free number after it.
//
// The number is NOT the listen number, deliberately. Two different albums can
// share a title (Blue, 1, Untitled), and those collide here while being
// unrelated records. Listen number is counted from album_key, which knows the
// artist; this only has to produce an address nobody else is using.
//
// A title made entirely of punctuation slugs to nothing — !!! is a real band —
// so there is a floor to fall back to.
const SLUG_FLOOR = 'entry';

async function next_free_slug(album) {
  const base = create_slug(album) || SLUG_FLOOR;

  // Checked across every entry rather than per owner. The index is on
  // (user_id, slug), so a globally free slug is always free — and it avoids
  // guessing the owner here, which the INSERT below only resolves later.
  const rows = await database`
    SELECT slug FROM entries WHERE slug = ${base} OR slug LIKE ${base + '-%'}
  `;
  const taken = new Set(rows.map(r => r.slug));
  if (!taken.has(base)) return base;

  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export async function save_new_entry(body) {
  const {
    album, artist, year, genre = '', entry_type, relationship,
    rating, favorite, masterpiece = false, formative = false, background = '', notes,
    track_notes, horizon, album_art, post_link, tracks = null,
    source_entry_id = null, received_from = null, received_date = null,
    user_id = null
  } = body;

  const slug = await next_free_slug(album);

  const result = await database`
    INSERT INTO entries (
      album, artist, year, genre, entry_type, relationship,
      rating, favorite, masterpiece, formative, background, notes, track_notes,
      horizon, album_art, post_link, slug, tracks,
      source_entry_id, received_from, received_date, user_id
    ) VALUES (
      ${album}, ${artist}, ${year}, ${genre}, ${entry_type}, ${relationship},
      ${rating}, ${favorite}, ${masterpiece}, ${formative}, ${background}, ${notes},
      ${track_notes},
      ${horizon}, ${album_art}, ${post_link}, ${slug},
      ${tracks ? JSON.stringify(tracks) : null},
      ${entryRef(source_entry_id)}, ${blankToNull(received_from)},
      ${blankToNull(received_date)},
      COALESCE(${entryRef(user_id)}, (SELECT id FROM users ORDER BY id LIMIT 1))
    )
    RETURNING *
  `;
  return result[0];
}

// album_key and rating_value are GENERATED ALWAYS columns — Postgres derives
// them from album/artist and rating/masterpiece, and rejects any attempt to
// write them. They are deliberately absent from the SET list below and from
// the INSERT above; adding either is an error, not a convenience.
export async function update_entry(slug, fields) {
  // The chain fields can't ride the COALESCE block below, because COALESCE
  // reads null as "leave it alone" and these three need to be clearable —
  // "actually this was my own find" is a real edit, and an entry that can be
  // given a source but never stripped of one is a trap. So each is applied
  // only when the caller actually sent the key, and null then means null.
  const touched = key => Object.prototype.hasOwnProperty.call(fields, key);
  const set_source = touched('source_entry_id');
  const set_from = touched('received_from');
  const set_date = touched('received_date');
  const source_entry_id = set_source ? entryRef(fields.source_entry_id) : null;

  if (set_source && source_entry_id) {
    const row = await database`SELECT id FROM entries WHERE slug = ${slug} LIMIT 1`;
    if (await wouldFormCycle(row[0]?.id, source_entry_id)) {
      throw new Error('That would send this album back up its own chain.');
    }
  }

  // Editing tracks re-derives both text shapes from them here rather than in the
  // caller, so there's no way to update the track list and leave the prose
  // stars or the horizon behind.
  if (Array.isArray(fields.tracks)) {
    const derived = serializeTracks(fields.tracks);
    fields.track_notes = derived.track_notes;
    fields.horizon = derived.horizon;
  }

  const result = await database`
    UPDATE entries SET
      tracks = COALESCE(${fields.tracks ? JSON.stringify(fields.tracks) : null}::jsonb, tracks),
      masterpiece = COALESCE(${fields.masterpiece ?? null}, masterpiece),
      formative = COALESCE(${fields.formative ?? null}, formative),
      album = COALESCE(${fields.album ?? null}, album),
      artist = COALESCE(${fields.artist ?? null}, artist),
      year = COALESCE(${fields.year ?? null}, year),
      genre = COALESCE(${fields.genre ?? null}, genre),
      entry_type = COALESCE(${fields.entry_type ?? null}, entry_type),
      relationship = COALESCE(${fields.relationship ?? null}, relationship),
      rating = COALESCE(${fields.rating ?? null}, rating),
      favorite = COALESCE(${fields.favorite ?? null}, favorite),
      background = COALESCE(${fields.background ?? null}, background),
      notes = COALESCE(${fields.notes ?? null}, notes),
      track_notes = COALESCE(${fields.track_notes ?? null}, track_notes),
      horizon = COALESCE(${fields.horizon ?? null}, horizon),
      album_art = COALESCE(${fields.album_art ?? null}, album_art),
      post_link = COALESCE(${fields.post_link ?? null}, post_link),
      -- Stamped only when the writing actually changed, and compared against
      -- the row's own current values inside the same statement — which is the
      -- only place both the old and the new are in hand at once. Correcting a
      -- year or toggling a favourite leaves this alone: those are filing, not
      -- rewriting, and a stamp that moved for either would stop meaning
      -- anything. Comparing tracks covers track_notes and horizon too, since
      -- both are derived from it a few lines above.
      edited_at = CASE
        WHEN (${fields.notes ?? null}::text IS NOT NULL
              AND ${fields.notes ?? null}::text IS DISTINCT FROM notes)
          OR (${fields.tracks ? JSON.stringify(fields.tracks) : null}::jsonb IS NOT NULL
              AND ${fields.tracks ? JSON.stringify(fields.tracks) : null}::jsonb IS DISTINCT FROM tracks)
        THEN NOW() ELSE edited_at END,
      source_entry_id = CASE WHEN ${set_source} THEN ${source_entry_id}::int ELSE source_entry_id END,
      received_from = CASE WHEN ${set_from} THEN ${set_from ? blankToNull(fields.received_from) : null}::text ELSE received_from END,
      received_date = CASE WHEN ${set_date} THEN ${set_date ? blankToNull(fields.received_date) : null}::date ELSE received_date END
    WHERE slug = ${slug}
    RETURNING *
  `;
  return result[0] || null;
}

export async function delete_entry(slug) {
  await database`DELETE FROM entries WHERE slug = ${slug}`;
  return { deleted: true };
}

// ── Briefings ──────────────────────────────────────────────────────────
// A researched album is kept so the same listen never pays for the same web
// search twice. Album history doesn't change, so these are held indefinitely
// and only replaced when the user asks for fresh research.

// Album and artist as typed vary — casing, punctuation, "and" vs "&" — so the
// key is normalised the same way the iTunes lookups do it. Drafts key on the
// same shape: one unfinished listen per record, no matter how it was typed.
const lookup_key = (album, artist) =>
  `${album} ${artist}`.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();

export async function pull_briefing(album, artist) {
  const result = await database`
    SELECT brief, refreshed_at FROM briefings
    WHERE lookup_key = ${lookup_key(album, artist)} LIMIT 1
  `;
  return result[0] || null;
}

export async function save_briefing(album, artist, brief) {
  await database`
    INSERT INTO briefings (lookup_key, album, artist, brief)
    VALUES (${lookup_key(album, artist)}, ${album}, ${artist}, ${JSON.stringify(brief)})
    ON CONFLICT (lookup_key) DO UPDATE
      SET brief = EXCLUDED.brief, artist = EXCLUDED.artist,
          album = EXCLUDED.album, refreshed_at = NOW()
  `;
}

// ── Drafts ─────────────────────────────────────────────────────────────
// A listen that was saved and walked away from. One row per record — saving
// the same album twice overwrites the first, because there is only ever one
// unfinished listen of a given album in progress.
//
// The tracks column holds the whole tracklist with each song's marks on it
// rather than a sparse map of what was written, so a resumed session gets its
// track numbering back without waiting on Apple to answer again. Same shape as
// entries.tracks, with the untouched songs left in.

export async function pull_drafts() {
  return await database`
    SELECT * FROM drafts ORDER BY updated_at DESC
  `;
}

export async function save_draft(body) {
  const {
    album, artist, year = '', genre = '', entry_type = '', relationship = '',
    album_art = '', collection_id = '', step = 0, elapsed = 0,
    rating = 0, masterpiece = false, favorite = false, formative = false, notes = '', tracks = null,
  } = body;

  if (!album) throw new Error('A draft needs an album');

  const result = await database`
    INSERT INTO drafts (
      lookup_key, album, artist, year, genre, entry_type, relationship,
      album_art, collection_id, step, elapsed, rating, masterpiece, formative,
      favorite, notes, tracks
    ) VALUES (
      ${lookup_key(album, artist)}, ${album}, ${artist}, ${year}, ${genre},
      ${entry_type}, ${relationship}, ${album_art}, ${String(collection_id || '')},
      ${step}, ${elapsed}, ${rating}, ${masterpiece}, ${formative}, ${favorite}, ${notes},
      ${tracks ? JSON.stringify(tracks) : null}
    )
    ON CONFLICT (lookup_key) DO UPDATE SET
      album = EXCLUDED.album, artist = EXCLUDED.artist, year = EXCLUDED.year,
      genre = EXCLUDED.genre, entry_type = EXCLUDED.entry_type,
      relationship = EXCLUDED.relationship, album_art = EXCLUDED.album_art,
      collection_id = EXCLUDED.collection_id, step = EXCLUDED.step,
      elapsed = EXCLUDED.elapsed, rating = EXCLUDED.rating,
      masterpiece = EXCLUDED.masterpiece, formative = EXCLUDED.formative,
      favorite = EXCLUDED.favorite,
      notes = EXCLUDED.notes, tracks = EXCLUDED.tracks, updated_at = NOW()
    RETURNING *
  `;
  return result[0];
}

// Called both by the ✕ on the Listen page and by a finished session — once the
// entry is saved for real, the draft it grew out of has nothing left to hold.
export async function delete_draft(id) {
  await database`DELETE FROM drafts WHERE id = ${id}`;
  return { deleted: true };
}

export async function delete_draft_for_album(album, artist) {
  await database`DELETE FROM drafts WHERE lookup_key = ${lookup_key(album, artist)}`;
  return { deleted: true };
}
