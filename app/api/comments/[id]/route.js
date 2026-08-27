// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
import { approve_comment, dismiss_comment } from '@/library/comment_actions';
import { requireWristband } from '@/library/wristband';

// Owner-only moderation. PATCH approves (pending -> false); DELETE dismisses (removes).
export async function PATCH(request, { params }) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  try {
    const { id } = await params;
    const result = await approve_comment(id);
    if (!result) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json({ ok: true, id: result.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  try {
    const { id } = await params;
    const result = await dismiss_comment(id);
    if (!result) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json({ ok: true, id: result.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
