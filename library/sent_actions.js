// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/sent_actions.js
// The `sent` table: records this journal has sent, kept so the inbox can show
// the ones still out — "waiting to be returned, basically" (Miyel,
// 2026-10-14). migrations/034_sent.sql has why it exists at all, after a
// copy went a month keeping nothing of what it sent.
//
// Written by /api/outbox once the other journal has taken a send, and by
// nothing else. A row leaves the list when the record comes back — a
// came_back row from the same journal for the same record — or when the
// keeper removes it. Coming back is matched here as the list is read, never
// written onto the row, so the two tables never have to agree about anything.
//
// Nothing is counted and nothing reminds: no "sent three weeks ago", no
// number on the door. A list the keeper opens when they want it.
import database from './database_connection.js';
import { tidyJournal } from './return_address.js';
import { lookup_key } from './entry_formatter.js';

const MOST = 60;

function text(value, most) {
  const said = String(value ?? '').trim();
  return said ? said.slice(0, most) : null;
}

// Written down once their copy has said yes. Never throws into the send: the
// record has gone either way, and a list that missed one is a smaller
// failure than a keeper told a send failed when it did not.
export async function save_sent({ journal, name, album, artist, song, album_art, note }) {
  const host = tidyJournal(journal);
  const title = text(album, 300);
  if (!host || !title) return null;
  const art = text(album_art, 1000);
  const [row] = await database`
    INSERT INTO sent (journal, name, album, artist, song, album_art, note)
    VALUES (${host}, ${text(name, 120)}, ${title}, ${text(artist, 300)}, ${text(song, 300)},
            ${art && /^https:\/\//i.test(art) ? art : null}, ${text(note, 4000)})
    RETURNING id
  `;
  return row || null;
}

// The one fold both tables are compared on: the journal, and the record —
// with the song when both sides name one.
function sameRecord(sent, back) {
  if (tidyJournal(sent.journal) !== tidyJournal(back.journal)) return false;
  if (lookup_key(sent.album, sent.artist || '') !== lookup_key(back.album, back.artist || '')) return false;
  if (sent.song && back.song) return lookup_key(sent.song, '') === lookup_key(back.song, '');
  return true;
}

// What is still out, newest first. A came_back row counts whether or not it
// was put away in the inbox: dismissing an arrival does not un-return it.
export async function pull_sent() {
  const rows = await database`
    SELECT id, journal, name, album, artist, song, album_art, note, sent_at
    FROM sent
    ORDER BY sent_at DESC
    LIMIT ${MOST}
  `;
  if (rows.length === 0) return [];
  // Only what came back from the journals on the list, not the whole table.
  const hosts = [...new Set(rows.map(r => r.journal))];
  const back = await database`SELECT journal, album, artist, song FROM came_back WHERE journal = ANY(${hosts})`;
  return rows.filter(row => !back.some(b => sameRecord(row, b)));
}

// Removed by its keeper: gone, since nothing would ever write it again.
export async function remove_sent(id) {
  const [row] = await database`DELETE FROM sent WHERE id = ${id} RETURNING id`;
  return row || null;
}
