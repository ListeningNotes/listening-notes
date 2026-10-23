// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/hosting_directory.js
// The hosting directory: which hosted journal lives at which address, and
// the locked way into its database (Miyel's name, 2026-10-20 — a directory of
// its own, kept apart from the Board's, which anyone can read).
//
// ── What it is for ────────────────────────────────────────────────────────
// One deployment serving many journals, a database each (the hosted
// journals brief, step 3). Every request is for one address, and this says
// whose database answers it. That is all it holds: an address, the way in,
// and when the journal arrived. No journal's writing ever lives here.
//
// ── A copy that hosts nobody ──────────────────────────────────────────────
// Without HOSTING_DIRECTORY_URL none of this runs, and the one journal is
// DATABASE_URL, exactly as it always was. A self-hosted copy is the same code
// with one journal and no directory.
//
// ── Locked ────────────────────────────────────────────────────────────────
// A journal's connection string opens everything it holds, so the directory
// keeps each one sealed (AES-256-GCM) with HOSTING_DIRECTORY_KEY, which lives
// only in the deployment's settings (her pick). A copy of the directory on
// its own opens nothing. Each seal is bound to its address, so a way in
// copied onto another address's row will not open there.
//
// ── An address it does not know ───────────────────────────────────────────
// Is no journal at all: never the nearest, never a default. A request for one
// throws NoJournalHere, and the root layout says so instead of drawing
// anybody's journal.
//
// ── The deployment's own settings ─────────────────────────────────────────
// Speak for the one journal a self-hosted copy serves — its password, its
// signing key, its AI key — and for none of the journals a hosting deployment
// serves, or one keeper's setting would open, or pay for, every journal on it
// (deploymentSetting). Each hosted journal's live in its own vault.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { neon } from '@neondatabase/serverless';

export function hosting() {
  return Boolean(process.env.HOSTING_DIRECTORY_URL);
}

// One of the deployment's settings, for a copy that serves one journal;
// nothing at all for a deployment that hosts many.
export function deploymentSetting(name) {
  return hosting() ? undefined : process.env[name];
}

// An address the way the directory keeps it: lower case, without a port or
// a trailing dot.
export function tidyHost(value) {
  return String(value || '').trim().toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
}

// The address this request was made to. Vercel's edge writes
// x-forwarded-host itself, so it is the address the visitor typed; anywhere
// without one, the Host header.
export async function hostHere() {
  const { headers } = await import('next/headers');
  const asked = await headers();
  return tidyHost(asked.get('x-forwarded-host') || asked.get('host'));
}

// ── The address a journal moved from ──────────────────────────────────────
// FORWARDING_ADDRESS (Miyel's name, 2026-10-20): where the journal that used
// to live at the front door's address lives now — hers, which was
// www.listeningnotes.blog until the front door took the domain (hosted
// journals, step 5). Every copy that knew the old address goes on asking
// there: address books, sends, waves, messages, the Board, problem reports,
// a link to an entry. So it stays that journal's, for good — all but the
// front door's home and /get, which go to the bare domain, because the
// domain is the publication's and the front door's rather than one
// journal's (Miyel, 2026-10-20). Its pages are sent on to the new address at
// the edge (next.config.mjs), and what is asked of /api there is answered
// here, by the journal itself, as if it had been asked at the new one: a
// problem report from a browser is checked with the server before it is
// sent, and that check cannot follow a forward.
//
// The front door keeps the bare domain; the old address is its www.
export function forwarding() {
  const domain = tidyHost(process.env.HOSTED_DOMAIN || '');
  const to = tidyHost(process.env.FORWARDING_ADDRESS || '');
  if (!hosting() || !domain || !to) return null;
  return { from: `www.${domain}`, to };
}

// ── The studio, 2026-10-22 ────────────────────────────────────────────────
// STUDIO_ADDRESS: where Listening Notes is made — a journal of its own, kept
// by the canonical keeper and her team, at an address nobody is shown
// (Miyel's word, "studio": "my instagram tools could potentially move here
// too and updates, where i send ln admin notes, everything"; the magazine
// has no sign-in on it). To begin with it keeps what keepers send for the
// month's prompt. The magazine is the bare domain, and those records are
// posted there (PUBLICATION_URL), so that one door at the bare domain is
// answered as the studio; every other thing at the bare domain stays the
// front door's, or is forwarded as before (next.config.mjs).
export function studio() {
  const domain = tidyHost(process.env.HOSTED_DOMAIN || '');
  const to = tidyHost(process.env.STUDIO_ADDRESS || '');
  if (!hosting() || !domain || !to) return null;
  return { from: domain, to };
}

