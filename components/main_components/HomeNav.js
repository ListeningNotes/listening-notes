// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/HomeNav.js
// The cross. Two panes side by side, each scrolling on its own.
//
//        [ You ]  ←→  [ Home ]
//                        ↓
//                     Journal
//
// Sideways is you. Down is the records.
//
// ── Down is a cover, not a gesture ──────────────────────────────────────────
// The rule the whole shape rests on, 2026-09-15. Down means cover-then-
// contents, and exactly two things on this site have that shape: the beacon,
// which is the journal's cover, and an entry's card, which is the entry's.
// Both are the thing, and then what is inside it.
//
// The card and the desk are not covers of anything. They are pages, and pages
// scroll. So they have no second floor, nothing to arrive at, and no down
// caret — a vertical drag there is ordinary scrolling and nothing has to
// arbitrate between arriving and scrolling. That is most of the axis problem
// gone, and it went by deciding what down *means* rather than by tuning a
// scroller.
//
// ── Why two panes and not three ─────────────────────────────────────────────
// Three made sideways mean two different things: left was about you, right
// was your tools, both you, in opposite directions. One pane that turns
// between the two is one idea. Signed out it turns between the keeper's card
// and the colophon, so the pitch survives without a pane of its own.
//
// The turn is a labelled control, never a hidden gesture, and which face you
// left it on is remembered per browser.
//
// ── Why a rail and not routes ───────────────────────────────────────────────
// The panes are one page. They have to be: a swipe that triggered a navigation
// would unmount the pane you were leaving, throw away where you had scrolled
// to in it, and re-fetch it on the way back. Everything about the gesture —
// that it is continuous, that it is reversible, that the pane you return to is
// where you left it — depends on both being mounted at once. So this is a
// horizontal scroll container with two children and the browser does the
// physics. Both faces of the turning pane are mounted too, for the same
// reason and one more: the feed goes on updating and the inbox goes on
// counting while you are looking at the card.
//
// Entries are the exception and are real routes. Tapping a cover leaves the
// cross, which is correct: an entry has an address you can send somebody, and
// a pane does not.
//
// ── Why the carets ──────────────────────────────────────────────────────────
// A swipe is invisible. Nobody has ever opened a page and known there was more
// of it sideways, and a navigation nobody discovers does not exist. Each
// direction that has something in it is marked, the press does what the swipe
// does, and the press is how the swipe gets learned.
//
// The down caret is drawn by measurement rather than by being told — a pane is
// deep if its scroller overflows — and then only on the pane that has a cover.
// That is what makes a fresh copy correct for free: an install with no beacon
// has no first screen to leave, so nothing points down at it.
//
// ── Desktop: an open book ───────────────────────────────────────────────────
// The same two panes, both visible. The turning one is the spine, a quarter of
// the window, with the turn as a switch centred over it; the journal takes the
// rest and does not move when the spine turns. The rule underneath is the same
// one stated differently: the right page is what you are reading or writing,
// so an entry opens there and so does a listen, while the inbox, the address
// book, a person and Settings open on the spine. Nothing here is a second
// layout — the stylesheet does all of it above 769px.

'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowsLeftRight } from '@phosphor-icons/react';
import { foldKey, useListeningBeacon } from '../../hooks/useListeningBeacon';
import { useSpineWidth } from '../../hooks/useSpineWidth';
import { useTheme } from './Lightswitch';
import { useBookplate } from './Bookplate';
import ListeningBeacon from './ListeningBeacon';
import Journal from './Journal';
import EdgeCaret from './EdgeCaret';
import Footer from './Footer';
import About from './About';
import Dashboard from './Dashboard';
import Pitch from './Pitch';

// You, then home. Home is the one you land on, which is why it is not index
// 0 — the rail is scrolled to it on mount before the first paint. A visitor
// lands there too: they arrived from a card, a code or a link that already
// said whose journal this is, so the record is the more interesting thing to
// meet and the person is one swipe away.
const HOME = 1;

// Which face the spine was left on, per browser. Not a setting and not on the
// settings row: it is where somebody put their own left-hand page down, the
// way a composition book falls open at the page you were last on, and it has
// no business travelling to another device.
const FACE_KEY = 'ln-spine-face';

// How long the leaf takes to move. Matched to the entry layer's arrival (0.42s
// there, and the same decelerating curve) rather than picked: the whole site
// should move in one language, and a pane that moves faster than a record
// arrives reads as a different piece of software. The number is stated in
// nav.css too, on the transition; if one moves the other has to.
const TURN_MS = 400;

// What each pane is, as a mark and as a sentence, used to live here for the
// carets at the foot. The band names all three outright now and owns its own
// list (Footer.js); the panes carry their labels in the markup.

