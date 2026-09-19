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
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowsLeftRight } from '@phosphor-icons/react';
import { CAPTION, announce, useListeningBeacon } from '../../hooks/useListeningBeacon';
import MarqueeTitle from './MarqueeTitle';
import { useSpineWidth } from '../../hooks/useSpineWidth';
import { useTheme } from './Lightswitch';
import { useBookplate } from './Bookplate';
import ListeningBeacon from './ListeningBeacon';
import Journal from './Journal';
import EdgeCaret from './EdgeCaret';
import Footer from './Footer';
import About from './About';
import Dashboard, { heldNow, subscribeHeld } from './Dashboard';
import AlbumPicker from '../session_components/AlbumPicker';
// The same two the desk already reaches for, from the same module, so the
// pane and the desk agree about what "a listen is open" means and say so the
// same way. The hook itself is not called here.
import { PENDING_KEY, SAVED_EVENT, saidSoAboutTheDesk } from '../../hooks/useListeningSession';
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

// ── The flight, and what happens either side of it ────────────────────────
// The cover leaves the tile it was tapped in and lands in the beacon; the
// beacon lights; then the session opens over a beacon already showing the
// record (Miyel's beacon brief, 2026-09-17: "I do want the chosen album to
// have its moment in the beacon").
//
// 520ms is the session's own landing, which flies a cover from the same tiles
// into the same-shaped slot — the two are the same journey to two different
// rooms and have no business moving at different speeds.
//
// Then the beacon has its moment — 620ms of being lit, full size, with the
// record's name under it — before the listen arrives on top. That number is
// the only one here that is a feel rather than a measurement: long enough to
// read the title, short enough that nobody taps twice thinking it did not
// work. The beacon is still growing for the first 520ms of it, which is the
// point — you watch it take the record.
// ── The pass from choosing a record to writing about it ────────────────────
// It used to be three moves in a row: the cover flew from the picker into the
// beacon's slot (520ms), the beacon had a moment of being the beacon again
// (620ms), and then the session rose over the top of it. Miyel, 2026-09-18:
// "it goes to the correct spot, then it shows the beacon again, then it opens
// the session from the art… first it's all happening way too fast, this
// should feel like slow morphs so we can actually appreciate the animation."
//
// It is one move now, and it goes where the record is actually going. Press a
// record and the session rises immediately while its cover flies out of the
// picker into the small square in the session's own header — the mini beacon,
// which is where that cover lives for the rest of the listen. Her words: "the
// art should just go directly to a mini beacon, replacing the LN logo, then
// the session just rises to meet it. No going back to the beacon page again."
//
// The beacon is told about the record all the same, at the moment of the
// press. It simply is not watched doing it: by the time anybody sees the pane
// again the listen is over.
//
// ── One record, one move ──────────────────────────────────────────────────
// It went in two legs for an hour on 2026-09-18 — across to the beacon's card,
// then up to the session's header — because the card was where a chosen record
// was put while you looked at it. The card does not stand there any more: the
// bar carries the record the whole time you are choosing, in the session
// header's own coordinates, so there is one destination and it is the one the
// record is going to live in. Miyel: "that takes the place of the mini beacon
// and the session shows up. It cuts that middle step."
//
// The session is pushed as the record leaves, so its own settling and the
// record's journey are the same 620ms. The record lands in the bar slot at the
// moment the session finishes resolving over it — and the session's cover is
// already in that exact box, so letting go of the flown copy is a frame with
// nothing in it to notice.
const TO_THE_BAR_MS = 620;
// And how long the bar has to itself once a record is picked, before the
// session starts up over the picker. Not a journey — there is nothing in the
// air any more — just the beat in which the mini goes from last night's greyed
// cover to tonight's lit one, so that change is something you see happen
// rather than something already done by the time the sheet clears the floor.
// Short: a press that sits for half a second reads as a press that missed.
const TURN_ON_MS = 180;
// The aperture, closing and opening. Slow on purpose — long enough that it
// reads as the record being put away and another brought out, rather than as
// a screen changing. The body's rise is shorter and finishes inside it.
// BLINK_MS, THE_TURN_MS and RISE_MS lived here. The aperture that closed on
// one record and opened on another, the turn it hinged on, and the two-half
// clock the whole screen left and arrived on all went on 2026-09-18 — see the
// note on the Start a listen button for what replaced them. What is left is
// the flight, which is the one movement this pane has ever needed: a record
// travelling from where it was pressed to where it is going.

// ── And the way back down ─────────────────────────────────────────────────
// A listen becomes an entry, the layer closes, and the record falls out of
// the beacon into the journal underneath it — which is a real place on this
// same pane, one floor down, and the whole reason the fall is worth animating
// at all (Miyel's beacon brief, item 4).
//
// 420 is the layer's own GROW_MS: the sheet leaves, and then the cover falls.
// Overlapping them would be two things moving over each other with nothing
// saying which to watch.
//
// 560 for the fall, a little longer than the 520 it took to rise. Things fall
// further than they climb here — the beacon is near the top of the screen and
// the wall is below the fold — and a fall that finished as quickly as the
// climb read as the cover being snatched rather than let go.
const LAYER_OUT_MS = 420;
const FALL_MS = 560;

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

