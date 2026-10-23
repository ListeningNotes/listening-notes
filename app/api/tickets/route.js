// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/tickets/route.js
// A ticket to start a journal at the front door, for the keeper's Invite
// (components/main_components/InviteSheet.js; Miyel's word, 2026-10-22).
//
//   POST    a new ticket from this journal: the link that carries it, to
//           the front door's Choose your address
//
// The keeper's alone — the wristband, from the journal's own pages — and
// only on a deployment that hosts journals, where the front door and its
// tickets live (library/hosting_directory.js). The ticket names the journal
// this press came from, the address the keeper is signed in at, and nothing
// the page says, so nobody can write another inviter onto it. A journal on
// a copy of its own has no ticket to give yet: it answers `hosted: false`,
// and Invite hands out its address as before, which the front door takes
// only once its door is open.

import { NextResponse } from 'next/server';
import { requireWristband } from '@/library/wristband';
import { hosting, journalHere, answerNoJournal, make_ticket } from '@/library/hosting_directory';
import { hostedDomain } from '@/library/front_door';
import { tidyJournal } from '@/library/return_address';

const FRESH = { 'Cache-Control': 'no-store' };

export async function POST(request) {
  const denied = await requireWristband(request);
  if (denied) return denied;
  if (!hosting() || !hostedDomain()) return NextResponse.json({ hosted: false }, { status: 409, headers: FRESH });
  try {
    await journalHere();
  } catch (error) {
    return answerNoJournal(error, FRESH) || NextResponse.json({ error: 'That didn’t work. Try again.' }, { status: 500 });
  }

  // The address this press reached, as the keeper reached it: a dev
  // server's port and all, so the front door can ask this journal its name.
  const reached = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').split(',')[0].trim();
  const inviter = tidyJournal(reached);
  if (!inviter) return NextResponse.json({ error: 'That didn’t work. Try again.' }, { status: 500, headers: FRESH });

  const made = await make_ticket(inviter);
  if (made.refused) {
    return NextResponse.json(
      { error: `That’s ${made.most} invites today. Try again tomorrow.` },
      { status: 429, headers: FRESH },
    );
  }

  // The front door, the way this request came in: https behind Vercel, the
  // dev server's scheme and port on a dev server.
  const port = reached.match(/:\d+$/)?.[0] || '';
  const scheme = (request.headers.get('x-forwarded-proto') || '').split(',')[0].trim() || (port ? 'http' : 'https');
  const link = `${scheme}://${hostedDomain()}${port}/get?ticket=${encodeURIComponent(made.code)}`;
  return NextResponse.json({ link }, { headers: FRESH });
}
