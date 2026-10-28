-- Copyright (C) 2026 Miyel Brown
-- SPDX-License-Identifier: AGPL-3.0-or-later
-- What this keeper wrote back, 2026-10-27.
--
-- Miyel's Friends brief, step four: Words, a conversation about one record
-- that can be seen whole — theirs on the left, yours on the right. Their
-- side is already here, one row in `messages` for each thing they wrote.
-- Yours never was: writing back is a message going the other way, which
-- lands on their journal and left nothing on this one but the time it was
-- answered (replied_at, migration 029; library/outbox.js). Her answers,
-- 2026-10-26: "Add the table; it's additive … My words show from the day it
-- ships, not before. That's fine, say so in the empty state."
--
-- A row is written once a reply has landed on their journal, and only then
-- (app/api/outbox/route.js): who it went to, the words, and the record it
-- is about, named as every cross-copy reference is — a journal and a slug,
-- the journal empty when the record is one of this journal's own, as in
-- `messages`. `reply_to` is the message here it answered; not a foreign
-- key, since that message can be dismissed and these words should not go
-- with it. Kept, like everything anybody typed, and never sent anywhere.
CREATE TABLE IF NOT EXISTS said_back (
  id             serial PRIMARY KEY,
  to_journal     text NOT NULL,
  to_name        text,
  said           text NOT NULL,
  about_journal  text,
  about_slug     text,
  about_album    text,
  about_artist   text,
  about_art      text,
  about_song     text,
  reply_to       integer,
  sent_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS said_back_to_journal ON said_back (to_journal);
