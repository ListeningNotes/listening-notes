// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// The address book, owner-only both ways: the list, and filing one more.
//
// The body of a POST carries an address and nothing else. The name is read
// off the journal itself, because that is where it is kept — and if the
// journal cannot be reached just now the address is filed without one, and
// the answer says so, rather than refusing to write down where somebody
// lives because they were out.

import { requireWristband } from '@/library/wristband';
import { pull_people, save_person, ask_journal_name, pull_seen_records, see_records, open_door } from '@/library/people_actions';
import { tidyJournal } from '@/library/return_address';
import { pull_own_addresses } from '@/library/settings_actions';

export async function GET(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  try {
    const people = await pull_people();
    // And every address this journal answers to, where it lives and where
    // it lived (2026-10-21), for the feed to know this journal's own sends
    // when they come back — the keeper's to know, so here and not on a page.
    const own = await pull_own_addresses().catch(() => []);
    // And the friends' records already seen, for New on the Friends wall
    // (2026-10-27): a fortnight's worth, as `journal/slug`.
    const seen = await pull_seen_records().catch(() => []);
    return Response.json({ people, own, seen });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  try {
    const body = await request.json().catch(() => ({}));
    const address = tidyJournal(body?.address);
    if (!address) {
      return Response.json({ error: "That doesn't look like a web address." }, { status: 400 });
    }
    // A journal compared with itself is nothing, and a keeper in their own
    // address book is a row that can only confuse the feed — at the address
    // it lived at before, too (2026-10-21).
    const own = await pull_own_addresses().catch(() => []);
    if (own.includes(address)) {
      return Response.json({ error: 'That is this journal.' }, { status: 400 });
    }
    // Whether this is somebody new to the book, so the page knows to offer a
    // wave: that is offered when you add a person and at no other time, and
    // filing an address already here is not adding anybody (2026-09-23).
    const fresh = !(await pull_people()).some(p => p.address === address);
    const name = await ask_journal_name(address);
    const person = await save_person({ address, name });
    // Added, so a door closed on them as a stranger opens (2026-10-27).
    await open_door(address).catch(() => null);
    return Response.json({ person, reached: name !== null, fresh });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ── Seen, 2026-10-27 ────────────────────────────────────────────────────────
// The Friends wall telling this copy which of the friends' records have
// scrolled past, so they stop saying New: `{ seen: [{ journal, slug }] }`.
// Kept here and sent nowhere (migrations/044_seen_records.sql).
export async function PATCH(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  try {
    const body = await request.json().catch(() => ({}));
    const marked = await see_records(body?.seen);
    return Response.json({ ok: true, marked });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
