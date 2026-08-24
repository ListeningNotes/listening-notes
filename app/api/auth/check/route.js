// app/api/auth/check/route.js
// Peeks at the wristband. Used by writing pages on mount to ask "am I still
// wearing a valid one?" before deciding whether to show the password gate.
// The cookie is the source of truth — not localStorage.
//
// It also quietly renews. Every visit that finds a valid but ageing wristband
// gets a fresh one back, so a journal in regular use never expires. That
// matters more than it looks: the site can be installed to a home screen, where
// there is no address bar to type /login into, so an expired cookie would mean
// being locked out of your own journal with no visible way back in.

import { NextResponse } from 'next/server';
import { readWristband, shouldRenewWristband, issueWristband, WRISTBAND_COOKIE } from '@/library/wristband';

export async function GET(request) {
  const wristband = await readWristband(request);
  if (!wristband) return NextResponse.json({ authed: false });

  const response = NextResponse.json({ authed: true });

  // Only past a third of its life, so this isn't signing a token and setting a
  // cookie on every single page load.
  if (shouldRenewWristband(wristband)) {
    response.cookies.set(WRISTBAND_COOKIE.name, await issueWristband(), WRISTBAND_COOKIE.options);
  }

  return response;
}
