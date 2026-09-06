// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
import { pull_wall_entries, save_new_entry } from '@/library/database_actions';
import { requireWristband } from '@/library/wristband';

// A list of records, without the writing in them. Everything that reads this
// is drawing a grid of covers, filtering one, or picking one — see
// pull_wall_entries for the measurements and for why nothing loses anything.
//
// The chain came off with the writing. It was included here for the source
// picker, which reads /api/entries/[slug] and gets the chain from there.
export async function GET() {
  try {
    const entries = await pull_wall_entries();
    return Response.json({ entries });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  try {
    const body = await request.json();
    const entry = await save_new_entry(body);
    return Response.json({ entry });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
