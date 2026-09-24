// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// What the keeper is listening to, asked once on behalf of everybody.
//
// ── One beacon ────────────────────────────────────────────────────────────
// A journal broadcasts what is going into it:
//
//   Now logging    the track being written about
//   Last logged    the last record sat down with
//
// There were two until 2026-09-16, and the other one was Last.fm — what your
// speakers are doing, rather than what you are writing about. It came out on
// Miyel's call while it was still true that nobody had one set up, which is
// the cheapest moment a thing like this ever has.
//
// The argument for going: it was never the truer claim. A scrobbler says a
// file was played; this says a person sat down with a record and wrote about
// it, which is what the journal is *for*. And it was never reliable — two of
// two testers failed to connect one, and Apple Music on an iPhone cannot
// scrobble dependably at all. What is left is a beacon every copy has from
// its first listen, made of the thing the copy is already doing.
//
// ── No Quiet ──────────────────────────────────────────────────────────────
// Every journal broadcasts (Miyel, 2026-09-24). From 2026-09-16 Settings had
// a switch that made this route answer nothing, carried in
// `settings.beacon_source`; the switch is gone, and so is the read of it that
// came with every answer. The column stays, unread — the schema is
// additive-only.
//
// ── What the browser used to do, and why it stopped ───────────────────────
// It asked Last.fm directly, which had two problems. The API key was written
// into the source, so every copy of this software queried Last.fm as the same
// application and shared one rate limit. And useListeningBeacon is called by
// several components at once, each running its own fifteen-second timer —
// sixteen requests a minute from one person sitting still. The first problem
// left with Last.fm; the second is solved in the hook, which runs one timer
// for however many callers.
//
// ── And what the building used to do, and why it stopped ──────────────────
// One reader cost one trip to the database every fifteen seconds. Ten people
// with the journal open cost forty reads a minute, and none of them were
// asking a different question — the beacon says the same thing to everybody,
// with no cookie read and no owner's half, which is exactly the shape of an
// answer that can be given once and handed out.
//
// So it is cached in front of the building rather than inside it. Vercel keeps
// the answer for ten seconds and serves it to whoever asks in that time, which
// takes ten watchers down to about one read every ten seconds however many of
// them there are. For twenty seconds after that it may hand over the old
// answer while it fetches a new one behind the reader's back — nobody waits on
// a beacon, and a cover ten seconds out of date is not a wrong cover.
//
// The cost is that turning to a new track can take a few seconds longer than
// the fifteen it already took to show up on somebody's screen. Writes are
// untouched: the needle goes in through /api/needle, which is nobody's cache.

import { pull_needle, pull_recent_listens, sameRecord } from '@/library/needle';

const BEFORE_THAT = 3;     // covers drawn under the beacon
const EDGE_TTL = 10;       // seconds Vercel may answer this without asking us
const EDGE_STALE = 20;     // and seconds more it may serve the old answer while it does
const CACHED = {
  'Cache-Control': `public, s-maxage=${EDGE_TTL}, stale-while-revalidate=${EDGE_STALE}`,
};

// A journal with nothing to say: a copy on its first day, before a record has
// been picked up.
const NOTHING = { state: 'none', album: '', artist: '', art: '', track: '', before: [] };

// "Before that" — never the record on the beacon, which is already the largest
// thing on the page and does not need repeating underneath itself at a third
// of the size. Used by the state whose record does not come out of this list;
// the quiet session state simply takes the three under its own head, which is
// the same rule stated more cheaply.
const beforeThat = (recent, album) => {
  const here = sameRecord(album);
  return recent.filter(row => !here || sameRecord(row.album) !== here).slice(0, BEFORE_THAT);
};

export async function GET() {
  try {
    // Both at once. The covers under the beacon are wanted whichever state
    // wins, and in the quiet state the first of them IS the beacon, so one
    // read answers both questions.
    const [needle, recent] = await Promise.all([pull_needle(), pull_recent_listens()]);

    // ── A listen is open ──────────────────────────────────────────────────
    // Whether one IS open is decided where the listen lives
    // (hooks/useListeningSession.js): a record being looked at on the album
    // screen never writes a needle at all, so a row reaching here is always a
    // listen. The song may still be blank — a resumed draft opens before its
    // tracklist arrives — and then the beacon names the record instead of
    // going dark, which is what it did for the whole of 2026-09-15.
    if (needle) {
      return Response.json({
        state: 'logging',
        album: needle.album, artist: needle.artist, art: needle.art, track: needle.track,
        before: beforeThat(recent, needle.album),
      }, { headers: CACHED });
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
    if (!last) return Response.json(NOTHING, { headers: CACHED });
    return Response.json({
      state: 'logged',
      album: last.album, artist: last.artist, art: last.art, track: last.track || '',
      before: recent.slice(1, 1 + BEFORE_THAT),
    }, { headers: CACHED });
  } catch {
    // Cached like every other answer, deliberately. A database having a bad
    // minute is the minute you least want every open tab asking it again, and
    // the worst this costs is one more poll's wait before the beacon comes
    // back — the stale window hands the old answer over and fetches a fresh
    // one behind it.
    return Response.json(NOTHING, { headers: CACHED });
  }
}
