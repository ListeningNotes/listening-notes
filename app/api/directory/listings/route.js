// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/directory/listings/route.js
// A journal asking to be in the directory, or to leave it — always from that
// journal's own server, on its keeper's press (app/api/listing/route.js).
//
// POST { address }: issues the code, reads the journal's
// /api/public/listing once, and keeps the row only if the code comes back
// (201). Until the journal serves it, the answer is the code itself (202),
// to serve and ask again. The code is made from this copy's secret and the
// address (library/secrets.js), so asking writes nothing.
//
// DELETE { address, code }: removes the row entirely. The instructions say
// with the code, and the code alone is not enough: while a journal is listed
// it serves its code to anybody, so anybody could send it. So the row goes
// only when the code matches and the journal itself has forgotten it — which
// is what pressing the switch off does first. Delisting is still one press,
// and still removes the only thing that was there.
//
// Both read the named address, so both are counted twice: against the
// journal named, and for everybody at once (library/doorman.js).

import { journalUrl, tidyJournal } from '@/library/return_address';
import { directoryCode } from '@/library/secrets';
import { mayKnock, tooSoon } from '@/library/doorman';
import { pull_listing, save_listing, remove_listing, read_journal, record_seen, refresh_records } from '@/library/directory_actions';

// Longer than the job's look: the journal is waiting on this answer, and a
// sleeping serverless copy takes a moment to wake.
const CHECK_MS = 8000;

// A copy on this machine is a rehearsal (library/return_address.js), taken
// only while the directory is being rehearsed itself — never by a registry a
// stranger can reach, where it would be an address pointing back inside it.
const onThisMachine = host => /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);

// What the journal shows at /api/public/listing: its code, or '' when it
// shows none. Throws only when the journal could not be read at all.
async function shownCode(address) {
  const answer = await fetch(`${journalUrl(address)}/api/public/listing`, {
    signal: AbortSignal.timeout(CHECK_MS),
    cache: 'no-store',
  });
  if (answer.status === 404) return '';
  if (!answer.ok) throw new Error(String(answer.status));
  return (await answer.text()).trim();
}

const UNREACHED = 'The directory could not reach your journal to check it. Nothing changed; try again in a minute.';

async function open(request) {
  const body = await request.json().catch(() => null);
  const address = tidyJournal(body?.address);
  if (!address || (onThisMachine(address) && process.env.NODE_ENV !== 'development')) {
    return { refused: Response.json({ error: 'That is not a journal address.' }, { status: 400 }) };
  }
  const one = mayKnock('listing', address);
  if (!one.allowed) return { refused: tooSoon(one.retryAfter) };
  const all = mayKnock('directory', 'everyone');
  if (!all.allowed) return { refused: tooSoon(all.retryAfter) };
  return { address, body };
}

export async function POST(request) {
  const { refused, address } = await open(request);
  if (refused) return refused;
  try {
    const code = await directoryCode(address);
    let shown;
    try { shown = await shownCode(address); } catch { return Response.json({ error: UNREACHED }, { status: 502 }); }
    if (shown !== code) return Response.json({ code }, { status: 202 });
    await save_listing(address, code);
    // Filled in at once, so the journal is on the list with its name and
    // what it is logging rather than blank until the job's next run. This is
    // the keeper's press paying for one look, not a reader.
    try { await record_seen(address, await read_journal(address, { withName: true })); } catch { /* the job fills it */ }
    // And its records, so it is on the Board's record sections from the start
    // rather than from the job's next slow round (2026-10-08).
    try { await refresh_records(address); } catch { /* the job fills it */ }
    return Response.json({ listed: true }, { status: 201 });
  } catch {
    return Response.json({ error: 'The directory could not do that just now. Nothing changed.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { refused, address, body } = await open(request);
  if (refused) return refused;
  try {
    const row = await pull_listing(address);
    if (!row) return Response.json({ listed: false });
    if (String(body?.code || '') !== row.code) {
      return Response.json({ error: 'That is not the code this journal was listed with.' }, { status: 403 });
    }
    let shown;
    try { shown = await shownCode(address); } catch { return Response.json({ error: UNREACHED }, { status: 502 }); }
    if (shown === row.code) {
      return Response.json({ error: 'Your journal still says it wants to be listed, so it was left on.' }, { status: 409 });
    }
    await remove_listing(address);
    return Response.json({ listed: false });
  } catch {
    return Response.json({ error: 'The directory could not do that just now. Nothing changed.' }, { status: 500 });
  }
}
