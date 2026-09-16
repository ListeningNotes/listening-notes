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
// Drafts were counted here too for a day, for a row on the desk that has gone:
// the picker lists them the moment you start a listen, which is the only place
// anybody looks for them. The count went with the row rather than being left
// running — it was a COUNT over the drafts table on every poll of this route,
// answering nothing.
//
// Gated: the counts say something about the journal that isn't public — how
// much is pending and unanswered — so a stranger gets 401, not a zero.

import { requireWristband } from '@/library/wristband';
import { count_pending_comments } from '@/library/comment_actions';
import { count_pending_submissions } from '@/library/submission_actions';
import { count_pending_reports } from '@/library/report_actions';

export async function GET(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  try {
    const [comments, submissions, reports] = await Promise.all([
      count_pending_comments(),
      count_pending_submissions(),
      count_pending_reports(),
    ]);
    return Response.json({ comments, submissions, reports, total: comments + submissions + reports });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
