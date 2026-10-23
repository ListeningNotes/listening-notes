// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/front-door/route.js
// Starting a journal at the front door (library/front_door.js; Miyel's
// name, 2026-10-20). Answers only at the front door's own address.
//
//   GET                 how many places are left, and of how many
//   GET ?name=<name>    whether that address is free, as somebody types it
//   POST { name, ticket }  makes the journal, and says where its setup is —
//                       a line at a time, one for each step as it finishes,
//                       so the page can tick them off, then where to go;
//                       with whoever the ticket says invited them
//
// While the front door is by invitation (OPEN_DOOR unset, library/front_door.js)
// a journal is made only on a good ticket, taken as the making begins and
// given back if it fails (library/hosting_directory.js, tickets).
//
// The POST is taken only from the front door's own pages, like every press
// that changes something (library/wristband.js), and only a few times an
// hour from one place (the doorman's `start`).

import { NextResponse } from 'next/server';
import {
  isFrontDoor, nameState, tidyName, journalHostFor, placesLeft, placesMost, KEPT_NAMES,
  make_journal, clear_never_set_up, openDoor,
} from '@/library/front_door';
import { hostHere, take_ticket, ticket_made, give_back_ticket } from '@/library/hosting_directory';
import { mayKnock, tooSoon, whoIsKnocking } from '@/library/doorman';
import { fromItsOwnPages } from '@/library/wristband';
import { tidyJournal } from '@/library/return_address';

const NOWHERE = () => NextResponse.json({ error: 'There is no front door here.' }, { status: 404 });
const FRESH = { 'Cache-Control': 'no-store' };

export async function GET(request) {
  if (!isFrontDoor(await hostHere())) return NOWHERE();
  const knock = await mayKnock('address', whoIsKnocking(request));
  if (!knock.allowed) return tooSoon(knock.retryAfter);
  try {
    const asked = new URL(request.url).searchParams.get('name');
    const left = await placesLeft();
    if (asked === null) return NextResponse.json({ left, most: placesMost() }, { headers: FRESH });
    return NextResponse.json(
      {
        name: tidyName(asked), host: journalHostFor(asked), state: await nameState(asked), left,
        // A word nobody may start a journal at (KEPT_NAMES): "taken" to
        // signup, and never a door for Find a journal — the studio, kept at
        // one, is nobody's to be shown (2026-10-22).
        kept: KEPT_NAMES.has(tidyName(asked)),
      },
      { headers: FRESH },
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  if (!isFrontDoor(await hostHere())) return NOWHERE();
  if (!fromItsOwnPages(request)) return NextResponse.json({ error: 'Not from here.' }, { status: 403 });
  const knock = await mayKnock('start', whoIsKnocking(request));
  if (!knock.allowed) return tooSoon(knock.retryAfter);

  const { name, ticket: given } = await request.json().catch(() => ({}));
  const ticket = typeof given === 'string' ? given.trim() : '';
  // Unfinished journals are let go on any press, ticket or none, so an hour
  // means an hour even while the door is by invitation.
  await clear_never_set_up();
  if (!ticket && !openDoor()) {
    return NextResponse.json({ error: 'A journal starts with an invite for now.', ticket: 'none' }, { status: 403 });
  }
  if ((await placesLeft()) <= 0) {
    return NextResponse.json({ error: 'We’re full for now. Come back soon.', full: true }, { status: 409 });
  }
  const state = await nameState(name);
  if (state !== 'free') {
    return NextResponse.json(
      { error: state === 'taken' ? 'Not available.' : 'Letters, numbers and dashes.', state },
      { status: 409 },
    );
  }

  // The new journal's own address, the way this request reached the front
  // door: https behind Vercel, and the dev server's port on a dev server.
  const proto = (request.headers.get('x-forwarded-proto') || '').split(',')[0].trim()
    || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  const port = (request.headers.get('host') || '').match(/:(\d+)$/)?.[1];
  // The ticket is taken now, in one statement, so a link pressed twice at
  // once makes one journal. Who invited them is the ticket's, never the
  // page's, and goes on to setup in the link itself, before the #: an
  // address is no secret, and setup offers to add them and wave. The ticket
  // goes too, so a setup that times out can start again on the same one.
  const inviter = ticket ? await take_ticket(ticket) : null;
  if (ticket && !inviter && !openDoor()) {
    return NextResponse.json({ error: 'This invite has already been used, or has run out.', ticket: 'spent' }, { status: 403 });
  }
  const invited = tidyJournal(inviter || '');
  const asking = [
    invited ? `invite=${encodeURIComponent(invited)}` : '',
    inviter ? `ticket=${encodeURIComponent(ticket)}` : '',
  ].filter(Boolean).join('&');

  // One line of JSON for each step as it finishes, then where to go — or
  // what went wrong. A person who closes the page meanwhile is not told, and
  // the journal they never reached is cleared after an hour like any other.
  const encoder = new TextEncoder();
  const lines = new ReadableStream({
    async start(controller) {
      const say = line => {
        try { controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`)); } catch { /* gone */ }
      };
      try {
        const { host, code } = await make_journal(name, { onStep: step => say({ step }) });
        if (inviter) await ticket_made(ticket, host).catch(() => {});
        // The claim code after #, which no server is ever sent: not in a
        // log, not in a referrer. The journal's setup reads it and opens.
        say({ to: `${proto}://${host}${port ? `:${port}` : ''}/setup${asking ? `?${asking}` : ''}#code=${code}` });
      } catch (error) {
        if (inviter) await give_back_ticket(ticket).catch(() => {});
        if (/taken/i.test(error?.message || '')) {
          say({ error: 'Not available.', state: 'taken' });
        } else {
          console.error('[front door] a journal could not be made:', error?.message || error);
          say({ error: 'Your journal couldn’t be made just now. Try again in a minute.' });
        }
      }
      try { controller.close(); } catch { /* gone */ }
    },
  });
  return new Response(lines, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', ...FRESH } });
}
