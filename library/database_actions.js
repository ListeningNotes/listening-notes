// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
import database from './database_connection.js';
import { create_slug } from './slug_generator.js';
import { serializeTracks } from './entry_formatter.js';
import { sizedAlbumArt } from './music_data_api.js';

// Album art is sized on the way out rather than on the way in, so the row
// keeps whatever URL it was saved with — the full-resolution master. That's
// deliberate: the session uses the big image as a full-screen backdrop,
// and a URL pasted by hand into the dashboard's album_art field gets sized
// down here too, without anyone having to remember to do it. The size is a
// read-time decision, so changing it later is a number, not a migration.
//
// Sized here in the data layer and not in the API routes because server
// pages call these functions directly, without going through an HTTP endpoint.
const LIST_ART_PX = 600;   // grid tiles — tens at once,
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
// Ordered by posted_at with id as the tie-break: two entries saved in the same
// second would otherwise swap places between reads, and a listen number that
// moves is worse than one that is arbitrary.
// edited_at is the one stamp still stored without a zone (posted_at replaced
// created_at; this one has no readers outside the entry page and did not earn
// a second column). It holds a UTC clock reading, and the driver would hand
// it back as local time — so it is read here as the UTC it is, under its own
// name, which wins over the bare column from the * before it.
const WITH_LISTEN_NUMBERS = `
  SELECT *,
         (edited_at AT TIME ZONE 'UTC') AS edited_at,
         ROW_NUMBER() OVER (PARTITION BY album_key ORDER BY posted_at, id)::int AS listen_number,
         COUNT(*)     OVER (PARTITION BY album_key)::int                        AS listen_total
  FROM entries
`;

// ── The wall, and everything else that lists records ──────────────────────
// What a grid of covers, a search, a sort and the instant-open actually use.
// Deliberately not the writing: no notes, no track_notes, no tracks, no
// background.
//
// Measured on a 39-entry journal, a full row averages 8.5 kB and these fields
// average 0.3 kB — so 97% of what the archive pulled was text it never drew.
// And because the wall loads every entry to draw itself, that waste scaled
// with the journal: at 500 records a single page view moved 4.1 MB, which is
// about 1,200 views a month against a 5 GB allowance. The better the journal
// got, the less it could be read, which is exactly backwards.
//
// Nothing loses anything. handoff.js — the thing that makes an entry open with
// no wait — carries eleven fields and every one of them is here; the writing
// was always fetched separately when the layer opened. The archive's search
// covers album and artist, its filters cover genre and the three flags, and
// its sorts cover rating, year and date. All present.
//
// listen_number and listen_total are computed by the window rather than
// stored, which is why this selects from it rather than from entries.
const WALL_FIELDS = [
  'id', 'slug', 'album', 'artist', 'year', 'genre', 'album_key',
  'rating', 'rating_value', 'entry_type', 'favorite', 'masterpiece',
  'formative', 'horizon', 'album_art', 'posted_at',
  'listen_number', 'listen_total',
];

// One slug, chosen by the database. /shuffle used to read every entry and pick
// in JS, which is a whole journal crossing the wire to produce one URL.
// ── The owner row ─────────────────────────────────────────────────────────
// Written once, by setup, and by nothing else. Every entry files against it
// through the COALESCE in save_new_entry, and until it exists that resolves to
// NULL — which quietly voids the unique index on (user_id, slug), because
// Postgres counts NULLs as distinct from each other. So an unclaimed copy is
// one where two entries could take the same slug and the update that follows,
// which has no LIMIT, would rewrite both.
//
// The handle is derived, never asked. DECISIONS is explicit that a journal is
// named after whoever keeps it and that asking for a second name is the
// mistake journal_name already made — so this takes the keeper's name through
// the same create_slug the entries use, with the same kind of floor for the
// case where somebody finishes setup without naming themselves. Both columns
// are NOT NULL, which is why there is a floor at all.
//
// Inserts only into an empty table. ON CONFLICT (handle) was the first attempt
// and it is not the same guarantee: it stops a duplicate *name*, not a second
// owner, so a copy that already had a row got a second one under a different
// handle. The owner is singular — everything downstream reads it as
// `SELECT id FROM users ORDER BY id LIMIT 1` — so the row either does not exist
// yet or is not setup's to add to. Caught by running setup against a database
// that already had one, which is the state every existing journal is in.
const KEEPER_FLOOR = 'keeper';

