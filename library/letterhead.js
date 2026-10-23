// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/letterhead.js
// LN. Admin letters: the software's own messages to a keeper, and the check
// that one is genuine (Miyel's brief, LN. Admin messages, 2026-10-17; her
// name for this file, 2026-10-20 — a letter arrives on the software's
// letterhead).
//
// ── What one is ───────────────────────────────────────────────────────────
// Words, and only words (her pick): no door, no link, nothing to press but
// Dismiss — every letter that arrives, which is every letter but the one a
// journal writes itself (below). It arrives through the copy's own public messages route, the
// door a person's message comes through, and is kept as a row in `messages`
// marked `admin`, pinned at the top of the inbox with the LN. mark. One at a
// time: a new letter replaces the last. Dismissing deletes it. Nothing about
// it is reported anywhere — not that it arrived, not that it was read.
//
// ── Why it is sealed ──────────────────────────────────────────────────────
// The messages route is open to anybody, which is the point of it, so a row
// that called itself LN. Admin on its word alone could be written by anyone,
// to every journal, saying anything: "your journal needs checking, type your
// password here". A letter therefore carries a seal, an Ed25519 signature
// over exactly what it says, made with a key that lives only on the
// canonical keeper's Mac (her pick: never on a server, so no break-in on one
// can write a letter). Every copy carries the public half below — it can
// check a seal and do nothing else — and a letter that does not check out is
// thrown away. A fork sets LETTERHEAD_KEY to its own key's public half, or to
// nothing, which accepts none.
//
// ── What else the seal settles ────────────────────────────────────────────
// A letter names the journal it is for, inside the seal, so one sealed for
// another journal cannot be posted to this one. And it says when it was
// sent: a letter no newer than the newest this journal has kept is refused,
// so one that was dismissed can never be posted back in.
//
// Sealed and posted by scripts/letterhead.mjs, which keeps the private half
// in the Mac's Keychain. The inbox draws a letter under a fixed line, never
// part of what is sent: LN. Admin never asks for your password or your
// spare key.
//
// ── The one the journal writes itself, 2026-10-20 ─────────────────────────
// A journal asks for a copy of itself when it has something to lose
// (Miyel's brief, backup reminders): writing no copy holds, sixty days after
// the last copy — or after its first entry, when it knows of none. It asks
// in a letter it writes here rather than receives (ask_for_copy), once, and
// not again for sixty days. Make a copy in Settings and the nightly backup
// are both copies, and either takes the letter away
// (library/whole_journal.mjs, copy_begins).
//
// It is the one letter with a door: Make a copy, to Back up your journal in
// Settings (her pick). Letters that arrive stay words only, for the reason
// they were made so — a letter that could carry a door could lead every
// keeper somewhere, with nothing but the seal between that and anyone. This
// one is written in this file by the journal itself, nothing that arrives
// can give a letter a door, and the door goes nowhere but the journal's own
// Settings.
//
// Still one letter at a time. The journal asks only while none is pinned,
// so a letter that arrived is never pushed aside by it; a letter arriving
// while it is pinned takes its place and gives it its turn back
// (keep_letter), so it asks again once that one is put away.

import { createPublicKey, verify } from 'node:crypto';
import database from './database_connection.js';
import { SAID_MOST, sameJournal } from './message_actions.js';
import { pull_settings, pull_letterhead_heard, save_letterhead_heard } from './settings_actions.js';

// The canonical keeper's public key: the half that checks and opens
// nothing, as JWK `x` (Ed25519, base64url). Made on her Mac on 2026-10-20.
const CANONICAL_KEY = 'x7DlythzFOz_hXFx10Hpx1Qm6ZPgvjfFXULMPhHgDSA';
export const LETTERHEAD_KEY = process.env.LETTERHEAD_KEY ?? CANONICAL_KEY;
export const LETTERHEAD_NAME = 'LN. Admin';

// What is sealed: a line naming what this is, so a seal made for anything
// else can never pass for a letter, then the four things a letter says in a
// fixed order. scripts/letterhead.mjs builds the same bytes.
export function sealed(letter) {
  return Buffer.from(
    `ln-letterhead-1\n${JSON.stringify([letter.to, letter.said, letter.sent_at, letter.id])}`,
    'utf8',
  );
}

