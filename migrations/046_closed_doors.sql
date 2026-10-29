-- Copyright (C) 2026 Miyel Brown
-- SPDX-License-Identifier: AGPL-3.0-or-later
-- The strangers let go, 2026-10-27.
--
-- Miyel's Friends brief, step five: somebody not in the keeper's friends who
-- sends something appears in the row like anyone else, and what makes that
-- safe is three limits rather than a separate place — one thing at a time,
-- thirty days, and closed doors. Her answers, 2026-10-26: "A stranger whose
-- thing I let go can't send again until I add them … otherwise Let it go
-- just invites the next one."
--
-- A row is a journal whose thing was let go while it was nobody in the
-- book: its address, kept the way every address is, the name it gave, and
-- when. While its row is here this journal's doors refuse that address's
-- sends, messages and waves (library/people_actions.js, arrival_refused);
-- adding the journal takes the row away. Removing somebody from the book
-- writes nothing here — a removed person who sends again arrives as a
-- stranger, and removing is not blocking. Nothing is sent anywhere: the
-- sender is told only that this journal has not added them.
CREATE TABLE IF NOT EXISTS closed_doors (
  address    text PRIMARY KEY,
  name       text,
  closed_at  timestamptz NOT NULL DEFAULT now()
);
