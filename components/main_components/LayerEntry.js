// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/LayerEntry.js
// The sheet of glass a page arrives on, over whatever was there.
//
// It knows nothing about entries. It holds whatever it is handed and gives
// ways back out. What is on it is decided by the route that renders it.
//
// ── Two ways to arrive, 2026-09-02 ────────────────────────────────────────
// `arrives="side"` is the original: the sheet slides in from the right and a
// pull from the left edge sends it back. The session and the send page still
// arrive this way.
//
// `arrives="source"` is for the entry. It expands from the cover that was
// tapped: the cover flies out of its tile on the wall into its place at the
// top of the entry while the sheet fades in under it, and on the way out it
// flies back into the tile and the sheet fades away. The wall never moved,
// so there is no scroll position to restore and the return explains itself.
//
// The reason for the change is gestures. Left and right on the entry now
// mean the previous and next record on the wall (`browse`), and a sheet
// that also slid sideways to open and close would have put three sideways
// gestures on one screen — the cross's panes, dismiss, and next. That is
// unlearnable. So the sideways axis belongs to browsing, and closing is a
// pull down from the top of the first screen, a tap outside the sheet where
// there is an outside, Escape, or the browser's back.
//
// ── Going back ────────────────────────────────────────────────────────────
// Always router.back(), never a state flag. The layer is open because the
// URL says so, so the way to close it is to put the URL back — which makes
// the browser's own back button, the keyboard and the gesture all the same
// thing, and means forward reopens it. Moving to a neighbour is
// router.replace, so back still goes to the wall rather than walking through
// every record that was swiped past.
//
// ── What browsing preloads ────────────────────────────────────────────────
// The neighbours' first screens are already in hand — the wall handed over
// its whole list — so a swipe draws the next cover, title and score before
// the request for its writing has left. The route for each neighbour is
// prefetched as well. The writing itself is read from the database when the
// address changes, the same as on a tap; what never waits is the picture.

'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { coverBoxOf, handOff, neighboursOf } from '../../library/handoff';

// How far a pull has to travel before letting go leaves rather than springs
// back. A fifth of the screen: far enough that a resting thumb does not
// throw the page away, near enough that it never feels like work.
const FAR_ENOUGH = 0.2;
// A flick counts even when it is short. Pixels per millisecond, and low — a
// quick swipe is the common case, not the exception.
const FAST_ENOUGH = 0.3;
// How long the cover takes to fly, and the sheet to fade. Matched to the way
// the old sheet slid: unhurried, slowing as it lands.
const FLIGHT_MS = 420;
const EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

function reducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// The box the entry's own cover occupies on the sheet, once drawn. The entry
// draws its cover in one place on a phone (the first screen) and another on
// a wide window (the hero above the writing); whichever is laid out is the
// one to fly to.
const COVER_SPOTS = '.ln-screen-one-art img, .ln-screen-one-art, .ln-hero-row .ln-cover img, .ln-hero-row .ln-cover';
function coverBoxOn(sheet) {
  if (!sheet) return null;
  for (const art of sheet.querySelectorAll(COVER_SPOTS)) {
    const box = art.getBoundingClientRect();
    if (box.width && box.height) return { x: box.left, y: box.top, w: box.width, h: box.height };
  }
  return null;
}

// Fly a copy of the cover from one box to another, over the sheet, and
// resolve when it lands. The copy is a plain fixed image so nothing on the
// sheet has to be measured mid-flight.
function fly(src, from, to, ms) {
  return new Promise(resolve => {
    if (!src || !from || !to) { resolve(); return; }
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.className = 'lay-flyer';
    img.style.left = `${from.x}px`;
    img.style.top = `${from.y}px`;
    img.style.width = `${from.w}px`;
    img.style.height = `${from.h}px`;
    document.body.appendChild(img);
    const run = img.animate([
      { transform: 'translate(0, 0) scale(1, 1)' },
      { transform: `translate(${to.x - from.x}px, ${to.y - from.y}px) scale(${to.w / from.w}, ${to.h / from.h})` },
    ], { duration: ms, easing: EASE, fill: 'forwards' });
    run.onfinish = () => { img.remove(); resolve(); };
    run.oncancel = () => { img.remove(); resolve(); };
  });
}

