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
// leaves the vault behind. A third since 2026-10-20: that a copy was made at
// all, written down the same way by both (copy_begins, below).
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

// ── A copy being made, 2026-10-20 ─────────────────────────────────────────
// The export and the nightly backup are both copies of the whole journal,
// and the journal keeps when the last one was made, so it knows when to ask
// for another (library/letterhead.js, ask_for_copy) — a third thing the two
// have to agree on. Written down before anything is read, so the copy
// carries the moment it was made and a journal brought back from it knows it
// has one; and the letter asking for a copy goes first, so no copy carries
// that. Nothing else in the journal is touched.
//
// What was there is handed back, so a copy that fails part way can put it
// back (copy_failed): a journal should not believe in a copy nobody has. On
// a database older than migrations/039, which has neither column, this
// quietly does nothing and the copy is made all the same.
export async function copy_begins(query) {
  try {
    const rows = await query(
      `WITH was AS (SELECT copied_at FROM settings WHERE id = 1),
            letter AS (DELETE FROM messages WHERE admin AND door = 'copy' RETURNING id),
            made AS (UPDATE settings SET copied_at = now() WHERE id = 1 RETURNING id)
       SELECT was.copied_at, EXISTS (SELECT 1 FROM letter) AS asked FROM was`,
    );
    return rows[0] || null;
  } catch {
    return null;
  }
}

// The copy did not finish: the last good copy's moment goes back, and when a
// letter asking for one went with it, the journal may ask again.
export async function copy_failed(query, was) {
  if (!was) return;
  try {
    await query(
      `UPDATE settings
          SET copied_at = $1,
              copy_asked_at = CASE WHEN $2 THEN NULL ELSE copy_asked_at END
        WHERE id = 1`,
      [was.copied_at, was.asked === true],
    );
  } catch {
    // The copy has failed already and says so; this is not worth a second
    // failure on top of it.
  }
}
