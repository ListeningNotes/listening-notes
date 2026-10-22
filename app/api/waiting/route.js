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
//
// And where the journal asks for a copy of itself, 2026-10-20, when it has
// something to lose (library/letterhead.js, ask_for_copy): this route is
// asked whenever the keeper opens the journal or comes back to it, so the
// asking needs no timer of its own, and the letter's dot is decided in the
// same answer. Never the reason this route fails.

import { requireWristband } from '@/library/wristband';
import { ask_for_copy } from '@/library/letterhead';
import { count_pending_submissions, any_unseen_sends } from '@/library/submission_actions';
import { count_pending_reports } from '@/library/report_actions';
import { any_unseen_messages } from '@/library/message_actions';
import { any_unseen_waves } from '@/library/wave_actions';
import { any_unseen_came_back } from '@/library/came_back_actions';
import { any_moves } from '@/library/people_actions';

export async function GET(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  try {
    const [submissions, reports, asked, ...unseen] = await Promise.all([
      count_pending_submissions(),
      count_pending_reports(),
      ask_for_copy().catch(() => false),
      any_unseen_sends(),
      any_unseen_messages(),
      any_unseen_waves(),
      any_unseen_came_back(),
      // A friend who moved, waiting on Update (2026-10-21).
      any_moves().catch(() => false),
    ]);
    // `fresh`, 2026-10-20: whether anything in the inbox is new — the one dot
    // on its door (Miyel's pick: letters, messages, sends, waves). Never a
    // number, and never anybody's but the keeper's. A letter asked for just
    // now counts, though the read beside it may have missed the row.
    return Response.json({ submissions, reports, total: submissions + reports, fresh: asked || unseen.some(Boolean) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
