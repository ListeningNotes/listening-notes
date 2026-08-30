// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/@layer/(.)submit/page.js
// Sending an album, opened over whatever you were looking at.
//
// The second thing to use the layer, and the reason the layer was built the
// way it was: LayerEntry knows nothing about entries, so a form arrives on the
// same sheet of glass a record does, with the same swipe, the same Escape and
// the same back button. See app/@layer/(.)entries/[slug]/page.js for what the
// folder name means — `@layer` is a parallel slot that does not appear in the
// URL, and `(.)` intercepts the real /submit route at the same level.
//
// In practice it opens over the About pane, because the Send an album button
// is on the card. It is not tied to that: the send page is reachable from
// anywhere and comes in over whatever was there, the same way an entry does.
// It arrives from the right for the reason DECISIONS gives — that is where
// things arrive from, not because right means anything in particular.
//
// ── The address is real either way ────────────────────────────────────────
// Nothing here changes what /submit is. Tap the button and this draws the send
// page as a layer; open the same address cold — a link somebody was sent, a
// bookmark, a QR — and there is no interception, the browser lands on
// app/submit/page.js and gets the standalone page with the nav row on it. One
// address, two presentations.
//
// ── And it starts arriving immediately ────────────────────────────────────
// This function is not async and awaits nothing, which is the same rule the
// entry layer follows for the same reason: anything awaited up here would mean
// nothing on screen changes until it resolves, and that pause is where you
// wonder whether the tap registered. There is nothing to wait for in any case
// — the send page is a client component that reads no database — so unlike the
// entry there is no Suspense boundary and no waiting state to draw. It is on
// the glass on the first frame.

import LayerEntry from '@/components/main_components/LayerEntry';
import SubmitPage from '../../submit/page';

export default function SendOverThePage() {
  return (
    // scrolls, because a form is one ordinary column of fields and wants the
    // sheet to scroll it. The entry does not: its phone layout is already two
    // scroll containers deep and a third breaks the other two. See the note
    // on .lay--scrolls in globals.css.
    <LayerEntry label="Send an album" scrolls>
      <SubmitPage layered />
    </LayerEntry>
  );
}
