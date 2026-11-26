-- Copyright (C) 2026 Miyel Brown
-- SPDX-License-Identifier: AGPL-3.0-or-later
-- The pinned albums, 2026-11-25.
--
-- Miyel's brief (the wall is home, the room is the card): up to three albums
-- the keeper holds up in their room, each with one line of their own writing
-- about it — lifted out of the entry's album note, never typed for the pin, so
-- the words are always ones the entry itself says. Her word is "pinned".
--
-- A row is a place on the ledge (1 to 3), the entry it holds, and the line.
-- The line is kept as it was lifted; whether it still appears in the entry is
-- asked each time it is read (library/pinned_actions.js), and a line the
-- entry no longer says is not shown. An entry deleted takes its row with it.
--
-- settings.pinned_entry_id, the card's one pin since before this, stays and
-- is kept as the first place here, so a copy that reads only it, and every
-- page that still does, shows the same album first.
CREATE TABLE IF NOT EXISTS pinned (
  position   smallint PRIMARY KEY CHECK (position BETWEEN 1 AND 3),
  entry_id   integer NOT NULL UNIQUE REFERENCES entries(id) ON DELETE CASCADE,
  line       text,
  pinned_at  timestamptz NOT NULL DEFAULT now()
);
