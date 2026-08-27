// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
import { pull_drafts, save_draft } from '@/library/database_actions';
import { requireWristband } from '@/library/wristband';

// Unfinished listens. Everything here is behind the wristband — a draft is a
// half-written private note, not something the public archive has any business
// reading, so unlike /api/entries even the GET is gated.

export async function GET(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  try {
    const drafts = await pull_drafts();
    return Response.json({ drafts });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  try {
    const body = await request.json();
    const draft = await save_draft(body);
    return Response.json({ draft });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
