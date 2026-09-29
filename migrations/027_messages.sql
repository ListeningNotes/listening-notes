-- Copyright (C) 2026 Miyel Brown
-- SPDX-License-Identifier: AGPL-3.0-or-later
-- migrations/027_messages.sql
--
-- Messages, 2026-09-28.
--
-- Comments go, and nobody's words appear on a journal but its keeper's
-- (Miyel's brief of 2026-09-28). Somebody with something to say about an
-- entry writes the keeper a message, and it arrives in the inbox among the
-- sends, the waves and what came back. It is never drawn on a page. A
-- message is one arrival and not a thread: writing back is a new message
-- going the other way, with a row of its own on the other journal.
--
-- ── Why a table of its own ────────────────────────────────────────────────
-- The brief calls a message the same object a send is, with a different
-- payload, and on screen that is what it is: one row shape. It is not kept
-- in `submissions`, because that table insists on an album, an artist and a
-- note, and because a person's page counts what they sent and how it landed
-- off it, where a message is not a record anybody was handed. Every kind of
-- arrival has its own table already (waves, came_back, reports).
--
-- ── What a row holds ──────────────────────────────────────────────────────
-- Who it is from: the name they gave, and their journal when they keep one,
-- stored the way every address is, bare and lower case. Somebody without a
-- copy has a name and nothing else.
--
-- The words, in `said`.
--
-- What it is about, when it is about something. An entry is named by a
-- journal and a slug, never an id (DECISIONS: a cross-copy reference is a
-- journal and a slug). `about_journal` is empty when the entry is one of
-- this journal's own, which is nearly always; it is filled when a keeper
-- writes back about an entry that lives on theirs. The album, the artist,
-- the cover and the song are kept as they were when the message arrived, so
-- the row draws without asking anybody and goes on saying what it was about
-- after the entry has gone. `about_song` is the song when the message was
-- written from a track's note rather than from the album's.
--
-- `arrived_at` orders the inbox and `seen_at`, null, is its dot. There is
-- no status column and no archive: a message is dismissed, and dismissing
-- deletes it.
--
-- ── The comments that were already here ───────────────────────────────────
-- Nothing should disappear from a page without its keeper seeing it first.
-- So this file also brings every comment on a standing entry into the inbox,
-- once: the published ones marked `was_comment`, because they used to be on
-- the entry, and the ones still waiting to be approved as ordinary messages,
-- because the queue they were waiting in is going too. The keeper's own
-- replies come across with the rest — they leave the page as well.
--
-- They arrive together, now, at the top of the list, and `written_at` keeps
-- the day each was written, which is the date its row prints.
--
-- `comment_id` is the comment a row was copied from. It is what stops a
-- comment arriving twice, here or anywhere this statement is ever run again,
-- and it is how dismissing a message that was a comment finds the comment to
-- take with it. Not a foreign key: a comment can be deleted with its entry,
-- and the message it became should not care.
--
-- A comment whose entry has been deleted is left where it is. It was on no
-- page to disappear from.
--
-- Nothing here touches the `comments` table. It stays, with every row in
-- it, read by nothing (DECISIONS: the schema is additive only).
CREATE TABLE IF NOT EXISTS messages (
  id            serial PRIMARY KEY,
  from_name     text,
  from_journal  text,
  said          text NOT NULL,
  about_journal text,
  about_slug    text,
  about_album   text,
  about_artist  text,
  about_art     text,
  about_song    text,
  was_comment   boolean NOT NULL DEFAULT false,
  comment_id    integer UNIQUE,
  written_at    timestamptz,
  arrived_at    timestamptz NOT NULL DEFAULT now(),
  seen_at       timestamptz
);

INSERT INTO messages (
  from_name, from_journal, said,
  about_slug, about_album, about_artist, about_art, about_song,
  was_comment, comment_id, written_at
)
SELECT
  NULLIF(btrim(c.author_name), ''),
  -- Their journal, cut down to the host the way every address is kept. An
  -- older comment may carry a scheme, a path, or an email typed into the
  -- wrong box; an email is nobody's journal (migrations/011).
  CASE
    WHEN COALESCE(c.author_url, '') LIKE '%@%' THEN NULL
    ELSE NULLIF(split_part(regexp_replace(lower(btrim(COALESCE(c.author_url, ''))), '^https?://', ''), '/', 1), '')
  END,
  c.content,
  c.entry_slug,
  e.album,
  e.artist,
  NULLIF(btrim(COALESCE(e.album_art, '')), ''),
  -- The song: the track the comment was under, by its place in the entry's
  -- own list, or the entry's song when the entry is a note on one track.
  -- Anything that cannot be read is simply no song, and the message is about
  -- the record.
  CASE
    WHEN c.track_index >= 0 AND jsonb_typeof(e.tracks) = 'array'
      THEN NULLIF(btrim(COALESCE(e.tracks -> c.track_index ->> 'title', '')), '')
    ELSE NULLIF(btrim(COALESCE(e.song, '')), '')
  END,
  NOT c.pending,
  c.id,
  c.created_at
FROM comments c
JOIN entries e ON e.slug = c.entry_slug
WHERE btrim(COALESCE(c.content, '')) <> ''
ORDER BY c.created_at, c.id
ON CONFLICT (comment_id) DO NOTHING;
