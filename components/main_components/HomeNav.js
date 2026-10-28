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
import { startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowsLeftRight, CaretDown } from '@phosphor-icons/react';
import { announce, useListeningBeacon } from '../../hooks/useListeningBeacon';
import { useSpineWidth } from '../../hooks/useSpineWidth';
import { useTheme } from './Lightswitch';
import { useBookplate } from './Bookplate';
import ListeningBeacon from './ListeningBeacon';
import ListenBar from './ListenBar';
import Journal from './Journal';
import Header from './Header';
import MonthPrompt from './MonthPrompt';
import About from './About';
import Dashboard, { heldNow, subscribeHeld } from './Dashboard';
// The two rooms that used to be behind the desk and are stops of their own
// from 2026-09-19. Both mount with the cross and stay mounted, which is the
// rail's whole bargain: the inbox goes on counting and People goes on
// asking whether anybody is answering while you are looking at the card.
// The inbox is the page itself, drawn without its own bar; People is one
// screen of its own, the band, the scope and the wall (2026-10-23).
import Inbox from '../../app/dashboard/inbox/page';
import PeopleScreen from './PeopleScreen';
// The Board's first screen, read when People opens (below).
import { readEveryone, useEveryone } from '../../app/directory/Directory';
import { DIRECTORY_URL } from '../../library/version';
import { readArtColor } from '../../library/music_data_api';
// The same two the desk already reaches for, from the same module, so the
// pane and the desk agree about what "a listen is open" means and say so the
// same way. The hook itself is not called here.
import { SAVED_EVENT } from '../../hooks/useListeningSession';

// You, then home. Home is the one you land on, which is why it is not index
// 0 — the rail is scrolled to it on mount before the first paint. A visitor
// lands there too: they arrived from a card, a code or a link that already
// said whose journal this is, so the record is the more interesting thing to
// meet and the person is one swipe away.
const HOME = 1;
// Where the keeper's two extra rooms sit on the rail. Only ever true when the
// lock has said yes — a visitor's rail is two panes, the card and the beacon
// (three until 2026-09-28, when the About pane went), and neither of these is
// on it. See paneRefs, which is the list these index into.
//
// Since 2026-10-07 BOOK is the People tab and a visitor has it too, wherever
// there is a directory: Everyone, and nothing of the keeper's (Miyel: "i think
// strangers and visitors can see this page"). The inbox stays the keeper's.
const BOOK = 2;
const INBOX = 3;
// ── The rail starts at home on a phone, 2026-10-22 ────────────────────────
// The card left the rail: it opens over the page from the keeper's face in
// the top row (Header.js; DECISIONS, the frame — Miyel: "the profile should
// only open if you click it and not be a swipe left"). The panes keep their
// numbers — home is still 1, the book 2, the inbox 3, and the card's pane is
// still the first of paneRefs — but the first one you can swipe to is home,
// so a place on the rail is a pane less one. A desk's rail is a grid and is
// never scrolled sideways.
const RAIL_FROM = HOME;

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

// ── How long a saved listen takes to drop off the screen ──────────────────
// 420 is the layer's own GROW_MS, and the time the sheet took to come up: it
// goes back down the way it came, at the pace it came, onto the journal that
// is already waiting under it. See the drop, below.
const LAYER_OUT_MS = 420;
// The cutaway's two long scrolls — DOWN_MS and UP_MS, 1200 each, run a frame
// at a time by `slide` — went on 2026-09-24 with the round trip they drove.
// See the drop.
//
// The wall, once the record has landed on it. Journal's filing is 700ms and the
// newcomer finishes growing around a second, so this is the stillness after
// that — the wall's own bar stays down until it is over, so nothing but the
// records is on screen while one of them arrives.
const WATCH_MS = 1300;
// And how long to wait for the record to appear on the wall before giving up
// and treating it as landed. Asking for the wall is a fetch, and a slow or
// failed one must not leave the bar down for ever.
const ARRIVE_MAX_MS = 4000;

