// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
import database from '@/library/database_connection';
import { pull_entry_by_slug } from '@/library/database_actions';
import { pull_settings, titleName } from '@/library/settings_actions';
import { wristbandOnHand } from '@/library/wristband';
import PostClient from './FullPostPage';

// This page kept its own connection and its own SELECT for a while, which meant
// it quietly stopped seeing anything the data layer learned to do — the album
// art sizing and the listen numbers both stopped at the library door. The read
// goes through pull_entry_by_slug now; the raw connection stays only for the
// two small queries below that have no business in the data layer.
// The shared handle, opened on first use — see library/database_connection.js.
// A neon() call at module load fails a build that has no DATABASE_URL.
const sql = database;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const [result, settings] = await Promise.all([
    sql`SELECT album, artist, year, rating, entry_type FROM entries WHERE slug = ${slug} LIMIT 1`,
    pull_settings(),
  ]);

  if (!result.length) return { title: 'Not Found' };

  // The name after the pipe is the journal's, and the journal's name is its
  // keeper's. It used to be this journal's, printed on the tab of every album
  // page on every copy — the single most-shared URL in the whole site, since
  // an entry link is what gets pasted into a message.
  const e = result[0];
  const title = `${e.album} — ${e.artist} | ${titleName(settings)}`;
  // What a preview says under the picture it draws (see opengraph-image.js
  // beside this file): the artist and year, and the score if there is one.
  const description = [e.artist, e.year].filter(Boolean).join(' · ') + (e.rating ? ` — ${e.rating}` : '');
  return {
    title,
    description,
    openGraph: { title: `${e.album} — ${e.artist}`, description, type: 'article', siteName: titleName(settings) },
    twitter: { card: 'summary_large_image', title: `${e.album} — ${e.artist}`, description },
  };
}
export default async function PostPage({ params }) {
  const { slug } = await params;
  const entry = await pull_entry_by_slug(slug);

  // Decided here rather than in the browser. The page used to render for
  // everybody and then ask /api/auth/check whether to show the owner's
  // controls, which meant the controls were in every visitor's HTML and simply
  // hidden — and it meant the owner watched them appear a beat late on their
  // own page. Both stop by asking before anything is rendered.
  const authed = await wristbandOnHand();

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
  return <PostClient entry={entry} references={references} authed={authed} />;
}