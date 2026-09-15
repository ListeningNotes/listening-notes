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
import { Headphones, Envelope, AddressBook, GearSix, NotePencil } from '@phosphor-icons/react';
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
  // The journals this keeper reads, by address. A place, not a filter
  // inside the feed: it is what the feed and comparing are built from, and
  // it exists before either does (2026-09-12).
  { href: '/dashboard/people',  label: 'Address book', note: 'The journals you read', Icon: AddressBook },
  // Unfinished listens. The address is the picker's, because the picker is
  // already where they live — it lists them with a Resume and a discard, and
  // a second page showing the same rows is the /dashboard/entries mistake
  // again (Miyel's call, 2026-09-15). So this row is a signpost with a number
  // on it and not an interface: the count is what it adds, because a listen
  // you have forgotten is the one most likely to be lost.
  //
  // Only when there are drafts AND nothing is in hand. Absent is the same
  // answer as a dead row without the press, and with a record in hand /session
  // resumes *that* listen rather than showing the list, so the row would not
  // do what it says.
  { href: '/session', label: 'Drafts', note: 'Listens you started and have not finished', Icon: NotePencil, count: w => w?.drafts, needsDrafts: true },
];

// Settings is not among them, 2026-09-15. It is the gear in the header now:
// the machinery is not somewhere you go as often as the other three and it was
// taking the same weight as them. The gear beside the card's pencil opens the
// same address.

// ── The record on the desk ──────────────────────────────────────────────────
// A listen in progress is a key in the browser, not a thing the server knows,
// so this is the honest question to ask. The key is written out rather than
// imported from useListeningSession, which owns it: importing it would pull
// the tracklist fetcher and the entry formatter into the front door's bundle
// for the sake of one string, and the inbox writes the same key the same way
// for the same reason.
const PENDING_KEY = 'ln_pending_session';

// Read as an external store, the way the wall reads its density and the cross
// its spine width — a browser-only value read in an effect trips the lint rule
// the project keeps, and this is the shape that rule wants. The snapshot is
// kept against the raw string so the same render does not hand React a new
// object every time and spin.
let lastRaw = null;
let lastHeld = null;
function heldNow() {
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
// Another tab putting a record down or picking one up. Within this tab there
// is no event to listen for — the session writes the key straight — so the
// re-read rides on the render the address change causes; see below.
function subscribeHeld(listener) {
  window.addEventListener('storage', listener);
  return () => window.removeEventListener('storage', listener);
}

export default function Dashboard({ waiting, mark = null }) {
  // ── Whether a listen is open ──────────────────────────────────────────────
  // On a desk the session is the right page and the desk stays beside it, so
  // the door has to say what the page next to it is doing: Start a listen is
  // Listening now, lit, for as long as there is a record in hand.
  //
  // The address is the re-read. usePathname renders this again on every
  // navigation, which is every moment the answer can have changed — opening a
  // listen, leaving one, saving the entry it became — and React asks the store
  // for a fresh snapshot on any render. The desk never unmounts, so there is
  // nothing else to hang it on. Null on the server, so the door renders as
  // itself and lights a frame later rather than the other way round.
  usePathname();
  const inHand = useSyncExternalStore(subscribeHeld, heldNow, () => null);
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
        {/* The header the card has, with the desk's own one tool in it. The
            mark is small here and the beacon keeps the large one: a crown is
            for a cover, and the desk is a page. It comes down from the cross
            rather than being drawn again — see HomeNav, which owns the one
            mark this site has. */}
        <div className="db-head">
          {mark}
          <Link
            href="/settings"
            className="db-tool"
            aria-label="Settings"
            title="Keys, password, Last.fm, the address"
          >
            <GearSix size={18} weight="regular" aria-hidden="true" />
          </Link>
        </div>

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
          className={'ln-tile db-hero' + (inHand ? ' db-hero--lit' : '')}
          title={inHand ? `Back to ${inHand.album}` : undefined}
        >
          <Headphones size={34} weight="regular" aria-hidden="true" />
          <span className="db-hero-label">{inHand ? 'Listening now' : 'Start a listen'}</span>
          {inHand && <span className="db-hero-record">{inHand.album}</span>}
        </Link>

        <div className="db-doors">
          {DOORS.map(({ href, label, note, Icon, count, needsDrafts }) => {
            if (needsDrafts && (inHand || !(waiting?.drafts > 0))) return null;
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
