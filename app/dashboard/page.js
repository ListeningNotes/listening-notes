// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/dashboard/page.js
// The desk is a pane of the cross now — components/main_components/Dashboard.js,
// the right-hand one, drawn only for whoever keeps the journal.
//
// This address used to be its own page: a grid of four app icons over one of
// the animated backgrounds, with the old logo image above them. It stayed
// after the desk moved onto the cross because bookmarks and the home-screen
// icon pointed here, and then kept drawing the old design after the manifest
// started pointing at / instead. Two desks, one of them stale. What is left
// is the forwarding address: the Inbox and Share pages still sit under
// /dashboard/, so the address itself is not going anywhere.

import { redirect } from 'next/navigation';

export default function DashboardPage() {
  redirect('/');
}
