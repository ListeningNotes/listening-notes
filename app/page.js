// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later

// The front door, which is now a crossroads rather than a page.
//
// Everything that used to be described here — the cover, the flip, the two
// snapped screens, the desktop column and the phone column kept as two
// separate markup trees — is gone into HomeNav, which draws the cross. So has
// the fetching: the four requests the cross makes live with the state they
// feed, and there is nothing left for a route file to do but name the thing it
// renders.
//
// It briefly read the long note off the settings row and handed it down, back
// when the essay printed on the about pane. The essay is at /get now, which
// reads it on its own.

import HomeNav from '../components/main_components/HomeNav';

export default function HomePage() {
  return <HomeNav />;
}
