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

      {/* ── It pushes rather than covers ──────────────────────────────────
          The panel is in the flow, not floating over it. Opening it makes the
          box it sits in taller and everything below moves down ahead of it —
          on the beacon pane the album strip slides toward the bottom and off,
          which is the right thing to lose while you are typing a password.
          Nothing is hidden behind the panel, because nothing is behind it.

          The animation is a grid whose single row goes from 0fr to 1fr. That
          is the one way to transition to a height nobody knows in advance:
          height: auto cannot be animated, and a fixed pixel height would have
          to be guessed and would be wrong the moment the panel says something
          longer, like the doorman's wait message. */}
      <span
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.32s cubic-bezier(0.22,0.61,0.36,1)',
          width: open ? 260 : 0,
        }}
        aria-hidden={!open}
      >
      <span style={{ overflow: 'hidden', minHeight: 0 }}>
      {open && (
        <span
          role="dialog"
          aria-label="Writing access"
          style={{
            display: 'block',
            marginTop: 10,
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
      </span>
    </span>
  );
}
