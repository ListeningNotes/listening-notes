// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/LayerEntry.js
// The sheet of glass an entry arrives on, over the journal.
//
// It knows nothing about entries. It slides a full-screen surface in from the
// right, holds whatever it is handed, and gives three ways back out. What is
// on it is decided by app/@layer/(.)entries/[slug]/page.js.
//
// ── Why it comes from the right ───────────────────────────────────────────
// Because that is where things arrive from, not because right means entry. An
// entry is a layer over the journal, not a fourth pane of the cross — the
// cross has three directions with one meaning each, and adding a fourth that
// depended on which row you were standing in would be a mode. Modes are what
// make gesture navigation unlearnable.
//
// ── Going back ────────────────────────────────────────────────────────────
// Always router.back(), never a state flag. The layer is open because the URL
// says so, so the way to close it is to put the URL back — which makes the
// browser's own back button, the close control and the swipe all the same
// gesture, and means forward reopens it. A close that only cleared local state
// would leave the address bar pointing at an entry nobody is looking at.

'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen } from '@phosphor-icons/react';
import EdgeCaret from './EdgeCaret';

// How far right you have to drag before letting go dismisses rather than
// springs back. A quarter of the screen: far enough that a hesitant thumb does
// not throw the page away, near enough that the gesture never feels like work.
const FAR_ENOUGH = 0.25;
// A flick counts even when it is short. Pixels per millisecond.
const FAST_ENOUGH = 0.5;

export default function LayerEntry({ children }) {
  const router = useRouter();
  const sheetRef = useRef(null);
  // How far the finger has dragged it, in pixels. Held in state rather than
  // written to the element, because the closing animation needs to know
  // whether it is starting from rest or from wherever a released drag left it.
  const [drag, setDrag] = useState(0);
  const [settling, setSettling] = useState(false);
  const from = useRef(null);

  const goBack = useCallback(() => router.back(), [router]);

  // Escape closes it, the same as the button. A full-screen surface with no
  // keyboard way out is a trap for anyone not using a mouse.
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

  function onPointerDown(event) {
    if (event.pointerType === 'mouse') return;
    from.current = { x: event.clientX, y: event.clientY, at: event.timeStamp, owned: false };
    setSettling(false);
  }

  function onPointerMove(event) {
    const start = from.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;

    // Which gesture this is gets decided once, on the first few pixels, and
    // then held. Deciding per-frame means a drag that drifts slightly upward
    // hands itself back to the scroller halfway through.
    if (!start.owned) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dx) <= Math.abs(dy)) { from.current = null; return; }
      start.owned = true;
    }

    // Rightward only. Dragging the other way would pull the layer off its own
    // left edge and show the journal through a gap it is supposed to cover.
    setDrag(Math.max(0, dx));
  }

  function onPointerUp(event) {
    const start = from.current;
    from.current = null;
    if (!start?.owned) return;

    const width = sheetRef.current?.offsetWidth || window.innerWidth;
    const travelled = Math.max(0, event.clientX - start.x);
    const speed = travelled / Math.max(1, event.timeStamp - start.at);

    if (travelled > width * FAR_ENOUGH || speed > FAST_ENOUGH) {
      // Let it finish leaving before the route changes, or the layer vanishes
      // mid-gesture and the journal appears to jump.
      setSettling(true);
      setDrag(width);
      window.setTimeout(goBack, 180);
      return;
    }
    setSettling(true);
    setDrag(0);
  }

  return (
    <div
      className={'lay' + (settling ? ' lay--settling' : '') + (drag > 0 ? ' lay--dragging' : '')}
      ref={sheetRef}
      style={drag > 0 ? { transform: `translateX(${drag}px)` } : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { from.current = null; setSettling(true); setDrag(0); }}
      role="dialog"
      aria-modal="true"
      aria-label="Entry"
    >
      {children}

      {/* The way back, in the row the cross keeps its controls in — bottom
          centre, same offset, same object. It was a cross in the top right
          corner for an afternoon, which was wrong twice over: nothing else on
          this site asks for that corner, and the corner it was in belongs to
          the lights.

          The mark is the journal's, because a caret names where you land
          rather than which way you are going — the same rule the cross's own
          carets follow. */}
      <div className="lay-controls">
        <EdgeCaret
          direction="left"
          onClick={goBack}
          label="Back to the journal"
          icon={BookOpen}
        />
      </div>
    </div>
  );
}