// The address of the journal a request made to `host` is for: the same
// address, except the one a journal moved from, which is that journal's new
// one, and the bare domain, whose journal is the studio.
export function journalAddress(host) {
  const at = tidyHost(host);
  const moved = forwarding();
  if (moved && at === moved.from) return moved.to;
  const made = studio();
  return made && at === made.from ? made.to : at;
}

// Whether `address` is the journal this request reached, by either name it
// answers to: the address asked at, or the new address of the one asked at
// its old. A journal never says it moved to itself (This journal moved,
// 2026-10-21) — a visitor sent there would be sent on again, round in a
// circle — and a copy made after its keeper filled that in brings the value
// along to the new address, where it names the journal it is in.
export async function isHere(address) {
  const at = tidyHost(address);
  return !!at && journalAddress(at) === journalAddress(await hostHere());
}

export class NoJournalHere extends Error {
  constructor(host) {
    super('There is no journal at this address.');
    this.name = 'NoJournalHere';
    this.host = host;
  }
}

// ── What a door says at an address with no journal, 2026-10-21 ───────────
// A 404 in the page's own words, so a journal asking after one that is not
// there — a mistyped address, one taken down — is told it is not there,
// rather than that it is failing (a 500, which it would ask again) or that it
// is there and empty (a 200 with nothing in it, which is what the beacon and
// the counts said). The routes a stranger or another journal can reach ask
// this first in their failure; null for any other failure. `headers` for a
// door read across addresses, which says so on its 404 as well.
export function answerNoJournal(error, headers = {}) {
  if (!(error instanceof NoJournalHere)) return null;
  return Response.json(
    { error: 'There’s no journal at this address.' },
    { status: 404, headers: { 'Cache-Control': 'no-store', ...headers } },
  );
}

// ── The directory itself ──────────────────────────────────────────────────

let book = null;
function directory() {
  if (!book) book = neon(process.env.HOSTING_DIRECTORY_URL);
  return book;
}

// The tables, made the first time they are needed. Additive only, like a
// journal's own schema: a column added later is added with IF NOT EXISTS.
//
// `neon_project`, 2026-10-20: the Neon project the front door made for a
// journal at signup (library/front_door.js), so one that was never set up can
// be cleared after an hour. Empty for a journal placed by hand — one that
// moved in keeps its own database, and nothing here ever deletes it.
const SHELF = [
  `CREATE TABLE IF NOT EXISTS journals (
    host       text PRIMARY KEY,
    sealed     text NOT NULL,
    placed_at  timestamptz NOT NULL DEFAULT now()
  )`,
  'ALTER TABLE journals ADD COLUMN IF NOT EXISTS neon_project text',
  // `tickets`, 2026-10-22: invitations to start a journal (below).
  `CREATE TABLE IF NOT EXISTS tickets (
    hash        text PRIMARY KEY,
    inviter     text NOT NULL,
    made_at     timestamptz NOT NULL DEFAULT now(),
    used_at     timestamptz,
    used_by     text,
    retired_at  timestamptz
  )`,
  'CREATE INDEX IF NOT EXISTS tickets_by_inviter ON tickets (inviter, made_at)',
];
let shelved = null;
function shelf() {
  if (!shelved) {
    shelved = SHELF.reduce((done, statement) => done.then(() => directory().query(statement)), Promise.resolve())
      .catch(error => { shelved = null; throw error; });
  }
  return shelved;
}

// ── The lock ──────────────────────────────────────────────────────────────

function key() {
  const raw = Buffer.from(String(process.env.HOSTING_DIRECTORY_KEY || ''), 'base64');
  if (raw.length !== 32) throw new Error('HOSTING_DIRECTORY_KEY has to be 32 random bytes, written in base64.');
  return raw;
}

// "v1." and three parts, so a key changed one day can be told apart from
// this one.
export function seal(host, way) {
  const iv = randomBytes(12);
  const lock = createCipheriv('aes-256-gcm', key(), iv);
  lock.setAAD(Buffer.from(tidyHost(host)));
  const body = Buffer.concat([lock.update(String(way), 'utf8'), lock.final()]);
  return ['v1', iv, lock.getAuthTag(), body].map(part => (typeof part === 'string' ? part : part.toString('base64url'))).join('.');
}

