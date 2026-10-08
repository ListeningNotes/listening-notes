// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/directory/route.js
// The registry's list: journals that chose to be findable, logging first and
// then newest listed, thirty at a time, with how many are listed and how
// many are logging right now.
//
// What every copy's /directory asks, once, from the reader's browser
// (DIRECTORY_URL in library/version.js) — so it is public, and may be read
// across origins. It is read straight from the table the scheduled job keeps
// and never fetches a journal on a reader's behalf. Names, beacons and
// covers, all of them already public on the journals themselves; never an
// entry, never anybody's writing, and never a number beside a person.
// `?after=` is the cursor the last page handed back.
//
// ── The Board, 2026-10-08 ──────────────────────────────────────────────────
// `?board` is the Board's first screen in one answer: everybody logging
// right now, and a shuffled dozen of everybody else (pull_board). `?q=` looks
// a name up. `?among=` answers which of a journal's hashed addresses are on
// the Board, and what each is playing (pull_among). The plain list stays as
// it was for anything that still asks for it.

import { pull_directory_page, pull_board, find_by_name, pull_among } from '@/library/directory_actions';

const ACROSS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export async function GET(request) {
  const asked = new URL(request.url).searchParams;
  try {
    const page = asked.has('board') ? await pull_board()
      : asked.has('q') ? await find_by_name(asked.get('q'))
      : asked.has('among') ? await pull_among(String(asked.get('among')).split(',').filter(h => /^[0-9a-f]{16}$/.test(h)))
      : await pull_directory_page(asked.get('after') || '');
    return Response.json(page, {
      // The same for everybody: a shared cache may hold it for half a
      // minute, and a browser asks again every time.
      headers: { ...ACROSS, 'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=60' },
    });
  } catch {
    return Response.json({ error: 'The directory could not be read just now.' }, { status: 503, headers: ACROSS });
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: ACROSS });
}