export default function LayerEntry({
  children,
  label = 'Entry',
  scrolls = false,
  arrives = 'side',
  browse = false,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const slug = pathname.startsWith('/entries/') ? decodeURIComponent(pathname.slice('/entries/'.length)) : '';
  const fromSource = arrives === 'source';

  const layRef = useRef(null);
  const sheetRef = useRef(null);
  const edgeRef = useRef(null);
  // How far a pull has moved the sheet, in pixels: sideways for the old
  // arrival, downwards for the new one. Held in state rather than written
  // straight to the element, because the closing animation needs to know
  // whether it is starting from rest or from wherever a release left it.
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [settling, setSettling] = useState(false);
  // The sideways position of the content while browsing, and which side the
  // next record should arrive from.
  const [shift, setShift] = useState(0);
  const [enterFrom, setEnterFrom] = useState(null);
  const [leaving, setLeaving] = useState(false);
  // Arrived: the flight is over and the sheet is fully drawn. Until then the
  // sheet is faded and the real cover is hidden under the flying copy.
  const [arrived, setArrived] = useState(!fromSource);

  const neighbours = browse && slug ? neighboursOf(slug) : { prev: null, next: null, known: false };

  // ── Leaving ───────────────────────────────────────────────────────────────
  const goBack = useCallback(() => router.back(), [router]);

  const leave = useCallback(async () => {
    if (leaving) return;
    setLeaving(true);
    if (fromSource && !reducedMotion()) {
      const sheet = sheetRef.current;
      const here = coverBoxOn(sheet);
      const home = coverBoxOf(slug);
      const src = sheet?.querySelector('.ln-screen-one-art img')?.src || home?.src;
      // Only fly home to a tile that is actually on screen. Flying to a box
      // three screens below the fold reads as the cover vanishing downwards.
      const homeVisible = home && home.y > -home.h && home.y < window.innerHeight;
      setArrived(false);
      if (here && homeVisible) await fly(src, here, home, FLIGHT_MS * 0.8);
      else await new Promise(r => setTimeout(r, 180));
    }
    goBack();
  }, [fromSource, goBack, leaving, slug]);

  // Escape closes it, the same as the gesture. A full-screen surface with no
  // keyboard way out is a trap for anyone not using a thumb. Left and right
  // arrows browse, where there is somewhere to go.
  const go = useCallback(dir => {
    const target = dir < 0 ? neighbours.prev : neighbours.next;
    if (!target || leaving) return;
    // The next first screen is already in hand: leave it for LayerWaiting so
    // the swap draws at once, then change the address underneath.
    handOff(target);
    setEnterFrom(dir);
    setSettling(true);
    setShift(-dir * (sheetRef.current?.offsetWidth || window.innerWidth));
    window.setTimeout(() => {
      setShift(0);
      router.replace(`/entries/${target.slug}`);
    }, 180);
  }, [neighbours.prev, neighbours.next, leaving, router]);

  useEffect(() => {
    const onKey = event => {
      if (event.key === 'Escape') leave();
      if (browse && event.key === 'ArrowLeft') go(-1);
      if (browse && event.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [leave, go, browse]);

  // The wall is still mounted underneath and would happily scroll behind the
  // layer. Locking the document rather than hiding the wall keeps its scroll
  // position exactly where it was — which is the whole point of a layer.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('ln-locked');
    return () => root.classList.remove('ln-locked');
  }, []);

  // Prefetch the routes either side, so a swipe has less to wait for.
  useEffect(() => {
    if (!browse) return;
    if (neighbours.prev) router.prefetch(`/entries/${neighbours.prev.slug}`);
    if (neighbours.next) router.prefetch(`/entries/${neighbours.next.slug}`);
  }, [browse, neighbours.prev, neighbours.next, router]);

  // ── Arriving from the cover ───────────────────────────────────────────────
  // Once, on mount. The entry's first screen is drawn immediately from what
  // the wall handed over, so its cover has a box to fly into before the
  // writing arrives. With reduced motion the sheet simply fades.
  // Only for the record the layer opened on. A neighbour arriving later
  // enters from the side instead. A ref rather than a "done" flag, because
  // development runs every effect twice and a flag set by the first run
  // would stop the second — which is the one that survives — from flying.
  const openedOn = useRef(slug);
  useLayoutEffect(() => {
    if (!fromSource || slug !== openedOn.current) return;
    const sheet = sheetRef.current;
    // The cover and where it is come from the tile, not from the sheet: at
    // this moment the sheet holds nothing yet — the first screen is still
    // being handed in behind the Suspense boundary — so the picture has to
    // travel with the box it left. Then a few frames of waiting for the
    // sheet to draw the first screen, which gives the flight somewhere to
    // land. Past that, the fade alone; a flight to nowhere is worse than
    // no flight.
    const home = coverBoxOf(slug);
    let cancelled = false;
    let tries = 0;
    const settle = () => {
      if (cancelled) return;
      if (reducedMotion() || !home?.src) { setArrived(true); return; }
      const here = coverBoxOn(sheet);
      if (here) {
        fly(home.src, home, here, FLIGHT_MS).then(() => { if (!cancelled) setArrived(true); });
        return;
      }
      // Up to a second and a half: on a wide window the landing spot is on
      // the entry itself, which is still being read.
      if (++tries < 90) requestAnimationFrame(settle);
      else setArrived(true);
    };
    requestAnimationFrame(settle);
    return () => { cancelled = true; };
  }, [fromSource, slug]);

  // ── Touch ─────────────────────────────────────────────────────────────────
  // Touch events rather than pointer events, and listened for by hand rather
  // than through props, because this needs { passive: false } — React attaches
  // its own as passive, and a passive listener cannot call preventDefault,
  // which is most of the job here.
  //
  // Side arrival: the old edge strip, a pull from the left edge to leave.
  // Source arrival: the whole sheet listens, and decides on the first move.
  // Mostly sideways is browsing; mostly down, from the top of the first
  // screen, is leaving; anything else is the browser's to scroll. Deciding
  // once, on the first move, is what keeps a diagonal drag from doing two
  // things at once.
  useEffect(() => {
    const strip = fromSource ? sheetRef.current : edgeRef.current;
    if (!strip) return undefined;
    let pull = null;

    const atTop = () => {
      const screens = sheetRef.current?.querySelector('.ln-screens');
      const scroller = screens && screens.scrollHeight > screens.clientHeight ? screens : sheetRef.current;
      return !scroller || scroller.scrollTop <= 0;
    };

    const begin = event => {
      if (event.touches.length !== 1) { pull = null; return; }
      const touch = event.touches[0];
      pull = {
        x: touch.clientX, y: touch.clientY, at: event.timeStamp,
        lastX: touch.clientX, lastY: touch.clientY, lastAt: event.timeStamp,
        axis: fromSource ? null : 'x', top: atTop(),
      };
      setSettling(false);
    };

    const move = event => {
      if (!pull || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const dx = touch.clientX - pull.x;
      const dy = touch.clientY - pull.y;
      if (!pull.axis) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        if (Math.abs(dx) > Math.abs(dy)) pull.axis = browse ? 'x' : 'none';
        else pull.axis = dy > 0 && pull.top ? 'y' : 'none';
        if (pull.axis === 'none') { pull = null; return; }
      }
      // Where the finger was last actually seen. A fast flick can end with a
      // touchend whose coordinates sit behind the last move it fired, so the
      // decision is made on what was tracked rather than on where it landed.
      pull.lastX = touch.clientX;
      pull.lastY = touch.clientY;
      pull.lastAt = event.timeStamp;
      if (event.cancelable) event.preventDefault();
      if (pull.axis === 'y') setDrag({ x: 0, y: Math.max(0, dy) });
      else if (fromSource) {
        // Browsing: the content follows the finger, and stiffens at an end
        // where there is nothing further — a third of the distance, so the
        // stop is felt rather than hit.
        const blocked = (dx > 0 && !neighbours.prev) || (dx < 0 && !neighbours.next);
        setShift(blocked ? dx / 3 : dx);
      } else setDrag({ x: Math.max(0, dx), y: 0 });
    };

    const end = () => {
      const done = pull;
      pull = null;
      if (!done || !done.axis || done.axis === 'none') return;
      const width = sheetRef.current?.offsetWidth || window.innerWidth;
      const height = sheetRef.current?.offsetHeight || window.innerHeight;
      const elapsed = Math.max(1, done.lastAt - done.at);
      setSettling(true);

      if (done.axis === 'y') {
        const travelled = Math.max(0, done.lastY - done.y);
        if (travelled > height * FAR_ENOUGH || travelled / elapsed > FAST_ENOUGH) {
          setDrag({ x: 0, y: height });
          leave();
          return;
        }
        setDrag({ x: 0, y: 0 });
        return;
      }

      const dx = done.lastX - done.x;
      if (fromSource) {
        const dir = dx < 0 ? 1 : -1;
        const target = dir < 0 ? neighbours.prev : neighbours.next;
        if (target && (Math.abs(dx) > width * FAR_ENOUGH || Math.abs(dx) / elapsed > FAST_ENOUGH)) {
          go(dir);
          return;
        }
        setShift(0);
        return;
      }

      // The side arrival's back-pull, unchanged.
      const travelled = Math.max(0, dx);
      if (travelled > width * FAR_ENOUGH || travelled / elapsed > FAST_ENOUGH) {
        setDrag({ x: width, y: 0 });
        window.setTimeout(goBack, 200);
        return;
      }
      setDrag({ x: 0, y: 0 });
    };

    strip.addEventListener('touchstart', begin, { passive: fromSource });
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
  }, [fromSource, browse, neighbours.prev, neighbours.next, go, goBack, leave]);

  const dragging = drag.x > 0 || drag.y > 0;
  const sheetStyle = dragging
    ? { transform: `translate(${drag.x}px, ${drag.y}px)` }
    : undefined;

  return (
    <div
      className={'lay'
        + (fromSource ? ' lay--source' : ' lay--side')
        + (scrolls ? ' lay--scrolls' : '')
        + (arrived ? ' lay--arrived' : '')
        + (leaving ? ' lay--leaving' : '')
        + (settling ? ' lay--settling' : '')
        + (dragging ? ' lay--dragging' : '')}
      ref={layRef}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      /* Where there is an outside — a wide screen, where the sheet is a
         column with the wall showing either side — pressing it closes.
         Only the backdrop itself: a press that started on the sheet is not
         a press outside it. */
      onClick={fromSource ? event => { if (event.target === layRef.current) leave(); } : undefined}
    >
      <div className="lay-sheet" ref={sheetRef} style={sheetStyle}>
        {!fromSource && (
          /* Invisible, full height, a thumb's width. Nothing is drawn in it:
             the affordance is that the gesture is the platform's own, not that
             there is something on screen to find. */
          <div className="lay-edge" ref={edgeRef} aria-hidden="true" />
        )}

        {/* The content, keyed by address so a neighbour arrives fresh and
            plays its entrance from the side it came from. */}
        <div
          key={slug || 'page'}
          className={'lay-content'
            + (enterFrom === 1 ? ' lay-content--from-right' : enterFrom === -1 ? ' lay-content--from-left' : '')
            + (shift !== 0 && !settling ? ' lay-content--held' : '')}
          style={shift !== 0 ? { transform: `translateX(${shift}px)` } : undefined}
          onAnimationEnd={() => setEnterFrom(null)}
        >
          {children}
        </div>

        {/* On a wide screen there is no swipe, so the neighbours are a pair
            of carets at the sheet's edges — and only where there is
            somewhere to go. Stop at the ends, never wrap. */}
        {browse && neighbours.prev && (
          <button type="button" className="lay-step lay-step--prev" onClick={() => go(-1)} aria-label={`Previous: ${neighbours.prev.album}`} title={neighbours.prev.album}>
            <CaretLeft size={18} weight="bold" aria-hidden="true" />
          </button>
        )}
        {browse && neighbours.next && (
          <button type="button" className="lay-step lay-step--next" onClick={() => go(1)} aria-label={`Next: ${neighbours.next.album}`} title={neighbours.next.album}>
            <CaretRight size={18} weight="bold" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
