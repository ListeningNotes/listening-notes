// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// scripts/update_copy.mjs
// Bring a copy up to date with Listening Notes.
//
// Run by .github/workflows/update.yml on a keeper's own repository when they
// press "Run workflow": it merges the canonical repository's main into the
// branch the workflow ran on and pushes it, and Vercel builds from there.
// The workflow fetches this file from upstream before running it, so the
// logic here can change without the workflow file ever changing.
//
// ── A copy has no history in common with upstream ─────────────────────────
// The deploy button does not fork; it makes a new repository with the files
// as they were that day, in one commit. Git cannot merge two histories with
// no common ancestor without treating every changed file as a conflict. So,
// the first time, this finds the upstream commit whose files the copy was
// made from — the one whose tree is identical to the copy's first commit —
// and grafts the copy's first commit onto it. From then on the merge has a
// base, a keeper's own changes merge the way any branch's do, and after the
// first update the merge commit itself is the common ancestor.
//
// ── What it will not do ───────────────────────────────────────────────────
// Leave the repository half-merged. A conflict aborts the merge, names the
// files, and fails the run with a message a person can act on. It writes
// nothing anywhere but the repository it runs in.

import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const UPSTREAM = process.env.UPSTREAM_URL || 'https://github.com/ListeningNotes/listening-notes.git';
const UPSTREAM_REF = 'refs/remotes/upstream/main';
// The branch the workflow ran on — the keeper's default branch, normally
// main. Locally, whatever is checked out.
const BRANCH = process.env.GITHUB_REF_NAME || current();

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function tryGit(...args) {
  return spawnSync('git', args, { encoding: 'utf8' });
}
function current() {
  return git('rev-parse', '--abbrev-ref', 'HEAD');
}
// Said on the run's summary page, where the keeper looks, and in the log.
function say(...lines) {
  const text = lines.join('\n') + '\n';
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, text);
}
function stop(...lines) {
  say(...lines);
  process.exit(1);
}

// The version a repository is at, from its package.json at some commit.
function versionAt(ref) {
  const shown = tryGit('show', `${ref}:package.json`);
  if (shown.status !== 0) return '0.0.0';
  try { return JSON.parse(shown.stdout).version || '0.0.0'; } catch { return '0.0.0'; }
}
// Semantic versions, number by number: 1.10.0 is newer than 1.9.0.
function isNewer(a, b) {
  const x = String(a).replace(/^v/, '').split('.').map(Number);
  const y = String(b).replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  }
  return false;
}
// The release notes between two versions, read from upstream's public
// releases — written for a keeper, unlike commit titles. Empty when the
// upstream is not on GitHub, when GitHub cannot be reached, or when no
// release sits between the two versions.
async function releaseNotesBetween(before, after) {
  const m = UPSTREAM.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
  if (!m) return [];
  try {
    const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'listening-notes-update' };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const res = await fetch(`https://api.github.com/repos/${m[1]}/${m[2]}/releases?per_page=50`, { headers });
    if (!res.ok) return [];
    const releases = await res.json();
    return releases
      .filter(r => !r.draft && !r.prerelease && isNewer(r.tag_name, before) && !isNewer(r.tag_name, after))
      .sort((a, b) => (isNewer(a.tag_name, b.tag_name) ? -1 : 1))
      .flatMap(r => [`### ${String(r.tag_name).replace(/^v/, '')}`, '', (r.body || '').trim(), '']);
  } catch {
    return [];
  }
}
// Commit titles, with the housekeeping left out: merges, version bumps and
// notes-to-self are not things a keeper needs to read.
const HOUSEKEEPING = /^(Merge |Version \d|NOTES\b|DECISIONS\b|ARCHITECTURE\b)/;

git('config', 'user.name', 'github-actions[bot]');
git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com');

git('fetch', '--no-tags', UPSTREAM, `+main:${UPSTREAM_REF}`);
const upstream = git('rev-parse', '--short', UPSTREAM_REF);

if (tryGit('merge-base', '--is-ancestor', UPSTREAM_REF, 'HEAD').status === 0) {
  say('## Already up to date', '', `This copy already has everything in Listening Notes (${upstream}).`);
  process.exit(0);
}

