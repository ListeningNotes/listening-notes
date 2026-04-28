// app/api/auth/check/route.js
// Peeks at the wristband. Used by session pages on mount to ask
// "am I still wearing a valid wristband?" before deciding whether to
// show the password gate. The cookie is the source of truth — not localStorage.

import { NextResponse } from 'next/server';
import { checkWristband } from '@/library/wristband';

export async function GET(request) {
  const authed = await checkWristband(request);
  return NextResponse.json({ authed });
}
