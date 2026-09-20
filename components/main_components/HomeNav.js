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
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowsLeftRight, CaretDown, X } from '@phosphor-icons/react';
import { CAPTION, announce, useListeningBeacon } from '../../hooks/useListeningBeacon';
import MarqueeTitle from './MarqueeTitle';
import { useSpineWidth } from '../../hooks/useSpineWidth';
import { useTheme } from './Lightswitch';
import { useBookplate } from './Bookplate';
import ListeningBeacon from './ListeningBeacon';
import CallingCard from './CallingCard';
import Journal from './Journal';
import Footer from './Footer';
import About from './About';
import Dashboard, { heldNow, subscribeHeld } from './Dashboard';
// The two rooms that used to be behind the desk and are stops of their own
// from 2026-09-19. Both mount with the cross and stay mounted, which is the
// rail's whole bargain: the inbox goes on counting and the book goes on
// asking whether anybody is answering while you are looking at the card.
// The inbox is the page itself, drawn without its own bar; the book is the
// component the page is a frame around, which is why Friends.js exists.
import Inbox from '../../app/dashboard/inbox/page';
import Friends from './Friends';
// The feed sits under the book as that pane's second floor. It is handed the
// journal's own records — the same list the wall draws — because the one
// thing it asks of them is whether a row is a record you also have, and
// therefore whether Compare is worth offering.
import Feed, { DensityToggle, useFeedDensity } from './Feed';
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
// Where the keeper's two extra rooms sit on the rail. Only ever true when the
// lock has said yes — a visitor's rail is three panes and neither of these is
// on it. See paneRefs, which is the list these index into.
const BOOK = 2;
const INBOX = 3;

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

// ── The one flight left ───────────────────────────────────────────────────
// Press *Start a listen* and the beacon's cover shrinks out of the card into
// the small square in the nav bar, where it stays for as long as you are
// choosing. That is the whole of the movement on this pane now, and Miyel
// likes it: "I like the animation of the beacon becoming small."
//
// Everything else that used to be here is gone, and the list is worth keeping
// because every item on it was built, watched and rejected on 2026-09-17 and
// -18: a cover flying from the picker's tile into the beacon's slot, then a
// second leg up to the session's header; the beacon having "its moment" lit
// and full size before the listen arrived; an aperture closing on one record
// and opening on another; a cross-fade; a horizontal erase; the whole screen
// leaving by the floor and coming back. BLINK_MS, THE_TURN_MS, RISE_MS and
// TURN_ON_MS were all constants here and all went with the moves they timed.
//
// What ended it was not a better animation. It was Miyel noticing that there
// is nothing to animate: the sheet covers the screen, so the beacon changing
// underneath it is not a thing anybody is in a position to watch. "You don't
// see the transition." See beginListen below, and the note in NOTES.
const TO_THE_BAR_MS = 620;
// The backstop for "the sheet has the screen", used only when the sheet's own
// rise never announces itself — reduced motion, or a layout with no animation
// on it. Comfortably past the longest rise there is (layRiseTall, 620ms on a
// desk; layRise is 420 on a phone) plus the render the push has to do first.
//
// Late costs nothing here. Nobody can see the beacon change while the sheet is
// over it, and a pull down cannot arrive before the sheet it would be pulling
// has finished coming up, let alone before this.
const BEHIND_THE_SHEET_MS = 900;
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
// ── How slow the cutaway is ───────────────────────────────────────────────
// Miyel, 2026-09-18: "sloooow it all down, it should feel intentional. Slow
// swipe down into the journal, album files in slowly, then a slow swipe back
// up into the session."
//
// The scroll is run here rather than handed to `behavior: 'smooth'`, which was
// what it used first. A smooth scroll's duration belongs to the browser and is
// a function of how far it is going — about a second for a phone-sized pane
// and a blink on a desk — so there was no number to slow down, and the same
// save felt like two different things on two screens. These are that number.
const DOWN_MS = 1200;
const UP_MS = 1200;
// The wall, once the record has landed on it. Journal's filing is 700ms and the
// newcomer finishes growing around a second, so this is the stillness after
// that — long enough to read what arrived rather than to catch it arriving.
const WATCH_MS = 1300;
// And how long to wait for the record to appear on the wall before giving up
// and treating it as landed. Asking for the wall is a fetch, and a slow or
// failed one must not leave the pane sitting on the journal for ever.
const ARRIVE_MAX_MS = 4000;

// ── passing ────────────────────────────────────────────────────────────────
// A record leaving the big slot and taking its place at the top of the column
// beside it, everything under it stepping down, and the oldest going off the
// end. Named by Miyel, 2026-09-19, and a name of its own because it is the
// third movement this floor has: `landing` is a record's flight into a
// session and `filing` is the save cutaway, and three unnamed movements in one
// file is three things nobody can talk about.
//
// Her brief: "it logs going from top to bottom. As a listen moves into being a
// last played, it should move from the big spot over to the top in the row,
// the top in the column, and everything filters down. And with the last one,
// the third one down, leaving as the new one comes in."
//
// The journal already did all of that — the data has always reshuffled exactly
// this way — and it did it between two paints, so there was nothing to watch.
// This is only the watching.
//
// ── Why it is done to the DOM rather than through state ───────────────────
// `landing` is React state and a rendered <img>, which is right for it: it
// starts on one press and is gone in one journey. This starts on a *change* —
// four objects have to move at once, three of which React has just finished
// putting in their new places, and asking React to put them back where they
// were so they can be animated forwards again is a second render of a layout
// that is already correct. So the boxes are measured either side of the
// commit and the difference is handed to the browser, which is what a FLIP is.
//
// The Web Animations API and not a class with a transition, for the reason
// MarqueeTitle gives: every one of these distances is different, and a
// stylesheet cannot hold a number that is only known at the moment it is
// needed. It also sidesteps the trap this project keeps meeting — an
// animation driven by requestAnimationFrame never starts in a tab that is not
// painting, and `element.animate()` does not need a frame to be scheduled.
// 0.7s, which is this floor's number and not a new one: the crown's collapse,
// the card's gap, the name under it and the cover's own shrink are all moving
// on it, and a record crossing the same screen at a different speed is a
// second clock in one room. The flight into a session is 620 because it is
// crossing into somewhere else.
const PASS_MS = 700;
const PASS_EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
// What a record put down looks like. The same filter the beacon's own cover
// wears when the listen is over and the same one the column wears, written
// here because the flier is neither of those elements — it is the one in
// between, and it has to arrive wearing what it is landing in.
const PUT_DOWN = 'grayscale(80%) brightness(0.7)';

