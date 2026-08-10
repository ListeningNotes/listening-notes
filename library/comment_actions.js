import database from './database_connection.js';

export async function nest_comments(slug) {
  const rows = await database`
    SELECT id, entry_slug, track_index, parent_id,
           author_name, content, upvotes, pending, created_at
    FROM comments
    WHERE entry_slug = ${slug}
      AND pending = false
    ORDER BY created_at ASC
  `;

  const map = {};
  const roots = [];
  rows.forEach(r => { map[r.id] = { ...r, replies: [] }; });
  rows.forEach(r => {
    if (r.parent_id && map[r.parent_id]) {
      map[r.parent_id].replies.push(map[r.id]);
    } else {
      roots.push(map[r.id]);
    }
  });

  const by_track = {};
  roots.forEach(c => {
    const k = String(c.track_index);
    if (!by_track[k]) by_track[k] = [];
    by_track[k].push(c);
  });

  return by_track;
}

export async function save_comment({ slug, track_index, parent_id, author_name, author_email, content }) {
  const result = await database`
    INSERT INTO comments (entry_slug, track_index, parent_id, author_name, author_email, content, pending)
    VALUES (
      ${slug},
      ${track_index ?? -1},
      ${parent_id ?? null},
      ${author_name.trim()},
      ${author_email?.trim().toLowerCase() ?? ''},
      ${content.trim()},
      true
    )
    RETURNING id, track_index, parent_id, author_name, content, upvotes, pending, created_at
  `;
  return result[0];
}

export async function upvote_comment(id) {
  const result = await database`
    UPDATE comments SET upvotes = upvotes + 1
    WHERE id = ${id}
    RETURNING id, upvotes
  `;
  return result[0] || null;
}

// Moderation — the dashboard inbox reviews comments awaiting approval.
export async function pull_pending_comments() {
  return await database`
    SELECT id, entry_slug, track_index, parent_id,
           author_name, author_email, content, created_at
    FROM comments
    WHERE pending = true
    ORDER BY created_at DESC
  `;
}

export async function approve_comment(id) {
  const result = await database`
    UPDATE comments SET pending = false
    WHERE id = ${id}
    RETURNING id
  `;
  return result[0] || null;
}

export async function dismiss_comment(id) {
  const result = await database`
    DELETE FROM comments
    WHERE id = ${id}
    RETURNING id
  `;
  return result[0] || null;
}
