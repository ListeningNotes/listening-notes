// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/claim_notice.js
// The lines printed for the person who just deployed a copy.
//
// One function, used twice: by the build step, whose output streams onto the
// deploy screen while the owner is watching it, and by the server on every
// start until the copy is claimed, so the code is also in the runtime log for
// anybody who looked away. Written once so the two never drift.
//
// No dependencies, deliberately — it is imported from a script that runs
// before the app exists.

export function claimNotice(code) {
  return [
    '',
    '  ┌──────────────────────────────────────────────┐',
    '  │  This journal is not anybody’s yet.          │',
    '  │                                              │',
    `  │  Claim code:  ${code}                      │`,
    '  │                                              │',
    '  │  Open your site, press “Set it up”, and      │',
    '  │  type the code where it asks for one.        │',
    '  └──────────────────────────────────────────────┘',
    '',
  ].join('\n');
}
