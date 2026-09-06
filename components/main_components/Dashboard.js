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
import Link from 'next/link';
import { Headphones, Envelope, PaperPlane, GearSix } from '@phosphor-icons/react';

// Everything but the first. Order is how often you would want it, which is not
// the order they were built in: messages are what you open the journal to
// check, and share is what you open it to do once and then not again for a
// month.
//
// There was a third — Entries, a table of everything with an edit form behind
// each row. It is gone, and so is the door: correcting an entry happens on the
// entry now, which means the way to reach the form is to be reading the thing
// it corrects. A list of all your writing already exists and is called the
// journal; a second one that only its owner could see was a CMS grown beside a
// site that did not need one.
const DOORS = [
  { href: '/dashboard/inbox',   label: 'Inbox',   note: 'Submissions and comments waiting on you', Icon: Envelope, counted: true },
  { href: '/dashboard/share',   label: 'Share',   note: 'Print a card, or the code to /get', Icon: PaperPlane },
  // The machinery: the keys, the password, Last.fm, the address. It is also
  // reached from the gear beside the card's pencil; here because the desk is
  // where the owner's things are, and the password form lives behind it.
  { href: '/settings',          label: 'Settings', note: 'Keys, password, Last.fm, the address', Icon: GearSix },
];

export default function Dashboard({ waiting }) {
  return (
    <div className="db-pane">
      <div className="db-body">
        {/* The one big thing on the pane. It is a link and not a button
            because it goes somewhere — the listening flow is its own route
            with its own background, and pretending otherwise with a button
            would only mean a navigation that looked like it failed. */}
        <Link href="/session" className="db-hero">
          <Headphones size={34} weight="regular" aria-hidden="true" />
          <span className="db-hero-label">Start a listen</span>
        </Link>

        <div className="db-doors">
          {DOORS.map(({ href, label, note, Icon, counted }) => (
            <Link key={href} href={href} className="db-door">
              <Icon size={20} weight="regular" aria-hidden="true" className="db-door-mark" />
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
                <span className="db-door-note">{note}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
