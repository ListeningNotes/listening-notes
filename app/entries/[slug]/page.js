import { neon } from '@neondatabase/serverless';
import { pull_entry_by_slug } from '@/library/database_actions';
import PostClient from './FullPostPage';

// This page kept its own connection and its own SELECT for a while, which meant
// it quietly stopped seeing anything the data layer learned to do — the album
// art sizing and the listen numbers both stopped at the library door. The read
// goes through pull_entry_by_slug now; the raw connection stays only for the
// two small queries below that have no business in the data layer.
const sql = neon(process.env.DATABASE_URL);

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const result = await sql`SELECT album, artist FROM entries WHERE slug = ${slug} LIMIT 1`;

  if (!result.length) return { title: 'Not Found' };

  const e = result[0];
  return { title: `${e.album} — ${e.artist} | Listening Notes` };
}
export default async function PostPage({ params }) {
  const { slug } = await params;
  const entry = await pull_entry_by_slug(slug);

  // Everything the archive knows how to be linked to. Three columns of 39
  // rows — cheaper to fetch than to cache, and fetching it per request is
  // what makes the linking retroactive: log an album tomorrow and every
  // review that already mentioned it links to it on the next load.
  const references = await sql`SELECT album, artist, slug FROM entries`;

  if (!entry) {
    return (
      <div style={{ color: '#e8e4dc', background: '#0e0e0e', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Nunito', sans-serif", fontSize: '13px', letterSpacing: '0.1em' }}>
        entry not found
      </div>
    );
  }
  // pull_entry_by_slug has already taken the chain off — a server component's
  // props are serialised into the HTML, so it has to come off before this point
  // rather than being left to whatever does the rendering.
  return <PostClient entry={entry} references={references} />;
}