-- Waves, 2026-09-23.
--
-- Adding somebody is silent and one-sided, and stays that way. A wave is the
-- adder choosing to say hello — "I'm keeping your journal, here's where mine
-- is" — sent from their copy to this one when they add this journal, and at
-- no other time (Miyel, 2026-09-22: one-way, no wave back).
--
-- One row per waving address. A second wave from the same journal replaces
-- the first, with a new time and new again, so nobody can stack ten. The row
-- is the address, the name that journal gave when this copy asked it, when
-- it arrived, and whether it has been seen — **and no message column, now or
-- later**: a wave carries a name and an address and never words. Leaving a
-- wave deletes its row; nothing is ever reported back to the waver.
CREATE TABLE IF NOT EXISTS waves (
  id          serial PRIMARY KEY,
  address     text NOT NULL UNIQUE,
  name        text,
  arrived_at  timestamptz NOT NULL DEFAULT now(),
  seen_at     timestamptz
);
