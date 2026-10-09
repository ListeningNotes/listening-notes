// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// scripts/restore.mjs
// Puts a backup back. The half that makes the other half a backup.
//
//   node scripts/restore.mjs ~/listening-notes-backups/2026-08-27-2108
//
// Prints what it would do and changes nothing. To actually write:
//
//   node scripts/restore.mjs <dir> --yes
//
// **This empties every table the backup holds before it writes.** It is a
// restore, not a merge: the point is to end up with exactly what the backup
// holds, and a merge would leave rows created after the backup sitting
// alongside rows from before it, which is a database nobody can reason about.
//
// **A table the backup does not hold is left exactly as it is.** Backups from
// before 2026-09-23 carry seven tables of fifteen, and an export never carries
// `secrets`. Emptying what a file cannot refill would throw away the address
// book to bring back the entries, so the dry run names every such table and
// nothing touches them.
//
// Practise on a Neon branch before ever needing it for real. Branches are free
// and instant, and a restore you have never run is a hope, not a plan:
//
//   DATABASE_URL='postgres://...branch...' node scripts/restore.mjs <dir> --yes
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

import { Client } from '@neondatabase/serverless';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import { every_table } from '../library/whole_journal.mjs';

const [source, ...flags] = process.argv.slice(2);
const write = flags.includes('--yes');

if (!source || !existsSync(source)) {
  console.error('Usage: node scripts/restore.mjs <backup-dir | journal.zip | export.json> [--yes]');
  process.exit(1);
}

// Three shapes hold the same thing. scripts/backup.mjs writes a folder — one
// file per table, plus a manifest and a copy of migrations/. /api/export sends
// a single file with every table inside it, because a download is one file or
// it is a chore. And Settings' Make a copy hands over that same file inside a
// zip, beside a page per entry anybody can read (2026-10-08). All three are
// read here rather than making anyone convert one into another, since the
// moment somebody needs this is the worst possible moment to be told their
// backup is the wrong sort.
//
// Either way, which tables the file holds at all is part of what it says. A
// table it does not mention is not an empty table; it is one the file cannot
// speak for.
const isFile = statSync(source).isFile();

