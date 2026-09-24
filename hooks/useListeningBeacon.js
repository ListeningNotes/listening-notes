// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// hooks/useListeningBeacon.js
// What the keeper is listening to.
//
// Returns:
// - state: which line the beacon prints — 'logging' while a listen is open,
//   'logged' for the last record sat down with. 'none' is a journal with
//   nothing to say at all: a copy on its first afternoon. The server decides
//   which; a visitor's browser cannot know whether a listen is open. There were two more until 2026-09-16, when
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

import { useSyncExternalStore } from 'react';

// ── The two words ─────────────────────────────────────────────────────────
// What each state is called, wherever the beacon is drawn. Here rather than in
// the component because the beacon is drawn in three places and only one of
// them is that component: the small copy in the nav bar and the one in the
// session's header say these same two words, and a caption that lived with one
// drawing of the beacon is a caption the other two have to guess at.
//
// There were four until 2026-09-16, because there were two beacons and the
// other one was Last.fm's ("Now listening" → "Last played"). It went while
// nobody had one connected. What is left is the better thing to find on a
// journal anyway: somebody sitting with a record and writing about it, rather
// than music being on in a room.
export const CAPTION = {
  // One word. The large beacon says nothing at all while it is live — colour,
  // shadow and the lit dot on the mark are the signal there — so this is the
  // small beacon's line only, and the small beacon has no mark beside it to
  // carry a dot. "Now logging" was two thirds of a 44px row saying what the
  // dot in front of it already said (Miyel, 2026-09-18: "it only needs to say
  // logging, it doesn't need to say now logging").
  logging: 'Logging',
  logged: 'Last logged',
};

const REFRESH_MS = 15000;  // ask our own server every 15 seconds
// How long the owner's own hand outranks the server's answer. It has to clear
// the ten seconds /api/public/beacon may be served from the edge cache, plus a
// poll's own flight — see `announce` and the check in `poll`.
const HOLD_MS = 12000;

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
  // What the owner just did, and until when it beats anything the server says.
  held: null,
  heldUntil: 0,
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
  const snapshot = state === 'none' ? EMPTY : {
    state,
    album: data.album || '',
    artist: data.artist || '',
    art: data.art || '',
    track: data.track || '',
    isLive: state === 'logging',
    before: Array.isArray(data.before) ? data.before : [],
  };

  // ── An answer from before the owner moved ────────────────────────────────
  // Miyel, 2026-09-18, on saving a listen: "for some reason it came back
  // (beacon) but then went right back off?" The drop had just put the record
  // on the beacon captioned Last logged, correctly — and a second later it
  // went live again, and fifteen seconds after that it went quiet again.
  //
  // Nothing was wrong with the needle. What lands is a poll that *left*
  // before the save: these requests take three to seven hundred milliseconds,
  // so one sent while the entry was being written comes back afterwards
  // carrying the world as it was, and publishes it over the truth. In
  // production it is worse than a request in flight — the answer may be
  // served from the edge for ten seconds after the needle is already down.
  //
  // So `announce` does not just publish now, it *holds*: for twelve seconds
  // the owner's own hand outranks the server, and any answer that disagrees
  // with what they just did is dropped on the floor. The moment the server
  // agrees the hold is released, so the usual case costs one poll.
  //
  // Only state and album are compared, because those are the two things
  // `announce` actually asserts. Everything else on the snapshot — the song,
  // the covers underneath — is the server's to know, and waiting for it to
  // agree about those would hold every time.
  //
  // Twelve seconds is a ceiling, not a duration: it is what stops a hold
  // wedging the beacon if the server genuinely disagrees, for instance
  // because the same journal is being written in on another phone.
  if (beacon.heldUntil > Date.now()) {
    const caughtUp = snapshot.state === beacon.held.state
      && snapshot.album === beacon.held.album;
    if (!caughtUp) return;
    beacon.heldUntil = 0;
  }

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
  const next = {
    state,
    album: album || '',
    artist: artist || '',
    art: art || '',
    // No song yet: one has not been opened. The beacon names the record
    // instead, which is what the route does for the same case.
    track: '',
    isLive: state === 'logging',
    before: beacon.snapshot.before || [],
  };
  // Held before it is published, so a poll that answers mid-publish is already
  // being measured against this.
  beacon.held = next;
  beacon.heldUntil = Date.now() + HOLD_MS;
  publish(next);
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

// Every journal polls. It used to be skipped for a journal whose keeper had
// switched the beacon to Quiet, and before that for a copy that had never
// logged anything; neither is a question any more. There is always a beacon
// screen, blank on a copy's first afternoon (Miyel, 2026-09-16), and the
// switch came out on 2026-09-24 — so a new journal polls like any other and
// lights up the moment it has something to say.
export function useListeningBeacon() {
  return useSyncExternalStore(
    subscribe,
    () => beacon.snapshot,
    // The server renders a journal with nothing on the beacon. Anything else
    // would be a hydration mismatch, since the browser has not polled yet
    // either.
    () => EMPTY,
  );
}
