// Copyright (C) 2026 Miyel Brown
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

export async function save_comment({ slug, track_index, parent_id, author_name, author_url, content }) {
  const result = await database`
    INSERT INTO comments (entry_slug, track_index, parent_id, author_name, author_url, content, pending)
    VALUES (
      ${slug},
      ${track_index ?? -1},
      ${parent_id ?? null},
      ${author_name.trim()},
      ${author_url?.trim().toLowerCase() || null},
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

// ── Replies to somebody else's comments, 2026-09-22 ──────────────────────
// What another keeper's copy asks this one: of the comments left here from
// their journal, which have been answered? Miyel: replies to her comments
// on a friend's journal should show in her own inbox — and her copy never
// hears of those comments, which live here. So it asks, the way the feed
// asks for entries (GET /api/public/replies).
//
// Two ways of answering count (Miyel, the same day, looking at Ethan's
// answer to her, which he wrote as a comment of its own and not under hers):
//   a reply        a comment whose parent is theirs
//   the keeper     this journal's own keeper commenting on the same entry
//                  after theirs, threaded or not
// The keeper is known by this journal's address on the comment — stamped by
// POST /api/comments when the wristband is on, from 1.28.0 — or, for the
// comments from before that, by the keeper's name. A stranger typing that
// name is the worst case, and it costs one stray line in somebody's inbox.
//
// Only what the entry pages already show: every comment approved, the
// answer's name and words, the entry it is on and a line of the comment it
// answers — the latest of theirs before it, when there are several. The one
// new fact is that a comment came from that journal: Miyel's call (DECISIONS,
// The network). Their own follow-ups are left out.
//
// `address` must arrive tidied (tidyJournal). Stored author_urls are tidied
// on the way in, so the only spelling left to fold is a leading www.
export async function pull_replies_to(address) {
  const them = address.replace(/^www\./, '');
  return await database`
    WITH here AS (
      SELECT regexp_replace(split_part(regexp_replace(lower(COALESCE(site_address, '')), '^https?://', ''), '/', 1), '^www[.]', '') AS host,
             lower(trim(COALESCE(keeper_name, ''))) AS keeper
      FROM settings WHERE id = 1
    ),
    said AS (
      SELECT c.*,
             regexp_replace(split_part(COALESCE(c.author_url, ''), '/', 1), '^www[.]', '') AS host
      FROM comments c
      WHERE c.pending = false
    ),
    answered AS (
      SELECT DISTINCT ON (r.id)
             r.id, r.entry_slug, r.track_index, r.author_name, r.content, r.created_at,
             LEFT(c.content, 140) AS answering
      FROM said c
      JOIN said r ON (
            r.parent_id = c.id
         OR (r.entry_slug = c.entry_slug
             AND r.created_at > c.created_at
             AND r.id <> c.id
             AND (r.host = (SELECT host FROM here)
                  OR (lower(trim(r.author_name)) = (SELECT keeper FROM here)
                      AND (SELECT keeper FROM here) <> '')))
      )
      WHERE c.host = ${them}
        AND r.host <> ${them}
      ORDER BY r.id, (r.parent_id = c.id) DESC, c.created_at DESC
    )
    SELECT a.*, e.album, e.artist, e.album_art
    FROM answered a
    LEFT JOIN entries e ON e.slug = a.entry_slug
    ORDER BY a.created_at DESC
    LIMIT 50
  `;
}

// Moderation — the dashboard inbox reviews comments awaiting approval.
export async function pull_pending_comments() {
  return await database`
    SELECT id, entry_slug, track_index, parent_id,
           author_name, author_url, content, created_at
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
