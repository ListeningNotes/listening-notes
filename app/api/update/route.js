// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/update/route.js
// Is there a newer Listening Notes than this copy is running?
//
// Owner-only, and asked by the desk once per visit. This server asks GitHub
// for the canonical repository's latest public release, at most once a day,
// and compares its tag with the version in this copy's package.json. That is
// the whole of it: no copy tells anyone it exists, nothing is sent but a
// request for a public page, and the only thing this can ever say is that
// there is a newer version and where the button to take it is. Releases are
// the mechanism because they are public, dated, and read the same way a
// browser would read them — see DECISIONS.
//
// The button is the Update workflow on the keeper's own repository. Vercel
// tells a build which repository it came from, so the link can go straight
// to that page; anywhere else it goes to the release itself.

import { requireWristband } from '@/library/wristband';
import pkg from '../../../package.json';

const LATEST = 'https://api.github.com/repos/ListeningNotes/listening-notes/releases/latest';
const A_DAY = 60 * 60 * 24;

// Semantic versions: major.minor.patch. Compared number by number, so
// 1.10.0 is newer than 1.9.0, which a string comparison would get wrong.
function isNewer(latest, current) {
  const a = String(latest).split('.').map(Number);
  const b = String(current).split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x !== y) return x > y;
  }
  return false;
}

export async function GET(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  const quiet = { current: pkg.version, latest: null, newer: false };
  try {
    const res = await fetch(LATEST, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'listening-notes' },
      next: { revalidate: A_DAY },
    });
    if (!res.ok) return Response.json(quiet);
    const release = await res.json();
    const latest = String(release.tag_name || '').replace(/^v/, '');
    if (!latest) return Response.json(quiet);
    const owner = process.env.VERCEL_GIT_REPO_OWNER;
    const slug = process.env.VERCEL_GIT_REPO_SLUG;
    const page = owner && slug
      ? `https://github.com/${owner}/${slug}/actions/workflows/update.yml`
      : release.html_url;
    return Response.json({ current: pkg.version, latest, newer: isNewer(latest, pkg.version), page, notes: release.html_url });
  } catch {
    // GitHub unreachable, or rate-limited: say nothing rather than guess.
    return Response.json(quiet);
  }
}
