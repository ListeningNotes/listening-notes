// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
import database from './database_connection.js';

// The cover, the pressing and the sender's journal ride along with the note
// now. submitter_email is not written any more and is not accepted here —
// the column keeps what it has, which is a different thing from keeping the
// field. See the note in schema.sql.
export async function save_submission({
  album, artist, year, note, submitter_name,
  album_art, collection_id, sender_url,
}) {
  const result = await database`
    INSERT INTO submissions (
      album, artist, year, note, submitter_name,
      album_art, collection_id, sender_url, status
    )
    VALUES (
      ${album.trim()},
      ${artist.trim()},
      ${year?.trim() || null},
      ${note.trim()},
      ${submitter_name?.trim() || null},
      ${album_art?.trim() || null},
      ${collection_id ? String(collection_id) : null},
      ${sender_url?.trim().toLowerCase() || null},
      'pending'
    )
    RETURNING id, album, artist, year, submitter_name, created_at
  `;
  return result[0];
}

export async function pull_submissions() {
  return await database`
    SELECT id, album, artist, year, note, submitter_name, submitter_email,
           album_art, collection_id, sender_url, status, created_at
    FROM submissions
    ORDER BY created_at DESC
  `;
}

// Same as count_pending_comments: the cover wants a number, not the rows.
export async function count_pending_submissions() {
  const [row] = await database`
    SELECT COUNT(*)::int AS n FROM submissions WHERE status = 'pending'
  `;
  return row?.n ?? 0;
}

export async function update_submission_status(id, status) {
  const result = await database`
    UPDATE submissions SET status = ${status}
    WHERE id = ${id}
    RETURNING id, status
  `;
  return result[0] || null;
}
