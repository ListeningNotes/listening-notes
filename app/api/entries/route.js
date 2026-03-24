import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

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

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      album, artist, year, entry_type, relationship,
      rating, favorite, background, notes, tags,
      horizon, album_art, post_link
    } = body;

    const result = await sql`
      INSERT INTO entries (
        album, artist, year, entry_type, relationship,
        rating, favorite, background, notes, tags,
        horizon, album_art, post_link
      ) VALUES (
        ${album}, ${artist}, ${year}, ${entry_type}, ${relationship},
        ${rating}, ${favorite}, ${notes}, ${notes}, ${tags},
        ${horizon}, ${album_art}, ${post_link}
      )
      RETURNING *
    `;

    return Response.json({ entry: result[0] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}