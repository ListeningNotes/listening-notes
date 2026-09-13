// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/report_actions.js
// Problems keepers wrote in, on their own desks, sent here. See
// migrations/009_reports.sql. The same shape as submission_actions: save
// (public, from any copy), pull and count (owner), status (owner).
import database from './database_connection.js';
import { tidyJournal } from './return_address.js';

const SAID_MOST = 4000;
const SHORT = 200;

const clip = (value, n) => String(value ?? '').trim().slice(0, n) || null;

export async function save_report({ said, keeper_name, journal, version, agent }) {
  const words = String(said ?? '').trim();
  if (!words) throw new Error('Say what happened.');
  const [row] = await database`
    INSERT INTO reports (said, keeper_name, journal, version, agent, status)
    VALUES (
      ${words.slice(0, SAID_MOST)},
      ${clip(keeper_name, SHORT)},
      ${tidyJournal(journal) || null},
      ${clip(version, 40)},
      ${clip(agent, 400)},
      'pending'
    )
    RETURNING id, created_at
  `;
  return row;
}

export async function pull_reports() {
  return await database`
    SELECT id, said, keeper_name, journal, version, agent, status, created_at
    FROM reports
    ORDER BY created_at DESC
  `;
}

export async function count_pending_reports() {
  const [row] = await database`
    SELECT COUNT(*)::int AS n FROM reports WHERE status = 'pending'
  `;
  return row?.n ?? 0;
}

export async function update_report_status(id, status) {
  const [row] = await database`
    UPDATE reports SET status = ${status} WHERE id = ${id} RETURNING id, status
  `;
  return row || null;
}
