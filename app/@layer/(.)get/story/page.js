// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/@layer/(.)get/story/page.js
// The story, opened over the door.
//
// The same arrangement as the steps one folder over: a tap on "Our story"
// raises the essay from the foot of the screen on the shared sheet, and a
// cold visit to /get/story gets the standalone page. See (.)get/install for
// the notes on the folder name and on why this function is not async.

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
