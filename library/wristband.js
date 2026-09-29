// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/wristband.js
// Issues and verifies "wristbands" (signed JWTs) that let the user into
// protected areas of the site. The wax seal is made from SESSION_SECRET —
// the house's unique stamp. HttpOnly cookie means JS can't read it, which
// protects against XSS token theft.

import { SignJWT, jwtVerify } from 'jose';
import { sessionSecret } from './secrets.js';

const COOKIE_NAME = 'ln_session';

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

// Stamps a fresh wristband. Returns the signed token string.
export async function issueWristband() {
  return await new SignJWT({ authed: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(await getSecret());
}

// Returns the wristband's contents if the wax seal holds, or null. Callers that
// only want a yes/no should use checkWristband below — this one exists because
// renewal needs to know how old the band is, which a boolean throws away.
export async function readWristband(request) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, await getSecret());
    return payload;
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
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, await getSecret());
    return true;
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

// Cookie config used by /api/auth/login and /api/auth/logout.
export const WRISTBAND_COOKIE = {
  name: COOKIE_NAME,
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: LIFETIME_SECONDS,
  },
};
