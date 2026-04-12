// app/api/entries/route.js
// The main entries API. Handles two things:
// GET — the homepage calls this to load all entries for display.
// POST — the session tool calls this to save a finished entry to the database.
// ⚠️ Currently unprotected — anyone can POST to create entries. To fix before going public.

import { neon } from '@neondatabase/serverless';

// Creates a connection to your Neon database using the URL from your environment variables.
// This connection is shared across both GET and POST in this file.
const sql = neon(process.env.DATABASE_URL);

// GET — public, no auth needed.
// Returns every entry in the database, newest first.
// Called by the homepage to populate the album strip and entry list.
export async function GET() {
  try {
    const entries = await sql`
      SELECT * FROM entries 
      ORDER BY created_at DESC
    `;
    return Response.json({ entries });
  } catch (error) {
    // If the database query fails, send back the error with a 500 status ("server broke").
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// POST — saves a new entry to the database.
// Called by the session tool after you click "Save to Site".
export async function POST(request) {
  try {
    // Read the entry data sent from the session tool.
    const body = await request.json();

    // Pull each field out of the body by name.
    // These match exactly the column names in your Neon database table.
    const {
      album, artist, year, entry_type, relationship,
      rating, favorite, masterpiece, background, notes, tags,
      horizon, album_art, post_link
    } = body;

    // Auto-generate a URL slug from the album name.
    // e.g. "Pet Sounds" becomes "pet-sounds"
    // Step 1: lowercase everything
    // Step 2: remove anything that isn't a letter, number, space, or dash
    // Step 3: replace spaces with dashes
    // Step 4: collapse multiple dashes into one
    // Step 5: trim any leading/trailing whitespace
    const slug = album
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    // Insert the new entry into the database.
    // RETURNING * means send back the full saved row including the auto-generated id.
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

    // Send the saved entry back to the session tool so it can confirm success.
    return Response.json({ entry: result[0] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}