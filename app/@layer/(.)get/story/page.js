// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/@layer/(.)get/story/page.js
// The story, opened over the steps.
//
// Tap "Our story" at the foot of /get and the essay rises from the foot of
// the screen on the same sheet of glass an entry or the send form arrives
// on — same pull down to close, same Escape, same back button. Open
// /get/story cold, from a texted link, and there is no interception: the
// browser lands on app/get/story/page.js and gets the standalone page with
// the nav row. One address, two presentations, exactly as /submit does it.
//
// `(.)get/story` intercepts the real route at the same segment level; the
// @layer folder is a slot and does not count as a segment. The page itself
// is the same component the standalone route renders, wrapped so the room
// it reserves for a nav row goes (.get-layered in styles/get.css).
//
// Not async, so the sheet starts rising on the first frame; the page's own
// read — the settings row — happens inside the Suspense boundary and fills
// the sheet when it lands.

import { Suspense } from 'react';
import LayerEntry from '@/components/main_components/LayerEntry';
import StoryPage from '../../../get/story/page';

export default function StoryOverTheDoor() {
  return (
    <LayerEntry label="Our story" scrolls arrives="bottom">
      <div className="get-layered">
        <Suspense fallback={null}>
          <StoryPage />
        </Suspense>
      </div>
    </LayerEntry>
  );
}