function unseal(host, sealed) {
  const [version, iv, tag, body] = String(sealed).split('.');
  if (version !== 'v1' || !iv || !tag || !body) throw new Error(`The way into ${host} is not sealed in a way this copy can open.`);
  const lock = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'));
  lock.setAAD(Buffer.from(tidyHost(host)));
  lock.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([lock.update(Buffer.from(body, 'base64url')), lock.final()]).toString('utf8');
}

// ── Finding a journal ─────────────────────────────────────────────────────
// Each answer is kept for a minute, so a request costs the directory nothing
// after the first; an address with nobody at it for ten seconds, so a
// journal just placed opens almost at once. The memory is emptied rather
// than allowed to grow past a few hundred addresses: anybody can ask for any
// address under the domain.
const KEPT_FOR = 60_000;
const NOBODY_FOR = 10_000;
const MOST_KEPT = 500;
const known = new Map();

export async function journalAt(host) {
  const at = tidyHost(host);
  if (!at) return null;
  const kept = known.get(at);
  if (kept && Date.now() - kept.at < (kept.way ? KEPT_FOR : NOBODY_FOR)) {
    return kept.way ? { host: at, way: kept.way } : null;
  }
  await shelf();
  const [row] = await directory()`SELECT sealed FROM journals WHERE host = ${at}`;
  const way = row ? unseal(at, row.sealed) : null;
  if (known.size >= MOST_KEPT) known.clear();
  known.set(at, { way, at: Date.now() });
  return way ? { host: at, way } : null;
}

// The journal this request is for: null on a copy that hosts nobody, and
// NoJournalHere for an address the directory does not know.
export async function journalHere() {
  if (!hosting()) return null;
  const host = journalAddress(await hostHere());
  const journal = await journalAt(host);
  if (!journal) throw new NoJournalHere(host);
  return journal;
}

// What a server's memory of one journal is filed under, so nothing it keeps
// for one journal is handed to another: the address of the journal the
// request is for on a copy that hosts many — an old address files under the
// new one, so a journal asked at both is still one journal — and '' on a copy
// that hosts one. An address with no journal at it — the front door, or
// nobody's — files under its own name too; nothing about a journal is ever
// read there to be kept.
export async function memoryOf() {
  if (!hosting()) return '';
  return journalAddress(await hostHere());
}

// Every address in the directory and when each arrived — never a way in.
// For the hand tool (scripts/hosting_directory.mjs).
export async function list_journals() {
  await shelf();
  return await directory()`SELECT host, placed_at FROM journals ORDER BY host`;
}

// How many journals the directory holds: a count on the community, never on
// anybody (the front door's places left).
export async function count_journals() {
  await shelf();
  const [row] = await directory()`SELECT count(*)::int AS n FROM journals`;
  return row?.n || 0;
}

// The journals the front door made that are more than `olderThan` old, with
// their ways in, for clearing the ones never set up (library/front_door.js).
export async function made_at_signup(olderThan) {
  await shelf();
  const rows = await directory()`
    SELECT host, sealed, neon_project FROM journals
    WHERE neon_project IS NOT NULL AND placed_at < now() - ${olderThan}::interval
    ORDER BY placed_at LIMIT 5`;
  return rows.map(row => ({ host: row.host, project: row.neon_project, way: unseal(row.host, row.sealed) }));
}

// Takes an address out of the directory. Only ever for a journal the front
// door made and nobody set up; a journal leaving is a move, not a removal.
export async function unplace_journal(host) {
  await shelf();
  await directory()`DELETE FROM journals WHERE host = ${tidyHost(host)}`;
  known.delete(tidyHost(host));
}

// ── Tickets, 2026-10-22 ───────────────────────────────────────────────────
// While it is her and her friends, a journal starts only with an invitation
// (Miyel: "they're scarce until I have everything figured out"; OPEN_DOOR
// lets anybody in, library/front_door.js). A keeper's Invite asks for a
// ticket (app/api/tickets): one journal, once, within two weeks. The row
// keeps who invited — the address the keeper's own signed-in press came
// from — so a link with an address written into it by hand names nobody
// (her ask: "guard it as well against address overwriting"); and it keeps
// only the code's hash, so the table read alone lets nobody in.
//
// A journal asks for at most TICKETS_A_DAY in a day, and keeps at most
// TICKETS_WAITING unused: past that the oldest unused one runs out, so an
// Invite opened and shut again wastes nothing that was sent. A journal that
// is let go unfinished gives its ticket back (library/front_door.js), so the
// same link starts again.
const TICKET_DAYS = 14;
const TICKETS_A_DAY = 20;
const TICKETS_WAITING = 10;
const ticketHash = code => createHash('sha256').update(String(code)).digest('base64url');
const STILL_GOOD = `used_at IS NULL AND retired_at IS NULL AND made_at > now() - interval '${TICKET_DAYS} days'`;

