// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/auth/login/route.js
// The front desk. Checks the password; if correct, stamps a wristband
// and sends the visitor in wearing it (HttpOnly cookie).
//
// ── Three things open this door ───────────────────────────────────────────
// The password the owner chose on the site, as a hash in the vault. Failing
// that, SESSION_PASSWORD from the environment, which is how every copy was
// locked before setup asked. And on a copy nobody has claimed yet — no hash,
// no variable — the claim code printed in the build log, once, so that the
// person who deployed it is the person who sets its password. The moment the
// copy is claimed the code is cleared and stops being an answer.

import { NextResponse } from 'next/server';
import { issueWristband, WRISTBAND_COOKIE } from '@/library/wristband';
import { mayKnock, forgetKnocks, tooSoon, whoIsKnocking } from '@/library/doorman';
import { isSetUp } from '@/library/settings_actions';
import { pull_secrets, verifyPassword, claimCodeMatches } from '@/library/secrets';
import { timingSafeEqual } from 'node:crypto';

// Compares in constant time, so the answer takes as long for a password that
// is wrong in the first character as for one wrong in the last. A plain !==
// returns early on the first difference, which in principle leaks the password
// one character at a time. Over the public internet the jitter buries it and
// this is close to theatre — but it is two lines, and the delay below is
// theatre too if the comparison above it gives the game away.
function sameSecret(given, actual) {
  const a = Buffer.from(String(given));
  const b = Buffer.from(String(actual));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function opens(password) {
  const { password_hash } = await pull_secrets();
  if (password_hash) return await verifyPassword(password, password_hash);
  if (process.env.SESSION_PASSWORD) return sameSecret(password, process.env.SESSION_PASSWORD);
  // No password of any kind. Only an unclaimed copy is in this state, and
  // only its claim code gets through. isSetUp does not catch, and here that
  // is right: if the question cannot be answered, nobody gets in.
  if (await isSetUp()) return false;
  return await claimCodeMatches(password);
}

export async function POST(request) {
  try {
    // Before anything else, including reading the body. There is one password
    // and no username here, so the only thing standing between a stranger and
    // the writing side is how many guesses they get — and until this existed
    // the answer was as many as their machine could manage. Five a minute
    // turns centuries-to-crack into centuries-to-crack; without it a strong
    // password is worth an afternoon.
    const caller = whoIsKnocking(request);
    const knock = mayKnock('login', caller);
    if (!knock.allowed) return tooSoon(knock.retryAfter);

    const { password } = await request.json();

    if (!password || !(await opens(password))) {
      // Small delay makes brute-force slow without bothering a real human
      await new Promise(r => setTimeout(r, 400));
      return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
    }

    // Somebody who mistyped four times and then got it right should not still
    // be counted against on their next device.
    forgetKnocks('login', caller);

    const token = await issueWristband();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(WRISTBAND_COOKIE.name, token, WRISTBAND_COOKIE.options);
    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
