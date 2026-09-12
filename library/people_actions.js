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

export async function pull_people() {
  return await database`
    SELECT id, address, name, added_at
    FROM people
    ORDER BY lower(coalesce(name, address)), added_at
  `;
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
    RETURNING id, address, name, added_at
  `;
  return row;
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
export async function ask_journal_name(address) {
  const url = journalUrl(address);
  if (!url) return null;
  try {
    const answer = await fetch(`${url}/api/settings`, {
      signal: AbortSignal.timeout(6000),
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
