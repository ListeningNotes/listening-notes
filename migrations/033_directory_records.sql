-- The directory's records, 2026-10-08.
--
-- What lets the Board say "also on your records" and "being logged
-- everywhere" (Miyel's Board brief). The directory keeps each listed
-- journal's records as its public feed already shows them — the record, the
-- stars, the marks, when — and never the writing: a line of somebody's words
-- is read from their own journal when it is shown, and kept nowhere. Miyel,
-- on whether the directory may keep this: "this is fair."
--
-- Filled only on the copy the others' DIRECTORY_URL names, by the same job
-- that reads beacons, and emptied for a journal the moment it leaves the
-- Board — leaving removes the only things that were there.
--
-- `directory_records`: one row per entry on a listed journal, keyed by the
-- journal's address and the entry's slug — how one copy refers to another's
-- entry, never by an id. `album_key` is the journal's own fold of the record
-- (the generated column every copy computes the same way, 001_initial.sql),
-- and `key_hash` the first sixteen characters of its sha256, which is how a
-- journal asks which of its records others have logged. `song` marks a track
-- note, which the Board does not count as logging the record.
--
-- `directory.records_at`: when a journal's records were last read.
CREATE TABLE IF NOT EXISTS directory_records (
  address      text NOT NULL,
  slug         text NOT NULL,
  album_key    text NOT NULL,
  key_hash     text NOT NULL,
  album        text,
  artist       text,
  art          text,
  song         text,
  stars        numeric,
  favorite     boolean NOT NULL DEFAULT false,
  formative    boolean NOT NULL DEFAULT false,
  masterpiece  boolean NOT NULL DEFAULT false,
  posted_at    timestamp with time zone,
  PRIMARY KEY (address, slug)
);

CREATE INDEX IF NOT EXISTS directory_records_key_hash ON directory_records (key_hash);

CREATE INDEX IF NOT EXISTS directory_records_posted ON directory_records (posted_at);

ALTER TABLE directory ADD COLUMN IF NOT EXISTS records_at timestamp with time zone;
