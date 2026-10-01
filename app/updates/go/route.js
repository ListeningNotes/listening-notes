// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/updates/go/route.js
// The button the updater switch points at. It exists for one reason: a link to
// github.com, tapped on a phone, is swallowed by GitHub's app, which cannot
// make files. iOS matches a universal link on the URL that was tapped, so a
// link to this journal is not a match and the redirect lands in the browser
// like any other page (2026-09-30).

import { requireWristband } from '@/library/wristband';
import { updaterLink } from '@/library/updater_link';

export async function GET(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  const to = await updaterLink(
    process.env.VERCEL_GIT_REPO_OWNER,
    process.env.VERCEL_GIT_REPO_SLUG,
    process.env.VERCEL_GIT_COMMIT_REF || 'main',
  );
  if (!to) return new Response('No repository', { status: 404 });
  return Response.redirect(to, 302);
}
