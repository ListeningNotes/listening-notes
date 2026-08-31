// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/WritingAccess.js
// The way in, where you pressed.
//
// ── What is behind this door ──────────────────────────────────────────────
// Not an identity. There is one owner, nobody else has an account, and there
// is nothing to be but yourself here — so this is a yes/no ownership check,
// a key to a locked room in a building anyone may walk into. The journal is
// the public floor. This is the room where the writing happens, which is why
// the panel says writing access rather than sign in or log in.
//
// Logging in on somebody else's copy does nothing whatsoever: every copy
// checks its own password against its own server. Every house has its own
// lock, and there is no shared system to be let into.
//
// ── Which is why the entrance can be hidden ───────────────────────────────
// An ordinary login has to be findable, because strangers need it. Nobody
// needs this one but the keeper, so three taps on the mark is enough of a
// door — no route to remember, present wherever the mark is, and costing the
// page nothing to look at.
//
// Hiding it adds no security and this file should be honest about that: the
// lock is what protects the room, the lock is unchanged, and anybody who finds
// the panel still faces the same password and now a doorman counting their
// guesses. What hiding it costs is also nothing, which is the whole argument
// for it.
//
// ── Where the taps work, and where they do not ────────────────────────────
// On the homepage the mark already swallows its own click — it re-centres the
// cross rather than navigating — so counting taps there is free and three of
// them do nothing visible until the third.
//
// Everywhere else the mark is a real link home, and taking that away to count
// taps would break the one thing it is for. So on those pages the first tap
// takes you home, where the gesture then works. That is a fair trade for a
// door only one person ever opens, and the visible fallback exists for the
// times it is not: a quiet line at the foot of the About pane.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import PasswordGate from '../session_components/PasswordGate';

// Three, and they have to be deliberate. Far enough apart that a double-tap
// to zoom is not mistaken for it, close enough that it cannot be reached by
// pressing the mark three times over a minute of ordinary use.
const TAPS_WANTED = 3;
const TAP_WINDOW_MS = 700;

export default function WritingAccess({
  children,
  taps = TAPS_WANTED,
  label = 'Sign in',
  align = 'center',
  className = '',
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const run = useRef({ count: 0, last: 0 });

  const close = useCallback(() => setOpen(false), []);

  // Escape, and pressing anywhere else. Both are what a small panel over a
  // page is expected to answer to, and neither needs explaining.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = e => { if (e.key === 'Escape') close(); };
    const onDown = e => { if (wrap.current && !wrap.current.contains(e.target)) close(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [open, close]);

  function countTap() {
    if (open) return;
    const now = Date.now();
    const r = run.current;
    r.count = now - r.last > TAP_WINDOW_MS ? 1 : r.count + 1;
    r.last = now;
    if (r.count >= taps) {
      r.count = 0;
      setOpen(true);
    }
  }

  // Once in, the page has to be told: the owner's tools are rendered on the
  // server from the cookie, so a refresh is what makes the pencil appear
  // rather than a reload the reader would notice.
  function admitted() {
    setOpen(false);
    router.refresh();
  }

  return (
    <span ref={wrap} className={className} style={{ position: 'relative', display: 'inline-flex' }}>
      {children
        ? <span onPointerDown={countTap} style={{ display: 'inline-flex' }}>{children}</span>
        : (
          // No children means this is the visible way in — the line at the
          // foot of the About pane. One press, because a fallback nobody can
          // find is not a fallback.
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em',
              color: 'var(--ink-faint)', textDecoration: 'none',
              borderBottom: '1px solid var(--border)',
            }}
          >{label}</button>
        )}

      {open && (
        <span
          role="dialog"
          aria-label="Writing access"
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            left: align === 'center' ? '50%' : 'auto',
            right: align === 'right' ? 0 : 'auto',
            transform: align === 'center' ? 'translateX(-50%)' : 'none',
            zIndex: 300,
            width: 260,
            padding: 16,
            borderRadius: 14,
            background: 'var(--panel-strong, #fff)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--panel-border, rgba(0,0,0,0.08))',
            boxShadow: '0 12px 44px rgba(0,0,0,0.16)',
            textAlign: 'center',
            // The panel is a lid over the page, and the page underneath is
            // still a scrolling journal. Nothing here should pass a gesture on.
            overscrollBehavior: 'contain',
          }}
        >
          <span style={{
            display: 'block',
            fontFamily: 'var(--font-label)', fontSize: 9,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'var(--ink-faint)', marginBottom: 12,
          }}>writing access</span>
          <PasswordGate bare onAuth={admitted} />
        </span>
      )}
    </span>
  );
}
