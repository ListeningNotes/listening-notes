// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// What the keeper is listening to, asked once on behalf of everybody.
//
// ── Three states, three sources, in this order ────────────────────────────
//
//   Now logging    a listen is open and a track is chosen   the session
//   Now listening  a scrobbler is connected and playing     Last.fm
//   Last logged    neither                                  the last entry
//
// The labels do double duty: they say what is happening and what kind of
// beacon somebody runs, without anything having to explain itself.
//
// **The session is the default, not the fallback, 2026-09-15.** Last.fm
// broadcasts what your speakers do; this shows what is going into the
// journal, which is what the journal is for. It also means every copy has a
// working beacon from its first listen, where before a copy without Last.fm
// had no beacon at all — and two of two testers failed to connect one.
//
// **When both are true the session wins.** Sitting down with a record and
// writing about it is a deliberate act; a scrobble might be autoplay in
// another room.
//
// ── What the browser used to do, and why it stopped ───────────────────────
// It asked Last.fm directly, which had two problems. The API key was written
// into the source, so every copy of this software queried Last.fm as the same
// application and shared one rate limit. And useListeningBeacon is called by
// several components at once, each running its own fifteen-second timer —
// sixteen requests a minute from one person sitting still. Both go away here:
// the key is the copy's own, the answer is cached for ten seconds, and the
// hook runs one timer for however many callers.

import { pull_beacon_settings } from '@/library/settings_actions';
import { pull_needle, pull_recent_listens, sameRecord } from '@/library/needle';

const HISTORY = 5;         // enough to find what is playing and what just did
const UPSTREAM_TTL = 10;   // seconds; the client polls every 15
const BEFORE_THAT = 3;     // covers drawn under the beacon

// Last.fm answers "no cover" with a URL to a grey placeholder star rather than
// with nothing, so a missing cover arrives looking exactly like a present one.
// Every size of that star shares this hash.
const NO_ART = '2a96cbd8b46e442fc41c2b86b821562f';
const art = url => (url && !url.includes(NO_ART) ? url : '');

// ── Is a scrobbler playing ────────────────────────────────────────────────
// Null for every way of not knowing: no account, no key, Last.fm unreachable,
// nothing on. The caller treats all of them the same, which is the point —
// a copy with no Last.fm is not a broken copy, it is a copy with one source
// instead of two.
async function nowPlaying() {
  const { lastfm_user, lastfm_key: key } = await pull_beacon_settings();
  // Nothing to ask, or nothing to ask with. Returning early rather than
  // building a URL with an empty field in it, which Last.fm answers with an
  // error every fifteen seconds forever.
  if (!lastfm_user || !key) return null;

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
    if (!res.ok) return null;
    const data = await res.json();
    const rows = data?.recenttracks?.track;
    // A user with exactly one scrobble comes back as an object rather than an
    // array. Left alone, [0] on an object would read undefined and the beacon
    // would go dark for whoever is newest to Last.fm.
    const first = Array.isArray(rows) ? rows[0] : rows;
    // Only what is ON. The history behind it used to be read here to draw the
    // covers under the beacon; those are real listens out of this journal now
    // (library/needle.js), so five rows are asked for where twenty-five were
    // and only the first is used.
    if (first?.['@attr']?.nowplaying !== 'true') return null;
    return {
      track: first.name || '',
      album: first.album?.['#text'] || '',
      artist: first.artist?.['#text'] || '',
      art: art(first.image?.[3]?.['#text']) || art(first.image?.[2]?.['#text']) || '',
    };
  } catch {
    // Last.fm being unreachable is not this journal being broken.
    return null;
  }
}

// A journal with nothing to say. A copy on its first day, before a record has
// been picked up: the client draws one quiet line rather than an error.
const NOTHING = { state: 'none', album: '', artist: '', art: '', track: '', before: [] };

export async function GET() {
  try {
    // Both at once. The recent listens are wanted whichever state wins — they
    // are the covers under the beacon — and in the third state the first of
    // them IS the beacon, so one read answers both questions.
    const [needle, recent] = await Promise.all([pull_needle(), pull_recent_listens()]);

    // 1. A listen is open. A record with no track chosen yet — the album
    //    screen, nothing picked — is not a beacon; it falls through to the
    //    sources below until there is a track to name.
    let on = needle?.track
      ? { state: 'logging', album: needle.album, artist: needle.artist, art: needle.art, track: needle.track }
      : null;

    // 2. Something is playing.
    if (!on) {
      const playing = await nowPlaying();
      if (playing) on = { state: 'listening', ...playing };
    }

    // "Before that" — never the record on the beacon, which is already the
    // largest thing on the page and does not need repeating underneath itself
    // at a third of the size.
    if (on) {
      const here = sameRecord(on.album);
      const before = recent
        .filter(row => !here || sameRecord(row.album) !== here)
        .slice(0, BEFORE_THAT);
      return Response.json({ ...on, before });
    }

    // 3. The last record listened to. No track — the beacon is a whole record
    //    here, so it prints the album where the other two print a song.
    //
    //    **Finished or not, 2026-09-15, Miyel's call.** "Last logged" means
    //    the last record sat down with, not the last one published: anybody
    //    who wants the posts has the archive, and a listen written up over
    //    three evenings is still the thing that was on. So an unfinished
    //    listen can hold the beacon, exactly as it can hold a place in the row
    //    beneath it — which is also what keeps the two in one order, since a
    //    draft is often newer than the last thing posted.
    const last = recent[0];
    if (!last) return Response.json(NOTHING);

    return Response.json({
      state: 'logged', album: last.album, artist: last.artist, art: last.art, track: '',
      before: recent.slice(1, 1 + BEFORE_THAT),
    });
  } catch {
    return Response.json(NOTHING);
  }
}
