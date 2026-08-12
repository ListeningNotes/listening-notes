// library/wristband.js
// Issues and verifies "wristbands" (signed JWTs) that let the user into
// protected areas of the site. The wax seal is made from SESSION_SECRET —
// the house's unique stamp. HttpOnly cookie means JS can't read it, which
// protects against XSS token theft.

import { SignJWT, jwtVerify } from 'jose';

const COOKIE_NAME = 'ln_session';
const EXPIRES_IN = '30d';

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set in .env.local');
  return new TextEncoder().encode(secret);
}

// Stamps a fresh wristband. Returns the signed token string.
export async function issueWristband() {
  return await new SignJWT({ authed: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(getSecret());
}

// Returns true if the request carries a wristband with a valid wax seal.
export async function checkWristband(request) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
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

// ── RECEIPTS ────────────────────────────────────────────────────────────────
// A receipt is proof you wrote a particular comment. It is stamped with the
// same wax as a wristband, handed back when the comment is posted, and kept in
// the writer's own browser. Sending it back is what lets someone see their own
// comment sitting in the thread while it waits to be read — and only their own.
//
// It has to be signed rather than just being the comment's id, because the ids
// are sequential: anyone could walk 1, 2, 3… and read every held comment on the
// site, including a troll checking whether theirs survived. A forged receipt
// fails the seal.
//
// Note this is a much weaker claim than a wristband — it says "I wrote comment
// 41", not "I am the owner" — so it never opens anything but that one comment.

const RECEIPT_EXPIRES_IN = '90d';

export async function issue_receipt(comment_id) {
  return await new SignJWT({ cid: comment_id })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(RECEIPT_EXPIRES_IN)
    .sign(getSecret());
}

// Returns the comment id a receipt vouches for, or null if the seal is broken,
// expired, or the thing isn't a receipt at all. Never throws — a bad receipt in
// a list of good ones should be skipped, not take the whole request down.
export async function verify_receipt(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return Number.isInteger(payload.cid) ? payload.cid : null;
  } catch {
    return null;
  }
}

// Cookie config used by /api/auth/login and /api/auth/logout.
export const WRISTBAND_COOKIE = {
  name: COOKIE_NAME,
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days, matches EXPIRES_IN
  },
};
