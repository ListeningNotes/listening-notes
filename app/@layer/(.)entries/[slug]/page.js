// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/@layer/(.)entries/[slug]/page.js
// An entry, opened over the journal instead of instead of it.
//
// ── What the folder name means ────────────────────────────────────────────
// `@layer` is a parallel slot: it renders alongside whatever `children` is
// showing, and it does not appear in the URL. `(.)entries/[slug]` intercepts
// the real /entries/[slug] route. Together they mean: when somebody taps a
// cover in the journal, the browser goes to that entry's real address and this
// file draws it as a layer over the journal — the journal never unmounts, so
// its scroll position survives without anything having to remember it.
//
// The `(.)` counts route segments rather than folders, and `@layer` is not a
// segment, so this sits at the same level as `app/entries` despite being three
// directories deeper.
//
// ── The URL stays real ────────────────────────────────────────────────────
// This is the part that matters and the reason it is done this way rather than
// with a modal component. Open the same address from a QR code, a shared link,
// a feed item or an OG preview and there is no interception: the browser lands
// on app/entries/[slug]/page.js and gets the standalone page, server-rendered,
// with its own metadata. One address, two presentations, and the address is
// the real one in both.
//
// What this replaced was EntryModal, which fetched the entry over the API and
// then pushed the URL into the address bar with history.pushState. That URL
// looked right and was: it pointed at a page that existed. But the overlay was
// a second copy of the entry's layout, drifting from the real one, and a
// refresh threw the whole thing away. This draws the same FullPostPage the
// standalone route draws, so there is one entry layout on the site.
//
// ── The reads ─────────────────────────────────────────────────────────────
// Identical to the standalone page's, deliberately. An entry opened as a layer
// and the same entry opened cold have to be the same entry; two loaders would
// be two chances to disagree.

import { neon } from '@neondatabase/serverless';
import { pull_entry_by_slug } from '@/library/database_actions';
import { wristbandOnHand } from '@/library/wristband';
import LayerEntry from '@/components/main_components/LayerEntry';
import PostClient from '../../../entries/[slug]/FullPostPage';

const sql = neon(process.env.DATABASE_URL);

export default async function EntryOverTheJournal({ params }) {
  const { slug } = await params;
  const entry = await pull_entry_by_slug(slug);
  if (!entry) return null;

  const references = await sql`SELECT album, artist, slug FROM entries`;
  const authed = await wristbandOnHand();

  return (
    <LayerEntry>
      <PostClient entry={entry} references={references} authed={authed} />
    </LayerEntry>
  );
}
