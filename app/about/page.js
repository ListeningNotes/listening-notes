// SPDX-License-Identifier: AGPL-3.0-or-later
// app/about/page.js
// There is no about page any more.
//
// The cover is two-sided now: the front is the beacon, the back is the card,
// and the card *is* the about page — portrait, keeper, since, the note, the
// marks. The two parts that were too long to fit on a card kept their own
// addresses at /rig and /key.
//
// This file stays as a forwarding address rather than a deletion. The old tab
// had been linked from the dot row on every page of the site for months, and a
// bookmark or an old share should land somewhere rather than on a 404.

import { redirect } from 'next/navigation';

export default function AboutPage() {
  redirect('/');
}
