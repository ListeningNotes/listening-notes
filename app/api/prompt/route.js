// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/prompt/route.js
// The month's prompt, 2026-10-22 (the blog's first piece; library/
// month_prompt.js has the whole of it).
//
//   GET                    the keeper's: this month's prompt while it is
//                          open, and what this journal sent for it — null
//                          when there is none
//   POST { prompt, seal }  Listening Notes pinning the month's prompt here,
//                          sealed with the canonical keeper's key the way an
//                          LN. Admin letter is (scripts/letterhead.mjs,
//                          `prompt`); kept only when the seal is hers and it
//                          names this journal. Nothing is said back but
//                          whether it was kept.
//   POST { slug }          the keeper's press: that entry's record and its
//                          writing, as they stand, sent to the publication
//                          for the prompt. Once a prompt, and never written
//                          to the entry.
import { requireWristband } from '@/library/wristband';
import { mayKnock, tooSoon, whoIsKnocking } from '@/library/doorman';
import { read_prompt } from '@/library/letterhead';
import { pull_month_prompt, keep_month_prompt, stillOpen, send_to_prompt } from '@/library/month_prompt';
import { pull_entry_by_slug } from '@/library/database_actions';
import { pull_settings } from '@/library/settings_actions';
import { tidyJournal } from '@/library/return_address';
import { answerNoJournal } from '@/library/hosting_directory';

const NO_STORE = { 'Cache-Control': 'no-store' };

// What the keeper is told: the prompt while it is open — what it asks, its
// month, when it closes and what was sent for it — and nothing once it has
// closed.
const told = kept => (kept && stillOpen(kept)
  ? { said: kept.said, month: kept.month, ends_at: kept.ends_at, sent: kept.sent || null }
  : null);

export async function GET(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  try {
    return Response.json({ prompt: told(await pull_month_prompt()) }, { headers: NO_STORE });
  } catch (error) {
    const nowhere = answerNoJournal(error);
    if (nowhere) return nowhere;
    return Response.json({ prompt: null }, { headers: NO_STORE });
  }
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Nothing readable was sent.' }, { status: 400 });
  }

  // ── Listening Notes pinning the month's prompt ─────────────────────────
  // Counted by the loose door, as a letter is, so a flood of bad seals costs
  // its sender rather than this copy.
  if (body.prompt !== undefined) {
    const knocked = await mayKnock('relay', whoIsKnocking(request));
    if (!knocked.allowed) return tooSoon(knocked.retryAfter);
    try {
      const read = await read_prompt(body, await pull_month_prompt());
      if (!read.ok) return Response.json({ error: read.why }, { status: read.status });
      await keep_month_prompt(read.prompt);
      return Response.json({ ok: true });
    } catch (error) {
      const nowhere = answerNoJournal(error);
      if (nowhere) return nowhere;
      return Response.json({ error: 'The prompt could not be kept just now.' }, { status: 500 });
    }
  }

  // ── The keeper sending a record for it ─────────────────────────────────
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
  if (!slug) return Response.json({ ok: false, error: 'Choose a record from your wall.' }, { status: 400 });
  try {
    const kept = await pull_month_prompt();
    if (!kept || !stillOpen(kept)) {
      return Response.json({ ok: false, error: 'This month’s prompt has closed.' }, { status: 409 });
    }
    if (kept.sent) {
      return Response.json({ ok: false, error: 'You’ve sent a record for this prompt already.' }, { status: 409 });
    }
    // The entry as it stands this moment, read here rather than taken from
    // the page: what is sent is the keeper's own post, never words a page
    // could have changed on the way.
    const entry = await pull_entry_by_slug(slug);
    if (!entry) return Response.json({ ok: false, error: 'That entry isn’t on your wall.' }, { status: 404 });
    const settings = await pull_settings();
    const result = await send_to_prompt({
      prompt: kept,
      entry,
      keeper: String(settings?.keeper_name || '').trim(),
      from: tidyJournal(settings?.site_address),
    });
    if (!result.ok) return Response.json({ ok: false, error: result.error });
    return Response.json({ ok: true, prompt: told(result.prompt) });
  } catch (error) {
    const nowhere = answerNoJournal(error);
    if (nowhere) return nowhere;
    return Response.json({ ok: false, error: 'It couldn’t be sent just now. Try again in a minute.' }, { status: 500 });
  }
}
