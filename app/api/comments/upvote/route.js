// SPDX-License-Identifier: AGPL-3.0-or-later
import { upvote_comment } from '@/library/comment_actions';

export async function POST(request) {
  try {
    const { id } = await request.json();
    if (!id) return Response.json({ error: 'id required' }, { status: 400 });

    const result = await upvote_comment(id);
    if (!result) return Response.json({ error: 'Not found' }, { status: 404 });

    return Response.json({ upvotes: result.upvotes });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