// ── passing ────────────────────────────────────────────────────────────────
// A record leaving the big slot and taking its place at the top of the column
// beside it, everything under it stepping down, and the oldest going off the
// end. Named by Miyel, 2026-09-19, and a name of its own because it is the
// third movement this floor had: `landing` was a record's flight into a
// session (gone with the beacon's own picker, 2026-10-21) and `filing` is the
// save cutaway, and three unnamed movements in one file is three things
// nobody can talk about.
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
// A flight that starts on one press and is gone in one journey can be React
// state and a rendered <img>. This starts on a *change* —
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
// second clock in one room.
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
// signed out it is the keeper's, and it is the same face. The desk for the
// other side, and only the keeper has one: the About pane that stood there
// for a visitor went on 2026-09-28 (DECISIONS, A visited journal is a card,
// a beacon and entries), so a visitor has one face and no switch.
// `opens` is what the control says, and it says a verb now: the pages slide
// past each other rather than turning over, so the thing you are doing is
// opening the other one (Miyel, 2026-09-15). The control is set in small caps,
// which is what lets OPEN ABOUT read as a page's name rather than a sentence
// with a word missing.
function paneFaces(authed) {
  const card = { key: 'card', word: 'Card', opens: 'Open card', label: 'About this journal' };
  if (!authed) return [card];
  return [card, { key: 'desk', word: 'Desk', opens: 'Open desk', label: 'Your desk' }];
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
  // Whether the wristband check has answered at all. `authed` starts false
  // for everybody, so on its own it cannot tell a visitor from a keeper whose
  // answer has not arrived — and the one thing drawn for a visitor and not a
  // keeper (the wall's peek under the beacon, nav.css) must not flash on the
  // keeper's own floor for that beat.
  const [checked, setChecked] = useState(false);
  // How many sends are waiting on the keeper. Null until asked, so the line
  // can hold its place without flashing a zero on the way.
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
  //
  // In the inbox with something new, the inbox is read again, 2026-10-20 —
  // the pane is built once a visit and holds what was there then, so what
  // the dot is for would otherwise not be in it: a letter the journal wrote
  // while it sat in the background, for one. `inInbox` is kept by the pane
  // effect further down; `inboxAgain` is what the pane is handed.
  const inInbox = useRef(false);
  const [inboxAgain, setInboxAgain] = useState(0);
  const askWaiting = useCallback(() => {
    fetch('/api/waiting')
      .then(r => (r.ok ? r.json() : null))
      .then(w => {
        if (!w) return;
        setWaiting(w);
        if (w.fresh && inInbox.current) setInboxAgain(n => n + 1);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.json())
      .then(d => {
        setAuthed(!!d.authed);
        setChecked(true);
        if (d.authed) askWaiting();
      })
      .catch(() => {});
  }, [askWaiting]);
  // And asked again, 2026-10-20, when the journal comes back to the front —
  // a home-screen app wakes where it was left, and what arrived meanwhile
  // should put its dot on Inbox — never on a timer.
  useEffect(() => {
    if (!authed) return undefined;
    const back = () => { if (document.visibilityState === 'visible') askWaiting(); };
    document.addEventListener('visibilitychange', back);
    return () => document.removeEventListener('visibilitychange', back);
  }, [authed, askWaiting]);
  // The lock on the pitch pane opened. The pane it is on becomes the desk,
  // with nothing reloaded: the wristband was just issued and the cross never
  // unmounted. The lock is at the foot of the card since 2026-09-28.
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
  //   signed in    the ID, the beacon, people, the inbox
  //   signed out   the ID, the beacon, people — Everyone only, and only on a
  //                copy with a directory (2026-10-07)
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
    // A visitor's is the card and home since 2026-10-22: People moved to the
    // commons, so a visitor's row has no words and the rail no People pane
    // (DECISIONS, the frame). It held Everyone, wherever there was a
    // directory, from 2026-10-07.
    () => (authed ? [cardRef, homeRef, friendsRef, inboxRef] : [cardRef, homeRef]),
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

  const router = useRouter();

  // ── The drop, 2026-09-24 ─────────────────────────────────────────────────
  // A listen becomes an entry, and the sheet it was written on goes back down
  // the way it came up — onto the journal, which is already underneath it,
  // with the record filing into the top of it.
  //
  // Miyel, after a full session: "Down to the journal still isn't smooth.
  // Maybe rework it. We can make it simpler for now. Instead of a whole
  // cutaway, maybe it just drops down. I do love the cutaway, but if it's
  // not going to be seamless, I would rather not have it for now." Offered
  // three shapes, she took this one.
  //
  // What it replaced was a round trip: the sheet cut out in a single frame,
  // the pane scrolled a floor down over 1.2s, held the wall while the record
  // filed in, and scrolled back up over another 1.2s to the drafts. Both
  // scrolls were run a frame at a time from here, which a phone does
  // unevenly — and the wall measured itself for the filing while it was
  // still display: none, so every cover was recorded at the top-left corner
  // and the whole wall sprang out of that corner when the record landed,
  // rather than stepping over by one.
  //
  // Now nothing scrolls where anybody can see it. It is the rule picking a
  // record already follows — "you don't see the transition" (2026-09-18) —
  // run the other way: while the sheet still covers the screen the wall goes
  // back to its own top and the pane goes to the wall,
  // and then the sheet drops. What it uncovers is already the place you are
  // going. The one thing left moving is the sheet, which is one transform
  // and the same movement as pulling a listen down by hand.
  //
  // You stay on the journal. The drafts are one press of the beacon away.

  // The record being filed. It keeps the wall's own bar down (.hn--filing)
  // until the record is on the wall and has been there a moment.
  const [filing, setFiling] = useState(null);
  // The wall's next answer, in flight since the save.
  const onTheWay = useRef(null);

  useEffect(() => {
    const onSaved = event => {
      const record = event.detail || {};
      // Asked for now, applied once the sheet is out of the way — see the
      // effect below. It was asked for on arrival at the wall until
      // 2026-09-18, and the pane sat there for about a second waiting.
      onTheWay.current = fetchEntries().catch(() => null);
      setFiling(record);
    };
    window.addEventListener(SAVED_EVENT, onSaved);
    return () => window.removeEventListener(SAVED_EVENT, onSaved);
  }, [fetchEntries]);

  // A layout effect, so everything that moves under the sheet has moved before
  // the frame is drawn. The sheet is still over the whole screen at this point,
  // and this is the last moment it is.
  useLayoutEffect(() => {
    if (!filing) return undefined;
    // The beacon takes the record now. It is a floor up and out of sight, and
    // it says Last logged when you go back to it.
    announce(filing, 'logged');

    // The wall on its own top, then the pane on the wall — exactly where the
    // chevron's press puts it. A wall left scrolled down would mean arriving
    // in the middle of the journal with the record filing in somewhere above
    // the fold (2026-09-18: the same wall is 1464px tall at four across and
    // 5928 at two).
    //
    // Only when the beacon's pane is the one under the sheet. A listen started
    // from the inbox opens over the inbox and drops back onto it, and the
    // beacon's pane is left where it was — moving a pane nobody is looking at
    // would only be found later, as the journal where the beacon should be.
    const pane = homeRef.current;
    const wall = floorRef.current;
    const rail = railRef.current;
    const onTheRail = window.matchMedia('(max-width: 768px)').matches && rail;
    const underTheSheet = !onTheRail || Math.round(rail.scrollLeft / (rail.clientWidth || 1)) + RAIL_FROM === HOME;
    if (underTheSheet) {
      if (wall && getComputedStyle(wall).overflowY === 'auto') wall.scrollTop = 0;
      if (pane) pane.scrollTop = floorTwo(pane);
    }

    let alive = true;
    const clocks = [];
    // ── The sheet goes down ─────────────────────────────────────────────
    // Both of them: the listen, and the preview standing on it — its own
    // sheet at the top of the document (SessionPreview), and the one the
    // Save was pressed on. Moved as one, on the site's curve, at the pace the
    // listen came up. The address goes back once they are off the screen,
    // which is what takes them out of the page.
    const sheets = [...document.querySelectorAll('.lay--rises, .lay.ses-preview')];
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const gone = new Promise(resolve => {
      let went = false;
      const back = () => {
        if (went) return;
        went = true;
        if (alive) router.back();
        resolve();
      };
      if (!sheets.length || still) { back(); return; }
      // A tab nobody is looking at runs no animation to its end, so a clock a
      // beat longer is the other way out, whichever comes first.
      clocks.push(setTimeout(back, LAYER_OUT_MS + 200));
      const runs = sheets.map(sheet => sheet.animate([
        { transform: 'none' },
        { transform: `translateY(${sheet.offsetHeight || window.innerHeight}px)` },
      ], { duration: LAYER_OUT_MS, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)', fill: 'forwards' }));
      runs[0].onfinish = back;
      runs[0].oncancel = back;
    });

    // ── And then the record files in ─────────────────────────────────────
    // Once both are true: the sheet is off the screen, and the wall has
    // answered. Journal measured the wall as it stood before the answer and
    // files the record in against that — see its own note.
    const waiting = onTheWay.current || fetchEntries().catch(() => null);
    onTheWay.current = null;
    Promise.all([waiting, gone]).then(([list]) => {
      if (!alive) return;
      // Not urgent, 2026-09-22: the new list redraws the whole cross, and in
      // one piece it stalled a laptop for 61ms. As a transition React can do
      // it between frames.
      if (list) startTransition(() => { setEntries(list); setLoading(false); });
      // The bar comes back once the record has been on the wall a moment.
      const landed = () => clocks.push(setTimeout(() => { if (alive) setFiling(null); }, WATCH_MS));
      const watchFor = waited => {
        if (!alive) return;
        // Any tile holding the record: a track note saved onto a record that
        // has a listen lands on that record's tile, which draws the listen.
        if (document.querySelector(`[data-tile-slugs~="${CSS.escape(filing.slug || '')}"]`)
          || waited >= ARRIVE_MAX_MS) { landed(); return; }
        clocks.push(setTimeout(() => watchFor(waited + 80), 80));
      };
      watchFor(0);
    });

    return () => {
      alive = false;
      clocks.forEach(id => clearTimeout(id));
    };
  }, [filing, fetchEntries, router]);


  const [pane, setPane] = useState(HOME);
  // Whether the card is open over the page, on a phone (the frame,
  // 2026-10-22). The face opens it and closes it again, and any of the three
  // rooms puts it away on the way there; so does Escape.
  const [cardOpen, setCardOpen] = useState(false);
  useEffect(() => {
    if (!cardOpen) return undefined;
    const shut = event => { if (event.key === 'Escape') setCardOpen(false); };
    window.addEventListener('keydown', shut);
    return () => window.removeEventListener('keydown', shut);
  }, [cardOpen]);
  // Coming away from the inbox asks again what is new — leaving its pane on a
  // phone, or its sheet closing over the desk — so the dot on Inbox goes once
  // what it was for has been opened (2026-10-20).
  const path = usePathname();
  const wasHere = useRef({ pane, path });
  useEffect(() => {
    const was = wasHere.current;
    wasHere.current = { pane, path };
    inInbox.current = pane === INBOX;
    if (!authed) return;
    if ((was.pane === INBOX && pane !== INBOX) || (was.pane === BOOK && pane !== BOOK) || (was.path !== path && path === '/')) askWaiting();
  }, [pane, path, authed, askWaiting]);
  // ── A room is built the first time you walk into it ───────────────────────
  // The card and the beacon are always drawn: you land on one and the other is
  // one swipe away, and both are this journal's own pages. The inbox and the
  // book are not. Each of them is a page that fetches when it mounts — the
  // inbox asks for sends, messages, waves, reports and the address book, and
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
  useEffect(() => {
    setVisited(seen => (seen[pane] ? seen : { ...seen, [pane]: true }));
  }, [pane]);
  // Walking back into an inbox already built, while its door wears the dot,
  // reads it again (askWaiting has why). The first walk in builds it, and
  // building it reads it.
  const fresh = waiting?.fresh === true;
  const wasPane = useRef(pane);
  useEffect(() => {
    const before = wasPane.current;
    wasPane.current = pane;
    if (authed && fresh && pane === INBOX && before !== INBOX && visited[INBOX]) {
      Promise.resolve().then(() => setInboxAgain(n => n + 1));
    }
  }, [pane, authed, fresh, visited]);
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
  // ── The mark becomes the header, 2026-09-20 ─────────────────────────────
  // Miyel: "I want the big logo to slowly transform into the small one that
  // becomes the header for the journal — kind of the same way the beacon
  // transforms into the smaller version when you press log listen. Right now
  // if I drag and hold I can see two logos; the big one just disappears under
  // the header of the small one, but it doesn't transform."
  //
  // Two marks were exactly what it was: the crown scrolling away and the
  // bar's own small one fading in behind it, and on a slow drag you catch
  // them both. One mark now. The crown travels to where the small one stood,
  // shrinking as it goes, and stays there — so the header of the journal is
  // the thing that was the crown rather than a second copy of it, and nothing
  // has to cross-fade with anything.
  //
  // Driven off the pane's own scroll, straight onto the element: it changes
  // every frame of a drag and is no business of React's. Nothing about the
  // page's layout moves — a transform is paint, so the record under it scrolls
  // exactly as it did.
  //
  // The mark is found in the pane rather than held on a ref. `next/link` in
  // this version does not hand its anchor back through one — measured, the ref
  // read null on every render while the element was plainly on the page — and
  // there is exactly one crown, inside the pane this effect already has.
  //
  // ── Why this is state and not a class the effect writes, 2026-09-20 ──────
  // It was `classList.add('hn--morph')` for a day, and that is a class on an
  // element React renders the className of. Every re-render rewrites the whole
  // class attribute, so the first time any *other* flag on the cross moved —
  // scrolling the book down to the feed, opening the picker — React wrote its
  // own list back over this one and the flag was gone. The small mark, which
  // that flag is the only thing hiding, came back: a logo standing on top of
  // the address book's own header. Anything the cross wears goes in the list
  // below, where React can see it.
  const [morphing, setMorphing] = useState(false);
  useEffect(() => {
    const pane = paneRefs[HOME]?.current;
    // Where the mark belongs on the page, which is still the crown's place:
    // it is measured here and drawn in the bar. Two elements, one mark — see
    // .hn-bar-crown in the row above.
    const place = pane?.querySelector('.hn-crown-mark');
    if (!pane || !place) return undefined;
    const cross = pane.closest('.hn');
    const bar = cross?.querySelector('.hn-bar');
    const mark = cross?.querySelector('.hn-bar-crown');
    if (!bar || !mark) return undefined;

    // ── How long the journey is, 2026-09-20 ────────────────────────────
    // Miyel, off a real phone: "it flies out the top pretty fast, because the
    // scroll can happen really fast. When I slow down my thumb it kind of
    // leaves into the header, but it disappears into nothing — it's like
    // disappearing but not becoming small."
    //
    // The first half is the distance. It travelled its own natural distance,
    // which is about seventy pixels on a phone — the gap between where the
    // crown stands and where the bar's line is — and seventy pixels of scroll
    // is one flick. A morph nobody can see is a cut. So the journey is
    // stretched over a good part of a screen and the mark *lags*: the page
    // goes up at the speed of the thumb and the mark goes up more slowly,
    // which is the whole of what makes it read as a transformation rather
    // than a thing scrolling away.
    //
    // ── And then it stopped being a distance at all, 2026-09-20 ────────────
    // 70 to 180 to 250, each time on her asking to see it slower, and the
    // same thing wrong underneath every one of them: whatever the number is,
    // the mark is already small while the beacon is still on screen, and by
    // the time the wall of covers arrives — the thing it is becoming a header
    // *for* — it has been sitting up there for half a screen.
    //
    // Miyel: "the big logo should stay where it's at. It'll stay large until
    // you get to the actual first album in the grid, and then that's when it
    // shrinks. Not on the way down."
    //
    // So it does not scroll away and it does not shrink on the way down. It
    // holds its place on the screen at full size for the whole of the beacon,
    // and the shrink is spent on the wall's arrival: it starts when the first
    // row of covers is JOURNEY from the bar and finishes as that row lands
    // under it. A handover between two things you can see at once, which is
    // the same relay the book's header does with the feed's.
    //
    // JOURNEY is therefore how far ahead of the wall the shrink begins, not
    // how much scrolling it takes.
    const JOURNEY = 250;
    // The air between the foot of the mark and the foot of the header — the
    // line everything disappears under. Sixteen to begin with and six from
    // 2026-09-20, on her asking for it closer to the logo: the header should
    // read as the mark's own ground rather than as a band the mark happens
    // to be standing in.
    const GROUND = 6;
    const ground = cross?.querySelector('.hn-bar-ground');
    // The pane's own crown, which is the thing that folds away and grows back
    // when a listen starts and ends. Its state is the test for whether a
    // measurement is worth taking — see measure().
    const crown = pane.querySelector('.hn-crown');

    // Measured rather than written down, because every number in it is a
    // clamp on the screen's height: where the crown stands, how tall it is,
    // and where the bar's line falls on a phone with a notch.
    let base = null;
    const measure = () => {
      // ── Not while the crown is moving, 2026-09-21 ──────────────────────
      // It folded away while a record was chosen on the beacon (gone,
      // 2026-10-21) and took 0.7s to grow back, and the half-grown answers
      // the observer took landed the mark on the header's line for a beat.
      // A transform on the crown means it is still moving, and a rect read
      // off a moving box is not a measurement.
      //
      // `draw` rather than a bare return, so the band behind the header is
      // kept true to the base we are holding. Skipping the measurement must
      // not also skip what the measurement was writing — see the gotcha.
      if (crown && getComputedStyle(crown).transform !== 'none') { draw(); return; }
      // And not where there is no crown to leave, 2026-10-22: the phone's
      // top row is the head of the page now and the big mark is not drawn
      // over it (nav.css), so there is nothing to travel — the desk's answer.
      if (!window.matchMedia('(max-width: 768px)').matches || !place.offsetWidth) {
        mark.style.transform = '';
        base = null;
        ground?.style.removeProperty('--ground');
        setMorphing(false);
        return;
      }
      const m = place.getBoundingClientRect();
      const b = bar.getBoundingClientRect();
      // ── And if it cannot run, the bar keeps its own mark ──────────────
      // The second half of what she saw: with the small mark hidden and the
      // morph not happening, the crown scrolls off and *nothing arrives* —
      // "it disappears into nothing". Whatever the reason for the morph not
      // running on a given screen, the answer must not be a header with no
      // mark in it. So the crown says out loud that it is handling this, and
      // the stylesheet only hides the small one while it is.
      if (!m.height) {
        base = null;
        ground?.style.removeProperty('--ground');
        setMorphing(false);
        return;
      }
      setMorphing(true);
      // The small mark is 28px on the middle of the bar's 58px row, which is
      // 29 up from the band's own bottom edge. Same sum .hn-bar-mark uses.
      const small = 28;
      // The two landmarks the shrink runs between, both measured rather than
      // assumed: floor one is a different height on every phone, because the
      // record, the ring and the caret are all laid out against the screen.
      //
      // `ends` is the scroll at which the wall's first row is under the bar,
      // which on this pane is the same instant the caret goes behind the
      // header, because the caret is the last thing on floor one and the wall
      // starts where it stops.
      //
      // `begins` is the ring arriving at the foot of the header — "it'll
      // shrink as Log a listen passes it". It moved to the caret for an hour,
      // on "it can happen closer to the albums", and came straight back the
      // moment the entry's own collapse was given a short distance of its
      // own: the two are the same gesture on two screens and they should not
      // disagree about when a thing starts becoming a header.
      const wall = pane.querySelector('.hn-floor--wall');
      const last = pane.querySelector('.hn-go');
      const w = wall && wall.getBoundingClientRect();
      const g = last && last.getBoundingClientRect();
      const top = m.top + pane.scrollTop;
      const ends = w ? w.top + pane.scrollTop - b.bottom : null;
      base = {
        top,
        height: m.height,
        target: b.bottom - 29 - small / 2,
        scale: small / m.height,
        floor: b.bottom,
        ends,
        // No caret means there is no second floor to point at, so the shrink
        // falls back to the last JOURNEY of the approach. Still finishing as
        // the wall lands, which is the part that matters.
        begins: g ? g.top + pane.scrollTop - (top + m.height + GROUND)
               : ends == null ? 0 : Math.max(0, ends - JOURNEY),
      };
      draw();
    };
    // Ease out, so it arrives rather than stops: a linear morph reads as the
    // mark being dragged and this reads as it settling.
    const ease = t => 1 - (1 - t) * (1 - t);
    const draw = () => {
      if (!base) return;
      const gone = pane.scrollTop;
      // How far through the handover: nothing until the wall is JOURNEY away,
      // all of it once the wall has landed. A pane with no wall in it falls
      // back to the old rule, so the mark still has somewhere to go.
      const raw = base.ends == null
        ? gone / JOURNEY
        : (gone - base.begins) / (base.ends - base.begins);
      const t = ease(Math.min(1, Math.max(0, raw)));
      // Standing still at the crown's place at full size, then carried up to
      // the line as the wall comes in. Never above the line it is going to.
      // A rubber band pulling down at the top takes it along, which is the
      // one time it moves with the page.
      const at = gone < 0
        ? base.top - gone
        : Math.max(base.target, base.top + (base.target - base.top) * t);
      const k = 1 + (base.scale - 1) * t;
      mark.style.transform = `translate(-50%, ${at.toFixed(1)}px) scale(${k.toFixed(4)})`;
      // And the header ends under it, whatever size it is now. At the end of
      // the journey that sum is the bar's own height, so the collapse needs
      // no separate clock: the ground is always the mark's foot plus the air
      // under it.
      if (ground) {
        const foot = Math.max(base.floor, at + base.height * k + GROUND);
        ground.style.setProperty('--ground', `${foot.toFixed(1)}px`);
      }
    };

    measure();
    pane.addEventListener('scroll', draw, { passive: true });
    // Three things can change what was measured and all three have to say so.
    // A resize is the obvious one; the media query is the phone-or-desk
    // answer, which flips without the window necessarily firing anything this
    // effect hears in time; and the pane's own box changes when the keyboard
    // comes up. Measured once at mount and then whenever any of them moves —
    // without the last two the first measurement was taken at whatever width
    // the page happened to load at and never revisited, which is the bug this
    // was found with.
    const narrow = window.matchMedia('(max-width: 768px)');
    narrow.addEventListener('change', measure);
    window.addEventListener('resize', measure);
    const watch = new ResizeObserver(measure);
    watch.observe(pane);
    // And the bar, because half of what is measured is *its* box. It grows
    // and shrinks on its own — a live beacon arriving in it, a name fading
    // through — and a target measured against the old height parks the mark
    // a dozen pixels above the line and leaves it there, which is what
    // "doesn't stay in the header" was.
    watch.observe(bar);
    // ── And the floor the landmarks stand on, 2026-09-20 ──────────────────
    // The pane is the height of the screen and never changes, so watching it
    // says nothing about the beacon settling underneath. Floor one does
    // change: the cover arrives, the title wraps or does not, the column of
    // earlier covers fills in. Every one of those moves the ring, and a ring
    // measured before them put the shrink 250px early — it had already begun
    // while the record was still on screen, which is the thing this was
    // written to stop.
    const beacon = pane.querySelector('.hn-floor--beacon');
    if (beacon) watch.observe(beacon);
    // A picture finishing is the common one and it does not resize anything
    // that is being watched: the cover has its box from the start and fills
    // it in. `load` does not bubble, so this listens on the way down.
    pane.addEventListener('load', measure, true);
    // ── And the crown finishing its way back up, 2026-09-21 ───────────────
    // Leaving a listen grows the crown back over 0.7s. The observer above
    // hears the height in that, because height is layout — but the scale is
    // not, and a ResizeObserver says nothing about a transform. So its last
    // word came while the box was still a fraction of itself, and there was
    // nothing after it to correct the record. The transition saying it has
    // ended is the exact frame the measurement is good again.
    const stood = event => {
      if (event.target === crown && event.propertyName === 'transform') measure();
    };
    crown?.addEventListener('transitionend', stood);
    return () => {
      pane.removeEventListener('scroll', draw);
      pane.removeEventListener('load', measure, true);
      crown?.removeEventListener('transitionend', stood);
      narrow.removeEventListener('change', measure);
      window.removeEventListener('resize', measure);
      watch.disconnect();
      mark.style.transform = '';
      ground?.style.removeProperty('--ground');
      setMorphing(false);
    };
  }, [paneRefs, authed]);

  // ── Inbox · Outbox, 2026-10-17 ──────────────────────────────────────────
  // The inbox's two words, in this bar, the shape People had for Friends and
  // Board until it became one screen — the Sent door that stood over the
  // list "looks terrible" (Miyel). Which one is showing is kept here and
  // handed to the inbox (Inbox, `sent`).
  const [inboxSent, setInboxSent] = useState(false);
  // ── The Board, read as People opens ─────────────────────────────────────
  // Its first screen, once a visit. Nothing on People draws it — People is
  // the keeper's friends alone since 2026-10-24 (PeopleScreen.js) — and it is
  // still asked for: a look at the Board is what sets off the directory's
  // refresh (DECISIONS, The Board refreshes itself when it is looked at), and
  // keepers opening People are most of the looking until the Board has a
  // place of its own on the phone. Taken out, the Board's lists and the
  // front door's covers would go stale.
  const { page: everyonePage } = useEveryone();
  useEffect(() => {
    if (pane === BOOK && DIRECTORY_URL && !everyonePage) readEveryone();
  }, [pane, everyonePage]);
  // ── On the Board by default, 2026-10-08 ─────────────────────────────────
  // Once the lock says the keeper is here, the journal asks its own listing
  // route, which puts it on the Board if it is meant to be and is not yet —
  // after setup, or the first time after the update — and takes it off if
  // the keeper switched it off and the registry did not hear. Only while the
  // keeper is here; the route asks the registry at most once in ten minutes
  // (app/api/listing/route.js).
  useEffect(() => {
    if (authed && DIRECTORY_URL) fetch('/api/listing').catch(() => {});
  }, [authed]);

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
    //
    // But not for the wall's own search, 2026-10-23. Home is one page now,
    // the record over the wall, and everything on it is sized from the
    // cross's height, so the cross made as tall as the part above the keys
    // shrank the record and walked it up the screen while somebody searched
    // the wall under it (Miyel: "why does search make the beacon smaller?").
    // And putting the pane back at its top threw them off the wall they were
    // searching. For that field only the home pane is held to what you can
    // see (--hn-seen-h), so the results still scroll above the keys, and
    // nothing on the page moves.
    let wasOpen = false;
    const sync = () => {
      root.style.setProperty('--hn-lift', `${Math.round(vv.offsetTop)}px`);
      const open = window.innerHeight - vv.height > 120;
      const onWall = open && Boolean(document.activeElement?.closest?.('.hn-pane--home .arc-bar'));
      if (open && !onWall) root.style.setProperty('--hn-h', `${Math.round(vv.height)}px`);
      else root.style.removeProperty('--hn-h');
      if (onWall) root.style.setProperty('--hn-seen-h', `${Math.round(vv.height)}px`);
      else root.style.removeProperty('--hn-seen-h');
      if (open && !wasOpen && !onWall) {
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
      root.style.removeProperty('--hn-seen-h');
    };
  }, [paneRefs]);

  // ── And the four doors step down while you are typing, 2026-09-21 ────────
  // Straight out of the effect above. The cross is made as tall as the part of
  // the window you can see, which is the cure for everything sliding up when a
  // keyboard opens — and the band is held against the cross's bottom edge, so
  // shrinking the cross walks the four doors up the screen until they are
  // sitting in the gap between what you are typing and the keys. Miyel,
  // 2026-09-21, filtering her journal: "I shouldn't see the footer between the
  // keyboard again." Again, because the send sheet had it first (hn--sending).
  //
  // This one is the general answer rather than a third named case: while a
  // field anywhere in the cross has the focus, the band is not what you are
  // reaching for. It covers the journal's filter, the book's own field, the
  // picker's search and whatever is added next, which a class per surface
  // would not.
  //
  // Scoped to fields the cross contains. A sheet over it brings its own rule
  // (hn--sending) and a layer over it hides the band anyway; a blanket test on
  // document.activeElement would have this reacting to fields it has no
  // business knowing about.
  //
  // A tick behind the event: `focusin` fires while the focus is still moving
  // and activeElement can still be the element being left — the same trap
  // LayerEntry's data-typing is written around, recorded there.
  // State and not classList, which is the rule this file already learned the
  // hard way for the morph: the cross's class attribute is React's, rewritten
  // whole on every render, so a class put on from the outside survives exactly
  // until any other flag here moves. Anything the cross wears goes in the list
  // at the bottom of this file. The two flags written from outside it — the
  // send sheet's and the card's — cannot use that list, so they are attributes
  // instead, which React never touches. Both were classes and both were being
  // wiped; see the notes in SendSheet.js and About.js.
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const root = railRef.current?.closest('.hn');
    if (!root) return undefined;
    let settling = null;
    const mark = () => {
      clearTimeout(settling);
      settling = setTimeout(() => {
        const el = document.activeElement;
        setTyping(Boolean(el) && root.contains(el)
          && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || Boolean(el.isContentEditable)));
      }, 0);
    };
    mark();
    document.addEventListener('focusin', mark);
    document.addEventListener('focusout', mark);
    return () => {
      clearTimeout(settling);
      document.removeEventListener('focusin', mark);
      document.removeEventListener('focusout', mark);
    };
  }, []);

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
    // At home: the rail's first place since the card left it (RAIL_FROM).
    // /?edit=card opens the card over it instead of scrolling to a pane.
    el.scrollLeft = 0;
    if (params.get('edit') === 'card') setCardOpen(true);
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
      const here = Math.round(el.scrollLeft / width) + RAIL_FROM;
      setPane(here);
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
  // arrival FLIP needed.
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
      // The bar this pane scrolls under. Measured rather than read off
      // --hn-bar-h, which is a calc with an env() in it and comes back as the
      // token rather than a number.
      const bar = el.closest('.hn')?.querySelector('.hn-bar') || null;
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

  // ── The wash, 2026-10-23 ──────────────────────────────────────────────────
  // On a phone the head of home takes the record's colour, washed down from
  // the top of the glass and faded into the page by the record's name, so it
  // feels the record without cropping it (Miyel, picking her beacon mockups:
  // "the album wash coming down … makes it feel a little bit more alive").
  // The colour is the one the wall's By color reads off the same cover
  // (readArtColor), so one cover is one colour; a cover with hardly any
  // colour, or one that will not be read, has no wash. Kept apart from the
  // cover's own bars, so it can go on its own if she does not like it built.
  const [washOf, setWashOf] = useState({ art: '', color: '' });
  useEffect(() => {
    if (!onAir || washOf.art === onAir) return undefined;
    let still = true;
    readArtColor(onAir).then(c => {
      if (still) setWashOf({ art: onAir, color: c && !c.plain ? `hsl(${Math.round(c.hue)} 58% 60%)` : '' });
    });
    return () => { still = false; };
  }, [onAir, washOf.art]);
  const wash = onAir && washOf.art === onAir ? washOf.color : '';

  // ── The wash under the top row, 2026-10-23 ──────────────────────────────
  // The top row stands on a ground of the page's colour, so what scrolls up
  // under it disappears — which would draw a strip of page across the top of
  // the wash. So while home has a wash the ground wears the slice of the wash
  // that is under it: the same picture, placed where the wash is this
  // moment, written onto the page as properties (nav.css, data-washed).
  // Scrolled past the wash, the slice is page colour, which is what the
  // ground always was. Not in state: it moves on every scroll. Only on home,
  // and only on a phone, where the wash is drawn.
  //
  // And the brow under the clock wears it too (base.css, .ln-brow), so the
  // colour reaches the top of the glass (Miyel: "all the way towards the top
  // of the screen, even behind the time"). The brow stands over everything,
  // so this is home's address only: an entry laid over home has the brow of
  // the page's colour it always had.
  useEffect(() => {
    const home = paneRefs[HOME]?.current;
    const root = document.documentElement;
    if (!home || !root) return undefined;
    const clear = () => {
      root.removeAttribute('data-washed');
      for (const name of ['--wash-image', '--wash-h', '--wash-y', '--wash-top', '--wash-fill-h']) root.style.removeProperty(name);
    };
    const place = () => {
      const washEl = home.querySelector('.beacon-wash');
      const ground = root.querySelector('.hn-bar-ground');
      if (!washEl || !ground || pane !== HOME || cardOpen || path !== '/' || !washEl.offsetHeight) { clear(); return; }
      const w = washEl.getBoundingClientRect();
      const g = ground.getBoundingClientRect();
      const y = Math.round(w.top - g.top);
      root.style.setProperty('--wash-image', getComputedStyle(washEl).backgroundImage);
      root.style.setProperty('--wash-h', `${Math.round(w.height)}px`);
      root.style.setProperty('--wash-y', `${y}px`);
      // Where the page starts below the glass, the strip above the wash is
      // its top colour rather than the page's.
      root.style.setProperty('--wash-top', `color-mix(in srgb, ${wash} ${isLive ? 52 : 30}%, var(--bg))`);
      root.style.setProperty('--wash-fill-h', `${Math.max(0, y)}px`);
      root.setAttribute('data-washed', '');
    };
    place();
    home.addEventListener('scroll', place, { passive: true });
    window.addEventListener('resize', place);
    const watch = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place);
    const floor = home.querySelector('.hn-floor--beacon');
    if (watch && floor) watch.observe(floor);
    return () => {
      home.removeEventListener('scroll', place);
      window.removeEventListener('resize', place);
      watch?.disconnect();
      clear();
    };
  }, [paneRefs, pane, cardOpen, wash, isLive, path]);

  function goTo(index) {
    const el = railRef.current;
    if (!el) return;
    // A room pressed puts the card away on the way there.
    setCardOpen(false);
    el.scrollTo({ left: (index - RAIL_FROM) * el.clientWidth, behavior: ease() });
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

  // ── The band's stop you are already on, pressed, 2026-10-06 ─────────────
  // Once goes back to the top of the floor you are on — down the feed, to
  // the head of the feed; down the wall, to the head of the wall. Twice
  // inside half a second goes to floor one, the first screen of the pane:
  // the beacon, the book. The Franklin's sibling of pulling down to
  // refresh, and the same family of gesture: a thing you already have under
  // your thumb, pressed again, means "take me back". (Footer.js promised
  // this in a comment for three weeks before it was true.)
  const lastHere = useRef(0);
  function goBack(index) {
    const el = paneRefs[index]?.current;
    if (!el) return;
    const now = Date.now();
    const twice = now - lastHere.current < 500;
    lastHere.current = now;
    const two = floorTwo(el);
    if (!twice && two >= 80 && el.scrollTop > two + 8) {
      el.scrollTo({ top: two, behavior: ease() });
      return;
    }
    goUp(index);
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
  // Where a pane's second floor comes to rest — the wall under the beacon.
  // Nothing on a pane of one floor (People, the inbox), so a press there goes
  // to the top rather than a screen down a page with nothing there.
  function floorTwo(el) {
    if (!el) return 0;
    const floors = el.querySelectorAll(':scope > .hn-floor, :scope > * > .hn-floor');
    if (floors.length < 2) return 0;
    const clear = parseFloat(getComputedStyle(floors[1]).scrollMarginTop) || 0;
    return Math.max(0, secondFloorTop(el) - clear);
  }

  // ── Two floors, two stops, retired 2026-10-23 ─────────────────────────
  // Let go part way down the book and the pane finished the journey to its
  // second floor, the feed. People is one screen now, info at the top and a
  // wall under it, as home is, and the carry took a thumb a whole screen
  // down a page with no floor there (Miyel: "there is no top and bottom to
  // this page anymore"). The entry keeps its own (FullPostPage).

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

  const onInbox = pane === INBOX && authed;
  // A word pressed: the other room, starting at its top.
  function chooseInboxRoom(sent) {
    setInboxSent(sent);
    const el = paneRefs[INBOX]?.current;
    if (el) el.scrollTop = 0;
  }

  // The light switch is back in this row and only on the beacon (Miyel,
  // 2026-09-15). It left for Settings on the argument that it is a preference
  // and not an action, which is true and cost a visitor any way of changing
  // it — Settings is behind the password. On the beacon it is public again,
  // and on the one pane where it is not sitting over somebody's reading. The
  // stylesheet hides it on the turning pane; on a desk this row is over the
  // journal, which is the beacon, so it simply stays.
  // The sun and the moon. Drawn as a switch on a wall for an hour, on the
  // grounds that the component is called Lightswitch; the file name was the
  // whole argument and it was not enough (Miyel, 2026-09-15). Drawn once and
  // placed twice: the bar's right end on a desk, beside the face in the
  // phone's top row (Header.js, 2026-10-22 — her mockup's place for it, to
  // settle in place).
  const lights = (
    <button className="hp-icon-btn hn-lights" onClick={toggleTheme} aria-label="Toggle theme">
      {theme === 'dark' ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"/></svg>
      )}
    </button>
  );

  // ── The top row's stops, 2026-10-22 ─────────────────────────────────────
  // The keeper's three rooms, at the panes they are on the rail; a visitor
  // has none — the row carries the mark instead (Header.js). People's word
  // is Friends since 2026-10-27 (her Friends brief); the key stays.
  const stops = authed ? [
    { key: 'home', word: 'Home', at: HOME },
    { key: 'people', word: 'Friends', at: BOOK },
    { key: 'inbox', word: 'Inbox', at: INBOX },
  ] : [];

  const header = (
    <div className={'hn-bar' + (down[cardOpen ? 0 : pane] ? ' hn-bar--scrolled' : '')}>
      {/* The phone's top row, over everything else the bar holds: the face,
          the light switch, and the three rooms (Header.js). The face opens
          the card over the page and closes it again; while it is open none of
          the three is lit, because none of them is what you are looking at. */}
      <Header
        pane={cardOpen ? -1 : pane}
        cardOpen={cardOpen}
        stops={stops}
        goTo={goTo}
        onHere={goBack}
        onFace={() => setCardOpen(open => !open)}
        news={{ people: waiting?.friends === true, inbox: waiting?.fresh === true }}
        lights={lights}
        mark={mark('hdr-mark-svg')}
      />
      {/* ── The ground the header stands on, 2026-09-20 ──────────────────
          The bar is 80px of opaque page colour and the crown hangs below it,
          which made the crown a logo *floating over* the beacon: the record
          slid visibly behind it on its way up. Miyel: "think of it like it's
          already one very large header, where you can't see behind it, and
          it ends right under the logo. Everything should disappear behind it."

          So the header has a floor that reaches to just under whatever size
          the mark currently is, and it collapses onto the bar as the mark
          does. Same colour as the page, so at the top of the beacon there is
          nothing to see; what it buys is that the record, the ring and the
          caret go *under* it rather than past it.

          It is the bar's first child, so the lights and the small mark draw
          on top of it, and .hn-crown is above the whole bar already. */}
      <div className="hn-bar-ground" aria-hidden="true" />
      {/* ── And the big mark is the header's too, 2026-09-20 ─────────────
          It was the crown's, at the head of the pane, and on a phone that
          does not work: the pane paints *under* this row. Miyel, twice —
          "the big one just disappears under the header of the small one",
          and then, with the ground above, "I don't even see the logo any
          more". Both are the same fact. A thing that has to be drawn over
          this row cannot live in the pane.

          So the header draws it. The crown stays where it is, holding its
          space in the layout so the record starts where it always did, and
          on a phone it is invisible while this one is standing in for it —
          still one mark on screen, which is the rule this file keeps.

          Not a link. The crown was one, to re-centre the cross, and the
          cross is already centred here; .hn-totop is the tap across this
          row and it goes to the top, which is the only thing left to want. */}
      <div className="hn-bar-crown" aria-hidden="true">{mark('hn-crown-svg')}</div>
      {/* Inbox · Outbox, on the inbox pane — no count beside Inbox: what is
          new says so with its own dot, here and, since 2026-10-20, as one
          dot on the Inbox stop of the footer; a number would be the unread
          badge this site does not have. */}
      {onInbox && (
        <span className="hn-bar-words">
          <button
            type="button"
            className={'hn-bar-word' + (inboxSent ? '' : ' hn-bar-word--on')}
            onClick={() => chooseInboxRoom(false)}
            aria-pressed={!inboxSent}
          >
            Inbox
          </button>
          <button
            type="button"
            className={'hn-bar-word' + (inboxSent ? ' hn-bar-word--on' : '')}
            onClick={() => chooseInboxRoom(true)}
            aria-pressed={inboxSent}
          >
            Outbox
          </button>
        </span>
      )}
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
      {lights}
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

  // ── And nothing, for anybody else, 2026-09-27 ───────────────────────────
  // A visitor's slot held the keeper's face with Add and Send either side of
  // it from 2026-09-19 (CallingCard.js, gone). Neither word could do what it
  // said — a page served by this copy cannot write to a reader's address book
  // or post a send for them — and the face was the keeper turning up on a
  // floor that is the record's. So below the record a visitor's slot is empty,
  // and it stays empty: nothing fills it (Miyel's brief, 2026-09-26, and her
  // call on the face, 2026-09-27). The keeper is on the card, one pane left,
  // and nowhere else; an address travels by copy and paste from the card's
  // code (DECISIONS, The network). What the room went to, the same day: a
  // visitor's floor stops short by the peek and the wall's first covers show
  // under the chevron, the way the feed shows under the faces (nav.css,
  // .hn--visitor). The keeper's floor is full and keeps no peek.

  // "+ Start a listen" and "Messages" used to sit under the beacon, from when
  // the cover was the only screen an owner had and the writing had to be
  // reachable from it. The desk is one swipe right and carries both, with the
  // same unread count on the same door — so this was the same two controls
  // twice, a hundred pixels apart, on a screen whose whole job is one record.

  // Compare, Submit and Surprise sat at the foot of the wall for a day, as the
  // last of the dot row's destinations looking for a home. They are off it: the
  // foot of the archive is where somebody has finished looking, and three links
  // to elsewhere is the site asking them to leave. Each still has its own
  // address and nothing in the interface currently points at any of them.
  // That is written down rather than solved.

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
  // Nothing to turn to for a visitor (paneFaces), so no control.
  const turnLine = goingTo ? (
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
  ) : null;

  return (
    <div
      className={
        /* A visitor's leaf has one face, whatever this browser remembered
           from a keeper who signed out on it. */
        'hn hn--face-' + (authed ? face : 'card')
        /* Whether the keeper is looking. The stylesheet needs to know because
           the rail is a different shape either way — four panes or three —
           and which panes those are is not something a selector can work out
           from the markup. */
        + (authed ? ' hn--keeper' : '')
        /* And its counterpart, once the check has said so: a visitor's beacon
           floor stops short so the wall shows under it, 2026-09-27. */
        + (checked && !authed ? ' hn--visitor' : '')
        + (turning ? ' hn--turning' : '')
        + (spine.dragging ? ' hn--dragging' : '')
        /* The card open over the page, on a phone (nav.css, .hn--card). */
        + (cardOpen ? ' hn--card' : '')
        + (filing ? ' hn--filing' : '')
        /* The crown is travelling into the bar on this screen, so the bar's
           own small mark stays out of its way. See the morph effect. */
        + (morphing ? ' hn--morph' : '')
        /* Whether the pane you are looking at has moved. The way down is an
           offer, and an offer you have already taken is a thing in the way:
           "when you start swiping I'd like the down carets to disappear —
           I'm already scrolling down, I don't need it to be there" (Miyel,
           2026-09-20, and sitewide). */
        + (down[pane] ? ' hn--moved' : '')
        /* A field in the cross has the focus, so the four doors are out of the
           way of the keyboard. See the effect beside the bar's own. */
        + (typing ? ' hn--typing' : '')
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
            <About stamps={stamps} authed={authed} pinned={pinned} entries={entries} onSignedIn={letIn} />
          </section>

          {/* The desk — the keeper's, and empty for anybody else. It was the
              About pane signed out, a page about the software, from
              2026-08-28 to 2026-09-28: a visited journal is a card, a beacon
              and entries now, and what that pane owed a visitor (the source
              line, the version, the lock) stands at the foot of the card. The
              section stays in the markup for the leaf's geometry on a desk;
              the stylesheet keeps it off the phone's rail. */}
          <section
            className="hn-pane hn-face hn-face--desk"
            ref={deskRef}
            aria-label="Your desk"
          >
            {authed && (
              /* The desk, and nothing under it. The feed used to run on
                 straight down this same scroll; it is a row and a page of
                 its own now, which is what lets this pane be a hero and its
                 rows and stop there (Miyel's brief, 2026-09-15). The small
                 mark goes down from here — the cross owns the one mark this
                 site has, and the beacon keeps the large one. */
              <Dashboard waiting={waiting} mark={mark('db-mark-svg')} />
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
            {wash && (
              <div
                className={'beacon-wash' + (isLive ? '' : ' beacon-wash--quiet')}
                style={{ '--wash': wash }}
                aria-hidden="true"
              />
            )}
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
                  <ListeningBeacon emptied={false} />
                </div>
              </div>
              {/* What came before. The picker took this room while a record
                  was chosen on the beacon itself, until the session became a
                  sheet raised from the Listen bar (2026-10-21). */}
              {recentRow}
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
            {/* ── A chevron, larger, breathing, 2026-09-20 ─────────────────
                Miyel: "those down carets on feed and journal can just be
                larger and bob up and down to show there's more vs having more
                text." The word over it named the floor below, which is worth
                saying once — and it was being said at the foot of every screen
                that has one, in the caption face, next to a mark that already
                means *down*. A chevron that moves says there is more that way
                better than a word does, and the feed's name still arrives in
                the header once you are on it, which is where a name belongs.

                The name stays on the label, for anybody the movement does not
                reach. */}
            {/* No way down and no bar here any more, 2026-10-22: home is one
                page — the record, then the wall, in one scroll — and the
                Listen bar is the frame's, at the foot of every page (below).
                The chevron went with the ring for the keeper on 2026-10-21
                and for a visitor now; the floors went with both. */}
          </div>
          {/* Floor two — the wall, scrolling inside a box of its own, so
              the pane only ever has two stops. The entry's second screen,
              in the cross. */}
          <div className="hn-floor hn-floor--wall">
            <div className="hn-floor-scroll" ref={floorRef}>
              <div className="hn-under">
                {/* The month's prompt, pinned over the keeper's wall while it
                    is open (MonthPrompt.js); nothing for a visitor. */}
                {authed && <MonthPrompt authed={authed} />}
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
            {visited[INBOX] && <Inbox inPane sent={inboxSent} again={inboxAgain} />}
          </section>
        )}

        {/* ── People, one screen, 2026-10-23 ─────────────────────────
            Miyel's People brief: other people's beacons, a shelf line and a
            wall of their records, in one scroll, the way home is one page
            (PeopleScreen.js). It replaced two floors that snapped — a shelf
            of the book's faces, and the feed under it — and the Board as the
            bar's second word. The keeper's alone. */}
        {authed && (
          <section
            className="hn-pane hn-pane--friends"
            ref={friendsRef}
            aria-label="Friends"
          >
            {visited[BOOK] && (
              <PeopleScreen
                scroller={friendsRef}
                onScreen={pane === BOOK}
                entries={entries}
                pullMark={mark('ln-pull-svg')}
              />
            )}
          </section>
        )}

      </div>

      {/* The fold, and the turn. Neither is drawn on a phone by the
          stylesheet's own reckoning — the fold at all, the turn as a band at
          the foot, which is where it used to be. */}
      {grip}
      {turnLine}

      {/* The band at the foot — Card · Beacon · People · Inbox — went on
          2026-10-22 for the top row (Header.js, in the bar above): the foot
          is the Listen bar's now (DECISIONS, the frame). It is the frame's,
          not a pane's: it stays at the foot of the screen on every pane and
          over an entry opened on the journal, and steps down when anything
          else owns the foot (ListenBar.js). The keeper's alone. */}
      {authed && <ListenBar held={inHand} live={isLive} />}
    </div>
  );
}
