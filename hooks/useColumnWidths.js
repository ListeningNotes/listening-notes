// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// hooks/useColumnWidths.js
// How wide the two side columns of the cross are on a desk.
//
// On a phone the cross is three panes you swipe between. On a desk it is
// three columns side by side, and since 2026-09-13 they are not equal: the
// card on the left and the desk (or the colophon) on the right are rails of
// about 196 and 186px, and the centre — the beacon and the wall — takes what
// is left. That is what gives the page a hierarchy: the eye lands on the
// centre because the centre is where the width is.
//
// The two dividers are grips. Somebody browsing their archive drags the
// centre wider; somebody working through an inbox drags the desk wider. The
// widths are remembered in this browser, so a device keeps the arrangement
// its owner gave it, and clamped so the layout can never be dragged into a
// shape that does not work: a rail narrower than the card or wider than the
// centre, a centre too narrow for the wall's bar.
//
// ── Two stores, one answer ──────────────────────────────────────────────────
// What was asked for lives in localStorage and is read through
// useSyncExternalStore, the way the wall reads its density and the beacon
// its poll — a browser-only value read in an effect trips the lint rule the
// project keeps, and this is exactly the shape that rule wants. The window's
// width is a second store, so a narrower window fits the columns to itself
// without touching what was remembered: the preference is what the person
// dragged, not what their smallest window could hold.
//
// Nothing here knows about the phone. The stylesheet ignores these numbers
// below 769px, and the hook costs nothing there but two listeners.

'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'ln-columns';

// The rest position: what a copy draws before anybody has touched a grip,
// and what the server draws every time.
export const REST_WIDTHS = Object.freeze({ left: 196, right: 186 });

// A rail narrower than this cannot hold the card's portrait or a door's
// label; wider than this it is a second centre.
const LEAST = 150;
const MOST = 380;
// What the centre keeps whatever the rails ask for: the wall's bar, with
// room for a row of covers under it.
const CENTRE_LEAST = 480;
// One press of an arrow key on a grip.
const STEP = 16;

// ── What was asked for ──────────────────────────────────────────────────────
const asked = { widths: null, listeners: new Set() };

function read() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.right)) {
      return { left: saved.left, right: saved.right };
    }
  } catch {
    /* nothing saved, or storage is off — the rest position is the answer */
  }
  return REST_WIDTHS;
}

function keep(widths) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
  } catch {
    /* private browsing or storage disabled — the grips still work, the
       arrangement is simply not remembered next visit */
  }
}

function subscribeAsked(listener) {
  asked.listeners.add(listener);
  return () => asked.listeners.delete(listener);
}
// Read from storage on the first ask and never again: one object, replaced
// only by a drag, so useSyncExternalStore sees a stable snapshot.
function askedNow() {
  if (!asked.widths) asked.widths = read();
  return asked.widths;
}
function setAsked(widths) {
  asked.widths = widths;
  for (const listener of asked.listeners) listener();
}

// ── The window ──────────────────────────────────────────────────────────────
function subscribeWindow(listener) {
  window.addEventListener('resize', listener);
  return () => window.removeEventListener('resize', listener);
}
const windowNow = () => window.innerWidth;
// The server has no window; a wide one clamps nothing, which is the right
// guess for the first paint.
const WINDOW_UNKNOWN = () => 1600;

// Fit a pair of widths to a window: each rail between LEAST and MOST, and
// the two together leaving the centre at least CENTRE_LEAST. When they do
// not fit, both give way in proportion rather than one of them alone, so
// dragging one rail out never snaps the other shut.
export function fit({ left, right }, windowWidth) {
  const room = Math.max(LEAST * 2, windowWidth - CENTRE_LEAST);
  let l = Math.min(Math.max(LEAST, Math.round(left)), MOST);
  let r = Math.min(Math.max(LEAST, Math.round(right)), MOST);
  if (l + r > room) {
    const scale = room / (l + r);
    l = Math.max(LEAST, Math.round(l * scale));
    r = Math.max(LEAST, Math.round(r * scale));
  }
  return { left: l, right: r };
}

export function useColumnWidths() {
  const wanted = useSyncExternalStore(subscribeAsked, askedNow, () => REST_WIDTHS);
  const windowWidth = useSyncExternalStore(subscribeWindow, windowNow, WINDOW_UNKNOWN);
  // Which grip is held, if any: 'left', 'right', or null. Only the page's
  // class reads it — the cursor and the text selection are switched off
  // for the length of a drag.
  const [dragging, setDragging] = useState(null);
  // The drag in progress: which side, where the pointer started, and what
  // the widths were when it did. A ref, not state, because every pointer
  // move reads it and none of them should re-render for it.
  const grip = useRef(null);

  const widths = fit(wanted, windowWidth);

  // Written onto the document's root, not returned as a style: the
  // stylesheet reads --hn-left and --hn-right on the cross, and so does the
  // panel a desk page opens in (.lay--desk in entry.css), which lives in the
  // layer slot beside the cross rather than inside it. Before paint, so a
  // remembered width never flashes through the rest one; cleared when the
  // cross goes, so a page without it gets the stylesheet's own numbers.
  useLayoutEffect(() => {
    const root = document.documentElement.style;
    root.setProperty('--hn-left', `${widths.left}px`);
    root.setProperty('--hn-right', `${widths.right}px`);
  }, [widths.left, widths.right]);
  useEffect(() => () => {
    const root = document.documentElement.style;
    root.removeProperty('--hn-left');
    root.removeProperty('--hn-right');
  }, []);

  // The drag begins on the grip and the rest of it happens on the window:
  // the pointer leaves the grip's nine pixels at once, so the moves and the
  // release are listened for there, for exactly as long as a grip is held.
  // Capture is asked for as well, which keeps whatever is under the pointer
  // from reacting, but nothing depends on it — a pointer that cannot be
  // captured still drags.
  const grab = useCallback((side, event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* the window listeners do the work */ }
    grip.current = { side, x: event.clientX, from: fit(askedNow(), window.innerWidth) };
    setDragging(side);
  }, []);

  useEffect(() => {
    if (!dragging) return undefined;
    const move = event => {
      const held = grip.current;
      if (!held) return;
      const dx = event.clientX - held.x;
      // The left rail grows as the pointer goes right; the right rail grows
      // as it goes left. Both are fitted on every move, so the centre never
      // drops under its minimum even for a frame.
      const next = held.side === 'left'
        ? { left: held.from.left + dx, right: held.from.right }
        : { left: held.from.left, right: held.from.right - dx };
      setAsked(fit(next, window.innerWidth));
    };
    const end = () => {
      grip.current = null;
      setDragging(null);
      keep(askedNow());
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    // A cross that unmounts mid-drag takes its listeners with it.
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, [dragging]);

  // The keyboard's drag: a grip has focus and an arrow moves it a step. The
  // arrow's direction is the divider's — right moves the divider right,
  // whichever rail that widens.
  const nudge = useCallback((side, direction) => {
    const from = fit(askedNow(), window.innerWidth);
    const delta = STEP * direction * (side === 'left' ? 1 : -1);
    const next = side === 'left'
      ? { left: from.left + delta, right: from.right }
      : { left: from.left, right: from.right + delta };
    const fitted = fit(next, window.innerWidth);
    setAsked(fitted);
    keep(fitted);
  }, []);

  return { widths, dragging, grab, nudge };
}
