// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';

// The front door, which is now a crossroads rather than a page.
//
// Everything that used to be described here — the cover, the flip, the two
// snapped screens, the desktop column and the phone column kept as two
// separate markup trees — is gone into HomeNav, which draws the cross. This
// file went back to being what a route file should be: the thing that fetches
// what the page needs and hands it over.
//
// The four requests stay here rather than moving down with the layout. They
// are the page's data, not the navigation's, and three of the four are read by
// more than one pane — the entries by the wall and by the recent row, the
// stamps by the card, the wristband by every pane that has an owner's half.
// Fetching them once at the top is what stops three panes asking separately.

import { useEffect, useState } from 'react';
import HomeNav from '../components/main_components/HomeNav';

export default function HomePage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  // Whether the person looking at this is the person who writes it. Not a
  // permission check — the writing side guards itself — just what decides
  // which of the two right-hand panes is drawn.
  const [authed, setAuthed] = useState(false);
  // How many submissions and comments are sitting unread. Null until asked,
  // so the line can hold its place without flashing a zero on the way.
  const [waiting, setWaiting] = useState(null);
  // The counts printed on the card. Null until they land, so it holds the
  // shape of its number rows rather than flashing zeros into them.
  const [stamps, setStamps] = useState(null);

  useEffect(() => {
    fetch('/api/entries')
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data.entries || []);
        setEntries(list);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Fetched on mount rather than on first swipe: it is a few hundred bytes,
  // and a card that assembles itself while you are looking at it is a worse
  // card than one that was already printed. A failure leaves stamps null and
  // the card prints blank rules.
  useEffect(() => {
    fetch('/api/public/stamps')
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setStamps(d))
      .catch(() => {});
  }, []);

  // Asking here rather than only on the writing pages does two jobs. It decides
  // whether the right pane is the desk or the pitch — and because
  // /api/auth/check renews an ageing wristband, simply opening the journal
  // keeps the key alive. On a home screen, where there is no address bar to
  // sign in from, that is what stops the door quietly locking itself.
  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.json())
      .then(d => {
        setAuthed(!!d.authed);
        // Only asked once the wristband is confirmed — the endpoint answers
        // 401 to anyone else, and a failed request on every public visit is
        // noise in the log for no reason.
        if (d.authed) {
          fetch('/api/waiting')
            .then(r => (r.ok ? r.json() : null))
            .then(w => w && setWaiting(w))
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  return (
    <HomeNav
      entries={entries}
      loading={loading}
      stamps={stamps}
      authed={authed}
      waiting={waiting}
    />
  );
}
