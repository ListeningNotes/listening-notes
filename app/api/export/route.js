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
// moderation, the address book, and the return addresses people left with
// their submissions.

import { requireWristband } from '@/library/wristband';
import database from '@/library/database_connection';
import { every_table, pull_table } from '@/library/whole_journal.mjs';

// Every table the database has, read the way scripts/backup.mjs reads them,
// so a file from here and a folder from there describe the same thing —
// except the vault. `secrets` holds the key that signs the wristband, and
// whoever has that key can make a wristband of their own and walk in without
// the password. A backup stays on its keeper's own machine; a download goes
// wherever downloads go — an email, a shared folder, a friend asked for help —
// and nothing in a journal lets its keeper change the key afterwards. So the
// file is the writing and never the keys (Miyel, 2026-09-23). The file says
// what it left out, and scripts/restore.mjs leaves that table as it finds it.
const LEFT_OUT = ['secrets'];

function today() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export async function GET(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  const out = { taken_at: new Date().toISOString(), tables: {}, left_out: [] };

  try {
    for (const table of await every_table(database.query)) {
      if (LEFT_OUT.includes(table)) out.left_out.push(table);
      else out.tables[table] = await pull_table(database.query, table);
    }
  } catch (error) {
    // Nothing rather than most of it. A file missing a table looks exactly
    // like a complete one until the day it is restored.
    return Response.json(
      { error: `The journal could not be read in full (${error?.message || error}), so nothing was downloaded.` },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
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
