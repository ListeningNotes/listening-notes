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
// ── How it arrives, 2026-09-02 ────────────────────────────────────────────
// It grows out of the square that was pressed. The sheet starts as the exact
// box of the tile on the wall — same place, same size — and scales up to fill
// the screen, the way an app opens from its icon; the wall never moved, so
// the return explains itself. It used to slide in from the right, and for an
// evening it faded. Where the tile cannot be found — a form arriving here, a
// tile scrolled off the wall — it fades, which is the plainer version of the
// same thing rather than a different thing. Reduced motion fades too.
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
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { tileBoxOf } from '../../library/handoff';

// How long the sheet takes to grow to the screen. Unhurried, slowing as it
// lands — the same curve the slide used.
const GROW_MS = 420;
const GROW_EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

// How far right the pull has to travel before letting go leaves rather than
// springs back. A fifth of the screen: far enough that a resting thumb does
// not throw the page away, near enough that it never feels like work.
const FAR_ENOUGH = 0.2;
// A flick counts even when it is short. Pixels per millisecond, and low — a
// quick swipe is the common case, not the exception.
const FAST_ENOUGH = 0.3;

// `label` is what the sheet announces itself as, because "Entry" was written
// in here while an entry was the only thing that could arrive on it — and this
// file is supposed to know nothing about entries.
//
// `scrolls` restores the sheet's own scrolling on a phone. It is off by
// default because of the note in globals.css: an entry's phone layout is
// already two scroll containers deep and a third one breaks the other two, so
// the layer has to be genuinely not a scroll container underneath it. That
// reasoning is about the entry, not about the layer — anything arriving here
// that is one ordinary column of content has nothing nested to break and needs
// the sheet to scroll it, or it simply overflows the fixed box and the bottom
// of it cannot be reached.
export default function LayerEntry({ children, label = 'Entry', scrolls = false }) {
  const router = useRouter();
  const pathname = usePathname();
  const sheetRef = useRef(null);

  // ── Growing out of the tile ───────────────────────────────────────────────
  // Before paint, once. The sheet is a full-screen box; a transform puts it
  // exactly over the tile — moved to the tile's corner and scaled down to
  // the tile's size — and the Web Animations API runs it from there to rest.
  // The content scales with it, which is what makes it read as the same
  // thing getting bigger rather than a page appearing. The stylesheet's own
  // fade is switched off for the run so the two do not argue.
  useLayoutEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const slug = pathname.startsWith('/entries/') ? decodeURIComponent(pathname.slice('/entries/'.length)) : '';
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const box = slug ? tileBoxOf(slug) : null;
    if (reduced || !box) return;
    const W = sheet.offsetWidth || window.innerWidth;
    const H = sheet.offsetHeight || window.innerHeight;
    sheet.style.animation = 'none';
    // The origin is in the keyframes as well as on the element, so no frame
    // can scale about the centre while the inline value is being applied.
    sheet.style.transformOrigin = '0 0';
    const run = sheet.animate([
      { transformOrigin: '0 0', transform: `translate(${box.x}px, ${box.y}px) scale(${box.w / W}, ${box.h / H})`, opacity: 0.55, borderRadius: '14px' },
      { transformOrigin: '0 0', transform: 'none', opacity: 1, borderRadius: '0px' },
    ], { duration: GROW_MS, easing: GROW_EASE });
    const done = () => { sheet.style.animation = ''; };
    run.onfinish = done;
    run.oncancel = done;
    return () => run.cancel();
    // Once, for the record the layer opened on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
      className={'lay' + (scrolls ? ' lay--scrolls' : '')
        + (settling ? ' lay--settling' : '') + (drag > 0 ? ' lay--dragging' : '')}
      ref={sheetRef}
      style={drag > 0 ? { transform: `translateX(${drag}px)` } : undefined}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      {/* Invisible, full height, a thumb's width. Nothing is drawn in it: the
          affordance is that the gesture is the platform's own, not that there
          is something on screen to find. */}
      <div className="lay-edge" ref={edgeRef} aria-hidden="true" />

      {children}
    </div>
  );
}
