// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// How much is waiting for you — the number on the desk's Inbox door.
//
// A record somebody sent sits until you decide what to do with it, and that
// is what is counted: a back room you have to remember to visit is worse
// than a number you see the moment you open your own journal. A message is
// not counted. It shows a dot in the inbox until it is opened, like anything
// else that is new, and no number anywhere (the messages brief, 2026-09-28).
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
import { count_pending_submissions } from '@/library/submission_actions';
import { count_pending_reports } from '@/library/report_actions';

export async function GET(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  try {
    const [submissions, reports] = await Promise.all([
      count_pending_submissions(),
      count_pending_reports(),
    ]);
    return Response.json({ submissions, reports, total: submissions + reports });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
