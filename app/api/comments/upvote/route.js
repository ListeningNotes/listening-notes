// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
import { upvote_comment } from '@/library/comment_actions';
import { mayKnock, whoIsKnocking } from '@/library/doorman';

export async function POST(request) {
  try {
    const { id } = await request.json();
    if (!id) return Response.json({ error: 'id required' }, { status: 400 });

    // Nothing stood between a script and an unbounded count here — NOTES has
    // carried "upvote abuse prevention" as a to-do since the feature shipped.
    //
    // The caller key is the comment as well as the address, so with one try in
    // the window the rule reads as "you have already voted for this one"
    // rather than as a speed limit, which is what an upvote actually means. A
    // plain rate limit would still let a script put hundreds a day into a
    // single count.
    //
    // In memory, so it forgets after half a day and across restarts. That is
    // the right amount of memory for this: a nudge against a script, not an
    // accounting system, and a durable record of who voted for what is exactly
    // the kind of thing this site does not keep about its readers.
    const knock = mayKnock('upvote', `${id}:${whoIsKnocking(request)}`);
    if (!knock.allowed) {
      return Response.json({ error: 'Already counted.' }, { status: 429 });
    }

    const result = await upvote_comment(id);
    if (!result) return Response.json({ error: 'Not found' }, { status: 404 });

    return Response.json({ upvotes: result.upvotes });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