// The journal out of a zip from Make a copy: journal.json, found through the
// zip's own directory rather than by trusting the first header, so a copy
// that was unzipped and zipped again — a Mac's Compress puts the folder's
// name in front and squeezes what Make a copy only stored — reads the same.
// Null when there is no journal.json in it to read.
function fromZip(bytes) {
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

function load() {
  if (isFile) {
    const raw = readFileSync(source);
    const zipped = raw.length >= 4 && raw.readUInt32LE(0) === 0x04034b50;
    const text = zipped ? fromZip(raw) : raw.toString('utf8');
    if (text == null) {
      console.error(`${source} is a zip with no journal.json in it — is that a copy from Back up your journal?`);
      process.exit(1);
    }
    const doc = JSON.parse(text);
    if (!doc.tables) {
      console.error(`${source} has no "tables" — is that a journal export?`);
      process.exit(1);
    }
    return {
      taken_at: doc.taken_at,
      holds: Object.keys(doc.tables),
      left_out: doc.left_out ?? [],
      read: t => doc.tables[t] ?? [],
    };
  }
  if (!existsSync(join(source, 'manifest.json'))) {
    console.error(`No manifest.json in ${source} — is that a backup directory?`);
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(join(source, 'manifest.json'), 'utf8'));
  const broken = Object.entries(manifest.tables).filter(([, v]) => typeof v === 'string');
  if (broken.length) {
    console.error(`This backup is incomplete — ${broken.map(([t]) => t).join(', ')} failed when it was taken.`);
    console.error('Refusing to restore from it. Pick another directory.');
    process.exit(1);
  }
  return {
    taken_at: manifest.taken_at,
    holds: Object.keys(manifest.tables),
    left_out: manifest.left_out ?? [],
    // Every file the manifest counts has to be there, with that many rows in
    // it. A folder copied by hand can be missing one, and the time to find
    // out is before anything is emptied. Every read happens while planning.
    read: t => {
      const f = join(source, `${t}.json`);
      const rows = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null;
      if (rows?.length !== manifest.tables[t]) {
        console.error(`${t}.json ${rows ? `holds ${rows.length} rows and the manifest says ${manifest.tables[t]}` : 'is missing'} — this backup is damaged. Pick another directory.`);
        process.exit(1);
      }
      return rows;
    },
  };
}

const backup = load();

// Point 7 at the top. The two statements that bring comments into the inbox,
// cut out of the migrations that first ran them: the one that brings them,
// and the one that says which comment a reply was answering. Read rather
// than written out again here, because a second copy is a copy that drifts,
// and a migration that has shipped is never edited. Null when either cannot
// be found, and then nothing is brought and the plan says nothing of it.
function comments_into_messages() {
  try {
    const folder = fileURLToPath(new URL('../migrations/', import.meta.url));
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

function connectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const line = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').find(l => l.startsWith('DATABASE_URL='));
  if (!line) throw new Error('No DATABASE_URL, in the environment or in .env.local');
  return line.replace('DATABASE_URL=', '').trim().replace(/^["']|["']$/g, '');
}

const url = connectionString();
const host = url.replace(/^[^@]*@/, '').split(/[/?]/)[0];

console.log(`  source:  ${source}${isFile ? '  (export file)' : '  (backup folder)'}`);
console.log(`  taken:   ${backup.taken_at}`);
console.log(`  target:  ${host}`);
console.log(`  mode:    ${write ? 'WRITING — every table the backup holds is emptied and refilled' : 'dry run, nothing will change'}\n`);

// One session for all of it, rather than the HTTP driver the site reads
// through, which opens a connection per call: a transaction has to live on
// one connection from BEGIN to COMMIT.
const client = new Client(url);
await client.connect();

// Everything that would make this restore wrong is gathered before anything
// is written, and said all at once.
const refusals = [];

// ── What this database is ────────────────────────────────────────────────
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

// ── What the file can put back ───────────────────────────────────────────
const NEVER_WRITTEN = ['schema_migrations'];
const restoring = tables.filter(t => backup.holds.includes(t) && !NEVER_WRITTEN.includes(t));
const untouched = tables.filter(t => !backup.holds.includes(t) && !NEVER_WRITTEN.includes(t));
if (!restoring.length) refusals.push('The file holds none of the tables this database has.');

// In the file and not in this database. The oldest backups carry two tables
// nothing ever wrote to, conversations and echo_memory, empty and long since
// dropped; nothing is lost leaving those behind. A table with rows in it is a
// table this database is too old for.
// A file from before messages, going into a database that has them.
const bringing = restoring.includes('comments') && tables.includes('messages') && !backup.holds.includes('messages')
  ? comments_into_messages()
  : null;

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
// opens it — but that cannot be seen from here, so this says so rather than
// deciding.
const settingsAfter = restoring.includes('settings')
  ? plan.find(([t]) => t === 'settings')?.[1][0]
  : tables.includes('settings') ? (await client.query('SELECT setup_complete FROM settings WHERE id = 1')).rows[0] : null;
const passwordAfter = restoring.includes('secrets')
  ? Boolean(plan.find(([t]) => t === 'secrets')?.[1][0]?.password_hash)
  : tables.includes('secrets') && (await client.query('SELECT 1 FROM secrets WHERE id = 1 AND password_hash IS NOT NULL')).rows.length > 0;

// ── The plan, said ───────────────────────────────────────────────────────
console.log('  emptied and refilled, in this order:');
for (const [t, rows] of plan) console.log(`  ${String(rows.length).padStart(5)} rows  ${t}`);
if (untouched.length) {
  console.log('\n  left exactly as they are, because this file does not hold them:');
  for (const t of untouched) {
    console.log(`           ${t}${backup.left_out.includes(t) ? '  (left out of this file on purpose)' : ''}`);
  }
}
if (tables.includes('schema_migrations')) {
  console.log('\n  read and never written: schema_migrations, the list of what built this database');
}
if (bringing) {
  console.log('\n  this file is from before messages: once it is restored, its comments arrive');
  console.log('  in the inbox as messages, where they are not there already');
}
if (emptyStrangers.length) {
  console.log(`\n  in the file, empty, and gone from this database: ${emptyStrangers.join(', ')}`);
}
if (behind.length) {
  console.log(`\n  columns this database no longer has, left behind: ${behind.join(', ')}`);
}
if (defaulted.length) {
  console.log(`\n  columns this file does not have, which take their defaults: ${defaulted.join(', ')}`);
}
if (settingsAfter?.setup_complete === true && !passwordAfter) {
  console.log('\n  ! Afterwards this journal is set up and has no password in its database, so');
  console.log('    only SESSION_PASSWORD, where it runs, will open it — if that is not set,');
  console.log('    nobody can sign in. Restoring into a new database? Set the copy up first,');
  console.log('    choosing a password, and restore after.');
}

if (refusals.length) {
  console.error('\n  Not restoring, and nothing was changed:');
  for (const r of refusals) console.error(`  - ${r}`);
  console.error('\n  Bringing a database up to date: deploy the copy that uses it, or run');
  console.error('  scripts/prepare_database.mjs with DATABASE_URL pointed at it.');
  await client.end();
  process.exit(1);
}

if (!write) {
  console.log('\n  Dry run. Add --yes to actually restore.');
  await client.end();
  process.exit(0);
}

// ── The restore ──────────────────────────────────────────────────────────
console.log(`\n  writing to ${host}, as one transaction…`);
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
  // table this file does not hold is exactly what a restore leaves alone. If
  // one ever points in, Postgres refuses, the transaction rolls back, and the
  // message below names it. No RESTART IDENTITY either: the counters are
  // moved at the end, and only ever forward.
  await client.query(`TRUNCATE ${order.map(t => `"${t}"`).join(', ')}`);

  for (const [table, rows] of plan) {
    if (!rows.length) {
      console.log(`      0 rows  ${table}`);
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
        // Point 6 at the top: an old folder's time with no zone, written down
        // as this machine's clock read as UTC, goes back on this machine's
        // clock. A zone on one of these columns is how an old file shows
        // itself; a new one never writes one there.
        if (!isFile && (type[c] === 'timestamp without time zone' || type[c] === 'date')
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
    console.log(`  ${String(rows.length).padStart(5)} rows  ${table}`);
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
  console.log(`\n  id counters moved past the restored rows: ${moved.join(', ') || 'none needed to move'}`);

  // Point 7 at the top: the comments of a file from before messages, into
  // the inbox. Behind a savepoint, so that if it cannot be done the restore
  // itself still stands — the comments are back in their table either way.
  if (bringing) {
    await client.query('SAVEPOINT bringing');
    try {
      const brought = await client.query(bringing.bring);
      await client.query(bringing.answering);
      await client.query('RELEASE SAVEPOINT bringing');
      console.log(`\n  ${brought.rowCount ?? 0} comments arrived in the inbox as messages`);
    } catch (error) {
      await client.query('ROLLBACK TO SAVEPOINT bringing');
      console.log(`\n  ! The comments are restored, and could not be brought into the inbox: ${error?.message || error}`);
    }
  }

  // One last look before it counts: every table holds what the file held.
  for (const [table, rows] of plan) {
    const { rows: [{ n }] } = await client.query(`SELECT count(*)::int AS n FROM "${table}"`);
    if (n !== rows.length) throw new Error(`${table} holds ${n} rows after the restore, and the file has ${rows.length}.`);
  }
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error(`\n  Stopped and rolled back — nothing was changed. ${error?.message || error}`);
  await client.end();
  process.exit(1);
}

await client.end();
console.log('\n  Restored.');
