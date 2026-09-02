// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/WritingAccess.js
// The sign-in line at the foot of the pitch pane. It goes to Settings, which
// asks for the password if you are not already wearing a wristband.
//
// ── What is behind this door ──────────────────────────────────────────────
// Not an identity. There is one owner, nobody else has an account, and there
// is nothing to sign up for. Logging in on somebody else's copy does nothing
// whatsoever: every copy has exactly one password and it is its keeper's.
//
// ── What this used to be ──────────────────────────────────────────────────
// Three taps on the mark, turning it into a password panel in place on the
// cross; then, for an afternoon, three taps that went to Settings. Both are
// gone, 2026-09-02, on the keeper's call: a login form does not belong on
// the beacon page, and a mark that is secretly a door is a mark somebody
// opens by accident. The way in is the right pane and nothing else — this
// line when you are out, the desk when you are in.

'use client';

import { useRouter } from 'next/navigation';

export default function WritingAccess({ label = 'Sign in', className = '' }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push('/settings')}
      className={className}
      style={{
        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em',
        color: 'var(--ink-faint)', textDecoration: 'none',
        borderBottom: '1px solid var(--border)',
      }}
    >{label}</button>
  );
}
