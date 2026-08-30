// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
import { save_submission, pull_submissions } from '@/library/submission_actions';
import { requireWristband } from '@/library/wristband';
import { tidyAddress } from '@/library/return_address';

// The email check that used to live here is gone with the field. Anything a
// caller still sends under that key is dropped on the floor rather than
// validated — save_submission does not take it.
//
// A name is required by the send flow and checked here as well, because a
// route is not a form: it has to state its own rules rather than trust that
// the only thing posting to it is the page that shipped with it.
export async function POST(request) {
  try {
    const {
      album, artist, year, note, submitter_name,
      album_art, collection_id, sender_url,
    } = await request.json();

    if (!album?.trim() || !artist?.trim() || !note?.trim()) {
      return Response.json({ error: 'Album, artist, and note are required.' }, { status: 400 });
    }

    if (!submitter_name?.trim()) {
      return Response.json({ error: 'A name is required.' }, { status: 400 });
    }

    // Tidied here as well as in the browser, and this is the copy that
    // matters. The send page normalises what is typed, but a route cannot
    // assume the only thing posting to it is the page that shipped with it —
    // and the inbox turns this value into a link somebody clicks. tidyAddress
    // keeps only a bare host, so what is stored can never carry a scheme of
    // its own and the inbox's https:// prefix cannot be escaped. Anything that
    // does not look like a host at all is dropped rather than refused: it is
    // an optional field, and rejecting a whole send over it would lose the
    // message, which is the part that mattered.
    const submission = await save_submission({
      album, artist, year, note, submitter_name,
      album_art, collection_id,
      sender_url: tidyAddress(sender_url),
    });
    return Response.json({ submission });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  try {
    const submissions = await pull_submissions();
    return Response.json({ submissions });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