// Where a falling cover is going: the first tile of the wall when it is on
// screen, and the down caret when it is not. Null when neither is — a window
// with no wall and no caret in it has nowhere to drop a record, and no
// animation is better than one going nowhere.
//
// The caret's box is squared off around its centre, because the target is a
// point to converge on rather than a tile to become.
function wallLanding() {
  const tile = document.querySelector('.hn-pane--home .ft');
  if (tile) {
    const r = tile.getBoundingClientRect();
    if (r.width > 0 && r.top < window.innerHeight - 24 && r.bottom > 0) return { rect: r, land: true };
  }
  const caret = document.querySelector('.hn-controls');
  if (caret) {
    const r = caret.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      return {
        rect: { left: r.left + r.width / 2 - 18, top: r.top, width: 36, height: 36 },
        land: false,
      };
    }
  }
  return null;
}

// Where a pane's second floor begins: the top of its second .hn-floor when it
// has floors, one screen down when it does not (the no-beacon copy's wall).
function secondFloorTop(pane) {
  const floors = pane.querySelectorAll(':scope > .hn-floor, :scope > * > .hn-floor');
  return floors.length > 1 ? floors[1].offsetTop - floors[0].offsetTop : pane.clientHeight;
}

export default function HomeNav() {
  const { cover_name, pinned_entry_id } = useBookplate();
  const { theme, toggle: toggleTheme } = useTheme();
  const { isLive, before, art: onAir, album: onAirAlbum, artist: onAirArtist, track: onAirTrack } = useListeningBeacon();
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

  // On mount, and again the moment a listen becomes an entry — the wall has
  // to actually contain the record that is about to fall into it, or the
  // cover lands on a tile that is not there yet.
  const askEntries = useCallback(() => {
    fetch('/api/entries')
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data.entries || []);
        setEntries(list);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);
  useEffect(() => { askEntries(); }, [askEntries]);

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

  // Whether there is a record in hand — the same key the desk reads, read the
  // same way, so the two can never disagree about whether a listen is open.
  const inHand = useSyncExternalStore(subscribeHeld, heldNow, () => null);

  // ── Choosing a record, on the pane ────────────────────────────────────────
  // Floor one becomes the picker without leaving the page (Miyel's beacon
  // brief, 2026-09-17). The beacon does not go: it shrinks and dims, so the
  // page never blanks and the small cover is a target for the record that is
  // about to land in it.
  //
  // The state is here and not in the beacon because it is about the whole
  // floor — the band goes, the crown goes, the row of earlier covers goes,
  // and the snap between floors stops while the picker is what the pane is.
  const [choosing, setChoosing] = useState(false);
  // ── What the bar's mini shows while you choose ──────────────────────────
  // The record that was on the beacon when the picker opened, held still for
  // as long as it is open — not the live beacon.
  //
  // It followed the beacon for half an hour on 2026-09-18, so picking a record
  // snapped the bar to it and the session then resolved over the top carrying
  // the same record. Measured: the bar's cover at x=134 and the session's at
  // x=112, because the bar says the album and the session says the open track
  // and a different word is a different width. Two copies of one record, 22px
  // apart, sliding into each other for the length of a cross-fade — which is
  // exactly what Miyel meant by "now the cross-fade doesn't work."
  //
  // They cannot be made to line up: the bar cannot know which track the
  // session will open on. So the bar does not change. The session arriving IS
  // the beacon updating, and there is one thing moving instead of two.
  const [onTheBar, setOnTheBar] = useState(null);
  // ── The name travels with the record ────────────────────────────────────
  // Miyel, 2026-09-18: "don't have text disappear on the transition, but
  // rather move into place and shrink with art."
  //
  // It did disappear: the card's meta collapsed while the bar's appeared, so
  // the album and the artist blinked out in one place and in again in
  // another while the cover made an unhurried journey between them.
  //
  // The bar's own words are what travel — not a copy of the card's. They are
  // put back where the card's were standing, at the size the card's were
  // (0.625 apart, which is why the type had to agree first), and then let go.
  // Drawn at the destination and pulled back to the origin, so the end of the
  // movement is exactly right by construction and cannot land on a jump.
  // Centres rather than corners: the card's are centred under a 180px cover
  // and the bar's are left of a 44px one, and a corner-to-corner flight of
  // two differently aligned blocks slides sideways for no reason.
  const wordsFrom = useRef(null);
  useEffect(() => {
    const from = wordsFrom.current;
    if (!from || !choosing) return;
    wordsFrom.current = null;
    const said = document.querySelector('.hn-bar-beacon .ses-head-text');
    if (!said) return;
    const to = said.getBoundingClientRect();
    if (!to.width) return;
    const k = 1 / 0.625;   // the card's type over the bar's
    const dx = (from.left + from.width / 2) - (to.left + to.width / 2);
    const dy = (from.top + from.height / 2) - (to.top + to.height / 2);
    said.style.transition = 'none';
    said.style.transform = `translate(${dx}px, ${dy}px) scale(${k})`;
    // Released on the next frame — and by a clock as well, because a frame is
    // not guaranteed. A tab the browser thinks is hidden runs no animation
    // frames at all, and the whole of this is set-then-release: without the
    // second way out, the name would sit at 1.6 times its size in the wrong
    // place for as long as the picker was open. Seen exactly that way in the
    // preview pane on 2026-09-18, which reports hidden always (NOTES).
    let gone = false;
    const release = () => {
      if (gone) return;
      gone = true;
      said.style.transition = `transform ${TO_THE_BAR_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)`;
      said.style.transform = 'none';
      flightTimers.current.push(setTimeout(() => {
        said.style.transition = '';
        said.style.transform = '';
      }, TO_THE_BAR_MS + 40));
    };
    flightTimers.current.push(requestAnimationFrame(release));
    flightTimers.current.push(setTimeout(release, 120));
  }, [choosing]);
  const router = useRouter();

  // ── Off the picker and into the listen ────────────────────────────────────
  // The record goes in the browser under the key the session reads once on
  // mount, so the listen opens on it — the same handover the session's own
  // picker does, and the same event after it, so the desk's row and the line
  // under the beacon change in the same frame rather than on the next poll.
  //
  // `from` is the box the tapped cover was in, handed over by AlbumPicker. It
  // is the start of the flight; the beacon slot is the end.
  const [landing, setLanding] = useState(null);
  const flightTimers = useRef([]);
  useEffect(() => () => {
    flightTimers.current.forEach(id => { clearTimeout(id); cancelAnimationFrame(id); });
  }, []);

  // A FLIP on the beacon's card lived here for ten minutes on 2026-09-18 and
  // came out again. It was the wrong tool: the card's position is not a thing
  // that jumps, it is a thing that is *dragged* by the crown above it
  // collapsing, and the crown was already animating — on its own clock. Two
  // animations for one movement, one of them measuring the other mid-flight
  // and re-flipping off its own transform. The fix is one clock, below and in
  // nav.css, not a second animation on top.

  const openSession = useCallback(() => {
    setChoosing(false);
    router.push('/session');
  }, [router]);

  const beginListen = useCallback((record, from = null) => {
    try { localStorage.setItem(PENDING_KEY, JSON.stringify(record)); } catch { /* the listen still opens */ }
    saidSoAboutTheDesk();
    // The beacon is told now, whichever way this goes. Behind the sheet, but
    // true — and the pane is what you come back to when the listen ends.
    // `art`, not `artUrl` — announce names its fields the way the beacon's
    // snapshot does and a record names them the way the picker does, so
    // handing the record over whole dropped the cover silently and the
    // owner's own beacon announced a blank square until the next poll caught
    // up. Invisible until 2026-09-18, when the bar's mini started drawing
    // from this the moment it is published.
    announce({ album: record.album, artist: record.artist, art: record.artUrl });
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // No flight: the record is simply on the beacon and the listen opens. The
    // same answer the session's own picker gives, and the brief's.
    if (!from || !record.artUrl || still) { openSession(); return; }
    // ── No flight on the way in ─────────────────────────────────────────
    // The record flew from the picker's tile into the header for an hour on
    // 2026-09-18 and Miyel took it off: "it's too much for the album to float
    // from picker to beacon. Maybe it just updates in the beacon without
    // that — the beacon updates the art and the album title and artist while
    // the session page comes up."
    //
    // She is right, and the reason is that there is nothing to follow. Going
    // *into* the picker the record is the thing you are already looking at
    // and it has somewhere to be, so watching it go is the move. Coming back
    // out, the record is one of a dozen in a list you were reading: a cover
    // detaching from a row and sailing up is a fourth thing happening on top
    // of a session arriving and a picker folding away.
    //
    // ── Up to the mini beacon, and then the work ────────────────────────
    // "When you choose an album from this state it just needs to move up and
    // make the mini beacon." So the record leaves the square you pressed and
    // goes to the one place it is going to live, and the session follows it
    // rather than arriving beside it.
    // The slot is made now so the flight has something to measure and land
    // on, and it is drawn but not shown for the length of the journey — the
    // record is in the air and must not also be sitting where it is going.
    // The mark goes in the same commit: one thing in that space, always.
    // ── The beacon turns on. Nothing flies. ─────────────────────────────
    // The record went up from the tile you pressed for a day — the picker's
    // square detaching and climbing into the bar — and Miyel took it off on
    // 2026-09-18: "we don't even need an album card to float up from
    // drafts/search. It simply turns on with the selection."
    //
    // Which is the same answer she gave coming the other way, for the same
    // reason (see the note above): a record in a grid of a dozen is not a
    // thing you are following, so watching one of them travel is a third
    // movement on top of a picker folding away and a session arriving. What
    // the eye actually reads is the change of state — grey cover to lit
    // cover, last night's record to this one — and that needs no journey.
    //
    // A listen just opened, so it goes up lit, and nothing about it changes
    // when the session resolves over the top: the session draws this same
    // beacon. No song — nothing is open yet, and the beacon's rule is the
    // record until one is.
    setOnTheBar({ art: record.artUrl, title: record.album, artist: record.artist, live: true });
    // A beat, not a flight: long enough for the bar to light before the sheet
    // starts up over the picker, short enough that the press feels answered.
    // It was TO_THE_BAR_MS while there was a cover in the air to wait for.
    flightTimers.current.push(setTimeout(() => router.push('/session'), TURN_ON_MS));
    // And the picker folds away once the sheet is over it — unseen, which is
    // the point. Doing it now would empty the screen behind a sheet that has
    // not covered it yet.
// The picker is not put away. `choosing` stays true for as long as the
    // session is open, so closing the session lands back on the drafts it was
    // started from — "being in a session needs to take me back to drafts."
    // Nothing has to tell this pane the session has closed; the pane never
    // stopped being where it was.
  }, [openSession, router]);

  // The journey: out of the picker and into the bar's slot, which is the
  // session header's slot.
  //
  // The target is measured rather than worked out, and it is measured from
  // where the sheet will be *at rest* rather than where it is this frame —
  // the sheet is rising while this runs, so its header is still on its way up
  // and a cover aimed at that would land below the slot and then have to
  // shuffle. The sheet's own top is how far it still has to go, so taking it
  // off gives the resting box.
  //
  // Two frames, not one: the first lets the push render the layer, the second
  // measures a header that now exists.
  //
  // The timers live in a ref and not in this effect's cleanup: the effect runs
  // again the moment the target is written, and a cleanup there would cancel
  // the journey it had just started.
  useEffect(() => {
    if (!landing || landing.to) return;
    // ── The one destination ─────────────────────────────────────────────
    // The session's own cover, not the bar's. The bar's is centred, because
    // while you are choosing there is nothing beside it; the session's sits
    // left of centre with the record's name to its right, which on a 375px
    // phone is 52px apart. Measured 2026-09-18 with the flight aimed at the
    // bar's: the record landed at x=164 while the session's own cover was
    // already drawn at x=112, so for one frame there were two of the same
    // record in two places. The bar's cover stands down for the length of the
    // flight (see the markup) so there is only ever one.
    //
    // Waited for rather than assumed: the session is pushed as the record
    // leaves and draws its header on its first frame, but a first frame is
    // not this frame.
    const lookFor = (tries = 0) => {
      const slot = document.querySelector(landing.into);
      if (!slot && tries < 40) {
        flightTimers.current.push(requestAnimationFrame(() => lookFor(tries + 1)));
        return;
      }
      if (!slot) { setLanding(null); return; }
      // Measured back out of the settle. The session arrives at scale(1.04)
      // and eases to rest, so its header's box this frame is 4% wrong and
      // shrinking — aiming at that lands the record somewhere the cover is
      // only passing through. Undoing the scale about the sheet's own centre
      // gives the box it is coming to rest in.
      // Only a slot inside the arriving sheet needs this; the bar's is on the
      // page and sits still. `closest` asks the target itself rather than the
      // flight having to know which move it is on.
      const sheet = slot.closest('.lay');
      const at = slot.getBoundingClientRect();
      let to = { left: at.left, top: at.top, width: at.width, height: at.height };
      if (sheet) {
        const k = new DOMMatrixReadOnly(getComputedStyle(sheet).transform).a || 1;
        if (Math.abs(k - 1) > 0.001) {
          const box = sheet.getBoundingClientRect();
          const cx = box.left + box.width / 2;
          const cy = box.top + box.height / 2;
          to = {
            left: cx + (at.left - cx) / k,
            top: cy + (at.top - cy) / k,
            width: at.width / k,
            height: at.height / k,
          };
        }
      }
      setLanding(l => l && ({ ...l, to }));
      flightTimers.current.push(requestAnimationFrame(() => setLanding(l => l && { ...l, go: true })));
      // Arrived, and the session's own cover is already in that box — same
      // image, same place, and in the browser's cache because this is the copy
      // it has just finished flying. Letting go of the flown one is a frame
      // with nothing in it to notice.
      flightTimers.current.push(setTimeout(() => setLanding(null), TO_THE_BAR_MS));
    };
    flightTimers.current.push(requestAnimationFrame(() => lookFor()));
  }, [landing]);

  // ── The drop ──────────────────────────────────────────────────────────────
  // The listen is an entry. The layer closes, the cover leaves the beacon and
  // falls into the journal on floor two, and the slot refills with the record
  // just posted, captioned Last logged.
  //
  // Where it falls TO is measured and never assumed, which is the one rule
  // this had to obey: the wall is below the fold unless somebody has scrolled
  // down to it, and animating to coordinates off the bottom of the screen is
  // an animation nobody sees and a cover that appears to be thrown away. So
  // the first tile is used when it is actually on screen, and the down caret
  // — which is pointing at the wall, and is the reader's own way to it —
  // when it is not. The record still lands in the journal either way; only
  // the drawing of it differs.
  const [dropping, setDropping] = useState(null);
  const dropTimers = useRef([]);
  useEffect(() => () => {
    dropTimers.current.forEach(id => { clearTimeout(id); cancelAnimationFrame(id); });
  }, []);

  useEffect(() => {
    const onSaved = event => {
      const record = event.detail || {};
      // The wall first: it has to hold the entry before anything falls into it.
      askEntries();
      // And the listen is over, so the sheet goes. router.back() because the
      // layer is open by virtue of the address and closing it is going back —
      // see the note at the top of LayerEntry.
      router.back();
      const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (!record.art || still) {
        // No fall. The record is simply on the beacon and in the wall, which
        // is the brief's own answer for reduced motion.
        announce(record, 'logged');
        return;
      }
      dropTimers.current.push(setTimeout(() => {
        setDropping({ record, art: record.art, from: null, to: null, go: false, land: true });
      }, LAYER_OUT_MS));
    };
    window.addEventListener(SAVED_EVENT, onSaved);
    return () => window.removeEventListener(SAVED_EVENT, onSaved);
  }, [askEntries, router]);

  useEffect(() => {
    if (!dropping || dropping.from) return;
    dropTimers.current.push(requestAnimationFrame(() => {
      const slot = document.querySelector('.beacon-art-wrap');
      const from = slot?.getBoundingClientRect();
      const there = wallLanding();
      // Nothing to fall from, either. The rule about not animating to
      // coordinates off the screen cuts both ways: with the pane scrolled
      // down to the wall the beacon is above the top of it, and a cover
      // dropping in from off-screen is a thing arriving rather than a thing
      // being let go. In that case the record is simply in the wall and on
      // the beacon, which is the same answer reduced motion gets.
      const fromVisible = from && from.bottom > 0 && from.top < window.innerHeight;
      if (!fromVisible || !there) {
        announce(dropping.record, 'logged');
        setDropping(null);
        return;
      }
      setDropping(d => d && { ...d, from, to: there.rect, land: there.land });
      dropTimers.current.push(requestAnimationFrame(() => setDropping(d => d && { ...d, go: true })));
      dropTimers.current.push(setTimeout(() => {
        // It has arrived. The slot refills with the record that just left it,
        // captioned Last logged — the server will say the same thing on its
        // next poll, and the owner should not have to wait for it.
        announce(dropping.record, 'logged');
        setDropping(null);
      }, FALL_MS));
    }));
  }, [dropping]);

  // Where the flying cover is drawn this frame: at its start until it is told
  // to go, then translated and scaled onto the beacon's slot.
  let flightStyle = null;
  if (landing) {
    const { from, to, go } = landing;
    const travelling = go && to;
    const dx = travelling ? to.left - from.left : 0;
    const dy = travelling ? to.top - from.top : 0;
    const k = travelling ? to.width / from.width : 1;
    flightStyle = {
      left: from.left, top: from.top, width: from.width, height: from.height,
      transform: `translate(${dx}px, ${dy}px) scale(${k})`,
      transition: travelling ? `transform ${landing.ms}ms cubic-bezier(0.22, 0.61, 0.36, 1)` : 'none',
    };
  }

  // And the same sum downwards. The one difference is what happens at the end
  // of it: onto a tile, the cover simply becomes that tile and stays; toward
  // the caret it fades as it goes, because there is nothing there to be — the
  // caret is a signpost to the wall and not the wall.
  let dropStyle = null;
  if (dropping?.from && dropping.to) {
    const { from, to, go, land } = dropping;
    const dx = go ? to.left - from.left : 0;
    const dy = go ? to.top - from.top : 0;
    const k = go ? to.width / from.width : 1;
    dropStyle = {
      left: from.left, top: from.top, width: from.width, height: from.height,
      transform: `translate(${dx}px, ${dy}px) scale(${k})`,
      opacity: go && !land ? 0 : 1,
      transition: go
        ? `transform ${FALL_MS}ms cubic-bezier(0.4, 0, 0.3, 1), opacity ${FALL_MS}ms ease-in`
        : 'none',
    };
  }

  // A saved draft travels whole, so the session can put its notes back without
  // a second round trip — the shape is the session's own `resume`.
  // `from` is the box of the cover on the pressed row, so a resumed listen
  // travels exactly as a new one does.
  const resumeDraft = useCallback((draft, from = null) => {
    beginListen({
      album: draft.album,
      artist: draft.artist || '',
      year: draft.year || '',
      artUrl: draft.album_art || '',
      collectionId: draft.collection_id || null,
      genre: draft.genre || '',
      entryType: draft.entry_type || '',
      submissionId: draft.submission_id ?? null,
      draft,
    }, from);
  }, [beginListen]);

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

  // ── The bar, against the keyboard ─────────────────────────────────────────
  // The row at the top is `position: fixed`, which on iOS means fixed to the
  // *layout* viewport and not to the part of it you can actually see. Open the
  // keyboard and Safari scrolls the layout viewport up to bring the field into
  // view; the bar goes up with it, out from under the notch, and lands over
  // the clock and the battery (Miyel, on a phone, 2026-09-17: "the logo is
  // kind of blocked by the floating thing on my iPhone").
  //
  // visualViewport.offsetTop is exactly how far it has been pushed, so the bar
  // is pushed back by the same amount. Zero when no keyboard is up, which is
  // every other moment on this site, so this costs nothing the rest of the
  // time. The alternative — hiding the bar while a field has focus — would
  // take the × away at the one moment somebody is most likely to want out.
  //
  // Not a React state: it changes on every frame of the keyboard's slide, and
  // a re-render per frame to move one box is a re-render of the whole cross.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;
    const root = railRef.current?.closest('.hn');
    if (!root) return undefined;
    // And the second half, which is the one that was actually moving the
    // screen. The cross is 100dvh tall — the whole window — so with a keyboard
    // over the bottom half of it, most of the pane is somewhere you cannot
    // see. iOS answers that by scrolling the pane to bring the field into
    // view, which takes the cover off the top (Miyel, 2026-09-18: "everything
    // still is too high up when the keyboard is open").
    //
    // Telling it not to scroll is not an option worth having. What is: make
    // the cross as tall as the part you can see, so the arrangement is laid
    // out inside the keyboard's window and there is nothing to scroll *to*.
    // The cover stays where it was, the field is already in view, and the
    // grid scrolls inside the pane as it did before.
    //
    // Threshold rather than "has it changed at all": a phone's address bar
    // growing and shrinking moves this by forty or fifty pixels all the time
    // and is not a keyboard. Whatever iOS scrolled before the resize landed
    // is undone once, on the way in — not on every resize, which would yank
    // somebody back to the top while they scrolled results with the keyboard
    // still up.
    let wasOpen = false;
    const sync = () => {
      root.style.setProperty('--hn-lift', `${Math.round(vv.offsetTop)}px`);
      const open = window.innerHeight - vv.height > 120;
      if (open) root.style.setProperty('--hn-h', `${Math.round(vv.height)}px`);
      else root.style.removeProperty('--hn-h');
      if (open && !wasOpen) {
        const pane = paneRefs[HOME].current;
        if (pane) pane.scrollTop = 0;
      }
      wasOpen = open;
    };
    sync();
    vv.addEventListener('scroll', sync);
    vv.addEventListener('resize', sync);
    return () => {
      vv.removeEventListener('scroll', sync);
      vv.removeEventListener('resize', sync);
      root.style.removeProperty('--hn-lift');
      root.style.removeProperty('--hn-h');
    };
  }, [paneRefs]);

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
      const here = Math.round(el.scrollLeft / width);
      setPane(here);
      // Swiping off the beacon is backing out of the picker. It is the same
      // answer the × gives, and it has to be: the picker is what floor one
      // *is* while it is open, so leaving the pane leaves the picker, and
      // coming back to a page still holding a half-typed search would be a
      // mode nobody chose to still be in.
      if (here !== HOME) setChoosing(false);
      stir();
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [stir]);

  // ── Down, out of the picker ─────────────────────────────────────────────
  // The gesture that closed the session closes this too, and for the reason
  // Miyel gave for taking the × off both: "swiping down is intuitive since the
  // screen comes up." The picker rose out of the floor when Start a listen was
  // pressed; a pull down is the same movement run backwards.
  //
  // From the top of the pane only, and not out of the search field — a finger
  // put on a keyboard-focused input and dragged belongs to the keyboard. The
  // threshold is a fifth of the screen or a flick, which is the layer's own
  // rule (FAR_ENOUGH / FAST_ENOUGH in LayerEntry) rather than a second set of
  // numbers for the same gesture.
  //
  // Passive: nothing is prevented. There is nothing under the picker to scroll
  // at the top of the pane, so letting the browser have the touch costs
  // nothing and keeps this out of the way of every other drag on the screen.
  useEffect(() => {
    if (!choosing) return undefined;
    const el = homeRef.current;
    if (!el) return undefined;
    let from = null;
    const begin = event => {
      if (event.touches.length !== 1 || el.scrollTop > 0
        || event.target?.closest?.('input, textarea, [role="slider"]')) { from = null; return; }
      const t = event.touches[0];
      from = { x: t.clientX, y: t.clientY, at: event.timeStamp };
    };
    const end = event => {
      const done = from;
      from = null;
      if (!done) return;
      const t = event.changedTouches[0];
      const dy = t.clientY - done.y;
      const dx = t.clientX - done.x;
      if (dy <= 0 || dy < Math.abs(dx) * 1.5) return;
      const far = dy > (el.clientHeight || window.innerHeight) * 0.2;
      const fast = dy / Math.max(1, event.timeStamp - done.at) > 0.5;
      if (far || fast) setChoosing(false);
    };
    el.addEventListener('touchstart', begin, { passive: true });
    el.addEventListener('touchend', end, { passive: true });
    el.addEventListener('touchcancel', end, { passive: true });
    return () => {
      el.removeEventListener('touchstart', begin);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end);
    };
  }, [choosing]);

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
    <div className={'hn-bar' + (down[pane] || choosing ? ' hn-bar--scrolled' : '')}>
      {/* The picker had a × in this corner until 2026-09-18, where the
          up-caret sits the rest of the time. It went with the session's, and
          for the same reason: "I don't want an × on even the album selection
          screen — I don't have them anywhere else on the site." The way out is
          the pull down, which is the way out of every other screen that came
          up from the floor, and it is already wired below (see the swipe on
          .hn — swiping down while choosing closes the picker). */}
      {!choosing && down[pane] && (
        <button
          type="button"
          className="hn-totop"
          onClick={() => goUp(pane)}
          aria-label="Back to the top"
        />
      )}
      {/* ── The record, in the bar, while you are choosing one ─────────────
          Miyel, 2026-09-18: "when you start a session the beacon automatically
          becomes the mini without the small LN logo in between — the art
          becomes the beacon. You choose an album or a draft, that takes the
          place of the mini beacon and the session shows up. It cuts that
          middle step of becoming chosen and moving to the header."
          Placed in the session header's own coordinates rather than the bar's
          — 44px, 14px of radius, twelve below the notch — because the whole
          point is that when the session resolves over this, its cover is
          already exactly here and nothing appears to move. The bar's own row
          shifts up to meet it (.hn--choosing .hn-bar in nav.css), so the ×
          and the lights sit on the line they will sit on in a moment. */}
      {/* The mini, once a record has been chosen — see the Start a listen
          button. Until then the bar carries the mark, the way it does on every
          other screen with nothing to say. */}
      {choosing && onTheBar && (
        <span
          className={'ses-head-beacon hn-bar-beacon' + (landing ? ' hn-bar-beacon--flying' : '')}
          aria-hidden="true"
        >
          {/* ── One beacon, two sizes ────────────────────────────────────
              Miyel, 2026-09-18: "it should be one beacon, two sizes. The
              search/draft beacon is the same as the session beacon."

              So this is not a small beacon of its own: it is the session's
              header beacon, drawn here, in the session's own classes. There
              was a matching set of .hn-bar-* rules for a day — the same three
              lines at the same three sizes, kept in step by hand — and they
              had already drifted apart by the time she looked at them. The
              bar said the record and the artist with no caption at all; the
              session said the open song with no artist and NOW LOGGING
              whether or not anything was. Three drawings of one thing, none
              of them agreeing.

              Drawn in .ses-head-beacon's own classes there is nothing left to
              keep in step, and the handoff is free: the session resolving
              over this row puts the identical beacon in the identical place,
              so there is nothing to see at the seam. */}
          <span className={'ses-cover' + (onTheBar.live ? '' : ' ses-cover--idle')}>
            {onTheBar?.art
              ? <img src={onTheBar.art} alt="" />
              : <span className="ses-cover-none">♪</span>}
          </span>
          {onTheBar?.title && (
            <span className="ses-head-text">
              {/* The live row, and nothing when it is not live — the greyed
                  cover is what says that, and it says it the instant you look
                  at it. A green line under the bar was the signal for an hour
                  and Miyel's read was that it is not one: "I don't like the
                  line, it's not instantly recognisable." A dot is. */}
              {onTheBar.live && (
                <span className="ses-head-live">
                  <span className="ses-head-dot" aria-hidden="true" />
                  {CAPTION.logging}
                </span>
              )}
              <MarqueeTitle text={onTheBar.title} textClassName="ses-head-album" />
              {onTheBar.artist && <span className="ses-head-artist">{onTheBar.artist}</span>}
            </span>
          )}
        </span>
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
  // The last three records, under the beacon: records rather than tracks,
  // dimmed because they are the past, and one tap opens the entry, which is
  // what stops the row being decoration.
  //
  // **Real listens, published or not, 2026-09-15.** They used to be the last
  // three albums off the Last.fm history, which meant they were whatever
  // happened to autoplay and the listens that mattered got buried underneath
  // it. They come out of this journal now — an entry is a listen that was
  // posted and a draft is one that is still being written — so somebody who
  // sent you a record can see you sat with it, which is the loop the send
  // flow exists to close. A draft has no page to open yet and draws plain.
  //
  // Assembled on the server (library/needle.js) rather than matched here
  // against the wall's entries: the drafts half is not in anything the
  // browser holds, and the matching it replaces existed only to guess which
  // entry a scrobble was about.
  const recentRow = before.length > 0 && (
    <div className="hp-recent-set">
      {/* The line sits under the covers, not over them: over them it was a
          second heading between the record and its past. */}
      <div className="hp-recent">
      {before.map(record => {
        const label = `${record.album} — ${record.artist}`;
        // A cover URL can fail on its own. There is no second copy to fall
        // back to here, so the tile goes blank rather than wearing the
        // browser's broken-picture mark.
        const art = record.art
          ? <img src={record.art} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} />
          : <span className="hp-recent-none" aria-hidden="true">♪</span>;
        return record.slug ? (
          <Link key={record.album} href={`/entries/${record.slug}`} className="hp-recent-tile" title={label} aria-label={label}>
            {art}
          </Link>
        ) : (
          <span key={record.album} className="hp-recent-tile hp-recent-tile--plain" title={label} aria-label={label} role="img">
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
        + (choosing ? ' hn--choosing' : '')
        + (landing ? ' hn--flying' : '')
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
        <section className="hn-pane hn-pane--home" ref={homeRef} aria-label="The beacon and the journal">
          {/* Two floors, always. There is no version of this pane without a
              beacon on it (Miyel, 2026-09-16): a journal showing a record it
              sat with months ago is not a beacon failing, that IS the signal,
              and a copy on its first afternoon gets a blank one standing in.

              It used to ask whether anything had ever been logged here and, if
              nothing had, drop the floors entirely and put the wall straight
              under the crown. That made the pane change shape on a fact about
              the journal, which is the thing a fixed band at the foot cannot
              afford — and it cost two EXISTS subqueries on every page render
              to ask. Both went. */}
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
                  {/* ── The owner's way in ──────────────────────────────
                      Under the artist, inside the record's own block, so it
                      reads as the last line of what is on the beacon rather
                      than as a control parked underneath it (Miyel's beacon
                      brief, 2026-09-17). Text and an arrow: no pill and no
                      tile, the voice the session already uses to move you on.

                      It says Back to the listen for as long as there is a
                      record in hand, because that is what pressing it does —
                      a door you can return through has to say so. The desk
                      says "Listening now" in the same state and should: it is
                      beside the session on a desktop and has to describe the
                      page next to it. Here the beacon is one line up and has
                      already said what is playing.

                      Owner only, and it is a Link until item 2 of the brief
                      turns it into the way floor one becomes the picker. A
                      visitor has no listen to start, and the writing routes
                      check the wristband for themselves whatever is drawn. */}
                  <ListeningBeacon choosing={choosing} emptied={!!dropping}>
                    {/* Kept on the page while a record is being chosen, and
                        collapsed with the rest of the meta around it. It used
                        to be removed the instant it was pressed — which took
                        43px of link plus its gap out of the card in one frame,
                        and a card that is suddenly shorter re-centres, so the
                        cover *dropped* 44px before it began climbing. Pressing
                        a button and watching the thing you pressed it on lurch
                        downwards is the last of what Miyel kept calling not
                        fluid, measured out of it on 2026-09-18. */}
                    {authed && (inHand ? (
                      /* A record already in hand: the way back to it, and
                         only that. There was a second, quieter line under
                         this one for an hour — the way *out* of the listen —
                         and Miyel took it off on 2026-09-18: ending a listen
                         belongs in the listen, and this screen's whole job is
                         one record, not two lines of words about what you
                         could do with it. The × in the session's own corner
                         is where a record is put down now. */
                      <Link href="/session" className="ln-onward" title={`Back to ${inHand.album}`}>
                        Back to the listen
                        <ArrowRight size={16} weight="regular" aria-hidden="true" />
                      </Link>
                    ) : (
                      /* And with nothing in hand it opens the picker here,
                         rather than going anywhere. A button and not a link,
                         because it does not navigate — which is the whole
                         idea of this brief. */
                      <button
                        type="button"
                        className="ln-onward"
                        onClick={event => {
                          // ── The beacon shrinks into the bar ──────────────
                          // Miyel, 2026-09-18: "bring back the mini beacon as
                          // the header of the draft/search page, with last log
                          // vs LN logo — I liked the beacon shrinking mini
                          // when you enter session."
                          //
                          // It carried the mark instead for twenty minutes, on
                          // the reasoning that you have not chosen anything yet
                          // and last night's record in the bar is a claim
                          // nobody made. True, and beside the point: the record
                          // up there is not claiming to be tonight's, it is the
                          // beacon, which is the thing this pane is, and
                          // watching it shrink into the row is what makes the
                          // picker feel like the same screen rather than a new
                          // one. The mark is what it falls back to when there
                          // is no record to carry at all.
                          const art = event.currentTarget
                            .closest('.beacon-card')?.querySelector('img.beacon-art');
                          const box = art?.getBoundingClientRect();
                          const meta = event.currentTarget
                            .closest('.beacon-card')?.querySelector('.beacon-meta');
                          const said = meta?.getBoundingClientRect();
                          // A copy of what the card is showing this second,
                          // state and all — Miyel, 2026-09-18: "it's gonna
                          // have to either have a live dot saying now logging,
                          // or it's gonna have to be dull and say last logged.
                          // It is a copy of the real beacon." Including the
                          // open song, because that is what the card says: the
                          // record's name only while nothing is playing.
                          setOnTheBar(onAirAlbum ? {
                            art: onAir,
                            title: onAirTrack || onAirAlbum,
                            artist: onAirArtist,
                            live: isLive,
                          } : null);
                          setChoosing(true);
                          if (!box || !onAir) return;
                          if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
                          // Where the record's name is standing, so it can
                          // travel rather than blink out — see wordsFrom.
                          if (said && said.width) wordsFrom.current = said;
                          setLanding({
                            art: onAir,
                            live: isLive,
                            from: { left: box.left, top: box.top, width: box.width, height: box.height },
                            to: null, go: false, ms: TO_THE_BAR_MS, into: '.hn-bar-beacon .ses-cover',
                          });
                        }}
                      >
                        Start a listen
                        <ArrowRight size={16} weight="regular" aria-hidden="true" />
                      </button>
                    ))}
                  </ListeningBeacon>
                </div>
              </div>
              {/* What came before, or what comes next. The row of earlier
                  covers is about the journal's past and has nothing to say
                  while a record is being chosen; the picker takes its room. */}
              {choosing
                ? <AlbumPicker inline onPick={beginListen} onResume={resumeDraft} />
                : recentRow}
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

      {/* The cover in the air. Fixed to the window and over everything, because
          it is travelling between two boxes that belong to different parts of
          the page and neither of them can hold it. */}
      {landing && flightStyle && (
        <img
          src={landing.art}
          alt=""
          aria-hidden="true"
          /* Greyed in the air when the record is greyed at both ends. The
             flier is its own <img> — it is not either cover, it is the one
             between them — so it drew in full colour while the card it left
             and the slot it was landing in were both dull. Miyel, 2026-09-18:
             "right now it gets colour then it goes grey again." */
          className={'hn-flight' + (landing.live === false ? ' hn-flight--idle' : '')}
          style={flightStyle}
        />
      )}
      {dropping && dropStyle && (
        <img src={dropping.art} alt="" aria-hidden="true" className="hn-flight" style={dropStyle} />
      )}

      <Footer pane={pane} goTo={goTo} authed={authed} />
    </div>
  );
}
