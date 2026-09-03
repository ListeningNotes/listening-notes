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
//
// ── A link, not a code ────────────────────────────────────────────────────
// The code was confusing: a person at a deploy screen does not know what a
// claim code is or where it goes. Vercel tells the build its own address, so
// the box prints a link with the code inside it instead, and the setup page
// reads the code off the link. Open it and you are in; nothing is typed. The
// bare code is still printed under it, for anybody who lost the link or is
// running the copy somewhere that has no address to print.

// Where this copy will be reached, as far as the build can tell.
// VERCEL_PROJECT_PRODUCTION_URL is the project's real address; VERCEL_URL is
// this one deployment's. Either works for claiming. Elsewhere there is
// nothing to print and the code stands alone.
export function claimAddress() {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || '';
  return host ? `https://${host.replace(/^https?:\/\//, '')}` : '';
}

export function claimLink(code) {
  const address = claimAddress();
  return address ? `${address}/setup?code=${encodeURIComponent(code)}` : '';
}

export function claimNotice(code, { windowOpen = false } = {}) {
  const link = claimLink(code);
  const body = ['This journal is not anybody’s yet. Make it yours:', ''];
  if (windowOpen) {
    body.push('Open your site and press “Set it up” — within the next');
    body.push('30 minutes, nothing else is needed.');
    body.push('');
    body.push('After that, press Redeploy to open setup again, or type');
    body.push('this code where it asks for one:');
  } else if (link) {
    body.push(link);
    body.push('');
    body.push('Open that link. If it has expired or you are somewhere');
    body.push('else, press “Set it up” on your site and type:');
  } else {
    body.push('Open your site, press “Set it up”, and type:');
  }
  body.push('');
  body.push(code);
  // The box grows to its longest line.
  const width = Math.max(...body.map(line => line.length)) + 2;
  const rule = '─'.repeat(width);
  return [
    '',
    `  ┌${rule}┐`,
    ...body.map(line => `  │ ${line.padEnd(width - 1)}│`),
    `  └${rule}┘`,
    '',
  ].join('\n');
}
