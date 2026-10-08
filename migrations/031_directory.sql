-- The directory, 2026-10-07.
--
-- A list of journals that chose to be findable (Miyel's directory
-- instructions). listeningnotes.blog keeps a table of addresses and the last
-- beacon it saw from each, and nothing else: no entries, no accounts, no
-- writing ever leaves a journal. Every copy runs the same migrations, so
-- every copy gets the table, and only the copy the others' DIRECTORY_URL
-- names ever fills it — the way only the canonical copy's `reports` fills.
--
-- `directory`: the first three columns are the record — the journal's
-- address as tidyJournal spells it, the code it proved the address with, and
-- when. The rest is the last beacon seen, so a reader never waits on a
-- fetch: the keeper's name, the beacon's state and record and cover; when
-- the journal was last asked (`checked_at`), when it was last seen logging
-- (`last_logging_at`, which sets how often it is asked), and how many asks in
-- a row it has not answered (`fail_count`, which slows the asking further).
-- A row exists only once the code has come back: asking writes nothing.
--
-- `settings.listing_code`: on every journal, the code the directory issued
-- it, served at /api/public/listing while it is listed and null while it is
-- not. Kept off pull_settings' list of columns, so the public settings read
-- never carries it.
CREATE TABLE IF NOT EXISTS directory (
  address          text PRIMARY KEY,
  code             text NOT NULL,
  listed_at        timestamp with time zone NOT NULL DEFAULT now(),
  name             text,
  state            text,
  album            text,
  artist           text,
  art              text,
  checked_at       timestamp with time zone,
  last_logging_at  timestamp with time zone,
  fail_count       integer NOT NULL DEFAULT 0
);

ALTER TABLE settings ADD COLUMN IF NOT EXISTS listing_code text;
