// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/version.js
// Which version this copy is running, and where to read what it contains.
// Read from package.json, so it is whatever is deployed, not what upstream
// is at. Printed at the foot of the card beside Source for a visitor, and at
// the foot of the desk for the owner — the same number in both places, from
// the one file the release process bumps. Free of imports and server-only
// things, so either side of the site can read it.

import pkg from '../package.json';

export const VERSION = pkg.version;
// The releases list, newest first, rather than this version's own page: the
// number moves with the merge that earns it and the release that announces
// it may come days later, so a link to the exact tag would be dead in the
// gap. The list never is.
export const RELEASE_URL = 'https://github.com/ListeningNotes/listening-notes/releases';

// Where the code is: the Source line at the foot of the card, for a visitor.
// AGPL §13 offers anyone using the software over a network its corresponding
// source, and it is owed to visitors, not the keeper. A fork owes *its*
// source and sets NEXT_PUBLIC_SOURCE_URL; the default is upstream, because a
// default nobody has read is one that points at a repository that does not
// exist (the first one did). Lived in Pitch.js until 2026-09-28, when the
// About pane went and the line moved to the card (About.js).
export const SOURCE_URL =
  process.env.NEXT_PUBLIC_SOURCE_URL || 'https://github.com/ListeningNotes/listening-notes';

// Where "it didn't work" goes: to the one copy the software comes from, as
// a report a keeper writes on their own desk (app/dashboard/report/page.js)
// and this route receives (app/api/reports/route.js). The same address on
// every copy, the way the pitch pane's Get one is — a fork that wants its
// own reports sets NEXT_PUBLIC_REPORTS_URL, the way it sets its source. A
// GitHub issue lasted an hour on 2026-09-13: the people testing are not
// GitHub people, and being sent there is where a report would have stopped.
export const REPORTS_URL =
  process.env.NEXT_PUBLIC_REPORTS_URL || 'https://www.listeningnotes.blog/api/reports';

// Where the software is talked about, for the one page a stranger can still
// reach: /get with no gift in the link shows a line and this, and nothing
// else (Miyel's brief, handed out, 2026-09-28). The project's own account,
// the same on every copy the way REPORTS_URL is; a fork sets
// NEXT_PUBLIC_INSTAGRAM_URL, or leaves it empty and the line is not drawn.
export const INSTAGRAM_URL =
  process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? 'https://www.instagram.com/listeningnotes.blog';

// Where the journals that chose to be listed are found. The same address on
// every copy, the way REPORTS_URL and INSTAGRAM_URL are; a fork sets
// NEXT_PUBLIC_DIRECTORY_URL, or leaves it empty and there is no directory.
// `??`, not `||`, so a fork that empties it gets no directory rather than
// falling back to this one; and a constant for the reason in GiveSheet.js —
// a copy that could point it elsewhere could quietly stand in for the
// original (Miyel's directory instructions, 2026-10-07).
export const DIRECTORY_URL =
  process.env.NEXT_PUBLIC_DIRECTORY_URL ?? 'https://www.listeningnotes.blog/api/directory';
