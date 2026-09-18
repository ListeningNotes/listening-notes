// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// hooks/useListeningBeacon.js
// What the keeper is listening to.
//
// Returns:
// - state: which line the beacon prints — 'logging' while a listen is open,
//   'logged' for the last record sat down with. 'none' is a journal with
//   nothing to say at all: a copy on its first afternoon, or one that has asked
//   to be quiet. The server decides which; a visitor's browser cannot know
//   whether a listen is open. There were two more until 2026-09-16, when
//   Last.fm came out — see app/api/public/beacon/route.js.
// - album, artist, art, track — what to draw. `track` is empty when the last
//   thing logged is a whole record rather than a song.
// - isLive: whether a listen is open. It is what lights the dot on the mark.
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
  // A tab nobody is looking at is a tab with no beacon on screen, and asking
  // on its behalf spends a read on a picture in another window, another app,
  // or a phone in a pocket. Every copy pays this, so it is worth more than the
  // one journal it was noticed on: a laptop with six journals open in six tabs
  // was six polls a quarter-minute for one visible beacon.
  //
  // Nothing is lost by skipping: `wake` below asks the moment the tab comes
  // back, so what is on screen is never older than the moment it was looked at.
  if (document.visibilityState === 'hidden') return;

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
    isLive: state === 'logging',
    before: Array.isArray(data.before) ? data.before : [],
  };

  // An eight-second grace window used to sit here. Last.fm leaves a gap between
  // one track being marked as stopped and the next as playing, so a scrobbling
  // journal dropped to "Last played" — greying its own cover — for a poll or
  // two in the middle of a record, and the previous answer was held rather than
  // flickering. It went with Last.fm on 2026-09-16 and nothing replaced it: a
  // listen does not flicker, because the needle stands until it is ended or
  // goes twenty minutes untouched (library/needle.js).
  publish(snapshot);
}

// ── Lighting the beacon from here ─────────────────────────────────────────
// The owner's own beacon must not lag behind the owner (Miyel's beacon brief,
// 2026-09-17). Picking a record puts it on the beacon; the needle that tells
// the server is debounced by two seconds and the answer is cached at the edge
// for ten more, so left to the poll the keeper would watch their own pane sit
// on the last record for a quarter of a minute after starting a listen — on
// the one screen where the whole point is that the record has just arrived.
//
// So the record is published into the snapshot here, straight away, and the
// poll confirms it a few seconds later with the same answer. It is not a
// second request and it is not a separate view for the owner: it is this
// view, told early. Everyone else sees it on their next poll, which is what
// a beacon is.
//
// `before` is carried across rather than rebuilt — it is what came before
// this record, and this record arriving does not change that list. The server
// will put the departing record at its head on the next poll.
// `state` is 'logging' while a record is in hand and 'logged' once the listen
// has become an entry — the two things this beacon has ever said. The second
// is the end of the drop (HomeNav): the record falls into the journal and the
// slot refills with it, captioned Last logged, without waiting to be told
// something it already knows.
export function announce({ album, artist, art }, state = 'logging') {
  publish({
    state,
    album: album || '',
    artist: artist || '',
    art: art || '',
    // No song yet: one has not been opened. The beacon names the record
    // instead, which is what the route does for the same case.
    track: '',
    isLive: state === 'logging',
    before: beacon.snapshot.before || [],
  });
}

// Coming back to the tab. One ask straight away — somebody who has just looked
// at the beacon should not be reading a record from before lunch — and then the
// clock is restarted, so the next ask is a full fifteen seconds from this one
// rather than whenever the old schedule happened to have landed.
function wake() {
  if (document.visibilityState !== 'visible' || !beacon.timer) return;
  poll();
  clearInterval(beacon.timer);
  beacon.timer = setInterval(poll, REFRESH_MS);
}

// Starts the timer for the first component that asks and stops it when the last
// one leaves, so a page with no beacon on it is not quietly polling. The
// listener for coming back goes on and off with it, for the same reason.
function subscribe(listener) {
  beacon.listeners.add(listener);
  if (beacon.listeners.size === 1) {
    poll();
    beacon.timer = setInterval(poll, REFRESH_MS);
    document.addEventListener('visibilitychange', wake);
  }
  return () => {
    beacon.listeners.delete(listener);
    if (beacon.listeners.size === 0) {
      clearInterval(beacon.timer);
      beacon.timer = null;
      document.removeEventListener('visibilitychange', wake);
    }
  };
}

// A journal that has asked to be quiet never subscribes, so nothing is ever
// polled and the snapshot stays empty — which is exactly what its beacon screen
// draws anyway.
//
// This used to be "does this copy have a beacon at all", answered by whether
// anything had ever been logged here. It is not that question any more: there
// is always a beacon screen, blank on a copy's first afternoon (Miyel,
// 2026-09-16), so a new journal polls like any other and lights up the moment
// it has something to say. The only journal that stays silent is one whose
// keeper asked for it.
const NEVER = () => () => {};

export function useListeningBeacon() {
  const { beacon_on } = useBookplate();
  const subscribeIf = useMemo(() => (beacon_on ? subscribe : NEVER), [beacon_on]);
  return useSyncExternalStore(
    subscribeIf,
    () => beacon.snapshot,
    // The server renders a journal with nothing on the beacon. Anything else
    // would be a hydration mismatch, since the browser has not polled yet
    // either.
    () => EMPTY,
  );
}
