// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/Footer.js
// The band across the foot of the cross: Card · Beacon · Desk, the three panes
// named, with the one you are on in ink.
//
// ── Why this exists ───────────────────────────────────────────────────────
// The cross went to two panes and a button because sideways meant two
// different things — about you on the left, your tools on the right — and
// three panes that looked alike with nothing saying where you were is what
// made three fail the first time. Neither problem was the count. This band
// fixes the second one outright: every pane says what it is and what is either
// side of it, all the time, so the panes no longer have to be told apart by
// their shape (Miyel's brief, 2026-09-15).
//
// ── It is the visible version of the swipe, not an alternative to it ──────
// Pressing a name moves the rail exactly as a swipe does — the same scroll,
// the same curve, the same landing. Somebody presses Desk once, watches the
// rail move, and swipes from then on. That was always what the edge carets
// were for, and words do it better than chevrons: a chevron says there is
// something that way, and a word says what.
//
// It replaces the dots, the carets and everything else that used to live down
// there. One band, three destinations, nothing else.
//
// ── The glyphs are decoration and have to earn it ─────────────────────────
// The labels carry the meaning. Two of the marks were already in use and mean
// what they draw — the broadcast for what is playing, the card for the person.
// The desk's is a stack of lines, which is what a desk of rows looks like from
// above and what no other mark on this site is; an open book was the obvious
// one and is wrong, because the book is the journal and the journal is *down*
// from the beacon, not sideways. If any of the three ever needs explaining,
// the brief's own instruction is to drop all three and keep the words.
'use client';

import { Broadcast, IdentificationCard, Info, Rows } from '@phosphor-icons/react';

// Signed out the third pane is the colophon rather than a desk, and it is a
// different kind of thing — a page about the software, not a set of doors — so
// it takes its own word and its own mark rather than wearing the owner's.
function stops(authed) {
  return [
    { key: 'card', word: 'Card', Icon: IdentificationCard, label: 'About this journal' },
    { key: 'beacon', word: 'Beacon', Icon: Broadcast, label: 'Now listening' },
    {
      key: 'desk',
      word: authed ? 'Desk' : 'About',
      Icon: authed ? Rows : Info,
      label: authed ? 'Your desk' : 'About this software',
    },
  ];
}

export default function Footer({ pane, goTo, authed = false }) {
  const here = stops(authed);
  return (
    <nav className="hn-foot" aria-label="The panes">
      {here.map((stop, i) => (
        <button
          key={stop.key}
          type="button"
          className={'hn-foot-stop' + (pane === i ? ' hn-foot-stop--here' : '')}
          onClick={() => goTo(i)}
          /* aria-current rather than aria-disabled on the pane you are on: it
             is still pressable, and pressing it is how you get back to the top
             of a pane you have scrolled down. */
          aria-current={pane === i ? 'true' : undefined}
          title={stop.label}
        >
          <stop.Icon size={17} weight="regular" aria-hidden="true" className="hn-foot-mark" />
          <span className="hn-foot-word">{stop.word}</span>
        </button>
      ))}
    </nav>
  );
}
