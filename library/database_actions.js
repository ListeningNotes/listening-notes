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

export async function pull_all_entries() {
  const rows = await database`
    SELECT * FROM entries ORDER BY created_at DESC
  `;
  return rows.map(row => withSizedArt(row, LIST_ART_PX));
}

export async function pull_entry_by_slug(slug) {
  const result = await database`
    SELECT * FROM entries WHERE slug = ${slug} LIMIT 1
  `;
  const row = result[0];
  return row ? withSizedArt(row, ENTRY_ART_PX) : null;
}

export async function save_new_entry(body) {
  const {
    album, artist, year, entry_type, relationship,
    rating, favorite, background = '', notes, track_notes, tags,
    horizon, album_art, post_link, tracks = null
  } = body;

  const slug = create_slug(album);

  const result = await database`
    INSERT INTO entries (
      album, artist, year, entry_type, relationship,
      rating, favorite, background, notes, track_notes, tags,
      horizon, album_art, post_link, slug, tracks
    ) VALUES (
      ${album}, ${artist}, ${year}, ${entry_type}, ${relationship},
      ${rating}, ${favorite}, ${background}, ${notes}, ${track_notes}, ${tags},
      ${horizon}, ${album_art}, ${post_link}, ${slug},
      ${tracks ? JSON.stringify(tracks) : null}
    )
    RETURNING *
  `;
  return result[0];
}

export async function update_entry(slug, fields) {
  if (fields.tags && typeof fields.tags === 'string') {
    fields.tags = fields.tags.split(',').map(t => t.trim()).filter(Boolean);
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
      album = COALESCE(${fields.album ?? null}, album),
      artist = COALESCE(${fields.artist ?? null}, artist),
      year = COALESCE(${fields.year ?? null}, year),
      entry_type = COALESCE(${fields.entry_type ?? null}, entry_type),
      relationship = COALESCE(${fields.relationship ?? null}, relationship),
      rating = COALESCE(${fields.rating ?? null}, rating),
      favorite = COALESCE(${fields.favorite ?? null}, favorite),
      background = COALESCE(${fields.background ?? null}, background),
      notes = COALESCE(${fields.notes ?? null}, notes),
      track_notes = COALESCE(${fields.track_notes ?? null}, track_notes),
      tags = COALESCE(${fields.tags ?? null}, tags),
      horizon = COALESCE(${fields.horizon ?? null}, horizon),
      album_art = COALESCE(${fields.album_art ?? null}, album_art),
      post_link = COALESCE(${fields.post_link ?? null}, post_link)
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
// key is normalised the same way the iTunes lookups do it.
const briefing_key = (album, artist) =>
  `${album} ${artist}`.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();

export async function pull_briefing(album, artist) {
  const result = await database`
    SELECT brief, refreshed_at FROM briefings
    WHERE lookup_key = ${briefing_key(album, artist)} LIMIT 1
  `;
  return result[0] || null;
}

export async function save_briefing(album, artist, brief) {
  await database`
    INSERT INTO briefings (lookup_key, album, artist, brief)
    VALUES (${briefing_key(album, artist)}, ${album}, ${artist}, ${JSON.stringify(brief)})
    ON CONFLICT (lookup_key) DO UPDATE
      SET brief = EXCLUDED.brief, artist = EXCLUDED.artist,
          album = EXCLUDED.album, refreshed_at = NOW()
  `;
}
