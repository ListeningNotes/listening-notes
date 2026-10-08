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

import { pull_directory_page } from '@/library/directory_actions';

const ACROSS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export async function GET(request) {
  const after = new URL(request.url).searchParams.get('after') || '';
  try {
    const page = await pull_directory_page(after);
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
