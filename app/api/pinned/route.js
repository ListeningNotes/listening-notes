// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/pinned/route.js
// The pinned albums, 2026-11-25 (library/pinned_actions.js).
//
// GET is anybody's, the way the card is: the albums and their lines are what
// the keeper's room shows every visitor, and another journal may draw them
// too, so it says so out loud. A line is only ever words the entry's own page
// already shows anybody.
//
// POST pins a line of an entry's writing ({ slug, line, replacing, prompt }); DELETE
// takes one down (?position=). The keeper's alone.

import { requireWristband } from '@/library/wristband';
import { answerNoJournal } from '@/library/hosting_directory';
import { pin_line, pull_pinned, unpin } from '@/library/pinned_actions';

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'no-store',
};

function failed(error, headers) {
  const nowhere = answerNoJournal(error, headers);
  if (nowhere) return nowhere;
  return Response.json({ error: error.message }, { status: 500, headers });
}

export async function GET() {
  try {
    return Response.json({ pinned: await pull_pinned() }, { headers: HEADERS });
  } catch (error) {
    return failed(error, HEADERS);
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: HEADERS });
}

export async function POST(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  try {
    const { slug, line, replacing = null, prompt = null } = await request.json();
    const answer = await pin_line(String(slug || ''), String(line || ''), replacing == null ? null : Number(replacing), prompt == null ? null : String(prompt));
    if (answer.trouble) return Response.json({ error: answer.trouble }, { status: 400 });
    return Response.json(answer);
  } catch (error) {
    return failed(error, {});
  }
}

export async function DELETE(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  try {
    const position = Number(new URL(request.url).searchParams.get('position'));
    if (!Number.isInteger(position) || position < 1 || position > 3) {
      return Response.json({ error: 'No such place.' }, { status: 400 });
    }
    return Response.json(await unpin(position));
  } catch (error) {
    return failed(error, {});
  }
}
