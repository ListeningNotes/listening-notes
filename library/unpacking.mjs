// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/unpacking.mjs
// Putting a journal back: reading the file it was kept in, working out what
// can go where, and writing it in as one transaction.
//
// ── Two callers, one way of doing it ──────────────────────────────────────
// scripts/restore.mjs, from a terminal, and app/api/restore, from setup on a
// copy nobody has claimed yet (Bring your journal, 2026-10-08). The second
// was the reason this left the script: a restore anybody can reach without a
// terminal has to be the same restore, decided the same way, or the day the
// two disagree is the day somebody's journal comes back wrong. What is the
// terminal's alone — a backup folder, printing, asking for --yes — stays in
// the script.
//
// Both hand over a client that keeps one session from BEGIN to COMMIT — the
// driver's Client, never the HTTP handle the site reads through, which opens
// a connection per call — and both read the plan this returns before
// anything is written.
//
// .mjs for the reason library/whole_journal.mjs is: the script is plain Node.
//
// What this has to get right, which is why it is not a loop over INSERT:
//
//   1. Generated columns cannot be written to. entries.rating_value and
//      entries.album_key are GENERATED ALWAYS; Postgres computes them and
//      rejects any attempt to supply one. They are read out of the catalogue
//      rather than named here, so a new one added later is handled without
//      anybody remembering this file exists.
//   2. Serial sequences do not follow the rows. Insert 39 entries with
//      explicit ids into a table whose sequence says 1, and the next entry
//      logged collides on the primary key. Every counter is moved past its
//      column's highest value at the end — forward only, so an id already
//      handed out is never handed out again.
//   3. Foreign keys mean order, and the order is read from the database's own
//      foreign keys rather than written down — a written order is a list, and
//      the lists are what fell behind. A table is filled after every table it
//      points at, and rows go in by id, so a reply never lands before the
//      comment it answers.
//   4. All or nothing. Everything happens in one transaction: a row the
//      database refuses, or a connection that drops, rolls the lot back and
//      the database is as it was. It used to empty every table and then fill
//      them a row at a time over separate requests, so a failure halfway left
//      half a journal.
//   5. schema_migrations is read and never written. It lists the migrations
//      that built *this* database — its shape, not the journal — and an older
//      backup's list written over it would have the next start re-run
//      migrations over the restored rows. It is read to refuse a backup taken
//      on a newer database than this one, whose newer columns this one would
//      drop without a word.
//   6. Old backup folders wrote some times down wrong, and this puts them
//      right. Until 2026-09-23 the backup read a time stored without a zone as
//      a time on the laptop running it and wrote it down as UTC — seven or
//      eight hours late in Los Angeles (library/whole_journal.mjs). It is
//      undone on the way back in, on the assumption that a folder is restored
//      on the machine that took it, or one in the same zone. An export was
//      taken on the server, whose clock is UTC, and needs nothing; one
//      downloaded from a dev server on a laptop has the laptop's problem, and
//      nothing here can tell.
//   7. A file from before messages holds comments that nothing draws any
//      more. Comments became messages on 2026-09-29: migration 027 brought
//      every comment on a standing entry into the inbox, once, on the day a
//      copy took the update. A file taken before that day holds `comments`
//      and no `messages`, and put back it would leave its comments in a table
//      nothing reads — restored, and never seen again. So after such a file
//      is restored the same statement is run again, read out of the migration
//      itself so there is one copy of it, and the comments arrive in the
//      inbox where they are not there already. It cannot fail a restore: if
//      it does not work the journal is restored all the same, and says so.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { every_table } from './whole_journal.mjs';

// Never written, whatever a file holds. Point 5.
const NEVER_WRITTEN = ['schema_migrations'];

// ── What a file holds ─────────────────────────────────────────────────────
// A journal as the export writes it — { taken_at, tables, left_out } — made
// into what the plan reads: which tables it holds, and their rows. A table
// it does not mention is not an empty table; it is one the file cannot speak
// for.
export function from_document(doc) {
  return {
    taken_at: doc.taken_at,
    holds: Object.keys(doc.tables),
    left_out: doc.left_out ?? [],
    read: t => doc.tables[t] ?? [],
  };
}

