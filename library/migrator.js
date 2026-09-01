// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/migrator.js
// Brings a database up to date, by itself, before the site takes requests.
//
// ── Why this exists ───────────────────────────────────────────────────────
// Every schema change so far has been a person pasting SQL into a console and
// remembering which branch they were pointed at. That works exactly as long as
// there is one database and one person, and it has already failed once: an
// afternoon lost to a migration that ran against a dev branch while everybody
// believed it had run against production.
//
// It does not survive a second copy at all. Somebody installs this, their
// database is empty, and there is nowhere for them to get the SQL from and no
// reason they should have to. A copy has to build its own tables and keep them
// current on its own — that is the difference between software and a thing one
// person can run.
//
// ── When it runs ──────────────────────────────────────────────────────────
// From instrumentation.js, whose register() Next calls once per server
// instance and completes before the first request is served. That is as close
// to a startup hook as a Next app has, and it is the right place: a request
// should never arrive at a database that is a version behind the code handling
// it.
//
// ── The lock, which is the whole trick ────────────────────────────────────
// On serverless there is no single server. Every cold start runs register(),
// and several can start at once — so without a lock, two instances read "001
// is pending" at the same moment and both apply it.
//
// pg_advisory_lock is a lock the database itself holds, so it works across
// instances, across regions, and across processes that know nothing about each
// other. The second instance waits, and by the time it gets in there is
// nothing pending. Both then serve requests against a correct schema, which is
// the only outcome that matters.
//
// The lock lives on a *session*, which is why everything here runs on one
// Client rather than through the app's usual database handle. That handle is
// the HTTP driver, which opens a fresh connection per call — take a lock
// through it and the lock is released the moment the call returns, leaving
// something that looks like a lock and holds nothing. The same fact does the
// cleanup for free: if this process dies mid-migration the session ends and
// the lock goes with it, so a crash cannot wedge every future boot.
//
// ── And why a Client rather than the usual handle ─────────────────────────
// The other reason is that a migration is a whole file. The HTTP driver
// prepares statements and refuses more than one per call — "cannot insert
// multiple commands into a prepared statement" — so it cannot run a schema
// file at all, and splitting one on semicolons means writing a SQL parser that
// understands dollar-quoted DO blocks. The Client speaks the simple query
// protocol and takes the file as written.
//
// ── What it will not do ───────────────────────────────────────────────────
// It applies files. It does not roll back, and there is no down migration.
// Reversing a migration by running SQL backwards assumes the failure happened
// somewhere the reverse is meaningful, and a half-applied DROP is not. The
// answer to a bad migration is a backup and a new file, which is also the
// answer this repo already gives for a bad DROP.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from '@neondatabase/serverless';

// One arbitrary number, the same in every copy, so two instances of the same
// journal contend and two different journals never do — they are different
// databases and cannot see each other's locks anyway.
const LOCK_KEY = 8577120;

const FOLDER = join(process.cwd(), 'migrations');

// Numbered, applied in that order, and the number is the identity. A file
// renamed after it has run is a file that runs again, which is why the note at
// the top of 001 says nothing edits it.
function pendingFiles(done) {
  let names = [];
  try {
    names = readdirSync(FOLDER).filter(n => n.endsWith('.sql')).sort();
  } catch {
    // No migrations folder is not an error worth stopping a site for. A copy
    // running without one is a copy whose schema somebody manages by hand,
    // which is exactly where this journal was last week.
    return [];
  }
  return names.filter(n => !done.has(n));
}

// Kept plain, and named the way every other tool names it, because this is the
// one table a stranger opening the database has to recognise on sight.
const LEDGER = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename    text PRIMARY KEY,
    applied_at  timestamptz NOT NULL DEFAULT now()
  )`;

// The whole of it. Returns what it did so a caller can log it; throws only if
// a migration itself fails, because a database that did not finish migrating
// is not a database the site should serve from.
export async function bringUpToDate({ log = () => {} } = {}) {
  if (!process.env.DATABASE_URL) {
    log('no DATABASE_URL — skipping migrations');
    return { applied: [], skipped: true };
  }

  const client = new Client(process.env.DATABASE_URL);
  await client.connect();

  try {
    await client.query(LEDGER);

    // Taken before reading what is pending, not after. Between the read and
    // the write is exactly where a race lives.
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_KEY]);

    const { rows } = await client.query('SELECT filename FROM schema_migrations');
    const done = new Set(rows.map(r => r.filename));
    const pending = pendingFiles(done);

    if (!pending.length) return { applied: [] };

    const applied = [];
    for (const name of pending) {
      const sql = readFileSync(join(FOLDER, name), 'utf8');
      log(`applying ${name}`);
      // The file as written, in one call. Postgres runs a multi-statement
      // simple query as a single implicit transaction, so a file that fails
      // halfway leaves nothing behind and is not recorded — the next boot
      // tries it again rather than skipping past a half-applied change.
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
        [name]
      );
      applied.push(name);
    }
    return { applied };
  } finally {
    // Ending the session drops the advisory lock with it, so there is nothing
    // to unlock by hand and nothing left holding it if this throws.
    await client.end().catch(() => {});
  }
}
