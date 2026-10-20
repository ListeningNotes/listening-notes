// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/keyring.js
// The keyring: every passkey that opens this journal, and the two
// ceremonies — making a key on a device, and opening the door with one.
//
// ── What a passkey is, here ───────────────────────────────────────────────
// The way in with Face ID, Touch ID or a phone's fingerprint (Miyel's brief,
// passkeys, 2026-10-17). The device makes a pair of keys and keeps the
// private one in its own secure chip; this journal keeps only the public
// half, which opens nothing on its own, so a stolen copy of the table is
// worth nothing. Opening the door hands out the same wristband a password
// does (library/wristband.js), so nothing past the door knows which way
// somebody came in — and the password stays, as the second door. The
// checking is @simplewebauthn/server's, a maintained library: no
// cryptography is written here.
//
// One row per device's key in `keyring` (migrations/036_keyring.sql), read
// and written here and nowhere else, and never alongside settings.
//
// ── A key belongs to one address ──────────────────────────────────────────
// A device files a key under the address it was made at and offers it
// nowhere else. That address is the exact host the request came in on, www.
// and all: once journals share a domain as <name>.<domain>, a key filed under
// the bare domain would be one every journal's page could ask the device
// for. A journal that moves to a new address needs a key made there, after
// signing in once some other way.
//
// ── Between the two halves of a ceremony ──────────────────────────────────
// Each ceremony is two requests: this server hands the device a challenge,
// and the device sends it back signed. The challenge waits between them in a
// cookie that lasts five minutes, one per ceremony so making a key and
// opening the door never trip over each other. It is signed with a key of
// its own, derived from the journal's secret and never the secret itself:
// the wristband is only a signature, so anything signed with its key would
// pass for one — and the start of a sign-in is open to anybody.

import { createHmac } from 'node:crypto';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { SignJWT, jwtVerify } from 'jose';
import database from './database_connection.js';
import { sessionSecret } from './secrets.js';
import { pull_settings, titleName, coverName, isSetUp } from './settings_actions.js';

const CEREMONY_SECONDS = 5 * 60;
const COOKIE = { add: 'ln-ceremony-add', unlock: 'ln-ceremony-unlock' };

// What a ceremony says when it does not work, for the person holding the
// device. A cancelled Face ID never reaches here: the browser says so first.
const STALE = 'That took too long. Try again.';
const REFUSED = 'That key didn’t work. Try again, or use your password.';
const UNKNOWN = 'This device’s key doesn’t open this journal.';

// ── Where a request is ────────────────────────────────────────────────────
// The origin the device saw, which it signs into its answer, and the address
// its key belongs to. Behind Vercel the forwarded headers carry both; a
// local run is plain http.
export function addressOf(request) {
  const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '')
    .split(',')[0].trim();
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host);
  const proto = (request.headers.get('x-forwarded-proto') || '').split(',')[0].trim()
    || (local ? 'http' : 'https');
  return {
    origin: `${proto}://${host}`,
    rpID: host.replace(/:\d+$/, '').toLowerCase(),
  };
}

// ── The ceremony cookie ───────────────────────────────────────────────────
async function ceremonyKey() {
  const secret = Buffer.from(await sessionSecret());
  return new Uint8Array(createHmac('sha256', secret).update('ln-ceremony').digest());
}

