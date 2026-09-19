// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/@layer/(.)session/page.js
// A listen, opened over whatever you were looking at.
//
// The third thing to use the layer. Press Start a listen on the desk and the
// session slides in on the same sheet of glass an entry and the send page
// arrive on, with the same swipe, the same Escape and the same back button.
// Leaving it puts you back exactly where you were — the cross never
// unmounted, so the desk is still the face on screen rather than the beacon
// the cross lands on from cold.
//
// On a desk it opens on the *right page* (over="journal"), which is the whole
// rule of that layout: the right page is what you are reading or writing, so
// starting a listen turns the journal into the session and the spine beside
// it does not move. The feed goes on updating and the inbox goes on counting
// while you write, and the doors on the desk are still there to press. A
// listen used to take the whole screen, which meant every look at anything
// else was a decision about the listen.
//
// See app/@layer/(.)entries/[slug]/page.js for what the folder name means:
// `@layer` is a parallel slot that does not appear in the URL, and `(.)`
// intercepts the real /session route at the same level. Open the same address
// cold — a bookmark, a home-screen icon — and there is no interception; the
// browser lands on app/session/page.js and gets the standalone page.
//
// scrolls, because the session is one ordinary column under a sticky header
// and wants the sheet to scroll it. The nav row on the picker goes into the
// sheet's flow for the reason .lay--scrolls .sitenav-row gives in styles/nav.css.

import LayerEntry from '@/components/main_components/LayerEntry';
import SessionPage from '../../session/page';

export default function ListenOverThePage() {
  return (
    <LayerEntry label="Listen" scrolls arrives="bottom" over="journal">
      <SessionPage />
    </LayerEntry>
  );
}
