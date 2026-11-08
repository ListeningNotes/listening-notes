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
// ── The gesture, as the brief's mock-up draws it ────────────────────────
// At the top of a scroller, a finger (or a mouse) dragged down opens a gap
// above the page, and in it the mark and a line: Pull down, then Let go to
// refresh past a generous threshold. Letting go asks, the mark turns while
// it does, and the line says what is being asked — Asking everyone… on
// Friends, because that is literally what happens, and Checking…
// elsewhere. With less motion asked for there is no rubber band: past the
// threshold it goes straight to asking, as the brief says.
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
//
// ── Whole turns, 2026-11-07 ─────────────────────────────────────────────
// The strip's mark turns once let go, smoothly, coming to rest upright, and
// again while the answer is still out — whole turns only, so it never stops
// partway round; the strip holds the page down until then. Tried and let go
// the same day: the top row's own logo turning in the strip's place, with
// the finger and as a boomerang — Miyel came back to "the original LN
// refresh", tweaked.

import { useEffect, useRef, useState } from 'react';

// How far the page has to travel before letting go asks. Generous, so an
// ordinary scroll that happens to begin at the top never asks by accident;
// the finger travels twice this, since the page follows it at half speed.
const FAR_ENOUGH = 72;
// The gap the line stands in while it asks, as the mock-up opens it.
const ROOM = 56;
// How long the asking line stays even when the answer is instant, so the
// press is seen to have done something.
const SEEN_MS = 600;
// How far a mouse has to move before a press is a pull rather than a click.
const STILL = 6;

const WORDS = { idle: '', pulling: 'Pull down', release: 'Let go to refresh', asking: '' };

// One turn of the mark.
const TURN_MS = 900;

// Once round, upright to upright. Resolves when it has come to rest.
function spinOnce(mark) {
  if (!mark?.animate) return new Promise(resolve => setTimeout(resolve, TURN_MS));
  return mark
    .animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: TURN_MS, easing: 'ease-in-out' })
    .finished.catch(() => {});
}

