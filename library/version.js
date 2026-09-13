// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/version.js
// Which version this copy is running, and where to read what it contains.
// Read from package.json, so it is whatever is deployed, not what upstream
// is at. Printed on the pitch pane beside Source for a visitor, and at the
// foot of the desk for the owner — the same number in both places, from
// the one file the release process bumps. Free of imports and server-only
// things, so either side of the site can read it.

import pkg from '../package.json';

export const VERSION = pkg.version;
// The releases list, newest first, rather than this version's own page: the
// number moves with the merge that earns it and the release that announces
// it may come days later, so a link to the exact tag would be dead in the
// gap. The list never is.
export const RELEASE_URL = 'https://github.com/ListeningNotes/listening-notes/releases';

// Where "it didn't work" goes: to the one copy the software comes from, as
// a report a keeper writes on their own desk (app/dashboard/report/page.js)
// and this route receives (app/api/reports/route.js). The same address on
// every copy, the way the pitch pane's Get one is — a fork that wants its
// own reports sets NEXT_PUBLIC_REPORTS_URL, the way it sets its source. A
// GitHub issue lasted an hour on 2026-09-13: the people testing are not
// GitHub people, and being sent there is where a report would have stopped.
export const REPORTS_URL =
  process.env.NEXT_PUBLIC_REPORTS_URL || 'https://www.listeningnotes.blog/api/reports';
