import { pull_pending_comments } from '@/library/comment_actions';
import { requireWristband } from '@/library/wristband';

// Owner-only: lists every comment awaiting moderation for the dashboard inbox.
export async function GET(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  try {
    const comments = await pull_pending_comments();
    return Response.json({ comments });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
