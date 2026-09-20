// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/@layer/(.)dashboard/people/[id]/page.js
// Your page about a person, opened over the desk.
//
// From a face or a name in the feed, or a door under a face in the friends
// pane. The page reads its own id from the address, so the sheet has nothing
// to hand it.
//
// ── It rises, 2026-09-19 ──────────────────────────────────────────────────
// It used to grow out of the row that was pressed, the way an entry grows out
// of its cover (data-grows, handoff.js). The rows are gone — the pane is
// faces now, and the press that opens this is a door under the face rather
// than the face itself, so there is no longer a square for it to grow out of.
// Without one it was falling back to a plain fade, which says nothing about
// where it came from or how to leave.
//
// So it rises from the foot, like the book, and a pull down puts it away —
// Miyel, 2026-09-19: "the opening screen for send and compare can just open
// up from the bottom and close from dragging down." The pull is the layer's
// own and has been there all along; what it was missing was an arrival that
// suggested it.

import LayerEntry from '@/components/main_components/LayerEntry';
import PersonPage from '../../../../dashboard/people/[id]/page';

export default function PersonOverTheDesk() {
  return (
    <LayerEntry label="A person" scrolls arrives="bottom" over="spine">
      <PersonPage layered />
    </LayerEntry>
  );
}
