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
// **This empties every table before it writes.** It is a restore, not a merge:
// the point is to end up with exactly what the backup holds, and a merge would
// leave rows created after the backup sitting alongside rows from before it,
// which is a database nobody can reason about.
//
// Practise on a Neon branch before ever needing it for real. Branches are free
// and instant, and a restore you have never run is a hope, not a plan:
//
//   DATABASE_URL='postgres://...branch...' node scripts/restore.mjs <dir> --yes
//
// Three things this has to get right, all of which are why it is not a loop
// over INSERT:
//
//   1. Generated columns cannot be written to. entries.rating_value and
//      entries.album_key are GENERATED ALWAYS; Postgres computes them and
//      rejects any attempt to supply one. They are read out of the catalogue
//      rather than named here, so a new one added later is handled without
//      anybody remembering this file exists.
//   2. Serial sequences do not follow the rows. Insert 39 entries with
//      explicit ids into a table whose sequence says 1, and the next entry
//      logged collides on the primary key. Every sequence is set past its
//      table's highest id at the end.
//   3. Foreign keys mean order. users before entries, entries before settings,
//      and comments in id order so a reply never lands before the comment it
//      answers.

import { neon } from '@neondatabase/serverless';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const [source, ...flags] = process.argv.slice(2);
const write = flags.includes('--yes');

if (!source || !existsSync(source)) {
  console.error('Usage: node scripts/restore.mjs <backup-dir | export.json> [--yes]');
  process.exit(1);
}

// Two shapes hold the same thing. scripts/backup.mjs writes a folder — one
// file per table, plus a manifest and a copy of migrations/001_initial.sql. /api/export sends
// a single file with every table inside it, because a download is one file or
// it is a chore. Both are read here rather than making anyone convert one into
// the other, since the moment somebody needs this is the worst possible moment
// to be told their backup is the wrong sort.
const isFile = statSync(source).isFile();

function load() {
  if (isFile) {
    const doc = JSON.parse(readFileSync(source, 'utf8'));
    if (!doc.tables) {
      console.error(`${source} has no "tables" — is that a journal export?`);
      process.exit(1);
    }
    return { taken_at: doc.taken_at, read: t => doc.tables[t] ?? [] };
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
    read: t => {
      const f = join(source, `${t}.json`);
      return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : [];
    },
  };
}

const backup = load();

// Dependency order. Reversed for emptying, used as-is for filling.
const ORDER = [
  'users', 'entries', 'settings', 'comments',
  'submissions', 'drafts', 'briefings',
];

function connectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const line = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').find(l => l.startsWith('DATABASE_URL='));
  if (!line) throw new Error('No DATABASE_URL, in the environment or in .env.local');
  return line.replace('DATABASE_URL=', '').trim().replace(/^["']|["']$/g, '');
}

const url = connectionString();
const sql = neon(url);
const host = url.replace(/^[^@]*@/, '').split(/[/?]/)[0];

console.log(`  source:  ${source}${isFile ? '  (export file)' : '  (backup folder)'}`);
console.log(`  taken:   ${backup.taken_at}`);
console.log(`  target:  ${host}`);
console.log(`  mode:    ${write ? 'WRITING — every table will be emptied first' : 'dry run, nothing will change'}\n`);

// Which columns Postgres computes for itself, straight from the catalogue.
const generated = new Map();
for (const table of ORDER) {
  const rows = await sql.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_name = $1 AND (is_generated = 'ALWAYS' OR generation_expression IS NOT NULL)`,
    [table],
  );
  generated.set(table, new Set(rows.map(r => r.column_name)));
}

// jsonb has to arrive as text; the driver turns a bare JS object into
// something json refuses. Arrays stay arrays — those are real Postgres arrays.
const types = new Map();
for (const table of ORDER) {
  const rows = await sql.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1`,
    [table],
  );
  types.set(table, Object.fromEntries(rows.map(r => [r.column_name, r.data_type])));
}

const plan = [];
for (const table of ORDER) {
  const rows = backup.read(table);
  plan.push([table, rows]);
  console.log(`  ${String(rows.length).padStart(5)} rows  ${table}`);
}

if (!write) {
  console.log('\n  Dry run. Add --yes to actually restore.');
  process.exit(0);
}

// Empty everything first. CASCADE because the foreign keys point between these
// tables and TRUNCATE refuses otherwise; RESTART IDENTITY because the
// sequences are reset properly at the end anyway.
console.log('\n  emptying…');
await sql.query(`TRUNCATE ${ORDER.join(', ')} RESTART IDENTITY CASCADE`);

for (const [table, rows] of plan) {
  if (!rows.length) continue;
  const skip = generated.get(table);
  const colType = types.get(table);
  // And columns the table no longer has: a backup from before a drop still
  // carries them, and after the TRUNCATE above a failed INSERT would leave the
  // table empty. The catalogue is the authority on what can be written.
  const cols = Object.keys(rows[0]).filter(c => !skip.has(c) && c in colType);

  // comments carries a self-referencing parent_id, so a reply inserted before
  // the comment it answers fails the foreign key. Ascending id puts parents
  // first, because a reply is always created after what it replies to.
  const ordered = 'id' in rows[0] ? [...rows].sort((a, b) => a.id - b.id) : rows;

  for (const row of ordered) {
    const values = cols.map(c => {
      const v = row[c];
      if (v !== null && colType[c] === 'jsonb' && typeof v !== 'string') return JSON.stringify(v);
      return v;
    });
    await sql.query(
      `INSERT INTO ${table} (${cols.map(c => `"${c}"`).join(', ')})
       VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})`,
      values,
    );
  }
  console.log(`  ${String(rows.length).padStart(5)} rows  ${table} restored`);
}

// Move every sequence past the highest id it just took, or the next row
// written collides with one that is already there.
console.log('\n  resetting sequences…');
for (const [table, rows] of plan) {
  if (!rows.length || !('id' in rows[0])) continue;
  const [{ seq }] = await sql.query(`SELECT pg_get_serial_sequence($1, 'id') AS seq`, [table]);
  if (!seq) continue;
  await sql.query(`SELECT setval($1, (SELECT COALESCE(MAX(id), 1) FROM ${table}))`, [seq]);
  console.log(`  ${table}`);
}

console.log('\n  Restored.');
