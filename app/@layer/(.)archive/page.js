// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/@layer/(.)archive/page.js
// The wall, opened over whatever you were looking at.
//
// The counts on the ID card are presses into the journal — 4 masterpieces,
// 9 formative — and they were plain navigations away from the cross until
// 2026-09-15. Miyel's note: they should move the way the pinned record does.
// You feel the wall pull up from where it would be, and a swipe down puts it
// away and leaves you exactly where you were on the card.
//
// So it arrives on the same sheet an entry does, and grows from the thing you
// pressed: each count carries `data-grows="/archive"` at the moment it is
// pressed, and LayerEntry measures that box (library/handoff.js, growBoxOf).
// `arrives` is left at its default for that reason — 'bottom' would rise from
// the foot of the screen and lose the connection to the number.
//
// See app/@layer/(.)entries/[slug]/page.js for what the folder name means:
// `@layer` is a parallel slot that does not appear in the URL, and `(.)`
// intercepts the real /archive route at the same level. Open the address cold
// — a bookmark, a shared filter — and there is no interception: the browser
// lands on app/archive/page.js and gets the standalone page, which is why the
// filter is in the address rather than in a hand-off.

import LayerEntry from '@/components/main_components/LayerEntry';
import ArchivePage from '../../archive/page';

export default function ArchiveOverThePane() {
  return (
    <LayerEntry label="The journal" scrolls over="journal">
      <ArchivePage layered />
    </LayerEntry>
  );
}
