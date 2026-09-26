// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
import database from '@/library/database_connection';
import { pull_entry_by_slug, pull_album } from '@/library/database_actions';
import { pull_settings, titleName } from '@/library/settings_actions';
import { wristbandOnHand } from '@/library/wristband';
import PostClient from './FullPostPage';
import TrackNotePage from './TrackNotePage';

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
    sql`SELECT album, artist, year, rating, entry_type, song FROM entries WHERE slug = ${slug} LIMIT 1`,
    pull_settings(),
  ]);

  if (!result.length) return { title: 'Not Found' };

  // The name after the pipe is the journal's, and the journal's name is its
  // keeper's. It used to be this journal's, printed on the tab of every album
  // page on every copy — the single most-shared URL in the whole site, since
  // an entry link is what gets pasted into a message.
  const e = result[0];
  // A track note is named for its song, with the record after it: the song
  // is what the entry is about (2026-09-24).
  const named = e.song ? `${e.song} — ${e.artist}` : `${e.album} — ${e.artist}`;
  const title = `${named} | ${titleName(settings)}`;
  // What a preview says under the picture it draws (see opengraph-image.js
  // beside this file): the artist and year, and the score if there is one.
  const description = (e.song ? [e.album, e.artist, e.year] : [e.artist, e.year]).filter(Boolean).join(' · ') + (e.rating ? ` — ${e.rating}` : '');
  return {
    title,
    description,
    openGraph: { title: named, description, type: 'article', siteName: titleName(settings) },
    twitter: { card: 'summary_large_image', title: named, description },
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
  // review that already mentioned it links to it on the next load. Album
  // listens only: a track note carries its record's name, and a review that
  // names the record means the record, not one song off it.
  const references = await sql`SELECT album, artist, slug FROM entries WHERE song IS NULL`;

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
  // The folder this entry is a page of, when its record has more than one
  // entry: the record's entries, oldest first, for the tabs and the swipe
  // (2026-09-25). A record whose key folds away to nothing is never one.
  const record = entry.album_key ? await pull_album(entry.album_key) : [];
  const folder = record.length > 1 ? [...record].reverse() : null;

  // A track note is its own card, not a shorter album entry (the track-notes
  // brief). Same address, same read, same owner check.
  if (entry.song) return <TrackNotePage entry={entry} authed={authed} folder={folder} />;
  return <PostClient entry={entry} references={references} authed={authed} folder={folder} />;
}