// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// The public feed, in the form another journal reads.
//
// Every copy of Listening Notes serves this at the same path, which is what
// makes journals able to talk to each other without anything central: knowing
// someone's address is enough to know where their entries are. The shared
// route structure is the whole protocol.
//
// Metadata only — see PUBLIC_FIELDS in library/database_actions.js for what
// that includes and why the writing is left out.
//
// It also says whose it is: keeper_name rides beside the entries, so a copy
// reading this one can print a name where it would otherwise have to print
// an address — and no address is ever printed on a page (DECISIONS, The
// network). A copy from before 2026-09-12 answers without it, and the reader
// falls back to what it has.

import { pull_public_entries } from '@/library/database_actions';
import { pull_keeper_name } from '@/library/settings_actions';

// Read by browsers on other people's journals, so it has to say so out loud.
// Without this header the request is blocked before it reaches the page, and
// a comparison comes back empty with no error to explain why.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export async function GET() {
  try {
    const [entries, keeper_name] = await Promise.all([pull_public_entries(), pull_keeper_name()]);
    return Response.json({ keeper_name, entries }, { headers: CORS });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500, headers: CORS });
  }
}

// A cross-origin GET with no custom headers is not preflighted, so this is
// belt and braces — but it costs nothing and saves a confusing failure if a
// caller ever does add a header.
export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
