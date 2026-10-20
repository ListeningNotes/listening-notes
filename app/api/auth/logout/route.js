// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/auth/logout/route.js
// Cuts the wristband off. The cookie is overwritten with an empty value
// and maxAge=0, which tells the browser to delete it immediately.

import { NextResponse } from 'next/server';
import { WRISTBAND_COOKIE, OLD_WRISTBAND_COOKIE, fromItsOwnPages } from '@/library/wristband';

// Only from this journal's own pages, like every press that changes
// something (library/wristband.js): otherwise another journal's page could
// sign its keeper out of this one.
export async function POST(request) {
  if (!fromItsOwnPages(request)) return NextResponse.json({ error: 'Not from here.' }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(WRISTBAND_COOKIE.name, '', {
    ...WRISTBAND_COOKIE.options,
    maxAge: 0,
  });
  // And a band still under the old name, so signing out signs out.
  if (OLD_WRISTBAND_COOKIE) response.cookies.set(OLD_WRISTBAND_COOKIE.name, '', OLD_WRISTBAND_COOKIE.options);
  return response;
}
