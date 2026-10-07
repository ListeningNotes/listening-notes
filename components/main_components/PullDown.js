// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';

// components/main_components/PullDown.js
// Pull down to ask for fresh news.
//
// From Miyel's friends-room brief, 2026-10-06, with the Franklin behind it:
// if waiting is the only way to get fresh news, every screen has to poll
// fast on the off-chance; if a person can always demand *now*, every screen
// can poll slowly and hand control to whoever cares in the moment. This is
// what buys the friends' sixty-second tier.
//
// ── The gesture ───────────────────────────────────────────────────────────
// At the top of a scroller, a finger (or a mouse) dragged down past a
// generous threshold shows a dot and a line — Pull down, then Let go to
// refresh — and letting go asks, with the line saying what is being asked:
// Asking everyone… on Friends, because that is literally what happens, and
// Checking… elsewhere. On a phone that has asked for less motion the line
// does not follow the finger; it simply appears, and the release asks.
//
// It is a fifth downward drag on a site that already has four (the layer's
// pull to close, the sheets' pulls, the cold session's pull to leave, the
// two-floor carry), and it yields to all of them: it does nothing while a
// sheet is over the page (.ln-locked on the root), while something is
// being typed into, while the picker is up, from inside the band of cards,
// or anywhere but the top of the scroller it is given. The pane's own
// overscroll-behavior: contain is what keeps the browser's pull-to-refresh
// out of the way, so this one never fights it.
//
// `scroller` is a ref to the element that scrolls; `onPull` is what asking
// means there and may return a promise; `asking` is the line while it does.

import { useEffect, useRef, useState } from 'react';

// How far the line has to travel before letting go asks. Generous, so an
// ordinary scroll that happens to begin at the top never asks by accident;
// the finger travels about twice this, since the line follows it at half
// speed.
const FAR_ENOUGH = 72;
// How long the asking line stays even when the answer is instant, so the
// press is seen to have done something.
const SEEN_MS = 600;

const WORDS = { idle: '', pulling: 'Pull down', release: 'Let go to refresh', asking: '' };

export default function PullDown({ scroller, onPull, asking = 'Checking…' }) {
  const [phase, setPhase] = useState('idle');
  const [pull, setPull] = useState(0);
  const drag = useRef(null);
  const busy = useRef(false);
  // What asking means, kept current without re-wiring the listeners each
  // time the caller re-renders.
  const ask = useRef(onPull);
  useEffect(() => { ask.current = onPull; }, [onPull]);

  useEffect(() => {
    const el = scroller?.current;
    if (!el) return undefined;
    const still = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // Whether a drag that has just begun may be a pull at all. Decided once,
    // on the way down, like every other gesture here.
    const allowed = target => {
      if (busy.current) return false;
      if (el.scrollTop > 0) return false;
      if (document.documentElement.classList.contains('ln-locked')) return false;
      if (document.querySelector('.hn--choosing')) return false;
      const typing = document.activeElement;
      if (typing && (typing.tagName === 'TEXTAREA' || typing.tagName === 'INPUT' || typing.isContentEditable)) return false;
      if (target?.closest?.('input, textarea, [role="slider"], [data-slide], .fr-now-row')) return false;
      return true;
    };
    const begin = (y, target) => { drag.current = allowed(target) ? { y, far: false } : null; };
    const move = y => {
      const d = drag.current;
      if (!d) return;
      // The pane began to scroll after all: this was never a pull.
      if (el.scrollTop > 0) { drag.current = null; setPull(0); setPhase('idle'); return; }
      const dy = Math.max(0, y - d.y) * 0.5;
      d.far = dy >= FAR_ENOUGH;
      setPull(still() ? 0 : dy);
      setPhase(dy <= 0 ? 'idle' : d.far ? 'release' : 'pulling');
    };
    const end = async () => {
      const d = drag.current;
      drag.current = null;
      if (!d) return;
      setPull(0);
      if (!d.far) { setPhase('idle'); return; }
      setPhase('asking');
      busy.current = true;
      const began = Date.now();
      try { await ask.current?.(); } catch { /* the line goes either way */ }
      const left = SEEN_MS - (Date.now() - began);
      if (left > 0) await new Promise(resolve => setTimeout(resolve, left));
      busy.current = false;
      setPhase('idle');
    };

    // Touch for a phone; pointer events for a mouse, so the pull can be
    // tried in a window as well as on a thumb.
    const touchStart = e => { if (e.touches.length === 1) begin(e.touches[0].clientY, e.target); else drag.current = null; };
    const touchMove = e => { if (e.touches.length === 1) move(e.touches[0].clientY); };
    const pointerDown = e => { if (e.pointerType === 'mouse' && e.button === 0) begin(e.clientY, e.target); };
    const pointerMove = e => { if (e.pointerType === 'mouse') move(e.clientY); };
    const pointerUp = e => { if (e.pointerType === 'mouse') end(); };
    el.addEventListener('touchstart', touchStart, { passive: true });
    el.addEventListener('touchmove', touchMove, { passive: true });
    el.addEventListener('touchend', end, { passive: true });
    el.addEventListener('touchcancel', end, { passive: true });
    el.addEventListener('pointerdown', pointerDown);
    el.addEventListener('pointermove', pointerMove);
    el.addEventListener('pointerup', pointerUp);
    el.addEventListener('pointercancel', pointerUp);
    return () => {
      el.removeEventListener('touchstart', touchStart);
      el.removeEventListener('touchmove', touchMove);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end);
      el.removeEventListener('pointerdown', pointerDown);
      el.removeEventListener('pointermove', pointerMove);
      el.removeEventListener('pointerup', pointerUp);
      el.removeEventListener('pointercancel', pointerUp);
    };
  }, [scroller]);

  const words = phase === 'asking' ? asking : WORDS[phase];
  return (
    <div
      className={'ln-pull ln-pull--' + phase}
      style={pull ? { '--pull': `${pull}px` } : undefined}
      role="status"
      aria-live="polite"
    >
      <span className="ln-pull-dot" aria-hidden="true" />
      <span className="ln-pull-say">{words}</span>
    </div>
  );
}
