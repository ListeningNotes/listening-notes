// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// How much is waiting for you — the number on the cover's Messages line.
//
// Two things arrive without you asking: someone recommends an album through
// the submit form, and someone comments on an entry. Both sit unread until
// you look. A back room you have to remember to visit is worse than a number
// you see the moment you open your own journal, which is the whole reason
// this endpoint exists rather than the cover linking to an inbox blindly.
//
// Drafts are the odd one out and are counted here anyway, 2026-09-15: nobody
// sent them, you left them. They are on the desk for the same reason the other
// two are — an unfinished listen you have forgotten about is the thing most
// likely to be lost — and counting them here rather than from the desk keeps
// the desk to one request. `total` is deliberately not their business: that
// number is the Inbox's, and the drafts row prints its own.
//
// Gated: the counts say something about the journal that isn't public — how
// much is pending and unanswered — so a stranger gets 401, not a zero.

import { requireWristband } from '@/library/wristband';
import { count_pending_comments } from '@/library/comment_actions';
import { count_pending_submissions } from '@/library/submission_actions';
import { count_pending_reports } from '@/library/report_actions';
import { count_drafts } from '@/library/database_actions';

export async function GET(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  try {
    const [comments, submissions, reports, drafts] = await Promise.all([
      count_pending_comments(),
      count_pending_submissions(),
      count_pending_reports(),
      count_drafts(),
    ]);
    return Response.json({ comments, submissions, reports, drafts, total: comments + submissions + reports });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