// The journal out of a zip from Make a copy: journal.json, found through the
// zip's own directory rather than by trusting the first header, so a copy
// that was unzipped and zipped again — a Mac's Compress puts the folder's
// name in front and squeezes what Make a copy only stored — reads the same.
// Null when there is no journal.json in it to read. `bytes` is a Buffer.
export function journal_from_zip(bytes) {
  // The directory's end record is the last 22 bytes, or a little before
  // them when an archiver has left a comment after it.
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 0xffff); i--) {
    if (bytes.readUInt32LE(i) === 0x06054b50) { end = i; break; }
  }
  if (end < 0) return null;
  let at = bytes.readUInt32LE(end + 16);
  for (let n = bytes.readUInt16LE(end + 10); n > 0; n--) {
    if (bytes.readUInt32LE(at) !== 0x02014b50) return null;
    const method = bytes.readUInt16LE(at + 10);
    const packed = bytes.readUInt32LE(at + 20);
    const named = bytes.readUInt16LE(at + 28);
    const header = bytes.readUInt32LE(at + 42);
    const name = bytes.toString('utf8', at + 46, at + 46 + named);
    at += 46 + named + bytes.readUInt16LE(at + 30) + bytes.readUInt16LE(at + 32);
    if (name.split('/').pop() !== 'journal.json') continue;
    const start = header + 30 + bytes.readUInt16LE(header + 26) + bytes.readUInt16LE(header + 28);
    const data = bytes.subarray(start, start + packed);
    if (method === 0) return data.toString('utf8');
    if (method === 8) return inflateRawSync(data).toString('utf8');
    return null;
  }
  return null;
}

// Point 7. The two statements that bring comments into the inbox, cut out of
// the migrations that first ran them: the one that brings them, and the one
// that says which comment a reply was answering. Read rather than written
// out again here, because a second copy is a copy that drifts, and a
// migration that has shipped is never edited. Null when either cannot be
// found, and then nothing is brought and the plan says nothing of it.
function comments_into_messages(folder) {
  try {
    const made = readFileSync(join(folder, '027_messages.sql'), 'utf8');
    const chained = readFileSync(join(folder, '028_chains_and_dismissals.sql'), 'utf8');
    const from = made.indexOf('INSERT INTO messages (');
    const close = 'ON CONFLICT (comment_id) DO NOTHING;';
    const to = made.indexOf(close, from);
    const start = chained.indexOf('UPDATE messages m');
    const end = chained.indexOf(';', start);
    if (from < 0 || to < 0 || start < 0 || end < 0) return null;
    return {
      bring: made.slice(from, to + close.length),
      answering: chained.slice(start, end + 1),
    };
  } catch {
    return null;
  }
}

