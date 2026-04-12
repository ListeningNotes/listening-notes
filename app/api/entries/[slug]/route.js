// app/api/entries/[slug]/route.js
// Handles operations on a SINGLE entry, identified by its slug in the URL.
// e.g. /api/entries/pet-sounds
// Three operations: read, edit, delete.
// The [slug] in the folder name is a dynamic segment — Next.js captures whatever
// is in that part of the URL and passes it to the function as a parameter.

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

// GET — public, no auth needed.
// Loads a single entry by slug. Called by the entry page when someone visits /entries/pet-sounds.
export async function GET(request, { params }) {
  try {
    // Extract the slug from the URL — e.g. "pet-sounds"
    const { slug } = await params;

    // Find the one entry in the database that matches this slug.
    // LIMIT 1 means stop after finding the first match (slugs should be unique).
    const result = await sql`
      SELECT * FROM entries WHERE slug = ${slug} LIMIT 1
    `;

    // If nothing was found, return a 404 ("not found") response.
    if (!result.length) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    return Response.json({ entry: result[0] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// PATCH — protected by password. Updates an existing entry.
// Called by the edit mode on the public entry page when you click Save.
// "PATCH" means partial update — only the fields you changed get updated.
export async function PATCH(request, { params }) {
  try {
    const { slug } = await params;
    const body = await request.json();

    // Pull the password out of the body separately from the actual fields.
    // slug is also pulled out and ignored (_ignore) since we already have it from the URL.
    // ...fields collects everything else that's left — the actual data to update.
    const { password, slug: _ignore, ...fields } = body;

    // If tags came in as a comma-separated string, convert to an array.
    // e.g. "jazz, soul, 70s" becomes ["jazz", "soul", "70s"]
    if (fields.tags && typeof fields.tags === 'string') {
      fields.tags = fields.tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    // Password check — stops anyone without the password from editing entries.
    // ⚠️ This password is hardcoded. Fine for now, should move to environment variable later.
    if (password !== 'listeningnotes') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update only the fields that were sent.
    // COALESCE means "use the new value if it exists, otherwise keep the old one".
    // This prevents accidentally wiping fields that weren't included in the update.
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

// DELETE — protected by password. Permanently removes an entry from the database.
// Called by the two-click delete button on the entry page.
// ⚠️ This is irreversible — there is no trash or undo.
export async function DELETE(request, { params }) {
  try {
    const { slug } = await params;
    const body = await request.json();

    // Password check — same pattern as PATCH above.
    if (body.password !== 'listeningnotes') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await sql`DELETE FROM entries WHERE slug = ${slug}`;

    // Confirm the deletion was successful.
    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}