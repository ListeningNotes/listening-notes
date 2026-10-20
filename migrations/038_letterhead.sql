-- Copyright (C) 2026 Miyel Brown
-- SPDX-License-Identifier: AGPL-3.0-or-later
-- LN. Admin letters, 2026-10-20.
--
-- A message from the software rather than from a journal (Miyel's brief,
-- LN. Admin messages): a row in `messages` like any other, marked `admin`,
-- with no sending journal. It arrives through the copy's own public messages
-- route, sealed with the canonical keeper's key, and is kept only when the
-- seal is good (library/letterhead.js). One is pinned at a time — a new one
-- replaces the last — and dismissing deletes it.
--
-- `settings.letterhead_heard_at` is when the newest letter kept was sent. A
-- letter sent no later than it is refused, so one dismissed can never be
-- posted back in. A time, and nothing about what the letter said.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS admin boolean NOT NULL DEFAULT false;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS letterhead_heard_at timestamptz;