// ── The plan ──────────────────────────────────────────────────────────────
// Everything that would make this restore wrong, gathered before anything is
// written, and everything a caller needs in order to say what will happen.
// Nothing here writes.
//
// `folder`: the file is a backup folder, whose old times point 6 corrects.
// `leave`: tables to leave alone whatever the file holds — setup's restore
// leaves the vault, which a journal never brings with it. `migrations`: where
// the migration files are, for point 7; the site runs from the project's
// root, and the script says where its own copy is. `host`: what to call the
// database in a refusal.
export async function plan_unpacking(client, backup, {
  folder = false,
  leave = [],
  migrations = join(process.cwd(), 'migrations'),
  host = 'This database',
} = {}) {
  const never = [...NEVER_WRITTEN, ...leave];
  const refusals = [];

  // ── What this database is ──────────────────────────────────────────────
  const tables = await every_table((text, params) => client.query(text, params).then(r => r.rows));
  if (!tables.includes('entries')) {
    refusals.push(`${host} has no entries table. A journal's tables are built by its migrations: bring the database up (below) and restore after.`);
  }

  // Each table's columns and their types, and which ones Postgres computes.
  const types = new Map(tables.map(t => [t, {}]));
  const computed = new Map(tables.map(t => [t, new Set()]));
  const { rows: columns } = await client.query(
    `SELECT table_name, column_name, data_type,
            (is_generated = 'ALWAYS' OR generation_expression IS NOT NULL) AS computed
       FROM information_schema.columns WHERE table_schema = 'public'`,
  );
  for (const c of columns) {
    if (!types.has(c.table_name)) continue;   // a view's, not a table's
    types.get(c.table_name)[c.column_name] = c.data_type;
    if (c.computed) computed.get(c.table_name).add(c.column_name);
  }

  // Which table points at which.
  const { rows: links } = await client.query(
    `SELECT child.relname AS child, parent.relname AS parent
       FROM pg_constraint k
       JOIN pg_class child ON child.oid = k.conrelid
       JOIN pg_class parent ON parent.oid = k.confrelid
      WHERE k.contype = 'f' AND child.relnamespace = 'public'::regnamespace`,
  );

  // The id counters, and the column each one feeds — serial or identity.
  const { rows: counters } = await client.query(
    `SELECT t.relname AS table_name, a.attname AS column_name, s.oid::regclass::text AS counter
       FROM pg_class s
       JOIN pg_depend d ON d.objid = s.oid AND d.classid = 'pg_class'::regclass
                       AND d.refclassid = 'pg_class'::regclass AND d.deptype IN ('a', 'i')
       JOIN pg_class t ON t.oid = d.refobjid
       JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
      WHERE s.relkind = 'S' AND t.relnamespace = 'public'::regnamespace`,
  );

  // ── What the file can put back ─────────────────────────────────────────
  const restoring = tables.filter(t => backup.holds.includes(t) && !never.includes(t));
  if (!restoring.length) refusals.push('The file holds none of the tables this database has.');

  // A file from before messages, going into a database that has them.
  const bringing = restoring.includes('comments') && tables.includes('messages') && !backup.holds.includes('messages')
    ? comments_into_messages(migrations)
    : null;

  // In the file and not in this database. The oldest backups carry two tables
  // nothing ever wrote to, conversations and echo_memory, empty and long since
  // dropped; nothing is lost leaving those behind. A table with rows in it is a
  // table this database is too old for.
  const strangers = backup.holds.filter(t => !tables.includes(t));
  const emptyStrangers = strangers.filter(t => !backup.read(t).length);
  for (const t of strangers) {
    if (emptyStrangers.includes(t)) continue;
    const n = backup.read(t).length;
    refusals.push(`The file holds ${n} ${n === 1 ? 'row' : 'rows'} of ${t}, and this database has no such table. Bring it up to date (below) first.`);
  }

  // A backup taken on a newer database than this one.
  if (backup.holds.includes('schema_migrations') && tables.includes('schema_migrations')) {
    const { rows } = await client.query('SELECT filename FROM schema_migrations');
    const here = new Set(rows.map(r => r.filename));
    const ahead = backup.read('schema_migrations').map(r => r.filename).filter(f => !here.has(f));
    if (ahead.length) {
      refusals.push(`The file was taken on a database that had run ${ahead.join(', ')}, and this one has not. Bring it up to date (below) first.`);
    }
  }

  // Tables this file leaves alone that point at one it fills, 2026-10-08.
  // Postgres refuses to empty a table something points at even when what
  // points at it holds nothing — and a table a later migration adds pointing
  // at entries would then refuse every copy made before it, which is the
  // copy most journals arrive in a new home with. So one that is empty is
  // emptied with the rest, which changes nothing; one with rows in it is a
  // refusal, because the file cannot put back what those rows point at
  // without breaking them. Round by round, since what points at one of
  // those has to come along too.
  const alongside = [];
  const pointed = new Set();
  for (let found = true; found;) {
    found = false;
    const filling = [...restoring, ...alongside];
    for (const { child, parent } of links) {
      if (child === parent || !filling.includes(parent) || filling.includes(child) || pointed.has(child)) continue;
      pointed.add(child);
      const { rows: [{ n }] } = never.includes(child)
        ? { rows: [{ n: 1 }] }
        : await client.query(`SELECT count(*)::int AS n FROM "${child}"`);
      if (n) {
        refusals.push(`${child} points at ${parent}, which this file fills, and ${never.includes(child) ? 'is never written' : `holds ${n} ${n === 1 ? 'row' : 'rows'} this file cannot account for`}.`);
      } else {
        alongside.push(child);
        found = true;
      }
    }
  }
  const untouched = tables.filter(t => !backup.holds.includes(t) && !never.includes(t) && !alongside.includes(t));

  // Parents before children: round by round, whatever points only at tables
  // already placed — or at itself, or at a table this file leaves alone.
  const order = [];
  while (order.length < restoring.length) {
    const ready = restoring.filter(t => !order.includes(t) && links.every(l =>
      l.child !== t || l.parent === t || !restoring.includes(l.parent) || order.includes(l.parent)));
    if (!ready.length) {
      refusals.push(`The foreign keys between ${restoring.filter(t => !order.includes(t)).join(', ')} go round in a circle, so there is no order to fill them in.`);
      break;
    }
    order.push(...ready);
  }
  const plan = order.map(t => [t, backup.read(t)]);

  // Columns the file has that the table no longer does — a backup from before
  // a drop — and columns the table has that the file never knew, which take
  // their defaults. Both are said, because both are the file and the database
  // disagreeing, and a restore should not decide that quietly.
  const behind = [];
  const defaulted = [];
  for (const [t, rows] of plan) {
    if (!rows.length) continue;
    const inFile = Object.keys(rows[0]);
    behind.push(...inFile.filter(c => !Object.hasOwn(types.get(t), c)).map(c => `${t}.${c}`));
    defaulted.push(...Object.keys(types.get(t))
      .filter(c => !inFile.includes(c) && !computed.get(t).has(c)).map(c => `${t}.${c}`));
  }

  // A journal that is set up and has no password of its own lets nobody in:
  // the claim code only ever opens a copy nobody has claimed
  // (app/api/auth/login/route.js). SESSION_PASSWORD, where the copy runs, still
  // opens it — but that cannot be seen from here, so the caller says so
  // rather than deciding.
  const settingsAfter = restoring.includes('settings')
    ? plan.find(([t]) => t === 'settings')?.[1][0]
    : tables.includes('settings') ? (await client.query('SELECT setup_complete FROM settings WHERE id = 1')).rows[0] : null;
  const passwordAfter = restoring.includes('secrets')
    ? Boolean(plan.find(([t]) => t === 'secrets')?.[1][0]?.password_hash)
    : tables.includes('secrets') && (await client.query('SELECT 1 FROM secrets WHERE id = 1 AND password_hash IS NOT NULL')).rows.length > 0;

  return {
    folder, tables, restoring, untouched, alongside, order, plan, refusals, bringing,
    emptyStrangers, behind, defaulted, settingsAfter, passwordAfter,
    types, computed, counters,
  };
}

