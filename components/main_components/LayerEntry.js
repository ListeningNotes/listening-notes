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
import { tileBoxOf, neighboursOf, handOffNeighbour, arrivingBySwipe, tookASwipe, growBoxOf, arrivingBack, cameBack, cameAlone } from '../../library/handoff';

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

// ── Asking the page before the sheet goes ─────────────────────────────────
// A pull down closes the layer, and for an entry or a person's page that is
// the whole of it — there is nothing to put away. A listen is not like that.
// Closing one has to write the draft to the server first, and if that write
// fails the sheet must stay exactly where it is with the afternoon still on
// it, which is what the × used to guarantee and what the pull had no way of
// knowing (2026-09-18, when the × came off: "swiping down from this screen
// ends sessions").
//
// So the page registers what has to happen first. Return false — or resolve
// false — and the sheet does not go. Anything else and it does. Nothing that
// does not call this is affected: the pull closes as directly as it ever did.
export const LayerLeaving = createContext(null);
export function useBeforeLeaving(fn) {
  const holdRef = useContext(LayerLeaving);
  const latestRef = useRef(fn);
  // In an effect, not in the render: a ref written during render is the one
  // thing react-hooks/refs refuses, and the handler is only ever read later,
  // from the layer, so a frame's delay cannot matter.
  useEffect(() => { latestRef.current = fn; }, [fn]);
  useEffect(() => {
    if (!holdRef) return undefined;
    // Through a ref, so re-registering on every render of a page whose state
    // changes constantly does not churn the layer.
    holdRef.current = (...args) => latestRef.current?.(...args);
    return () => { holdRef.current = null; };
  }, [holdRef]);
  // Whether there is a layer at all. The session is also a page of its own —
  // opened cold from a bookmark or a home-screen icon, with no sheet around it
  // and so no pull to close — and it has to know, because it is then the one
  // that has to provide a way out.
  return !!holdRef;
}

