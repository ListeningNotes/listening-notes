// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/@layer/(.)dashboard/inbox/page.js
// The inbox, opened over the desk.
//
// Press Messages on the desk and the inbox comes up from the foot of the
// screen on the same sheet the send form and the session arrive on, with the
// same pull down, the same Escape and the same back button — so reading what
// people sent never feels like leaving the journal. See
// app/@layer/(.)entries/[slug]/page.js for what the folder name means: the
// slot does not appear in the URL, and `(.)dashboard/inbox` intercepts the
// real /dashboard/inbox route. Open the address cold — a bookmark — and the
// standalone page in app/dashboard/inbox/page.js answers instead.

import LayerEntry from '@/components/main_components/LayerEntry';
import Inbox from '../../../dashboard/inbox/page';

export default function InboxOverTheDesk() {
  return (
    <LayerEntry label="Messages" scrolls arrives="bottom">
      <Inbox layered />
    </LayerEntry>
  );
}
