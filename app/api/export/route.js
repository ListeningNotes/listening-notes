// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// Everything in this journal, as one file its keeper can keep.
//
// The other half of scripts/backup.mjs, and the half that ships. That script
// runs on a schedule and writes to a folder on a particular laptop, which is a
// perfectly good answer for exactly one person and no answer at all for
// anybody else: a scheduled job needs somewhere to write and something always
// running, and a copy of this software cannot be handed either. Offering
// someone storage on a machine they do not own is not a backup feature, it is
// a hosting business.
//
// So the shipped version is a button. The owner presses it, their browser
// downloads their own journal, and it lands wherever their downloads land. No
// configuration, no service to sign up for, nothing to leave running. It works
// on every copy including the one this was written on.
//
// Owner-only, and not because the writing is secret — most of it is on the
// public pages already. It is that this hands over the whole table in one
// request, including the drafts nobody has published, the comments still in
// moderation, and the email addresses people left with their submissions.

import { requireWristband } from '@/library/wristband';
import database from '@/library/database_connection';

// The same tables scripts/backup.mjs takes, in the same order, so a file from
// here and a folder from there describe the same thing. scripts/restore.mjs
// reads either.
const TABLES = [
  'users', 'entries', 'settings', 'comments',
  'submissions', 'drafts', 'briefings',
];

function today() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export async function GET(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  const out = { taken_at: new Date().toISOString(), tables: {} };

  for (const table of TABLES) {
    // A table name is an identifier and cannot be a bound parameter, so this
    // is built as text — safe because the list above is fixed and nothing from
    // the request reaches it.
    out.tables[table] = await database.query(`SELECT * FROM ${table}`);
  }

  // Content-Disposition is what makes this a download rather than a wall of
  // JSON in a tab. The name carries the date because the second export is the
  // one that would otherwise overwrite the first in a downloads folder.
  return new Response(JSON.stringify(out, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="journal-${today()}.json"`,
      // Nothing about a personal export should sit in a shared cache, and a
      // stale one is worse than none — it would hand somebody yesterday's
      // journal and call it a backup.
      'Cache-Control': 'no-store',
    },
  });
}
