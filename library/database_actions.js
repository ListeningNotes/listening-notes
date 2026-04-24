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
    rating, favorite, background, notes, track_notes, tags,
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
