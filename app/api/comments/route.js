import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  if (!slug) return Response.json({ error: 'slug required' }, { status: 400 });

  const rows = await sql`
    SELECT id, entry_slug, track_index, parent_id,
           author_name, content, upvotes, pending, created_at
    FROM comments
    WHERE entry_slug = ${slug}
      AND pending = false
    ORDER BY created_at ASC
  `;

  // Build nested tree
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

  // Group by track_index
  const byTrack = {};
  roots.forEach(c => {
    const k = String(c.track_index);
    if (!byTrack[k]) byTrack[k] = [];
    byTrack[k].push(c);
  });

  return Response.json({ comments: byTrack });
}

export async function POST(request) {
  try {
    const { slug, track_index, parent_id, author_name, author_email, content } = await request.json();

    if (!slug || !author_name?.trim() || !author_email?.trim() || !content?.trim()) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(author_email)) {
      return Response.json({ error: 'Invalid email' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO comments (entry_slug, track_index, parent_id, author_name, author_email, content, pending)
      VALUES (
        ${slug},
        ${track_index ?? -1},
        ${parent_id ?? null},
        ${author_name.trim()},
        ${author_email.trim().toLowerCase()},
        ${content.trim()},
        false
      )
      RETURNING id, track_index, parent_id, author_name, content, upvotes, pending, created_at
    `;

    return Response.json({ comment: result[0] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
