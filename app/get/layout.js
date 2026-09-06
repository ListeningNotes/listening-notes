// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/get/layout.js
// The frame the three /get pages share: the nav row, the measure, the type.
//
// /get is three addresses now rather than one long page — the door, the
// steps, the story — because the person arriving has already seen a journal
// working and is trying to get from wanting one to having one. Each of those
// three is a different errand, and each needs a URL of its own: the steps so
// they can be texted to somebody stuck at step four with Vercel open in
// another tab, the story so it can be read as a piece of writing and not as
// the thing between a button and its instructions.
//
// What they share is the nav row, here, and the .get-* rules in styles/get.css.
// The rules moved out of this file on 2026-09-03 when the two pages under
// the door started opening as a layer over it: a layer renders in the root
// slot and never passes through this layout, so a stylesheet kept here would
// not reach it. The drawer rule is each page's own business: every
// one of them 404s on a copy that has not written the essay, because these
// are Miyel's pages on Miyel's copy.

import SiteNav from '../../components/main_components/SiteNav';

export default function GetLayout({ children }) {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--ink)' }}>

      <SiteNav />
      {children}
    </div>
  );
}
