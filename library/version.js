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

// Where "it didn't work" goes: a new issue on the one repository, the same
// on every copy — never a fork's, because the fork's keeper is not the one
// who reads them (DECISIONS: "It didn't work" goes to the issues). Every
// keeper has a GitHub account by construction, since the deploy button
// needs one, so a link is the whole mechanism: nothing phones home, nothing
// is held anywhere but there, and the report carries what a keeper would
// otherwise have to be asked for — the version, the page, the browser.
export const ISSUES_URL = 'https://github.com/ListeningNotes/listening-notes/issues/new';

export function reportUrl({ page = '', agent = '' } = {}) {
  const body = [
    'What I did:', '', '', 'What happened:', '', '', 'What I expected:', '', '',
    '---',
    `Version ${VERSION}${page ? ` · ${page}` : ''}`,
    agent ? agent : '',
  ].join('\n');
  const query = new URLSearchParams({ title: 'It didn\'t work: ', body });
  return `${ISSUES_URL}?${query}`;
}
