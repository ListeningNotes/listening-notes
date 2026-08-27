// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// What the keeper is listening to, asked once on behalf of everybody.
//
// The browser used to ask Last.fm directly, which had two problems and only
// one of them was obvious.
//
// The obvious one: the API key was written into the source, so every copy of
// this software in the world queried Last.fm as the same application and shared
// one rate limit. A busy copy could exhaust it for a stranger's copy.
//
// The other one: useListeningBeacon is called by five different components, and
// each call used to run its own fifteen-second timer. Four of them mount on the
// landing page at once, so a single visitor sitting on it produced sixteen
// requests a minute, and the nav's dropdown ran a separate poll on top of that.
// Multiply by everyone reading at the time.
//
// Both go away here. The key is read from the environment so each copy is its
// own application, and the answer is cached for ten seconds, so a hundred
// people reading at once cost one upstream request rather than sixteen hundred.

import { pull_settings } from '@/library/settings_actions';

const HISTORY = 25;        // enough tracks to find three distinct records in
const UPSTREAM_TTL = 10;   // seconds; the client polls every 15

// Last.fm answers "no cover" with a URL to a grey placeholder star rather than
// with nothing, so a missing cover arrives looking exactly like a present one.
// Every size of that star shares this hash.
const NO_ART = '2a96cbd8b46e442fc41c2b86b821562f';
const art = url => (url && !url.includes(NO_ART) ? url : '');

// The shape the beacon actually reads. Last.fm's own rows carry a dozen fields
// nothing here uses, at twenty-five rows a poll — trimming is most of the
// payload. `#text` and `@attr` stop at this boundary; nothing downstream should
// have to know what Last.fm's JSON looks like.
function tidy(row) {
  return {
    name: row.name,
    artist: row.artist?.['#text'] || '',
    album: row.album?.['#text'] || '',
    art: art(row.image?.[3]?.['#text']) || art(row.image?.[2]?.['#text']) || '',
    nowplaying: row['@attr']?.nowplaying === 'true',
  };
}

// An answer shaped like a real one, meaning "there is nothing to show". A copy
// with no Last.fm account, or one whose owner has not set a key, is not broken
// — it simply has no beacon, and the client draws nothing rather than an error.
const NOTHING = { tracks: [] };

export async function GET() {
  const { lastfm_user } = await pull_settings();
  const key = process.env.LASTFM_KEY;

  // Nothing to ask, or nothing to ask with. Returning early rather than
  // building a URL with an empty field in it, which Last.fm answers with an
  // error every fifteen seconds forever.
  if (!lastfm_user || !key) return Response.json(NOTHING);

  const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks`
    + `&user=${encodeURIComponent(lastfm_user)}`
    + `&api_key=${encodeURIComponent(key)}`
    + `&limit=${HISTORY}&format=json`;

  try {
    // fetch is uncached by default in this version of Next, so the cache is
    // asked for explicitly. The key is the URL, which is stable for a given
    // copy, so every reader inside the same ten seconds gets the same answer
    // without a second request leaving the building.
    const res = await fetch(url, { next: { revalidate: UPSTREAM_TTL } });
    if (!res.ok) return Response.json(NOTHING);
    const data = await res.json();
    const rows = data?.recenttracks?.track;
    // A user with exactly one scrobble comes back as an object rather than an
    // array. Left alone, .map would throw and the beacon would go dark for
    // whoever is newest to Last.fm.
    const list = Array.isArray(rows) ? rows : rows ? [rows] : [];
    return Response.json({ tracks: list.map(tidy) });
  } catch {
    // Last.fm being unreachable is not this journal being broken.
    return Response.json(NOTHING);
  }
}
