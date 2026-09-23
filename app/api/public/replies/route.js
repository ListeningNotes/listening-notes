// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// Replies to comments that were left here from another journal.
//
// Asked by that journal's own copy, from its keeper's inbox: ?to=<their
// address>. It is how a reply on somebody else's journal reaches the person
// it answers without anything being pushed anywhere — their copy comes and
// looks, the way the feed does, and this one never learns it was asked.
// See pull_replies_to in library/comment_actions.js for what is handed back
// and why only that.
//
// A copy from before 1.28.0 answers this path with a 404, and the inbox
// simply has nothing from that journal.

import { pull_replies_to } from '@/library/comment_actions';
import { tidyJournal } from '@/library/return_address';

// Read by browsers on other people's journals — see /api/public/entries.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export async function GET(request) {
  const to = tidyJournal(new URL(request.url).searchParams.get('to'));
  if (!to) return Response.json({ error: 'to must be a journal address' }, { status: 400, headers: CORS });
  try {
    const replies = await pull_replies_to(to);
    return Response.json({ replies }, { headers: CORS });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500, headers: CORS });
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
