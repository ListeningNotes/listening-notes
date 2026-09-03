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
  //
  // Which arrival this is gets decided during the first render, as state
  // that never changes, and shows up as a class. Not an inline style: React
  // owns the element's style attribute and wiped a hand-set `animation:
  // none` on the next render, so the stylesheet's fade ran on top of the
  // growth for the length of it. A class React put there stays.
  const slug = pathname.startsWith('/entries/') ? decodeURIComponent(pathname.slice('/entries/'.length)) : '';
  const [growFrom] = useState(() => {
    if (typeof document === 'undefined' || !slug) return null;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
    return tileBoxOf(slug);
  });

  useLayoutEffect(() => {
    const sheet = sheetRef.current;
    const box = growFrom;
    if (!sheet || !box) return;
    const W = sheet.offsetWidth || window.innerWidth;
    const H = sheet.offsetHeight || window.innerHeight;
    const run = sheet.animate([
      // Opaque from the first frame. It began at half opacity, and for the
      // length of the growth the wall showed through a sheet that was also
      // fading — two things happening where one is the whole idea.
      { transformOrigin: '0 0', transform: `translate(${box.x}px, ${box.y}px) scale(${box.w / W}, ${box.h / H})`, borderRadius: '14px' },
      { transformOrigin: '0 0', transform: 'none', borderRadius: '0px' },
    ], { duration: GROW_MS, easing: GROW_EASE });
    return () => run.cancel();
  }, [growFrom]);
  const edgeRef = useRef(null);
  // How far the pull has moved it, in pixels. Held in state rather than
  // written straight to the element, because the closing animation needs to
  // know whether it is starting from rest or from wherever a release left it.
  const [drag, setDrag] = useState(0);
  // The pull down, in pixels. Separate from the edge pull rather than one
  // vector, because the two are different gestures with different homes.
  const [dragY, setDragY] = useState(0);
  const [settling, setSettling] = useState(false);

  const goBack = useCallback(() => router.back(), [router]);

  // ── The cover goes back into the tile ─────────────────────────────────────
  // Opening grows the whole sheet out of the tile; closing does not shrink
  // the whole sheet back. It did for an hour, and a page of writing and
  // scores scaling down to a thumbnail is a page, not a record being put
  // back. So on the way out the cover lifts off the page — a copy of it,
  // fixed over everything — and flies into the tile's square, while the
  // sheet fades away underneath it. The tile has to be on screen for this
  // to mean anything; otherwise the sheet fades alone. The browser's own
  // back button cannot be intercepted and simply removes the sheet, which
  // is the platform's habit and fine.
  const leaving = useRef(false);
  const leave = useCallback((fromX = 0) => {
    if (leaving.current) return;
    leaving.current = true;
    const sheet = sheetRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const box = slug && !reduced ? tileBoxOf(slug) : null;
    const onScreen = box && box.y > -box.h && box.y < window.innerHeight;
    if (!sheet) { goBack(); return; }
    // The cover as the entry draws it: the first screen's on a phone, the
    // hero band's on a wide window — whichever is laid out.
    const cover = [...sheet.querySelectorAll('.ln-screen-one-art img, .ln-hero-row .ln-cover img')]
      .find(el => el.getBoundingClientRect().width > 0);
    const fade = sheet.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease-out', fill: 'forwards' });
    if (!onScreen || !cover) {
      fade.onfinish = goBack;
      fade.oncancel = goBack;
      return;
    }
    // The flying copy. Fixed, over the fading sheet, starting exactly where
    // the page's cover is (offset by any pull in progress) and landing on
    // the tile. The page's own cover is hidden so there is one on screen.
    const from = cover.getBoundingClientRect();
    cover.style.visibility = 'hidden';
    const flyer = document.createElement('img');
    flyer.src = cover.currentSrc || cover.src;
    flyer.alt = '';
    flyer.className = 'lay-flyer';
    Object.assign(flyer.style, {
      position: 'fixed', zIndex: 300, left: `${from.left}px`, top: `${from.top}px`,
      width: `${from.width}px`, height: `${from.height}px`, objectFit: 'cover',
      borderRadius: getComputedStyle(cover).borderRadius || '12px', transformOrigin: '0 0', pointerEvents: 'none',
    });
    document.body.appendChild(flyer);
    const run = flyer.animate([
      { transform: `translateX(${fromX}px) scale(1, 1)` },
      { transform: `translate(${box.x - from.left}px, ${box.y - from.top}px) scale(${box.w / from.width}, ${box.h / from.height})` },
    ], { duration: GROW_MS * 0.75, easing: GROW_EASE, fill: 'forwards' });
    const done = () => { flyer.remove(); goBack(); };
    run.onfinish = done;
    run.oncancel = done;
  }, [goBack, slug]);

  // Escape closes it, the same as the swipe. A full-screen surface with no
  // keyboard way out is a trap for anyone not using a thumb.
  useEffect(() => {
    const onKey = event => { if (event.key === 'Escape') leave(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [leave]);

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

      if (travelled > width * FAR_ENOUGH || speed > FAST_ENOUGH) {
        // Shrink home from where the finger let go, then change the route —
        // never before, or the layer vanishes mid-gesture and the journal
        // appears to jump.
        leave(travelled);
        return;
      }
      setSettling(true);
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
  }, [leave]);

  // ── Pulling down to close, 2026-09-03 ─────────────────────────────────────
  // The whole sheet listens, and decides on the first move. Mostly downward,
  // from the top of the first screen, is this gesture: the sheet follows the
  // finger and a release past a fifth of the screen, or a flick, closes it
  // the way Escape does — the cover flies home and the page fades under it.
  // Anything else — sideways, upward, or downward from further into the
  // entry — is handed to the browser untouched. Deciding once, on the first
  // move, is what stops a diagonal drag doing two things at once.
  //
  // Same passive: false reasoning as the edge pull: the first move has to be
  // cancelled before the browser starts panning, and React's own listeners
  // cannot do that.
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return undefined;
    let pull = null;

    const atTop = () => {
      const screens = sheet.querySelector('.ln-screens');
      const scroller = screens && screens.scrollHeight > screens.clientHeight ? screens : sheet;
      return scroller.scrollTop <= 0;
    };

    const begin = event => {
      if (event.touches.length !== 1) { pull = null; return; }
      // A touch that started on the edge strip is the edge pull's.
      if (event.target.closest?.('.lay-edge')) { pull = null; return; }
      const touch = event.touches[0];
      pull = { x: touch.clientX, y: touch.clientY, at: event.timeStamp, lastY: touch.clientY, lastAt: event.timeStamp, decided: false, mine: false, top: atTop() };
    };

    const move = event => {
      if (!pull || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const dx = touch.clientX - pull.x;
      const dy = touch.clientY - pull.y;
      if (!pull.decided) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        pull.decided = true;
        pull.mine = pull.top && dy > 0 && Math.abs(dy) > Math.abs(dx);
        if (!pull.mine) { pull = null; return; }
        setSettling(false);
      }
      pull.lastY = touch.clientY;
      pull.lastAt = event.timeStamp;
      if (event.cancelable) event.preventDefault();
      setDragY(Math.max(0, dy));
    };

    const end = () => {
      const done = pull;
      pull = null;
      if (!done || !done.mine) return;
      const height = sheet.offsetHeight || window.innerHeight;
      const travelled = Math.max(0, done.lastY - done.y);
      const speed = travelled / Math.max(1, done.lastAt - done.at);
      if (travelled > height * FAR_ENOUGH || speed > FAST_ENOUGH) {
        leave();
        return;
      }
      setSettling(true);
      setDragY(0);
    };

    sheet.addEventListener('touchstart', begin, { passive: true });
    sheet.addEventListener('touchmove', move, { passive: false });
    sheet.addEventListener('touchend', end);
    sheet.addEventListener('touchcancel', end);
    return () => {
      sheet.removeEventListener('touchstart', begin);
      sheet.removeEventListener('touchmove', move);
      sheet.removeEventListener('touchend', end);
      sheet.removeEventListener('touchcancel', end);
    };
  }, [leave]);

  const pulled = drag > 0 || dragY > 0;

  return (
    <div
      className={'lay' + (growFrom ? ' lay--grows' : ' lay--fades') + (scrolls ? ' lay--scrolls' : '')
        + (settling ? ' lay--settling' : '') + (pulled ? ' lay--dragging' : '')}
      ref={sheetRef}
      style={pulled ? { transform: `translate(${drag}px, ${dragY}px)` } : undefined}
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