// No common ancestor: a snapshot from the deploy button. Find where it came
// from and graft it there. An identical tree is the ideal; the nearest is
// what a real copy has, because the keeper added this very workflow file by
// hand before the first update, or changed a line or two — so the upstream
// commit that differs from the copy's first commit in the fewest files is
// the one it was made from, and whatever differs is the keeper's own work,
// merged from that base like any other change.
if (tryGit('merge-base', 'HEAD', UPSTREAM_REF).status !== 0) {
  const roots = git('rev-list', '--max-parents=0', 'HEAD').split('\n').filter(Boolean);
  const root = roots[roots.length - 1];
  const tree = git('rev-parse', `${root}^{tree}`);
  const candidates = git('rev-list', UPSTREAM_REF).split('\n').filter(Boolean);
  let origin = candidates.find(commit => git('rev-parse', `${commit}^{tree}`) === tree);
  if (!origin) {
    let fewest = Infinity;
    for (const commit of candidates) {
      const differing = git('diff-tree', '-r', '--name-only', commit, root).split('\n').filter(Boolean).length;
      if (differing < fewest) { fewest = differing; origin = commit; }
      if (fewest === 0) break;
    }
    // A copy that shares almost nothing with any version is not a copy of
    // this software, and grafting it anywhere would turn the update into
    // one giant clash. Half the files is the line.
    const total = git('ls-tree', '-r', '--name-only', root).split('\n').filter(Boolean).length;
    if (!origin || fewest > total / 2) {
      stop(
        '## Could not update',
        '',
        'This repository\'s files do not resemble any version of Listening Notes closely enough to',
        'find a safe point to merge from, so nothing was changed. If it was made by the deploy',
        'button and has been heavily changed since, updating it needs git on a computer: clone it,',
        'add `https://github.com/ListeningNotes/listening-notes.git` as a remote called `upstream`,',
        'and `git merge --allow-unrelated-histories upstream/main`, resolving what clashes.',
      );
    }
  }
  git('replace', '--graft', root, origin);
}

const base = git('merge-base', 'HEAD', UPSTREAM_REF);
const before = versionAt('HEAD');
const after = versionAt(UPSTREAM_REF);
const merged = tryGit('merge', '--no-commit', '--no-ff', UPSTREAM_REF);
if (merged.status !== 0) {
  const clashing = git('diff', '--name-only', '--diff-filter=U').split('\n').filter(Boolean);
  tryGit('merge', '--abort');
  stop(
    '## Could not update: your changes clash with the new version',
    '',
    'You have changed these files in your copy, and the update changes them too:',
    '',
    ...clashing.map(f => `- \`${f}\``),
    '',
    'Nothing has been changed in your repository. To update, the clash has to be resolved by a',
    'person, on a computer with git: clone this repository, add',
    '`https://github.com/ListeningNotes/listening-notes.git` as a remote called `upstream`,',
    '`git merge upstream/main`, fix the files it lists, commit, and push. If the changes in',
    'those files were not yours to keep, undo them first and press Run workflow again.',
  );
}

// GitHub refuses a push from a workflow's own token that creates or changes
// a workflow file. The updater's workflow fetches its logic from upstream
// each run, so it should never need to change; if upstream ever changes a
// workflow file anyway, the copy keeps its own and is told so, rather than
// the whole update being refused.
const kept = git('diff', '--cached', '--name-only', '--', '.github/workflows').split('\n').filter(Boolean);
for (const file of kept) {
  if (tryGit('cat-file', '-e', `HEAD:${file}`).status === 0) git('checkout', 'HEAD', '--', file);
  else git('rm', '-q', '--cached', file);
}
git('commit', '-q', '--no-edit', '-m', `Update to Listening Notes ${upstream}`);
git('push', 'origin', `HEAD:refs/heads/${BRANCH}`);

// What changed, said the way a keeper reads it: the release notes between
// the version this copy had and the one it has now. Only when no release
// sits between them — an update between releases — the commit titles, with
// the housekeeping left out.
const notes = await releaseNotesBetween(before, after);
const commits = git('log', '--format=%s', `${base}..${UPSTREAM_REF}`).split('\n')
  .filter(line => line && !HOUSEKEEPING.test(line))
  .map(line => `- ${line}`);
const changed = notes.length
  ? ['What changed:', '', ...notes]
  : [`What changed, between releases (${commits.length} change${commits.length === 1 ? '' : 's'}):`, '', ...commits.slice(0, 40)];
say(
  `## Updated to Listening Notes ${after === before ? upstream : `${after} (was ${before})`}`,
  '',
  'Pushed to your repository. Vercel is building it now: give it a couple of minutes, then open',
  'your journal signed in. Your database is brought up to date by the build itself.',
  '',
  ...changed,
  ...(kept.length ? ['', 'Left as they were, because GitHub does not let a workflow change workflow files:', '', ...kept.map(f => `- \`${f}\``)] : []),
);
