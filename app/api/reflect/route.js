// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
import { ask_echo } from '@/library/ai_integration';
import { requireWristband } from '@/library/wristband';

export async function POST(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  try {
    const body = await request.json();
    const data = await ask_echo(body);
    return Response.json({ reply: data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
