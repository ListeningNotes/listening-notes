// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// hooks/useListeningBeacon.js
// What the keeper is listening to.
//
// Returns:
// - track: { name, artist, image } — the current or last played track
// - isLive: boolean — true if a track is actively playing right now
// - recentAlbums: the last three distinct records, most recent first, each with
//   the key the journal files albums under so a scrobble can be matched to an
//   entry without a round trip
// - recentTracks: the last three tracks, for the nav's dropdown
//
// ── One poll, however many callers ─────────────────────────────────────────
// This hook is called by five separate components — the landing page, the
// beacon itself, the identity card, the site nav and the nav beacon — and four
// of them mount on the landing page together. Written the obvious way, with the
// timer inside the hook, that is four independent fifteen-second polls running
// in one tab: sixteen requests a minute from one person sitting still, and the
// nav's dropdown used to run a sixth timer of its own on top.
//
// So the timer does not live in the hook. It lives in the module, with the
// components subscribed to it, and it runs while at least one of them is
// mounted. Five callers, one request. useSyncExternalStore is exactly the shape
// of that problem — an outside thing that changes, several components watching.
//
// The upstream request no longer leaves the browser either. /api/public/beacon
// holds the key and caches the answer; see the note there.

'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { useBookplate } from '../components/main_components/Bookplate';

const REFRESH_MS = 15000;  // ask our own server every 15 seconds
const LIVE_TIMEOUT = 8000; // treat a track as "still live" for 8s after it stops reporting
const RECENT_ALBUMS = 3;
const RECENT_TRACKS = 3;

// The same key the database generates for every entry, written out in
// JavaScript so a scrobble can be matched against the journal without asking
// the server. Lower-cased, accents folded, & spelled out, everything that is
// not a letter or a digit collapsed to a single space. It has to agree with the
// album_key column in schema.sql — if that expression ever changes, this is the
// other half of it.
export function foldKey(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function albumKey(album, artist) {
  return foldKey(`${album ?? ''} ${artist ?? ''}`);
}

// What a journal with nothing playing looks like. A frozen constant rather than
// a fresh object: useSyncExternalStore compares snapshots by identity, and a new
// empty object every read is an infinite render loop.
const EMPTY = Object.freeze({
  track: null,
  isLive: false,
  recentAlbums: [],
  recentTracks: [],
});

const beacon = {
  snapshot: EMPTY,
  listeners: new Set(),
  timer: null,
  // Carried across polls so the grace window below survives them. These were
  // local to the effect when every component ran its own; now there is one
  // poll, so there is one place to keep them.
  lastLiveAt: null,
  lastLiveData: null,
};

// Re-rendering five components every fifteen seconds to tell them the same
// track is still playing is most of what this hook would otherwise cost. The
// snapshot is only replaced when something a component can actually see has
// changed.
function same(a, b) {
  return a.isLive === b.isLive
    && a.track?.name === b.track?.name
    && a.track?.artist === b.track?.artist
    && a.track?.image === b.track?.image
    && a.recentAlbums.length === b.recentAlbums.length
    && a.recentAlbums.every((x, i) => x.key === b.recentAlbums[i]?.key)
    && a.recentTracks.length === b.recentTracks.length
    && a.recentTracks.every((x, i) => x.name === b.recentTracks[i]?.name);
}

function publish(next) {
  if (same(beacon.snapshot, next)) return;
  beacon.snapshot = next;
  for (const listener of beacon.listeners) listener();
}

async function poll() {
  let tracks;
  try {
    const res = await fetch('/api/public/beacon');
    if (!res.ok) return;                       // keep showing what we had
    ({ tracks } = await res.json());
  } catch {
    return;  // our own server being briefly unreachable is not worth a blank beacon
  }

  const list = Array.isArray(tracks) ? tracks : [];
  const first = list[0];
  if (!first) { publish(EMPTY); return; }

  // Three different records, most recent first. The one on the beacon is
  // skipped: it is already the largest thing on the page and does not need
  // repeating underneath itself at a third of the size.
  //
  // Told apart by album title alone, not by title and artist. The same record
  // can arrive credited two ways — the first time this ran, a Bleach
  // soundtrack was playing as 鷺巣詩郎 and sitting in the history as Shiro
  // Sagisu, so a title-and-artist key saw two records and drew the one that was
  // playing underneath itself. Two different albums sharing a title is the
  // rarer accident, and a smaller one.
  const playing = foldKey(first.album);
  const seen = new Set(playing ? [playing] : []);
  const recentAlbums = [];
  for (const item of list) {
    if (!item.album) continue;
    const title = foldKey(item.album);
    if (!title || seen.has(title)) continue;
    seen.add(title);
    recentAlbums.push({
      // What the journal files this album under, for finding the entry, and the
      // title on its own, for when the artist is spelled differently in the two
      // places.
      key: albumKey(item.album, item.artist),
      title,
      album: item.album,
      artist: item.artist,
      art: item.art,
    });
    if (recentAlbums.length === RECENT_ALBUMS) break;
  }

  // The nav's dropdown wants tracks rather than records, and wants what has
  // finished rather than what is on. It used to fetch this itself, on its own
  // timer, from the same account — the same answer twice.
  const recentTracks = list
    .filter(item => !item.nowplaying)
    .slice(0, RECENT_TRACKS)
    .map(item => ({ name: item.name, artist: item.artist, art: item.art }));

  const trackData = { name: first.name, artist: first.artist, image: first.art };

  if (first.nowplaying) {
    beacon.lastLiveAt = Date.now();
    beacon.lastLiveData = trackData;
    publish({ track: trackData, isLive: true, recentAlbums, recentTracks });
    return;
  }

  // Not playing. Last.fm has a brief delay before it stops marking a track as
  // live, so the previous one is held for a moment rather than flickering.
  const elapsed = beacon.lastLiveAt ? Date.now() - beacon.lastLiveAt : Infinity;
  const held = elapsed < LIVE_TIMEOUT && beacon.lastLiveData;
  publish({
    track: held ? beacon.lastLiveData : trackData,
    isLive: false,
    recentAlbums,
    recentTracks,
  });
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

// A journal with no Last.fm account never subscribes, so nothing is ever
// polled and the snapshot stays empty. Having no beacon is a supported answer,
// not a broken one.
const NEVER = () => () => {};

export function useListeningBeacon() {
  const { lastfm_user } = useBookplate();
  const subscribeIf = useMemo(() => (lastfm_user ? subscribe : NEVER), [lastfm_user]);
  return useSyncExternalStore(
    subscribeIf,
    () => beacon.snapshot,
    // The server renders a journal with nothing playing. Anything else would
    // be a hydration mismatch, since the browser has not polled yet either.
    () => EMPTY,
  );
}
