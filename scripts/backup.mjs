// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// scripts/backup.mjs
// Every row in the database, written somewhere Neon cannot reach.
//
// Neon keeps six hours of history on this plan. Six hours covers the mistake
// you notice immediately and nothing else — a bad migration on a Friday night
// is unrecoverable by Saturday morning. This is everything past that window.
//
// Run it by hand before touching the schema, and once a night on its own:
//
//   npm run backup
//
// Writes to <BACKUP_DIR>/<timestamp>/, which defaults to
// ~/listening-notes-backups — deliberately outside the repository, because
// these files hold the journal's writing and the portrait, and nothing about
// them should ever be one `git add -A` away from being published.
//
// Point BACKUP_DIR at a synced folder and the backup stops living on one
// machine, which is the failure this does not otherwise cover: a laptop that
// is lost or dies takes its own backups with it. For iCloud Drive that is
//
//   BACKUP_DIR=~/Library/Mobile Documents/com~apple~CloudDocs/listening-notes-backups
//
// Two things to know if you do. macOS may evict older snapshots from local
// disk under "Optimise Mac Storage" — they stay in iCloud and download on
// demand, which is fine for a backup and slightly slower to restore from. And
// a sync that is signed out or out of space fails quietly: the local write
// still succeeds, so the log here will say everything worked. Glance at the
// folder occasionally rather than trusting it blindly.
//
// JSON rather than SQL because there is no pg_dump on this machine and no
// straightforward way to get one. schema.sql is copied in beside the data, so
// the pair is a complete description: structure from one, contents from the
// other. scripts/restore.mjs puts them back.

import { neon } from '@neondatabase/serverless';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const KEEP = 30;   // a month of nights; older ones are pruned

// Every table in schema.sql. A table missing from this list is a table that
// silently does not get backed up, so adding one here is part of adding one
// there — see the note in scripts/restore.mjs about the order.
const TABLES = [
  'users', 'entries', 'settings', 'comments',
  'submissions', 'drafts', 'briefings', 'conversations', 'echo_memory',
];

// The connection string, from the environment when there is one — which is how
// a scheduled run gets it — and otherwise out of .env.local, which is how a
// person running this by hand gets it without thinking about it.
// Reads a name from the environment first — which is how a scheduled run gets
// it — and otherwise out of .env.local, which is how a person running this by
// hand gets it without thinking about it.
function setting(name) {
  if (process.env[name]) return process.env[name];
  try {
    const line = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
      .split('\n').find(l => l.startsWith(`${name}=`));
    return line ? line.replace(`${name}=`, '').trim().replace(/^["']|["']$/g, '') : null;
  } catch {
    return null;
  }
}

function connectionString() {
  const url = setting('DATABASE_URL');
  if (!url) throw new Error('No DATABASE_URL, in the environment or in .env.local');
  return url;
}

// Where the snapshots go. A leading ~ is expanded here because a value typed
// into a .env file or a plist is a plain string and nothing else will do it.
function destination() {
  const chosen = setting('BACKUP_DIR');
  if (!chosen) return join(process.env.HOME, 'listening-notes-backups');
  return chosen.startsWith('~') ? join(process.env.HOME, chosen.slice(1)) : chosen;
}

// 2026-08-27-2046. Sorts correctly as a string, which is what the pruning
// below relies on, and reads as a date to a person looking at a directory.
function stamp() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

const sql = neon(connectionString());
const root = destination();
const dir = join(root, stamp());
mkdirSync(dir, { recursive: true });
console.log(`  into ${root}\n`);

const manifest = { taken_at: new Date().toISOString(), tables: {}, total_rows: 0 };
let failed = false;

for (const table of TABLES) {
  try {
    // sql.query, not the tagged template: a table name is an identifier and
    // cannot be a bound parameter, and the tagged form throws on a plain
    // string. This cost a run that produced nine empty files and called itself
    // a backup, which is worse than no backup at all.
    const rows = await sql.query(`SELECT * FROM ${table}`);
    writeFileSync(join(dir, `${table}.json`), JSON.stringify(rows, null, 2));
    manifest.tables[table] = rows.length;
    manifest.total_rows += rows.length;
    console.log(`  ${String(rows.length).padStart(5)} rows  ${table}.json`);
  } catch (error) {
    manifest.tables[table] = `ERROR: ${error.message}`;
    console.error(`  FAILED   ${table}: ${error.message}`);
    failed = true;
  }
}

// The structure, beside the contents. Without it the JSON is a pile of objects
// nobody can rebuild a database from.
copyFileSync(new URL('../schema.sql', import.meta.url), join(dir, 'schema.sql'));
writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));

// Keep the last KEEP, drop the rest. Only ever prunes directories whose names
// match the timestamp shape, so anything a person put in here by hand — a
// note, an export, a copy they made themselves — is left alone.
const SHAPE = /^\d{4}-\d{2}-\d{2}-\d{4}$/;
const kept = readdirSync(root).filter(n => SHAPE.test(n)).sort();
for (const old of kept.slice(0, Math.max(0, kept.length - KEEP))) {
  rmSync(join(root, old), { recursive: true, force: true });
  console.log(`  pruned   ${old}`);
}

console.log(`\n  ${manifest.total_rows} rows -> ${dir}`);
if (failed) {
  console.error('\n  A table failed. This backup is INCOMPLETE — see manifest.json.');
  process.exit(1);   // so a scheduled run reports a failure rather than a success
}