function publicKey() {
  if (!LETTERHEAD_KEY) return null;
  try {
    return createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: LETTERHEAD_KEY }, format: 'jwk' });
  } catch {
    return null;
  }
}

const refused = (why, status) => ({ ok: false, why, status });
const FUTURE_MOST = 24 * 60 * 60 * 1000;

// Reads a letter off a request's body — { letterhead: { to, said, sent_at,
// id }, seal } — and says whether it may be kept: { ok: true, letter }, or
// { ok: false, why, status }, said for the keeper sending it.
export async function read_letter(body) {
  const key = publicKey();
  if (!key) return refused('This journal takes no letters.', 403);

  const sent = body?.letterhead;
  const letter = sent && typeof sent === 'object' && !Array.isArray(sent)
    ? { to: sent.to, said: sent.said, sent_at: sent.sent_at, id: sent.id }
    : null;
  if (!letter || ![letter.to, letter.said, letter.sent_at, letter.id].every(v => typeof v === 'string')) {
    return refused('That is not a letter.', 400);
  }
  if (!letter.said.trim() || letter.said.length > SAID_MOST) return refused('A letter has to say something, and not too much.', 400);
  const when = Date.parse(letter.sent_at);
  if (!Number.isFinite(when) || when > Date.now() + FUTURE_MOST) return refused('That letter is not dated.', 400);

  let seal;
  try { seal = Buffer.from(String(body.seal || ''), 'base64url'); } catch { seal = null; }
  let good = false;
  try { good = Boolean(seal?.length) && verify(null, sealed(letter), key, seal); } catch { good = false; }
  if (!good) return refused('That seal is not good.', 401);

  const own = (await pull_settings())?.site_address;
  if (!sameJournal(letter.to, own)) return refused('That letter is for another journal.', 404);

  const heard = await pull_letterhead_heard();
  if (heard && when <= new Date(heard).getTime()) return refused('This journal has that letter, or a newer one, already.', 409);

  return { ok: true, letter };
}

// ── The month's prompt, 2026-10-22 ────────────────────────────────────────
// Listening Notes, the publication, asks one thing a month (the blog's
// brief), and the prompt reaches a journal the way a letter does: sealed
// with the canonical keeper's key and posted by her to the journals it
// concerns, with nothing reported back (Miyel: "LN admin") — so a journal
// that never sends a record never contacts the publication. Sealed under its
// own first line, so no letter's seal passes for a prompt's and no prompt's
// for a letter's; kept apart from letters (library/month_prompt.js), so
// neither ever puts the other away. scripts/letterhead.mjs, `prompt`, builds
// the same bytes.
export function sealed_prompt(prompt) {
  return Buffer.from(
    `ln-prompt-1\n${JSON.stringify([prompt.to, prompt.said, prompt.month, prompt.ends_at, prompt.sent_at, prompt.id])}`,
    'utf8',
  );
}

// How long a prompt may be: a question, not a letter.
const PROMPT_MOST = 300;

// Reads a prompt off a request's body — { prompt: { to, said, month,
// ends_at, sent_at, id }, seal } — and says whether it may be kept, as
// read_letter does. `kept` is the prompt this journal has, if any: one no
// newer is refused, so a prompt can never be posted in again.
export async function read_prompt(body, kept = null) {
  const key = publicKey();
  if (!key) return refused('This journal takes no prompts.', 403);

  const sent = body?.prompt;
  const prompt = sent && typeof sent === 'object' && !Array.isArray(sent)
    ? { to: sent.to, said: sent.said, month: sent.month, ends_at: sent.ends_at, sent_at: sent.sent_at, id: sent.id }
    : null;
  if (!prompt || !Object.values(prompt).every(v => typeof v === 'string')) {
    return refused('That is not a prompt.', 400);
  }
  if (!prompt.said.trim() || prompt.said.length > PROMPT_MOST) return refused('A prompt has to ask something, and briefly.', 400);
  if (!prompt.month.trim() || prompt.month.length > 40) return refused('A prompt has to name its month.', 400);
  const when = Date.parse(prompt.sent_at);
  const ends = Date.parse(prompt.ends_at);
  if (!Number.isFinite(when) || when > Date.now() + FUTURE_MOST) return refused('That prompt is not dated.', 400);
  if (!Number.isFinite(ends) || ends <= when) return refused('That prompt never closes.', 400);

  let seal;
  try { seal = Buffer.from(String(body.seal || ''), 'base64url'); } catch { seal = null; }
  let good = false;
  try { good = Boolean(seal?.length) && verify(null, sealed_prompt(prompt), key, seal); } catch { good = false; }
  if (!good) return refused('That seal is not good.', 401);

  const own = (await pull_settings())?.site_address;
  if (!sameJournal(prompt.to, own)) return refused('That prompt is for another journal.', 404);
  if (kept?.sent_at && when <= Date.parse(kept.sent_at)) {
    return refused('This journal has that prompt, or a newer one, already.', 409);
  }
  return { ok: true, prompt };
}

