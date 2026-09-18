// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
import { pull_drafts, save_draft } from '@/library/database_actions';
import { requireWristband } from '@/library/wristband';

// Unfinished listens. Everything here is behind the wristband — a draft is a
// half-written private note, not something the public archive has any business
// reading, so unlike /api/entries even the GET is gated.
//
// ── Why the failures are printed, 2026-09-18 ──────────────────────────────
// The automatic save is deliberately silent: it does not raise an alert when
// it fails, because the next keystroke will try again and the browser's copy
// is still there (useSessionDraft). That is right, and it is also how an
// entire listen's worth of server saves failed without anybody noticing —
// every POST answering 500 with `invalid input syntax for type integer:
// "4.5"`, the message travelling back to a caller written to ignore it, and
// the server console saying nothing at all because the catch below turns the
// error into a response and drops it.
//
// So it says so now. A route that is allowed to fail quietly on the screen
// has to be loud in the log, or there is nowhere left for it to be seen.
// Migration 019 fixed that particular one; this is so the next one costs a
// glance rather than an evening.

export async function GET(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  try {
    const drafts = await pull_drafts();
    return Response.json({ drafts });
  } catch (error) {
    console.error('[drafts] GET failed:', error.message);
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
    console.error('[drafts] POST failed:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
