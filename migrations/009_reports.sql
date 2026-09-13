-- Copyright (C) 2026 Miyel Brown
-- SPDX-License-Identifier: AGPL-3.0-or-later
-- migrations/009_reports.sql
--
-- What a keeper says when something did not work. Written on Listening
-- Notes, from their own desk, and sent to the one copy the software comes
-- from — a letter, not a phone-home: nothing is sent unless a person presses
-- Send. It lands in that copy's inbox beside the sends and the comments.
--
-- Every copy has the table, because every copy runs the same code and the
-- route that receives a report is the same route everywhere; only the copy
-- named in REPORTS_URL (library/version.js) is ever written to. The report
-- carries what was said, who said it — their name and journal, so there is a
-- way to find them, since nothing here has an email — and what a keeper
-- would otherwise have to be asked: the version and the browser.
CREATE TABLE IF NOT EXISTS reports (
  id serial NOT NULL,
  said text NOT NULL,
  keeper_name text,
  journal text,
  version text,
  agent text,
  status text DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reports_pkey PRIMARY KEY (id)
);
