// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/login/page.js
// The door, at an address.
//
// ── Why this exists when nobody needs to type it ──────────────────────────
// The way in is five taps on the mark, and the way in after that is a
// password manager filling a form it has seen before. Neither of those wants
// a URL. But a login that lives only inside a gesture is a login that cannot
// be linked to, cannot be bookmarked by somebody who prefers to, and cannot be
// reached at all if the gesture ever breaks on a device nobody tested.
//
// It also takes the job off /dashboard, which had become the de facto login
// route by being the page that happened to show the gate. That is the wrong
// shape: the dashboard is a place you go once you are in, and it was standing
// in for the door because there was no door.
//
// ── Why it is not findable ────────────────────────────────────────────────
// A normal login has to be discoverable, because strangers need to sign in.
// Nobody signs in here but the keeper, and logging in on somebody else's copy
// does nothing at all — every copy checks its own password on its own server.
// So the address exists and nothing links to it prominently. Hiding a door
// adds no security and this one is honest about that: the lock is what
// matters and the lock is unchanged. It costs nothing either, which is the
// whole argument.
//
// On success it goes home rather than to the dashboard. Somebody who arrived
// here on purpose was already on their way somewhere, and the cross is one
// swipe from everything.

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PasswordGate from '../../components/session_components/PasswordGate';

export default function LoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // Already wearing a wristband: there is nothing to do here, and a login
  // screen shown to somebody who is logged in reads as having been signed out.
  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.json())
      .then(d => { if (d.authed) router.replace('/'); else setChecking(false); })
      .catch(() => setChecking(false));
  }, [router]);

  if (checking) return <div style={{ minHeight: '100vh', background: '#f5f3ef' }} />;

  return <PasswordGate onAuth={() => router.replace('/')} />;
}
