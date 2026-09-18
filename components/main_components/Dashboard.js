// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/Dashboard.js
// One face of the cross's turning pane, seen only by whoever keeps the journal.
// The other face is the card; a switch at the foot of the pane turns between
// them, and the journal does not move when it does.
//
// One thing leads and the rest are a list. Starting a listen is the only thing
// here that makes something which does not exist yet; the rest act on things
// that already do, and a row of identical squares said they were equal choices
// when they never have been. What you came to do is listen.
//
// It is a band now, not a square, 2026-09-15. A 180px square is a third of a
// phone screen spent on one door, and the doors under it were being pushed
// off the first screen by it — the thing it was sized to be, the third square
// of a cross whose other two were a portrait and an album, is not a shape this
// layout has any more.
//
// The desk is a page and pages scroll: the feed follows straight on below,
// with no second floor and nothing to arrive at. Down is cover-then-contents
// and only two things on this site have that shape — the beacon and an
// entry — so a vertical drag here is ordinary scrolling and nothing has to
// decide between arriving and scrolling.
//
// There is no login control anywhere on this site and none here either. A
// journal does not ask who you are — signed in, the cross simply has a pane it
// did not have before. Signed out this file never renders and Pitch takes the
// pane, so a visitor never sees a door they cannot open.

'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Broadcast, Envelope, AddressBook, Cards, GearSix } from '@phosphor-icons/react';
import { useListeningBeacon } from '../../hooks/useListeningBeacon';
import { PENDING_EVENT } from '../../hooks/useListeningSession';
import { VERSION, RELEASE_URL } from '../../library/version';

// Everything but the first: messages, which are what you open the journal to
// check; the address book, which is where the people you read live; and the
// machinery. Under them, the one line about the software: the version, a
// newer one when there is one, and Report a problem (2026-09-13) — a box on
// a sheet that sends what was written to the one copy the software comes
// from, the bug button every keeper has, without leaving Listening Notes.
//
// There was a Share door here too, opening the Instagram slide exporter, with
// a note promising the card printer that never merged. Sharing happens from
// an entry's own page and from the card now, so the door and the page went
// together, 2026-09-06.
//
// There was a third — Entries, a table of everything with an edit form behind
// each row. It is gone, and so is the door: correcting an entry happens on the
// entry now, which means the way to reach the form is to be reading the thing
// it corrects. A list of all your writing already exists and is called the
// journal; a second one that only its owner could see was a CMS grown beside a
// site that did not need one.
const DOORS = [
  { href: '/dashboard/inbox',   label: 'Inbox',   note: 'Submissions and comments waiting on you', Icon: Envelope, count: w => w?.total },
  // What the people in the address book logged. It ran on down this pane's own
  // scroll until 2026-09-15, under the rows; the desk is a hero and its rows
  // and stops there now, so the feed is a door like the others (Miyel's
  // brief). Above the address book because it is the thing you come here to
  // read — the book is how you change what is in it.
  // Cards and not a stack of lines: the band at the foot took the stack for
  // the desk itself, and two rows of this pane cannot wear the same mark as
  // the pane. Cards is also the truer picture — the feed is records going
  // past, one album-shaped thing after another, which is what it draws.
  { href: '/dashboard/feed', label: 'Feed', note: 'What the journals you read have logged', Icon: Cards },
  // The journals this keeper reads, by address. A place, not a filter
  // inside the feed: it is what the feed and comparing are built from, and
  // it exists before either does (2026-09-12).
  { href: '/dashboard/people',  label: 'Address book', note: 'The journals you read', Icon: AddressBook },
  // Drafts had a row here for a day. The picker is already where they live —
  // it lists them with a Resume and a discard the moment you start a listen —
  // so the row was a signpost to a place you pass through anyway (Miyel,
  // 2026-09-15). It was never an interface, only a number, and the number was
  // a database COUNT on every poll of /api/waiting; that went with it.
  // *Your card* was a row here for an evening, while the ID pane had no
  // control of its own. It has a ··· now, in the same corner an entry keeps
  // its own in, so the card is corrected on the card — which is the rule this
  // repo keeps everywhere else: everything editable is edited where it prints
  // (Miyel, 2026-09-15). `/?edit=card` still works and still lands on the card
  // with the correction open; it is an address now rather than a door.
  // The machinery: the key, the password, the beacon, the address. A row
  // again, and for the same reason — it was a gear in this pane's header for
  // an hour and headers hold no icons. Last.fm was named here until
  // 2026-09-16, when it came out of the software.
  { href: '/settings', label: 'Settings', note: 'The key, password, beacon, address', Icon: GearSix },
];

