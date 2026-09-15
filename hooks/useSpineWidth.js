// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// hooks/useSpineWidth.js
// How wide the spine is on a desk.
//
// The desktop is an open book: a narrow page on the left that turns, and the
// journal across the rest. The narrow one is the spine, about a quarter of
// the window, and this is the one number that says how narrow. The divider
// between the two is a grip — drag it and the spine widens, the journal
// giving way — and what it is dragged to is remembered in this browser, so a
// device keeps the arrangement its owner gave it.
//
// It replaced useColumnWidths, which held two numbers for the two rails of
// the three-column desktop. There is one rail now, so there is one number.
//
// ── The rest width is a quarter, and the stylesheet says so too ────────────
// A proportion, not a constant: 340px is a quarter of a laptop and a sixth of
// a wide monitor, and "about a quarter of the width" is what the spine is for.
// The formula here and the clamp() in nav.css are the same arithmetic written
// twice on purpose — the server has no window to measure, so the stylesheet
// draws the first paint and this agrees with it to the pixel rather than
// correcting it afterwards. Change one and change the other.
//
// ── Two stores, one answer ────────────────────────────────────────────────
// What was asked for lives in localStorage and is read through
// useSyncExternalStore, the way the wall reads its density and the beacon its
// poll — a browser-only value read in an effect trips the lint rule the
// project keeps, and this is exactly the shape that rule wants. The window's
// width is a second store, so a narrower window fits the spine to itself
// without touching what was remembered: the preference is what the person
// dragged, not what their smallest window could hold.
//
// Nothing here knows about the phone. The stylesheet ignores this number
// below 769px, and the hook costs nothing there but two listeners.

'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'ln-spine';

// A spine narrower than this cannot hold the card's portrait, a door's label
// or the inbox's three tabs — the pages that open on it are the clamp's real
// job, not the card; wider than this it stops being the narrow page.
const LEAST = 300;
const MOST = 520;
// What the journal keeps whatever the spine asks for: the wall's bar, with
// room for a row of covers under it.
const PAGE_LEAST = 520;
// The rest position — what a browser with nothing remembered gets, and what
// nav.css draws before this runs. Kept as the same three numbers.
const REST_SHARE = 0.25;
const REST_MOST = 420;
// One press of an arrow key on the grip.
const STEP = 16;

// The rest width at a given window. `clamp(240px, 25vw, 420px)` in nav.css,
// in arithmetic.
export function restWidth(windowWidth) {
  return Math.round(Math.min(REST_MOST, Math.max(LEAST, windowWidth * REST_SHARE)));
}

// Fit a width to a window: between LEAST and MOST, and leaving the journal at
// least PAGE_LEAST. Null — nothing remembered — is the rest width.
export function fit(width, windowWidth) {
  const wanted = width === null ? restWidth(windowWidth) : width;
  const room = Math.max(LEAST, windowWidth - PAGE_LEAST);
  return Math.min(Math.max(LEAST, Math.round(wanted)), MOST, room);
}

// ── What was asked for ──────────────────────────────────────────────────────
// `width` is null until the first ask and stays null for a browser that has
// never dragged the grip, which is what lets the rest position be a
// proportion rather than a number somebody chose.
const asked = { width: undefined, listeners: new Set() };

function read() {
  try {
    const saved = Number(window.localStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(saved) && saved > 0) return saved;
  } catch {
    /* nothing saved, or storage is off — the rest position is the answer */
  }
  return null;
}

function keep(width) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(width));
  } catch {
    /* private browsing or storage disabled — the grip still works, the
       arrangement is simply not remembered next visit */
  }
}

function subscribeAsked(listener) {
  asked.listeners.add(listener);
  return () => asked.listeners.delete(listener);
}
// Read from storage on the first ask and never again: one number, replaced
// only by a drag, so useSyncExternalStore sees a stable snapshot.
function askedNow() {
  if (asked.width === undefined) asked.width = read();
  return asked.width;
}
function setAsked(width) {
  asked.width = width;
  for (const listener of asked.listeners) listener();
}

// ── The window ──────────────────────────────────────────────────────────────
function subscribeWindow(listener) {
  window.addEventListener('resize', listener);
  return () => window.removeEventListener('resize', listener);
}
const windowNow = () => window.innerWidth;
// The server has no window. Whatever this guesses is thrown away before paint
// by the stylesheet's own clamp, which is the thing that actually draws the
// first frame; a wide guess keeps the two agreeing on a wide screen.
const WINDOW_UNKNOWN = () => 1600;

export function useSpineWidth() {
  const wanted = useSyncExternalStore(subscribeAsked, askedNow, () => null);
  const windowWidth = useSyncExternalStore(subscribeWindow, windowNow, WINDOW_UNKNOWN);
  // Whether the grip is held. Only the page's class reads it — the cursor and
  // the text selection are switched off for the length of a drag.
  const [dragging, setDragging] = useState(false);
  // The drag in progress: where the pointer started and what the width was
  // when it did. A ref, not state, because every pointer move reads it and
  // none of them should re-render for it.
  const grip = useRef(null);

  const width = fit(wanted, windowWidth);

  // Written onto the document's root, not returned as a style: the stylesheet
  // reads --spine-w on the cross, and so does the sheet a page opens on
  // (.lay--over-spine and .lay--over-journal in entry.css), which lives in the
  // layer slot beside the cross rather than inside it. Before paint, so a
  // remembered width never flashes through the rest one; cleared when the
  // cross goes, so a page without it gets the stylesheet's own clamp back.
  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--spine-w', `${width}px`);
  }, [width]);
  useEffect(() => () => {
    document.documentElement.style.removeProperty('--spine-w');
  }, []);

  // The drag begins on the grip and the rest of it happens on the window: the
  // pointer leaves the grip's nine pixels at once, so the moves and the release
  // are listened for there, for exactly as long as the grip is held. Capture is
  // asked for as well, which keeps whatever is under the pointer from reacting,
  // but nothing depends on it — a pointer that cannot be captured still drags.
  const grab = useCallback(event => {
    if (event.button !== 0) return;
    event.preventDefault();
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* the window listeners do the work */ }
    grip.current = { x: event.clientX, from: fit(askedNow(), window.innerWidth) };
    setDragging(true);
  }, []);

  useEffect(() => {
    if (!dragging) return undefined;
    const move = event => {
      const held = grip.current;
      if (!held) return;
      // The spine grows as the pointer goes right. Fitted on every move, so
      // the journal never drops under its minimum even for a frame.
      setAsked(fit(held.from + (event.clientX - held.x), window.innerWidth));
    };
    const end = () => {
      grip.current = null;
      setDragging(false);
      const settled = askedNow();
      if (settled !== null) keep(settled);
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

  // The keyboard's drag: the grip has focus and an arrow moves it a step. The
  // arrow's direction is the divider's — right widens the spine.
  const nudge = useCallback(direction => {
    const next = fit(fit(askedNow(), window.innerWidth) + STEP * direction, window.innerWidth);
    setAsked(next);
    keep(next);
  }, []);

  return { width, dragging, grab, nudge };
}
