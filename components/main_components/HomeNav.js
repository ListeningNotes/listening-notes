// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/HomeNav.js
// The cross. Three panes side by side, each one scrolling on its own.
//
//        About  ←  [ Home ]  →  Dashboard / Pitch
//                     ↓
//                  Journal
//
// Left is who keeps this journal, centre is what is playing, right is the desk
// if you are the owner and the pitch if you are not. Down, from any of them,
// is however much more that pane has — which for the centre is the whole
// archive and for the pitch is nothing at all.
//
// ── Why a rail and not routes ───────────────────────────────────────────────
// The three panes are one page. They have to be: a swipe that triggered a
// navigation would unmount the pane you were leaving, throw away where you had
// scrolled to in it, and re-fetch it on the way back. Everything about the
// gesture — that it is continuous, that it is reversible, that the pane you
// return to is where you left it — depends on all three being mounted at once.
// So this is a horizontal scroll container with three children and the browser
// does the physics.
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
// The down caret is drawn by measurement rather than by being told: a pane is
// deep if its scroller overflows. That is what makes a fresh copy correct for
// free — an install with no about paragraph and no rig has nothing under the
// card, so nothing points down at it — and it is why the pitch pane's missing
// bottom edge is not a special case in this file.
//
// ── Desktop ─────────────────────────────────────────────────────────────────
// The same three components, all visible at once in three columns, no gesture
// and no carets. It is the same structure said out loud rather than a second
// layout: the site already carried two separate homepage markup trees that
// drifted apart, and a third would have been the same mistake twice.

'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { IdentificationCard, BookOpen, Broadcast, Gear, Info } from '@phosphor-icons/react';
import { useTheme } from './Lightswitch';
import { foldKey, useListeningBeacon } from '../../hooks/useListeningBeacon';
import { useBookplate } from './Bookplate';
import ListeningBeacon from './ListeningBeacon';
import Journal from './Journal';
import EdgeCaret from './EdgeCaret';
import About from './About';
import Dashboard from './Dashboard';
import Pitch from './Pitch';

// Left, centre, right. Centre is the one you land on, which is why it is not
// index 0 — the rail is scrolled to it on mount before the first paint.
const HOME = 1;

