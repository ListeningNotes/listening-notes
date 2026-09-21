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
// to that page; anywhere else it goes to the release itself.

import { requireWristband } from '@/library/wristband';
import pkg from '../../../package.json';

const LATEST = 'https://api.github.com/repos/ListeningNotes/listening-notes/releases/latest';
// How long after a release a copy may still be on the old version with
// nothing wrong. Its workflow checks on the hour, Vercel takes a couple of
// minutes to build, and this route's own answer can be an hour old — so two
// hours behind is honest. Past three, the copy is not updating itself, and
// that is worth saying out loud (2026-09-21: four copies sat five days
// behind because their workflow arrived switched off and nothing said so).
const GRACE = 3 * 60 * 60 * 1000;
// The canonical updater, read from upstream rather than from this copy's own
// files, so the link hands somebody the current file even when their copy is
// an old one. Fetched, not bundled: a file under .github/workflows is not
// traced into a function, and a copy that could not read it would offer an
// empty page.
const UPDATER = 'https://raw.githubusercontent.com/ListeningNotes/listening-notes/main/.github/workflows/update.yml';
const UPDATER_PATH = '.github/workflows/update.yml';

// GitHub's own new-file page, with the name and the contents already in it.
// The deploy button cannot carry a workflow file into somebody's repository —
// GitHub refuses any app writing under .github/workflows without a permission
// Vercel does not hold — so every copy arrives without its updater and this
// is how it gets one: two presses on a page that is already filled in.
async function updaterLink(owner, slug) {
  if (!owner || !slug) return null;
  try {
    const res = await fetch(UPDATER, { next: { revalidate: A_WHILE } });
    if (!res.ok) return null;
    const file = await res.text();
    if (!file.trim()) return null;
    const q = new URLSearchParams({ filename: UPDATER_PATH, value: file });
    return `https://github.com/${owner}/${slug}/new/main?${q}`;
  } catch {
    return null;
  }
}
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
  const install = await updaterLink(owner, slug);
  const quiet = {
    current: pkg.version, latest: null, newer: false, stalled: false, commit, byUpdater, install,
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
    const page = owner && slug
      ? `https://github.com/${owner}/${slug}/actions/workflows/update.yml`
      : release.html_url;
    const newer = isNewer(latest, pkg.version);
    // Stalled, not merely behind. A release minutes old is on its way here
    // and worth nothing on screen; one this copy has had hours to take and
    // has not is a copy whose updates have stopped.
    const published = Date.parse(release.published_at || '');
    const stalled = newer && Number.isFinite(published) && Date.now() - published > GRACE;
    return Response.json({
      current: pkg.version, latest, newer, stalled, commit, byUpdater, install,
      page, notes: release.html_url,
    });
  } catch {
    // GitHub unreachable, or rate-limited: say nothing rather than guess.
    return Response.json(quiet);
  }
}
