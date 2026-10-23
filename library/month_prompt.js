// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/month_prompt.js
// The month's prompt, 2026-10-22: the blog's first piece. Listening Notes,
// the publication, asks one thing a month, and a keeper sends it a record
// they have already written about, from their own wall — an entry's record
// and its writing as it stands, never something typed for the purpose
// (Miyel: "people submit an album they've already written about ... those
// are the only options but come from their own posts"). A record whose post
// does not fit is answered the ordinary ways: correct the entry, or listen
// again and send that one.
//
// On every journal: the prompt as it arrived — sealed with the canonical
// keeper's key and checked by library/letterhead.js, read_prompt — kept in
// settings.month_prompt beside what this journal sent for it; and the send,
// server to server, to the publication's own journal (PUBLICATION_URL),
// which happens on the keeper's press and at no other time. Nothing here
// writes to an entry.
//
// On the publication's journal: `takesPrompts`, whether this journal is it,
// so its submissions route takes a record sent for a prompt, words or none.

import database from './database_connection.js';
import { PUBLICATION_URL, SANDBOX, SANDBOX_SAID } from './version.js';
import { tidyJournal } from './return_address.js';
import { pull_own_addresses } from './settings_actions.js';
import { isHere } from './hosting_directory.js';

// The prompt this journal holds, open or closed; null when it holds none.
export async function pull_month_prompt() {
  const [row] = await database`SELECT month_prompt FROM settings WHERE id = 1`;
  const kept = row?.month_prompt;
  return kept && typeof kept === 'object' && !Array.isArray(kept) ? kept : null;
}

// Whether a prompt still takes records.
export function stillOpen(prompt, now = Date.now()) {
  const ends = Date.parse(prompt?.ends_at || '');
  return Number.isFinite(ends) && ends > now;
}

// A prompt that arrived, its seal checked: it takes the place of the one
// before, and nothing has been sent for it yet.
export async function keep_month_prompt(prompt) {
  const kept = {
    said: prompt.said.trim(),
    month: prompt.month.trim(),
    ends_at: prompt.ends_at,
    sent_at: prompt.sent_at,
    id: prompt.id,
    sent: null,
  };
  await database`UPDATE settings SET month_prompt = ${JSON.stringify(kept)}::jsonb WHERE id = 1`;
  return kept;
}

// What this journal sent for the prompt, written down once it landed — the
// record, never the writing — so the prompt over the wall can say so.
async function note_sent(id, sent) {
  const [row] = await database`
    UPDATE settings SET month_prompt = jsonb_set(month_prompt, '{sent}', ${JSON.stringify(sent)}::jsonb)
    WHERE id = 1 AND month_prompt->>'id' = ${id}
    RETURNING month_prompt
  `;
  return row?.month_prompt || null;
}

// The publication's door, or nothing on a copy that names no publication.
function publicationDoor() {
  const there = String(PUBLICATION_URL || '').trim().replace(/\/+$/, '');
  return there ? `${there}/api/submissions` : '';
}

// Sends an entry's record and its writing, exactly as they stand at this
// moment, to the publication for the prompt: what will be published is what
// the keeper saw before pressing Send, and a later correction of the entry
// changes nothing that was sent (the brief: an issue that gets printed has
// to be frozen). The journal's address and the entry's slug go with it, so
// the published piece can link home.
export async function send_to_prompt({ prompt, entry, keeper, from }) {
  if (SANDBOX) return { ok: false, error: SANDBOX_SAID };
  const door = publicationDoor();
  if (!door) return { ok: false, error: 'This copy sends nothing to a publication.' };
  let answer;
  try {
    answer = await fetch(door, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        album: entry.album,
        artist: entry.artist,
        year: entry.year ?? null,
        album_art: entry.album_art ?? null,
        collection_id: entry.collection_id ?? null,
        song: entry.song || '',
        note: String(entry.notes || ''),
        submitter_name: keeper || null,
        sender_url: from,
        sender_entry: entry.slug,
        prompt: { id: prompt.id, month: prompt.month, said: prompt.said },
      }),
    });
  } catch {
    return { ok: false, error: 'Listening Notes couldn’t be reached just now. Try again in a minute.' };
  }
  if (!answer.ok) {
    const said = await answer.json().catch(() => ({}));
    return { ok: false, error: said?.error || 'Listening Notes couldn’t take it just now. Try again in a minute.' };
  }
  const sent = {
    slug: entry.slug,
    album: entry.album,
    artist: entry.artist,
    song: entry.song || null,
    at: new Date().toISOString(),
  };
  return { ok: true, prompt: await note_sent(prompt.id, sent) };
}

// Whether this journal is the publication's own — the one PUBLICATION_URL
// names, by either address it answers to: the bare domain the records are
// posted to, or the studio's (library/hosting_directory.js, studio). A copy
// that hosts one journal is the publication's only when a fork points
// PUBLICATION_URL at it.
export async function takesPrompts() {
  let there = '';
  try { there = new URL(PUBLICATION_URL).host.toLowerCase(); } catch { there = ''; }
  if (!there) return false;
  if (await isHere(there)) return true;
  const own = await pull_own_addresses().catch(() => []);
  return own.includes(tidyJournal(there));
}

// On the publication's journal: a record that arrived for a prompt is marked
// with it — which prompt, its month and its words — beside the record, the
// writing and the journal and entry it came from, which the submissions
// route already keeps.
export async function mark_prompt_record(id, prompt) {
  const marked = {
    id: String(prompt?.id || '').slice(0, 64),
    month: String(prompt?.month || '').slice(0, 40),
    said: String(prompt?.said || '').slice(0, 300),
  };
  await database`UPDATE submissions SET prompt = ${JSON.stringify(marked)}::jsonb WHERE id = ${id}`;
}
