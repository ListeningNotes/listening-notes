// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/@layer/(.)entries/[slug]/page.js
// An entry, opened over the journal instead of instead of it. It expands
// from the cover that was tapped, and a swipe sideways goes to the record
// beside it on the wall — see LayerEntry for both.
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
// ── Why the layer is outside the Suspense boundary ────────────────────────
// This function is deliberately not async, and it does not await `params`.
//
// Awaiting anything up here would mean the whole file waits on the database
// before it returns anything at all — and until it returns, nothing has
// changed on screen. That is the pause after tapping a cover where you wonder
// whether the tap registered. The layer is the answer to the tap, so the layer
// has to be the thing that does not wait.
//
// So LayerEntry is rendered synchronously and starts arriving at once, and
// the entry itself streams into it behind a Suspense boundary. `params` is a
// promise resolved inline with .then() rather than awaited, which is what lets
// the suspending part sit inside the layer instead of above it.

import database from '@/library/database_connection';
import { Suspense } from 'react';
import { pull_entry_by_slug } from '@/library/database_actions';
import { wristbandOnHand } from '@/library/wristband';
import LayerEntry from '@/components/main_components/LayerEntry';
import LayerWaiting from '@/components/main_components/LayerWaiting';
import PostClient from '../../../entries/[slug]/FullPostPage';

// The shared handle, opened on first use — see library/database_connection.js.
// A neon() call at module load fails a build that has no DATABASE_URL.
const sql = database;

// The reads, which are identical to the standalone page's, deliberately. An
// entry opened as a layer and the same entry opened cold have to be the same
// entry; two loaders would be two chances to disagree.
async function Entry({ slug }) {
  const entry = await pull_entry_by_slug(slug);
  if (!entry) return null;

  const references = await sql`SELECT album, artist, slug FROM entries`;
  const authed = await wristbandOnHand();

  return <PostClient entry={entry} references={references} authed={authed} layered />;
}

export default function EntryOverTheJournal({ params }) {
  return (
    <LayerEntry arrives="source" browse>
      {/* The fallback is handed the slug so it can check that what the
          journal left behind is about this record and not the last one
          tapped — see LayerWaiting. */}
      <Suspense fallback={params.then(({ slug }) => <LayerWaiting slug={slug} />)}>
        {params.then(({ slug }) => <Entry slug={slug} />)}
      </Suspense>
    </LayerEntry>
  );
}
