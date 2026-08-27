// SPDX-License-Identifier: AGPL-3.0-or-later
import database from './database_connection.js';

// `own_ids` are comment ids the caller has proved they wrote, by sending back
// receipts the server signed (see issue_receipt in wristband.js). Those come
// back even while they wait to be read, so the person who wrote one sees it
// sitting in the thread. Everyone else's held comments stay invisible.
//
// The ids must arrive already verified. Passing raw ids from a request here
// would hand anyone every held comment on the site, since they run 1, 2, 3…
export async function nest_comments(slug, own_ids = []) {
  const rows = await database`
    SELECT id, entry_slug, track_index, parent_id,
           author_name, content, upvotes, pending, created_at
    FROM comments
    WHERE entry_slug = ${slug}
      AND (pending = false OR id = ANY(${own_ids}))
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

// Just the number, for the cover. Counting in the database rather than
// pulling every row and measuring the array — the cover asks on every visit
// and has no use for the contents.
export async function count_pending_comments() {
  const [row] = await database`
    SELECT COUNT(*)::int AS n FROM comments WHERE pending = true
  `;
  return row?.n ?? 0;
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
