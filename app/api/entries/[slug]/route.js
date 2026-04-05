import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    const result = await sql`
      SELECT * FROM entries WHERE slug = ${slug} LIMIT 1
    `;
    if (!result.length) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }
    return Response.json({ entry: result[0] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { password, slug: _ignore, ...fields } = body;
    if (fields.tags && typeof fields.tags === 'string') {
      fields.tags = fields.tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    if (password !== 'listeningnotes') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await sql`
      UPDATE entries SET
        album = COALESCE(${fields.album ?? null}, album),
        artist = COALESCE(${fields.artist ?? null}, artist),
        year = COALESCE(${fields.year ?? null}, year),
        entry_type = COALESCE(${fields.entry_type ?? null}, entry_type),
        relationship = COALESCE(${fields.relationship ?? null}, relationship),
        rating = COALESCE(${fields.rating ?? null}, rating),
        favorite = COALESCE(${fields.favorite ?? null}, favorite),
        masterpiece = COALESCE(${fields.masterpiece ?? null}, masterpiece),
        background = COALESCE(${fields.background ?? null}, background),
        notes = COALESCE(${fields.notes ?? null}, notes),
        tags = COALESCE(${fields.tags ?? null}, tags),
        horizon = COALESCE(${fields.horizon ?? null}, horizon),
        album_art = COALESCE(${fields.album_art ?? null}, album_art),
        post_link = COALESCE(${fields.post_link ?? null}, post_link)
      WHERE slug = ${slug}
      RETURNING *
    `;

    if (!result.length) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    return Response.json({ entry: result[0] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { slug } = await params;
    const body = await request.json();

    if (body.password !== 'listeningnotes') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await sql`DELETE FROM entries WHERE slug = ${slug}`;
    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
