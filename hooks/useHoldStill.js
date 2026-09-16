// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// hooks/useHoldStill.js
// Nothing behind an open overlay moves.
//
// ── Why one element was never enough ──────────────────────────────────────
// A scrim is a fixed box, so a touch that starts on it cannot scroll *it* —
// but the scroll goes to the nearest scrollable ancestor instead, and inside
// the cross there are three of those stacked: the wall's own floor, the pane
// the wall lives on, and the rail the panes sit in. The archive's filter sheet
// locked the innermost one and left the other two free, so dragging over the
// covers still carried the page off underneath the sheet. The card's window of
// covers locked nothing at all.
//
// Guessing which one scrolls is what went wrong, and it is not guessable: the
// same wall is a floor inside a scrolling pane on a phone and a plain column
// on a desk, and it also exists at an address of its own with none of that
// above it. So this asks rather than assumes, walking up from the overlay and
// stopping every ancestor that is a scroller right now.
//
// ── A class, never an inline style ────────────────────────────────────────
// These elements belong to somebody else — the pane and the rail are HomeNav's
// — and an inline style has to be handed back exactly as it was found. A class
// comes off cleanly, and `.ln-locked` already exists for the entry layer.
//
// ── The scroll positions survive ──────────────────────────────────────────
// Measured on 2026-09-15, because it was the one thing that could have made
// this unusable: `overflow: hidden` on a scroll-snapping rail could have
// dropped the reader onto another pane when the overlay closed. It does not —
// the rail and the pane both come back exactly where they were.
'use client';

import { useEffect } from 'react';

// Whether an element is carrying a scroll right now, on either axis. Asked of
// the live layout rather than of a stylesheet, because the answer changes with
// the width of the window.
function scrolls(el) {
  const seen = getComputedStyle(el);
  const moves = value => value === 'auto' || value === 'scroll';
  return (moves(seen.overflowY) && el.scrollHeight > el.clientHeight + 1)
    || (moves(seen.overflowX) && el.scrollWidth > el.clientWidth + 1);
}

// `ref` is anything inside the overlay — the scrim is the natural one, since
// it is present for exactly as long as the overlay is. `open` is what turns it
// on, so a component can call this unconditionally and let the flag decide.
export function useHoldStill(ref, open) {
  useEffect(() => {
    if (!open) return undefined;
    const start = ref?.current;
    if (!start) return undefined;

    const held = [];
    const hold = el => {
      if (!el || el.classList.contains('ln-locked')) return;
      el.classList.add('ln-locked');
      held.push(el);
    };

    // Everything from here to the top of the document.
    for (let el = start; el; el = el.parentElement) {
      if (scrolls(el)) hold(el);
    }

    // And the page itself, which the walk above cannot see. The root scrolls
    // at `overflow: visible` — that is what a document does — so asking it the
    // same question every other element is asked answers no, and at an address
    // of its own (/archive, an entry, the feed) the page was the one thing
    // still moving under an open sheet. Asked by whether it has anywhere to go
    // instead.
    const root = document.scrollingElement || document.documentElement;
    if (root && root.scrollHeight > root.clientHeight + 1) hold(root);
    return () => { for (const el of held) el.classList.remove('ln-locked'); };
  // The chain is walked once, when the overlay opens. Re-walking on every
  // render would be re-walking a page that cannot have changed shape: an
  // overlay is open over a page nobody can touch.
  }, [ref, open]);
}
