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
