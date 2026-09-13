// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// Problems written in from a keeper's desk. POST is open to every copy —
// that is the point — and rate-limited; GET is the owner's, for the inbox.
//
// Posted to from other origins, so it has to say so out loud, and a JSON
// body is preflighted, so OPTIONS answers too. See migrations/009_reports.sql
// for what a report is and library/version.js for where they go.

import { save_report, pull_reports } from '@/library/report_actions';
import { mayKnock, tooSoon, whoIsKnocking } from '@/library/doorman';
import { requireWristband } from '@/library/wristband';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function POST(request) {
  const knock = mayKnock('report', whoIsKnocking(request));
  if (!knock.allowed) return tooSoon(knock.retryAfter);

  try {
    const body = await request.json().catch(() => ({}));
    if (!String(body?.said ?? '').trim()) {
      return Response.json({ error: 'Say what happened.' }, { status: 400, headers: CORS });
    }
    const report = await save_report(body);
    return Response.json({ report }, { headers: CORS });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500, headers: CORS });
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  try {
    const reports = await pull_reports();
    return Response.json({ reports });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
