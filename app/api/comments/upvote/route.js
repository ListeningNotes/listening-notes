import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export async function POST(request) {
  try {
    const { id } = await request.json();
    if (!id) return Response.json({ error: 'id required' }, { status: 400 });

    const result = await sql`
      UPDATE comments SET upvotes = upvotes + 1
      WHERE id = ${id}
      RETURNING id, upvotes
    `;

    if (!result.length) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json({ upvotes: result[0].upvotes });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
