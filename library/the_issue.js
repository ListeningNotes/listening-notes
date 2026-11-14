// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/the_issue.js
// The issue: the month's prompt and the records keepers sent to it, which is
// what Community is (Miyel, 2026-11-11: it replaces the Board).
//
// ── Two halves ────────────────────────────────────────────────────────────
// On the publication's own journal (takesPrompts, library/month_prompt.js),
// `pull_issue` reads the records that arrived for the newest prompt out of
// its submissions, in the order they arrived — never ranked. That journal
// answers it at /api/public/issue.
//
// On every other journal, `read_issue` asks the publication for it, server
// to server, and keeps the last answer: a journal that cannot reach it shows
// Community from what it kept and says so, rather than an error. Reading it
// sends nothing about anybody; a journal that never opens Community never
// asks.
//
// ── What is public ────────────────────────────────────────────────────────
// What a keeper sent, as they sent it: the record, its stars and marks, the
// writing as it stood when Send was pressed, their name, and their journal's
// address and the entry's slug for the link home — the address is for the
// link and is never printed (AGENTS, Never). Sending was publishing; the
// sheet says so. A record the publication put away (archived, stored as
// `dismissed`) is not in the issue.

import database from './database_connection.js';
import { PUBLICATION_URL } from './version.js';
import { pull_month_prompt, takesPrompts } from './month_prompt.js';
import { tidyJournal } from './return_address.js';

// What one sent record is, said once for both halves.
function shown(row) {
  const prompt = row.prompt || {};
  return {
    key: String(row.id),
    album: row.album || '',
    artist: row.artist || '',
    year: row.year || '',
    art: row.album_art || '',
    song: row.song || '',
    note: String(row.note || '').slice(0, 6000),
    name: row.submitter_name || '',
    journal: tidyJournal(row.sender_url || ''),
    slug: row.sender_entry || '',
    rating: prompt.rating || '',
    favorite: prompt.favorite === true,
    masterpiece: prompt.masterpiece === true,
    formative: prompt.formative === true,
    at: row.created_at,
  };
}

// On the publication's journal: the newest prompt's records. The issue's
// number is how many prompts have been sent to before it, counting this one.
export async function pull_issue() {
  const rows = await database`
    SELECT id, album, artist, year, album_art, song, note, submitter_name,
           sender_url, sender_entry, prompt, created_at
    FROM submissions
    WHERE prompt IS NOT NULL AND coalesce(status, 'pending') <> 'dismissed'
    ORDER BY created_at, id
  `;
  const order = [];
  const byPrompt = new Map();
  for (const row of rows) {
    const id = row.prompt?.id;
    if (!id) continue;
    if (!byPrompt.has(id)) { byPrompt.set(id, []); order.push(id); }
    byPrompt.get(id).push(row);
  }
  // The prompt this journal holds, when it is the newest, says when it
  // closes and still counts while nothing has arrived for it.
  const held = await pull_month_prompt().catch(() => null);
  if (held?.id && !byPrompt.has(held.id)) { byPrompt.set(held.id, []); order.push(held.id); }
  if (!order.length) return null;
  const id = order[order.length - 1];
  const records = byPrompt.get(id);
  const first = records[0]?.prompt || {};
  const ofHeld = held?.id === id ? held : null;
  return {
    number: order.length,
    prompt: {
      id,
      said: ofHeld?.said || first.said || '',
      month: ofHeld?.month || first.month || '',
      ends_at: ofHeld?.ends_at || null,
    },
    records: records.map(shown),
  };
}

// ── On every other journal ──────────────────────────────────────────────────
// Kept a minute, and kept after that for when the publication cannot be
// reached. Shared by every journal a deployment hosts: it is the same public
// issue for all of them.
const KEPT_MS = 60 * 1000;
let kept = { at: 0, issue: null };

// A send just landed: the next read asks the publication again rather than
// showing the issue from before it.
export function forget_issue() { kept = { ...kept, at: 0 }; }

export async function read_issue() {
  if (await takesPrompts().catch(() => false)) {
    return { issue: await pull_issue(), stale: false };
  }
  if (kept.issue && Date.now() - kept.at < KEPT_MS) return { issue: kept.issue, stale: false };
  const there = String(PUBLICATION_URL || '').trim().replace(/\/+$/, '');
  if (!there) return { issue: null, stale: false };
  try {
    const answer = await fetch(`${there}/api/public/issue`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    });
    if (answer.status === 404) { kept = { at: Date.now(), issue: null }; return { issue: null, stale: false }; }
    if (!answer.ok) throw new Error('unanswered');
    const said = await answer.json();
    kept = { at: Date.now(), issue: said?.issue || null };
    return { issue: kept.issue, stale: false };
  } catch {
    return { issue: kept.issue, stale: true };
  }
}
