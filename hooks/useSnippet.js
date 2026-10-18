// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// hooks/useSnippet.js
// Thirty seconds of a song, played in place (Miyel's previews brief,
// 2026-09-24). Somebody reads a note about track four and wants to hear what
// is meant; this is what they press.
//
// ── Two halves: what to play, and the player ────────────────────────────────
// The player does not know it plays a thirty-second clip from Apple. It is
// handed a play — `{ source, duration, kind }`, kind `'preview'` or `'full'`
// — and plays it, ending at `duration`, or at the media's own end when there
// is none. Knowing where the audio comes from is `resolve`, below, and
// nothing else (Miyel's source brief, 2026-10-13). Today it answers with
// Apple's preview; a full song, later and only inside a listen, is a change
// to what `resolve` returns rather than to the player. Previews stay where
// they are and never ask anybody to sign in.
//
// ── Where the clip comes from ───────────────────────────────────────────────
// Apple's catalogue lookup — the same one the tracklist was matched from
// (library/music_data_api.js) — returns a `previewUrl` per song. The brief
// had them stored on every track and the old entries backfilled; that pass
// would have edited every entry in the journal, and nothing in a journal
// changes unless its keeper changes it. So nothing is stored: the reader's
// own browser asks Apple when the page opens (Apple answers any page,
// `access-control-allow-origin: *`), the audio comes straight from Apple, and
// the server is never in the path (Miyel, 2026-10-13). A link Apple retires
// is simply not offered next time, rather than kept in a row and dead.
//
// A record Apple cannot find draws no control, nor does a song Apple has no
// clip for, or one whose title does not match: a wrong song playing is worse
// than none.
//
// ── One at a time, across the page ──────────────────────────────────────────
// There is one <audio> for the whole site, held on the window rather than in
// a component, so starting a clip anywhere stops whatever else was playing.
// Pausing keeps the place; starting something else ends it. It ends itself
// at its play's length and never rolls on into the next song. Nothing plays on
// load; a clip plays on across the site until it ends, and waits while the
// page is hidden.
'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { fetchTracklist } from '../library/music_data_api';
import { lookup_key } from '../library/entry_formatter';

// ── The lookup, once per record per visit ─────────────────────────────────
// An entry does not keep Apple's id for its record — only a draft and a send
// do — so the record is found by name, the way a listen finds it
// (fetchTracklist). A search that lands on the wrong record finds no titles
// that match, and so offers nothing. Swiping between neighbours and back
// would otherwise ask again each time.
const asked = new Map(); // album and artist → Promise<{ songs, recordLink } | null>

