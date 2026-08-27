// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/auth/logout/route.js
// Cuts the wristband off. The cookie is overwritten with an empty value
// and maxAge=0, which tells the browser to delete it immediately.

import { NextResponse } from 'next/server';
import { WRISTBAND_COOKIE } from '@/library/wristband';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(WRISTBAND_COOKIE.name, '', {
    ...WRISTBAND_COOKIE.options,
    maxAge: 0,
  });
  return response;
}
