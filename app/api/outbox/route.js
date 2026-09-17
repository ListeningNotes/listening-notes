// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/outbox/route.js
// Where a send leaves from, on the sender's own copy.
//
// The inbox is where sends arrive and this is where they go out, which is the
// whole of what the name has to carry. It is the owner's alone and server-
// checked like every other owner route: a visitor sending a record uses the
// form on somebody's card, which is unchanged and is the way in for everyone
// without a copy.
//
// It does almost nothing itself. The browser says who and what; this resolves
// *who* into an address out of the keeper's own address book, and hands the
// rest to library/outbox.js, which is where the reasoning lives.
//
// ── Why the person arrives as an id ───────────────────────────────────────
// The sheet could post the address and this could pass it along, and that is
// the version where a page is trusted with where a send goes. Resolving an id
// against the `people` table instead means a send can only ever leave for
// somebody already written down in the book — the book being the list of
// people a keeper decided to keep. It also means the address is read from the
// row rather than round-tripped through a browser that may have had it since
// before the person moved.
//
// No rate limit. There is one person who can reach this — the one holding the
// wristband — and their own copy is not the thing to protect them from. The
// counting that matters happens at the far end, on the recipient's door, where
// a send is one of many arriving from everywhere (library/doorman.js).

import { requireWristband } from '@/library/wristband';
import { pull_person } from '@/library/people_actions';
import { send_record } from '@/library/outbox';

export async function POST(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: 'Nothing readable was sent.' }, { status: 400 });

  const { person_id, album, artist, year, note, album_art, collection_id, quiet, sender_entry } = body;

  // The same three the visitor form insists on, checked here for the same
  // reason it checks them: a route states its own rules. A send with no note
  // is the one this is strictest about — the note is the reason somebody is
  // being handed a record at all, and a record arriving with nothing said
  // about it is a link, which they did not need a journal for.
  if (!person_id) return Response.json({ error: 'Nobody was chosen.' }, { status: 400 });
  if (!String(album ?? '').trim() || !String(artist ?? '').trim()) {
    return Response.json({ error: 'Pick a record first.' }, { status: 400 });
  }
  if (!String(note ?? '').trim()) {
    return Response.json({ error: 'Say something about it.' }, { status: 400 });
  }

  try {
    const person = await pull_person(person_id);
    if (!person) return Response.json({ error: 'They are not in your address book.' }, { status: 404 });

    const result = await send_record({
      to: person.address,
      album, artist, year, note, album_art, collection_id, quiet, sender_entry,
    });

    // A refusal at the far end is not this copy failing, so it answers 200
    // with the reason on it rather than an error status: the sheet's job is
    // the same either way, which is to print what happened and keep what was
    // written. A status would have the browser's own error handling decide
    // that for it.
    if (!result.ok) return Response.json({ ok: false, error: result.error });
    return Response.json({ ok: true, to: person.name || null, sent: result.sent });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}
