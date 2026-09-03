// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/secrets.js
// The vault. Everything a copy holds that must never reach a visitor.
//
// ── Why a second table and a second file ──────────────────────────────────
// settings is the most-read row in the database and it is read by a public
// route. It has stayed safe to read because an explicit column list keeps the
// two images out; a password hash in the same row would be one forgotten
// column away from being printed. So the secrets live in their own table, and
// this file is the only thing that reads it. Nothing here is ever returned
// whole to a browser — the owner's settings page is told whether a key is
// set and its last few characters, and that is all.
//
// ── Where each value comes from ───────────────────────────────────────────
// The database first, then the environment. Every one of these used to be an
// environment variable, and for the copy this software was written in they
// still are — so the environment goes on working for anybody who set it, and
// a value typed into Settings wins over it because it is the later decision.
// The session secret is the exception: the environment wins there, because
// changing it signs everybody out and a copy that set one on purpose should
// not be signed out by a row it did not know existed.

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import database from './database_connection.js';

const scrypt = promisify(scryptCallback);

// Anything a caller sends that is not one of these is ignored — the same
// allow-list shape save_settings uses, for the same reason.
const WRITABLE = ['session_secret', 'password_hash', 'claim_code', 'lastfm_key', 'anthropic_key', 'setup_open_until'];

// Read the row. Catches, like pull_settings: a copy whose database is not
// built yet still has to answer "is there a key" with no rather than a stack
// trace.
export async function pull_secrets() {
  try {
    const [row] = await database`
      SELECT session_secret, password_hash, claim_code, lastfm_key, anthropic_key, setup_open_until
      FROM secrets WHERE id = 1`;
    return row || {};
  } catch {
    return {};
  }
}

export async function save_secrets(fields) {
  const patch = {};
  for (const key of WRITABLE) {
    if (key in fields) {
      const v = fields[key];
      patch[key] = typeof v === 'string' && v.trim() === '' ? null : v;
    }
  }
  const columns = Object.keys(patch);
  if (!columns.length) return;
  await database.query(
    `INSERT INTO secrets (id, ${columns.map(c => `"${c}"`).join(', ')})
     VALUES (1, ${columns.map((_, i) => `$${i + 1}`).join(', ')})
     ON CONFLICT (id) DO UPDATE SET
       ${columns.map(c => `"${c}" = EXCLUDED."${c}"`).join(', ')},
       updated_at = now()`,
    columns.map(c => patch[c])
  );
}

// ── The two API keys ──────────────────────────────────────────────────────
// Database, then environment. Null when neither has one.
export async function lastfmKey() {
  const { lastfm_key } = await pull_secrets();
  return lastfm_key || process.env.LASTFM_KEY || null;
}

export async function anthropicKey() {
  const { anthropic_key } = await pull_secrets();
  return anthropic_key || process.env.ANTHROPIC_API_KEY || null;
}

// ── The signing key ───────────────────────────────────────────────────────
// Environment if set; otherwise the stored one; otherwise a new one, stored.
// Cached for the life of the process, because it is asked for on every
// wristband check and it does not change.
//
// Two instances starting at once could both find nothing and both mint one.
// The COALESCE in the upsert makes the first write win and hands the second
// instance the first one's value, so every instance signs with the same key.
let cachedSecret = null;

export async function sessionSecret() {
  if (cachedSecret) return cachedSecret;
  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv) {
    cachedSecret = new TextEncoder().encode(fromEnv);
    return cachedSecret;
  }
  const minted = randomBytes(32).toString('base64');
  const [row] = await database`
    INSERT INTO secrets (id, session_secret) VALUES (1, ${minted})
    ON CONFLICT (id) DO UPDATE SET
      session_secret = COALESCE(secrets.session_secret, EXCLUDED.session_secret)
    RETURNING session_secret`;
  cachedSecret = new TextEncoder().encode(row.session_secret);
  return cachedSecret;
}

