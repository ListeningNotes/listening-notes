// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// scripts/prepare_database.mjs
// Runs before `next build`: brings the database up to date and, on a copy
// nobody has claimed, prints the claim code.
//
// ── Why at build and not only at start ────────────────────────────────────
// The server already migrates itself on every start (instrumentation.js).
// The build does it too for one reason: the build log is the screen the
// person who pressed Deploy is looking at, and the claim code has to reach
// that person and nobody else. A runtime log is a tab they have to go and
// find; the build log is already open.
//
// ── What it does with no database ─────────────────────────────────────────
// Says so, and lets the build carry on. A copy deployed without DATABASE_URL
// used to fail here with a stack trace; now it builds, starts, and shows a
// page explaining what is missing — see the hold in app/layout.js. Failing
// the build would put the same explanation somewhere less readable.
//
// A database that exists but cannot be reached from the build machine is
// also not fatal: the server migrates again on start, and the claim code is
// reprinted in the runtime log.

// .env.local the way Next itself reads it, so `npm run build` on a laptop
// sees the same variables the dev server does. On Vercel the variables are
// already in the environment and this finds nothing to add.
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());

const { bringUpToDate } = await import('../library/migrator.js');
const { claimCode, openSetupWindow } = await import('../library/secrets.js');
const { claimNotice } = await import('../library/claim_notice.js');
const { explainDatabaseError } = await import('../library/database_connection.js');

const say = message => console.log(`[prepare] ${message}`);

if (!process.env.DATABASE_URL) {
  say('no DATABASE_URL — the site will build and hold on a page asking for one');
  process.exit(0);
}

try {
  const { applied } = await bringUpToDate({ log: say });
  say(applied.length ? `applied ${applied.join(', ')}` : 'database up to date');
} catch (error) {
  say(`could not reach the database from the build: ${explainDatabaseError(error)}`);
  say(`the driver said: ${error?.message || error}`);
  say('the site will build anyway and try again when it starts');
  process.exit(0);
}

try {
  const code = await claimCode();
  if (code) {
    await openSetupWindow();
    console.log(claimNotice(code, { windowOpen: true }));
  }
} catch (error) {
  say(`could not read the claim code (${error?.message || error}); it will be in the runtime log`);
}
