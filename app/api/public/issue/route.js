// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/public/issue/route.js
// The issue, from the publication's own journal: the newest month's prompt
// and the records keepers sent to it, in the order they arrived
// (library/the_issue.js). Every other journal answers 404 — the same answer
// a copy too old to have this route gives — and reads the issue from the
// publication instead (/api/issue).
import { takesPrompts } from '@/library/month_prompt';
import { pull_issue } from '@/library/the_issue';
import { answerNoJournal } from '@/library/hosting_directory';

const EDGE = 'public, max-age=0, s-maxage=60, stale-while-revalidate=300';

export async function GET() {
  try {
    if (!(await takesPrompts())) return new Response('No issue here.', { status: 404 });
    return Response.json({ issue: await pull_issue() }, { headers: { 'Cache-Control': EDGE } });
  } catch (error) {
    const nowhere = answerNoJournal(error);
    if (nowhere) return nowhere;
    return Response.json({ issue: null }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
