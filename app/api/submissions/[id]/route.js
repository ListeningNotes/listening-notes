// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// One send: settling it, saying it was already logged (which points it at
// the post and writes nothing on the post), and naming who it came from.
// Owner-only, all three.
import {
  update_submission_status, log_submission, name_submission_sender,
  pull_submissions,
} from '@/library/submission_actions';
import database from '@/library/database_connection';
import { requireWristband } from '@/library/wristband';
import { tidyJournal } from '@/library/return_address';

// 'logged' joins the three that were already here, 2026-09-15. It is not a
// fourth spelling of 'reviewed': that one is set when a listen is *started*
// from a row, which is a claim about an intention, and this one is set when
// an entry exists to point at.
const OUTCOMES = ['pending', 'reviewed', 'logged', 'dismissed'];

export async function PATCH(request, { params }) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  try {
    const { id } = await params;
    const body = await request.json();

    // ── Who sent it ───────────────────────────────────────────────────────
    // A send carries whatever the sender typed into the form, and almost
    // every one of them arrived before that person kept a journal — so the
    // gap between a name on a form and a person in the address book is the
    // normal case and not an edge one. This closes it by hand, from the
    // address book, on the row: the name becomes a link to where they live.
    if (Object.prototype.hasOwnProperty.call(body, 'sender_url')) {
      const sender_url = tidyJournal(body.sender_url);
      const submission = await name_submission_sender(id, {
        submitter_name: body.submitter_name,
        sender_url,
      });
      if (!submission) return Response.json({ error: 'No such send.' }, { status: 404 });
      return Response.json({ submission });
    }

    // ── Already logged ────────────────────────────────────────────────────
    // "I already have this record; read that." The send is marked logged and
    // pointed at the post, and that is all. The post was here before the
    // send came, so it is nobody's put-on: it gets no sender from this press
    // and does not become a Submission (Miyel, 2026-09-27; DECISIONS, The
    // network). Until then this press also credited the post to the sender,
    // which is the opposite claim; the argument for it is in the archive. A
    // record listened to *because* of a send is logged from the row, and
    // that listen carries the credit and the envelope.
    if (Object.prototype.hasOwnProperty.call(body, 'entry_id')) {
      const [record] = await database`
        SELECT id FROM entries WHERE id = ${body.entry_id} LIMIT 1`;
      if (!record) return Response.json({ error: 'No such entry.' }, { status: 404 });

      const submission = await log_submission(id, body.entry_id);
      if (!submission) return Response.json({ error: 'No such send.' }, { status: 404 });
      const submissions = await pull_submissions();
      return Response.json({ submission, submissions });
    }

    // ── Pending, started, logged, dismissed ───────────────────────────────
    const { status } = body;
    if (!OUTCOMES.includes(status)) {
      return Response.json({ error: 'Invalid status' }, { status: 400 });
    }
    const submission = await update_submission_status(id, status);
    return Response.json({ submission });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
