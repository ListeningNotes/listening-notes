-- What came back, 2026-09-22.
--
-- A record this journal put somebody onto, logged on their journal: an entry
-- whose credit names this journal's address (or, from before addresses
-- travelled, its keeper's name). The friends brief's third item, "a returned
-- send is an arrival" — a row in the inbox, new once and then not.
--
-- Why a table of its own. The brief's idea was a stamp on the send's own
-- row, and there is no such row: a copy keeps no record of what it sends
-- (library/outbox.js), and a send made on somebody's card never touched this
-- copy at all. What came back is only ever known by what their public feed
-- says, so that is what is kept — enough to draw the row without asking their
-- journal again, and the one fact this copy has to remember for itself:
-- whether its keeper has seen it.
--
-- The browser notices and this copy writes it down (library/came_back_actions
-- .js): the first time a copy stores something its own browser learned from
-- reading somebody else's public feed. DECISIONS has it.
--
-- One row per entry, and the journal and slug together are that entry's
-- address — the one identifier that means the same thing in two databases
-- (DECISIONS: a cross-copy reference is a journal and a slug, never an id).
-- Noticing it again changes nothing. `seen_at` null is the inbox's dot.
CREATE TABLE IF NOT EXISTS came_back (
  id          serial PRIMARY KEY,
  journal     text NOT NULL,
  slug        text NOT NULL,
  name        text,
  album       text NOT NULL,
  artist      text,
  album_art   text,
  rating      numeric,
  masterpiece boolean NOT NULL DEFAULT false,
  by_hand     boolean NOT NULL DEFAULT false,
  posted_at   timestamptz,
  noticed_at  timestamptz NOT NULL DEFAULT now(),
  seen_at     timestamptz,
  UNIQUE (journal, slug)
);
