// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/wristband.js
// Issues and verifies "wristbands" (signed JWTs) that let the user into
// protected areas of the site. The wax seal is made from SESSION_SECRET —
// the house's unique stamp. HttpOnly cookie means JS can't read it, which
// protects against XSS token theft.

import { SignJWT, jwtVerify } from 'jose';
import { sessionSecret } from './secrets.js';
import { hosting } from './hosting_directory.js';

// ── Locked to this address, 2026-10-20 ────────────────────────────────────
// In production the band is `__Host-ln_session`. A browser keeps a cookie
// with that prefix only when it was set by this exact address, over https,
// for the whole site and for no wider domain — so no other journal under the
// same domain, and no page anywhere but this one, can plant one or replace
// it (Miyel's pick, learned from Tumblr, whose blogs could steal visitors'
// cookies). A plain-http dev server cannot hold one, so there it stays
// `ln_session`. A copy that serves one journal still reads a band under the
// old name, so nobody is signed out by the change, and the next check moves
// it to the new one (app/api/auth/check).
const LOCKED = '__Host-ln_session';
const PLAIN = 'ln_session';
const SECURE = process.env.NODE_ENV === 'production';
const COOKIE_NAME = SECURE ? LOCKED : PLAIN;

function tokenIn(jar) {
  const band = jar.get(COOKIE_NAME)?.value;
  if (band) return band;
  return COOKIE_NAME !== PLAIN && !hosting() ? jar.get(PLAIN)?.value : undefined;
}

// Whether the band a request wears is still under the old name — to be moved.
export function wornUnderOldName(request) {
  return COOKIE_NAME !== PLAIN && !request.cookies.get(COOKIE_NAME)?.value && Boolean(request.cookies.get(PLAIN)?.value);
}

// ── Only from its own pages, 2026-10-20 ───────────────────────────────────
// Every browser marks a request with where it came from (Sec-Fetch-Site).
// On a deployment that hosts journals, every other journal's page counts as
// the same site as this one — near enough that a signed-in keeper's browser
// would carry this journal's wristband on a request another journal's page
// made. So a band is only read off a request from this journal's own pages
// or the address bar, and a button pressed anywhere else opens nothing
// (Miyel's pick, learned from Tumblr). A browser that does not say falls
// back to Origin; a request with neither is not a browser, and so is not
// carrying anybody's wristband.
export function fromItsOwnPages(request) {
  const site = request.headers.get('sec-fetch-site');
  if (site) return site === 'same-origin' || site === 'none';
  const origin = request.headers.get('origin');
  if (!origin) return true;
  const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').split(',')[0].trim().toLowerCase();
  try {
    return new URL(origin).host.toLowerCase() === host;
  } catch {
    return false;
  }
}

// One number, two places to spend it. The token's own expiry and the cookie's
// maxAge have to agree, and they were written separately as '30d' and
// 60*60*24*30 — the same value twice, which is the shape a drift bug takes
// right before someone edits one of them.
// Six months. This is a lock on one person's own room in their own building,
// not a session on a service with many users — the thing being protected is
// the writing side of a journal, and the person opening it is always the same
// person on the same two or three devices. Thirty days meant logging in every
// month for no gain; half a year means a new phone or a cleared Safari, which
// is about twice.
//
// The trade is stated rather than hidden: an unlocked phone is dashboard
// access. That is accepted. Anybody holding an unlocked phone has the mail app
// on it too, and a login that has to be repeated monthly is a login that gets
// a weaker password.
const LIFETIME_SECONDS = 60 * 60 * 24 * 180;   // 6 months
const EXPIRES_IN = `${LIFETIME_SECONDS}s`;

// A wristband is renewed rather than left to run out. Without this, a cookie
// issued today stops working in thirty days no matter how much the site is
// used — and on a home screen there is no address bar to go and sign in again
// with, so expiry means locked out of your own journal with no visible door.
//
// Renewing on *every* check would sign a token and set a cookie on every page
// load, so it waits until a third of the life has gone. In practice a journal
// touched more than once a month never expires, and one abandoned for a month
// asks again — which is the right way round.
const RENEW_AFTER_SECONDS = LIFETIME_SECONDS / 3;   // 60 days

// The wax itself comes from the vault — SESSION_SECRET if the environment has
// one, otherwise a key the copy minted for itself on first start and keeps in
// its own database. See sessionSecret in library/secrets.js. Async because the
// first call may have to read or mint it; every caller here already awaits.
async function getSecret() {
  return await sessionSecret();
}