// A copy of a cover, fixed to the window, drawn over everything and thrown
// away when it stops moving. Two of these fly in a pass: the record being put
// down, and the one falling off the end of the column.
function passingCopy(art, box, extra = {}) {
  const copy = document.createElement('img');
  copy.src = art;
  copy.alt = '';
  copy.setAttribute('aria-hidden', 'true');
  copy.className = 'hn-passing';
  copy.style.left = `${box.left}px`;
  copy.style.top = `${box.top}px`;
  copy.style.width = `${box.w}px`;
  copy.style.height = `${box.h}px`;
  Object.assign(copy.style, extra);
  document.body.appendChild(copy);
  return copy;
}

// `was` and `now` are the same floor measured either side of one commit, in
// coordinates relative to the screen — see the note where they are taken.
// `base` is that screen's box this frame, which turns them back into window
// coordinates: a pane that scrolled between the two commits moves the old
// boxes with its contents, which is what should happen and what a pair of
// raw viewport rects would get wrong.
function passing(was, now, base) {
  const at = b => ({ left: base.left + b.x, top: base.top + b.y, w: b.w, h: b.h });
  const parts = [];

  // ── The pass owns the movement ───────────────────────────────────────────
  // Each tile carries its own arrival, `hp-recent-arrive`, which slides it in
  // from the left as it fades up. That is the right welcome for a column
  // redrawing on its own and the wrong one here: a tile cannot both step down
  // from the place above it and arrive from off to the left, and a record
  // being flown into a tile that is itself still sliding is two movements
  // fighting over one square. Finished rather than cancelled — finishing puts
  // the tile at rest, which is exactly where the FLIP below wants to find it.
  now.tiles.forEach(tile => {
    tile.el.getAnimations().forEach(a => { if (a.animationName === 'hp-recent-arrive') a.finish(); });
  });

  // ── The record being put down ────────────────────────────────────────────
  // Out of the big slot and into the top of the column, shrinking on the way
  // and losing its colour as it goes — it is in hand at one end of the
  // journey and filed at the other, and the grey is what says so.
  const top = now.tiles[0];
  if (was.cover && was.art && top) {
    const from = at(was.cover);
    const to = at(top.box);
    const copy = passingCopy(was.art, from, { filter: was.filter || 'none' });
    const k = to.w / from.w;
    // transform-origin is top left (nav.css), so the corner lands on the
    // corner and the scale does not drag the box off its mark.
    const run = copy.animate([
      { transform: 'none', filter: was.filter || 'none' },
      { transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${k})`, filter: PUT_DOWN },
    ], { duration: PASS_MS, easing: PASS_EASE, fill: 'forwards' });
    // The real tile waits underneath until the copy has arrived on it, so the
    // record is never in two places at once.
    top.el.style.opacity = '0';
    // A timer beside the promise, for the same reason every rAF in this file
    // has one: an animation whose element is torn out from under it never
    // resolves, and the two things this tidies up are a cover fixed over the
    // page and a tile holding itself invisible. Neither may be left behind.
    const done = () => { top.el.style.opacity = ''; copy.remove(); };
    const backstop = setTimeout(done, PASS_MS + 400);
    parts.push(run.finished.then(() => { clearTimeout(backstop); done(); }));
  }

  // ── And everything under it steps down ───────────────────────────────────
  // The tiles are already in their new places; this puts each one back where
  // it was for a moment and lets it travel forward. Matched by record and not
  // by position, so a tile that did not move is not animated and a column
  // that changed some other way is left alone.
  now.tiles.forEach((tile, i) => {
    if (i === 0) return;
    const before = was.tiles.find(o => o.key === tile.key);
    if (!before) return;
    const dx = before.box.x - tile.box.x;
    const dy = before.box.y - tile.box.y;
    if (!dx && !dy) return;
    tile.el.animate([
      { transform: `translate(${dx}px, ${dy}px)` },
      { transform: 'none' },
    ], { duration: PASS_MS, easing: PASS_EASE });
  });

  // ── And the oldest goes off the end ──────────────────────────────────────
  // Down and out of the column rather than simply gone. Its slot is being
  // taken by the tile above it in the same breath, so this has to leave while
  // that arrives — which is the sentence in the brief, "the third one down,
  // leaving as the new one comes in."
  const gone = was.tiles.find(o => o.key && !now.tiles.some(t => t.key === o.key));
  if (gone && gone.art) {
    const box = at(gone.box);
    const copy = passingCopy(gone.art, box, { filter: PUT_DOWN });
    const run = copy.animate([
      { transform: 'none', opacity: 1 },
      { transform: `translateY(${Math.round(box.h * 0.9)}px) scale(0.86)`, opacity: 0 },
    ], { duration: PASS_MS, easing: PASS_EASE, fill: 'forwards' });
    const backstop = setTimeout(() => copy.remove(), PASS_MS + 400);
    parts.push(run.finished.then(() => { clearTimeout(backstop); copy.remove(); }));
  }

  // ── And the new record arrives in the slot it left ───────────────────────
  // Quietly. The eye is following the one that is travelling, and a record
  // that also grows or slides is a second thing to watch in the same second.
  if (now.coverEl) {
    now.coverEl.animate([
      { opacity: 0 },
      { opacity: 1 },
    ], { duration: PASS_MS, easing: PASS_EASE });
  }

  return Promise.allSettled(parts);
}

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
// ── Scrolling on purpose ─────────────────────────────────────────────────
// The site's own curve, over a stated number of milliseconds, because the
// cutaway has to feel deliberate and `behavior: 'smooth'` has no opinion to
// offer about that. Returns a function that stops it.
//
// The frame loop has a way out that does not need frames: a tab the browser is
// not painting runs no rAF callback, and this must not leave a pane stranded
// halfway down. It lands where it was going and the cutaway carries on.
function slide(pane, to, ms, done) {
  const from = pane.scrollTop;
  const span = to - from;
  if (!span) { done(); return () => {}; }
  const started = performance.now();
  let frame = 0;
  let over = false;
  const finish = () => {
    if (over) return;
    over = true;
    cancelAnimationFrame(frame);
    clearTimeout(backstop);
    pane.scrollTop = to;
    done();
  };
  const step = now => {
    if (over) return;
    const t = Math.min(1, (now - started) / ms);
    // The site's curve, as an easing rather than a bezier: slow out of the
    // start, slow into the end, and most of the distance in the middle.
    const e = t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
    pane.scrollTop = from + span * e;
    if (t >= 1) { finish(); return; }
    frame = requestAnimationFrame(step);
  };
  const backstop = setTimeout(finish, ms + 400);
  frame = requestAnimationFrame(step);
  return () => { if (!over) { over = true; cancelAnimationFrame(frame); clearTimeout(backstop); } };
}

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
  // Asking for the wall, in two halves. Ordinarily they run together and this
  // is one function; the cutaway needs them apart, because the fetch should
  // start at the save and the answer should not be *applied* until the pane
  // has arrived at the wall to see it land.
  const fetchEntries = useCallback(() => fetch('/api/entries')
    .then(r => r.json())
    .then(data => (Array.isArray(data) ? data : (data.entries || []))), []);
  const askEntries = useCallback(() => {
    fetchEntries()
      .then(list => { setEntries(list); setLoading(false); })
      .catch(() => setLoading(false));
  }, [fetchEntries]);
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
  const inboxRef = useRef(null);
  const friendsRef = useRef(null);
  const faceNow = useRef('card');
  // In rail order, and the order depends on who is looking, 2026-09-19.
  //
  //   signed in    the ID, the beacon, the book, the inbox
  //   signed out   the ID, the beacon, the colophon
  //
  // The desk is not in either. It is still in the markup and still the spine's
  // second page on a desktop, where there is no band to reach the other rooms
  // with; the stylesheet takes it out of the rail on a phone. So this list is
  // what the band counts against and what a swipe lands on, and it has to be
  // the same list in the same order as what the flexbox actually lays out.
  //
  // Shaped rather than fixed, which means it changes identity once — when the
  // lock answers. Every effect that lists it re-runs then and re-attaches to
  // the panes that now exist, which is exactly right and is why they list it.
  const paneRefs = useMemo(
    () => (authed ? [cardRef, homeRef, friendsRef, inboxRef] : [cardRef, homeRef, deskRef]),
    [authed]
  );
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
      // homeRef and not paneRefs[HOME]: the list is rebuilt when the lock
      // answers and this object is made once, so it would be holding the old
      // one. They are the same ref either way, which is precisely why reaching
      // through the list for it would have gone unnoticed.
      return homeRef.current;
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
  // Whether the × has been pressed once and is showing what it will do. Reset
  // on blur, the way the draft's discard is: a confirmation left armed behind
  // your back is a confirmation you did not give.
  const [ending, setEnding] = useState(false);
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
    if (!from || !record.artUrl || still) { openSession(); return; }
    // ── The sheet comes up, and the beacon changes behind it ────────────
    // Miyel, 2026-09-18, after two days of trying to make one record hand over
    // to another in front of somebody: "it might be as simple as this. When
    // you choose an album from the selector it simply comes up over the screen
    // without the old beacon changing. On dragging down it basically leaves
    // the new one behind." And then, in three words, the reason it works:
    // "you don't see the transition."
    //
    // There isn't one. The sheet covers the whole screen, so the beacon under
    // it can become the new record whenever it likes — and every attempt at
    // this since the 17th had been choreographing a handover that nobody was
    // ever in a position to watch. A record flying up from the tile, an
    // aperture closing on one cover and opening on another, a cross-fade, two
    // beacons measured to the tenth of a pixel so the seam would not show:
    // all of it staging for an audience behind a curtain.
    //
    // So: the sheet goes up now, over a bar that has not moved. The record on
    // it changes once the screen is covered. Pulling down reveals it — the
    // listen leaves the record behind on the beacon on its way out, which is
    // also exactly what putting a record down means.
    //
    // announce() above is untouched and still fires at the press: that is the
    // *public* beacon, what a visitor sees, and it should say what is being
    // listened to the moment it is true rather than half a second later.
    flightTimers.current.push(setTimeout(() => router.push('/session'), 0));
    // ── Not on a clock. When the sheet has actually arrived. ────────────
    // This was a timer for an hour and Miyel saw straight through it: "let the
    // selection screen delay the change, I shouldn't see it change at all — it
    // will have to change after the notetaking session has opened all the way."
    //
    // The sheet exists in the DOM the moment it is pushed and spends the next
    // half second climbing, and it climbs from the floor — so the bar, at the
    // top of the screen, is the *last* thing it covers rather than the first.
    // A timer set to the layer's 420ms left forty milliseconds of margin on a
    // phone and none at all on a desk, where the rise is 620 (layRiseTall).
    //
    // So the sheet says when. Its own rise ending is the exact moment the
    // screen is covered, on either layout and at either duration, and there is
    // no number here to be wrong.
    const settle = () => setOnTheBar({
      art: record.artUrl, title: record.album, artist: record.artist, live: true,
    });
    let done = false;
    const once = () => { if (done) return; done = true; settle(); };
    let tries = 0;
    const waitForTheSheet = () => {
      if (done) return;
      const sheet = document.querySelector('.lay--rises');
      if (!sheet) {
        // The push has not rendered yet. Keep looking, but not forever.
        if (tries++ < 40) flightTimers.current.push(setTimeout(waitForTheSheet, 25));
        else once();
        return;
      }
      sheet.addEventListener('animationend', event => {
        // Its own rise, not something animating inside it.
        if (event.target === sheet) once();
      });
      // And a backstop, because a sheet that arrives with no animation at all
      // — reduced motion, or a layout that does not use one — never fires.
      flightTimers.current.push(setTimeout(once, BEHIND_THE_SHEET_MS));
    };
    waitForTheSheet();
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
  // The record being filed, and the whole of the cutaway's state: it opens the
  // wall while the picker is over it, and the pane goes down to it and back.
  const [filing, setFiling] = useState(null);
  // The wall's next answer, in flight since the save.
  const onTheWay = useRef(null);
  const dropTimers = useRef([]);
  useEffect(() => () => {
    dropTimers.current.forEach(id => { clearTimeout(id); cancelAnimationFrame(id); });
  }, []);

  useEffect(() => {
    const onSaved = event => {
      const record = event.detail || {};
      // Asked for now, applied later. It was asked for on arrival at the wall
      // until 2026-09-18 and the pane sat there for about a second waiting for
      // it — a stall in the middle of a cutaway, which is the one place there
      // is nothing else to look at. The answer is held until the pane is there
      // to watch it land; see the effect below.
      onTheWay.current = fetchEntries().catch(() => null);
      // And the listen is over, so the sheet goes. router.back() because the
      // layer is open by virtue of the address and closing it is going back —
      // see the note at the top of LayerEntry.
      router.back();
      const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (!record.art || still) {
        // No cutaway. The record is simply on the beacon and in the wall,
        // which is the brief's own answer for reduced motion.
        onTheWay.current.then(list => { if (list) setEntries(list); });
        onTheWay.current = null;
        announce(record, 'logged');
        return;
      }
      // ── The cutaway ───────────────────────────────────────────────────
      // Miyel, 2026-09-18: "have the screen show the journal during the save
      // process and just show the album file into the grid, then the screen
      // returns to the session drafts. It's like a cutaway but not fully
      // leaving."
      //
      // The cover used to fall out of the beacon toward the wall, which is one
      // floor down and, while a record is being chosen, not on the screen at
      // all — the picker is that floor. So it fell at a hidden target and what
      // there was to see was a cover dropping off the bottom of the screen.
      //
      // Going to the wall instead answers it and is less machinery, not more:
      // the wall does not have to be found or aimed at, because it is what you
      // are looking at. Journal does the filing (see its own note); this is
      // the going and the coming back.
      dropTimers.current.push(setTimeout(() => setFiling(record), LAYER_OUT_MS));
    };
    window.addEventListener(SAVED_EVENT, onSaved);
    return () => window.removeEventListener(SAVED_EVENT, onSaved);
  }, [fetchEntries, router]);

  // ── Down to the wall, and back ───────────────────────────────────────────
  // The whole of the cutaway, and all of it on stated clocks. The floor opens,
  // the pane goes down over DOWN_MS, the record files in *once the pane has
  // got there*, the wall is held for WATCH_MS, and the pane comes back up over
  // UP_MS to the drafts it left.
  //
  // The order is the part that had to be measured. Asking for the wall at the
  // moment of the save — which is what this did first — meant the record filed
  // itself in while the pane was still travelling, and what there was to see
  // happened off-screen. Which is the same failure the falling cover it
  // replaced had, one floor further on.
  useEffect(() => {
    if (!filing) return undefined;
    const pane = homeRef.current;
    if (!pane) {
      onTheWay.current?.then(list => { if (list) setEntries(list); });
      onTheWay.current = null;
      announce(filing, 'logged');
      setFiling(null);
      return undefined;
    }

    // The beacon takes the record now rather than at the end. By the time the
    // pane is back this screen has been away and come again, and a beacon that
    // changed on arrival would be the one thing on it that had not settled.
    announce(filing, 'logged');

    // The wall goes back to its own top before anything moves. Floor two has a
    // scroller of its own and the newest record is the first tile in it, so a
    // wall left scrolled down means arriving in the middle of the journal with
    // the record filing itself in somewhere above the fold. It is worst where
    // the grid is widest: measured 2026-09-18, the same wall is 1464px tall at
    // four columns across and 5928 at two, which is why Miyel saw it on the
    // two-column view and not the others.
    //
    // Instantly, and here rather than on arrival: the floor is behind the
    // picker at this moment and nobody can see it happen. `goUp` does the same
    // thing for the same reason on the way back from the wall by hand.
    const wall = floorRef.current;
    if (wall && getComputedStyle(wall).overflowY === 'auto') wall.scrollTop = 0;

    const clocks = [];
    let stop = null;
    clocks.push(requestAnimationFrame(() => {
      // One frame first, so the floor is on the page before it is scrolled to:
      // it is display: none under the picker until .hn--filing opens it, and a
      // hidden floor has no offsetTop to aim at.
      stop = slide(pane, secondFloorTop(pane), DOWN_MS, () => {
        // Now. The wall was asked for at the moment of the save and has most
        // likely already answered; this is where the answer is put on screen,
        // with the pane here to watch it. Journal has been holding the old
        // positions since the save and files the record in against them — see
        // its own note.
        const waiting = onTheWay.current || fetchEntries().catch(() => null);
        onTheWay.current = null;
        waiting.then(list => { if (list) { setEntries(list); setLoading(false); } });

        // And the wall is held from the moment the record is *on* it, not from
        // the moment the pane got here. Asking for it is a fetch: it took about
        // 800ms on the dev server, so a watch started on the scroll's own end
        // spent most of itself waiting for a tile that had not arrived and then
        // left again half a second after it did. Measured exactly that.
        const goUpAgain = () => {
          stop = slide(pane, 0, UP_MS, () => {
            // Cleared after the way back, not before: .hn--filing is what
            // holds the floor open, and taking it off mid-scroll would shut
            // the wall while the pane was still on it.
            setFiling(null);
          });
        };
        const landed = () => clocks.push(setTimeout(goUpAgain, WATCH_MS));
        const watchFor = waited => {
          if (document.querySelector(`[data-tile-slug="${CSS.escape(filing.slug || '')}"]`)
            || waited >= ARRIVE_MAX_MS) { landed(); return; }
          clocks.push(setTimeout(() => watchFor(waited + 80), 80));
        };
        watchFor(0);
      });
    }));

    return () => {
      if (stop) stop();
      clocks.forEach(id => { clearTimeout(id); cancelAnimationFrame(id); });
    };
  }, [filing, fetchEntries]);

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
  // ── A room is built the first time you walk into it ───────────────────────
  // The card and the beacon are always drawn: you land on one and the other is
  // one swipe away, and both are this journal's own pages. The inbox and the
  // book are not. Each of them is a page that fetches when it mounts — the
  // inbox asks for submissions, comments, reports and the address book, and
  // the feed asks every journal in that book, one cross-origin request each.
  // Mounting them with the cross would mean paying for all of that on every
  // visit to the front door, including the visits that never leave the beacon
  // and every visit on a desktop, where neither pane is drawn at all.
  //
  // So they are built on arrival and never taken down again. That keeps the
  // rail's actual promise — come back and the pane is where you left it —
  // without the part of it that was only ever true because the panes were
  // cheap. Passing through the inbox on the way to the book counts as
  // arriving, which is right: you went past it and it is now behind you.
  const [visited, setVisited] = useState(() => ({ [HOME]: true }));
  // How many people are in the book, as the book itself reports it. null until
  // it has been asked, which is why the second floor is drawn on `> 0` rather
  // than on `!== 0`: an unanswered question is not an empty book.
  const [bookSize, setBookSize] = useState(null);
  useEffect(() => {
    setVisited(seen => (seen[pane] ? seen : { ...seen, [pane]: true }));
  }, [pane]);
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

  // ── Watching the floor, so a pass can be seen ────────────────────────────
  // The measurement half of `passing` (module scope, above). It runs after
  // every commit and keeps one thing: where the record and its column were
  // the last time this floor was laid out, and what the record looked like.
  //
  // Which is the whole trick. React has already put the new record in the big
  // slot and moved the column down by the time this runs — the layout on
  // screen is the right one, a frame early — so the old boxes are the only
  // thing missing, and they are sitting in this ref from last time.
  //
  // In coordinates relative to the screen, never the window. The pane scrolls,
  // and between one commit and the next it may have: a pair of raw viewport
  // rects would read that scroll as movement and send the record travelling a
  // few hundred pixels it never went. Measured against the screen, a scroll
  // moves both ends together and cancels out — the same correction the wall's
  // arrival FLIP needed (NOTES, Gotchas).
  const floorWas = useRef(null);
  useLayoutEffect(() => {
    const screen = homeRef.current?.querySelector('.hn-screen');
    if (!screen) { floorWas.current = null; return; }
    const base = screen.getBoundingClientRect();
    // ── Offsets, not rects ────────────────────────────────────────────────
    // A tile plays its own 0.5s arrival — translateX(-14px) scale(0.85) to
    // nothing, `hp-recent-arrive` — and a rect taken while that is running is
    // the box it is passing through rather than the box it is coming to rest
    // in. Aimed at one of those, the record landed 10px left of the tile and
    // 9px too small, and sat there for a frame before the tile caught up
    // underneath it. Measured 2026-09-19.
    //
    // `offsetLeft` and `offsetWidth` are layout, and a transform is not
    // layout: they answer where the tile *is* however it is being drawn this
    // instant. Accumulated to the document and then taken off the screen's
    // own, so it works whether or not anything in between is positioned.
    const offs = el => {
      let x = 0; let y = 0; let n = el;
      while (n) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      return { x, y };
    };
    const screenOff = offs(screen);
    const rel = el => {
      const o = offs(el);
      return { x: o.x - screenOff.x, y: o.y - screenOff.y, w: el.offsetWidth, h: el.offsetHeight };
    };
    const coverEl = screen.querySelector('img.beacon-art');
    const tileEls = [...screen.querySelectorAll('.hp-recent-tile')];
    const now = {
      key: onAirAlbum || '',
      art: onAir || '',
      // Read off the element rather than worked out from `isLive`, because
      // what the flier has to leave wearing is whatever the cover is wearing
      // this second, and that is a question for the stylesheet.
      filter: coverEl ? getComputedStyle(coverEl).filter : 'none',
      cover: coverEl ? rel(coverEl) : null,
      coverEl,
      tiles: tileEls.map((el, i) => ({
        key: before[i]?.album || '',
        art: before[i]?.art || '',
        el,
        box: rel(el),
      })),
    };

    const was = floorWas.current;
    // Kept without the elements: those are this render's nodes and the next
    // render may not use them. What survives is where things were.
    floorWas.current = {
      key: now.key,
      art: now.art,
      filter: now.filter,
      cover: now.cover,
      tiles: now.tiles.map(t => ({ key: t.key, art: t.art, box: t.box })),
    };

    // Nothing to compare against on the first lay-out, and nothing to watch
    // when the record has not changed.
    if (!was || !was.key || !now.key || was.key === now.key) return;
    // And only when the record that left really is the one now at the top of
    // the column. A journal loading its first data, a copy with the beacon
    // switched off, a record corrected rather than logged — all of those
    // change the key without anything having been put down, and a pass that
    // fires on those is a cover flying out of a slot into a tile it does not
    // belong in.
    if (now.tiles[0]?.key !== was.key) return;
    // Not while you are somewhere else, and not in a tab nobody is looking
    // at: a pass is a thing to be seen, and one that happens off screen
    // should simply have happened.
    if (pane !== HOME || document.visibilityState !== 'visible') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    passing(was, now, base);
  });

  // ── Anywhere else puts the × back ────────────────────────────────────────
  // Miyel, 2026-09-18: "clicking away anywhere will undo the animation and
  // bring back a regular ×." The same answer the draft's delete gives, and for
  // the same reason: once the mark has turned into the word there is no mark
  // left to press, so the way back cannot be the control itself.
  //
  // Captured at the document, so the state is clear before the press reaches
  // whatever it landed on — with the control excepted, because a press there
  // is the yes.
  useEffect(() => {
    if (!ending) return undefined;
    const away = event => {
      if (event.target?.closest?.('.ses-shut')) return;
      setEnding(false);
    };
    document.addEventListener('pointerdown', away, true);
    return () => document.removeEventListener('pointerdown', away, true);
  }, [ending]);

  // ── Measuring depth ───────────────────────────────────────────────────────
  // A pane is deep when its scroller overflows. Re-measured whenever the thing
  // inside it could have changed size — entries landing, the card's portrait
  // loading, the window turning sideways — because a caret that appears a
  // second late is worse than one that was never there.
  // Only the home pane can be deep. The turning pane overflows all the time —
  // it is a page — and a down caret on it would be promising an arrival that
  // this layout deliberately does not have. Down is a cover, and the card is
  // not one.
  //
  // paneRefs is a dependency and was not, which was harmless until the list
  // stopped being fixed on 2026-09-19: a callback made once holds the list the
  // first render gave it, and the first render of a keeper's cross is always
  // the signed-out shape because the lock has not answered yet.
  const measure = useCallback(() => {
    setDeep(paneRefs.map((ref, i) => {
      if (i !== HOME) return false;
      const el = ref.current;
      return !!el && el.scrollHeight - el.clientHeight > 8;
    }));
  }, [paneRefs]);

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
    // And here too: the panes this listens to are the panes that exist, and
    // two of them arrive when the lock answers. Without paneRefs the inbox and
    // the book would scroll with nothing listening — no fade on the controls
    // while they move, and a `down` that never changes for them.
  }, [stir, paneRefs]);

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
  //
  // Less the bar, 2026-09-20. Both second floors carry `scroll-margin-top` of
  // exactly that, so the first record lands under the mark rather than behind
  // it, and their own top is a bar's-worth further down than where the scroll
  // should stop. The snap used to correct for it on arrival; it is proximity
  // now and will not, so the number has to be right when it is asked for.
  // Read off the floor's own scroll-margin rather than written down twice.
  // A custom property comes back unresolved — `calc(80px + max(...))`, which
  // parseFloat reads as 80 on a phone with no notch and 80 on one with —
  // where scrollMarginTop comes back in pixels with the safe area already in
  // it. The one number, asked for in the one place it is true.
  function goDown(index) {
    const el = paneRefs[index].current;
    if (!el) return;
    const floors = el.querySelectorAll(':scope > .hn-floor, :scope > * > .hn-floor');
    const clear = floors.length > 1 ? parseFloat(getComputedStyle(floors[1]).scrollMarginTop) || 0 : 0;
    el.scrollTo({ top: Math.max(0, secondFloorTop(el) - clear), behavior: ease() });
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
  // ── The feed's one control, in the row that is already a header ────────
  // Miyel, 2026-09-20: "there's already a header up there with a hairline,
  // just put it above that hairline — I think the LN. used to live there."
  // It had a bare row of its own under this bar, which read as a second
  // header belonging to nothing. This is the header, so it goes in this.
  //
  // Only while the feed is what is under it. The bar belongs to every pane
  // and a control for a list four swipes away is furniture; it arrives with
  // the floor and leaves with it.
  const { density, flip: flipDensity } = useFeedDensity();
  const onTheFeed = pane === BOOK && down[BOOK];

  const header = (
    <div className={'hn-bar' + (down[pane] || choosing ? ' hn-bar--scrolled' : '')}>
      {/* ── The way out of the picker ────────────────────────────────────
          In the corner the up-caret holds the rest of the time — the two never
          want the row at once, because while the picker is open there is no
          pane under it to go back to the top of.

          This came off for an hour on 2026-09-18 and went straight back on,
          and the pair of decisions is the useful part. Off, because nothing
          else on the site has a close button and a pull down is how every
          sheet goes back where it came from. On again, because of what a pull
          costs *here*: Miyel, "from beacon to session the swipe down feels too
          easy to close — we should keep it gated behind an ×."

          She is right, and the reason is that this screen is not a sheet you
          are reading. It is the front door of a listen: you have come off the
          beacon to find a record, the search is half typed, and a stray
          downward drag on a grid of covers puts you back on the beacon with
          all of it gone. The listen behind it is the opposite case — it is
          notetaking, it saves as it goes, and it keeps the pull. */}
      {choosing ? (
        // The session's own two-press ×, which is where it went when it came
        // off the listen (Miyel, 2026-09-18: "then the rotating × lives on the
        // selection screen — it's asking 'end session?'"). The same markup and
        // the same stylesheet as the listen's was: the mark turns, goes, and
        // leaves END standing where it stood, at the size the × was drawn at.
        //
        // It was a pair for a day — the × staying put with the word budding
        // out of its right-hand side into the gap before the beacon — which
        // put two things in the row saying two different things, and kept the
        // word at 10px because 68px of gap was all it had. One at a time, in
        // one place: "have the × turn into the End button… it can move out and
        // leave the End as the only button."
        //
        // Pressing anywhere else turns it back, which is why the mark does not
        // have to stay on screen to be pressed again — see the effect above.
        <div className={'hn-shut ses-shut' + (ending ? ' ses-shut--sure' : '')}>
          <button
            type="button"
            className="ses-shut-door"
            onClick={() => setEnding(open => !open)}
            aria-expanded={ending}
            aria-label={ending ? 'Keep choosing' : 'End this session'}
            title={ending ? 'Keep choosing' : 'End this session'}
          >
            <X size={20} weight="regular" aria-hidden="true" className="ses-shut-mark" />
          </button>
          {/* Out of the tab order and out of reach while it is closed, so
              nothing can be pressed that cannot be read. */}
          <span className="ses-shut-slot">
            <button
              type="button"
              className="ses-shut-word"
              onClick={() => { setEnding(false); setChoosing(false); }}
              tabIndex={ending ? 0 : -1}
              aria-hidden={!ending}
              title="End this session and go back to the beacon"
            >
              End
            </button>
          </span>
        </div>
      ) : down[pane] && (
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
      {onTheFeed && <DensityToggle density={density} onFlip={flipDensity} />}
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
      {/* No label over or under them. It read "Before that" until 2026-09-18
          and went with the side-by-side layout: a column of covers standing
          beside the record is already what came before it, and a caption
          saying so was a third voice on a screen with two. */}
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
    </div>
  );

  // ── The way in ───────────────────────────────────────────────────────────
  // Under the recents, not under the artist, and in the captions' own voice.
  //
  // Miyel's brief, 2026-09-18: "every other control on this screen is either
  // an icon or a mono caption. A bold sans button with an arrow is the only
  // thing in a different voice, and it sits where the artwork needs to travel
  // upward." Both halves are right — it was Nunito bold with an arrow in a
  // screen of DM Mono labels, and it was standing in the beacon's own column,
  // where the cover has to be able to grow.
  //
  // Full ink where LAST LOGGED and BEFORE THAT are muted, which is the whole
  // of what makes it read as the one thing here you can press rather than a
  // third caption. The arrow went that day and the glyph did that job in its
  // place; the glyph went too on 2026-09-19 ("no glyph for now"), once there
  // was a hairline over the line. A rule above it is a stronger statement
  // that this is a thing and not more writing than a mark beside it was, and
  // the two say the same thing twice.
  //
  // Both states live here, because they are one control: a record in hand and
  // it is the way back to it, nothing in hand and it opens the picker. Leaving
  // one under the artist in bold and moving the other would be two controls
  // wearing different clothes for the same job.
  const theWayIn = authed && (inHand ? (
    <Link href="/session" className="ln-onward" title={`Back to ${inHand.album}`}>
      Back to the listen
    </Link>
  ) : (
    /* A button and not a link, because it does not navigate: floor one
       becomes the picker where it stands. */
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
          // Found on the pane, not walked up to from the press. This was
          // `event.currentTarget.closest('.beacon-card')` and it worked for
          // exactly as long as this control lived inside the beacon's own
          // meta stack — moving it out from under the artist on 2026-09-18
          // made `closest` return null, which made `box` undefined, which made
          // the guard below return, which took the whole flight off without a
          // word. Miyel: "the animation from the beacon shrinking to mini
          // seemed smoother before — did something outside of that change?"
          // It had: this.
          //
          // Scoped to the pane because the beacon is drawn once there and the
          // card is what the cover is leaving.
          const card = document.querySelector('.hn-pane--home .beacon-card');
          const art = card?.querySelector('img.beacon-art');
          const box = art?.getBoundingClientRect();
          const said = card?.querySelector('.beacon-meta')?.getBoundingClientRect();
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
          // Never armed on the way in. The × keeps its state
          // in this component and the picker's markup goes
          // away and comes back around it, so without this a
          // picker closed while the × was open — press the
          // mark, change your mind, leave another way —
          // reopened with END already showing, which is a
          // confirmation nobody gave. Blur puts it away too,
          // but blur is not the only way out of here.
          setEnding(false);
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
    </button>
  ));

  // ── And the other answer to the same question ────────────────────────────
  // The slot the way in stands in is the floor's one question — what now — and
  // until today it had an answer for the keeper and nothing at all for anybody
  // else, which left a quarter of a visitor's screen empty (measured
  // 2026-09-18, 189px of 812). A visitor's answer is whose journal this is and
  // the two things they can do about it, which is the card's own row at the
  // size this floor can afford. See CallingCard.js.
  //
  // The face goes to the card, through the same `goTo` the Card door at the
  // foot of the screen uses, and to the same place: the rail's first pane.
  // Nobody ever sees both this and the way in — one is `authed`, the other is
  // not — so the slot holds exactly one thing whoever is looking at it.
  const theCallingCard = !authed && <CallingCard onOpenCard={() => goTo(0)} />;

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
        /* Whether the keeper is looking. The stylesheet needs to know because
           the rail is a different shape either way — four panes or three —
           and which panes those are is not something a selector can work out
           from the markup. */
        + (authed ? ' hn--keeper' : '')
        + (turning ? ' hn--turning' : '')
        + (spine.dragging ? ' hn--dragging' : '')
        + (choosing ? ' hn--choosing' : '')
        + (filing ? ' hn--filing' : '')
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
        <section
          /* `--inside` is whether you have gone down to the journal. The wall
             keeps its search bar stuck to the bottom of the screen, which is
             right while you are reading it and wrong while it is only a
             sliver under the beacon — there it is a search box for a page you
             are not on, sitting on top of the covers it would be showing.
             Faded out until you arrive, and it keeps its place in the flow
             the whole time, so nothing moves when it comes back. */
          className={'hn-pane hn-pane--home' + (down[HOME] ? ' hn-pane--inside' : '')}
          ref={homeRef}
          aria-label="The beacon and the journal"
        >
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
          <div className="hn-floor hn-floor--beacon">
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
                  <ListeningBeacon choosing={choosing} emptied={false} />
                </div>
              </div>
              {/* What came before, or what comes next. The row of earlier
                  covers is about the journal's past and has nothing to say
                  while a record is being chosen; the picker takes its room. */}
              {choosing
                ? <AlbumPicker inline onPick={beginListen} onResume={resumeDraft} />
                : <>
                    {recentRow}
                    {theWayIn}
                    {theCallingCard}
                  </>}
            </div>
            {/* ── The way down, in the flow ────────────────────────────
                The same thing the book has, and Miyel asked for it here:
                "the beacon should have the same effect." A word and a
                chevron at the foot of the floor, with the top of the wall
                showing under them.

                It replaces the caret that floated above the band. That one
                said there is more that way; this says what is down there,
                and it does it over the edge of the thing itself. The mark
                above had to come down in size to pay for the room — see
                --hn-crown in nav.css. */}
            {deep[HOME] && (
              <button type="button" className="hn-down" onClick={() => goDown(HOME)} aria-label="The journal">
                <span className="hn-down-say">Journal</span>
                <CaretDown size={11} weight="bold" aria-hidden="true" />
              </button>
            )}
          </div>
          {/* Floor two — the wall, scrolling inside a box of its own, so
              the pane only ever has two stops. The entry's second screen,
              in the cross. */}
          <div className="hn-floor hn-floor--wall">
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

        {/* ── The inbox, and the book ───────────────────────────────────
            Two stops of their own from 2026-09-19, where they were rows on a
            desk. Both are rooms you stand in rather than corridors you pass
            through, which is the whole argument for the band having four
            words on it instead of three and a page of doors behind one of
            them (Miyel's friends brief).

            Owner-only, and drawn only once the lock has said so, which is
            also what keeps the rail three panes wide for a visitor. They are
            not drawn at all on a desktop — see nav.css — because a desktop
            has no band to reach them with and opens both on the spine, the
            way it always has.

            Full pages inside a pane. The inbox is its own route drawn without
            its bar; the book is the component its route is a frame around.
            Neither is a copy of anything: the address still works, and what
            is at the address is what is here. */}
        {authed && (
          <section className="hn-pane hn-pane--inbox" ref={inboxRef} aria-label="What has arrived">
            {visited[INBOX] && <Inbox inPane />}
          </section>
        )}

        {/* ── Two floors, and it snaps, 2026-09-19 ─────────────────────
            People on the first, what they logged on the second, exactly the
            way the journal sits under the beacon — the same snap, the same
            inner scroller, the same rule that down means cover-then-contents.

            It could not snap while the first floor was as tall as there were
            people in the book, which is the whole reason the floor is a shelf
            now (Miyel's brief): as many faces as fit and a line out to the
            rest. One screen whether the book holds six people or a hundred,
            so the feed is always exactly one scroll away.

            The first floor stops short of the screen by --hn-peek, so the top
            of the second shows under it: the feed's own heading and the first
            covers beginning. That sliver is the invitation — a caret on its
            own says there is more, and a caret over the top of a record says
            what.

            **No second floor at all when nobody is filed.** Her rule, and the
            right one: a caret pointing down at a feed of nobody's records is
            a promise the page cannot keep. The cross learns the size of the
            book from the book — see onCount — and until it has, there is one
            floor. */}
        {authed && (
          <section className="hn-pane hn-pane--friends" ref={friendsRef} aria-label="The journals you read">
            {visited[BOOK] && (
              <>
                <div className="hn-floor hn-floor--book">
                  <Friends shelf onCount={setBookSize} />
                  {/* The feed's name lives here rather than at the top of
                      the feed (Miyel, 2026-09-19: "can i see feed living
                      above the down caret?"). It is the right place for it:
                      down here it labels the way down, which is a thing you
                      are deciding whether to do — at the top of the list it
                      would be naming a place you had already arrived at. Her
                      own mock-up drew it exactly this way, the word and the
                      chevron under it, and the site took a week to get back
                      to what she drew. */}
                  {bookSize > 0 && (
                    <button type="button" className="hn-down" onClick={() => goDown(BOOK)} aria-label="The feed">
                      <span className="hn-down-say">Feed</span>
                      {/* The chevron drawn here rather than through EdgeCaret,
                          which is a button of its own and cannot go inside
                          one. Same glyph at the same weight and size the
                          beacon's caret uses, so the two read as one mark. */}
                      <CaretDown size={11} weight="bold" aria-hidden="true" />
                    </button>
                  )}
                </div>
                {/* No inner scroller, unlike the journal under the beacon.
                    That floor is never visible until you arrive at it; this
                    one shows a sliver of itself at rest, and a scroller you
                    can reach before you have arrived is one you scroll by
                    accident — the feed slid up inside its own box while the
                    pane sat still on the faces. The floor is a snap area
                    taller than the screen instead, which the snap allows to
                    rest anywhere once it covers the screen: it catches you on
                    the way in and then gets out of the way. */}
                {bookSize > 0 && (
                  <div className="hn-floor hn-floor--feed">
                    <Feed entries={entries} density={density} />
                  </div>
                )}
              </>
            )}
          </section>
        )}

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
      {/* The floating caret is gone, 2026-09-19. It lived above the band and
          said "there is more that way" on whichever pane had a second floor.
          Both of those panes say it themselves now, at the foot of their own
          first floor, with a word and the top of what is down there showing
          under it — which is the same sentence with a subject in it. */}

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

      <Footer pane={pane} goTo={goTo} authed={authed} />
    </div>
  );
}
