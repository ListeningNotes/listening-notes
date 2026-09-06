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
// ── Sideways means the neighbours, 2026-09-03 ─────────────────────────────
// Left and right on an entry go to the previous and next record on the wall,
// in the wall's order as it stands — after search, filters and sort, which
// the wall hands over (library/handoff.js). It stops at the ends and never
// wraps. Closing is a pull down from the top of the first screen, Escape or
// back. The edge pull that used to close it is gone: with sideways meaning
// next, a sideways pull that also meant leave would be two answers to one
// gesture.
//
// Moving to a neighbour is router.replace, so the address is always the
// record on screen and back still goes to the wall rather than through every
// record swiped past. The neighbour's first screen is handed over before the
// address changes, so the swap draws at once; the routes either side are
// prefetched too.
//
// ── Going back ────────────────────────────────────────────────────────────
// Always router.back(), never a state flag. The layer is open because the URL
// says so, so the way to close it is to put the URL back — which makes the
// browser's own back button, the keyboard and the swipe all the same gesture,
// and means forward reopens it. A close that only cleared local state would
// leave the address bar pointing at an entry nobody is looking at.

'use client';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { tileBoxOf, neighboursOf, handOffNeighbour, arrivingBySwipe, tookASwipe } from '../../library/handoff';

// How long the sheet takes to grow to the screen. Unhurried, slowing as it
// lands — the same curve the slide used.
const GROW_MS = 420;
// How long the exit of a page turn takes; the stylesheet's settling
// transition on .lay-content is the same number.
const TURN_MS = 240;
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
// default because of the note in styles/entry.css: an entry's phone layout is
// already two scroll containers deep and a third one breaks the other two, so
// the layer has to be genuinely not a scroll container underneath it. That
// reasoning is about the entry, not about the layer — anything arriving here
// that is one ordinary column of content has nothing nested to break and needs
// the sheet to scroll it, or it simply overflows the fixed box and the bottom
// of it cannot be reached.
// ── A place for the header that does not turn with the page ──────────────
// The entry's header — the mark, the pencil and the printer, the lights —
// used to be inside the content, so it slid off the edge with the record and
// slid back in with the next one, and read as the whole page reloading. It
// lives in this slot now: a node the layer makes once, outside the moving
// content, handed down through context. A page that wants its header held
// still renders it into the slot through a portal (see FullPostPage). The
// node exists before the page renders, so the portal has somewhere to go on
// the first render, and it is attached to the layer before paint.
export const LayerHeaderSlot = createContext(null);
export function useLayerHeaderSlot() {
  return useContext(LayerHeaderSlot);
}

