// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/@layer/(.)get/install/page.js
// The steps, opened over the door.
//
// Tap "How to install" on /get and the steps rise from the foot of the
// screen on the same sheet of glass an entry or the send form arrives on —
// same pull down to close, same Escape, same back button. Open /get/install
// cold, from a texted link, and there is no interception: the browser lands
// on app/get/install/page.js and gets the standalone page with the nav row.
// One address, two presentations, exactly as /submit does it.
//
// `(.)get/install` intercepts the real route at the same segment level; the
// @layer folder is a slot and does not count as a segment. The page itself
// is the same component the standalone route renders, wrapped so the room
// it reserves for a nav row goes (.get-layered in globals.css).
//
// Not async, so the sheet starts rising on the first frame; the page's own
// reads — the settings row and the screenshot check — happen inside the
// Suspense boundary and fill the sheet when they land.

import { Suspense } from 'react';
import LayerEntry from '@/components/main_components/LayerEntry';
import InstallPage from '../../../get/install/page';

export default function InstallOverTheDoor({ searchParams }) {
  return (
    <LayerEntry label="How to install" scrolls arrives="bottom">
      <div className="get-layered">
        <Suspense fallback={null}>
          <InstallPage searchParams={searchParams} />
        </Suspense>
      </div>
    </LayerEntry>
  );
}
