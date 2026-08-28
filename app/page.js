// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later

// The front door, which is now a crossroads rather than a page.
//
// Everything that used to be described here — the cover, the flip, the two
// snapped screens, the desktop column and the phone column kept as two
// separate markup trees — is gone into HomeNav, which draws the cross.
//
// What is left is a server component with one job: read the long note off the
// settings row and hand it down. It cannot come through the Bookplate context
// like every other setting, because that context is serialised into the HTML
// of every page on the site and the note is three and a half kilobytes of
// prose the archive has no use for. It cannot arrive by fetch either — it is
// the writing on the about pane, and writing should be in the page before
// JavaScript runs, for a reader on a slow connection and for anything that
// reads pages without running any.
//
// So it is read here, on the one route that shows it. Everything else the
// cross needs is a client fetch and lives in HomeNav with the state it feeds.

import { pull_settings } from '../library/settings_actions';
import HomeNav from '../components/main_components/HomeNav';

// The layout is already force-dynamic for the same reason: this is per-request
// data belonging to whoever keeps the copy, and baking it in at build time
// means a journal shipping somebody else's writing.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const settings = await pull_settings();
  return <HomeNav note={settings.why_essay || ''} />;
}
