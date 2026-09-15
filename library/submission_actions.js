// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
import database from './database_connection.js';

// The cover, the pressing and the sender's journal ride along with the note.
// There is no email here and there is no longer a column for one either — see
// migrations/001_initial.sql. What replaced it is sender_url, which is an address rather than
// a person.
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
  // entry_id and the slug it resolves to travel together, 2026-09-15: the
  // inbox draws a link to the record a send became, and a join here is one
  // query rather than the browser asking for an entry per row. A send whose
  // record was deleted has its entry_id nulled by the foreign key, so the
  // join simply finds nothing and the row says what it said before.
  return await database`
    SELECT s.id, s.album, s.artist, s.year, s.note, s.submitter_name,
           s.album_art, s.collection_id, s.sender_url, s.status, s.created_at,
           s.entry_id, e.slug AS entry_slug, e.album AS entry_album,
           e.posted_at AS entry_posted_at
    FROM submissions s
    LEFT JOIN entries e ON e.id = s.entry_id
    ORDER BY s.created_at DESC
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

// ── The send that was already logged ───────────────────────────────────────
// The third outcome, 2026-09-15. An album arrives, it is listened to, and the
// listen starts anywhere but the inbox — so the entry exists and the send is
// still pending, which reads as though it was ignored. Dismissing it would
// say exactly the wrong thing.
//
// This is that button. It marks the send logged and points it at the record,
// and it is the only thing that writes either: nothing sweeps the archive
// looking for matches and nothing guesses. A person recognised the record and
// pressed once.
//
// The credit on the entry is the caller's half — the route sets received_from
// on the entry in the same press (app/api/submissions/[id]), so the send and
// the record agree about who it came from. Done there rather than here
// because update_entry already owns everything about writing an entry, and a
// second writer for one column is how two of them drift.
//
// Nothing is checked about the record beyond its existing: an entry for a
// different pressing, a different year, or the wrong album entirely is the
// keeper's call to make and to undo. The undo is Dismiss, or pressing again
// with the right record.
export async function log_submission(id, entry_id) {
  const entry = entry_id === null || entry_id === undefined || entry_id === ''
    ? null
    : parseInt(entry_id, 10);
  if (entry !== null && !(Number.isInteger(entry) && entry > 0)) {
    throw new Error('That is not an entry.');
  }
  const result = await database`
    UPDATE submissions SET status = 'logged', entry_id = ${entry}
    WHERE id = ${id}
    RETURNING id, status, entry_id
  `;
  return result[0] || null;
}

// Who sent it, once they have a copy. A send carries whatever the sender
// typed, and most arrive before that person keeps a journal — so their
// address is filled in later, from the address book, by hand. Same column
// the send form writes; nothing else about the row moves.
export async function name_submission_sender(id, { submitter_name, sender_url }) {
  const result = await database`
    UPDATE submissions SET
      submitter_name = COALESCE(${submitter_name ?? null}, submitter_name),
      sender_url = ${sender_url || null}
    WHERE id = ${id}
    RETURNING id, submitter_name, sender_url
  `;
  return result[0] || null;
}
