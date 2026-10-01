// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/update/route.js
// Is there a newer Listening Notes than this copy is running?
//
// Owner-only, and asked by the desk once per visit. This server asks GitHub
// for the canonical repository's latest public release, at most once an hour,
// and says whether this copy is merely behind or has stopped updating —
// and compares its tag with the version in this copy's package.json. That is
// the whole of it: no copy tells anyone it exists, nothing is sent but a
// request for a public page, and the only thing this can ever say is that
// there is a newer version and where the button to take it is. Releases are
// the mechanism because they are public, dated, and read the same way a
// browser would read them — see DECISIONS.
//
// The button is the Update workflow on the keeper's own repository. Vercel
// tells a build which repository it came from, so the link can go straight
// to that page; anywhere else it goes to the release itself. The link that
// installs the updater in the first place is library/updater_link.js.

import { requireWristband } from '@/library/wristband';
import { updaterLink } from '@/library/updater_link';
import pkg from '../../../package.json';

const LATEST = 'https://api.github.com/repos/ListeningNotes/listening-notes/releases/latest';
// How long after a release a copy may still be on the old version with
// nothing wrong. Its workflow checks on the hour, Vercel takes a couple of
// minutes to build, and this route's own answer can be an hour old — so two
// hours behind is honest. Past three, the copy is not updating itself, and
// that is worth saying out loud (2026-09-21: four copies sat five days
// behind because their workflow arrived switched off and nothing said so).
const GRACE = 3 * 60 * 60 * 1000;
// An hour, not a day (2026-09-15): a keeper told by a friend that there is
// an update opened the desk and saw nothing, because the day-old answer
// still said otherwise. One request an hour per copy is nothing to GitHub.
const A_WHILE = 60 * 60;

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

  const owner = process.env.VERCEL_GIT_REPO_OWNER;
  const slug = process.env.VERCEL_GIT_REPO_SLUG;
  // Which commit this copy is running, and whether the updater is what put it
  // there. A deployment pushed by the updater is proof its updater works —
  // the one thing a journal can know for certain about a private repository
  // it holds no key to. The absence of that proof means only that nothing has
  // needed updating yet, which is why it is never read as a fault.
  const commit = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7);
  const byUpdater = (process.env.VERCEL_GIT_COMMIT_AUTHOR_LOGIN || '') === 'github-actions[bot]'
    || /^Update to Listening Notes /.test(process.env.VERCEL_GIT_COMMIT_MESSAGE || '');
  // The link is offered on the branch this copy was built from, which is
  // the keeper's default branch — the only one a schedule runs on.
  const install = await updaterLink(owner, slug, process.env.VERCEL_GIT_COMMIT_REF || 'main');
  // Where the button to take an update is: the workflow on their own
  // repository. Built here and not inside the try (2026-09-30), so a
  // rate-limited GitHub does not answer without it.
  const page = owner && slug
    ? `https://github.com/${owner}/${slug}/actions/workflows/update.yml`
    : null;
  const quiet = {
    current: pkg.version, latest: null, newer: false, stalled: false, major: false,
    commit, byUpdater, install, page,
  };
  try {
    const res = await fetch(LATEST, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'listening-notes' },
      next: { revalidate: A_WHILE },
    });
    if (!res.ok) return Response.json(quiet);
    const release = await res.json();
    const latest = String(release.tag_name || '').replace(/^v/, '');
    if (!latest) return Response.json(quiet);
    const newer = isNewer(latest, pkg.version);
    // A major waits for a person on purpose — the updater will not cross one
    // on its own — so a copy sitting behind a major is not stalled, it is
    // waiting to be asked. Without this every copy would announce that its
    // updates had stopped, three hours after any 2.0, which is both wrong
    // and alarming.
    const big = n => Number(String(n).split('.')[0]) || 0;
    const major = newer && big(latest) > big(pkg.version);
    // Stalled, not merely behind. A release minutes old is on its way here
    // and worth nothing on screen; one this copy has had hours to take and
    // has not is a copy whose updates have stopped.
    const published = Date.parse(release.published_at || '');
    const stalled = newer && !major && Number.isFinite(published) && Date.now() - published > GRACE;
    return Response.json({
      current: pkg.version, latest, newer, stalled, major, commit, byUpdater, install,
      page: page || release.html_url, notes: release.html_url,
    });
  } catch {
    // GitHub unreachable, or rate-limited: say nothing rather than guess.
    return Response.json(quiet);
  }
}
