// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// The records this journal has sent that have not come back
// (library/sent_actions.js): read for the inbox's Sent list, and removed one
// at a time by the keeper. Written only by /api/outbox, as a send lands, so
// there is no POST here.
//
// Gated: who the keeper sends to, and what, is nobody else's business.
import { requireWristband } from '@/library/wristband';
import { pull_sent, remove_sent } from '@/library/sent_actions';

export async function GET(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  try {
    return Response.json({ sent: await pull_sent() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  try {
    const body = await request.json().catch(() => ({}));
    const id = Number(body?.id);
    if (!Number.isInteger(id) || id < 1) {
      return Response.json({ error: 'Which one?' }, { status: 400 });
    }
    await remove_sent(id);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
