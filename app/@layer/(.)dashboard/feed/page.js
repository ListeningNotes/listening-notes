// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/@layer/(.)dashboard/feed/page.js
// The feed, opened over the desk.
//
// The same sheet the inbox and the address book arrive on — up from the foot
// of the screen, the same pull down, Escape and back — so reading what the
// people in your book logged never feels like leaving the journal. See
// app/@layer/(.)dashboard/inbox/page.js for the shape; the standalone address
// in app/dashboard/feed/page.js answers a bookmark.
//
// `over="spine"` because the feed is the desk's, and on a laptop the desk is
// the left page: a sheet that covered the journal to show you a feed would be
// taking away the thing the feed sends you to.

import LayerEntry from '@/components/main_components/LayerEntry';
import FeedPage from '../../../dashboard/feed/page';

export default function FeedOverTheDesk() {
  return (
    <LayerEntry label="Feed" scrolls arrives="bottom" over="spine">
      <FeedPage layered />
    </LayerEntry>
  );
}