// Keeps a letter: the one before it goes, this one is pinned, and when it
// was sent is remembered, so it can never be posted in again. When the one
// that went was the journal asking for a copy, it may ask again once this
// one is put away.
export async function keep_letter(letter) {
  const gone = await database`DELETE FROM messages WHERE admin = true RETURNING door`;
  await database`
    INSERT INTO messages (from_name, from_journal, said, written_at, admin)
    VALUES (${LETTERHEAD_NAME}, NULL, ${letter.said.trim()}, ${letter.sent_at}, true)
  `;
  await save_letterhead_heard(letter.sent_at);
  if (gone.some(row => row.door === COPY_DOOR)) {
    await database`UPDATE settings SET copy_asked_at = NULL WHERE id = 1`;
  }
}

// ── Asking for a copy ─────────────────────────────────────────────────────

// How long a journal waits after its last copy before asking for another,
// and after asking before asking again: the brief's sixty days, "tune it in
// place".
const COPY_WAIT = '60 days';

// What a letter the journal wrote itself opens (migrations/039): Back up
// your journal in Settings. The only door a letter has.
export const COPY_DOOR = 'copy';

// What it says, in Miyel's words (2026-10-20): one for a journal whose last
// copy it has outgrown, and one for a journal that knows of none. That one
// says "doesn't seem" because copies made before migrations/039 were never
// written down, so a journal that knows of no copy may still have one.
const OUTGROWN = 'It’s been a while since your last backup, and you’ve written more since. Would you like to make a fresh copy?';
const NONE_KNOWN = 'Your journal doesn’t seem to have a backup yet. Would you like to make a copy to keep somewhere safe?';

// Asks, when the journal has something to lose and has not asked lately:
// writing no copy holds — an entry posted or corrected since the last copy,
// or any entry at all when it knows of none — sixty days after that copy, or
// after its first entry; no letter pinned; and sixty days since it last
// asked. Called by /api/waiting, the check that decides the dot on Inbox, so
// nothing runs on a timer and the dot arrives with the letter. True when it
// asked.
//
// One statement, so the asking and the letter cannot come apart, and two
// screens opening at once ask once: the first takes the settings row, and
// the second finds it already asked.
export async function ask_for_copy() {
  const rows = await database`
    WITH asking AS (
      UPDATE settings s SET copy_asked_at = now()
      WHERE s.id = 1
        AND (s.copy_asked_at IS NULL OR s.copy_asked_at < now() - ${COPY_WAIT}::interval)
        AND NOT EXISTS (SELECT 1 FROM messages WHERE admin)
        AND COALESCE(s.copied_at, (SELECT min(posted_at) FROM entries)) < now() - ${COPY_WAIT}::interval
        AND EXISTS (
          SELECT 1 FROM entries e
          WHERE s.copied_at IS NULL
             OR e.posted_at > s.copied_at
             OR (e.edited_at AT TIME ZONE 'UTC') > s.copied_at
        )
      RETURNING s.copied_at
    )
    INSERT INTO messages (from_name, from_journal, said, written_at, admin, door)
    SELECT ${LETTERHEAD_NAME}, NULL,
           CASE WHEN asking.copied_at IS NULL THEN ${NONE_KNOWN} ELSE ${OUTGROWN} END,
           now(), true, ${COPY_DOOR}
    FROM asking
    RETURNING id
  `;
  return rows.length > 0;
}
