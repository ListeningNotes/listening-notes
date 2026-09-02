-- Copyright (C) 2026 Miyel Brown
-- SPDX-License-Identifier: AGPL-3.0-or-later
-- migrations/003_secrets_and_theme.sql
--
-- Two things a copy has to hold for itself now that deploy asks for nothing
-- but a database.
--
-- ── secrets ───────────────────────────────────────────────────────────────
-- Everything that must never reach a visitor, in a table of its own. The
-- settings table is read by a public route and by the root layout on every
-- page, and it has stayed safe to read only because an explicit column list
-- keeps the images out — putting a password hash beside the portrait would be
-- one forgotten column away from printing it. A separate table has one narrow
-- reader, and nothing that selects settings can pick it up by accident.
--
-- What lives here, and why each one moved off the deploy form:
--   session_secret  signs the login cookie. Generated on first boot if the
--                   environment has none; nobody should type a random string.
--   password_hash   the owner's password, chosen on the site during setup,
--                   as a scrypt hash. Never the password itself.
--   claim_code      a one-time code printed in the build log while the copy
--                   is unclaimed, and cleared the moment it is. It is what
--                   stops a stranger who finds a fresh address from setting
--                   the password first.
--   lastfm_key      identifies this copy to Last.fm. Optional.
--   anthropic_key   turns research and the question mark on. Optional.
--
-- One row, forced by the check on id, for the same reason settings has one.
-- Every column nullable: a blank is a real answer, and an environment variable
-- still wins for anybody who already set one.
CREATE TABLE IF NOT EXISTS secrets (
  id             integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  session_secret text,
  password_hash  text,
  claim_code     text,
  lastfm_key     text,
  anthropic_key  text,
  updated_at     timestamp without time zone DEFAULT now()
);

-- ── theme ─────────────────────────────────────────────────────────────────
-- Which way the journal opens for a visitor who has never touched the switch:
-- 'light', 'dark', or null to follow whatever the site's default is. A reader
-- who has pressed the switch keeps their own choice in their browser; this is
-- only the starting position.
ALTER TABLE settings ADD COLUMN IF NOT EXISTS theme text;
