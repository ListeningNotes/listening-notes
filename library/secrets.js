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
//
// On a deployment that hosts many journals the environment speaks for none
// of them (library/hosting_directory.js, deploymentSetting): one keeper's
// password, signing key or AI key in the deployment's settings would open,
// or pay for, every journal on it. Each hosted journal's are in its own
// vault and nowhere else.

import { randomBytes, randomInt, scrypt as scryptCallback, timingSafeEqual, createHmac } from 'node:crypto';
import { promisify } from 'node:util';
import database from './database_connection.js';
import { deploymentSetting, memoryOf } from './hosting_directory.js';

const scrypt = promisify(scryptCallback);

// Anything a caller sends that is not one of these is ignored — the same
// allow-list shape save_settings uses, for the same reason.
// `lastfm_key` left this list on 2026-09-16 with Last.fm. The column stays —
// the schema is additive-only — so a copy that had a key keeps holding it,
// unread and now unwritable. Clearing it is one statement in a SQL console and
// nothing needs it done.
const WRITABLE = ['session_secret', 'password_hash', 'claim_code', 'anthropic_key', 'setup_open_until'];

// Read the row. Catches, like pull_settings: a copy whose database is not
// built yet still has to answer "is there a key" with no rather than a stack
// trace.
export async function pull_secrets() {
  try {
    const [row] = await database`
      SELECT session_secret, password_hash, claim_code, anthropic_key, setup_open_until
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

// ── The claim, inside somebody else's transaction, 2026-10-08 ─────────────
// What the setup claim writes here — the password, and the end of the claim
// code and the window — for a journal brought in rather than started
// (app/api/restore). There it rides the restore's own transaction, so the
// journal and the claim land together or not at all: a journal brought in
// and claimed with no password would let nobody in. `query` takes (text,
// params), as library/whole_journal.mjs's callers do; the SQL stays here,
// with the rest of the vault's.
export async function seal_claim(query, password_hash) {
  await query(
    `INSERT INTO secrets (id, password_hash, claim_code, setup_open_until)
     VALUES (1, $1, NULL, NULL)
     ON CONFLICT (id) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       claim_code = NULL,
       setup_open_until = NULL,
       updated_at = now()`,
    [password_hash],
  );
}

// ── The API key ───────────────────────────────────────────────────────────
// Database, then environment. Null when neither has one. There were two until
// 2026-09-16; `lastfmKey()` went with Last.fm, and it had already stopped
// having callers before it did — the beacon read the key straight out of its
// own narrow reader.
export async function anthropicKey() {
  const { anthropic_key } = await pull_secrets();
  return anthropic_key || deploymentSetting('ANTHROPIC_API_KEY') || null;
}

// ── The signing key ───────────────────────────────────────────────────────
// Environment if set; otherwise the stored one; otherwise a new one, stored.
// Cached for the life of the process, because it is asked for on every
// wristband check and it does not change.
//
// Two instances starting at once could both find nothing and both mint one.
// The COALESCE in the upsert makes the first write win and hands the second
// instance the first one's value, so every instance signs with the same key.
//
// Kept per journal, 2026-10-20: on a deployment that hosts many, one journal's
// key handed to another would let a wristband from the one open the other.
const cachedSecrets = new Map();

export async function sessionSecret() {
  const whose = await memoryOf();
  const kept = cachedSecrets.get(whose);
  if (kept) return kept;
  const fromEnv = deploymentSetting('SESSION_SECRET');
  if (fromEnv) {
    const secret = new TextEncoder().encode(fromEnv);
    cachedSecrets.set(whose, secret);
    return secret;
  }
  const minted = randomBytes(32).toString('base64');
  const [row] = await database`
    INSERT INTO secrets (id, session_secret) VALUES (1, ${minted})
    ON CONFLICT (id) DO UPDATE SET
      session_secret = COALESCE(secrets.session_secret, EXCLUDED.session_secret)
    RETURNING session_secret`;
  const secret = new TextEncoder().encode(row.session_secret);
  cachedSecrets.set(whose, secret);
  return secret;
}

// ── The directory's code for a journal, 2026-10-07 ─────────────────────────
// What the registry issues a journal that asks to be listed, for it to serve
// at /api/public/listing so the registry can see the address is theirs. Made
// from the session secret and the address rather than kept, so asking writes
// nothing until the code has come back, and the same address is always issued
// the same code. Not itself a secret once issued: the journal serves it to
// anybody while it is listed, which is why taking a journal off asks for more
// than the code (app/api/directory/listings/route.js).
export async function directoryCode(address) {
  const key = await sessionSecret();
  return createHmac('sha256', Buffer.from(key))
    .update(`directory:${address}`)
    .digest('base64url')
    .slice(0, 22);
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
  if (deploymentSetting('SESSION_PASSWORD')) return 'environment';
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

// ── The spare key, 2026-10-20 ─────────────────────────────────────────────
// The floor (Miyel's brief, passkeys): the one way back into a journal when
// every device that held a key is gone and the password with it, and the
// only one on a journal that never had a password. Sixteen characters from
// the claim code's alphabet, in fours (her pick over six words), drawn
// without the modulo's lean; shown once when made and kept here only as a
// hash, the password's kind. It opens the door once (her pick): the sign-in
// spends it in the same statement that checks it is still there, so two at
// once cannot both get through. Made again from Your keys while signed in,
// which retires the one before. Never in pull_secrets, and never in an
// export, which leaves the vault behind.
const SPARE_LENGTH = 16;

export function tidySpareKey(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Makes a new spare key, retiring any before it, and returns it in fours for
// the one time it is shown.
export async function makeSpareKey() {
  const chars = Array.from({ length: SPARE_LENGTH }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
  const hash = await hashPassword(chars);
  await database`
    INSERT INTO secrets (id, spare_key_hash, spare_key_made_at, spare_key_used_at)
    VALUES (1, ${hash}, now(), NULL)
    ON CONFLICT (id) DO UPDATE SET
      spare_key_hash = EXCLUDED.spare_key_hash,
      spare_key_made_at = EXCLUDED.spare_key_made_at,
      spare_key_used_at = NULL`;
  return chars.match(/.{4}/g).join('-');
}

// What Your keys and the lock may know: whether one is ready, when it was
// made, and when the last one was used. Never the hash.
export async function spareKeyState() {
  const [row] = await database`
    SELECT spare_key_hash IS NOT NULL AS ready, spare_key_made_at, spare_key_used_at
    FROM secrets WHERE id = 1`;
  return {
    ready: row?.ready === true,
    made_at: row?.spare_key_made_at || null,
    used_at: row?.spare_key_used_at || null,
  };
}

// True when the key given is the one kept, which is then spent. A key that
// matched but was spent by another sign-in a moment before is refused.
export async function spendSpareKey(given) {
  const typed = tidySpareKey(given);
  if (typed.length !== SPARE_LENGTH) return false;
  const [row] = await database`SELECT spare_key_hash FROM secrets WHERE id = 1`;
  const hash = row?.spare_key_hash;
  if (!hash || !(await verifyPassword(typed, hash))) return false;
  const spent = await database`
    UPDATE secrets SET spare_key_hash = NULL, spare_key_used_at = now()
    WHERE id = 1 AND spare_key_hash = ${hash}
    RETURNING id`;
  return spent.length > 0;
}

// What the owner's settings page is allowed to know: whether each thing is
// set, where it came from, and the tail of a key so two can be told apart.
// Never the value.
export async function describe_secrets() {
  const row = await pull_secrets();
  const tail = v => (v ? `…${String(v).slice(-4)}` : null);
  return {
    password: await passwordSource(),
    session_secret: deploymentSetting('SESSION_SECRET') ? 'environment' : row.session_secret ? 'journal' : null,
    anthropic_key: row.anthropic_key
      ? { source: 'journal', tail: tail(row.anthropic_key) }
      : deploymentSetting('ANTHROPIC_API_KEY') ? { source: 'environment', tail: tail(deploymentSetting('ANTHROPIC_API_KEY')) } : null,
  };
}
