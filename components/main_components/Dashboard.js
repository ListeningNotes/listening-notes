// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/Dashboard.js
// The right pane of the cross, seen only by whoever keeps the journal.
//
// Four doors, laid out as a pane rather than as a grid of app icons on a
// screensaver, which is what /dashboard used to draw. That address now
// forwards here: one description of the desk, in one place.
//
// One of the four leads and the other three are a list. Starting a listen is
// the only thing here that makes something which does not exist yet; the rest
// act on things that already do, and a row of four identical squares said they
// were four equal choices when they never have been. What you came to do is
// listen.
//
// There is no login control anywhere on this site and none here either. A
// journal does not ask who you are — signed in, the cross simply has a pane it
// did not have before. Signed out this file never renders and Pitch takes the
// pane, so a visitor never sees a door they cannot open.

'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Headphones, Envelope, AddressBook, GearSix } from '@phosphor-icons/react';
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
  { href: '/dashboard/inbox',   label: 'Inbox',   note: 'Submissions and comments waiting on you', Icon: Envelope, counted: true },
  // The journals this keeper reads, by address. A place, not a filter
  // inside the feed: it is what the feed and comparing are built from, and
  // it exists before either does (2026-09-12).
  { href: '/dashboard/people',  label: 'Address book', note: 'The journals you read', Icon: AddressBook },
  // The machinery: the keys, the password, Last.fm, the address. It is also
  // reached from the gear beside the card's pencil; here because the desk is
  // where the owner's things are, and the password form lives behind it.
  { href: '/settings',          label: 'Settings', note: 'Keys, password, Last.fm, the address', Icon: GearSix },
];

export default function Dashboard({ waiting }) {
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
        {/* The one big thing on the pane. It is a link and not a button
            because it goes somewhere — the listening flow is its own route
            with its own background, and pretending otherwise with a button
            would only mean a navigation that looked like it failed. */}
        <Link href="/session" className="ln-tile db-hero">
          <Headphones size={34} weight="regular" aria-hidden="true" />
          <span className="db-hero-label">Start a listen</span>
        </Link>

        <div className="db-doors">
          {DOORS.map(({ href, label, note, Icon, counted }) => (
            <Link key={href} href={href} className="ln-tile db-door" title={note}>
              <Icon size={26} weight="regular" aria-hidden="true" className="db-door-mark" />
              <span className="db-door-text">
                <span className="db-door-label">
                  {label}
                  {/* The one count on the whole site, and it earns its place
                      by being the only thing you need to see without going to
                      look. Everything else here is a door you open when you
                      have decided to; this is the one that has to be able to
                      tell you there is a reason to. Null until asked, so the
                      row never flashes a zero on the way to a number. */}
                  {counted && waiting?.total > 0 && (
                    <span className="db-count">{waiting.total}</span>
                  )}
                </span>
              </span>
            </Link>
          ))}
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
