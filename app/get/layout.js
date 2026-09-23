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

import SiteNav from '../../components/main_components/SiteNav';

export default function GetLayout({ children }) {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--ink)' }}>

      <SiteNav />
      {children}
    </div>
  );
}
