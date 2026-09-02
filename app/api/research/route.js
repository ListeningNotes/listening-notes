// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
import { research_album_live } from '@/library/ai_integration';
import { pull_briefing, save_briefing } from '@/library/database_actions';
import { requireWristband } from '@/library/wristband';
import { anthropicKey } from '@/library/secrets';

// Streams the briefing as NDJSON — one complete brief object per line, each
// superseding the last. The client renders whatever arrived most recently, so
// the debrief fills in as Claude writes instead of appearing all at once.
//
// An album already researched comes straight back from the briefings table as
// a single line. Pass refresh:true to skip the stored copy and research again.
export async function POST(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  const { album, artist, refresh } = await request.json();
  const encoder = new TextEncoder();

  // A copy with no key does not get as far as the SDK, which would otherwise
  // fail with an authentication message written for a developer. The album
  // screen hides the button on such a copy; this is for anything that asks
  // anyway.
  if (!(await anthropicKey())) {
    return new Response(JSON.stringify({ error: 'Research is off on this copy — there is no Anthropic key set.' }) + '\n', {
      headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  if (!refresh) {
    try {
      const stored = await pull_briefing(album, artist);
      if (stored?.brief) {
        const brief = { ...stored.brief, done: true, cached: true, researched_at: stored.refreshed_at };
        return new Response(JSON.stringify(brief) + '\n', {
          headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' },
        });
      }
    } catch {
      // A cache lookup failure is never a reason to fail the request — fall
      // through and research as though nothing was stored.
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      let last = null;
      try {
        for await (const brief of research_album_live(album, artist)) {
          last = brief;
          controller.enqueue(encoder.encode(JSON.stringify(brief) + '\n'));
        }
      } catch (error) {
        controller.enqueue(encoder.encode(JSON.stringify({ error: error.message }) + '\n'));
      } finally {
        controller.close();
      }
      // Store only a briefing that actually finished with something in it, so a
      // truncated or empty run doesn't get cached and served forever.
      if (last?.done && (last.sections?.length || last.key_facts?.length)) {
        try { await save_briefing(album, artist, last); } catch { /* caching is best-effort */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}
