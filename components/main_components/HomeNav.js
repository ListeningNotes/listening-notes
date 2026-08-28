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
import { useTheme } from './Lightswitch';
import { foldKey, useListeningBeacon } from '../../hooks/useListeningBeacon';
import { useBookplate } from './Bookplate';
import ListeningBeacon from './ListeningBeacon';
import AlbumStrip from './AlbumStrip';
import EdgeCaret from './EdgeCaret';
import About from './About';
import Dashboard from './Dashboard';
import Pitch from './Pitch';

// Left, centre, right. Centre is the one you land on, which is why it is not
// index 0 — the rail is scrolled to it on mount before the first paint.
const HOME = 1;

// Smooth, unless the reader has asked for less. A page that slides sideways
// under someone who has turned motion off is the one place on this site where
// the animation *is* the navigation, so it is not removed — it is made instant,
// which still lands in the right place.
function ease() {
  if (typeof window === 'undefined') return 'auto';
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

export default function HomeNav({ entries = [], loading = false, stamps, authed = false, waiting }) {
  const { cover_name } = useBookplate();
  const { theme, toggle: toggleTheme } = useTheme();
  const { isLive, recentAlbums } = useListeningBeacon();

  const railRef = useRef(null);
  // One ref per pane's own vertical scroller. Written as three rather than an
  // array of refs because the panes are three different things, not three of
  // the same thing, and a loop over them would be pretending otherwise.
  const paneRefs = [useRef(null), useRef(null), useRef(null)];

  const [pane, setPane] = useState(HOME);
  // Whether each pane has anything below its first screen, and whether you are
  // already down there. Both are measured, never declared.
  const [deep, setDeep] = useState([false, false, false]);
  const [down, setDown] = useState([false, false, false]);

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
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

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
        // The scroller and its content both matter: the scroller changes with
        // the window, the content changes with the data, and observing only
        // the first misses every case that actually moves the caret.
        if (ref.current.firstElementChild) observer.observe(ref.current.firstElementChild);
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
  }, []);

  function goTo(index) {
    const el = railRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: ease() });
  }

  function goDown(index) {
    const el = paneRefs[index].current;
    if (!el) return;
    el.scrollTo({ top: el.clientHeight, behavior: ease() });
  }

  // ── The one row that sits over all three panes ────────────────────────────
  // The mark, and the way to turn the lights on and off. Fixed above the rail
  // rather than repeated inside each pane: it does not belong to any of them,
  // and three copies of it would slide past each other during a swipe.
  //
  // The mark is the live indicator. The dot on the period is the same green
  // that means "playing" everywhere else on the site, which means the one thing
  // present on every screen is also the one thing that has to be present on
  // every screen.
  const header = (
    <div className={'hn-bar' + (down[pane] ? ' hn-bar--scrolled' : '')}>
      <Link href="/" className="hn-mark" aria-label={cover_name} onClick={e => { e.preventDefault(); goTo(HOME); }}>
        <svg viewBox="76 96 241 140" className="hn-mark-svg" xmlns="http://www.w3.org/2000/svg">
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

      <button className="hp-icon-btn hn-lights" onClick={toggleTheme} aria-label="Toggle theme">
        {theme === 'dark' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"/></svg>
        )}
      </button>
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

  // The writing entrance, kept exactly as it was on the cover. Signed out it
  // renders nothing at all, so a visitor sees a pane with no seam in it.
  const writingLine = authed && (
    <div className="hp-write-row">
      <Link href="/dashboard/echo" className="hp-write">+ Start a listen</Link>
      <Link href="/dashboard/inbox" className="hp-write">
        Messages
        {waiting?.total > 0 && <span className="hp-write-count">{waiting.total}</span>}
      </Link>
    </div>
  );

  // The wall, still the old strip. Step two of the cross replaces this with
  // Journal — the real archive, search and all — mounted here and at /archive
  // off one component. Until then the centre pane keeps what it had, so the
  // restructure can be looked at without the wall changing underneath it.
  const wall = loading ? (
    <div className="hp-strip hp-strip--grid">
      <div className="hp-strip-track hp-strip-track--grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="strip-tile strip-tile--skeleton strip-tile--grid" />
        ))}
      </div>
    </div>
  ) : (
    <AlbumStrip entries={entries} variant="grid" />
  );

  return (
    <div className="hn">
      {header}

      <div className="hn-rail" ref={railRef}>
        <section className="hn-pane" ref={paneRefs[0]} aria-label="About this journal">
          <About stamps={stamps} authed={authed} />
        </section>

        <section className="hn-pane hn-pane--home" ref={paneRefs[1]} aria-label="Now listening">
          <div className="hn-screen">
            <div className="hp-dashboard">
              <div className="hp-dash-cell hp-dash-beacon">
                <ListeningBeacon statusAboveArt />
              </div>
            </div>
            {recentRow}
            {writingLine}
          </div>
          <div className="hn-under">
            <div className="hn-under-title">The journal</div>
            {wall}
            {!loading && entries.length > 0 && (
              <div className="hp-strip-actions">
                <Link href="/archive" className="ln-pill">See full archive</Link>
                <Link href="/compare" className="ln-pill">Compare</Link>
                <Link href="/submit" className="ln-pill">Submit an album</Link>
              </div>
            )}
          </div>
        </section>

        <section className="hn-pane" ref={paneRefs[2]} aria-label={authed ? 'Your desk' : 'About this software'}>
          {authed ? <Dashboard waiting={waiting} /> : <Pitch />}
        </section>
      </div>

      {/* Pinned to the window rather than to a pane, so they hold still while
          the panes move under them. Faded out at the ends of the rail: a caret
          pointing at nothing is worse than no caret. */}
      <EdgeCaret
        direction="left"
        onClick={() => goTo(pane - 1)}
        label="About this journal"
        hidden={pane <= 0}
      />
      <EdgeCaret
        direction="right"
        onClick={() => goTo(pane + 1)}
        label={authed ? 'Your desk' : 'About this software'}
        hidden={pane >= 2}
      />

      {/* One per pane, drawn only where there is something below and only
          while you are still at the top of it. */}
      {[0, 1, 2].map(i => (
        <EdgeCaret
          key={i}
          direction="down"
          onClick={() => goDown(i)}
          label="More on this page"
          hidden={!deep[i] || down[i] || pane !== i}
        />
      ))}
    </div>
  );
}
