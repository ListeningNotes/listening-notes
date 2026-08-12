import { nest_comments } from '@/library/comment_actions';
import { verify_receipt } from '@/library/wristband';

// The thread for one entry, plus any held comments the caller can prove they
// wrote. Same shape as GET /api/comments — comments grouped by track index,
// each already nested into its replies.
//
// POST rather than GET because receipts are closer to a credential than to a
// search term, and query strings end up in server logs and browser history.
// Nothing here is owner-only: a receipt speaks for exactly one comment, so the
// most it can ever unlock is the comment its holder wrote.
export async function POST(request) {
  try {
    const { slug, receipts } = await request.json();
    if (!slug) return Response.json({ error: 'slug required' }, { status: 400 });

    // Every receipt is checked against the seal before its id is trusted. A
    // broken or expired one is skipped rather than failing the request — one
    // stale receipt shouldn't cost you the rest of the thread.
    const list = Array.isArray(receipts) ? receipts.slice(0, 50) : [];
    const own_ids = (await Promise.all(list.map(verify_receipt))).filter(id => id !== null);

    const comments = await nest_comments(slug, own_ids);
    return Response.json({ comments });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
