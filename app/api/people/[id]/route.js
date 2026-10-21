// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// One person in the address book: reading them, pinning them, and crossing
// them out. Owner-only, all three.

import { pull_person, pin_person, remove_person, set_private, take_move } from '@/library/people_actions';
import { requireWristband } from '@/library/wristband';

export async function GET(request, { params }) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  try {
    const { id } = await params;
    const person = await pull_person(id);
    if (!person) return Response.json({ error: 'Nobody by that id.' }, { status: 404 });
    return Response.json({ person });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// Pinning and unpinning, 2026-09-20. The body says which — `{ pinned: true }`
// or `{ pinned: false }` — and nothing else about a person is editable here:
// their name is read off their journal and their address is what they are.
// Since 2026-10-08 the body may say `{ private: true | false }` instead: kept
// off the Board, or not (people_actions.js, set_private). And since
// 2026-10-21 `{ moved: true }`: the Inbox's Update, taking the new address a
// friend's journal said it moved to (people_actions.js, take_move) — the one
// way an address in the book changes, and only on the keeper's press.
//
// A PATCH rather than two routes, because it is one field with two values and
// a /pin and an /unpin would be the same handler written twice.
export async function PATCH(request, { params }) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    if (body?.moved === true) {
      const person = await take_move(id);
      if (!person) return Response.json({ error: 'There is no move to take.' }, { status: 404 });
      return Response.json({ person });
    }
    if (typeof body?.private === 'boolean') {
      const kept = await set_private(id, body.private);
      if (!kept) return Response.json({ error: 'Nobody by that id.' }, { status: 404 });
      return Response.json({ person: kept });
    }
    if (typeof body?.pinned !== 'boolean') {
      return Response.json({ error: 'Say pinned: true or pinned: false.' }, { status: 400 });
    }
    const person = await pin_person(id, body.pinned);
    if (!person) return Response.json({ error: 'Nobody by that id.' }, { status: 404 });
    return Response.json({ person });
  } catch (error) {
    // The shelf being full is not the server going wrong, and the page has
    // something to say about it rather than something to log.
    if (error.full) return Response.json({ error: error.message }, { status: 409 });
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  try {
    const { id } = await params;
    const gone = await remove_person(id);
    if (!gone) return Response.json({ error: 'Nobody by that id.' }, { status: 404 });
    return Response.json({ removed: gone.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
