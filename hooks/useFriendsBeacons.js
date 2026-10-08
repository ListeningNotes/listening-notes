// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// hooks/useFriendsBeacons.js
// What everyone in the address book is listening to.
//
// Returns:
// - friends: one row per person in the book, as /api/friends/beacons answers
//   — id, name, address, state ('logging' | 'logged' | 'nothing' |
//   'unknown'), album, artist, art, track, and `at`: when, from a journal new
//   enough to say (an older copy never sends it, and the row says null).
//
// ── The sibling of useListeningBeacon, on a slower clock ──────────────────
// The same shape exactly: one timer in the module, started by the first
// component that asks and stopped by the last, skipped while the tab is
// hidden, re-asked the moment the tab comes back. The clock is sixty seconds
// rather than fifteen, because these are other people's journals and nobody
// changes records that often — and because the pull down to refresh
// (`refreshFriends`) lets whoever actually cares in the moment ask now,
// which is what buys the slow tier (Miyel's friends-room brief, 2026-10-06).
//
// The browser makes one request, to this copy, whatever the size of the
// book. The route fans out and keeps its round for a minute; see
// app/api/friends/beacons/route.js for what that costs the friends.
//
// ── A journal that does not answer keeps its last answer ──────────────────
// The route already does this on the server; it is done again here because
// on serverless the route's memory is per instance and a fresh instance has
// never heard from anybody. A row that comes back `unknown` for a journal
// this tab has heard from keeps what it heard. A dot is never darkened by
// somebody else's slow deployment.

'use client';

import { useSyncExternalStore } from 'react';

const REFRESH_MS = 60 * 1000;  // ask our own server once a minute

// Frozen and shared, for the same reason the beacon's EMPTY is: the store is
// read by identity, and a fresh object per read would render forever.
const EMPTY = Object.freeze({ friends: [] });

const room = {
  snapshot: EMPTY,
  listeners: new Set(),
  timer: null,
};

// Only what a component can see. Re-rendering the grid every minute to say
// the same ten people are still where they were is most of what this would
// otherwise cost.
function sameFriend(a, b) {
  return a.id === b.id
    && a.address === b.address
    && a.name === b.name
    && a.state === b.state
    && a.album === b.album
    && a.artist === b.artist
    && a.art === b.art
    && a.track === b.track
    && a.at === b.at;
}

function same(a, b) {
  return a.friends.length === b.friends.length
    && a.friends.every((x, i) => sameFriend(x, b.friends[i]));
}

function publish(next) {
  if (same(room.snapshot, next)) return;
  room.snapshot = next;
  for (const listener of room.listeners) listener();
}

function row(f) {
  const state = f?.state === 'logging' || f?.state === 'logged' || f?.state === 'nothing'
    ? f.state
    : 'unknown';
  return {
    id: f?.id ?? null,
    name: f?.name || '',
    address: f?.address || '',
    state,
    album: f?.album || '',
    artist: f?.artist || '',
    art: f?.art || '',
    track: f?.track || '',
    at: typeof f?.at === 'string' && f.at ? f.at : null,
  };
}

// `how` is '' for the timer's ask — the first thirty in the book — 'all' for
// the whole grid opening, and 'fresh' for a pull down, which asks everyone
// now (app/api/friends/beacons/route.js).
async function poll(how = '') {
  // A tab nobody is looking at has no room on screen, and asking on its
  // behalf would spend a round of the friends' hosting on a phone in a
  // pocket. `wake` asks the moment the tab comes back.
  if (!how && document.visibilityState === 'hidden') return;

  let data;
  try {
    const res = await fetch(how ? `/api/friends/beacons?${how}=1` : '/api/friends/beacons');
    if (!res.ok) return;                       // keep showing what we had
    data = await res.json();
  } catch {
    return;  // our own server being briefly unreachable is not worth an empty room
  }

  const heard = new Map(room.snapshot.friends.map(f => [f.address, f]));
  const friends = (Array.isArray(data?.friends) ? data.friends : []).map(f => {
    const next = row(f);
    if (next.state !== 'unknown') return next;
    // Unknown to the server, known here: keep what this tab heard, under the
    // name and id the book has for them now.
    const was = heard.get(next.address);
    return was && was.state !== 'unknown' ? { ...was, id: next.id, name: next.name } : next;
  });
  publish(friends.length === 0 ? EMPTY : { friends });
}

// Coming back to the tab. One ask straight away, and the clock restarted so
// the next is a full minute from this one.
function wake() {
  if (document.visibilityState !== 'visible' || !room.timer) return;
  poll();
  clearInterval(room.timer);
  room.timer = setInterval(() => poll(), REFRESH_MS);
}

// Starts the timer for the first component that asks and stops it when the
// last one leaves, so a page with no room on it is not quietly polling. The
// listener for coming back goes on and off with it, for the same reason.
function subscribe(listener) {
  room.listeners.add(listener);
  if (room.listeners.size === 1) {
    poll();
    room.timer = setInterval(() => poll(), REFRESH_MS);
    document.addEventListener('visibilitychange', wake);
  }
  return () => {
    room.listeners.delete(listener);
    if (room.listeners.size === 0) {
      clearInterval(room.timer);
      room.timer = null;
      document.removeEventListener('visibilitychange', wake);
    }
  };
}

// The pull down to refresh: ask now, past the route's minute, and resolve
// when the answer is in so the pull can say so. With nobody listening there
// is no room on screen to refresh, and nothing is asked.
export function refreshFriends() {
  if (room.listeners.size === 0) return Promise.resolve();
  const asked = poll('fresh');
  if (room.timer) {
    clearInterval(room.timer);
    room.timer = setInterval(() => poll(), REFRESH_MS);
  }
  return asked;
}

// The whole grid has opened: everyone past the first thirty is asked once,
// unless everyone was asked within the minute. The timer goes on asking
// thirty (Miyel, 2026-10-07).
export function fillFriends() {
  if (room.listeners.size === 0) return Promise.resolve();
  return poll('all');
}

// A subscription that subscribes to nothing, for a room that is mounted but
// not on screen: the cross keeps the Friends pane built once it has been
// visited, and a tab left open on the wall all afternoon must not ask thirty
// other people's journals once a minute for a room nobody is looking at.
// Letting go is what stops the timer; coming back asks at once, exactly as
// coming back to the tab does. The last answer stays on the faces meanwhile.
const unheard = () => () => {};

export function useFriendsBeacons(listening = true) {
  return useSyncExternalStore(
    listening ? subscribe : unheard,
    () => room.snapshot,
    // The server renders the book with nobody on; the browser has not asked
    // yet either, so anything else would be a hydration mismatch.
    () => EMPTY,
  );
}
