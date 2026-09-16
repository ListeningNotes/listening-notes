// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/archive/page.js
// The wall of covers at its own address.
//
// Everything that was here — the search, the filters, the sort, the grid, the
// modal — is in components/main_components/Journal.js, because the centre pane
// of the cross shows the same wall under the beacon. Two archives would be two
// archives that drift, which is the mistake the homepage already made once with
// its desktop and mobile trees.
//
// What is left is the page: the nav, the dot row, the offset that clears them,
// and the way back. Journal is handed no entries, so it fetches its own — at
// this address nothing has asked yet.

'use client';

import Link from 'next/link';
import { fonts } from '../../library/sitewide_visuals';
import SiteNav from '../../components/main_components/SiteNav';
import Journal from '../../components/main_components/Journal';

// `layered` survives from the hour /archive was intercepted as a sheet, for
// the ID card's counts to open. The counts open a window of covers on their
// own pane now and nothing intercepts this address, so nothing passes it —
// kept because the next thing to open the wall on a sheet will want it, and
// it costs one falsy default.
export default function ArchivePage({ layered = false }) {
  return (
    <div className="arc-page" style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--ink)', fontFamily: fonts.sans }}>
      <SiteNav />
      <Journal
        foot={layered ? null : (
          <div style={{ marginTop: 80, paddingTop: 32, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
            <Link href="/" className="ln-pill">← Back home</Link>
          </div>
        )}
      />
    </div>
  );
}
