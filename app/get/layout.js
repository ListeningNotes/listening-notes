// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/get/layout.js
// The frame the two /get pages share: the nav row, the measure, the type.
//
// /get is two addresses: the steps with the button at their foot, and the
// story. It was three from 2026-09-03 — a door, the steps at /get/install
// and the story — and the door and the steps became one page on 2026-09-22
// (see app/get/page.js). The story keeps an address of its own because it is
// long-form reading, and reading wants a page rather than a stretch of scroll
// between a button and its instructions.
//
// What they share is the nav row, here, and the .get-* rules in
// styles/get.css. The rules moved out of this file on 2026-09-03 when the
// pages under the door started opening as a layer over it: a layer renders
// in the root slot and never passes through this layout, so a stylesheet kept
// here would not reach it. The drawer rule is each page's own business: both
// 404 on a copy that has not written the essay, because these are Miyel's
// pages on Miyel's copy.

import { headers } from 'next/headers';
import SiteNav from '../../components/main_components/SiteNav';
import { PATH_HEADER, SEARCH_HEADER } from '../../proxy';
import { tidyJournal } from '../../library/return_address';

// ── No row on the page with no gift, 2026-09-28 ────────────────────────────
// /get without `?gift=` is two lines in the middle of the screen with the
// mark over them (app/get/page.js, the gate), and Miyel asked for the mark
// to go with them — so the row that carries it everywhere else stands down
// there, and the page draws its own. A layout is not given the URL, so the
// middleware hands it the path and the query as headers (proxy.js), and the
// test here is the page's own: a gift that tidies to nothing is no gift.
export default async function GetLayout({ children }) {
  const h = await headers();
  const path = h.get(PATH_HEADER) || '';
  const gift = new URLSearchParams(h.get(SEARCH_HEADER) || '').get('gift') || '';
  const handed = path === '/get' && !tidyJournal(gift);
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--ink)' }}>

      {!handed && <SiteNav />}
      {children}
    </div>
  );
}
