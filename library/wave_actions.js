// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/wave_actions.js
// The waves that have arrived here: somebody added this journal and said so.
//
// Kept on the copy that was waved at, one row per waving journal
// (migrations/024_waves.sql). The route that takes a wave checks the journal
// is real and asks it its own name before anything reaches here, so what is
// stored is what that journal says it is called, never what the wave claimed.
import database from './database_connection.js';
import { tidyJournal } from './return_address.js';

// Newest first.
export async function pull_waves() {
  return await database`
    SELECT id, address, name, arrived_at, seen_at
    FROM waves
    ORDER BY arrived_at DESC
    LIMIT 60
  `;
}

// A wave from a journal that has waved before replaces the first: a new
// time, the name as it is now, and new again. Never a second row.
export async function save_wave({ address, name }) {
  const host = tidyJournal(address);
  if (!host) throw new Error("That doesn't look like a journal address.");
  const [row] = await database`
    INSERT INTO waves (address, name)
    VALUES (${host}, ${String(name || '').trim().slice(0, 120) || null})
    ON CONFLICT (address) DO UPDATE
      SET name = COALESCE(EXCLUDED.name, waves.name), arrived_at = now(), seen_at = NULL
    RETURNING id
  `;
  return row;
}

// Opened, so no longer new.
export async function see_wave(id) {
  const [row] = await database`
    UPDATE waves SET seen_at = now() WHERE id = ${id} AND seen_at IS NULL RETURNING id
  `;
  return row || null;
}

// Left: the row goes. Leaving a wave is not refusing anything — there was
// nothing asked — so nothing is kept of it and nothing is sent back.
export async function remove_wave(id) {
  const [row] = await database`DELETE FROM waves WHERE id = ${id} RETURNING id`;
  return row || null;
}