// ── The record on the desk ──────────────────────────────────────────────────
// A listen in progress is a key in the browser, not a thing the server knows,
// so this is the honest question to ask. The key is written out rather than
// imported from useListeningSession, which owns it: importing it would pull
// the tracklist fetcher and the entry formatter into the front door's bundle
// for the sake of one string, and the inbox writes the same key the same way
// for the same reason.
const PENDING_KEY = 'ln_pending_session';

// Exported because the beacon pane asks the same question. The desk answers it
// for a row and the beacon answers it for the line under the record, and a
// second reader of the same key written a second way is how the two would come
// to disagree about whether there is a listen open. If a third surface ever
// wants it, this pair has outgrown the desk and wants a file of its own.

// Read as an external store, the way the wall reads its density and the cross
// its spine width — a browser-only value read in an effect trips the lint rule
// the project keeps, and this is the shape that rule wants. The snapshot is
// kept against the raw string so the same render does not hand React a new
// object every time and spin.
let lastRaw = null;
let lastHeld = null;
export function heldNow() {
  let raw = null;
  try { raw = localStorage.getItem(PENDING_KEY); } catch { /* storage off */ }
  if (raw !== lastRaw) {
    lastRaw = raw;
    try {
      const held = JSON.parse(raw);
      lastHeld = held?.album ? held : null;
    } catch { lastHeld = null; }
  }
  return lastHeld;
}
export function subscribeHeld(listener) {
  // Another tab, and this one. `storage` fires everywhere except the tab that
  // wrote the key, and the desk and the listen are always the same tab, so the
  // second half is the one that matters here — see PENDING_EVENT.
  window.addEventListener('storage', listener);
  window.addEventListener(PENDING_EVENT, listener);
  return () => {
    window.removeEventListener('storage', listener);
    window.removeEventListener(PENDING_EVENT, listener);
  };
}

