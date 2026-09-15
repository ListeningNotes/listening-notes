// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// One send: settling it, saying it was already logged, and naming who it
// came from. Owner-only, all three.
import {
  update_submission_status, log_submission, name_submission_sender,
  pull_submissions,
} from '@/library/submission_actions';
import { update_entry } from '@/library/database_actions';
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
    // Two writes in one press, and the second is the point: the send is
    // marked logged and pointed at the record, and that record is credited
    // to the sender. Without the credit this would only tidy the inbox,
    // and the connection would still exist nowhere.
    //
    // The entry is credited only where it is not already: received_from is
    // a correction the keeper may have made by hand, and a button pressed
    // on a different screen should not quietly overwrite what they wrote.
    if (Object.prototype.hasOwnProperty.call(body, 'entry_id')) {
      const [sent] = await database`
        SELECT submitter_name, sender_url, quiet FROM submissions WHERE id = ${id} LIMIT 1`;
      if (!sent) return Response.json({ error: 'No such send.' }, { status: 404 });

      const [record] = await database`
        SELECT slug, received_from FROM entries WHERE id = ${body.entry_id} LIMIT 1`;
      if (!record) return Response.json({ error: 'No such entry.' }, { status: 404 });

      const submission = await log_submission(id, body.entry_id);

      // Submission is the shelf a sent record belongs on, and the credit is
      // the two fields the entry publishes (library/database_actions.js,
      // withoutChain) — so both are set here or the entry would carry a
      // sender nothing draws.
      if (!String(record.received_from || '').trim()) {
        await update_entry(record.slug, {
          entry_type: 'Submission',
          received_from: sent.submitter_name || null,
          received_from_url: sent.sender_url || null,
          // Whatever the sender asked for on the form travels with the
          // credit; a send logged by hand must not publish a name its
          // sender asked to keep off.
          credit_private: sent.quiet === true,
        });
      }
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
