// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/@layer/(.)albums/[record]/page.js
// A record's own page, opened over the journal from its tile — the same
// arrangement as an entry's (app/@layer/(.)entries/[slug]): the layer answers
// the press at once and grows out of the tile that was pressed (data-grows on
// the tile, library/handoff.js), and the rows stream into it. Opened cold, the
// same address lands on app/albums/[record]/page.js instead.
import { Suspense } from 'react';
import { pull_album } from '@/library/database_actions';
import { wristbandOnHand } from '@/library/wristband';
import LayerEntry from '@/components/main_components/LayerEntry';
import AlbumPage from '../../../albums/[record]/AlbumPage';

export default function Page({ params }) {
  return (
    <LayerEntry over="journal" label="Record">
      <Suspense fallback={null}>
        {params.then(async ({ record }) => {
          const [entries, authed] = await Promise.all([
            pull_album(decodeURIComponent(record).replace(/-/g, ' ')),
            wristbandOnHand(),
          ]);
          return entries.length ? <AlbumPage entries={entries} authed={authed} /> : null;
        })}
      </Suspense>
    </LayerEntry>
  );
}
