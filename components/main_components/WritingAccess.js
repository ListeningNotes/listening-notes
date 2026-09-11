// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/WritingAccess.js
// The lock at the foot of the pitch pane: a small key, and behind it the
// password field, opened in place.
//
// ── What is behind this door ──────────────────────────────────────────────
// Not an identity. There is one owner, nobody else has an account, and there
// is nothing to sign up for. Logging in on somebody else's copy does nothing
// whatsoever: every copy has exactly one password and it is its keeper's.
//
// ── Why a key and not a page, 2026-09-10 ──────────────────────────────────
// The line here used to say "Sign in" and go to Settings, which — signed out —
// is a whole screen: the keeper's name, SIGN IN, the journal's address, a
// password box. On somebody else's journal that reads as being asked to log
// into something. A diary with a lock on it reads differently: if you have
// the key you can write, and if you do not, nothing happened. So the control
// is a key, and pressing it opens the field under it with the pane still
// behind — no page, no heading, no address over the box. That is the rule in
// DECISIONS about a control opening where it belongs, applied to the lock.
//
// Two things the field still has to be, and PasswordGate is where they live:
// a real form with a real submit and autocomplete="current-password", and a
// visible, writable username field carrying the journal's host, because a
// password manager files an entry under a name and Safari skips fields it
// considers hidden. `bare` is that markup with nothing around it, and it is
// the one copy of it — a second copy is how the first one drifted.
//
// /login stays as the same door at an address. A way in that only exists as
// a control on a pane cannot be linked, bookmarked, or reached when it breaks
// on a device nobody tested.
//
// ── What this used to be ──────────────────────────────────────────────────
// Three taps on the mark, turning it into a password panel in place on the
// cross; then, for an afternoon, three taps that went to Settings; then the
// Sign in line, 2026-09-02, on the keeper's call — a login form does not
// belong on the beacon page, and a mark that is secretly a door is a mark
// somebody opens by accident. The way in is the right pane and nothing else.

'use client';

import { useEffect, useState } from 'react';
import { Key } from '@phosphor-icons/react';
import PasswordGate from '../session_components/PasswordGate';

export default function WritingAccess({ onSignedIn }) {
  const [open, setOpen] = useState(false);

  // Escape closes it, the way it closes everything else that opened on a
  // press. A tap outside does not: a form in the page keeps what was typed.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = event => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="pt-lock">
      <button
        type="button"
        className={'pt-key' + (open ? ' pt-key--open' : '')}
        onClick={() => setOpen(was => !was)}
        aria-label={open ? 'Close the sign-in' : 'Sign in'}
        aria-expanded={open}
        title="Sign in"
      >
        <Key size={18} aria-hidden="true" />
      </button>
      {open && (
        <div className="pt-lock-field">
          <PasswordGate
            bare
            autoFocus
            onAuth={() => { setOpen(false); onSignedIn?.(); }}
          />
        </div>
      )}
    </div>
  );
}
