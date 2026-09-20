// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// One person in the address book: reading them, pinning them, and crossing
// them out. Owner-only, all three.

import { pull_person, pin_person, remove_person } from '@/library/people_actions';
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
//
// A PATCH rather than two routes, because it is one field with two values and
// a /pin and an /unpin would be the same handler written twice.
export async function PATCH(request, { params }) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    if (typeof body?.pinned !== 'boolean') {
      return Response.json({ error: 'Say pinned: true or pinned: false.' }, { status: 400 });
    }
    const person = await pin_person(id, body.pinned);
    if (!person) return Response.json({ error: 'Nobody by that id.' }, { status: 404 });
    return Response.json({ person });
  } catch (error) {
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