function fold(text) {
  return String(text || '').toLowerCase()
    .replace(/&/g, 'and')
    // "(Remastered 2011)", "[Live]", " - Single Version": what Apple adds
    // to a title and a keeper usually does not.
    .replace(/\s*[([].*?[)\]]/g, '')
    .replace(/\s+-\s+.*$/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function ask(album, artist) {
  const key = lookup_key(album, artist);
  if (!asked.has(key)) {
    const answer = fetchTracklist(album, artist)
      .then(found => found && {
        songs: (found.clips || []).map(s => ({ ...s, title: fold(s.title) })),
        recordLink: found.recordUrl || '',
      })
      // Nothing found is asked again on the next visit rather than remembered.
      .then(result => { if (!result) asked.delete(key); return result; });
    asked.set(key, answer);
  }
  return asked.get(key);
}

// The song on Apple's list that is this track: at its own number when the
// title there agrees, otherwise wherever the title is.
function find(songs, number, title) {
  const want = fold(title);
  if (!want) return null;
  const at = number ? songs[number - 1] : null;
  if (at && at.title === want) return at;
  return songs.find(s => s.title === want) || null;
}

// ── What to play ───────────────────────────────────────────────────────────
// The one place that knows where audio comes from. Given a song off Apple's
// list, the play for it, or null where there is nothing to play. Apple's
// previews run thirty seconds, so that is the length a preview is given;
// the number lives here and nowhere in the player.
const PREVIEW_SECONDS = 30;

function resolve(song) {
  if (!song?.clip) return null;
  return { source: song.clip, duration: PREVIEW_SECONDS, kind: 'preview' };
}

// What a page asks for: the play and the song's link for a track, by its
// number and title, and the record's link. `ready` is false until Apple has
// answered; `any` says whether a single track on this record has anything
// to play.
//
// ── The link out ───────────────────────────────────────────────────────────
// Open in Apple Music, on the record and on a track note's song: Apple's own
// address for it, off the same answer the clips came from, never stored.
// The brief preferred song.link, which lets the reader pick a service; its
// lookup started wanting a key in 2026, and its plain links would put a
// third party's page between every reader and the record, on every copy, for
// as long as song.link keeps them working. The clips are Apple's already, so
// the door is too (Miyel, 2026-10-13).
export function useSnippet(album, artist) {
  const [found, setFound] = useState(null);
  useEffect(() => {
    if (!album) return;
    let live = true;
    // A failed lookup answers as a record with nothing on it.
    ask(album, artist || '').then(result => { if (live) setFound(result || { songs: [], recordLink: '' }); });
    return () => { live = false; };
  }, [album, artist]);

  const songs = found?.songs || [];
  return {
    ready: !!found,
    any: songs.some(s => resolve(s)),
    recordLink: found?.recordLink || '',
    playFor: (number, title) => resolve(find(songs, number, title)),
    songLinkFor: (number, title) => find(songs, number, title)?.songUrl || '',
  };
}

// ── The one player ─────────────────────────────────────────────────────────
// `key` names whose play is loaded; `at` is where it is and `duration` how
// long it is, in seconds; `kind` is the play's.
//
// Kept on the window rather than in this module, 2026-10-13: two copies of
// this file loaded at once — a page and the layer over it, or the old and
// new code after the dev server reloads one — would otherwise each have an
// <audio> of their own and play over each other. On the window there is one,
// however many copies ask (Miyel: "there should be no way to play two
// previews over one another").
//
// A clip plays on when its page is left — down the wall, into another entry —
// and stops only when it ends, is paused, or another one starts (her call,
// the same day; the brief had it stop with the entry).
const idle = { key: null, playing: false, waiting: false, at: 0, duration: 0, kind: null };

function deck() {
  if (!globalThis.__lnSnippet) {
    globalThis.__lnSnippet = { state: { ...idle }, listeners: new Set(), audio: null };
  }
  return globalThis.__lnSnippet;
}

function set(next) {
  const d = deck();
  d.state = { ...d.state, ...next };
  d.listeners.forEach(fn => fn());
}

function reset() {
  const d = deck();
  if (!d.state.key) return;
  if (d.audio) { d.audio.pause(); d.audio.removeAttribute('src'); d.audio.load(); }
  set({ ...idle });
}

function player() {
  const d = deck();
  if (d.audio) return d.audio;
  const audio = new Audio();
  d.audio = audio;
  audio.preload = 'none';
  audio.addEventListener('playing', () => set({ playing: true, waiting: false }));
  audio.addEventListener('waiting', () => set({ waiting: true }));
  // Only if it is still paused when the news arrives: the old clip's pause
  // lands just after the next one was started, and would draw the new
  // button idle while it loads.
  audio.addEventListener('pause', () => { if (audio.paused) set({ playing: false, waiting: false }); });
  audio.addEventListener('ended', reset);
  // Only while something is loaded: emptying the player can raise an error
  // of its own, and resetting on that would empty it again.
  audio.addEventListener('error', () => { if (deck().state.key) reset(); });
  // A play that came without a length takes the media's own, once known.
  audio.addEventListener('loadedmetadata', () => {
    if (!deck().state.duration && Number.isFinite(audio.duration)) set({ duration: audio.duration });
  });
  audio.addEventListener('timeupdate', () => {
    const { duration } = deck().state;
    if (duration && audio.currentTime >= duration) { reset(); return; }
    set({ at: audio.currentTime });
  });
  // Locked phone, another tab: the clip waits where it was.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && !audio.paused) audio.pause();
  });
  return audio;
}

// A play that fails resets the player only if it is still this clip's turn:
// pressing a second track before the first has started abandons the first
// one's play, and that must not stop the second.
function start(a, key) {
  a.play().catch(() => { if (deck().state.key === key) reset(); });
}

// `play` is what resolve answered: { source, duration, kind }.
export function toggleSnippet(key, play) {
  const a = player();
  if (deck().state.key === key) {
    if (a.paused) { set({ waiting: true }); start(a, key); }
    else a.pause();
    return;
  }
  // Whatever was playing ends here, before the new clip is loaded.
  reset();
  a.src = play.source;
  set({ key, waiting: true, at: 0, duration: play.duration || 0, kind: play.kind || 'preview' });
  start(a, key);
}

function subscribe(fn) { const d = deck(); d.listeners.add(fn); return () => d.listeners.delete(fn); }

// The player as one button sees it: itself, or nothing.
export function useSnippetState(key) {
  const now = useSyncExternalStore(subscribe, () => deck().state, () => idle);
  return now.key === key ? now : idle;
}
