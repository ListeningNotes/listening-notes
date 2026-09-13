// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// One person in the address book: reading them, and crossing them out.
// Owner-only both ways.

import { pull_person, remove_person } from '@/library/people_actions';
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
