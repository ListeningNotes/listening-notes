// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/people_actions.js
// The address book: the journals this copy's keeper reads.
//
// A person is an address — migrations/007_people.sql has why that is the
// whole of it. The spelling is the send form's, cut down to the host
// (tidyJournal in library/return_address.js), so a journal filed from a
// send, a scanned code, a paste or an entry's link is one row however it
// arrived.
import database from './database_connection.js';
import { tidyJournal, journalUrl } from './return_address.js';

// Pinned first, in the order they were pinned, then everybody else by name.
// `pinned_at IS NULL` sorts false before true, which puts the pinned ones at
// the top without a second query or a sort in the page.
export async function pull_people() {
  return await database`
    SELECT id, address, name, added_at, pinned_at
    FROM people
    ORDER BY (pinned_at IS NULL), pinned_at, lower(coalesce(name, address)), added_at
  `;
}

// How many can be up there at once (Miyel, 2026-09-20). Six is two rows of
// three at the size they are drawn, and past that the shelf is pins and the
// book is a line under them — which is the pane inside out.
//
// **This is the rule.** Friends.js keeps its own copy of the number so it can
// grey the door out before you press it, and cannot import this one: this
// module opens the database and that one runs in a browser. If they ever
// disagree, this wins and the door is merely wrong about itself.
export const PINS_MOST = 6;

// Pinning is a stamp or nothing — see migrations/021_pinned_people.sql. The
// stamp is the order as well as the fact, so re-pinning somebody already
// pinned moves them to the end of the pinned row rather than doing nothing;
// that is the honest reading of pressing it again on purpose.
export async function pin_person(id, on) {
  if (on) {
    const [{ count }] = await database`
      SELECT count(*)::int AS count FROM people WHERE pinned_at IS NOT NULL AND id <> ${id}`;
    if (count >= PINS_MOST) {
      const full = new Error(`Six is the most you can pin. Unpin somebody first.`);
      full.full = true;
      throw full;
    }
  }
  const [row] = await database`
    UPDATE people
    SET pinned_at = ${on ? new Date() : null}
    WHERE id = ${id}
    RETURNING id, address, name, added_at, pinned_at
  `;
  return row || null;
}

// Filing an address already there is not an error: it is the same person,
// and a newer name — if one arrived — is kept. Nothing else about the row
// changes, so re-adding never moves anybody.
export async function save_person({ address, name }) {
  const host = tidyJournal(address);
  if (!host) throw new Error("That doesn't look like a journal address.");
  const [row] = await database`
    INSERT INTO people (address, name)
    VALUES (${host}, ${String(name || '').trim() || null})
    ON CONFLICT (address) DO UPDATE
      SET name = COALESCE(EXCLUDED.name, people.name)
    RETURNING id, address, name, added_at, pinned_at
  `;
  return row;
}

export async function pull_person(id) {
  const [row] = await database`
    SELECT id, address, name, added_at, pinned_at FROM people WHERE id = ${id} LIMIT 1
  `;
  return row || null;
}

export async function remove_person(id) {
  const [row] = await database`
    DELETE FROM people WHERE id = ${id} RETURNING id
  `;
  return row || null;
}

// Asks a journal what its keeper is called, the way any visitor's browser
// could — its settings route is public, and the name is the first thing on
// it. Done here rather than in the browser because that route does not say
// it may be read across origins, and it should not have to: this is a read
// the keeper's own server makes on the keeper's own say-so. Null when the
// address does not answer as a journal, in a few seconds or at all; the
// person is filed either way, since an address is an address whether or
// not it is up this minute.
//
// `wait` is how long to give it. Six seconds for filing, where nobody is
// watching; /get asks with less, because a stranger is looking at a page
// that is waiting on the answer (2026-09-22).
export async function ask_journal_name(address, wait = 6000) {
  const url = journalUrl(address);
  if (!url) return null;
  try {
    const answer = await fetch(`${url}/api/settings`, {
      signal: AbortSignal.timeout(wait),
      headers: { accept: 'application/json' },
    });
    if (!answer.ok) return null;
    const { settings } = await answer.json();
    const name = String(settings?.keeper_name || '').trim();
    return name || null;
  } catch {
    return null;
  }
}
