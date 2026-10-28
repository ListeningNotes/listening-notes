-- Copyright (C) 2026 Miyel Brown
-- SPDX-License-Identifier: AGPL-3.0-or-later
-- The friends' records this keeper has seen, 2026-10-27.
--
-- Miyel's Friends brief: a record on the Friends wall says New until it has
-- been seen, and it is seen when it scrolls past, not when it is pressed.
-- Her answers of 2026-10-26: "New means I haven't seen it. That's all." The
-- mark is a flag in this copy alone — it never leaves this journal, nobody
-- is told anything was read, and no read receipt crosses.
--
-- A row is one entry on another journal, named the way every cross-copy
-- reference is, by its journal and its slug and never an id (DECISIONS).
-- Only entries new enough to say New are ever written, and the library
-- clears rows past that age as it writes, so the table holds a fortnight of
-- what friends logged, not their archives (library/people_actions.js).
CREATE TABLE IF NOT EXISTS seen_records (
  journal  text NOT NULL,
  slug     text NOT NULL,
  seen_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (journal, slug)
);
