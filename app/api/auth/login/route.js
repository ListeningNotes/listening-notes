// app/api/auth/login/route.js
// The front desk. Checks the password; if correct, stamps a wristband
// and sends the visitor in wearing it (HttpOnly cookie).

import { NextResponse } from 'next/server';
import { issueWristband, WRISTBAND_COOKIE } from '@/library/wristband';

export async function POST(request) {
  try {
    const { password } = await request.json();

    if (!process.env.SESSION_PASSWORD) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    if (!password || password !== process.env.SESSION_PASSWORD) {
      // Small delay makes brute-force slow without bothering a real human
      await new Promise(r => setTimeout(r, 400));
      return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
    }

    const token = await issueWristband();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(WRISTBAND_COOKIE.name, token, WRISTBAND_COOKIE.options);
    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
