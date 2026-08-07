import database from './database_connection.js';
import { create_slug } from './slug_generator.js';

export async function pull_all_entries() {
  return await database`
    SELECT * FROM entries ORDER BY created_at DESC
  `;
}

export async function pull_entry_by_slug(slug) {
  const result = await database`
    SELECT * FROM entries WHERE slug = ${slug} LIMIT 1
  `;
  return result[0] || null;
}

export async function save_new_entry(body) {
  const {
    album, artist, year, entry_type, relationship,
    rating, favorite, background = '', notes, track_notes, tags,
    horizon, album_art, post_link
  } = body;

  const slug = create_slug(album);

  const result = await database`
    INSERT INTO entries (
      album, artist, year, entry_type, relationship,
      rating, favorite, background, notes, track_notes, tags,
      horizon, album_art, post_link, slug
    ) VALUES (
      ${album}, ${artist}, ${year}, ${entry_type}, ${relationship},
      ${rating}, ${favorite}, ${background}, ${notes}, ${track_notes}, ${tags},
      ${horizon}, ${album_art}, ${post_link}, ${slug}
    )
    RETURNING *
  `;
  return result[0];
}

export async function update_entry(slug, fields) {
  if (fields.tags && typeof fields.tags === 'string') {
    fields.tags = fields.tags.split(',').map(t => t.trim()).filter(Boolean);
  }

  const result = await database`
    UPDATE entries SET
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
