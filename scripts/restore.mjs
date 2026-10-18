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
// How the restore decides and writes — generated columns, counters, the
// order the foreign keys give, one transaction, the ledger left alone, old
// folders' times, a file from before messages — is library/unpacking.mjs,
// since 2026-10-08 the same code setup runs when a journal is brought into a
// new copy (app/api/restore). What is a terminal's alone is here: a backup
// folder, the printing, and asking for --yes.

import { Client } from '@neondatabase/serverless';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { from_document, journal_from_zip, plan_unpacking, unpack } from '../library/unpacking.mjs';

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

function load() {
  if (isFile) {
    const raw = readFileSync(source);
    const zipped = raw.length >= 4 && raw.readUInt32LE(0) === 0x04034b50;
    const text = zipped ? journal_from_zip(raw) : raw.toString('utf8');
    if (text == null) {
      console.error(`${source} is a zip with no journal.json in it — is that a copy from Back up your journal?`);
      process.exit(1);
    }
    const doc = JSON.parse(text);
    if (!doc.tables) {
      console.error(`${source} has no "tables" — is that a journal export?`);
      process.exit(1);
    }
    return from_document(doc);
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

const planned = await plan_unpacking(client, backup, {
  folder: !isFile,
  host,
  migrations: fileURLToPath(new URL('../migrations/', import.meta.url)),
});
const { plan, untouched, alongside, tables, bringing, emptyStrangers, behind, defaulted, settingsAfter, passwordAfter, refusals } = planned;

// ── The plan, said ───────────────────────────────────────────────────────
console.log('  emptied and refilled, in this order:');
for (const [t, rows] of plan) console.log(`  ${String(rows.length).padStart(5)} rows  ${t}`);
if (untouched.length) {
  console.log('\n  left exactly as they are, because this file does not hold them:');
  for (const t of untouched) {
    console.log(`           ${t}${backup.left_out.includes(t) ? '  (left out of this file on purpose)' : ''}`);
  }
}
if (alongside.length) {
  console.log(`\n  emptied with them, holding nothing already, because they point at what is: ${alongside.join(', ')}`);
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
  console.log('    choosing a password, and restore after — or bring it in from the copy\'s');
  console.log('    own setup, Bring your journal, which asks for one.');
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
  await unpack(client, planned, { say: line => console.log(line) });
} catch (error) {
  console.error(`\n  Stopped and rolled back — nothing was changed. ${error?.message || error}`);
  await client.end();
  process.exit(1);
}

await client.end();
console.log('\n  Restored.');