export async function claim_journal(keeper_name) {
  const handle = create_slug(String(keeper_name || '')) || KEEPER_FLOOR;
  const shown = String(keeper_name || '').trim() || KEEPER_FLOOR;
  const [row] = await database`
    INSERT INTO users (handle, display_name)
    SELECT ${handle}, ${shown}
    WHERE NOT EXISTS (SELECT 1 FROM users)
    RETURNING id, handle`;
  return row || null;
}

export async function pull_random_slug() {
  const [row] = await database`
    SELECT slug FROM entries ORDER BY random() LIMIT 1`;
  return row?.slug || null;
}

export async function pull_wall_entries() {
  const rows = await database.query(
    `SELECT ${WALL_FIELDS.map(f => `"${f}"`).join(', ')}
     FROM (${WITH_LISTEN_NUMBERS}) ranked
     ORDER BY posted_at DESC`
  );
  return rows.map(row => withSizedArt(row, LIST_ART_PX));
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
  'favorite', 'masterpiece', 'formative', 'horizon', 'album_art', 'posted_at',
  'listen_number', 'listen_total',
];

export async function pull_public_entries() {
  // posted_at carries its zone, so it comes back as the instant it is and the
  // feed needs no workaround — the ::text trick that used to live here was
  // for created_at, which is naive and is not read any more.
  //
  // Named rather than SELECT *. The allow-list below still decides what leaves
  // — that has not changed — but it no longer decides it *after* the whole
  // entry has crossed the wire. A feed that deliberately carries no writing
  // was reading every word of it and throwing it away.
  const rows = await database.query(
    `SELECT ${PUBLIC_FIELDS.map(f => `"${f}"`).join(', ')}
     FROM (${WITH_LISTEN_NUMBERS}) ranked
     ORDER BY posted_at DESC`
  );
  // Picked in JS rather than named in the SELECT so the allow-list is applied
  // in exactly one place and cannot drift away from the list above.
  return rows.map(row => {
    const out = {};
    for (const field of PUBLIC_FIELDS) out[field] = row[field];
    out.album_art = sizedAlbumArt(row.album_art, LIST_ART_PX);
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
    album, artist, year, genre = '', entry_type,
    rating, favorite, masterpiece = false, formative = false, notes,
    track_notes, horizon, album_art, tracks = null,
    source_entry_id = null, received_from = null, received_date = null,
    user_id = null
  } = body;

  const slug = await next_free_slug(album);

  const result = await database`
    INSERT INTO entries (
      album, artist, year, genre, entry_type,
      rating, favorite, masterpiece, formative, notes, track_notes,
      horizon, album_art, slug, tracks,
      source_entry_id, received_from, received_date, user_id
    ) VALUES (
      ${album}, ${artist}, ${year}, ${genre}, ${entry_type},
      ${rating}, ${favorite}, ${masterpiece}, ${formative}, ${notes},
      ${track_notes},
      ${horizon}, ${album_art}, ${slug},
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
  let set_source = touched('source_entry_id');
  const set_from = touched('received_from');
  const set_date = touched('received_date');
  const source_entry_id = set_source ? entryRef(fields.source_entry_id) : null;

  // The row as it stands, fetched once and used twice: to check the chain for
  // cycles, and to work out which pieces of writing actually changed. The stamps
  // cannot be done in SQL the way an entry-wide one could — a per-track answer
  // needs the old and the new tracklists side by side in the same loop.
  const [current] = await database`
    SELECT id, notes, tracks, album_key, source_entry_id
      FROM entries WHERE slug = ${slug} LIMIT 1
  `;

  // ── Lineage is written once ─────────────────────────────────────────────
  // received_from and received_date are corrections: you log something and
  // remember a week later that Zach sent it, which is the same kind of fix as a
  // typo. Where it sits in the tree is not. Either their entry led to yours or
  // it did not, and a lineage anyone can rewrite is a record of nothing — the
  // tree stops being evidence and becomes an opinion about the past.
  //
  // So it may be written while it is empty and never again. Same rule as
  // `serial` and `founded_at` in settings_actions, and dropped silently for the
  // same reason: the editor posts every field it knows about, and it should not
  // fail because one of them was already settled.
  //
  // It can become null again, but only by the source entry being deleted — the
  // foreign key's ON DELETE SET NULL does it. That is the one case where the
  // lineage genuinely ended, and it reopens the field to be set correctly
  // rather than leaving it pointing at nothing.
  if (set_source && current?.source_entry_id != null) {
    set_source = false;
  }

  if (set_source && source_entry_id) {
    // A source is the entry somebody else wrote about *the same album* — that
    // is the whole mechanic. Walking the column upward gives the history of one
    // record, who found it first and who passed it to whom, and that only holds
    // because every hop is the same album.
    //
    // The tempting misreading is association: they read your entry on one album
    // and sent you a different one. That is a real relationship and not this
    // column's — the album would change at every hop, so the trail could not be
    // walked, because each step changes the subject. If it is ever wanted it
    // wants a column of its own.
    //
    // Which makes this check the thing that keeps the two apart. It is
    // impossible to state if one column carries both.
    const [source] = await database`
      SELECT id, album_key FROM entries WHERE id = ${source_entry_id} LIMIT 1
    `;
    if (!source) throw new Error('That entry no longer exists.');
    if (source.album_key !== current?.album_key) {
      throw new Error('A source has to be an entry for this same album.');
    }
    if (await wouldFormCycle(current?.id, source_entry_id)) {
      throw new Error('That would send this album back up its own chain.');
    }
  }

  // ── Edit stamps ─────────────────────────────────────────────────────────
  // A stamp goes next to the thing that changed, not at the top of the entry.
  // One date on a post says only that something moved; a date under track two
  // says what. It is also what keeps this from becoming a quiet rewrite tool —
  // an entry carrying five track stamps looks different from one carrying a
  // single typo fix, and that visible difference is the honesty.
  //
  // Notes only. Correcting a year or toggling a favourite is filing rather
  // than rewriting, and a stamp that moved for either would stop meaning
  // anything.
  const stampedAt = new Date().toISOString();

  if (Array.isArray(fields.tracks)) {
    const before = Array.isArray(current?.tracks) ? current.tracks : [];
    fields.tracks = fields.tracks.map((track, index) => {
      // By number where there is one, by position otherwise: a tracklist can
      // be re-ordered, and matching on position alone would read every track
      // after the moved one as rewritten.
      const was = before.find(t => t.number != null && t.number === track.number) ?? before[index];
      const changed = was && (track.note || '') !== (was.note || '');
      // A track with no previous version is new writing rather than an edit —
      // filling in a tracklist later is not revising it.
      const edited = changed ? stampedAt : (was?.edited ?? track.edited ?? null);
      return edited ? { ...track, edited } : { ...track };
    });
  }

  // The album note's own stamp. Its column is the entry's, because the album
  // note is the one piece of writing the entry itself owns.
  const noteChanged =
    fields.notes != null && (fields.notes || '') !== (current?.notes || '');

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
      rating = COALESCE(${fields.rating ?? null}, rating),
      favorite = COALESCE(${fields.favorite ?? null}, favorite),
      notes = COALESCE(${fields.notes ?? null}, notes),
      track_notes = COALESCE(${fields.track_notes ?? null}, track_notes),
      horizon = COALESCE(${fields.horizon ?? null}, horizon),
      album_art = COALESCE(${fields.album_art ?? null}, album_art),
      edited_at = CASE WHEN ${noteChanged} THEN ${stampedAt}::timestamp ELSE edited_at END,
      source_entry_id = CASE WHEN ${set_source} THEN ${source_entry_id}::int ELSE source_entry_id END,
      received_from = CASE WHEN ${set_from} THEN ${set_from ? blankToNull(fields.received_from) : null}::text ELSE received_from END,
      received_date = CASE WHEN ${set_date} THEN ${set_date ? blankToNull(fields.received_date) : null}::date ELSE received_date END
    WHERE slug = ${slug}
    RETURNING *
  `;
  return result[0] || null;
}

// Deleting an entry, and everything that pointed at it.
//
// A bare DELETE FROM entries is not enough, and the reason is that only one of
// the three things referring to an entry is a foreign key. settings.pinned_entry_id
// carries ON DELETE SET NULL and clears itself. The other two do not:
//
//   comments.entry_slug is a plain text column, so an entry's comments survive
//   it — sitting in the table forever, unreachable, and turning up years later
//   in a backup attached to a record nobody can find.
//
//   entries.source_entry_id has an index and no key, so an album that somebody
//   else's entry was received *from* leaves that entry pointing at a row that
//   is not there, which quietly breaks the discovery chain rather than ending
//   it.
//
// So this clears both first. The alternative was a warning long enough to
// explain the mess it was about to leave, which is a worse answer than not
// leaving one.
export async function delete_entry(slug) {
  const [row] = await database`SELECT id FROM entries WHERE slug = ${slug} LIMIT 1`;
  if (!row) return { deleted: false };

  const comments = await database`DELETE FROM comments WHERE entry_slug = ${slug} RETURNING id`;
  // The chain ends here rather than dangling: an album received from this one
  // keeps its entry and loses its source, which is what "I no longer know where
  // this came from" actually looks like.
  const unlinked = await database`
    UPDATE entries SET source_entry_id = NULL WHERE source_entry_id = ${row.id} RETURNING id
  `;
  await database`DELETE FROM entries WHERE id = ${row.id}`;

  return { deleted: true, comments: comments.length, unlinked: unlinked.length };
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
    album, artist, year = '', genre = '', entry_type = '',
    album_art = '', collection_id = '', step = 0, elapsed = 0,
    rating = 0, masterpiece = false, favorite = false, formative = false, notes = '', tracks = null,
    // Carried so that walking away from a listen started in the inbox and
    // picking it up later still knows who sent the record. Without these the
    // send flow's whole point — that received_from fills itself in rather than
    // being typed — would hold only for a listen finished in one sitting, and
    // drafts exist precisely because that is not the common case.
    received_from = '', received_date = '',
  } = body;

  if (!album) throw new Error('A draft needs an album');

  const result = await database`
    INSERT INTO drafts (
      lookup_key, album, artist, year, genre, entry_type,
      album_art, collection_id, step, elapsed, rating, masterpiece, formative,
      favorite, notes, tracks, received_from, received_date
    ) VALUES (
      ${lookup_key(album, artist)}, ${album}, ${artist}, ${year}, ${genre},
      ${entry_type}, ${album_art}, ${String(collection_id || '')},
      ${step}, ${elapsed}, ${rating}, ${masterpiece}, ${formative}, ${favorite}, ${notes},
      ${tracks ? JSON.stringify(tracks) : null},
      ${blankToNull(received_from)}, ${blankToNull(received_date)}
    )
    ON CONFLICT (lookup_key) DO UPDATE SET
      album = EXCLUDED.album, artist = EXCLUDED.artist, year = EXCLUDED.year,
      genre = EXCLUDED.genre, entry_type = EXCLUDED.entry_type,
      album_art = EXCLUDED.album_art,
      collection_id = EXCLUDED.collection_id, step = EXCLUDED.step,
      elapsed = EXCLUDED.elapsed, rating = EXCLUDED.rating,
      masterpiece = EXCLUDED.masterpiece, formative = EXCLUDED.formative,
      favorite = EXCLUDED.favorite,
      notes = EXCLUDED.notes, tracks = EXCLUDED.tracks,
      received_from = EXCLUDED.received_from, received_date = EXCLUDED.received_date,
      updated_at = NOW()
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
