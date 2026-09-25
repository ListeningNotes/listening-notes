// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/albums/[record]/page.js
// A record's own page at its own address — opened cold, from a link or a
// reload. From the wall it arrives as a layer instead (app/@layer/(.)albums),
// the way an entry does; one address, two presentations.
//
// The address is the record's album_key with hyphens for its spaces. The key
// is letters, digits and single spaces, so the hyphens turn back into it
// exactly, and it is the key the wall gathers a tile on (2026-09-24).
import { pull_album } from '@/library/database_actions';
import { pull_settings, titleName } from '@/library/settings_actions';
import { wristbandOnHand } from '@/library/wristband';
import AlbumPage from './AlbumPage';

export async function generateMetadata({ params }) {
  const { record } = await params;
  const [entries, settings] = await Promise.all([
    pull_album(decodeURIComponent(record).replace(/-/g, ' ')),
    pull_settings(),
  ]);
  const face = entries.find(e => !e.song) || entries[0];
  if (!face) return { title: 'Not Found' };
  return { title: `${face.album} — ${face.artist} | ${titleName(settings)}` };
}

export default async function Page({ params }) {
  const { record } = await params;
  const entries = await pull_album(decodeURIComponent(record).replace(/-/g, ' '));
  if (!entries.length) {
    return (
      <div style={{ color: '#e8e4dc', background: '#0e0e0e', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Nunito', sans-serif", fontSize: '13px', letterSpacing: '0.1em' }}>
        record not found
      </div>
    );
  }
  return <AlbumPage entries={entries} authed={await wristbandOnHand()} />;
}
