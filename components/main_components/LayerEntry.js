// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/LayerEntry.js
// The sheet of glass an entry arrives on, over the journal.
//
// It knows nothing about entries. It slides a full-screen surface in from the
// right, holds whatever it is handed, and gives three ways back out. What is
// on it is decided by app/@layer/(.)entries/[slug]/page.js.
//
// ── There is no close button ──────────────────────────────────────────────
// There was a cross in the top right corner, then an EdgeCaret in the row the
// cross uses along the bottom. Both are gone. The corner one took the lights'
// place and no other screen here asks for that corner; the bottom one sat on
// top of the entry's own scroll cue, and two controls arguing over the same
// forty pixels is worse than no control at all. The swipe is the gesture
// people reach for anyway. Escape and the browser's back button do the same
// thing for anyone not using a thumb.
//
// ── Why it comes from the right ───────────────────────────────────────────
// Because that is where things arrive from, not because right means entry. An
// entry is a layer over the journal, not a fourth pane of the cross — the
// cross has three directions with one meaning each, and adding a fourth that
// depended on which row you were standing in would be a mode. Modes are what
// make gesture navigation unlearnable.
//
// ── Why the swipe starts at the edge ──────────────────────────────────────
// It read the whole surface first, and that could not be made to work. The
// layer sets touch-action: pan-y so the browser owns vertical panning — which
// means on a swipe that is mostly sideways but slightly down, the browser
// starts scrolling on the vertical part *while* this is still deciding whether
// the horizontal part is a swipe. Both happen. On the first screen, with a
// mandatory snap waiting one viewport below, a back-swipe took you down into
// the notes instead. Being stricter about what counted as horizontal only
// traded that for swipes that did nothing at all.
//
// The strip fixes it by removing the ambiguity rather than arbitrating it. It
// carries touch-action: none, so inside those few pixels the browser does not
// pan and every gesture there is unambiguously this one; everywhere else
// scrolling is untouched and can never be mistaken for leaving. It is also
// what iOS does with its own back gesture, so the thing to reach for is the
// thing people already reach for — and it works the same over the cover, over
// the tracklist and in the middle of the prose, because the strip runs the
// whole height.
//
// ── Going back ────────────────────────────────────────────────────────────
// Always router.back(), never a state flag. The layer is open because the URL
// says so, so the way to close it is to put the URL back — which makes the
// browser's own back button, the keyboard and the swipe all the same gesture,
// and means forward reopens it. A close that only cleared local state would
// leave the address bar pointing at an entry nobody is looking at.

'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// How far right the pull has to travel before letting go leaves rather than
// springs back. A fifth of the screen: far enough that a resting thumb does
// not throw the page away, near enough that it never feels like work.
const FAR_ENOUGH = 0.2;
// A flick counts even when it is short. Pixels per millisecond, and low — a
// quick swipe is the common case, not the exception.
const FAST_ENOUGH = 0.3;

export default function LayerEntry({ children }) {
  const router = useRouter();
  const sheetRef = useRef(null);
  const edgeRef = useRef(null);
  // How far the pull has moved it, in pixels. Held in state rather than
  // written straight to the element, because the closing animation needs to
  // know whether it is starting from rest or from wherever a release left it.
  const [drag, setDrag] = useState(0);
  const [settling, setSettling] = useState(false);

  const goBack = useCallback(() => router.back(), [router]);

  // Escape closes it, the same as the swipe. A full-screen surface with no
  // keyboard way out is a trap for anyone not using a thumb.
  useEffect(() => {
    const onKey = event => { if (event.key === 'Escape') goBack(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goBack]);

  // The journal is still mounted underneath and would happily scroll behind
  // the layer. Locking the document rather than hiding the journal keeps its
  // scroll position exactly where it was — which is the whole point of doing
  // this as a layer.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('ln-locked');
    return () => root.classList.remove('ln-locked');
  }, []);

  // Touch events rather than pointer events, and listened for by hand rather
  // than through props, because this needs { passive: false } — React attaches
  // its own as passive, and a passive listener cannot call preventDefault,
  // which is most of the job here.
  useEffect(() => {
    const strip = edgeRef.current;
    if (!strip) return undefined;
    let pull = null;

    const begin = event => {
      if (event.touches.length !== 1) { pull = null; return; }
      const touch = event.touches[0];
      pull = { x: touch.clientX, at: event.timeStamp, lastX: touch.clientX, lastAt: event.timeStamp };
      setSettling(false);
    };

    const move = event => {
      if (!pull || event.touches.length !== 1) return;
      const touch = event.touches[0];
      // Where the finger was last actually seen. A fast flick can end with a
      // touchend whose coordinates sit behind the last move it fired, so the
      // decision is made on what was tracked rather than on where it landed.
      pull.lastX = touch.clientX;
      pull.lastAt = event.timeStamp;
      if (event.cancelable) event.preventDefault();
      setDrag(Math.max(0, touch.clientX - pull.x));
    };

    const end = () => {
      const done = pull;
      pull = null;
      if (!done) return;
      const width = sheetRef.current?.offsetWidth || window.innerWidth;
      const travelled = Math.max(0, done.lastX - done.x);
      const speed = travelled / Math.max(1, done.lastAt - done.at);

      setSettling(true);
      if (travelled > width * FAR_ENOUGH || speed > FAST_ENOUGH) {
        // Let it finish leaving before the route changes, or the layer
        // vanishes mid-gesture and the journal appears to jump.
        setDrag(width);
        window.setTimeout(goBack, 200);
        return;
      }
      setDrag(0);
    };

    strip.addEventListener('touchstart', begin, { passive: false });
    strip.addEventListener('touchmove', move, { passive: false });
    strip.addEventListener('touchend', end);
    // iOS cancels a touch readily, and treating that as "never mind" is how a
    // quick swipe ends up doing nothing about half the time. A cancelled pull
    // is judged on what it had already travelled, exactly like a released one.
    strip.addEventListener('touchcancel', end);
    return () => {
      strip.removeEventListener('touchstart', begin);
      strip.removeEventListener('touchmove', move);
      strip.removeEventListener('touchend', end);
      strip.removeEventListener('touchcancel', end);
    };
  }, [goBack]);

  return (
    <div
      className={'lay' + (settling ? ' lay--settling' : '') + (drag > 0 ? ' lay--dragging' : '')}
      ref={sheetRef}
      style={drag > 0 ? { transform: `translateX(${drag}px)` } : undefined}
      role="dialog"
      aria-modal="true"
      aria-label="Entry"
    >
      {/* Invisible, full height, a thumb's width. Nothing is drawn in it: the
          affordance is that the gesture is the platform's own, not that there
          is something on screen to find. */}
      <div className="lay-edge" ref={edgeRef} aria-hidden="true" />

      {children}
    </div>
  );
}
