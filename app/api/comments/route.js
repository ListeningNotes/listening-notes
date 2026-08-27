// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
import { nest_comments, save_comment } from '@/library/comment_actions';
import { issue_receipt } from '@/library/wristband';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  if (!slug) return Response.json({ error: 'slug required' }, { status: 400 });

  const comments = await nest_comments(slug);
  return Response.json({ comments });
}

export async function POST(request) {
  try {
    const { slug, track_index, parent_id, author_name, author_email, content } = await request.json();

    if (!slug || !author_name?.trim() || !content?.trim()) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Email is optional — the comment form stopped asking for one. Anything
    // that does still send one has to send a valid one.
    if (author_email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(author_email)) {
      return Response.json({ error: 'Invalid email' }, { status: 400 });
    }

    const comment = await save_comment({ slug, track_index, parent_id, author_name, author_email, content });

    // The receipt goes back with the comment so the writer's browser can keep
    // it and ask to see this one held comment later. Wrapped because a missing
    // SESSION_SECRET would otherwise turn posting a comment into a 500 — the
    // comment is already saved by this point, and losing the receipt just puts
    // that browser back to not seeing its own comment until it's read.
    let receipt = null;
    try {
      receipt = await issue_receipt(comment.id);
    } catch {}

    return Response.json({ comment, receipt });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
