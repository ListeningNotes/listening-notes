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
// can be lifted — its album note or one of its songs' notes, or a song's own
// post (Miyel, 2026-11-25: "what if I want to choose a line from a track
// note") — never from an entry whose credit was kept quiet. A line comes from
// one note: it is matched against each on its own, never across two.
//
// settings.pinned_entry_id, the card's one pin from before, is the first
// place: read as it while nothing has been pinned here, and kept equal to it
// on every write, so everything that still reads only the one pin agrees.

import database from './database_connection.js';
import { splitNotes } from './entry_formatter.js';
import { CARD_PROMPT, bioPrompt } from './bioprompt.js';

// An opening a pin may answer: one of the card's, but not the one addressed
// to the visitor, which stays under the name (migrations/048_pinned_prompt.sql).
export function pinnablePrompt(key) {
  return key && key !== CARD_PROMPT && bioPrompt(key) ? key : null;
}

export const MOST_PINNED = 3;

// Spaces and line breaks as one space, so a line lifted across a wrap still
// matches the note it came from.
const flat = text => String(text || '').replace(/\s+/g, ' ').trim();

// The notes a line may be lifted from, each as its page shows it: the album
// note (a song's post keeps its note there too) and every song's own note.
function liftable(row) {
  if (!row || row.credit_private) return [];
  const songs = Array.isArray(row.tracks) ? row.tracks.map(t => flat(t?.note)) : [];
  return [flat(splitNotes(row.notes).albumNotes), ...songs].filter(Boolean);
}

function said(row, line) {
  const words = flat(line);
  return Boolean(words) && liftable(row).some(note => note.includes(words));
}

// What anybody may read: each place, its album and the line if the entry
// still says it. Never the note itself.
export async function pull_pinned() {
  const rows = await database`
    SELECT p.position, p.line, p.prompt, e.id, e.slug, e.album, e.artist, e.album_art, e.song, e.notes, e.tracks, e.credit_private
    FROM pinned p JOIN entries e ON e.id = p.entry_id
    ORDER BY p.position
  `;
  if (rows.length) {
    return rows.map(row => ({
      position: row.position,
      slug: row.slug, album: row.album, artist: row.artist, album_art: row.album_art, song: row.song,
      line: said(row, row.line) ? flat(row.line) : null,
      prompt: pinnablePrompt(row.prompt),
    }));
  }
  // Nothing pinned here yet: the card's one pin, without a line.
  const [only] = await database`
    SELECT e.slug, e.album, e.artist, e.album_art, e.song
    FROM settings s JOIN entries e ON e.id = s.pinned_entry_id
    WHERE s.id = 1
  `;
  return only ? [{ position: 1, ...only, line: null, prompt: null }] : [];
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

// Pin a line of an entry's writing, answering an opening or none. An album
// already pinned takes the new line and opening in its place. An opening
// answers one pin at a time: given to this one, it leaves any other. With three pinned, `replacing` (a place, 1 to 3) says
// which one this takes the place of; without it the answer is { full } and
// the three as they stand, for the keeper to choose from.
export async function pin_line(slug, line, replacing = null, prompt = null) {
  const [row] = await database`
    SELECT id, slug, song, notes, tracks, credit_private FROM entries WHERE slug = ${slug} LIMIT 1
  `;
  if (!row) return { trouble: 'There is no entry by that name.' };
  if (!said(row, line)) return { trouble: 'A pinned line has to be words from one of this post’s notes.' };
  const words = flat(line);
  const answers = pinnablePrompt(prompt);
  await take_in_the_card_pin();
  if (answers) await database`UPDATE pinned SET prompt = NULL WHERE prompt = ${answers} AND entry_id <> ${row.id}`;
  const [already] = await database`SELECT position FROM pinned WHERE entry_id = ${row.id}`;
  if (already) {
    await database`UPDATE pinned SET line = ${words}, prompt = ${answers}, pinned_at = now() WHERE position = ${already.position}`;
  } else {
    const taken = (await database`SELECT position FROM pinned`).map(r => r.position);
    const free = [1, 2, 3].find(p => !taken.includes(p));
    const place = free ?? (Number.isInteger(replacing) && replacing >= 1 && replacing <= MOST_PINNED ? replacing : null);
    if (!place) return { full: true, pinned: await pull_pinned() };
    await database`
      INSERT INTO pinned (position, entry_id, line, prompt) VALUES (${place}, ${row.id}, ${words}, ${answers})
      ON CONFLICT (position) DO UPDATE SET entry_id = EXCLUDED.entry_id, line = EXCLUDED.line, prompt = EXCLUDED.prompt, pinned_at = now()
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

// The card's editor still chooses one pin (settings.pinned_entry_id). When it
// does, the first place follows it, so the two never disagree: the album it
// names takes the first place, keeping its line if it was already there.
export async function follow_card_pin(entryId) {
  const [{ count }] = await database`SELECT count(*)::int AS count FROM pinned`;
  if (!count) return;
  const [first] = await database`SELECT entry_id FROM pinned WHERE position = 1`;
  if ((first?.entry_id ?? null) === (entryId ?? null)) return;
  if (entryId == null) {
    await database`DELETE FROM pinned WHERE position = 1`;
    return;
  }
  const [was] = await database`SELECT position, line, prompt FROM pinned WHERE entry_id = ${entryId}`;
  if (was) await database`DELETE FROM pinned WHERE position = ${was.position}`;
  await database`
    INSERT INTO pinned (position, entry_id, line, prompt) VALUES (1, ${entryId}, ${was?.line ?? null}, ${was?.prompt ?? null})
    ON CONFLICT (position) DO UPDATE SET entry_id = EXCLUDED.entry_id, line = EXCLUDED.line, prompt = EXCLUDED.prompt, pinned_at = now()
  `;
}