// ── The password ──────────────────────────────────────────────────────────
// scrypt, which Node ships, so there is nothing to install and nothing to
// keep current. Stored as scrypt:<salt>:<hash>, all hex, so a row read back
// in a year still says how it was made.
const KEY_LENGTH = 64;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(String(password), salt, KEY_LENGTH);
  return `scrypt:${salt.toString('hex')}:${Buffer.from(hash).toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const [scheme, saltHex, hashHex] = stored.split(':');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = Buffer.from(await scrypt(String(password), Buffer.from(saltHex, 'hex'), expected.length));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// Where the password currently comes from: 'journal' when one has been set on
// the site, 'environment' when only SESSION_PASSWORD exists, null when there
// is no password at all — which is only ever true of a copy nobody has
// claimed yet.
export async function passwordSource() {
  const { password_hash } = await pull_secrets();
  if (password_hash) return 'journal';
  if (process.env.SESSION_PASSWORD) return 'environment';
  return null;
}

// ── The claim code ────────────────────────────────────────────────────────
// What lets the owner, and only the owner, be the first person through the
// door of a copy that has no password yet. It is printed where the person who
// deployed the copy is already looking — the build log — and it is typed once,
// on the setup screen, in place of a password.
//
// Minted the first time the copy starts unclaimed, kept until it is claimed,
// reprinted on every start until then, and cleared at the moment of claiming.
// Eight characters from the same alphabet the serial uses, with no 0/O or
// 1/I/l, because it is read off a screen and typed back in.
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function mintClaimCode() {
  const bytes = randomBytes(8);
  const chars = Array.from(bytes, b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
  return `${chars.slice(0, 4)}-${chars.slice(4)}`;
}

// A typed code is compared with its dashes and case removed, so "h7k2 pq4m"
// and "H7K2-PQ4M" are the same answer.
export function tidyClaimCode(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Returns the code while the copy is unclaimed, or null once it is. Minted if
// missing; the COALESCE makes a race between two starting instances harmless.
export async function claimCode() {
  const [claimed] = await database`SELECT setup_complete FROM settings WHERE id = 1`;
  if (claimed?.setup_complete === true) return null;
  const minted = mintClaimCode();
  const [row] = await database`
    INSERT INTO secrets (id, claim_code) VALUES (1, ${minted})
    ON CONFLICT (id) DO UPDATE SET
      claim_code = COALESCE(secrets.claim_code, EXCLUDED.claim_code)
    RETURNING claim_code`;
  return row.claim_code;
}

// ── The window ────────────────────────────────────────────────────────────
// For half an hour after a build, an unclaimed copy lets its owner into setup
// with no code at all. The build is the one moment the owner is certainly
// the person looking — Vercel's Congratulations screen is in front of them,
// and pressing the picture on it opens the site. Only the build opens the
// window: a server start would be opened by whoever's visit woke the copy,
// and that could be anybody. Past the window, the code in the log or a
// redeploy, which runs the build again. Claiming clears it.
const WINDOW_MINUTES = 30;

export async function openSetupWindow() {
  const [claimed] = await database`SELECT setup_complete FROM settings WHERE id = 1`;
  if (claimed?.setup_complete === true) return null;
  const until = new Date(Date.now() + WINDOW_MINUTES * 60_000);
  await database`
    INSERT INTO secrets (id, setup_open_until) VALUES (1, ${until})
    ON CONFLICT (id) DO UPDATE SET setup_open_until = EXCLUDED.setup_open_until`;
  return until;
}

export async function setupWindowOpen() {
  const { setup_open_until } = await pull_secrets();
  return Boolean(setup_open_until && new Date(setup_open_until).getTime() > Date.now());
}

export { WINDOW_MINUTES };

export async function claimCodeMatches(given) {
  const typed = tidyClaimCode(given);
  if (!typed) return false;
  const { claim_code } = await pull_secrets();
  if (!claim_code) return false;
  const a = Buffer.from(typed);
  const b = Buffer.from(tidyClaimCode(claim_code));
  return a.length === b.length && timingSafeEqual(a, b);
}

// What the owner's settings page is allowed to know: whether each thing is
// set, where it came from, and the tail of a key so two can be told apart.
// Never the value.
export async function describe_secrets() {
  const row = await pull_secrets();
  const tail = v => (v ? `…${String(v).slice(-4)}` : null);
  return {
    password: await passwordSource(),
    session_secret: process.env.SESSION_SECRET ? 'environment' : row.session_secret ? 'journal' : null,
    lastfm_key: row.lastfm_key
      ? { source: 'journal', tail: tail(row.lastfm_key) }
      : process.env.LASTFM_KEY ? { source: 'environment', tail: tail(process.env.LASTFM_KEY) } : null,
    anthropic_key: row.anthropic_key
      ? { source: 'journal', tail: tail(row.anthropic_key) }
      : process.env.ANTHROPIC_API_KEY ? { source: 'environment', tail: tail(process.env.ANTHROPIC_API_KEY) } : null,
  };
}
