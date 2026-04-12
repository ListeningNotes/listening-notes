// app/api/upvote/route.js
// Handles upvoting a comment. Called when a reader clicks the upvote button on a comment.
// Public — no auth needed, anyone can upvote.
// ⚠️ No abuse prevention yet — someone could upvote the same comment unlimited times.
//    To fix later: track upvotes by IP or cookie before going fully public.

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

// POST — increments the upvote count by 1 for a given comment id.
export async function POST(request) {
  try {
    // Read the comment id from the request body
    const { id } = await request.json();

    // id is required — we can't upvote without knowing which comment
    if (!id) return Response.json({ error: 'id required' }, { status: 400 });

    // Add 1 to the current upvote count and return the new total.
    // This happens in a single database operation so two simultaneous
    // upvotes can't accidentally overwrite each other.
    const result = await sql`
      UPDATE comments SET upvotes = upvotes + 1
      WHERE id = ${id}
      RETURNING id, upvotes
    `;

    // If no comment was found with that id, return 404
    if (!result.length) return Response.json({ error: 'Not found' }, { status: 404 });

    // Send back the new upvote count so the UI can update without a page refresh
    return Response.json({ upvotes: result[0].upvotes });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}