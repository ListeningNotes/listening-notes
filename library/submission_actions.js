import database from './database_connection.js';

export async function save_submission({ album, artist, year, note, submitter_name, submitter_email }) {
  const result = await database`
    INSERT INTO submissions (album, artist, year, note, submitter_name, submitter_email, status)
    VALUES (
      ${album.trim()},
      ${artist.trim()},
      ${year?.trim() || null},
      ${note.trim()},
      ${submitter_name?.trim() || null},
      ${submitter_email?.trim().toLowerCase() || null},
      'pending'
    )
    RETURNING id, album, artist, year, submitter_name, created_at
  `;
  return result[0];
}

export async function pull_submissions() {
  return await database`
    SELECT id, album, artist, year, note, submitter_name, submitter_email, status, created_at
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
