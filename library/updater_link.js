// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/updater_link.js
// The link that hands a keeper their updater: GitHub's own new-file page on
// their repository, with the file's name and contents already in it, so the
// whole job is two presses on Commit changes.
//
// The deploy button cannot carry a workflow file into somebody's repository —
// GitHub refuses any app writing under .github/workflows without a permission
// Vercel does not hold — so every copy arrives without its updater and this
// is how it gets one. Read here by the update route, which says whether the
// link can be offered, and by /updates/go, which sends somebody down it; one
// file so the two cannot drift (2026-09-30).

// The canonical updater, read from upstream rather than from this copy's own
// files, so the link hands somebody the current file even when their copy is
// an old one. Fetched, not bundled: a file under .github/workflows is not
// traced into a function, and a copy that could not read it would offer an
// empty page.
const UPDATER = 'https://raw.githubusercontent.com/ListeningNotes/listening-notes/main/.github/workflows/update.yml';
const UPDATER_PATH = '.github/workflows/update.yml';
// An hour: one request an hour per copy is nothing to GitHub, and the file
// changes about never.
const A_WHILE = 60 * 60;

// `branch` is the one this copy was built from, which is the keeper's
// default branch. It used to say `main` outright (fixed 2026-09-30): a copy
// whose default branch is called anything else got a link that made a new
// branch named main and put the workflow there, where a schedule never runs.
export async function updaterLink(owner, slug, branch = 'main') {
  if (!owner || !slug) return null;
  try {
    const res = await fetch(UPDATER, { next: { revalidate: A_WHILE } });
    if (!res.ok) return null;
    const file = await res.text();
    if (!file.trim()) return null;
    const q = new URLSearchParams({ filename: UPDATER_PATH, value: file });
    return `https://github.com/${owner}/${slug}/new/${encodeURIComponent(branch || 'main')}?${q}`;
  } catch {
    return null;
  }
}
