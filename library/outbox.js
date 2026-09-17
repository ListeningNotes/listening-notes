// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/outbox.js
// Handing a record to somebody in your address book, from your own copy.
//
// ── Why this is a room and not a page ─────────────────────────────────────
// Sending used to mean walking to somebody's journal and filling in the form
// on their card — which is right for a stranger who has read something and
// wants to pass a record back, and wrong for a keeper with forty people in a
// book. It asked for a name and a journal that the sender's own copy already
// knows, on a page their copy cannot see, and it meant leaving your journal to
// use your address book.
//
// So a send can start here instead. The sheet in the browser talks to
// /api/outbox on *this* copy, and this file is what that route calls: it posts
// to `https://<their address>/api/submissions`, which is the same door the
// visitor form goes through. The visitor form is unchanged and always will be
// — it is the way in for everybody without a copy, which is most people.
//
// ── Why a server and not the browser ──────────────────────────────────────
// A browser cannot post to another journal: that is a cross-origin write, and
// their route has never said it may be read across origins, nor should it have
// to. Servers do not enforce CORS — it is a rule browsers keep about pages,
// not a rule about the internet — so this copy's server simply asks theirs,
// the way `ask_journal_name` already does when an address is filed.
//
// This is not the phone-home that is ruled out everywhere else in this
// project. Nothing leaves unless a keeper presses Send, it goes to one address
// they chose out of their own book, and no copy learns anything about anybody
// it was not handed.
//
// ── What the recipient makes of it ────────────────────────────────────────
// A send from here is indistinguishable from the form except that it arrives
// with no browser Origin, which is how their route knows to count it against
// the journal rather than the machine (library/doorman.js). Every field is one
// the form already sends, bar `sender_entry`, and a copy too old to know that
// word drops it on the floor and stores the rest — which is the whole reason
// the send is a POST of plain fields rather than anything cleverer.

import { pull_settings } from './settings_actions.js';
import { journalUrl, tidyJournal } from './return_address.js';

// Long enough for a cold serverless copy to wake up, which is the common case:
// most journals are asleep most of the time, and the first request of the day
// pays for the start. Short enough that a keeper is not left looking at a
// button that has said Sending for a minute.
const WAIT_MS = 12000;

// What the sheet says when a send does not land. Each one names what happened
// rather than what failed, because the keeper's next move is different in
// every case — fix the address, try later, or nothing.
const NO_ADDRESS = 'There is no address for them in your book.';
const NO_JOURNAL = 'Your own journal has no address set, so there is nothing to sign the send with. Settings has it.';
const NO_ANSWER  = 'Their copy did not answer. It may be offline — nothing was sent, and your note is still here.';

// Hand a record over.
//
// Returns { ok: true, sent } or { ok: false, error } — never throws, because
// every caller's job on a failure is the same: say so and keep what was
// written. **A send that does not land must never cost somebody their note**
// (DECISIONS: a dismissed layer must never eat a written message). Nothing is
// stored on this side either way: what you have sent is only ever known by
// what comes back through the feed, which is the honest version of that number
// and the reason there is no outbox table to go stale.
export async function send_record({
  to, album, artist, year = '', note,
  album_art = '', collection_id = '', quiet = false, sender_entry = '',
}) {
  const host = tidyJournal(to);
  if (!host) return { ok: false, error: NO_ADDRESS };

  // Who the send is from. Read here rather than taken from the browser: the
  // sender's name and journal are facts about this copy, and a route that let
  // the page supply them would let anything supply them.
  const settings = await pull_settings();
  const name = String(settings?.keeper_name || '').trim();
  const mine = tidyJournal(settings?.site_address);
  if (!mine) return { ok: false, error: NO_JOURNAL };

  let answer;
  try {
    answer = await fetch(`${journalUrl(host)}/api/submissions`, {
      method: 'POST',
      signal: AbortSignal.timeout(WAIT_MS),
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        album, artist, year, note,
        submitter_name: name,
        album_art, collection_id,
        sender_url: mine,
        quiet: quiet === true,
        // The only field the form never sends. An older copy ignores it and
        // keeps everything else, which is what makes this safe to send to a
        // journal that has not updated in months.
        sender_entry,
      }),
    });
  } catch {
    // Offline, asleep past the wait, DNS gone, certificate expired. All of
    // them mean the same thing to the person looking at the sheet.
    return { ok: false, error: NO_ANSWER };
  }

  if (!answer.ok) {
    // Their copy answered and said no. Their words where they gave any, since
    // they know why better than this does — a rate limit, a missing field, a
    // journal that is not set up. Never their status code: a number is not an
    // explanation.
    let said = '';
    try {
      const body = await answer.json();
      said = String(body?.error || '').trim();
    } catch { /* an error page rather than JSON, which says nothing useful */ }
    return { ok: false, error: said || 'Their copy would not take the send.' };
  }

  return { ok: true, sent: { to: host, album, artist } };
}
