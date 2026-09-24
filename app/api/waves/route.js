// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/waves/route.js
// Waves: somebody added this journal and said so.
//
// POST is public, because the journal waving is another copy's server and it
// has no wristband here. It carries the waving journal's address and the name
// it gives, **and nothing else** — a body with any other field is refused
// rather than trimmed, so nobody can find out whether a message would slip
// through. Before anything is kept, this copy asks that journal its keeper's
// name the way filing an address does, and keeps the name it got back, never
// the one it was handed. A journal waving at itself is refused. Counted by
// the doorman against the waving journal, as a send from home is, and the
// question it makes this copy ask goes through the relay door.
//
// Never answers 404 on purpose: the waving copy reads 404 as "this journal is
// too old to take a wave" and says so to its keeper (library/outbox.js).
//
// GET, PATCH and DELETE are the keeper's: the list the inbox draws, a wave
// opened, and a wave left — which deletes it.
import { requireWristband } from '@/library/wristband';
import { mayKnock, tooSoon, whoIsKnocking } from '@/library/doorman';
import { ask_journal_name } from '@/library/people_actions';
import { tidyJournal } from '@/library/return_address';
import { pull_settings } from '@/library/settings_actions';
import { pull_waves, save_wave, see_wave, remove_wave } from '@/library/wave_actions';

const CARRIES = ['journal', 'name'];

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json({ error: 'A wave is a journal and a name.' }, { status: 400 });
  }
  if (Object.keys(body).some(key => !CARRIES.includes(key))) {
    return Response.json({ error: 'A wave carries a journal and a name, and nothing else.' }, { status: 400 });
  }
  const journal = tidyJournal(body.journal);
  if (!journal) return Response.json({ error: "That doesn't look like a journal address." }, { status: 400 });

  try {
    const own = tidyJournal((await pull_settings()).site_address);
    if (own && journal === own) {
      return Response.json({ error: 'A journal cannot wave at itself.' }, { status: 400 });
    }

    const counted = mayKnock('wave', journal);
    if (!counted.allowed) return tooSoon(counted.retryAfter);
    const relayed = mayKnock('relay', whoIsKnocking(request));
    if (!relayed.allowed) return tooSoon(relayed.retryAfter);

    // Real, and called what it says it is called — or not kept at all.
    const name = await ask_journal_name(journal);
    if (!name) {
      return Response.json({ error: 'That journal did not answer, so the wave was not kept.' }, { status: 422 });
    }
    await save_wave({ address: journal, name });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  try {
    return Response.json({ waves: await pull_waves() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  const id = Number((await request.json().catch(() => ({})))?.id);
  if (!Number.isInteger(id) || id < 1) return Response.json({ error: 'Which one?' }, { status: 400 });
  try {
    await see_wave(id);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  const id = Number((await request.json().catch(() => ({})))?.id);
  if (!Number.isInteger(id) || id < 1) return Response.json({ error: 'Which one?' }, { status: 400 });
  try {
    await remove_wave(id);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
