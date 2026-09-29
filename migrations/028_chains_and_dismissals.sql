-- Copyright (C) 2026 Miyel Brown
-- SPDX-License-Identifier: AGPL-3.0-or-later
-- migrations/028_chains_and_dismissals.sql
--
-- What a message answers, and a way to put away a record that came back,
-- 2026-09-29.
--
-- ── The line a message answers ────────────────────────────────────────────
-- Miyel, on seeing messages in the inbox: a row should show what it is
-- about, "almost like a message chain", drawn the way the inbox drew replies
-- — what was said first, greyed, then the response.
--
-- For a message about one of this journal's own entries that line is the
-- keeper's own note, and it is read off the entry when the row opens: the
-- note may have been corrected since, and the writing stays out of lists
-- (DECISIONS, What a read costs). Nothing is kept for those.
--
-- `answering` is for the two cases the entry cannot answer. A reply that
-- arrives from another keeper's copy carries the words it is replying to,
-- because this copy keeps no record of what it sent (library/outbox.js). And
-- a comment that was itself a reply, brought across by migration 027, was
-- answering another comment and not the note. `answering_name` is whose
-- words those were; empty means the keeper's own, which prints as "You
-- said".
--
-- One line and not a thread: a message is still one arrival (the messages
-- brief). What it answers is context for reading it, cut to a few lines, and
-- nothing is stacked under it.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS answering text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS answering_name text;

-- The comments that were replies, for every journal where 027 has just
-- brought them across. Only rows nothing has filled yet, so this changes
-- nothing on a second run.
UPDATE messages m
SET answering = LEFT(btrim(p.content), 600),
    answering_name = NULLIF(btrim(p.author_name), '')
FROM comments c
JOIN comments p ON p.id = c.parent_id
WHERE m.comment_id = c.id
  AND m.answering IS NULL
  AND btrim(COALESCE(p.content, '')) <> '';

-- ── Dismissing a record that came back ────────────────────────────────────
-- A row in the inbox for a record this journal put somebody onto had one
-- state, seen, and no way to leave. It opens now, and one of its doors is
-- Dismiss.
--
-- It cannot be a delete. What came back is noticed by reading a friend's
-- public feed (library/came_back_actions.js), and the feed will go on saying
-- it: a row that was deleted would be noticed again on the next visit and
-- arrive as new. So the row stays and says it was put away, which is also
-- what stops it coming back.
ALTER TABLE came_back ADD COLUMN IF NOT EXISTS dismissed_at timestamptz;
