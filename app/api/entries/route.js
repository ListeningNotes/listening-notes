// app/api/entries/route.js
import { neon } from '@neondatabase/serverless';
import { isAuthorized } from '../../../lib/auth';

const sql = neon(process.env.DATABASE_URL);

// GET — public, no auth needed (homepage reads from this)
export async function GET() {
  try {
    const entries = await sql`
      SELECT * FROM entries 
      ORDER BY created_at DESC
    `;
    return Response.json({ entries });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// POST — protected, only the session tool can create entries
export async function POST(request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      album, artist, year, entry_type, relationship,
      rating, favorite, background, notes, tags,
      horizon, album_art, post_link
    } = body;

    const slug = album
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    const result = await sql`
      INSERT INTO entries (
        album, artist, year, entry_type, relationship,
        rating, favorite, background, notes, tags,
        horizon, album_art, post_link, slug
      ) VALUES (
        ${album}, ${artist}, ${year}, ${entry_type}, ${relationship},
        ${rating}, ${favorite}, ${background}, ${notes}, ${tags},
        ${horizon}, ${album_art}, ${post_link}, ${slug}
      )
      RETURNING *
    `;

    return Response.json({ entry: result[0] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}