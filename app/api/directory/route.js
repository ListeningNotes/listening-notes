// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/directory/route.js
// The registry's list: journals that chose to be findable, logging first and
// then newest listed, thirty at a time, with how many are listed and how
// many are logging right now.
//
// What every copy's Board asks, through its own /api/board (DIRECTORY_URL in
// library/version.js) — public, and readable across origins. The answer is
// read straight from the table and never waits on a journal. Names, beacons
// and covers, all of them already public on the journals themselves; never
// an entry, never anybody's writing, and never a number beside a person.
//
// ── And the Board refreshes itself when it is looked at, 2026-10-17 ───────
// Miyel chose this over a schedule ("go with option 1"): nothing to set up,
// and nothing runs while nobody is looking. After the answer has gone, one
// round of the refresh (`gather`) asks the journals whose turn has come —
// every minute for one logging within the hour, every half hour otherwise,
// slower for one not answering, forty at most. A look never asks every
// journal: only the due ones, each claimed so two looks never ask one twice.
// The answer is kept at the edge for half a minute, so most looks never
// reach this code at all.
// `?after=` is the cursor the last page handed back.
//
// ── The Board, 2026-10-08 ──────────────────────────────────────────────────
// `?board` is the Board's first screen in one answer: everybody logging
// right now, and a shuffled dozen of everybody else (pull_board). `?q=` looks
// a name — and, since piece three, a record — up. `?among=` answers which
// of a journal's hashed addresses are on the Board, and what each is playing
// (pull_among). `?alike=` answers who else logged a journal's records, asked
// by each record's hash (pull_alike). `?covers`, the records keepers on the
// Board have logged lately as covers alone — for the front door's wall,
// 2026-10-22 (pull_covers). The plain list stays as it was for
// anything that still asks for it.

import { after } from 'next/server';
import { pull_directory_page, pull_board, find_by_name, pull_among, pull_alike, pull_covers, gather } from '@/library/directory_actions';
import { answerNoJournal } from '@/library/hosting_directory';

// A round can take a few seconds after the answer has gone: up to forty
// journals at once, 2.5 seconds for a beacon and eight for a journal's
// records. The host keeps the route alive this long for it.
export const maxDuration = 30;

const ACROSS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export async function GET(request) {
  after(() => gather().catch(() => {}));
  const asked = new URL(request.url).searchParams;
  try {
    const page = asked.has('board') ? await pull_board()
      : asked.has('q') ? await find_by_name(asked.get('q'))
      : asked.has('among') ? await pull_among(String(asked.get('among')).split(',').filter(h => /^[0-9a-f]{16}$/.test(h)))
      : asked.has('alike') ? await pull_alike(String(asked.get('alike')).split(',').filter(h => /^[0-9a-f]{16}$/.test(h)))
      : asked.has('covers') ? await pull_covers()
      : await pull_directory_page(asked.get('after') || '');
    return Response.json(page, {
      // The same for everybody: a shared cache may hold it for half a
      // minute, and a browser asks again every time.
      headers: { ...ACROSS, 'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=60' },
    });
  } catch (error) {
    const nowhere = answerNoJournal(error, ACROSS);
    if (nowhere) return nowhere;
    return Response.json({ error: 'The directory could not be read just now.' }, { status: 503, headers: ACROSS });
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: ACROSS });
}