// ── Proved just now, 2026-10-20 ───────────────────────────────────────────
// A band says when its wearer last proved they were the keeper — with the
// password, Face ID, the spare key or the claim — as `proved`, a second. The
// changes that make or take away a way in ask for that to be recent
// (requireRecentProof): a phone left signed in, in somebody else's hand, can
// read and write as ever, but cannot make itself a way in that outlasts the
// keeper taking the phone back (Miyel, 2026-10-20: "it's so easy to change
// the password"). Renewing a band proves nothing, so a renewed band carries
// the old `proved` along (app/api/auth/check). Five minutes, Miyel's pick.
export const PROOF_SECONDS = 5 * 60;

// Stamps a fresh wristband. Returns the signed token string. `proved` is
// true where the request that asked for it was itself a proof, or the second
// an older band's proof was made, to carry along.
export async function issueWristband({ proved = null } = {}) {
  const claims = { authed: true };
  if (proved === true) claims.proved = Math.floor(Date.now() / 1000);
  else if (Number.isFinite(proved)) claims.proved = proved;
  return await new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(await getSecret());
}

// How many seconds of a band's proof are left, 0 when none.
export function proofLeft(band) {
  if (!Number.isFinite(band?.proved)) return 0;
  return Math.max(0, band.proved + PROOF_SECONDS - Math.floor(Date.now() / 1000));
}

// Returns the wristband's contents if the wax seal holds, or null. Callers that
// only want a yes/no should use checkWristband below — this one exists because
// renewal needs to know how old the band is, which a boolean throws away.
//
// ── A wristband says it is one, 2026-10-20 ──
// The seal alone is not enough: anything signed with this key would pass,
// and once a second token existed — a passkey ceremony's, signed on the way
// to a sign-in that anybody may start — one could be worn as the other. So
// a band is a token that holds `authed: true`, which every band issued here
// always has (issueWristband), and nothing else is. Every other token is
// signed with a key of its own as well (library/keyring.js).
export async function readWristband(request) {
  if (!fromItsOwnPages(request)) return null;
  const token = tokenIn(request.cookies);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, await getSecret());
    return payload?.authed === true ? payload : null;
  } catch {
    return null;
  }
}

// Returns true if the request carries a wristband with a valid wax seal.
export async function checkWristband(request) {
  return (await readWristband(request)) !== null;
}

// The same question, asked by a page instead of by a route.
//
// checkWristband takes a request, which is what an API route is handed and
// what a server component never sees. This reaches for the cookie jar itself.
//
// It exists so that owner-only controls can be decided on the server and left
// out of the HTML entirely, rather than shipped to everybody and hidden with a
// class. Hiding is not withholding: a stranger reading the source of a page
// that hides its edit button can still see the button, and can see what it was
// going to call. Neither of those is a way in — every writing endpoint checks
// the wristband for itself, and always did — but a door drawn on a wall
// invites people to push it, and there is no reason to draw one.
export async function wristbandOnHand() {
  const { cookies } = await import('next/headers');
  const jar = await cookies();
  const token = tokenIn(jar);
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, await getSecret());
    return payload?.authed === true;
  } catch {
    return false;
  }
}

// Whether a valid wristband is old enough to be worth replacing. `iat` is the
// second it was issued, set by setIssuedAt when it was stamped.
export function shouldRenewWristband(payload) {
  if (!payload?.iat) return true;   // no issue time to judge by — replace it
  return Math.floor(Date.now() / 1000) - payload.iat > RENEW_AFTER_SECONDS;
}

// Door-guard for protected routes. Returns null if the wristband is valid
// (route continues), or a 401 Response if missing/forged (route short-circuits).
//
// Usage in a route:
//   const blocked = await requireWristband(request);
//   if (blocked) return blocked;
export async function requireWristband(request) {
  if (await checkWristband(request)) return null;
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}

// The same guard for a change to the ways in, which also wants the band's
// proof to be recent: a 403 with `prove` tells the page to ask for Face ID or
// the password first (Keyring.js). `exempt` is for a journal still being set
// up, whose keeper proved it with the claim and may take longer than the
// window over the name, the photo and the prompts before reaching the keys.
// The words are Miyel's (2026-10-20).
export async function requireRecentProof(request, { exempt = false } = {}) {
  const band = await readWristband(request);
  if (!band) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (exempt || proofLeft(band) > 0) return null;
  return Response.json({ error: 'Confirm it’s you first.', prove: true }, { status: 403 });
}

// Cookie config used by /api/auth/login and /api/auth/logout.
export const WRISTBAND_COOKIE = {
  name: COOKIE_NAME,
  options: {
    httpOnly: true,
    secure: SECURE,
    sameSite: 'lax',
    path: '/',
    maxAge: LIFETIME_SECONDS,
  },
};

// The old name, for clearing once a band has moved (or on signing out).
export const OLD_WRISTBAND_COOKIE = COOKIE_NAME === PLAIN ? null : { name: PLAIN, options: { path: '/', maxAge: 0 } };
