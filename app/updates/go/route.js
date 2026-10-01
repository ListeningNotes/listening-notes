// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/updates/go/route.js
// The button the updater switch points at. It exists for one reason: a link to
// github.com, tapped on a phone, is swallowed by GitHub's app, which cannot
// make files. iOS matches a universal link on the URL that was tapped, so a
// link to this journal is not a match and the redirect lands in the browser
// like any other page (2026-09-30).
//
// Owner-only, because where a keeper's repository lives is the one thing a
// visitor should not learn from a journal. A press from the home-screen app
// opens a browser view that may not carry the wristband, so without one this
// sends the keeper to the sign-in page with this door as the way back,
// rather than answering with a bare error or opening the door to anyone
// (Miyel, 2026-09-30).

import { checkWristband } from '@/library/wristband';
import { updaterLink } from '@/library/updater_link';

export async function GET(request) {
  if (!(await checkWristband(request))) {
    return Response.redirect(new URL('/login?then=/updates/go', request.url), 302);
  }
  const to = await updaterLink(
    process.env.VERCEL_GIT_REPO_OWNER,
    process.env.VERCEL_GIT_REPO_SLUG,
    process.env.VERCEL_GIT_COMMIT_REF || 'main',
  );
  if (!to) return new Response('No repository', { status: 404 });
  return Response.redirect(to, 302);
}