async function seal(kind, challenge, rpID) {
  const token = await new SignJWT({ ceremony: kind, challenge, rpID })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${CEREMONY_SECONDS}s`)
    .sign(await ceremonyKey());
  return {
    name: COOKIE[kind],
    value: token,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api',
      maxAge: CEREMONY_SECONDS,
    },
  };
}

async function unseal(request, kind, rpID) {
  const token = request.cookies.get(COOKIE[kind])?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, await ceremonyKey());
    return payload.ceremony === kind && payload.rpID === rpID ? String(payload.challenge) : null;
  } catch {
    return null;
  }
}

// Sent back once a ceremony has been used, so a challenge answers once.
export function spent(kind) {
  return { name: COOKIE[kind], value: '', options: { path: '/api', maxAge: 0 } };
}

// ── The table ─────────────────────────────────────────────────────────────
// What Settings is told: which device, made where and when, last used when.
// Never the key.
export async function pull_keys() {
  return await database`
    SELECT id, device, made_for, added_at, used_at
    FROM keyring ORDER BY added_at, id`;
}

export async function remove_key(id) {
  await database`DELETE FROM keyring WHERE id = ${id}`;
}

async function credentials() {
  return await database`SELECT credential_id, transports FROM keyring`;
}

async function pull_key(credential_id) {
  const [row] = await database`SELECT * FROM keyring WHERE credential_id = ${credential_id}`;
  return row || null;
}

// What a device is called in Settings, as the browser described itself.
function tidyDevice(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 40) || 'This device';
}

// ── Making a key ──────────────────────────────────────────────────────────
// The options a device needs to make a key for this journal, and the cookie
// holding the challenge. Face ID or its like is asked for: a key anybody
// holding the phone could use would be a weaker door than the password.
// `excludeCredentials` stops a device making a second key it already has.
export async function begin_adding(request) {
  const { rpID } = addressOf(request);
  const settings = await pull_settings();
  // While a copy is being set up nothing is held back: a device making its
  // key again, after a setup that did not finish, replaces the one it made
  // before, and the claim keeps only the key it was made with (keep_only).
  const keys = (await isSetUp()) ? await credentials() : [];
  const options = await generateRegistrationOptions({
    rpName: titleName(settings),
    rpID,
    // What the device files the key under: the journal's address, the same
    // name the password is filed under (hooks/useJournalHost.js). The
    // address is the key's user too, so a key made during setup and one made
    // after are the same person to the device, which replaces rather than
    // stacks them.
    userName: rpID,
    userID: new TextEncoder().encode(rpID),
    userDisplayName: coverName(settings) || rpID,
    attestationType: 'none',
    excludeCredentials: keys.map(k => ({ id: k.credential_id, transports: k.transports || undefined })),
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
  });
  return { options, cookie: await seal('add', options.challenge, rpID) };
}

// ── At the claim, 2026-10-20 ──────────────────────────────────────────────
// A journal can be claimed with a key and no password (Miyel's brief: "a
// new journal is claimed with a passkey and no password"; her pick, Face ID
// first at setup). Whoever reaches a copy before it is claimed can put a key
// on its ring, so the claim keeps only the keys it was made with — the ones
// the claiming browser made a moment before and names — and drops the
// rest. `holds_any` is how a claim without a password proves it has a key.
export async function holds_any(ids) {
  const named = (Array.isArray(ids) ? ids : []).map(String).filter(Boolean);
  if (!named.length) return false;
  const [row] = await database`SELECT count(*)::int AS n FROM keyring WHERE credential_id = ANY(${named})`;
  return row.n > 0;
}

export async function keep_only(ids) {
  const named = (Array.isArray(ids) ? ids : []).map(String).filter(Boolean);
  await database`DELETE FROM keyring WHERE NOT (credential_id = ANY(${named}))`;
}

// The same inside a transaction that is not this handle's (the restore's).
export async function keep_only_within(query, ids) {
  const named = (Array.isArray(ids) ? ids : []).map(String).filter(Boolean);
  await query('DELETE FROM keyring WHERE NOT (credential_id = ANY($1::text[]))', [named]);
}

// The device's answer: checked, and kept. Returns { ok } or { ok, error }.
export async function finish_adding(request, response, device) {
  const { origin, rpID } = addressOf(request);
  const expectedChallenge = await unseal(request, 'add', rpID);
  if (!expectedChallenge) return { ok: false, error: STALE };
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
  } catch {
    return { ok: false, error: 'That key couldn’t be made. Try again.' };
  }
  if (!verification.verified) return { ok: false, error: 'That key couldn’t be made. Try again.' };
  const { credential } = verification.registrationInfo;
  await database`
    INSERT INTO keyring (credential_id, public_key, counter, transports, device, made_for)
    VALUES (
      ${credential.id},
      ${Buffer.from(credential.publicKey).toString('base64url')},
      ${credential.counter || 0},
      ${JSON.stringify(credential.transports || [])}::jsonb,
      ${tidyDevice(device)},
      ${rpID}
    )
    ON CONFLICT (credential_id) DO NOTHING`;
  return { ok: true };
}

// ── Opening the door ──────────────────────────────────────────────────────
// The options for a sign-in, and whether this journal has any keys at all —
// the panel offers Unlock only where there is something to unlock with. No
// list of keys goes out: the device offers whichever of its own keys belong
// to this address, which is what a key made with residentKey allows.
export async function begin_unlocking(request) {
  const { rpID } = addressOf(request);
  const [{ n }] = await database`SELECT count(*)::int AS n FROM keyring`;
  const options = await generateAuthenticationOptions({ rpID, userVerification: 'required' });
  return { options, any: n > 0, cookie: await seal('unlock', options.challenge, rpID) };
}

// The device's answer, checked against the key it names. Returns { ok }, or
// { ok: false, error } — with `unknown` when the key is not on the ring, so
// the browser can stop offering one tap with it.
export async function finish_unlocking(request, response) {
  const { origin, rpID } = addressOf(request);
  const expectedChallenge = await unseal(request, 'unlock', rpID);
  if (!expectedChallenge) return { ok: false, error: STALE };
  const key = await pull_key(String(response?.id || ''));
  if (!key) return { ok: false, unknown: true, error: UNKNOWN };
  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: key.credential_id,
        publicKey: new Uint8Array(Buffer.from(key.public_key, 'base64url')),
        counter: Number(key.counter) || 0,
        transports: key.transports || undefined,
      },
      requireUserVerification: true,
    });
  } catch {
    return { ok: false, error: REFUSED };
  }
  if (!verification.verified) return { ok: false, error: REFUSED };
  await database`
    UPDATE keyring
    SET counter = ${verification.authenticationInfo.newCounter}, used_at = now()
    WHERE credential_id = ${key.credential_id}`;
  return { ok: true };
}
