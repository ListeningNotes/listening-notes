-- What this journal has sent, 2026-10-15.
--
-- Until now a copy kept no record of what it sends (library/outbox.js): a
-- send was handed to the other journal and forgotten, and what came of it
-- was only known when it came back through the feed (023_came_back.sql).
-- Miyel asked to see the records she has sent that are still out — "waiting
-- to be returned, basically" — so a send made from this copy is written down
-- here once the other journal has taken it.
--
-- Only what this copy itself sent: a send made on somebody's card by a
-- visitor with no journal never touched it. The list begins with the first
-- send after this file ran; nothing before it was kept anywhere.
--
-- A row is waiting until the record comes back — a came_back row from the
-- same journal for the same record, matched when the list is read, never
-- written here — or until the keeper removes it, which deletes it. A send
-- the other keeper archived is never known: their inbox is theirs.
--
-- The other journal is named by its address, as every reference between
-- copies is (DECISIONS). `name` is what the address book called them on the
-- day, so the row reads right if they are later removed from the book.
-- `note` is the keeper's own words that went with it.
CREATE TABLE IF NOT EXISTS sent (
  id         serial PRIMARY KEY,
  journal    text NOT NULL,
  name       text,
  album      text NOT NULL,
  artist     text,
  song       text,
  album_art  text,
  note       text,
  sent_at    timestamptz NOT NULL DEFAULT now()
);
