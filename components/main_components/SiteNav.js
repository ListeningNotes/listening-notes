// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/SiteNav.js
// The sitewide nav row: the mark in the middle, one control on each side.
//
// That shape is the whole point of this file. It is the arrangement the About
// card uses, scaled down, and until now it was not what this row did — the
// mark sat left, a compact beacon sat centre, and the row read differently
// from every pane of the cross. One header everywhere means one header
// everywhere.
//
// ── The beacon is gone from here ──────────────────────────────────────────
// It was a persistent status bar for something the visitor had already been
// told, sitting a few pixels above somebody's writing and moving while they
// read it. What is playing lives on the beacon pane, which is one swipe from
// anywhere, and that is enough.
//
// Not for the polling, which was the other argument and is a wrong one:
// useListeningBeacon runs one timer for however many components subscribe, so
// this row never cost a request of its own. The mark's live dot still reads
// isLive, and still costs nothing.
//
// The mark goes home, which is the cross, which opens on the centre pane. It
// used to need a sessionStorage flag to steer between two screens; there is
// one home now, so there is nothing to steer.
//
// This row does not render on the homepage at all: the cross carries its own
// bar (see HomeNav.js), because a fixed row belonging to no pane cannot be one
// of the panes' children.

'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from './Lightswitch';
import { useListeningBeacon } from '../../hooks/useListeningBeacon';
import { useBookplate } from './Bookplate';

// `tools` is whatever the page wants in the left slot — in practice the
// owner's, on the pages that have any. It arrives as an element rather than as
// a flag because this row should not know what a keeper is: it holds a slot
// open and the page decides what belongs in it. On every other page the slot
// is an empty grid column, which is the thing holding the mark in the middle.
export default function SiteNav({ tools = null }) {
  const { cover_name } = useBookplate();
  const { theme, toggle } = useTheme();
  const { isLive } = useListeningBeacon();

  // This row and the dot-nav beneath it are fixed with no background of their
  // own, so page text scrolled straight through the logo, the toggle and the
  // dot labels. The backdrop that hides it (.sitenav-row::before) only fades
  // in once the page has actually moved, so each page's hero art still runs
  // to the top of the screen while you're sitting at the top of it.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // The mark used to steer the old two-screen cover, flagging sessionStorage
  // so a navigation home landed on screen two. Neither screen exists — home is
  // the cross, and it always opens on the centre pane, which is what that was
  // reaching for. So it is a plain link again and the flag is gone with the
  // markup that read it.

  return (
    <div className={'sitenav-row' + (scrolled ? ' sitenav-row--scrolled' : '')}>
      {/* The left slot. Empty on most pages: it is where the owner's tools go
          on the ones that have any, and an empty grid column is what holds the
          mark in the middle when they do not. */}
      <div className="sitenav-side sitenav-side--left">{tools}</div>

      <Link href="/" className="sitenav-logo" aria-label={cover_name}>
        <svg viewBox="76 96 241 140" className="sitenav-logo-mark" xmlns="http://www.w3.org/2000/svg">
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
            className={'sitenav-logo-dot' + (isLive ? ' sitenav-logo-dot--live' : '')}
          />
        </svg>
      </Link>

      <button className="hp-icon-btn sitenav-theme-btn" onClick={toggle} aria-label="Toggle theme">
        {theme === 'dark' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"/></svg>
        )}
      </button>
    </div>
  );
}