export async function make_ticket(inviter) {
  await shelf();
  const from = String(inviter || '').trim().toLowerCase();
  if (!from) throw new Error('A ticket needs the journal that gives it.');
  const [{ today }] = await directory()`
    SELECT count(*)::int AS today FROM tickets WHERE inviter = ${from} AND made_at > now() - interval '1 day'`;
  if (today >= TICKETS_A_DAY) return { refused: true, most: TICKETS_A_DAY };
  await directory().query(
    `UPDATE tickets SET retired_at = now() WHERE hash IN (
       SELECT hash FROM tickets WHERE inviter = $1 AND ${STILL_GOOD}
       ORDER BY made_at DESC OFFSET $2)`,
    [from, TICKETS_WAITING - 1],
  );
  const code = randomBytes(16).toString('base64url');
  await directory()`INSERT INTO tickets (hash, inviter) VALUES (${ticketHash(code)}, ${from})`;
  return { code };
}

// What a ticket is now — good, used, or run out — and whose it is; null for
// a code nobody was ever given.
export async function ticket_state(code) {
  if (!code || String(code).length > 64) return null;
  await shelf();
  const [row] = await directory().query(
    `SELECT inviter, used_at IS NOT NULL AS used, (${STILL_GOOD}) AS good FROM tickets WHERE hash = $1`,
    [ticketHash(code)],
  );
  if (!row) return null;
  return { inviter: row.inviter, state: row.good ? 'good' : row.used ? 'used' : 'run out' };
}

// Takes a good ticket for a journal about to be made, in one statement, so
// two people pressing Create on one link do not both get a journal; the
// inviter it names, or null.
export async function take_ticket(code) {
  if (!code || String(code).length > 64) return null;
  await shelf();
  const [row] = await directory().query(
    `UPDATE tickets SET used_at = now() WHERE hash = $1 AND ${STILL_GOOD} RETURNING inviter`,
    [ticketHash(code)],
  );
  return row?.inviter || null;
}

// The journal a taken ticket made; or the ticket back, when the making failed.
export async function ticket_made(code, host) {
  await shelf();
  await directory()`UPDATE tickets SET used_by = ${tidyHost(host)} WHERE hash = ${ticketHash(code)}`;
}
export async function give_back_ticket(code) {
  await shelf();
  await directory()`UPDATE tickets SET used_at = NULL WHERE hash = ${ticketHash(code)} AND used_by IS NULL`;
}

// A journal let go unfinished gives back the ticket that made it.
export async function give_back_tickets_of(host) {
  await shelf();
  await directory()`UPDATE tickets SET used_at = NULL, used_by = NULL WHERE used_by = ${tidyHost(host)}`;
}

// ── Placing a journal ─────────────────────────────────────────────────────
// Writes an address and the way into its database, sealed. Signup will call
// this (step 4); until then it is called by hand.
// `fresh`: only if nobody is at the address yet — two people choosing the
// same free name in the same second, one of them gets it (library/front_door.js).
export async function place_journal(host, way, { project = null, fresh = false } = {}) {
  const at = tidyHost(host);
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(at)) {
    throw new Error(`${host} is not an address a journal can live at.`);
  }
  if (!/^postgres(ql)?:\/\//.test(String(way))) throw new Error('That is not a way into a database.');
  await shelf();
  if (fresh) {
    const placed = await directory()`
      INSERT INTO journals (host, sealed, neon_project) VALUES (${at}, ${seal(at, way)}, ${project})
      ON CONFLICT (host) DO NOTHING RETURNING host`;
    if (!placed.length) throw new Error('That one is taken.');
  } else {
    await directory()`
      INSERT INTO journals (host, sealed, neon_project) VALUES (${at}, ${seal(at, way)}, ${project})
      ON CONFLICT (host) DO UPDATE SET sealed = EXCLUDED.sealed`;
  }
  known.delete(at);
  return at;
}
