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
// ── The mark becomes the panel ────────────────────────────────────────────
// Not a box over the page and not a box shoved between the mark and the page:
// the mark's own place turns into the password, the way pressing the portrait
// on the About card turns it into the scannable code. Same idea, and it is the
// idea because it answers the question a floating panel could not — what does
// it cover, and what moves to make room. Nothing covers anything. The mark is
// simply not there while you are signing in, and it comes back when you are
// done.
//
// The panel is taller than the mark, so the crown grows by the difference and
// the pane's contents move down ahead of it. On the beacon that is the album
// art and the recent strip sliding toward the bottom, which is the right thing
// to give up while typing a password.
//
// Getting back is the badge on the corner, which is also the card's answer —
// the portrait has one to turn it back and so does this. Three taps cannot do
// it, because once the mark has gone there is nothing left to tap.
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
import { X } from '@phosphor-icons/react';
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

  // ── Closing it ────────────────────────────────────────────────────────
  // The same three taps, which is the whole gesture rather than a second one
  // to learn: what opened it closes it, and the mark stays the only control.
  //
  // Pressing elsewhere on the page deliberately does NOT close it. That is the
  // usual behaviour for something floating over a page, and it is wrong for
  // something sitting in the page with a half-typed password in it — a stray
  // tap while reaching for the field would throw the typing away, and this
  // panel does not cover anything that would make somebody want it gone in a
  // hurry. Escape still works for anyone with a keyboard.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = e => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  function countTap() {
    const now = Date.now();
    const r = run.current;
    r.count = now - r.last > TAP_WINDOW_MS ? 1 : r.count + 1;
    r.last = now;
    if (r.count >= taps) {
      r.count = 0;
      setOpen(v => !v);
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
    <span ref={wrap} className={className} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {children
        ? (
          <span
            onPointerDown={open ? undefined : countTap}
            style={{
              display: open ? 'none' : 'inline-flex',
              animation: 'wa-face 0.26s ease',
            }}
          >{children}</span>
        )
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
            display: 'block',
            position: 'relative',
            width: 260,
            animation: 'wa-face 0.26s ease',
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

          {/* The way back, and the card's own answer to the same question:
              the portrait has a badge to turn it into the code and another to
              turn it back. Three taps cannot close this, because once the mark
              has given up its place there is nothing left to tap. */}
          <button
            type="button"
            onClick={close}
            aria-label="Put the mark back"
            style={{
              position: 'absolute', top: -9, right: -9,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 24, height: 24, borderRadius: '50%',
              background: 'var(--bg)', border: '1px solid var(--border)',
              color: 'var(--ink-faint)', cursor: 'pointer', padding: 0,
              boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
            }}
          >
            <X size={11} weight="bold" aria-hidden="true" />
          </button>
        </span>
      )}
    </span>
  );
}