// ── The restore ───────────────────────────────────────────────────────────
// Writes the plan, as one transaction, and throws having rolled back when
// anything goes wrong. `within(query)` runs inside the same transaction just
// before it is committed, for what a caller needs to land with the journal or
// not at all — setup's claim. `say(line)` hears each step as it happens.
// Returns which counters moved and how many comments arrived as messages.
export async function unpack(client, planned, { within, say = () => {} } = {}) {
  const { folder, restoring, alongside = [], order, plan, bringing, types, computed, counters } = planned;
  let brought = null;
  try {
    await client.query('BEGIN');
    // For this transaction only, so nothing leaks into a pooled connection. A
    // process that dies partway is rolled back by the server within a minute,
    // rather than leaving every table locked behind a connection nobody holds —
    // the ghost that once queued a whole copy behind a dead migration
    // (library/migrator.js). And a table somebody else is holding fails the
    // restore in half a minute rather than waiting on it forever.
    await client.query("SET LOCAL idle_in_transaction_session_timeout = '1min'");
    await client.query("SET LOCAL lock_timeout = '30s'");

    // No CASCADE. CASCADE empties any table pointing at one of these, and a
    // table this file does not hold is exactly what a restore leaves alone —
    // the only ones emptied beside the file's are those the plan found
    // pointing in and already empty (`alongside`). No RESTART IDENTITY
    // either: the counters are moved at the end, and only ever forward.
    await client.query(`TRUNCATE ${[...order, ...alongside].map(t => `"${t}"`).join(', ')}`);

    for (const [table, rows] of plan) {
      if (!rows.length) {
        say(`      0 rows  ${table}`);
        continue;
      }
      const type = types.get(table);
      // Only columns the table still has, and never one Postgres computes. The
      // catalogue is the authority on what can be written.
      const cols = Object.keys(rows[0]).filter(c => Object.hasOwn(type, c) && !computed.get(table).has(c));
      // Ascending id puts a comment before its replies, because a reply is
      // always created after what it answers.
      const ordered = 'id' in rows[0] ? [...rows].sort((a, b) => a.id - b.id) : rows;
      for (const row of ordered) {
        const values = cols.map(c => {
          const v = row[c];
          if (v === null || v === undefined) return null;
          // jsonb goes over as its text. Handed an array, the driver would send
          // a Postgres array, which jsonb refuses.
          if (type[c] === 'jsonb' || type[c] === 'json') return JSON.stringify(v);
          // Point 6: an old folder's time with no zone, written down as this
          // machine's clock read as UTC, goes back on this machine's clock. A
          // zone on one of these columns is how an old file shows itself; a
          // new one never writes one there.
          if (folder && (type[c] === 'timestamp without time zone' || type[c] === 'date')
              && /T.+(Z|[+-]\d\d:?\d\d)$/.test(v)) {
            const d = new Date(v);
            return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, -1);
          }
          return v;
        });
        // OVERRIDING SYSTEM VALUE lets an identity column take the id the row
        // had; on a serial column, which is all this schema has, it does
        // nothing.
        await client.query(
          `INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(', ')}) OVERRIDING SYSTEM VALUE
           VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})`,
          values,
        );
      }
      say(`  ${String(rows.length).padStart(5)} rows  ${table}`);
    }

    // Move every counter past the highest id it just took, or the next row
    // written collides with one that is already there — and never backwards. A
    // counter that has already handed out more than the file holds stays where
    // it is, because those ids went somewhere — a message keeps the id of the
    // comment it was (messages.comment_id), and an id handed out twice would
    // point it at somebody else's. On a new database the counters start just
    // past the file's highest id.
    const moved = [];
    for (const { table_name, column_name, counter } of counters) {
      if (!restoring.includes(table_name)) continue;
      const { rows } = await client.query(
        `SELECT setval($1::regclass, top)
           FROM (SELECT MAX("${column_name}") AS top FROM "${table_name}") highest
          WHERE top > COALESCE(pg_sequence_last_value($1::regclass), 0)`,
        [counter],
      );
      if (rows.length) moved.push(table_name);
    }
    say(`\n  id counters moved past the restored rows: ${moved.join(', ') || 'none needed to move'}`);

    // Point 7: the comments of a file from before messages, into the inbox.
    // Behind a savepoint, so that if it cannot be done the restore itself
    // still stands — the comments are back in their table either way.
    if (bringing) {
      await client.query('SAVEPOINT bringing');
      try {
        const done = await client.query(bringing.bring);
        await client.query(bringing.answering);
        await client.query('RELEASE SAVEPOINT bringing');
        brought = done.rowCount ?? 0;
        say(`\n  ${brought} comments arrived in the inbox as messages`);
      } catch (error) {
        await client.query('ROLLBACK TO SAVEPOINT bringing');
        say(`\n  ! The comments are restored, and could not be brought into the inbox: ${error?.message || error}`);
      }
    }

    // One last look before it counts: every table holds what the file held.
    for (const [table, rows] of plan) {
      const { rows: [{ n }] } = await client.query(`SELECT count(*)::int AS n FROM "${table}"`);
      if (n !== rows.length) throw new Error(`${table} holds ${n} rows after the restore, and the file has ${rows.length}.`);
    }

    if (within) await within((text, params) => client.query(text, params).then(r => r.rows));
    await client.query('COMMIT');
    return { moved, brought };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  }
}
