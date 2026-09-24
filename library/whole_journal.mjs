// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/whole_journal.mjs
// What a journal is made of, asked of its database every time.
//
// The backup (scripts/backup.mjs), the export (app/api/export/route.js) and
// the restore (scripts/restore.mjs) each used to carry a hand-written list of
// seven tables, and nobody added to them as tables arrived. By 2026-09-22
// seven more were in no backup and no export — the address book among them —
// so a restore brought a journal back with nobody in its book. A list kept by
// hand is a list that falls behind. So there is no list: the database says
// what it holds, and a table a migration adds next month is in that night's
// backup without anybody remembering this file exists.
//
// Two things live here because the backup and the export have to agree on
// both — one format, both paths (DECISIONS). What each of them leaves out is
// theirs to say, not this file's: the backup takes everything, and the export
// leaves the vault behind.
//
// .mjs where the rest of library/ is .js, because the nightly backup is plain
// Node rather than Next: handed a .js file, Node has to guess which kind of
// module it is, and says so in a warning — which would land in the backup's
// log every night, where a warning should mean something.
//
// Both functions take the way to ask rather than opening a connection of
// their own, because the three callers reach the database three ways: the
// app's handle, a script's own from .env.local, and the restore's single
// session. Whatever is passed takes (text, params) and resolves to the rows.

// Every table the journal keeps: the ordinary tables of the public schema,
// which is where every migration puts them. A view holds nothing of its own,
// and Neon's own schemas are Neon's. Alphabetical, so two backups list the
// same tables in the same order.
export async function every_table(query) {
  const rows = await query(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name`,
  );
  return rows.map(r => r.table_name);
}

// One table's rows, written down by Postgres itself. `SELECT *` handed every
// value to the driver first, and the driver reads a time stored without a
// zone as a time in whatever zone the machine running it is in — so the
// nightly backup, run on a laptop in Los Angeles, wrote each of those seven
// or eight hours late, and a restore would have put them back that way.
// to_jsonb is Postgres describing its own row: a date stays a date, a time
// with no zone stays one, jsonb stays itself, and a number is written as the
// number it is.
//
// A table name is an identifier and cannot be a bound parameter, so it is
// quoted into the text; the names come from every_table, never from a
// request.
export async function pull_table(query, table) {
  const rows = await query(`SELECT to_jsonb(t) AS row FROM "${table}" t`);
  return rows.map(r => r.row);
}
