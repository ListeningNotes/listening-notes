// app/entries/[slug]/page.js
// The public-facing page for a single entry — e.g. /entries/pet-sounds
// This is a SERVER component, meaning it runs on the server and fetches data
// before sending anything to the browser. Faster and better for SEO.
// It hands the entry data off to PostClient which handles the interactive UI.

import { neon } from '@neondatabase/serverless';
import FullPostPage from './FullPostPage';

const sql = neon(process.env.DATABASE_URL);

// generateMetadata runs on the server to set the page title shown in the browser tab
// and used by search engines. e.g. "Pet Sounds — The Beach Boys | Listening Notes"
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const result = await sql`SELECT album, artist FROM entries WHERE slug = ${slug} LIMIT 1`;

  // If no entry found, show a generic title
  if (!result.length) return { title: 'Not Found' };

  const e = result[0];
  return { title: `${e.album} — ${e.artist} | Listening Notes` };
}

// The main page component. Fetches the full entry from the database by slug.
// This runs on the server — the database call never touches the browser.
export default async function PostPage({ params }) {
  const { slug } = await params;
  const result = await sql`SELECT * FROM entries WHERE slug = ${slug} LIMIT 1`;

  // If no entry found, show a simple not found message
  if (!result.length) {
    return (
      <div style={{ color: '#e8e4dc', background: '#0e0e0e', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Mono, monospace', fontSize: '13px', letterSpacing: '0.1em' }}>
        entry not found
      </div>
    );
  }

  // Pass the entry data to PostClient which renders the actual page UI.
  // PostClient is a client component — it handles interactivity like the modal,
  // star ratings, and the horizon bar visualization.
  return <FullPostPage entry={result[0]} />;
}