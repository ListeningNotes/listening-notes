-- The Board, 2026-10-08.
--
-- The People tab's second half (Miyel's Board brief). Being on the Board is
-- the default for everyone — every journal already serves a public journal
-- and a public beacon, so the Board publishes nothing new — and a keeper
-- switches it off in Settings. Additive only: nothing dropped, renamed or
-- retyped.
--
-- `settings.findable`: whether this journal is on the Board. True for every
-- journal, new and old, until its keeper switches it off; switching off
-- delists it and takes it off every board, friends' included.
--
-- `people.private`: a person added privately. Never published: they stay
-- out of /api/public/people, so they are on nobody's board but the keeper's
-- own. False for everybody already in a book, as the brief has it.
ALTER TABLE settings ADD COLUMN IF NOT EXISTS findable boolean NOT NULL DEFAULT true;

ALTER TABLE people ADD COLUMN IF NOT EXISTS private boolean NOT NULL DEFAULT false;
