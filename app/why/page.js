// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/why/page.js
// There is no /why any more.
//
// The long note moved to /get, which is the address every copy's pitch pane
// sends people to — somebody asks how you got this, the owner swipes right,
// and the story of why a person started keeping a listening journal is a
// better answer than a feature list.
//
// This file stays as a forwarding address rather than a deletion, for the same
// reason /about and /rig did: the note has been live at this URL and linked
// from the card, and a bookmark or an old share should land somewhere rather
// than on a 404.

import { redirect } from 'next/navigation';

export default function WhyPage() {
  redirect('/get');
}
