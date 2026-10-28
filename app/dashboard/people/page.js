// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/dashboard/people/page.js
// Your friends, on a page of its own.
//
// A person is an address, written down here by the keeper and nobody else.
// Nothing is accepted on the other side and nobody learns they were added —
// the shape of a feed reader's list, not of a follow. See
// migrations/007_people.sql.
//
// ── Friends, wherever it is opened, 2026-10-27 ────────────────────────────
// This was the address book, Friends.js's grid of faces with doors under
// them. A phone has had Friends as a pane since 2026-10-23 (PeopleScreen.js),
// and when the inbox retired with Miyel's Friends brief, what waits from a
// person — on their face — had to be reachable where there is no pane: a
// desk, and anybody who opens this address. So the address draws the same
// screen the pane does: Headlines, the faces and what waits on them, and
// their wall. The person's own doors (Compare, Keep private, Remove) are on
// their page.
//
// This address stays whatever happens: the friend's page and Words live
// under it, and a bookmark is a promise.
'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import SiteNav from '../../../components/main_components/SiteNav';
import PeopleScreen from '../../../components/main_components/PeopleScreen';

// The nearest box that scrolls: the layer's sheet when this arrives over the
// journal, nothing (the page itself) when it is opened on its own.
function scrollingBox(el) {
  for (let at = el?.parentElement; at; at = at.parentElement) {
    const y = getComputedStyle(at).overflowY;
    if (y === 'auto' || y === 'scroll') return at;
  }
  return null;
}

export default function AddressBook({ layered = false }) {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [entries, setEntries] = useState([]);
  const rootRef = useRef(null);
  const scroller = useRef(null);
  useLayoutEffect(() => { scroller.current = scrollingBox(rootRef.current); });

  useEffect(() => {
    fetch('/api/auth/check').then(r => r.json()).then(d => setAuthed(!!d.authed)).catch(() => {}).finally(() => setChecking(false));
  }, []);
  // The keeper's own records, for their face on a record they share.
  useEffect(() => {
    if (!authed) return;
    fetch('/api/entries').then(r => r.json()).then(d => setEntries(Array.isArray(d) ? d : (d.entries || []))).catch(() => {});
  }, [authed]);

  if (checking) return <div style={{ minHeight: '100vh', background: 'var(--bg)' }} />;
  if (!authed) { if (typeof window !== 'undefined') window.location.replace('/login'); return null; }

  return (
    <div ref={rootRef} className={'own-screen' + (layered ? ' own-screen--layered' : '')}>
      <SiteNav />
      <div className="own-body fr-body ps-page">
        <PeopleScreen scroller={scroller} entries={entries} />
      </div>
    </div>
  );
}
