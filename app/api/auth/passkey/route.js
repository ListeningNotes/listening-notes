// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/auth/passkey/route.js
// Opening the door with a passkey: Face ID, Touch ID, a phone's fingerprint.
//
// GET hands the device a challenge, and says whether this journal has any
// keys at all, so the lock offers Unlock only where there is something to
// unlock with — whether a spare key is waiting, so it offers *use your
// spare key* only where one is, and whether there is a password at all,
// which a journal claimed with Face ID has not. POST is the device's signed answer; when library/keyring.js
// says it holds, the visitor leaves wearing the same wristband the password
// gives (app/api/auth/login), and nothing past the door knows the
// difference. Counted by the doorman's login door like a password, because
// it is the same door.

import { NextResponse } from 'next/server';
import { begin_unlocking, finish_unlocking, spent } from '@/library/keyring';
import { issueWristband, WRISTBAND_COOKIE } from '@/library/wristband';
import { mayKnock, forgetKnocks, tooSoon, whoIsKnocking } from '@/library/doorman';
import { spareKeyState, passwordSource } from '@/library/secrets';

export async function GET(request) {
  try {
    const { options, any, cookie } = await begin_unlocking(request);
    const { ready: spare } = await spareKeyState();
    const password = Boolean(await passwordSource());
    const response = NextResponse.json({ options, any, spare, password }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch {
    return NextResponse.json({ error: 'The lock could not be asked just now. Try again.' }, { status: 500 });
  }
}

export async function POST(request) {
  const caller = whoIsKnocking(request);
  const knock = await mayKnock('login', caller);
  if (!knock.allowed) return tooSoon(knock.retryAfter);
  try {
    const body = await request.json().catch(() => ({}));
    const done = await finish_unlocking(request, body?.response);
    if (!done.ok) {
      await new Promise(r => setTimeout(r, 400));
      return NextResponse.json({ error: done.error, unknown: Boolean(done.unknown) }, { status: 401 });
    }
    await forgetKnocks('login', caller);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(WRISTBAND_COOKIE.name, await issueWristband(), WRISTBAND_COOKIE.options);
    const used = spent('unlock');
    response.cookies.set(used.name, used.value, used.options);
    return response;
  } catch {
    return NextResponse.json({ error: 'The lock could not be opened just now. Try again.' }, { status: 500 });
  }
}