export default function Dashboard({ waiting, mark = null }) {
  // ── Whether a listen is open ──────────────────────────────────────────────
  // On a desk the session is the right page and the desk stays beside it, so
  // the door has to say what the page next to it is doing: Start a listen is
  // Listening now for as long as there is a record in hand. Whether it is lit
  // is a different question, answered below.
  //
  // The address is the re-read. usePathname renders this again on every
  // navigation, which is every moment the answer can have changed — opening a
  // listen, leaving one, saving the entry it became — and React asks the store
  // for a fresh snapshot on any render. The desk never unmounts, so there is
  // nothing else to hang it on. Null on the server, so the door renders as
  // itself and lights a frame later rather than the other way round.
  usePathname();
  const inHand = useSyncExternalStore(subscribeHeld, heldNow, () => null);
  // ── Why this door is green, and when ──────────────────────────────────────
  // Two different things, on one control, 2026-09-16 (Miyel).
  //
  // The WORDS are about the record on your desk: "Listening now" and its name,
  // for as long as there is one, because pressing this is how you get back to
  // it and a door you can return through has to say so.
  //
  // The GREEN is about the beacon. It is the one colour on this site that means
  // live, and this is where an owner sees it — so it is lit exactly while the
  // journal is telling the world something, and dark the moment it stops. That
  // is what makes it readable as "you are broadcasting" rather than "you have
  // something open", which is what Miyel was already reading it as.
  //
  // They come apart, deliberately. Leave the listen and walk away: the door
  // still says Listening now, because the record is still on the desk and this
  // is the way back to it — and the green goes out, because the beacon has.
  const { isLive } = useListeningBeacon();
  // Whether a newer Listening Notes exists. Asked once, of this copy's own
  // server, which asks GitHub's public releases at most once an hour (see
  // app/api/update/route.js). The only thing this can ever say is that
  // there is a newer version, and where the button to take it is.
  const [update, setUpdate] = useState(null);
  useEffect(() => {
    fetch('/api/update')
      .then(r => (r.ok ? r.json() : null))
      .then(d => d?.newer && setUpdate(d))
      .catch(() => {});
  }, []);

  return (
    <div className="db-pane">
      <div className="db-body">
        {/* The mark, and nothing else. Headers hold no icons: the mark is
            centred and the sides are for navigation, which here is the turn
            the cross draws at the left of this line. Settings was a gear in
            this slot for an hour and is a row below again. The mark is small
            and the beacon keeps the large one — a crown is for a cover, and
            the desk is a page — and it comes down from the cross rather than
            being drawn again, since the cross owns the one mark this site
            has. */}
        <div className="db-head">{mark}</div>

        {/* The one big thing on the pane. It is a link and not a button
            because it goes somewhere — the listening flow is its own route
            with its own background, and pretending otherwise with a button
            would only mean a navigation that looked like it failed.

            With a record in hand it says so, and lights. The same address
            either way: pressing it is how you get back to the listen, which
            is what somebody who can see it is lit would expect it to do. The
            record's name under the words, because "Listening now" without it
            is a light with no subject. */}
        <Link
          href="/session"
          className={'ln-tile db-hero' + (isLive ? ' db-hero--lit' : '')}
          title={inHand ? `Back to ${inHand.album}` : undefined}
        >
          {/* The beacon's own mark, so the door and the thing it lights are
              plainly the same idea. It was a pair of headphones, which says
              listening rather than broadcasting. */}
          <Broadcast size={34} weight="regular" aria-hidden="true" />
          <span className="db-hero-label">{inHand ? 'Listening now' : 'Start a listen'}</span>
          {inHand && <span className="db-hero-record">{inHand.album}</span>}
        </Link>

        <div className="db-doors">
          {DOORS.map(({ href, label, note, Icon, count }) => {
            const n = count ? count(waiting) : 0;
            return (
              <Link key={href} href={href} className="ln-tile db-door" title={note}>
                <Icon size={22} weight="regular" aria-hidden="true" className="db-door-mark" />
                <span className="db-door-text">
                  <span className="db-door-label">{label}</span>
                </span>
                {/* The counts, and they earn their place by being the only
                    things you need to see without going to look. Everything
                    else here is a door you open when you have decided to;
                    these are the two that have to be able to tell you there
                    is a reason to. Null until asked, so a row never flashes a
                    zero on the way to a number. */}
                {n > 0 && <span className="db-count">{n}</span>}
              </Link>
            );
          })}
        </div>

        {/* The one line on the desk that is about the software rather than
            the journal: which version this is, and — only when it is true —
            that there is a newer one. The same number the pitch pane shows
            a visitor beside Source; no Source here, because §13 is owed to
            visitors and the owner already has the code. */}
        <p className="db-colophon">
          <a className="pt-source" href={RELEASE_URL} target="_blank" rel="noopener noreferrer" title="What this version contains">
            {VERSION}
          </a>
          {update && (
            <>
              <span className="pt-colophon-dot" aria-hidden="true">·</span>
              {/* In ink, not faint: it is only ever here when it is true,
                  and a line that appears once in a while can afford to be
                  seen — the Inbox count's rule (Miyel, 2026-09-13). */}
              <a className="db-update db-update--newer" href={update.page} target="_blank" rel="noopener noreferrer">
                A newer version is available &#8599;
              </a>
            </>
          )}
          {/* The bug button: a sheet over the desk, one box, Send — it goes
              to the one copy the software comes from (library/version.js).
              A link to GitHub lasted an hour; see app/dashboard/report. */}
          <span className="pt-colophon-dot" aria-hidden="true">·</span>
          <Link className="db-update" href="/dashboard/report" title="Something did not work">
            Report a problem
          </Link>
        </p>
      </div>
    </div>
  );
}
