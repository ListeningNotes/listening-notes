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

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
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

export class NoJournalHere extends Error {
  constructor(host) {
    super('There is no journal at this address.');
    this.name = 'NoJournalHere';
    this.host = host;
  }
}

// ── The directory itself ──────────────────────────────────────────────────

let book = null;
function directory() {
  if (!book) book = neon(process.env.HOSTING_DIRECTORY_URL);
  return book;
}

// The one table, made the first time it is needed. Additive only, like a
// journal's own schema: a column added later is added with IF NOT EXISTS.
const SHELF = `
  CREATE TABLE IF NOT EXISTS journals (
    host       text PRIMARY KEY,
    sealed     text NOT NULL,
    placed_at  timestamptz NOT NULL DEFAULT now()
  )`;
let shelved = null;
function shelf() {
  if (!shelved) shelved = directory().query(SHELF).catch(error => { shelved = null; throw error; });
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
  const host = await hostHere();
  const journal = await journalAt(host);
  if (!journal) throw new NoJournalHere(host);
  return journal;
}

// What a server's memory of one journal is filed under, so nothing it keeps
// for one journal is handed to another: the journal's address on a copy that
// hosts many, and '' on a copy that hosts one.
export async function memoryOf() {
  if (!hosting()) return '';
  return (await journalHere()).host;
}

// Every address in the directory and when each arrived — never a way in.
// For the hand tool (scripts/hosting_directory.mjs).
export async function list_journals() {
  await shelf();
  return await directory()`SELECT host, placed_at FROM journals ORDER BY host`;
}

// ── Placing a journal ─────────────────────────────────────────────────────
// Writes an address and the way into its database, sealed. Signup will call
// this (step 4); until then it is called by hand.
export async function place_journal(host, way) {
  const at = tidyHost(host);
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(at)) {
    throw new Error(`${host} is not an address a journal can live at.`);
  }
  if (!/^postgres(ql)?:\/\//.test(String(way))) throw new Error('That is not a way into a database.');
  await shelf();
  await directory()`
    INSERT INTO journals (host, sealed) VALUES (${at}, ${seal(at, way)})
    ON CONFLICT (host) DO UPDATE SET sealed = EXCLUDED.sealed`;
  known.delete(at);
  return at;
}
