// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// app/dashboard/feed/page.js
// The feed, on a page of its own: what the people in the address book logged.
//
// It ran straight on down the desk's own scroll until 2026-09-15 — the desk,
// then the feed under it, one column. The desk is a hero and its rows now and
// stops there, so the feed became a row like the rest of them and needed
// somewhere to go (Miyel's brief). Nothing about the feed itself changed; this
// file is a door and a wrapper.
//
// Filed under /dashboard with the inbox, the address book and report, because
// it is the same kind of thing: behind the wristband, about this journal's own
// business, and no use to anybody who is not the keeper. A reader who sees the
// address knows whose it is.
//
// What it needs from this journal is the entries, and only to answer one
// question per row — is this a record you also have, and therefore is Compare
// worth offering. The public list is enough for that (it carries album_key)
// and it is the same list the cross hands the feed when it is embedded, so the
// two cannot disagree about what counts as a record you have.

import { useEffect, useState } from 'react';
import SiteNav from '../../../components/main_components/SiteNav';
import Feed from '../../../components/main_components/Feed';

export default function FeedPage({ layered = false }) {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    fetch('/api/auth/check').then(r => r.json()).then(d => setAuthed(!!d.authed)).catch(() => {}).finally(() => setChecking(false));
  }, []);

  // Only once there is a wristband. Signed out this page is a redirect, and
  // asking for the list first would be a request nobody is going to read.
  useEffect(() => {
    if (!authed) return;
    fetch('/api/public/entries')
      .then(r => (r.ok ? r.json() : null))
      .then(d => setEntries(d?.entries || []))
      .catch(() => {});
  }, [authed]);

  if (checking) return <div style={{ minHeight: '100vh', background: 'var(--bg)' }} />;
  if (!authed) { if (typeof window !== 'undefined') window.location.replace('/login'); return null; }

  return (
    <div className={'own-screen' + (layered ? ' own-screen--layered' : '')}>
      <SiteNav />

      <div className="own-body fd-page">
        {/* No title, 2026-09-16. It said FEED over a row that says RECENT and
            SUBMISSIONS, which is three words of small caps stacked to name one
            page — and the tabs already say where you are. It was here so that
            arriving by bookmark or back button did not land on an unlabelled
            row; the row turns out to label itself. */}
        <Feed entries={entries} />
      </div>
    </div>
  );
}
