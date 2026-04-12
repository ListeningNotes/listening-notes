// app/api/comments/route.js
// Handles public comments on entry pages.
// GET — loads approved comments for a specific entry (public facing).
// POST — accepts new comment submissions from readers.
//        Comments go into a pending queue and won't appear until you approve them.
// ⚠️ Comment moderation inbox still needs to be built in /session.

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

// GET — public, no auth needed.
// Loads all approved comments for a given entry, organized as a nested tree
// (top-level comments with their replies nested underneath).
export async function GET(request) {
  // Read the slug from the URL query string — e.g. /api/comments?slug=pet-sounds
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  // Slug is required — we can't load comments without knowing which entry
  if (!slug) return Response.json({ error: 'slug required' }, { status: 400 });

  // Fetch only approved comments (pending = false) for this entry, oldest first.
  // pending = false means you've approved it and it's live on the site.
  const rows = await sql`
    SELECT id, entry_slug, track_index, parent_id,
           author_name, content, upvotes, pending, created_at
    FROM comments
    WHERE entry_slug = ${slug}
      AND pending = false
    ORDER BY created_at ASC
  `;

  // Build a nested tree so replies sit under their parent comments.
  // First pass: index every comment by its id.
  // Second pass: attach each comment to its parent, or add it to the root list.
  const map = {};
  const roots = [];
  rows.forEach(r => { map[r.id] = { ...r, replies: [] }; });
  rows.forEach(r => {
    if (r.parent_id && map[r.parent_id]) {
      map[r.parent_id].replies.push(map[r.id]);
    } else {
      roots.push(map[r.id]);
    }
  });

  // Group comments by track_index so track-specific comments display
  // next to the correct track on the entry page.
  // track_index of -1 means the comment is about the album overall.
  const byTrack = {};
  roots.forEach(c => {
    const k = String(c.track_index);
    if (!byTrack[k]) byTrack[k] = [];
    byTrack[k].push(c);
  });

  return Response.json({ comments: byTrack });
}

// POST — public, no auth needed (anyone can submit a comment).
// Comments are held as pending = true until you approve them in the moderation inbox.
// Nothing goes live automatically.
export async function POST(request) {
  try {
    const { slug, track_index, parent_id, author_name, author_email, content } = await request.json();

    // All required fields must be present and non-empty
    if (!slug || !author_name?.trim() || !author_email?.trim() || !content?.trim()) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Basic email format check — must follow something@something.something pattern
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(author_email)) {
      return Response.json({ error: 'Invalid email' }, { status: 400 });
    }

    // Insert the comment with pending = true.
    // It will NOT appear on the site until you approve it in your session tool.
    const result = await sql`
      INSERT INTO comments (entry_slug, track_index, parent_id, author_name, author_email, content, pending)
      VALUES (
        ${slug},
        ${track_index ?? -1},
        ${parent_id ?? null},
        ${author_name.trim()},
        ${author_email.trim().toLowerCase()},
        ${content.trim()},
        true
      )
      RETURNING id, track_index, parent_id, author_name, content, upvotes, pending, created_at
    `;

    // Return the new comment so the UI can show a "thanks, pending approval" message
    return Response.json({ comment: result[0] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}