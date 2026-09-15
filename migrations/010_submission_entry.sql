-- Copyright (C) 2026 Miyel Brown
-- SPDX-License-Identifier: AGPL-3.0-or-later
-- migrations/010_submission_entry.sql
--
-- The record a send became.
--
-- A send has had two ends since the inbox existed: it is pending, or it is
-- dismissed. There is a third real outcome and it had nowhere to live — the
-- album was sent, it was listened to, it was logged, and the send is still
-- sitting in the inbox as though nobody ever opened it. That happens whenever
-- the listen started anywhere but the inbox's own Start a listen: the entry
-- exists, the connection is in the keeper's head, and dismissing the send
-- would say the opposite of what happened.
--
-- So a submission can point at the entry it became. Null means it has not,
-- which is every row that exists today and most rows after — nothing about
-- this is retroactive, and nothing matches sends to entries automatically.
-- It is set by one button on the row (status 'logged'), and the entry it
-- names has its received_from set to the sender in the same press, so the
-- credit exists on both sides.
--
-- ON DELETE SET NULL, which is the settings.pinned_entry_id shape and
-- deliberately not the comments.entry_slug one: a text column pointing at a
-- slug leaves rows behind forever when the record they name is deleted, and
-- that mistake is already in this schema once. Deleting an entry here simply
-- returns its send to having no record, which is true.
--
-- 'logged' is a new value for submissions.status, which is a plain text
-- column with no check constraint, so it needs no migration of its own. The
-- older 'reviewed' stays exactly as it is and keeps its own meaning — a
-- listen was started from the row — which is not the same claim as this one.
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS entry_id integer;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'submissions_entry_id_fkey'
                   AND conrelid = 'submissions'::regclass) THEN
    ALTER TABLE submissions ADD CONSTRAINT submissions_entry_id_fkey
      FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE SET NULL;
  END IF;
END $$;
