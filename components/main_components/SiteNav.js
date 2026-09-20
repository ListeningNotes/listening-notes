// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/SiteNav.js
// The sitewide nav row: the mark in the middle, and the owner's ··· at the
// right on the pages that have one.
//
// The right, because that is where the card keeps its ··· and one site has one
// place for a thing (Miyel, 2026-09-15). It was on the left for a day, which
// was the turn's corner on the cross rather than anything this row had a
// reason for.
//
// The left-hand side is empty now, and so was the right until this evening: it
// held a sun and a moon on every page of the site, which made light-or-dark
// something you could hit by accident while reaching for the mark. That lives
// in one place, the top right of the beacon. Both empty columns stay, because
// a three-column row with two columns in it does not hold the mark in the
// middle.
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
// The mark goes home, which is the cross, which opens on the beacon. It
// used to need a sessionStorage flag to steer between two screens; there is
// one home now, so there is nothing to steer.
//
// This row does not render on the homepage at all: the cross carries its own
// bar (see HomeNav.js), because a fixed row belonging to no pane cannot be one
// of the panes' children.

'use client';
import { useState, useEffect } from 'react';

// `tools` is whatever the page wants in the left slot — in practice the
// owner's, on the pages that have any. It arrives as an element rather than as
// a flag because this row should not know what a keeper is: it holds a slot
// open and the page decides what belongs in it. On every other page the slot
// is an empty grid column, which is the thing holding the mark in the middle.
export default function SiteNav({ tools = null, mark = null }) {
  // ── What is in the middle, 2026-09-20 ─────────────────────────────────
  // Whatever the page puts there, and on most pages nothing. It was the LN
  // mark, drawn on entries and nowhere else, until the entry asked for the
  // middle for itself: on a phone the album art collapses up into this row
  // and becomes the header, so a logo standing in the same slot is a second
  // thing in a place that holds one (Miyel: "we don't need the Listening
  // Notes logo up there, it could just be the album").
  //
  // A slot rather than a flag, the same way `tools` is one: this row holds
  // the middle open and the page decides what belongs in it. The empty
  // column is still what keeps the tools on the right.
  // This row and the dot-nav beneath it are fixed with no background of their
  // own, so page text scrolled straight through the logo and the dot labels. The backdrop that hides it (.sitenav-row::before) only fades
  // in once the page has actually moved, so each page's hero art still runs
  // to the top of the screen while you're sitting at the top of it.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className={'sitenav-row' + (scrolled ? ' sitenav-row--scrolled' : '')}>
      {/* The left slot, and there is nothing in it. It is a spacer that holds
          the mark on the middle of the row. */}
      <div className="sitenav-side sitenav-side--left" aria-hidden="true" />

      {mark}

      {/* The right slot: the owner's ···, on the pages that have one, in the
          corner the card keeps its own in. */}
      <div className="sitenav-side sitenav-side--right">{tools}</div>
    </div>
  );
}
