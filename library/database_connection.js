// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/database_connection.js
// The one handle everything reads and writes through.
//
// ── Opened on first use, not on import ────────────────────────────────────
// neon() throws the moment it is called with no connection string, and this
// module used to call it at the top — so a copy deployed without DATABASE_URL
// failed while *building*, and its owner read "your deployment failed" in a
// dashboard instead of a page saying what was missing. The build has no
// business needing a database: every page here is dynamic and reads at
// request time. So the client is made the first time something asks for it,
// and a copy with nothing to connect to still builds, still starts, and
// shows a page that says so (see the hold in app/layout.js).
//
// The shape is preserved: `database` is callable as a tagged template and
// carries .query, which is the whole of what the callers use.
//
// ── Whose database, 2026-10-20 ────────────────────────────────────────────
// On a copy that hosts many journals (library/hosting_directory.js) the
// handle works out which journal a request is for from the address it was
// made to, and opens that journal's database — so the hundred and more
// queries written against `database` stay exactly as they are (Miyel,
// 2026-10-08). A journal is brought up to date the first time a server
// instance opens it, rather than at the build: a deployment that hosts many
// journals has no one database to migrate at start, and a journal that
// fails to migrate fails alone. On a copy that hosts one, it is
// DATABASE_URL, as it always was.

import { neon } from '@neondatabase/serverless';
import { hosting, journalHere } from './hosting_directory.js';

// One client per database, made on first use. A client is only a way of
// asking over HTTP, so keeping one per journal costs nothing between asks.
const clients = new Map();
function clientFor(way) {
  let client = clients.get(way);
  if (!client) {
    client = neon(way);
    clients.set(way, client);
  }
  return client;
}

export function hasDatabase() {
  return hosting() || Boolean(process.env.DATABASE_URL);
}

// Each hosted journal is brought up to date once per server instance, by
// whichever request reaches it first; the rest wait on the same promise. A
// failure is forgotten so the next request tries again, and until one
// succeeds nothing is read from a journal whose schema is behind its code.
const broughtUp = new Map();
function upToDate(journal) {
  let ready = broughtUp.get(journal.host);
  if (!ready) {
    ready = import('./migrator.js').then(({ bringUpToDate }) => bringUpToDate({
      url: journal.way,
      log: said => console.log(`[migrations ${journal.host}] ${said}`),
    }));
    broughtUp.set(journal.host, ready);
    ready.catch(() => broughtUp.delete(journal.host));
  }
  return ready;
}

async function connect() {
  if (!hosting()) {
    if (!process.env.DATABASE_URL) {
      throw new Error('No database connection string was provided. Set DATABASE_URL.');
    }
    return clientFor(process.env.DATABASE_URL);
  }
  const journal = await journalHere();
  await upToDate(journal);
  return clientFor(journal.way);
}

const database = (...args) => connect().then(client => client(...args));
database.query = (...args) => connect().then(client => client.query(...args));
// Several statements as one, all or none (2026-10-21, a friend's move taken
// whole): `build` is handed this journal's own handle, writes its statements
// with it, and they go over together.
database.transaction = build => connect().then(client => client.transaction(build(client)));

export default database;

// What went wrong, said for the person who has to fix it — who is the owner,
// alone, reading a log or a holding page, and not a developer. The driver's
// messages are accurate and useless: "password authentication failed for
// user" is a sentence about Postgres, not about which of their three copied
// strings was wrong. Each case names the thing to check and where it is.
export function explainDatabaseError(error) {
  const said = String(error?.message || error || '').toLowerCase();
  const where = 'In Vercel it is under the project’s Settings → Environment Variables; the value comes from your Neon project’s Connection Details.';
  if (!process.env.DATABASE_URL) {
    return `No database connection string is set. Add DATABASE_URL and redeploy. ${where}`;
  }
  if (said.includes('password authentication') || said.includes('authentication failed')) {
    return `The database refused the password in DATABASE_URL. Copy the whole connection string again from Neon and replace it. ${where}`;
  }
  if (said.includes('enotfound') || said.includes('getaddrinfo') || said.includes('could not translate host')) {
    return `The database address in DATABASE_URL could not be found. Check it against Neon’s Connection Details; the host ends in neon.tech. ${where}`;
  }
  if (said.includes('does not exist')) {
    return `DATABASE_URL points at a database or role that does not exist on that Neon project. Copy the connection string again from Neon. ${where}`;
  }
  if (said.includes('timeout') || said.includes('timed out') || said.includes('econnrefused') || said.includes('econnreset')) {
    return 'The database did not answer in time. Neon projects sleep when idle and wake in a few seconds — reload. If it keeps happening, check the project is not suspended in Neon.';
  }
  if (said.includes('ssl') || said.includes('tls')) {
    return `The connection needs SSL. Make sure DATABASE_URL ends with ?sslmode=require. ${where}`;
  }
  return `The database could not be reached (${error?.message || 'unknown reason'}). Check DATABASE_URL. ${where}`;
}
