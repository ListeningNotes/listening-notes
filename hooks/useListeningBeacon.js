// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// hooks/useListeningBeacon.js
// What the keeper is listening to.
//
// Returns:
// - state: which line the beacon prints. Two beacons, two states each, and a
//   journal runs one of them — see app/api/public/beacon/route.js.
//     session   'logging'   | 'logged'
//     lastfm    'listening' | 'played'
//   'none' is a journal with nothing to say at all. The server decides which:
//   a visitor's browser cannot know whether a listen is open.
// - album, artist, art, track — what to draw. `track` is empty when the last
//   thing logged is a whole record rather than a song.
// - isLive: whether anything is happening at all — a listen being written or
//   a record playing. It is what lights the dot on the mark.
// - before: up to three records listened to lately, most recent first, each
//   with a slug when it was published and none when it is still a draft.
//
// ── One poll, however many callers ─────────────────────────────────────────
// This hook is called by four separate components — the beacon itself, the
// identity card, the site nav and the cross — and three of them mount on the
// landing page together. Written the obvious way, with the timer inside the
// hook, that is three independent fifteen-second polls running in one tab.
//
// So the timer does not live in the hook. It lives in the module, with the
// components subscribed to it, and it runs while at least one of them is
// mounted. Four callers, one request. useSyncExternalStore is exactly the
// shape of that problem — an outside thing that changes, several components
// watching.

'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { useBookplate } from '../components/main_components/Bookplate';

const REFRESH_MS = 15000;  // ask our own server every 15 seconds
const LIVE_TIMEOUT = 8000; // hold a scrobble for 8s after it stops reporting

// The same key the database generates for every entry, written out in
// JavaScript so a record can be matched against the journal without asking
// the server. Lower-cased, accents folded, & spelled out, everything that is
// not a letter or a digit collapsed to a single space. It has to agree with the
// album_key column in migrations/001_initial.sql — if that expression ever changes, this is the
// other half of it.
//
// The beacon itself no longer needs it: the covers under it come out of this
// journal already and arrive with their own slugs. It stays here because the
// inbox and the page about a person match what somebody *sent* — a submission
// row, which has no key — against the keeper's entries.
export function foldKey(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function albumKey(album, artist) {
  return foldKey(`${album ?? ''} ${artist ?? ''}`);
}

// What a journal with nothing to say looks like. A frozen constant rather than
// a fresh object: useSyncExternalStore compares snapshots by identity, and a new
// empty object every read is an infinite render loop.
const EMPTY = Object.freeze({
  state: 'none',
  album: '',
  artist: '',
  art: '',
  track: '',
  isLive: false,
  before: [],
});

const beacon = {
  snapshot: EMPTY,
  listeners: new Set(),
  timer: null,
  // Carried across polls so the grace window below survives them.
  lastLiveAt: null,
  lastLiveData: null,
};

// Re-rendering four components every fifteen seconds to tell them the same
// thing is still true is most of what this hook would otherwise cost. The
// snapshot is only replaced when something a component can actually see has
// changed.
function same(a, b) {
  return a.state === b.state
    && a.album === b.album
    && a.artist === b.artist
    && a.art === b.art
    && a.track === b.track
    && a.before.length === b.before.length
    && a.before.every((x, i) => x.album === b.before[i]?.album);
}

function publish(next) {
  if (same(beacon.snapshot, next)) return;
  beacon.snapshot = next;
  for (const listener of beacon.listeners) listener();
}

async function poll() {
  let data;
  try {
    const res = await fetch('/api/public/beacon');
    if (!res.ok) return;                       // keep showing what we had
    data = await res.json();
  } catch {
    return;  // our own server being briefly unreachable is not worth a blank beacon
  }

  const state = data?.state || 'none';
  if (state === 'none') { publish(EMPTY); return; }

  const snapshot = {
    state,
    album: data.album || '',
    artist: data.artist || '',
    art: data.art || '',
    track: data.track || '',
    isLive: state === 'logging' || state === 'listening',
    before: Array.isArray(data.before) ? data.before : [],
  };

  // Last.fm has a brief gap between one track being marked as stopped and the
  // next being marked as playing, so a scrobbling journal would drop to "Last
  // played" — greying its own cover — for a poll or two in the middle of a
  // record. The previous answer is held for a moment rather than flickering.
  //
  // Only for Last.fm. A listen does not flicker: the needle stands for three
  // hours and is ended deliberately (library/needle.js), so 'logging' needs no
  // grace, and a journal runs one beacon or the other anyway.
  if (state === 'listening') {
    beacon.lastLiveAt = Date.now();
    beacon.lastLiveData = snapshot;
  } else if (state === 'played' && beacon.lastLiveData) {
    const elapsed = Date.now() - beacon.lastLiveAt;
    if (elapsed < LIVE_TIMEOUT) { publish(beacon.lastLiveData); return; }
  }

  publish(snapshot);
}

// Starts the timer for the first component that asks and stops it when the last
// one leaves, so a page with no beacon on it is not quietly polling.
function subscribe(listener) {
  beacon.listeners.add(listener);
  if (beacon.listeners.size === 1) {
    poll();
    beacon.timer = setInterval(poll, REFRESH_MS);
  }
  return () => {
    beacon.listeners.delete(listener);
    if (beacon.listeners.size === 0) {
      clearInterval(beacon.timer);
      beacon.timer = null;
    }
  };
}

// A journal with no beacon never subscribes, so nothing is ever polled and the
// snapshot stays empty. That used to mean a copy with no Last.fm; it now means
// a copy that has never logged anything and has no scrobbler either, which is
// a copy on its first afternoon. Having no beacon is still a supported answer
// — it is just no longer the answer for everyone who could not connect
// Last.fm.
const NEVER = () => () => {};

export function useListeningBeacon() {
  const { beacon_available } = useBookplate();
  const subscribeIf = useMemo(() => (beacon_available ? subscribe : NEVER), [beacon_available]);
  return useSyncExternalStore(
    subscribeIf,
    () => beacon.snapshot,
    // The server renders a journal with nothing on the beacon. Anything else
    // would be a hydration mismatch, since the browser has not polled yet
    // either.
    () => EMPTY,
  );
}
