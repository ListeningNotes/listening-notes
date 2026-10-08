// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/Footer.js
// The band across the foot of the cross: Card · Beacon · Friends · Inbox, the
// panes named, with the one you are on in ink.
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
// there. One band, and nothing else.
//
// ── The glyphs are decoration and have to earn it ─────────────────────────
// The labels carry the meaning. Every mark here is one this site already uses
// for exactly this thing — the broadcast for what is playing, the card for the
// person, the envelope for something that arrived, the address book for the
// journals you read — so none of them is a coinage and none has to be learned
// twice. The desk's stack of lines went with the desk. An open book was
// considered once and is wrong for any of them, because the book is the
// journal and the journal is *down* from the beacon, not sideways. If one of
// these ever needs explaining, the brief's own instruction is to drop them all
// and keep the words.
'use client';

import { AddressBook, Broadcast, Envelope, IdentificationCard } from '@phosphor-icons/react';

// ── Four for the keeper, two for everybody else ───────────────────────────
// The desk was the third stop and is gone (2026-09-19). It was a page of
// doors, which is a place you pass through on the way somewhere — and the two
// rooms worth standing in, the inbox and the people, were behind it. They are
// stops of their own now, so nothing on this band is a corridor (Miyel's
// friends brief, and the band it draws).
//
// Signed out there is no inbox and nobody to read. The third stop was the
// About pane, a page about the software, until 2026-09-28: a visited journal
// is a card, a beacon and entries, and the software's line is at the foot of
// the card (DECISIONS). The count follows what there is.
function stops(authed) {
  const here = [
    { key: 'card', word: 'Card', Icon: IdentificationCard, label: 'About this journal' },
    { key: 'beacon', word: 'Beacon', Icon: Broadcast, label: 'Now listening' },
  ];
  if (!authed) return here;
  // ── Friends before Inbox, 2026-09-19 ─────────────────────────────────
  // Miyel's reason, and it is about the shape of the rail rather than about
  // what the rooms are for: "two double levels two not sandwiched." Two of
  // these four panes have a second floor — the beacon with the journal under
  // it, and the book with the feed — and two are a single page. With the
  // inbox third, a flat pane sat between the two deep ones and down meant
  // something different on every second stop. Together, the rail reads
  // flat, deep, deep, flat, and going sideways from one two-floor pane to
  // the other does not pass through a page with no downstairs.
  //
  // The address book's own mark, as the desk's row wore it. Not a pair of
  // people: this is a book of addresses you keep, not a group you belong to,
  // and the difference is the whole model.
  here.push({ key: 'friends', word: 'Friends', Icon: AddressBook, label: 'The journals you read' });
  // Envelope is the mark the whole site already puts on a record that arrived
  // from somebody — it is what the room of arrivals should wear, and the
  // sending tool deliberately wears a different one so the two never read as
  // the same verb (KeeperTools, 2026-09-17).
  here.push({ key: 'inbox', word: 'Inbox', Icon: Envelope, label: 'What has arrived' });
  return here;
}

// `onHere` is the stop you are already on, pressed: back to the top of the
// floor you are on, and twice inside half a second to floor one (HomeNav,
// goBack). Pressing any other stop moves the rail (goTo).
export default function Footer({ pane, goTo, onHere = null, authed = false }) {
  const here = stops(authed);
  return (
    <nav className="hn-foot" aria-label="The panes">
      {here.map((stop, i) => (
        <button
          key={stop.key}
          type="button"
          className={'hn-foot-stop' + (pane === i ? ' hn-foot-stop--here' : '')}
          onClick={() => (pane === i && onHere ? onHere(i) : goTo(i))}
          /* aria-current rather than aria-disabled on the pane you are on: it
             is still pressable, and pressing it is how you get back to the top
             of a pane you have scrolled down (and, twice, to its first screen). */
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