// The two sides, for the switch. Card either way — signed in it is yours,
// signed out it is the keeper's, and it is the same face. Desk or About for
// the other side.
// `opens` is what the control says, and it says a verb now: the pages slide
// past each other rather than turning over, so the thing you are doing is
// opening the other one (Miyel, 2026-09-15). The control is set in small caps,
// which is what lets OPEN ABOUT read as a page's name rather than a sentence
// with a word missing.
function paneFaces(authed) {
  return [
    { key: 'card', word: 'Card', opens: 'Open card', label: 'About this journal' },
    {
      key: 'desk',
      word: authed ? 'Desk' : 'About',
      opens: authed ? 'Open desk' : 'Open about',
      label: authed ? 'Your desk' : 'About this software',
    },
  ];
}

// Smooth, unless the reader has asked for less. A page that slides sideways
// under someone who has turned motion off is the one place on this site where
// the animation *is* the navigation, so it is not removed — it is made instant,
// which still lands in the right place.
function ease() {
  if (typeof window === 'undefined') return 'auto';
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

// Where a pane's second floor begins: the top of its second .hn-floor when it
// has floors, one screen down when it does not (the no-beacon copy's wall).
function secondFloorTop(pane) {
  const floors = pane.querySelectorAll(':scope > .hn-floor, :scope > * > .hn-floor');
  return floors.length > 1 ? floors[1].offsetTop - floors[0].offsetTop : pane.clientHeight;
}

export default function HomeNav() {
  const { cover_name, pinned_entry_id, beacon_available } = useBookplate();
  const { theme, toggle: toggleTheme } = useTheme();
  const { isLive, recentAlbums } = useListeningBeacon();
  // How wide the spine is on a desk, and the grip that changes it. The hook
  // writes the width onto the document's root as --spine-w, which the
  // stylesheet reads above 769px and ignores below it.
  const spine = useSpineWidth();

  // ── What the cross asks for ───────────────────────────────────────────────
  // Four requests, made once here rather than three times in three panes.
  // Three of the four are read by more than one of them: the entries by the
  // wall and by the recent row, the stamps by the card, the wristband by every
  // pane that has an owner's half. The note is not among them — it is prose,
  // and it is already in the HTML by the time this runs (see app/page.js).
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  // Whether the person looking at this is the person who writes it. Not a
  // permission check — the writing side guards itself — just what decides
  // which of the two right-hand panes is drawn.
  const [authed, setAuthed] = useState(false);
  // How many submissions and comments are sitting unread. Null until asked, so
  // the line can hold its place without flashing a zero on the way.
  const [waiting, setWaiting] = useState(null);
  // The counts printed on the card. Null until they land, so it holds the
  // shape of its number rows rather than flashing zeros into them.
  const [stamps, setStamps] = useState(null);

  useEffect(() => {
    fetch('/api/entries')
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data.entries || []);
        setEntries(list);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Fetched on mount rather than on first swipe: it is a few hundred bytes,
  // and a card that assembles itself while you are looking at it is a worse
  // card than one that was already printed. A failure leaves stamps null and
  // the card prints blank rules.
  useEffect(() => {
    fetch('/api/public/stamps')
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setStamps(d))
      .catch(() => {});
  }, []);

  // Asking here rather than only on the writing pages does two jobs. It decides
  // whether the right pane is the desk or the pitch — and because
  // /api/auth/check renews an ageing wristband, simply opening the journal
  // keeps the key alive. On a home screen, where there is no address bar to
  // sign in from, that is what stops the door quietly locking itself.
  // Only asked once the wristband is confirmed — the endpoint answers 401 to
  // anyone else, and a failed request on every public visit is noise in the
  // log for no reason.
  const askWaiting = useCallback(() => {
    fetch('/api/waiting')
      .then(r => (r.ok ? r.json() : null))
      .then(w => w && setWaiting(w))
      .catch(() => {});
  }, []);
  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.json())
      .then(d => {
        setAuthed(!!d.authed);
        if (d.authed) askWaiting();
      })
      .catch(() => {});
  }, [askWaiting]);
  // The lock on the pitch pane opened. The pane it is on becomes the desk,
  // with nothing reloaded: the wristband was just issued and the cross never
  // unmounted.
  const letIn = useCallback(() => {
    setAuthed(true);
    askWaiting();
  }, [askWaiting]);

  // ── Which face the spine is showing ───────────────────────────────────────
  // 'card' or 'desk'. Signed out the desk side is the colophon, which is the
  // same side of the same leaf, so one remembered answer covers both states —
  // an owner who signs out finds the page they left open, with the public
  // thing on it.
  //
  // The server has no browser to ask and draws the card. What was remembered
  // goes back before paint rather than after, so the first render matches the
  // HTML the server sent — the class changes in the same frame and nothing
  // flashes through the wrong face on the way.
  //
  // Both shapes read this. It was a desktop-only class when the spine was the
  // desktop's alone; the phone has the same leaf now and turns it the same way.
  const [face, setFace] = useState('card');
  useLayoutEffect(() => {
    try {
      if (window.localStorage.getItem(FACE_KEY) === 'desk') setFace('desk');
    } catch { /* storage off — the card is the answer, every visit */ }
  }, []);
  // ── The turn itself ───────────────────────────────────────────────────────
  // The face changes at once; what takes four hundred milliseconds is the two
  // pages sliding. The stylesheet does the whole motion off `hn--face-*`, so
  // this flag says one thing only: both pages are on screen at the moment, let
  // the hidden one be seen. Which direction, and how far along, is the
  // transition's business.
  //
  // It is a moment and not a mode. Nothing waits for it, nothing is disabled
  // during it, and pressing the control again mid-slide simply sends the pages
  // back — a transition on a translate reverses from wherever it has got to,
  // which is the whole reason the motion is a transition and not keyframes.
  const [turning, setTurning] = useState(false);
  const turnTimer = useRef(null);
  useEffect(() => () => clearTimeout(turnTimer.current), []);
  const turnPane = useCallback(() => {
    const next = face === 'card' ? 'desk' : 'card';
    try { window.localStorage.setItem(FACE_KEY, next); } catch { /* not remembered */ }
    setFace(next);
    setTurning(true);
    // Restarted rather than left running, so an interrupted slide does not put
    // the page it is bringing back out of sight halfway through.
    clearTimeout(turnTimer.current);
    turnTimer.current = setTimeout(() => setTurning(false), TURN_MS);
  }, [face]);

  const railRef = useRef(null);

  // The scrollers. The home pane has one; the turning pane has two, one per
  // face, because a face has to keep where it was scrolled to while the other
  // one is showing — and because a single scroller round both would be as tall
  // as the taller of them whichever you were looking at.
  //
  // What the rest of this file wants is "the pane's scroller", so the turning
  // pane hands over whichever face is up, answered when asked rather than
  // once. `face` goes into a ref for that: a getter closing over the state
  // would answer with whatever face was current when the object was made.
  const cardRef = useRef(null);
  const deskRef = useRef(null);
  const homeRef = useRef(null);
  const faceNow = useRef('card');
  // In rail order: the ID, the beacon, the desk. There were two of these and a
  // getter that handed over whichever face of the left page was up; the two
  // faces are panes in their own right on a phone now, so each has its own
  // scroller and there is nothing to choose between. On a desk they are still
  // the spine's two pages and only one is on screen, which costs nothing here
  // — a hidden scroller measures zero and reports nothing.
  const paneRefs = useRef([cardRef, homeRef, deskRef]).current;
  // Kept in step on every render, and read by the getter above. It has to be
  // set here rather than beside the state it mirrors: the ref is declared in
  // this block, and writing to it earlier in the body is the dead zone.
  faceNow.current = face;
  // The wall's own scroller on a phone — floor two of the centre pane. On a
  // desk it is a plain wrapper and the pane column is what scrolls, so the
  // thing handed to Journal answers the question when asked rather than once:
  // whichever of the two is a scroller right now. Made once so the effects
  // downstream that list it as a dependency do not re-run every render.
  const floorRef = useRef(null);
  const wallScroller = useRef({
    get current() {
      const inner = floorRef.current;
      if (inner && getComputedStyle(inner).overflowY === 'auto') return inner;
      return paneRefs[HOME].current;
    },
  }).current;

  const [pane, setPane] = useState(HOME);
  // Whether anything is moving right now. The controls sit over the page
  // rather than beside it, so while a wall of covers is going past underneath
  // they are three marks on top of somebody's album art. They fade out on the
  // first scroll event and come back a beat after the last one, which is the
  // moment a reader stops and might want them.
  const [busy, setBusy] = useState(false);
  const settle = useRef(null);
  // Whether each pane has anything below its first screen, and whether you are
  // already down there. Both are measured, never declared.
  const [deep, setDeep] = useState([false, false, false]);
  const [down, setDown] = useState([false, false, false]);

  // Called by every scroller on the page, horizontal and vertical alike.
  const stir = useCallback(() => {
    setBusy(true);
    clearTimeout(settle.current);
    settle.current = setTimeout(() => setBusy(false), 620);
  }, []);
  useEffect(() => () => clearTimeout(settle.current), []);

  // ── Landing on the centre ─────────────────────────────────────────────────
  // Before paint, not after. A rail starts at scrollLeft 0, which is the About
  // pane, so an effect that runs after the first frame shows the card and then
  // slides away from it — the page would appear to start somewhere it does not.
  // On desktop the rail is a grid with nothing to scroll, so this clamps to 0
  // and costs nothing.
  // /?edit=card lands on the card instead, with its pencil up — see About.
  //
  // /?q=name lands on the wall, already filtered. An artist's name in a review
  // links here, and the answer to "what else of theirs is in this journal" is
  // the journal — scrolled down to the covers, with the search field showing
  // the name — rather than a separate page that opens over the one you were
  // reading and leaves a stack of them behind you. The centre pane is one
  // screen of beacon and then the wall, so one screen down is the wall's top;
  // set before paint like the rail, for the same reason.
  useLayoutEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const params = new URLSearchParams(window.location.search);
    const toCard = params.get('edit') === 'card';
    el.scrollLeft = el.clientWidth * (toCard ? 0 : HOME);
    if (params.get('q')) {
      const home = paneRefs[HOME].current;
      if (home) home.scrollTop = secondFloorTop(home);
    }
  // paneRefs is a stable array of refs; listing it would re-run this on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Which pane is on screen, read off the scroll position rather than set by
  // whatever moved it. A swipe and a caret press both end up here, so there is
  // one answer to "where am I" and it is the browser's.
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const onScroll = () => {
      const width = el.clientWidth || 1;
      setPane(Math.round(el.scrollLeft / width));
      stir();
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [stir]);

  // ── Measuring depth ───────────────────────────────────────────────────────
  // A pane is deep when its scroller overflows. Re-measured whenever the thing
  // inside it could have changed size — entries landing, the card's portrait
  // loading, the window turning sideways — because a caret that appears a
  // second late is worse than one that was never there.
  // Only the home pane can be deep. The turning pane overflows all the time —
  // it is a page — and a down caret on it would be promising an arrival that
  // this layout deliberately does not have. Down is a cover, and the card is
  // not one.
  const measure = useCallback(() => {
    setDeep(paneRefs.map((ref, i) => {
      if (i !== HOME) return false;
      const el = ref.current;
      return !!el && el.scrollHeight - el.clientHeight > 8;
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    paneRefs.forEach(ref => {
      if (ref.current) {
        observer.observe(ref.current);
        // The scroller and everything in it. The scroller changes with the
        // window and its contents change with the data, so watching only one
        // of the two misses half the cases that move the caret — and watching
        // only the first child now watches the crown, which is a fixed height
        // and never moves anything.
        for (const child of ref.current.children) observer.observe(child);
      }
    });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure, entries, loading, authed, stamps, face]);

  // Whether each pane is already scrolled. The down caret is a way in, not a
  // permanent fixture — once you are in the pane it has done its job and the
  // one thing it must not do is keep pointing down while you are at the bottom.
  useEffect(() => {
    const cleanups = paneRefs.map((ref, i) => {
      const el = ref.current;
      if (!el) return null;
      const onScroll = () => {
        stir();
        const moved = el.scrollTop > 8;
        setDown(prev => {
          if (prev[i] === moved) return prev;
          const next = [...prev];
          next[i] = moved;
          return next;
        });
      };
      el.addEventListener('scroll', onScroll, { passive: true });
      return () => el.removeEventListener('scroll', onScroll);
    });
    return () => cleanups.forEach(fn => fn && fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stir]);

  // ── TEMPORARY: the viewport readout ────────────────────────────────────
  // Written straight to the node rather than into state, so it can re-read on
  // every resize and on a beat after load without a render per sample.
  const measureRef = useRef(null);
  useLayoutEffect(() => {
    const node = measureRef.current;
    if (!node) return undefined;
    const unit = value => {
      const probe = document.createElement('div');
      probe.style.cssText = `position:fixed;visibility:hidden;height:${value}`;
      document.body.appendChild(probe);
      const h = getComputedStyle(probe).height;
      probe.remove();
      return Math.round(parseFloat(h));
    };
    const read = when => {
      const foot = document.querySelector('.hn-foot');
      const hn = document.querySelector('.hn');
      const home = document.querySelector('.hn-pane--home');
      const f = foot ? foot.getBoundingClientRect() : null;
      node.textContent = [
        `${when}`,
        `standalone ${window.navigator.standalone === undefined ? 'n/a' : window.navigator.standalone}`,
        `display-mode ${window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser'}`,
        `screen ${window.screen.height}  inner ${window.innerHeight}`,
        `visual ${window.visualViewport ? Math.round(window.visualViewport.height) : '?'} off ${window.visualViewport ? Math.round(window.visualViewport.offsetTop) : '?'}`,
        `dvh ${unit('100dvh')} lvh ${unit('100lvh')} svh ${unit('100svh')} vh ${unit('100vh')}`,
        `safe top ${unit('env(safe-area-inset-top)')} bottom ${unit('env(safe-area-inset-bottom)')}`,
        `.hn h${hn ? Math.round(hn.getBoundingClientRect().height) : '?'}  home h${home ? Math.round(home.getBoundingClientRect().height) : '?'} scroll ${home ? home.scrollTop : '?'}`,
        `band pos ${foot ? getComputedStyle(foot).position : '?'} top ${f ? Math.round(f.top) : '?'} bottom ${f ? Math.round(f.bottom) : '?'}`,
        `gap vs viewport ${f ? Math.round(window.innerHeight - f.bottom) : '?'}`,
        `gap vs SCREEN ${f ? Math.round(window.screen.height - f.bottom) : '?'}`,
      ].join('\n');
    };
    read('on load');
    const later = setTimeout(() => read('1s after load'), 1000);
    const onResize = () => read('after resize');
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    return () => {
      clearTimeout(later);
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, []);

  function goTo(index) {
    const el = railRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: ease() });
  }

  // Back to the top of whichever pane you are in. The band across the top of a
  // scrolled pane is the tap target, which is the one gesture a phone already
  // teaches — the status bar has meant "back to the top" for fifteen years, and
  // this is the strip directly under it.
  //
  // Only while the pane is scrolled: at the top there is nothing to go back to,
  // and a dead tap zone across the cover is worse than no tap zone.
  function goUp(index) {
    const el = paneRefs[index].current;
    if (!el) return;
    el.scrollTo({ top: 0, behavior: ease() });
    // The wall goes back to its own top too, once the pane has finished
    // moving — as the entry's reading does when you return to the record — so
    // the next drop lands on the first row rather than wherever you left off.
    if (index === HOME && floorRef.current) {
      window.setTimeout(() => { if (floorRef.current) floorRef.current.scrollTop = 0; }, 600);
    }
  }

  // To the second floor where there is one — its own top, not one viewport
  // down, because a first floor that had to grow past the screen on a short
  // phone puts the second one lower than that.
  function goDown(index) {
    const el = paneRefs[index].current;
    if (!el) return;
    el.scrollTo({ top: secondFloorTop(el), behavior: ease() });
  }

  // ── The one row that sits over all three panes ────────────────────────────
  // The lights, and nothing else. There was a small mark in the corner here
  // too, fading in as the crown scrolled away, and one mark on screen at a time
  // was the argument for it — but the honest count is that the crown already
  // is the mark, on every pane, and a second one in the corner is a second one
  // whether or not the two are ever visible together. The band behind this row
  // stays: it is what stops the wall of covers scrolling through the toggle.
  //
  // Fixed above the rail rather than repeated inside each pane: it does not
  // belong to any of them, and three copies of it would slide past each other
  // during a swipe.
  // The mark, drawn twice from one source: large at the head of every pane
  // (the crown), and small in the bar once a pane has scrolled the crown away.
  // The two are never on screen together, which is what keeps this one mark.
  const mark = className => (
    <svg viewBox="76 96 241 140" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        transform="translate(73.734177, 220.794814)"
        d="M 44.65625 0 C 37.46875 0 31.160156 -1.601562 25.734375 -4.8125 C 20.304688 -8.019531 16.097656 -12.28125 13.109375 -17.59375 C 10.128906 -22.90625 8.640625 -28.773438 8.640625 -35.203125 L 8.640625 -116.21875 L 36.53125 -116.21875 L 36.53125 -33.203125 C 36.53125 -30.546875 37.46875 -28.222656 39.34375 -26.234375 C 41.226562 -24.242188 43.550781 -23.25 46.3125 -23.25 L 77.03125 -23.25 L 77.03125 0 Z M 44.65625 0 "
      />
      <path
        transform="translate(153.915942, 220.794814)"
        d="M 91.96875 2 C 85 2 78.742188 0.476562 73.203125 -2.5625 C 67.671875 -5.613281 63.300781 -9.847656 60.09375 -15.265625 C 56.882812 -20.691406 55.28125 -26.835938 55.28125 -33.703125 L 55.28125 -84.5 C 55.28125 -86.269531 54.835938 -87.875 53.953125 -89.3125 C 53.066406 -90.75 51.90625 -91.910156 50.46875 -92.796875 C 49.03125 -93.679688 47.425781 -94.125 45.65625 -94.125 C 43.882812 -94.125 42.28125 -93.679688 40.84375 -92.796875 C 39.40625 -91.910156 38.269531 -90.75 37.4375 -89.3125 C 36.601562 -87.875 36.1875 -86.269531 36.1875 -84.5 L 36.1875 0 L 8.96875 0 L 8.96875 -82.515625 C 8.96875 -89.484375 10.539062 -95.625 13.6875 -100.9375 C 16.84375 -106.25 21.21875 -110.453125 26.8125 -113.546875 C 32.40625 -116.648438 38.6875 -118.203125 45.65625 -118.203125 C 52.738281 -118.203125 59.046875 -116.648438 64.578125 -113.546875 C 70.109375 -110.453125 74.476562 -106.25 77.6875 -100.9375 C 80.90625 -95.625 82.515625 -89.484375 82.515625 -82.515625 L 82.515625 -31.703125 C 82.515625 -29.929688 82.957031 -28.300781 83.84375 -26.8125 C 84.726562 -25.320312 85.859375 -24.160156 87.234375 -23.328125 C 88.617188 -22.492188 90.144531 -22.078125 91.8125 -22.078125 C 93.582031 -22.078125 95.210938 -22.492188 96.703125 -23.328125 C 98.203125 -24.160156 99.394531 -25.320312 100.28125 -26.8125 C 101.164062 -28.300781 101.609375 -29.929688 101.609375 -31.703125 L 101.609375 -116.21875 L 128.65625 -116.21875 L 128.65625 -33.703125 C 128.65625 -26.835938 127.050781 -20.691406 123.84375 -15.265625 C 120.632812 -9.847656 116.265625 -5.613281 110.734375 -2.5625 C 105.203125 0.476562 98.945312 2 91.96875 2 Z M 91.96875 2 "
      />
      <circle
        cx="297.0547"
        cy="216.71875"
        r="14.1328"
        className={'hn-mark-dot' + (isLive ? ' hn-mark-dot--live' : '')}
      />
    </svg>
  );

  // The light switch is back in this row and only on the beacon (Miyel,
  // 2026-09-15). It left for Settings on the argument that it is a preference
  // and not an action, which is true and cost a visitor any way of changing
  // it — Settings is behind the password. On the beacon it is public again,
  // and on the one pane where it is not sitting over somebody's reading. The
  // stylesheet hides it on the turning pane; on a desk this row is over the
  // journal, which is the beacon, so it simply stays.
  const header = (
    <div className={'hn-bar' + (down[pane] ? ' hn-bar--scrolled' : '')}>
      {down[pane] && (
        <button
          type="button"
          className="hn-totop"
          onClick={() => goUp(pane)}
          aria-label="Back to the top"
        />
      )}
      {/* The small mark. On a phone, only while the crown has scrolled away
          (the stylesheet hides it until then, so the crown and this are
          never on screen together). On a desk there is no crown: this is
          the mark, centred over the band the way every other page's row
          carries it, and the bar around it earns its ground once the wall
          has scrolled. Pressing it is the same gesture as the strip it sits
          on: back to the top. */}
      <button type="button" className="hn-bar-mark" onClick={() => goUp(pane)} aria-label="Back to the top">
        {mark('hn-bar-svg')}
      </button>
      <button className="hp-icon-btn hn-lights" onClick={toggleTheme} aria-label="Toggle theme">
        {/* The sun and the moon. Drawn as a switch on a wall for an hour, on
            the grounds that the component is called Lightswitch; the file name
            was the whole argument and it was not enough (Miyel, 2026-09-15). */}
        {theme === 'dark' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"/></svg>
        )}
      </button>
    </div>
  );

  // ── The crown ─────────────────────────────────────────────────────────────
  // The mark, large and centred, at the top of every pane. It is the same
  // treatment the old cover gave it on its first screen, applied three times
  // instead of once — which is what makes the swipe read as one object turning
  // rather than three pages being flicked past. The mark holds still at the
  // top of the window and the square directly under it holds still too: a
  // portrait on the left, an album on the centre. Only what is under those two
  // changes as you move.
  //
  // It is also what retired the card's measured photo-lift. That code existed
  // to drop the portrait down the column until it landed on the same line as
  // the beacon's art on the other face of the cover; with a crown of fixed
  // height above both squares they line up by construction, and arithmetic
  // that has become a constant should be a constant.
  //
  // Written once and rendered three times rather than passed into each pane:
  // it belongs to the cross, not to About, Dashboard or Pitch, none of which
  // should have to know they are sitting in one.
  const crown = (
    <div className="hn-crown">
      {/* The mark re-centres the cross and does nothing else. It counted
          taps for a while — three opened a password panel here, then went to
          Settings — and does not any more: the way in is on the right pane,
          the pitch's sign-in line or the desk, and a mark that is secretly a
          door is a mark somebody will open by accident. */}
      <Link href="/" className="hn-crown-mark" aria-label={cover_name} onClick={e => { e.preventDefault(); goTo(HOME); }}>
        {mark('hn-crown-svg')}
      </Link>
    </div>
  );

  // ── What came before ──────────────────────────────────────────────────────
  // The last three records, under the beacon. Unchanged from the cover it came
  // off — records rather than tracks, dimmed because they are the past, and one
  // tap opens the entry when the album is in the journal, which is what stops
  // the row being decoration.
  const recentRow = recentAlbums.length > 0 && (
    <div className="hp-recent-set">
      {/* Up to three distinct records from the Last.fm history, skipping the
          one on the beacon — so "before that", not "the last three plays".
          The line sits under the covers, not over them: over them it was a
          second heading between the record and its past. */}
      <div className="hp-recent">
      {recentAlbums.map(album => {
        const entry = entries.find(e => e.album_key === album.key)
          || entries.find(e => foldKey(e.album) === album.title);
        const label = `${album.album} — ${album.artist}`;
        const cover = album.art || entry?.album_art;
        // Last.fm's cover URLs fail one at a time. When one does, the journal's
        // own cover stands in if the record is in the journal; otherwise the
        // tile goes blank rather than wearing the browser's broken-picture mark.
        const onBroken = e => {
          const fallback = entry?.album_art;
          if (fallback && e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
          else e.currentTarget.style.display = 'none';
        };
        const art = cover
          ? <img src={cover} alt="" onError={onBroken} />
          : <span className="hp-recent-none" aria-hidden="true">♪</span>;
        return entry ? (
          <Link key={album.key} href={`/entries/${entry.slug}`} className="hp-recent-tile" title={label} aria-label={label}>
            {art}
          </Link>
        ) : (
          <span key={album.key} className="hp-recent-tile hp-recent-tile--plain" title={label} aria-label={label} role="img">
            {art}
          </span>
        );
      })}
      </div>
      <p className="hp-recent-head">Before that</p>
    </div>
  );

  // "+ Start a listen" and "Messages" used to sit under the beacon, from when
  // the cover was the only screen an owner had and the writing had to be
  // reachable from it. The desk is one swipe right and carries both, with the
  // same unread count on the same door — so this was the same two controls
  // twice, a hundred pixels apart, on a screen whose whole job is one record.

  // Compare, Submit and Surprise sat at the foot of the wall for a day, as the
  // last of the dot row's destinations looking for a home. They are off it: the
  // foot of the archive is where somebody has finished looking, and three links
  // to elsewhere is the site asking them to leave. Each still has its own
  // address and nothing in the interface currently points at any of them — see
  // NOTES, which is where that is written down rather than solved.

  // The record the card shows. Found here rather than fetched, because this
  // already holds every entry — the wall needs them — and asking the server for
  // one row it has already sent would be a second request for a copy of
  // something in memory.
  const pinned = entries.find(e => e.id === pinned_entry_id) || null;


  // The one divider on a desk, as a grip: the fold between the two pages. A
  // separator the keyboard can hold too — an arrow moves it a step in the
  // arrow's own direction, which is the direction the fold goes.
  const grip = (
    <div
      className={'hn-grip' + (spine.dragging ? ' hn-grip--held' : '')}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize the spine"
      tabIndex={0}
      onPointerDown={spine.grab}
      onKeyDown={e => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); spine.nudge(-1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); spine.nudge(1); }
      }}
    />
  );

  // ── What turns the pane ───────────────────────────────────────────────────
  // At the left end of the header's own line, opposite the pencil, with the
  // mark between them. DECISIONS has said since the header was drawn that it
  // is a mark centred with one control each side; the left side has been empty
  // ever since, and this is what goes in it (Miyel's brief, 2026-09-15).
  //
  // A turn glyph and the name of the face it lands on — "Desk", "Card",
  // "About" — which is enough to read as pressable without a label explaining
  // it. It was a segmented CARD | DESK switch at the top of the spine and a
  // band across the foot of the phone; one control in one place is both.
  //
  // Fixed to the window rather than put inside either header, because there
  // are two headers — the card's and the desk's — and one control that
  // survives the turn cannot live inside the thing it turns. It lands on their
  // line by construction: the page's 36px of padding plus 15, which is the 51
  // the bar centres on.
  const faces = paneFaces(authed);
  const goingTo = faces.find(side => side.key !== face);
  const turnLine = (
    <div className="hn-turn-row">
      <button type="button" className="hn-turn-say" onClick={turnPane}>
        {/* Two arrows side by side, not a rotation. The glyph turned in a
            circle while the motion was a leaf turning over; the motion is two
            pages sliding past each other now, and a glyph that says turn over
            on a control that slides is the kind of small lie this site does
            not tell. */}
        <ArrowsLeftRight size={18} weight="regular" aria-hidden="true" />
        {goingTo.opens}
      </button>
    </div>
  );

  return (
    <div
      className={
        'hn hn--face-' + face
        + (turning ? ' hn--turning' : '')
        + (spine.dragging ? ' hn--dragging' : '')
      }
      data-pane={pane}
    >
      {header}

      <div className="hn-rail" ref={railRef}>
        {/* ── The ID and the desk ──────────────────────────────────────
            Two panes on a phone, with the beacon between them on the rail; the
            spine's two pages on a desk, where one is shown at a time and the
            control in the header turns between them. One markup for both: the
            two wrappers below go `display: contents` under 769px and stop
            existing, so these become rail panes in their own right and take
            their place by `order` (nav.css). A desk is untouched by any of it.

            Both stay mounted whichever is showing. That is what lets the inbox
            go on counting behind the card, and on a desk it is what lets a
            page keep where it was scrolled to while the other one is up. */}
        <div className="hn-pane hn-pane--turn">
          <div className="hn-leaf">
          <section className="hn-pane hn-face hn-face--card" ref={cardRef} aria-label="About this journal">
            <About stamps={stamps} authed={authed} pinned={pinned} entries={entries} />
          </section>

          {/* The desk, or the colophon signed out — a page about the software
              rather than a set of doors, which is why it is its own word and
              its own mark in the band at the foot. */}
          <section
            className={'hn-pane hn-face hn-face--desk' + (authed ? '' : ' hn-face--colophon')}
            ref={deskRef}
            aria-label={authed ? 'Your desk' : 'About this software'}
          >
            {authed ? (
              <>
                {/* The desk, and nothing under it. The feed used to run on
                    straight down this same scroll; it is a row and a page of
                    its own now, which is what lets this pane be a hero and its
                    rows and stop there (Miyel's brief, 2026-09-15). The small
                    mark goes down from here — the cross owns the one mark this
                    site has, and the beacon keeps the large one. */}
                <Dashboard waiting={waiting} mark={mark('db-mark-svg')} />
              </>
            ) : (
              <>
                {/* The colophon keeps the crown. Every other page carries the
                    mark small; this one is the page *about* the mark, and a
                    colophon without it is a paragraph. */}
                {crown}
                <Pitch onSignedIn={letIn} />
              </>
            )}
          </section>
          </div>
        </div>

        {/* ── Home ──────────────────────────────────────────────────────
            The beacon, and the journal under it. The one pane with a cover,
            which is why it is the one pane with two floors, a snap and a down
            caret. On a desk it is the right page and does not move when the
            spine turns. */}
        <section className="hn-pane hn-pane--home" ref={homeRef} aria-label={beacon_available ? 'Now listening' : 'The journal'}>
          {/* No Last.fm — no username, or no key to ask with — and there is
              no beacon screen at all: the journal is the first thing under
              the crown, rather than a tile pretending something might play.
              The layout decides beacon_available on the server, so this is
              settled before the first paint and the pane never re-lays out.
              That copy keeps one long scroll: the two floors need a first
              screen that holds still, and a wall of covers is not one. */}
          {beacon_available ? (
            <>
              {/* Floor one — the crown, the record with its caption, and what
                  came before. On a phone it is exactly one screen tall, so the
                  snap has one place to land; on a desk it is a wrapper. */}
              <div className="hn-floor">
                {crown}
                {/* The screen on a phone; the band on a desk, where the same
                    children lie in one row — the cover and its words, and
                    what came before at the far right on the cover's baseline.

                    On the page colour, and nothing behind it. The record was
                    blurred across it under a wash of page colour from
                    2026-09-13, bled to the page's edges the way a print's
                    ground is, and Miyel took it out on 2026-09-15: a panel of
                    somebody else's colour across the top of the journal reads
                    as a thing stuck on rather than the head of the page. The
                    art is 88px away in the cover, which is where it belongs.
                    The markup went with the rule — a ground nothing draws is
                    still an image the browser fetches. */}
                <div className="hn-screen hn-band">
                  <div className="hp-dashboard">
                    <div className="hp-dash-cell hp-dash-beacon">
                      <ListeningBeacon />
                    </div>
                  </div>
                  {recentRow}
                </div>
              </div>
              {/* Floor two — the wall, scrolling inside a box of its own, so
                  the pane only ever has two stops. The entry's second screen,
                  in the cross. */}
              <div className="hn-floor">
                <div className="hn-floor-scroll" ref={floorRef}>
                  <div className="hn-under">
                    <Journal
                      entries={entries}
                      loading={loading}
                      scroller={wallScroller}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {crown}
              <div className="hn-under hn-under--first">
                <Journal
                  entries={entries}
                  loading={loading}
                  scroller={homeRef}
                />
              </div>
            </>
          )}
        </section>

      </div>

      {/* The fold, and the turn. Neither is drawn on a phone by the
          stylesheet's own reckoning — the fold at all, the turn as a band at
          the foot, which is where it used to be. */}
      {grip}
      {turnLine}

      {/* ── The band at the foot ─────────────────────────────────────
          Card · Beacon · Desk, named, with the one you are on in ink. It is
          the whole of what is down there now: the dots are gone, the side
          carets are gone, and what they were both trying to say — there are
          three of these and that way is another one — a band of words says
          outright (Miyel's brief, 2026-09-15).

          Fixed over the rail rather than repeated inside each pane, for the
          same reason the bar at the top is: it belongs to none of them, and
          three copies would slide past each other during a swipe.

          It does not fade while something is scrolling, where the old row did.
          That row was three marks parked on top of somebody's album art and
          getting out of the way was the kindest thing it could do; this is a
          band along the edge with a ground of its own, and a navigation that
          disappears when you move is one you cannot trust to be there.

          What is left pointing anywhere is down, and only on the beacon — the
          one pane with a whole screen and nothing cut off at its fold, so
          nothing else needs telling there is more. It sits above the band,
          fades while anything moves, and goes for good once you are down. */}
      <div className={'hn-controls' + (busy ? ' hn-controls--busy' : '')}>
        <EdgeCaret
          direction="down"
          onClick={() => goDown(pane)}
          label="Read on"
          hidden={!deep[pane] || down[pane]}
        />
      </div>

      <Footer pane={pane} goTo={goTo} authed={authed} />

      {/* ── TEMPORARY: the viewport readout ──────────────────────────────
          Here to answer one question and then be deleted: the band rests
          above the bottom edge on a real phone and comes down when dragged,
          and the browser pane cannot reproduce it. Two guesses have not fixed
          it, so this prints what the device actually thinks rather than a
          third. Remove with the line in HomeNav that renders it and the
          .hn-measure rules in nav.css. */}
      <pre className="hn-measure" ref={measureRef} />
    </div>
  );
}