// What each pane is, as a mark and as a sentence. The controls at the foot of
// the cross read out of this rather than out of their own direction, because
// the useful thing to say is where a press lands and not which way it goes.
// Pressing right from the card returns to the beacon; a cog over that arrow
// would be describing a pane one further along that the press does not reach.
function paneMarks(authed) {
  return [
    { Icon: IdentificationCard, label: 'About this journal' },
    { Icon: Broadcast, label: 'Now listening' },
    { Icon: authed ? Gear : Info, label: authed ? 'Your desk' : 'About this software' },
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

export default function HomeNav() {
  const { cover_name, pinned_entry_id } = useBookplate();
  const { theme, toggle: toggleTheme } = useTheme();
  const { isLive, recentAlbums } = useListeningBeacon();

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
  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.json())
      .then(d => {
        setAuthed(!!d.authed);
        // Only asked once the wristband is confirmed — the endpoint answers
        // 401 to anyone else, and a failed request on every public visit is
        // noise in the log for no reason.
        if (d.authed) {
          fetch('/api/waiting')
            .then(r => (r.ok ? r.json() : null))
            .then(w => w && setWaiting(w))
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  const railRef = useRef(null);
  // One ref per pane's own vertical scroller. Written as three rather than an
  // array of refs because the panes are three different things, not three of
  // the same thing, and a loop over them would be pretending otherwise.
  const paneRefs = [useRef(null), useRef(null), useRef(null)];

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
  // The scroller inside each pane's lower half. The pane used to be what
  // scrolled the journal; now the pane only ever moves between two screens and
  // the reading scrolls inside the second one, so anything that needs to know
  // what is moving under it — the wall's sticky bar, its filter sheet — has to
  // be given this rather than the pane.
  const underRefs = [useRef(null), useRef(null), useRef(null)];
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
  useLayoutEffect(() => {
    const el = railRef.current;
    if (el) el.scrollLeft = el.clientWidth * HOME;
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
  const measure = useCallback(() => {
    setDeep(paneRefs.map(ref => {
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
  }, [measure, entries, loading, authed, stamps]);

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
  }

  function goDown(index) {
    const el = paneRefs[index].current;
    if (!el) return;
    el.scrollTo({ top: el.clientHeight, behavior: ease() });
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
      <button className="hp-icon-btn hn-lights" onClick={toggleTheme} aria-label="Toggle theme">
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
      <Link href="/" className="hn-crown-mark" aria-label={cover_name} onClick={e => { e.preventDefault(); goTo(HOME); }}>
        <svg viewBox="76 96 241 140" className="hn-crown-svg" xmlns="http://www.w3.org/2000/svg">
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
      </Link>
    </div>
  );

  // ── What came before ──────────────────────────────────────────────────────
  // The last three records, under the beacon. Unchanged from the cover it came
  // off — records rather than tracks, dimmed because they are the past, and one
  // tap opens the entry when the album is in the journal, which is what stops
  // the row being decoration.
  const recentRow = recentAlbums.length > 0 && (
    <div className="hp-recent">
      {recentAlbums.map(album => {
        const entry = entries.find(e => e.album_key === album.key)
          || entries.find(e => foldKey(e.album) === album.title);
        const label = `${album.album} — ${album.artist}`;
        const cover = album.art || entry?.album_art;
        const art = cover
          ? <img src={cover} alt="" />
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

  const marks = paneMarks(authed);

  return (
    <div className="hn">
      {header}

      {/* Once you are downstairs the rail stops taking sideways gestures.
           The carets already hid themselves down there, on the argument that a
           control pointing at a pane you cannot see is noise — but hiding the
           sign while leaving the door open is the worse half of the deal, and
           swiping between panes from halfway down somebody's writing lands you
           in an unrelated pane at an unrelated scroll position with no memory
           of how you got there.
 
           Blocked with touch-action rather than by taking the overflow away:
           overflow-x: hidden on a scrolled container snaps it back to zero, so
           going down a pane would slide the cross back to the card. This lets
           vertical through and refuses horizontal, and the rail keeps its
           place. */}
      <div className={'hn-rail' + (down[pane] ? ' hn-rail--held' : '')} ref={railRef}>
        <section className="hn-pane" ref={paneRefs[0]} aria-label="About this journal">
          <About stamps={stamps} authed={authed} pinned={pinned} entries={entries} crown={crown} />
        </section>

        {/* ── Two screens, not one long scroll ─────────────────────────
            The same shape an entry is read in: a card that holds still, and a
            screen below it that is its own place rather than more of the same
            page. Everything the pane holds is inside one of the two, so the
            snap has exactly two things to land on — the crown goes in with the
            card, because the mark is part of the card rather than something
            floating above a scroll.

            The lower half scrolls inside itself. That is the whole trick and
            it is why an entry feels solid: both screens stay exactly one
            viewport tall however long the writing under them runs, so the snap
            never has to decide between two places at once. */}
        <section className="hn-pane hn-pane--home" ref={paneRefs[1]} aria-label="Now listening">
          <div className="hn-top">
            {crown}
            <div className="hn-screen">
              <div className="hp-dashboard">
                <div className="hp-dash-cell hp-dash-beacon">
                  <ListeningBeacon />
                </div>
              </div>
              {recentRow}
            </div>
          </div>
          <div className="hn-under">
            <div className="hn-under-scroll" ref={underRefs[1]}>
              <Journal
                entries={entries}
                loading={loading}
                scroller={underRefs[1]}
              />
            </div>
          </div>
        </section>

        <section className="hn-pane" ref={paneRefs[2]} aria-label={authed ? 'Your desk' : 'About this software'}>
          {crown}
          {authed ? <Dashboard waiting={waiting} /> : <Pitch />}
        </section>
      </div>

      {/* ── The row along the bottom ────────────────────────────────────
          All three together rather than one on each edge. Pinned to the edges
          they were three separate marks in three corners of somebody's
          photograph; in a row they read as one control, and the middle of the
          bottom edge is the one part of a phone screen that is reliably empty
          and reliably reachable.

          Each mark names the pane it lands on, which is why the left and right
          ones change as you move: from the card, right is the beacon.

          The whole row fades while anything is scrolling, and the two side
          controls stay away for as long as a pane is scrolled at all. Sideways
          is a decision you make at the top of a pane: once you are down in the
          wall, or down in the reading, the only thing worth offering is more of
          what you are already in, and three marks parked over somebody's album
          art are the row covering the thing you came to look at.

          The swipe itself is untouched. Hiding a control is a hint; disabling
          a gesture halfway down a page is the thing that would actually read as
          broken. */}
      <div className={'hn-controls' + (busy ? ' hn-controls--busy' : '')}>
        <EdgeCaret
          direction="left"
          onClick={() => goTo(pane - 1)}
          /* At the left end there is no pane to name. The control is hidden
             and inert there, but a button whose only label is the word "null"
             is still a button a screen reader could find. */
          label={marks[pane - 1]?.label || 'Back'}
          icon={marks[pane - 1]?.Icon}
          hidden={pane <= 0 || down[pane]}
        />
        <EdgeCaret
          direction="down"
          onClick={() => goDown(pane)}
          label="Read on"
          icon={BookOpen}
          hidden={!deep[pane] || down[pane]}
        />
        <EdgeCaret
          direction="right"
          onClick={() => goTo(pane + 1)}
          label={marks[pane + 1]?.label || 'Onward'}
          icon={marks[pane + 1]?.Icon}
          hidden={pane >= 2 || down[pane]}
        />
      </div>
    </div>
  );
}
