// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/issue/route.js
// This journal's door to the issue, for Community: the publication's answer,
// asked server to server and kept, so a page never waits on another site and
// a publication that cannot be reached leaves Community drawn from what was
// kept, with `stale` saying so (library/the_issue.js). Public, as the issue
// is: a visitor's Community reads it too.
import { read_issue } from '@/library/the_issue';
import { answerNoJournal } from '@/library/hosting_directory';

export async function GET() {
  try {
    const { issue, stale } = await read_issue();
    return Response.json({ issue, stale }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const nowhere = answerNoJournal(error);
    if (nowhere) return nowhere;
    return Response.json({ issue: null, stale: true }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
