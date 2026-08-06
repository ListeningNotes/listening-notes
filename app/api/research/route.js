import { research_album_live } from '@/library/ai_integration';
import { requireWristband } from '@/library/wristband';

// Streams the briefing as NDJSON — one complete brief object per line, each
// superseding the last. The client renders whatever arrived most recently, so
// the debrief fills in as Claude writes instead of appearing all at once.
export async function POST(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  const { album, artist } = await request.json();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const brief of research_album_live(album, artist)) {
          controller.enqueue(encoder.encode(JSON.stringify(brief) + '\n'));
        }
      } catch (error) {
        controller.enqueue(encoder.encode(JSON.stringify({ error: error.message }) + '\n'));
      } finally {
        controller.close();
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
