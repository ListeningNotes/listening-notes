// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/@layer/(.)dashboard/people/[id]/page.js
// Your page about a person, opened over the desk.
//
// From a face or a name in the feed, or a row in the address book, on the
// same sheet the book itself arrives on. The page reads its own id from
// the address, so the sheet has nothing to hand it. See
// app/@layer/(.)dashboard/inbox/page.js for the shape.

import LayerEntry from '@/components/main_components/LayerEntry';
import PersonPage from '../../../../dashboard/people/[id]/page';

export default function PersonOverTheDesk() {
  return (
    <LayerEntry label="A person" scrolls arrives="bottom">
      <PersonPage layered />
    </LayerEntry>
  );
}
