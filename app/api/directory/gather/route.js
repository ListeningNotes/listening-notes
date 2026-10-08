// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/directory/gather/route.js
// The scheduled job: one run of asking the listed journals what they are
// logging, on the registry's own copy.
//
// A schedule calls this, never a reader's visit (Miyel's directory
// instructions, 2026-10-07) — otherwise one unlucky visitor would set off a
// fetch to every listed journal. Each run asks only the journals whose turn
// has come: every minute for one seen logging within the hour, every thirty
// minutes otherwise, slower again for one that has not been answering
// (library/directory_actions.js, `gather`). 2.5 seconds each.
//
// ── What calls it ─────────────────────────────────────────────────────────
// Not a cron in vercel.json, deliberately: that file is every copy's, and a
// schedule more often than daily is refused on Vercel's free plan, so it
// would stop every friend's copy deploying. The registry's keeper sets
// CRON_SECRET on the registry's own deployment and points a schedule of her
// choosing at this address with `Authorization: Bearer <CRON_SECRET>`
// (docs/OPERATIONS.md, The directory's job). On a copy with no CRON_SECRET
// there is no job, and this answers nothing.

import { gather } from '@/library/directory_actions';

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response('Not here.', { status: 404 });
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return Response.json({ asked: await gather() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
