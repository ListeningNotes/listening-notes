-- Copyright (C) 2026 Miyel Brown
-- SPDX-License-Identifier: AGPL-3.0-or-later
-- migrations/002_claim_existing_journals.sql
--
-- setup_complete has existed as a column for a while and nothing ever wrote
-- it, so every journal in the world reads false — including ones that have
-- been running for a year with a name, a portrait and hundreds of entries.
--
-- The welcome screen turns that column into a gate. Without this migration,
-- deploying it holds a fully configured live journal behind a page saying it
-- is not ready yet. The column stopped being decorative and became
-- load-bearing, and everything already in the database was written when it was
-- decorative.
--
-- A journal with a keeper's name on it has been claimed. That is the whole
-- test: nothing but a person can put a name there — the card editor and now
-- the welcome screen are the only writers — so a non-null keeper_name is
-- somebody having already answered the question setup asks.
--
-- A settings row with no name is left alone, because that genuinely is an
-- unclaimed copy and should meet the welcome screen. So is a database with no
-- settings row at all, which is what a fresh install has: the row is created
-- by the first save, so there is nothing here to update and the UPDATE
-- correctly touches zero rows.
--
-- Idempotent by nature — running it again finds nothing left to change.
UPDATE settings
   SET setup_complete = true
 WHERE keeper_name IS NOT NULL
   AND btrim(keeper_name) <> ''
   AND setup_complete IS DISTINCT FROM true;
