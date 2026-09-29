// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/message_actions.js
// Messages: somebody's words, addressed to this journal's keeper.
//
// Kept on the copy they were written to, one row each, and drawn in the
// inbox and nowhere else (migrations/027_messages.sql has why they are a
// table of their own, and what a row holds). The route that takes a message
// decides who it is from and whether their journal is real before anything
// reaches here; this file tidies what it is handed, looks up the entry a
// message is about when the entry is one of this journal's own, and keeps
// the words.
//
// Nothing here is a thread. A message is one arrival, and writing back is a
// new message on the other journal (library/outbox.js).
import database from './database_connection.js';
import { tidyJournal } from './return_address.js';

// The most a message may hold. A paragraph or three; the same ceiling a
// problem report has, and for the same reason: it is a letter, not a file.
export const SAID_MOST = 4000;

// How many the inbox reads. Dismissing deletes, so the list is only ever
// what a keeper has not yet dealt with, and two hundred of those is a
// backlog nobody scrolls.
const MOST_READ = 200;

// A slug goes into a link, so it is letters, numbers, hyphens and
// underscores, and nothing that could walk a path.
const LOOKS_LIKE_A_SLUG = /^[\w-]{1,200}$/;

function text(value, most) {
  const said = String(value ?? '').trim();
  return said ? said.slice(0, most) : null;
}

// Whether two addresses are one journal. A journal answers with and without
// a leading www, and which of the two a keeper typed into Settings is not
// something anybody writing to them can know.
export function sameJournal(one, other) {
  const bare = value => tidyJournal(value).replace(/^www\./, '');
  const a = bare(one);
  return Boolean(a) && a === bare(other);
}

// What a message is about, read into one shape from whatever arrived. Null
// when it is about nothing, or when what was handed over does not name an
// entry: a message with a broken reference is still somebody's words, and
// the words are the part that matters.
//
// `own` is this journal's address. An entry named at it is one of this
// journal's own, which is stored as no journal at all, so a journal that
// moves does not leave its inbox pointing at the old address.
function tidyAbout(about, own) {
  if (!about || typeof about !== 'object') return null;
  const slug = String(about.slug ?? '').trim().toLowerCase();
  if (!LOOKS_LIKE_A_SLUG.test(slug)) return null;
  const journal = tidyJournal(about.journal);
  const art = text(about.art, 1000);
  return {
    journal: journal && !sameJournal(journal, own) ? journal : null,
    slug,
    album: text(about.album, 300),
    artist: text(about.artist, 300),
    art: art && /^https:\/\//i.test(art) ? art : null,
    song: text(about.song, 300),
  };
}

// Newest first by when it arrived. The comments that came across together
// (migration 027) arrived in the same moment, so among them it is the day
// each was written that orders them.
//
// `entry_here` is whether an entry of this journal's own is still in the
// journal, so a row does not offer to open one that has gone.
export async function pull_messages() {
  return await database`
    SELECT m.id, m.from_name, m.from_journal, m.said,
           m.about_journal, m.about_slug, m.about_album, m.about_artist,
           m.about_art, m.about_song,
           m.was_comment, m.written_at, m.arrived_at, m.seen_at,
           (e.id IS NOT NULL) AS entry_here
    FROM messages m
    LEFT JOIN entries e ON m.about_journal IS NULL AND e.slug = m.about_slug
    ORDER BY m.arrived_at DESC, m.written_at DESC NULLS LAST, m.id DESC
    LIMIT ${MOST_READ}
  `;
}

// Keep one. `own` is this journal's address, tidied, or empty when it has
// none set.
//
// An entry of this journal's own is looked up here and the record is read
// off it, never taken from whoever is writing: the row will print an album
// and a cover, and what it prints should be what is in the journal. An
// entry on somebody else's journal cannot be looked up from here, so what
// their copy said about it is kept, tidied.
export async function save_message({ from_name, from_journal, said, about, own = '' }) {
  const words = String(said ?? '').trim();
  if (!words) throw new Error('Say something first.');

  let on = tidyAbout(about, own);
  if (on && !on.journal) {
    const [entry] = await database`
      SELECT album, artist, album_art, song FROM entries WHERE slug = ${on.slug} LIMIT 1
    `;
    on = entry
      ? {
          ...on,
          album: entry.album,
          artist: entry.artist,
          art: entry.album_art || null,
          // The entry's own song when it is a note on one track; otherwise
          // the track the message was written from, as it was named.
          song: text(entry.song, 300) || on.song,
        }
      : null;
  }

  const [row] = await database`
    INSERT INTO messages (
      from_name, from_journal, said,
      about_journal, about_slug, about_album, about_artist, about_art, about_song
    )
    VALUES (
      ${text(from_name, 120)},
      ${tidyJournal(from_journal) || null},
      ${words.slice(0, SAID_MOST)},
      ${on?.journal ?? null},
      ${on?.slug ?? null},
      ${on?.album ?? null},
      ${on?.artist ?? null},
      ${on?.art ?? null},
      ${on?.song ?? null}
    )
    RETURNING id, arrived_at
  `;
  return row;
}

// Opened, so no longer new. Only the first opening is kept.
export async function see_message(id) {
  const [row] = await database`
    UPDATE messages SET seen_at = now()
    WHERE id = ${id} AND seen_at IS NULL
    RETURNING id
  `;
  return row || null;
}

// Dismissed: the row goes, and that is how a message ends. There is no
// archive to put it in (Miyel's brief, 2026-09-28) — what matters enough to
// keep, a keeper quotes in their own writing.
//
// A message that was a comment takes the comment with it. Nothing draws the
// `comments` table any more, so a row left behind there would be somebody's
// words kept out of sight for no reason, in every backup and every export,
// after the one person who could read them had decided they were done.
export async function remove_message(id) {
  const [row] = await database`
    DELETE FROM messages WHERE id = ${id} RETURNING id, comment_id
  `;
  if (!row) return null;
  if (row.comment_id) {
    await database`DELETE FROM comments WHERE id = ${row.comment_id}`;
  }
  return { id: row.id };
}
