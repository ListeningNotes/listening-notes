// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// What the keeper is listening to, asked once on behalf of everybody.
//
// ── Two beacons, and you get one ──────────────────────────────────────────
// A journal either broadcasts what is going into it or what its speakers are
// doing (Miyel, 2026-09-15). A cover that silently switched between the two
// would be two different claims wearing one face, so it is a choice made in
// Settings and `settings.beacon_source` holds it.
//
//   session   Now logging    the track being written about
//             Last logged    the last record sat down with
//
//   lastfm    Now listening  what is playing
//             Last played    what played last
//
// **The session is the default and Last.fm is the extra**, which reverses a
// week of the other arrangement. Last.fm broadcasts what your speakers do;
// this shows what is going into the journal, which is what the journal is
// for. It also means every copy has a working beacon from its first listen,
// where before a copy without Last.fm had no beacon at all — and two of two
// testers failed to connect one, one of them on Apple Music on an iPhone,
// which cannot scrobble reliably however hard anybody tries.
//
// A copy set to 'lastfm' with no key falls through to the session beacon
// rather than showing nothing: the setting is a preference, not a promise the
// journal can keep on its own.
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

// ── What Last.fm says ─────────────────────────────────────────────────────
// The first row of the history and whether it is on. Null for every way of not
// knowing: no account, no key, Last.fm unreachable, nothing ever scrobbled.
// The caller treats them the same — a Last.fm beacon that cannot ask is a
// journal that falls back to its own listens rather than a broken one.
async function fromLastfm({ lastfm_user, lastfm_key: key }) {
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
    if (!first?.name) return null;
    // The history behind it used to be read here to draw the covers under the
    // beacon; those are real listens out of this journal now
    // (library/needle.js), so five rows are asked for where twenty-five were
    // and only the first is used.
    return {
      state: first['@attr']?.nowplaying === 'true' ? 'listening' : 'played',
      track: first.name,
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

// "Before that" — never the record on the beacon, which is already the largest
// thing on the page and does not need repeating underneath itself at a third
// of the size. Used by the two states whose record does not come out of this
// list; the quiet session state simply takes the three under its own head,
// which is the same rule stated more cheaply.
const beforeThat = (recent, album) => {
  const here = sameRecord(album);
  return recent.filter(row => !here || sameRecord(row.album) !== here).slice(0, BEFORE_THAT);
};

export async function GET() {
  try {
    // All three at once. The covers under the beacon are wanted whichever
    // state wins, and in the session beacon's quiet state the first of them IS
    // the beacon, so one read answers both questions.
    const [settings, needle, recent] = await Promise.all([
      pull_beacon_settings(), pull_needle(), pull_recent_listens(),
    ]);

    // ── The Last.fm beacon ────────────────────────────────────────────────
    // Whole and separate: what is playing, or what played last. It never says
    // Now logging, which is the whole of "you get one, not both". A copy set
    // to this with nothing to ask falls through to the session beacon below.
    if (settings.beacon_source === 'lastfm') {
      const heard = await fromLastfm(settings);
      if (heard) return Response.json({ ...heard, before: beforeThat(recent, heard.album) });
    }

    // ── The session beacon ────────────────────────────────────────────────
    // A listen is open. A record with no track chosen yet — the album screen,
    // nothing picked — is not a beacon; it falls through to the quiet state
    // until there is a track to name.
    if (needle?.track) {
      return Response.json({
        state: 'logging',
        album: needle.album, artist: needle.artist, art: needle.art, track: needle.track,
        before: beforeThat(recent, needle.album),
      });
    }

    // Quiet: the last record sat down with. Finished or not, 2026-09-15,
    // Miyel's call — "Last logged" means the last record sat down with, not
    // the last one published, because anybody who wants the posts has the
    // archive. So a written-and-unposted listen can hold the beacon, and so
    // can one that was only sat through (library/needle.js), which is also
    // what keeps the beacon and the row beneath it in one order.
    //
    // The track comes with it when there is one, so shutting a record leaves
    // the song you were on up rather than falling back to the album title.
    const last = recent[0];
    if (!last) return Response.json(NOTHING);
    return Response.json({
      state: 'logged',
      album: last.album, artist: last.artist, art: last.art, track: last.track || '',
      before: recent.slice(1, 1 + BEFORE_THAT),
    });
  } catch {
    return Response.json(NOTHING);
  }
}
