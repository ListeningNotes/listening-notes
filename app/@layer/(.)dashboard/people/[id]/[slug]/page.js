// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/@layer/(.)dashboard/people/[id]/[slug]/page.js
// A friend's entry, opened over the journal the way your own entries are —
// from a record on Friends, on their page, or in Headlines (2026-10-28).
// The page reads their entry; this is only the layer it arrives on.
import { Suspense } from 'react';
import LayerEntry from '@/components/main_components/LayerEntry';
import LayerWaiting from '@/components/main_components/LayerWaiting';
import FriendEntryPage from '../../../../../dashboard/people/[id]/[slug]/page';

export default function FriendEntryOverTheJournal({ params }) {
  return (
    <LayerEntry over="journal">
      <Suspense fallback={params.then(({ slug }) => <LayerWaiting slug={slug} authed={false} />)}>
        <FriendEntryPage params={params} layered />
      </Suspense>
    </LayerEntry>
  );
}
