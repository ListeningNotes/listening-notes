-- Copyright (C) 2026 Miyel Brown
-- SPDX-License-Identifier: AGPL-3.0-or-later
-- migrations/013_needle.sql
--
-- What is on the desk right now.
--
-- The beacon used to have exactly one source, Last.fm, and a copy without it
-- had no beacon at all. Two of two testers failed to connect one, and one
-- combination — Apple Music on an iPhone — cannot work reliably however hard
-- anybody tries. So the default source is the listen itself: whatever track
-- you are on while logging is what your beacon shows, and Last.fm becomes an
-- optional extra rather than the missing piece.
--
-- **Why this is not the drafts row.** A draft is written once something has
-- been *typed* — that is deliberate, so that leaving one record for another
-- does not offer an empty listen back on the picker. But the first four
-- minutes of a listen are the album picked, track one open and nothing
-- written yet, which is exactly when the beacon should be lit. Writing empty
-- drafts to solve that would put phantom listens in the picker. So presence
-- gets its own row and `drafts` keeps meaning unfinished writing.
--
-- **One row, always id 1, like settings.** A journal has one keeper and one
-- record on the desk; putting a second one there overwrites the first with
-- nothing to check, which is the same shape as the pin.
--
-- **The needle lifts by itself.** `updated_at` is touched by interaction —
-- picking a record, turning to another track, writing a line — and never by
-- a tab simply being open, so leaving the page up on your desk and walking
-- away does not claim you are logging all weekend. The expiry lives in the
-- READ (library/needle.js), not in a cleanup job: a closed tab or a crashed
-- phone expires on its own with nothing having to run.
--
-- Nothing private is here. The album, the artist, the cover and the track
-- title are what a beacon says out loud; the notes stay in `drafts`.
CREATE TABLE IF NOT EXISTS needle (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  album text NOT NULL,
  artist text,
  album_art text,
  -- Blank until a track is chosen. The album screen with nothing picked is
  -- not yet a beacon — see the read.
  track text,
  updated_at timestamp with time zone DEFAULT now()
);
