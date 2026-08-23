import { neon } from '@neondatabase/serverless';
import PostClient from './FullPostPage';

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
  const result = await sql`SELECT * FROM entries WHERE slug = ${slug} LIMIT 1`;

  // Everything the archive knows how to be linked to. Three columns of 39
  // rows — cheaper to fetch than to cache, and fetching it per request is
  // what makes the linking retroactive: log an album tomorrow and every
  // review that already mentioned it links to it on the next load.
  const references = await sql`SELECT album, artist, slug FROM entries`;

  if (!result.length) {
    return (
      <div style={{ color: '#e8e4dc', background: '#0e0e0e', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Nunito', sans-serif", fontSize: '13px', letterSpacing: '0.1em' }}>
        entry not found
      </div>
    );
  }
  return <PostClient entry={result[0]} references={references} />;
}