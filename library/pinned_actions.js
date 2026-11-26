// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// The pinned albums (migrations/047_pinned.sql), 2026-11-25.
//
// Up to three albums the keeper holds up in their room, each with one line
// of their own writing about it. The line is lifted out of the entry's album
// note and is only ever words that note says: it is checked against the note
// when it is pinned and again every time it is read, and a line the note no
// longer says is read as no line at all (Miyel's brief: "never show words
// that are not in the entry"). Only what the entry's own page shows anybody
// can be lifted — the album note, never a track note, never an entry whose
// credit was kept quiet (pull_public_note's rule, database_actions.js).
//
// settings.pinned_entry_id, the card's one pin from before, is the first
// place: read as it while nothing has been pinned here, and kept equal to it
// on every write, so everything that still reads only the one pin agrees.

import database from './database_connection.js';
import { splitNotes } from './entry_formatter.js';

export const MOST_PINNED = 3;

// Spaces and line breaks as one space, so a line lifted across a wrap still
// matches the note it came from.
const flat = text => String(text || '').replace(/\s+/g, ' ').trim();

// The words a line may be lifted from: the album note, as its page shows it.
function liftable(row) {
  if (!row || row.song || row.credit_private) return '';
  return flat(splitNotes(row.notes).albumNotes);
}

function said(row, line) {
  const words = flat(line);
  return Boolean(words) && liftable(row).includes(words);
}

// What anybody may read: each place, its album and the line if the entry
// still says it. Never the note itself.
export async function pull_pinned() {
  const rows = await database`
    SELECT p.position, p.line, e.id, e.slug, e.album, e.artist, e.album_art, e.song, e.notes, e.credit_private
    FROM pinned p JOIN entries e ON e.id = p.entry_id
    ORDER BY p.position
  `;
  if (rows.length) {
    return rows.map(row => ({
      position: row.position,
      slug: row.slug, album: row.album, artist: row.artist, album_art: row.album_art, song: row.song,
      line: said(row, row.line) ? flat(row.line) : null,
    }));
  }
  // Nothing pinned here yet: the card's one pin, without a line.
  const [only] = await database`
    SELECT e.slug, e.album, e.artist, e.album_art, e.song
    FROM settings s JOIN entries e ON e.id = s.pinned_entry_id
    WHERE s.id = 1
  `;
  return only ? [{ position: 1, ...only, line: null }] : [];
}

// The card's one pin moves into the first place the first time anything is
// pinned here, so pinning a second album never quietly drops it.
async function take_in_the_card_pin() {
  const [{ count }] = await database`SELECT count(*)::int AS count FROM pinned`;
  if (count) return;
  await database`
    INSERT INTO pinned (position, entry_id, line)
    SELECT 1, pinned_entry_id, NULL FROM settings WHERE id = 1 AND pinned_entry_id IS NOT NULL
    ON CONFLICT DO NOTHING
  `;
}

async function keep_the_card_pin() {
  await database`
    UPDATE settings SET pinned_entry_id = (SELECT entry_id FROM pinned WHERE position = 1)
    WHERE id = 1
  `;
}

// Pin a line of an entry's writing. An album already pinned takes the new
// line in its place. With three pinned, `replacing` (a place, 1 to 3) says
// which one this takes the place of; without it the answer is { full } and
// the three as they stand, for the keeper to choose from.
export async function pin_line(slug, line, replacing = null) {
  const [row] = await database`
    SELECT id, slug, song, notes, credit_private FROM entries WHERE slug = ${slug} LIMIT 1
  `;
  if (!row) return { trouble: 'There is no entry by that name.' };
  if (!said(row, line)) return { trouble: 'A pinned line has to be words from this album’s note.' };
  const words = flat(line);
  await take_in_the_card_pin();
  const [already] = await database`SELECT position FROM pinned WHERE entry_id = ${row.id}`;
  if (already) {
    await database`UPDATE pinned SET line = ${words}, pinned_at = now() WHERE position = ${already.position}`;
  } else {
    const taken = (await database`SELECT position FROM pinned`).map(r => r.position);
    const free = [1, 2, 3].find(p => !taken.includes(p));
    const place = free ?? (Number.isInteger(replacing) && replacing >= 1 && replacing <= MOST_PINNED ? replacing : null);
    if (!place) return { full: true, pinned: await pull_pinned() };
    await database`
      INSERT INTO pinned (position, entry_id, line) VALUES (${place}, ${row.id}, ${words})
      ON CONFLICT (position) DO UPDATE SET entry_id = EXCLUDED.entry_id, line = EXCLUDED.line, pinned_at = now()
    `;
  }
  await keep_the_card_pin();
  return { pinned: await pull_pinned() };
}

// Take an album down. The others keep their places.
export async function unpin(position) {
  await take_in_the_card_pin();
  await database`DELETE FROM pinned WHERE position = ${position}`;
  await keep_the_card_pin();
  return { pinned: await pull_pinned() };
}
