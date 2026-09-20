// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// app/dashboard/people/page.js
// The address book: the journals this keeper reads.
//
// A person is an address, written down here by the keeper and nobody else.
// Nothing is accepted on the other side and nobody learns they were added —
// the shape of a feed reader's list, not of a follow. What somebody has sent
// is a layer joined from the inbox by the same address, never what makes them
// exist here. See migrations/007_people.sql.
//
// Ways in, none of them typing: the Add press on the journal being read hands
// the reader home with the address in the link, or copies it where that
// journal has not been told where home is; a send in the inbox that carried
// one has a button; a code — a card's or a cover's — can be pointed at. The
// field behind the + is where a pasted address lands, and the fallback for
// somebody reading one aloud.
//
// ── What is left here ─────────────────────────────────────────────────────
// Only the lock and the frame. Everything this page draws is Friends.js, from
// the friends brief of 2026-09-17 — faces rather than rows, and the three
// doors opening under the face that was pressed. It is a component and not a
// page because the brief's next step is to hang the same thing off the cross
// as a pane of its own, with the feed on its second floor; a route that was
// also a design would have to be taken apart to get there.
//
// This address stays whatever happens to the band: the inbox and the person
// page already live under /dashboard/, and a bookmark is a promise.

import { useEffect, useState } from 'react';
import SiteNav from '../../../components/main_components/SiteNav';
import Friends from '../../../components/main_components/Friends';

export default function AddressBook({ layered = false }) {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch('/api/auth/check').then(r => r.json()).then(d => setAuthed(!!d.authed)).catch(() => {}).finally(() => setChecking(false));
  }, []);

  if (checking) return <div style={{ minHeight: '100vh', background: 'var(--bg)' }} />;
  if (!authed) { if (typeof window !== 'undefined') window.location.replace('/login'); return null; }

  return (
    <div className={'own-screen' + (layered ? ' own-screen--layered' : '')}>
      <SiteNav />
      {/* No panel. Miyel, 2026-09-19: "no card around this, make it live
          directly on the page." The book used to be a list of rows and a
          card is what a list of rows wants — a ground to be ruled against.
          A grid of faces has its own edges and does not, and the card was
          doing two things it should not: putting a second border inside a
          screen that already has one, and drawing a panel colour behind the
          record-shaped squares, which are the thing on this page that gets
          to have a ground of its own.

          It is also where this has to end up: the brief hangs this off the
          cross as a pane, and a pane is a floor, not a card on a floor. */}
      <div className="own-body fr-body">
        <Friends />
      </div>
    </div>
  );
}