// `arrives` is 'tile' (grow from the pressed tile, with a fade where there is
// none — the entry) or 'bottom' (rise from the foot of the screen and sink
// back on a pull — the send page, a form). Both close on the pull down.
//
// `over` is which page of the open book the layer opens on, on a desk
// (2026-09-13, rewritten 2026-09-15). 'journal' is the right page — an entry,
// and a listen: the rule of the layout is that the right page is what you are
// reading or writing, and the spine stays exactly where it is while you do.
// 'spine' is the left one — the inbox, the address book, a person, a report,
// Settings — a shallow stack over the spine's own width, in from the left and
// out the same way, so looking something up never disturbs a session on the
// right. Left out, the layer is the whole screen; nothing uses that on a desk
// any more, and /get and the printer are the pages that still could.
// On a phone `over` changes nothing: the stylesheet reads it above 769px only
// (.lay--over-* in entry.css); this file does the leaving and measures the
// growth from the sheet's own corner.
export default function LayerEntry({ children, label = 'Entry', scrolls = false, arrives = 'tile', over = null }) {
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
    if (typeof document === 'undefined') return { swiped: 0, growFrom: null };
    // Returning to a sheet that was under another: draw it at rest. Read
    // first, before the arrival kind, because it applies to any of them.
    if (cameBack()) return { swiped: 0, growFrom: null, still: true };
    // Spent here, on the way in, whatever else this arrival turns out to be:
    // an entry opened from a place that does not browse has no neighbours.
    const alone = cameAlone();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (arrives === 'bottom') return { swiped: 0, growFrom: null, alone };
    const swiped = tookASwipe();
    if (swiped) return { swiped, growFrom: null, alone };
    if (reduced) return { swiped: 0, growFrom: null, alone };
    // An entry grows out of its tile; anything else grows out of whatever
    // declared this address in data-grows (a row, a face) — see handoff.js.
    return { swiped: 0, growFrom: slug ? tileBoxOf(slug) : growBoxOf(pathname), alone };
  });
  const rises = arrives === 'bottom';
  const growFrom = arrival.growFrom;

  useLayoutEffect(() => {
    const sheet = sheetRef.current;
    const box = growFrom;
    if (!sheet || !box) return;
    const W = sheet.offsetWidth || window.innerWidth;
    const H = sheet.offsetHeight || window.innerHeight;
    // Where the sheet rests. The whole window, usually, so this is 0,0 — but
    // a desk page on a desk is a panel at the right edge, and the tile's
    // corner has to be measured from the panel's, not the window's.
    const at = sheet.getBoundingClientRect();
    const run = sheet.animate([
      // Opaque from the first frame. It began at half opacity, and for the
      // length of the growth the wall showed through a sheet that was also
      // fading — two things happening where one is the whole idea.
      { transformOrigin: '0 0', transform: `translate(${box.x - at.left}px, ${box.y - at.top}px) scale(${box.w / W}, ${box.h / H})`, borderRadius: '14px' },
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
  // No neighbours when this was opened from somewhere that does not browse —
  // the ID pane's pinned record, a cover in one of its count windows. The
  // wall's order is still there for the wall; this arrival simply does not
  // read it (handoff.js, arrivingAlone).
  const neighbours = slug && !arrival.alone ? neighboursOf(slug) : { prev: null, next: null };
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
  // ── The keyboard, and the sheet that has to fit round it ──────────────────
  // A sheet is `position: fixed; inset: 0`, which on iOS means the *layout*
  // viewport — the whole screen, including the half a keyboard is standing
  // on. So with a field focused, the bottom of the sheet is behind the
  // keyboard, and iOS answers that by scrolling the layout viewport to bring
  // the field into view: the sheet goes up, and its sticky header with it,
  // off the top of the screen. Miyel, 2026-09-18: "the moment that you click
  // on the text, everything moves out of view… you lose the beautiful track
  // list, you lose the beacon."
  //
  // visualViewport says exactly where the part you can see is. The sheet is
  // inset to match it, so it *is* the visible window: the header sticks to
  // the top of what you are looking at, the body scrolls inside, and nothing
  // has anywhere to scroll off to.
  useEffect(() => {
    const vv = window.visualViewport;
    const sheet = sheetRef.current;
    if (!vv || !sheet) return undefined;

    // The insets, every time, with no test for whether a keyboard is up.
    // They are the difference between the layout viewport and the part of it
    // you can see, which is zero at every moment nothing is covering the
    // screen — so applying them always is the same as applying them never,
    // right up until it matters.
    //
    // It was behind a threshold on window.innerHeight for an hour, and that
    // is what failed on Miyel's phone: Safari holds innerHeight still through
    // a keyboard, a home-screen install does not always, and where it shrinks
    // with the keyboard the difference is zero and nothing fires. The layout
    // should not depend on guessing.
    const sync = () => {
      const room = document.documentElement.clientHeight || window.innerHeight;
      sheet.style.setProperty('--lay-lift', `${Math.round(vv.offsetTop)}px`);
      sheet.style.setProperty('--lay-bottom', `${Math.max(0, Math.round(room - vv.offsetTop - vv.height))}px`);
    };

    // And `data-typing` — which is only furniture standing down, never
    // layout — off the focus, because that is the thing it is actually about.
    //
    // A tick behind the event, deliberately. `focusin` fires while the focus
    // is still moving and `document.activeElement` can still be the element
    // being left — reading it there said BODY with a textarea plainly
    // focused. `focusout` has the same problem from the other end: the next
    // element does not have it yet. A zero timeout lets it settle, and
    // nothing here is urgent enough to care.
    let settle = null;
    const mark = () => {
      clearTimeout(settle);
      settle = setTimeout(() => {
        const el = document.activeElement;
        const into = el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.isContentEditable);
        sheet.toggleAttribute('data-typing', Boolean(into));
      }, 0);
    };

    sync();
    mark();
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    document.addEventListener('focusin', mark);
    document.addEventListener('focusout', mark);
    return () => {
      clearTimeout(settle);
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
      document.removeEventListener('focusin', mark);
      document.removeEventListener('focusout', mark);
      sheet.style.removeProperty('--lay-lift');
      sheet.style.removeProperty('--lay-bottom');
      sheet.removeAttribute('data-typing');
    };
  }, []);

  const leaving = useRef(false);
  // The page's "before you go", if it registered one, and whether it is
  // being asked right now.
  const held = useRef(null);
  const asking = useRef(false);
  // A page turn waiting to change the address — see go() below.
  const pendingTurn = useRef(null);
  // Whether this layer is still mounted, for the timer that checks the
  // close actually took.
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const goAway = useCallback((fromX = 0) => {
    if (leaving.current) return;
    leaving.current = true;
    // Whatever this closes onto is being returned to, not arrived at.
    arrivingBack();
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
    // A spine page on a desk is a sheet over the left page, and leaves the
    // way it came: out to the left. The phone's shape is the rise below.
    if (rises && over === 'spine' && window.matchMedia('(min-width: 769px)').matches) {
      let went = false;
      const back = () => { if (went) return; went = true; goBack(); };
      window.setTimeout(back, GROW_MS);
      const width = sheet.offsetWidth || window.innerWidth;
      const slide = sheet.animate([
        { transform: 'none' },
        { transform: `translateX(${-width}px)` },
      ], { duration: GROW_MS * 0.7, easing: GROW_EASE, fill: 'forwards' });
      slide.onfinish = back;
      slide.oncancel = back;
      return;
    }
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
  }, [goBack, slug, rises, over, router]);

  // ── What the page wants done first ───────────────────────────────────────
  // Every way out goes through here — the pull, Escape, the back caret — so a
  // page that registered a "before you go" gets asked once, whichever of them
  // was used. See useBeforeLeaving above.
  //
  // The answer may be a promise, because a listen's is a write to the server,
  // and a false one means the sheet stays put with everything still on it.
  // `asking` is not `leaving`: the sheet has not started going anywhere yet,
  // and a second pull while the first is still being written must not set
  // another save running.
  const leave = useCallback((fromX = 0) => {
    if (asking.current || leaving.current) return;
    const first = held.current?.();
    if (first && typeof first.then === 'function') {
      asking.current = true;
      first.then(ok => {
        asking.current = false;
        // Asked and answered: it does not get asked again on the way out.
        if (ok !== false) { held.current = null; goAway(fromX); }
      }, () => { asking.current = false; });
      return;
    }
    if (first === false) return;
    held.current = null;
    goAway(fromX);
  }, [goAway]);

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

  // The browser's own back — a swipe from the edge, the toolbar — closes
  // this layer without passing through leave(), so it says the same thing
  // the moment the history moves: what mounts next is returned to.
  useEffect(() => {
    const noteBack = () => arrivingBack();
    window.addEventListener('popstate', noteBack);
    return () => window.removeEventListener('popstate', noteBack);
  }, []);

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
      // Printing is a different mode: its sideways swipe turns the ground
      // under the card, and the pull down would take the flyer away.
      // Correcting is another, 2026-09-14: the row of faces under Sent by
      // scrolls sideways, and a thumb going through it must not land on the
      // next record with the draft gone. Nothing sideways or downward is
      // the sheet's while a correction is open; Save and Cancel are.
      //
      // `.ln-busy` is the same rule for a panel that is not a correction,
      // added 2026-09-17 when Credit became its own tool and took the row of
      // faces out of the correction with it — which quietly took it out from
      // behind this guard as well, so scrolling through your friends browsed
      // to the next record instead (Miyel, on the first real try). It covers
      // the send sheet too. The lesson is the general one: this list is not
      // about *editing*, it is about anything of this entry's own being open
      // over it, and a new one has to say so here.
      //
      // And not while something is being written into, 2026-09-18. A swipe
      // down is how everybody puts a keyboard away, and here it was taking
      // the whole session with it — so the only way out of a field was the
      // tick on the keyboard's own bar, which is nobody's first instinct.
      //
      // Asked of the focus rather than of the viewport. It was `typing`, the
      // flag the keyboard measurement sets, and that flag turned out to
      // depend on a number iOS does not report the same way everywhere — so
      // on the one device it mattered on, the guard was never armed. What has
      // focus is not a measurement. If a field has it, down belongs to the
      // keyboard, and that is true whatever the viewport says.
      // And not off the stars, for the reason the track screen gives: a drag
      // that begins on a rating belongs to the rating. A diagonal one would
      // otherwise start closing the sheet under it.
      if (event.target?.closest?.('[role="slider"]')) { pull = null; return; }
      const writing = document.activeElement;
      const intoText = writing && (
        writing.tagName === 'TEXTAREA'
        || writing.tagName === 'INPUT'
        || writing.isContentEditable
      );
      if (event.touches.length !== 1 || intoText
        || sheet.querySelector('.ln-printing, .ln-editing, .ln-busy')) { pull = null; return; }
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
      className={'lay' + (arrival.still ? ' lay--still' : rises ? ' lay--rises' : arrival.swiped ? ' lay--swiped' : growFrom ? ' lay--grows' : ' lay--fades') + (scrolls ? ' lay--scrolls' : '')
        + (over ? ` lay--over-${over}` : '') + (settling ? ' lay--settling' : '') + (pulled ? ' lay--dragging' : '')}
      ref={sheetRef}
      style={pulled ? { transform: `translateY(${dragY}px)` } : undefined}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      {/* The way back, for a pointer. A phone closes a layer with the pull
          down and the browser's own back; a desk with the journal in its
          dock has neither, and Escape alone is a way out nobody is told
          about (Miyel, 2026-09-13). First in the sheet, in a slot that
          sticks to the sheet's top as it scrolls, so it sits at the sheet's
          own corner whatever the sheet is — the whole screen, the journal's
          column, the desk's panel — and moves with it while it grows or is
          pulled. The stylesheet draws it only above 769px, never on a phone,
          where the layer has no close button by decision. */}
      <div className="lay-back-slot">
        <button type="button" className="lay-back" onClick={() => leave()} aria-label="Close" title="Close">
          <CaretLeft size={18} weight="bold" aria-hidden="true" />
        </button>
      </div>

      {/* The content. It follows a finger sideways, springs back if let go
          early, or leaves off the edge; a neighbour is a new layer and
          enters from the side it was on. */}
      <LayerLeaving.Provider value={held}>
      <LayerHeaderSlot.Provider value={headerSlot}>
      <div
        className={'lay-content'
          + (arrival.swiped === 1 ? ' lay-content--from-right' : arrival.swiped === -1 ? ' lay-content--from-left' : '')}
        style={shift !== 0 ? { transform: `translateX(${shift}px)` } : undefined}
      >
        {children}
      </div>
      </LayerHeaderSlot.Provider>
      </LayerLeaving.Provider>

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
