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
// Dismiss. It arrives through the copy's own public messages route, the
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

// Keeps a letter: the one before it goes, this one is pinned, and when it
// was sent is remembered, so it can never be posted in again.
export async function keep_letter(letter) {
  await database`DELETE FROM messages WHERE admin = true`;
  await database`
    INSERT INTO messages (from_name, from_journal, said, written_at, admin)
    VALUES (${LETTERHEAD_NAME}, NULL, ${letter.said.trim()}, ${letter.sent_at}, true)
  `;
  await save_letterhead_heard(letter.sent_at);
}
