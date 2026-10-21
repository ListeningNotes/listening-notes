// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/directory/gather/route.js
// One round of the refresh on a schedule, for whoever wants one: the same
// round a look at the Board sets off (app/api/directory/route.js), which is
// how the registry stays current since 2026-10-17 (Miyel: "go with option
// 1") with nothing to set up. This stays for an outside schedule that wants
// the Board fresh while nobody is looking, and for hosting. Each run asks
// only the journals whose turn has come (library/directory_actions.js,
// `gather`), 2.5 seconds each.
//
// ── What would call it ────────────────────────────────────────────────────
// Not a cron in vercel.json, deliberately: that file is every copy's, and a
// schedule more often than daily is refused on Vercel's free plan, so it
// would stop every friend's copy deploying. A keeper who wants one sets
// CRON_SECRET on the registry's own deployment and points a schedule at this
// address with `Authorization: Bearer <CRON_SECRET>` (docs/OPERATIONS.md,
// The directory's job). On a copy with no CRON_SECRET this answers nothing.

import { gather } from '@/library/directory_actions';
import { answerNoJournal } from '@/library/hosting_directory';

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response('Not here.', { status: 404 });
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return Response.json({ asked: await gather() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const nowhere = answerNoJournal(error);
    if (nowhere) return nowhere;
    return Response.json({ error: error.message }, { status: 500 });
  }
}
