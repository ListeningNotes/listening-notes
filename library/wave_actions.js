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
// Whether a wave has arrived that has not been seen (app/api/waiting,
// 2026-10-20).
export async function any_unseen_waves() {
  const [row] = await database`SELECT EXISTS (SELECT 1 FROM waves WHERE seen_at IS NULL) AS any`;
  return row?.any === true;
}

export async function pull_waves() {
  return await database`
    SELECT id, address, name, arrived_at, seen_at
    FROM waves
    ORDER BY arrived_at DESC
    LIMIT 60
  `;
}

// One wave from a journal at a time, 2026-10-26 (Miyel's Friends answers:
// "One wave outstanding per person at a time"). A second, while the first is
// still here, is kept as nothing: the first keeps its time and does not turn
// new again, so adding and removing a hundred times is still one wave. It
// replaced the first until this day. The sender is answered the same either
// way, because a waver never learns what this copy did (DECISIONS, A wave).
// What clears it is this keeper's press: let go, or waved back
// (`waved_back`).
export async function save_wave({ address, name }) {
  const host = tidyJournal(address);
  if (!host) throw new Error("That doesn't look like a journal address.");
  const [row] = await database`
    INSERT INTO waves (address, name)
    VALUES (${host}, ${String(name || '').trim().slice(0, 120) || null})
    ON CONFLICT (address) DO NOTHING
    RETURNING id
  `;
  return row || null;
}

// Waving at somebody who had waved here answers theirs: it goes, and their
// next wave can arrive.
export async function waved_back(address) {
  const host = tidyJournal(address);
  if (!host) return null;
  const [row] = await database`DELETE FROM waves WHERE address = ${host} RETURNING id`;
  return row || null;
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