// `mark` is the site's mark, drawn by whoever mounts this (the cross draws
// it from its one source); the line turns it while asking.
export default function PullDown({ scroller, onPull, asking = 'Checking\u2026', mark = null }) {
  const [phase, setPhase] = useState('idle');
  const drag = useRef(null);
  const markRef = useRef(null);
  const busy = useRef(false);
  // What asking means, kept current without re-wiring the listeners each
  // time the caller re-renders.
  const ask = useRef(onPull);
  useEffect(() => { ask.current = onPull; }, [onPull]);

  useEffect(() => {
    const el = scroller?.current;
    if (!el) return undefined;
    const still = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // The room the page opens above itself, written on the scroller so the
    // line and the pane's first floor read one number (nav.css, .ln-pull).
    // `held` is a finger on it: the page follows without easing.
    const room = (px, held) => {
      el.style.setProperty('--pull-room', `${Math.max(0, Math.round(px))}px`);
      el.style.setProperty('--pull-ease', held ? '0s' : '0.22s');
    };

    // Whether anything between the finger and the scroller has moved: the
    // shelf of faces scrolls on its own while a face is open, and a drag
    // that is bringing it back up is a scroll, not a pull.
    const inside = target => {
      for (let node = target; node && node !== el; node = node.parentElement) {
        if (node.scrollTop > 0) return true;
      }
      return false;
    };
    // Whether a drag that has just begun may be a pull at all. Decided once,
    // on the way down, like every other gesture here.
    const allowed = target => {
      if (busy.current) return false;
      if (el.scrollTop > 0 || inside(target)) return false;
      if (document.documentElement.classList.contains('ln-locked')) return false;
      const typing = document.activeElement;
      if (typing && (typing.tagName === 'TEXTAREA' || typing.tagName === 'INPUT' || typing.isContentEditable)) return false;
      // The rows of cards and faces that scroll sideways used to be left out
      // here, which on Friends was most of the top of the screen, so a pull
      // took only where the finger happened to land between them (Miyel,
      // 2026-11-07: "not working on friends consistently"). They pull now,
      // and a drag that goes sideways first is theirs (move, below).
      if (target?.closest?.('input, textarea, [role="slider"], [data-slide]')) return false;
      return true;
    };

    const asks = async () => {
      setPhase('asking');
      busy.current = true;
      room(ROOM, still());
      const began = Date.now();
      let answered = false;
      const asked = Promise.resolve().then(() => ask.current?.()).catch(() => {}).finally(() => { answered = true; });
      if (!still()) {
        // Once round, then again while the answer is still out.
        do { await spinOnce(markRef.current); } while (!answered);
      }
      await asked;
      const left = SEEN_MS - (Date.now() - began);
      if (left > 0) await new Promise(resolve => setTimeout(resolve, left));
      busy.current = false;
      setPhase('idle');
      room(0, still());
    };
    const quit = () => {
      drag.current = null;
      el.style.userSelect = '';
      room(0, false);
      setPhase('idle');
    };

    const begin = (y, target, x = 0) => {
      drag.current = allowed(target) ? { y, x, target, far: false, moved: false, way: null } : null;
      return Boolean(drag.current);
    };
    const move = (y, x) => {
      const d = drag.current;
      if (!d) return;
      // Which way the drag went first decides it: sideways is a row's scroll.
      if (!d.way) {
        const across = Math.abs(x - d.x), down = Math.abs(y - d.y);
        if (Math.max(across, down) < STILL) return;
        d.way = across > down ? 'across' : 'down';
      }
      if (d.way === 'across') { drag.current = null; return; }
      // The pane, or something inside it, began to scroll after all: this
      // was never a pull.
      if (el.scrollTop > 0 || inside(d.target)) { quit(); return; }
      const dy = Math.max(0, y - d.y) * 0.5;
      d.far = dy >= FAR_ENOUGH;
      if (still()) {
        // No rubber band: past the threshold it simply asks.
        if (d.far) { drag.current = null; asks(); }
        return;
      }
      // iOS already carries the page down by its own bounce, reported as a
      // negative scrollTop; the room makes up the rest, so the page moves
      // once, at half the finger, whichever of the two is doing it.
      room(dy + Math.min(0, el.scrollTop), true);
      setPhase(dy <= 0 ? 'idle' : d.far ? 'release' : 'pulling');
    };
    const end = async () => {
      const d = drag.current;
      drag.current = null;
      el.style.userSelect = '';
      if (!d) return;
      if (!d.far) { room(0, false); setPhase('idle'); return; }
      await asks();
    };

    // Touch for a phone; pointer events for a mouse, so the pull can be
    // tried in a window as well as on a thumb. A mouse press is a click
    // until it has moved: only then is the pointer held, and the page's
    // words kept from being selected, so a face or a door pressed with a
    // mouse is still a press on that face or door.
    const touchStart = e => { if (e.touches.length === 1) begin(e.touches[0].clientY, e.target, e.touches[0].clientX); else drag.current = null; };
    const touchMove = e => { if (e.touches.length === 1) move(e.touches[0].clientY, e.touches[0].clientX); };
    const pointerDown = e => { if (e.pointerType === 'mouse' && e.button === 0) begin(e.clientY, e.target, e.clientX); };
    const pointerMove = e => {
      if (e.pointerType !== 'mouse') return;
      const d = drag.current;
      if (!d) return;
      if (!d.moved) {
        if (Math.abs(e.clientY - d.y) < STILL) return;
        d.moved = true;
        el.style.userSelect = 'none';
        window.getSelection?.()?.removeAllRanges();
        try { el.setPointerCapture(e.pointerId); } catch { /* no capture, still a pull */ }
      }
      move(e.clientY, e.clientX);
    };
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
      el.style.removeProperty('--pull-room');
      el.style.removeProperty('--pull-ease');
      el.style.userSelect = '';
    };
  }, [scroller]);

  const words = phase === 'asking' ? asking : WORDS[phase];
  return (
    <div className={'ln-pull ln-pull--' + phase} role="status" aria-live="polite">
      {mark && <span className="ln-pull-mark" ref={markRef} aria-hidden="true">{mark}</span>}
      <span className="ln-pull-say">{words}</span>
    </div>
  );
}
