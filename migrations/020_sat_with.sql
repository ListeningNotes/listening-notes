-- A listen whose post was deleted (Miyel, 2026-09-18).
--
-- The beacon reads entries, drafts and the one live needle row, which means a
-- published listen's only lasting record is its entry. Delete the entry and
-- the evening it was written about has nowhere left to live: Miyel deleted a
-- test post and watched the record leave the beacon with it — "that's not
-- necessary, the beacon isn't just about posts but also listens."
--
-- So deleting keeps this much and no more: what the record was, and when it
-- was on. No notes, no ratings, no marks, no slug — there is no page any more,
-- and a cover on the beacon that opens nothing is the honest drawing of a
-- listen with nothing written about it, which is exactly what a draft's tile
-- already does.
--
-- Only ever written on a delete. It is not a log of everything played, which
-- is a different thing from a journal showing its work and is ruled out in
-- DECISIONS. Deleting a post is deliberate; this holds the one fact that act
-- was never meant to take with it.
--
-- `at` is the entry's posted_at rather than the moment of deletion, so the row
-- keeps its true place in the order. A record heard in June that is deleted
-- today belongs in June.
CREATE TABLE IF NOT EXISTS sat_with (
  id serial PRIMARY KEY,
  album text NOT NULL,
  artist text,
  album_art text DEFAULT ''::text,
  at timestamp with time zone DEFAULT now() NOT NULL
);
