-- Copyright (C) 2026 Miyel Brown
-- SPDX-License-Identifier: AGPL-3.0-or-later
-- migrations/005_posted_at.sql
--
-- When an entry was posted, with its time zone. entries.created_at is a
-- `timestamp without time zone` holding a UTC clock reading, and the driver
-- hands a naive value back as though it were local time: on a machine four
-- hours behind UTC every entry arrived four hours late, and a listen logged
-- at 11pm was dated tomorrow. Every other table already stamps with a zone;
-- entries was the first table written and predates the habit.
--
-- The first migration under the additive-only rule, so it is the shape every
-- later one has to take: a new column, filled from the old one, and the old
-- one left exactly where it was. created_at stays and keeps being written by
-- its default; nothing reads it any more. See DECISIONS, "Migrations".
--
-- Three statements, in this order, because the order is the whole thing.
-- ADD COLUMN with a DEFAULT stamps every existing row with the default the
-- moment it runs, so a fill that looks for empty rows afterwards finds none
-- and every old entry is dated today. Add it empty, fill it, then default it.
ALTER TABLE entries ADD COLUMN IF NOT EXISTS posted_at timestamp with time zone;
-- The stored clock reading is UTC, so that is the zone it is read in.
UPDATE entries SET posted_at = created_at AT TIME ZONE 'UTC' WHERE posted_at IS NULL;
ALTER TABLE entries ALTER COLUMN posted_at SET DEFAULT now();
