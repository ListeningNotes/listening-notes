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

  if (!result.length) {
    return (
      <div style={{ color: '#e8e4dc', background: '#0e0e0e', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Mono, monospace', fontSize: '13px', letterSpacing: '0.1em' }}>
        entry not found
      </div>
    );
  }
  return <PostClient entry={result[0]} />;
}