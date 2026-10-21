// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/report_actions.js
// Problems keepers wrote in, on their own desks, sent here. See
// migrations/009_reports.sql. The same shape as submission_actions: save
// (public, from any copy), pull and count (owner), status (owner).
import database from './database_connection.js';
import { tidyJournal } from './return_address.js';
import { journalAddress } from './hosting_directory.js';
import { REPORTS_URL } from './version.js';

const SAID_MOST = 4000;
const SHORT = 200;

const clip = (value, n) => String(value ?? '').trim().slice(0, n) || null;

// Whether problem reports land in this journal: its own address is where
// REPORTS_URL points, www or not — or the address it moved from is
// (library/hosting_directory.js, forwarding), which is how Miyel's journal
// goes on receiving them once it has moved off www. Only that journal's
// inbox has the line for them; on every other copy it would be a folder
// that could never hold anything (Miyel, 2026-09-22).
export function takesReports(siteAddress) {
  const bare = value => tidyJournal(value).replace(/^www\./, '');
  const mine = bare(siteAddress);
  if (!mine) return false;
  const there = tidyJournal(REPORTS_URL);
  return bare(there) === mine || bare(journalAddress(there)) === mine;
}

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