// `arrives` is 'tile' (grow from the pressed tile, with a fade where there is
// none — the entry) or 'bottom' (rise from the foot of the screen and sink
// back on a pull — the send page, a form). Both close on the pull down.
export default function LayerEntry({ children, label = 'Entry', scrolls = false, arrives = 'tile' }) {
  const sheetRef = useRef(null);
  const [headerSlot] = useState(() => (typeof document === 'undefined' ? null : document.createElement('div')));
  useLayoutEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet || !headerSlot) return undefined;
    headerSlot.setAttribute('class', 'lay-header');
    sheet.appendChild(headerSlot);
    return () => headerSlot.remove();
  }, [headerSlot]);
  const router = useRouter();
  const pathname = usePathname();

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
  // Three arrivals: by swipe (draw it, nothing else), by tap (grow out of
  // the tile), or neither (fade — a form, an off-wall tile, reduced motion).
  const [arrival] = useState(() => {
    if (typeof document === 'undefined' || arrives === 'bottom') return { swiped: 0, growFrom: null };
    const swiped = tookASwipe();
    if (swiped) return { swiped, growFrom: null };
    if (!slug || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return { swiped: 0, growFrom: null };
    return { swiped: 0, growFrom: tileBoxOf(slug) };
  });
  const rises = arrives === 'bottom';
  const growFrom = arrival.growFrom;

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
  // How far the pull has moved it, in pixels. Held in state rather than
  // written straight to the element, because the closing animation needs to
  // know whether it is starting from rest or from wherever a release left it.
  // The pull down, in pixels, moving the whole sheet.
  const [dragY, setDragY] = useState(0);
  // The sideways position of the content while a finger has it.
  const [shift, setShift] = useState(0);
  const [settling, setSettling] = useState(false);
  const neighbours = slug ? neighboursOf(slug) : { prev: null, next: null };
  // Whether sideways means anything here. Only an entry with a record beside
  // it on the wall; everywhere else — a form, a cold-opened entry — a
  // sideways drag is the browser's, so a row that scrolls sideways can.
  const browses = Boolean(neighbours.prev || neighbours.next);

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
  // A page turn waiting to change the address — see go() below.
  const pendingTurn = useRef(null);
  // Whether this layer is still mounted, for the timer that checks the
  // close actually took.
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const leave = useCallback((fromX = 0) => {
    if (leaving.current) return;
    leaving.current = true;
    window.clearTimeout(pendingTurn.current);
    pendingTurn.current = null;
    // If going back did not remove this layer — nowhere to go back to, which
    // a race with a page turn once produced — it must not stay over the site
    // faded to nothing and swallowing every touch. Half a second after the
    // close should have finished, a layer still alive goes home outright.
    window.setTimeout(() => { if (alive.current) router.replace('/'); }, GROW_MS + 500);
    const sheet = sheetRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const box = slug && !reduced ? tileBoxOf(slug) : null;
    const onScreen = box && box.y > -box.h && box.y < window.innerHeight;
    if (!sheet) { goBack(); return; }
    if (rises) {
      // Back the way it came: down and out, from wherever the pull left it.
      let went = false;
      const back = () => { if (went) return; went = true; goBack(); };
      window.setTimeout(back, GROW_MS);
      const height = sheet.offsetHeight || window.innerHeight;
      const sink = sheet.animate([
        { transform: `translateY(${fromX}px)` },
        { transform: `translateY(${height}px)` },
      ], { duration: GROW_MS * 0.7, easing: GROW_EASE, fill: 'forwards' });
      sink.onfinish = back;
      sink.oncancel = back;
      return;
    }
    // The cover as the entry draws it: the first screen's on a phone, the
    // hero band's on a wide window — whichever is laid out.
    const cover = [...sheet.querySelectorAll('.ln-screen-one-art img, .ln-hero-row .ln-cover img')]
      .find(el => el.getBoundingClientRect().width > 0);
    // Whatever the animations do, the route goes back. A hidden tab freezes
    // every animation on the page and their finish never comes; a close that
    // waited on it would wait forever. So the animation's end and a timer a
    // beat longer both try, and whichever comes first wins.
    let went = false;
    const back = () => { if (went) return; went = true; goBack(); };
    window.setTimeout(back, GROW_MS);
    const fade = sheet.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease-out', fill: 'forwards' });
    if (!onScreen || !cover) {
      fade.onfinish = back;
      fade.oncancel = back;
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
    // `from` was measured with the pull's transform in it, so the copy
    // starts exactly where the cover is; no offset to add.
    const run = flyer.animate([
      { transform: 'translate(0, 0) scale(1, 1)' },
      { transform: `translate(${box.x - from.left}px, ${box.y - from.top}px) scale(${box.w / from.width}, ${box.h / from.height})` },
    ], { duration: GROW_MS * 0.75, easing: GROW_EASE, fill: 'forwards' });
    const done = () => { flyer.remove(); back(); };
    run.onfinish = done;
    run.oncancel = done;
    // The flying copy must not outlive the sheet, animation or not.
    window.setTimeout(() => flyer.remove(), GROW_MS + 100);
  }, [goBack, slug, rises, router]);

  // ── To a neighbour ────────────────────────────────────────────────────────
  // A page turn. The record on screen keeps going the way it was pushed,
  // off the edge, and then the next one comes in from the other side — it
  // is a new layer, so it plays its own entrance (see `arrival`). The
  // address changes after the exit, not with it: the neighbour's page is
  // prefetched and arrives almost at once, and changed together it replaced
  // this layer before the exit had moved a pixel. The first screen is
  // handed over so the neighbour draws at once when it does come.
  // The turn's address change is on a timer, and a close can land inside
  // that window. Left alone, the close goes back to the wall and then the
  // timer fires and replaces the wall's history entry with the next record —
  // after which back has nowhere to go, the faded sheet never leaves, and it
  // sits invisibly over the whole site. So the timer is kept where a close
  // can cancel it.
  const go = useCallback(dir => {
    const target = dir < 0 ? neighbours.prev : neighbours.next;
    if (!target || leaving.current || pendingTurn.current) return;
    handOffNeighbour(target);
    arrivingBySwipe(dir);
    setSettling(true);
    setShift(-dir * (sheetRef.current?.offsetWidth || window.innerWidth));
    pendingTurn.current = window.setTimeout(() => {
      pendingTurn.current = null;
      router.replace(`/entries/${target.slug}`);
    }, TURN_MS);
  }, [neighbours.prev, neighbours.next, router]);
  useEffect(() => () => window.clearTimeout(pendingTurn.current), []);

  useEffect(() => {
    if (neighbours.prev) router.prefetch(`/entries/${neighbours.prev.slug}`);
    if (neighbours.next) router.prefetch(`/entries/${neighbours.next.slug}`);
  }, [neighbours.prev, neighbours.next, router]);

  // Escape closes it, the same as the pull. A full-screen surface with no
  // keyboard way out is a trap for anyone not using a thumb. Left and right
  // arrows browse, where there is somewhere to go.
  useEffect(() => {
    const onKey = event => {
      if (event.key === 'Escape') leave();
      if (event.key === 'ArrowLeft') go(-1);
      if (event.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [leave, go]);

  // The journal is still mounted underneath and would happily scroll behind
  // the layer. Locking the document rather than hiding the journal keeps its
  // scroll position exactly where it was — which is the whole point of doing
  // this as a layer.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('ln-locked');
    return () => root.classList.remove('ln-locked');
  }, []);

  // ── The finger: down to close, sideways to browse ─────────────────────────
  // The whole sheet listens, and decides on the first move. Mostly downward,
  // from the top of the first screen, is the pull: the sheet follows the
  // finger and a release past a fifth of the screen, or a flick, closes it
  // the way Escape does. Mostly sideways is browsing: the content follows
  // the finger, stiffening at an end where there is nothing further, and a
  // release past a fifth of the width, or a flick, goes to the neighbour.
  // Anything else — upward, or downward from further into the entry — is
  // handed to the browser untouched. Deciding once, on the first move, is
  // what stops a diagonal drag doing two things at once.
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
      const touch = event.touches[0];
      pull = { x: touch.clientX, y: touch.clientY, at: event.timeStamp, lastX: touch.clientX, lastY: touch.clientY, lastAt: event.timeStamp, axis: null, top: atTop() };
    };

    const move = event => {
      if (!pull || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const dx = touch.clientX - pull.x;
      const dy = touch.clientY - pull.y;
      if (!pull.axis) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        if (Math.abs(dx) > Math.abs(dy)) pull.axis = browses ? 'x' : null;
        else if (pull.top && dy > 0) pull.axis = 'y';
        if (!pull.axis) { pull = null; return; }
        setSettling(false);
      }
      pull.lastX = touch.clientX;
      pull.lastY = touch.clientY;
      pull.lastAt = event.timeStamp;
      if (event.cancelable) event.preventDefault();
      if (pull.axis === 'y') { setDragY(Math.max(0, dy)); return; }
      // Stiffens at an end: a third of the distance, so the stop is felt
      // rather than hit.
      const blocked = (dx > 0 && !neighbours.prev) || (dx < 0 && !neighbours.next);
      setShift(blocked ? dx / 3 : dx);
    };

    const end = () => {
      const done = pull;
      pull = null;
      if (!done || !done.axis) return;
      const width = sheet.offsetWidth || window.innerWidth;
      const height = sheet.offsetHeight || window.innerHeight;
      const elapsed = Math.max(1, done.lastAt - done.at);
      if (done.axis === 'y') {
        const travelled = Math.max(0, done.lastY - done.y);
        if (travelled > height * FAR_ENOUGH || travelled / elapsed > FAST_ENOUGH) { leave(travelled); return; }
        setSettling(true);
        setDragY(0);
        return;
      }
      const dx = done.lastX - done.x;
      const dir = dx < 0 ? 1 : -1;
      const target = dir < 0 ? neighbours.prev : neighbours.next;
      if (target && (Math.abs(dx) > width * FAR_ENOUGH || Math.abs(dx) / elapsed > FAST_ENOUGH)) { go(dir); return; }
      setSettling(true);
      setShift(0);
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
  }, [leave, go, neighbours.prev, neighbours.next, browses]);

  const pulled = dragY > 0;

  return (
    <div
      className={'lay' + (rises ? ' lay--rises' : arrival.swiped ? ' lay--swiped' : growFrom ? ' lay--grows' : ' lay--fades') + (scrolls ? ' lay--scrolls' : '')
        + (settling ? ' lay--settling' : '') + (pulled ? ' lay--dragging' : '')}
      ref={sheetRef}
      style={pulled ? { transform: `translateY(${dragY}px)` } : undefined}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      {/* The content. It follows a finger sideways, springs back if let go
          early, or leaves off the edge; a neighbour is a new layer and
          enters from the side it was on. */}
      <LayerHeaderSlot.Provider value={headerSlot}>
      <div
        className={'lay-content'
          + (arrival.swiped === 1 ? ' lay-content--from-right' : arrival.swiped === -1 ? ' lay-content--from-left' : '')}
        style={shift !== 0 ? { transform: `translateX(${shift}px)` } : undefined}
      >
        {children}
      </div>
      </LayerHeaderSlot.Provider>

      {/* For a pointer, where there is no swipe: a caret at each edge, and
          only where there is somewhere to go. Stop at the ends, never wrap. */}
      {neighbours.prev && (
        <button type="button" className="lay-step lay-step--prev" onClick={() => go(-1)} aria-label={`Previous: ${neighbours.prev.album}`} title={neighbours.prev.album}>
          <CaretLeft size={18} weight="bold" aria-hidden="true" />
        </button>
      )}
      {neighbours.next && (
        <button type="button" className="lay-step lay-step--next" onClick={() => go(1)} aria-label={`Next: ${neighbours.next.album}`} title={neighbours.next.album}>
          <CaretRight size={18} weight="bold" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
