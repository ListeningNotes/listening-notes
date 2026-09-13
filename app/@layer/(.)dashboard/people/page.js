// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/@layer/(.)dashboard/people/page.js
// The address book, opened over the desk.
//
// The same sheet the inbox and Settings arrive on — up from the foot of the
// screen, the same pull down, Escape and back — so looking up who you read
// never feels like leaving the journal. See app/@layer/(.)dashboard/inbox/
// page.js for the shape; the standalone address in app/dashboard/people/
// page.js answers a bookmark.

import LayerEntry from '@/components/main_components/LayerEntry';
import AddressBook from '../../../dashboard/people/page';

export default function AddressBookOverTheDesk() {
  return (
    <LayerEntry label="Address book" scrolls arrives="bottom">
      <AddressBook layered />
    </LayerEntry>
  );
}
