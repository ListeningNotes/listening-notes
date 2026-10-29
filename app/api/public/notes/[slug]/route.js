// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/public/notes/[slug]/route.js
// One entry's note, in the form another journal reads, 2026-10-24.
//
// For a friend's page about you (app/dashboard/people/[id] on their copy):
// the record you both logged, with both of your notes on it. The feed
// carries no writing (PUBLIC_FIELDS), so this is the one door it leaves by —
// one entry at a time, the album note alone, and only what this entry's own
// page already shows to anybody who opens it (library/database_actions.js,
// pull_public_note).
//
// The reader's rule, which is theirs to keep and which their page keeps: the
// note is read when the record is on screen, held while it is, and stored
// nowhere — never put into their journal, its feed or its exports — always
// with this keeper's face on it and a way back to this entry (AGENTS, Never).
//
// An entry with nothing to give answers exactly as an entry that is not
// there: a 404, so a reader cannot tell a quiet entry from a missing one. A
// copy from before this door answers 404 too, and the reader shows only the
// way to the entry.

import { pull_public_note } from '@/library/database_actions';
import { answerNoJournal } from '@/library/hosting_directory';

// Read by browsers on other people's journals, so it has to say so out
// loud (the feed's reason, app/api/public/entries). And never kept by a
// browser or anything between: read live, every time.
const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'no-store',
};

export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    const found = await pull_public_note(String(slug || ''));
    if (!found) return Response.json({ error: 'Not found' }, { status: 404, headers: HEADERS });
    return Response.json(found, { headers: HEADERS });
  } catch (error) {
    const nowhere = answerNoJournal(error, HEADERS);
    if (nowhere) return nowhere;
    return Response.json({ error: error.message }, { status: 500, headers: HEADERS });
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: HEADERS });
}
