// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';

import { useState } from 'react';
import { useListeningBeacon } from '../../hooks/useListeningBeacon';

// One beacon, one size. There used to be a `compact` shape as well, drawn in
// the nav row of every page — that row does not carry it any more, so the
// second shape has nothing to draw and is gone with it.

// Two beacons, two states each, and a journal runs one of them — the choice
// is in Settings and lives on `settings.beacon_source`.
//
//   session   Now logging  →  Last logged
//   lastfm    Now listening →  Last played
//
// The labels do double duty: they say what is happening and what kind of
// beacon somebody runs, without anything having to explain itself. Which one
// is showing is decided on the server — see app/api/public/beacon/route.js —
// because a visitor's browser has no way of knowing whether a listen is open.
//
// "Now logging" is not a fallback, and the session beacon is the default. It
// is the better thing to find on a journal: somebody sitting with a record and
// writing about it, rather than music being on in a room.
const CAPTION = {
  logging: 'Now logging',
  logged: 'Last logged',
  listening: 'Now listening',
  played: 'Last played',
};

// And what is stamped across the art when neither beacon is live. Back on
// 2026-09-16, Miyel's call after the first real listen: a record that has been
// logged and left looked no different at a glance from one being written about
// now, and the greying alone was not saying it.
//
// It is not the caption repeated. The caption under the art says what the
// record is — the last one logged, the last one played — and the stamp says
// the state is off, which is the split the Last.fm beacon had before any of
// this ("Not currently listening" under, "Last played" over). Two sentences
// about two different things; the same screen twice is what took the stamp off
// in the first place.
const STAMP = {
  logged: 'Out of session',
  played: 'Not listening',
};

export default function ListeningBeacon() {
  const { state, album, artist, art, track, isLive } = useListeningBeacon();
  // A song wherever there is one — including after a listen has been shut,
  // which keeps the track that was open up rather than dropping back to the
  // record's name. A whole record is what is left when the last thing logged
  // is an entry, because an entry is an album.
  const title = track || album;
  // Cover URLs fail one at a time — the image host is flaky per URL, not per
  // record. An <img> that fails draws the browser's own broken-picture mark,
  // the largest thing on the screen, so a URL that fails is remembered and the
  // placeholder is drawn instead until the record changes.
  const [failed, setFailed] = useState('');
  const artUrl = art && art !== failed ? art : '';

  // Nothing at all: a copy on its first afternoon, before a record has been
  // picked up, with no scrobbler either. The tile used to draw itself anyway —
  // a white square, a grey note and a dash, the largest thing on the landing
  // page, looking broken. What is left is one quiet line.
  if (!title) {
    return (
      <div className="beacon-stage beacon-stage--quiet">
        <p className="beacon-quiet">Nothing logged yet.</p>
      </div>
    );
  }

  return (
    <div className="beacon-stage">
      <div className="beacon-card beacon-card--main">
        <div className={'beacon-art-wrap' + (isLive ? ' beacon-art-wrap--live' : '')}>
          {artUrl
            ? <img src={artUrl} alt={title} className={'beacon-art' + (!isLive ? ' beacon-art--idle' : '')} onError={() => setFailed(artUrl)} />
            : <div className="beacon-art-placeholder">♪</div>
          }
          {/* The stamp across the idle cover, over art that is already
              greyed. Drawn only where there is art to draw it on: over the ♪
              placeholder it would be a label on an empty square, and the
              caption underneath is saying the same thing more quietly. */}
          {!isLive && artUrl && STAMP[state] && (
            <div className="beacon-idle-overlay"><span>{STAMP[state]}</span></div>
          )}
        </div>
        <div className="beacon-meta">
          {/* The caption, back since 2026-09-07 on Miyel's call, and under the
              art rather than over it: the art is the first thing on the
              screen, and the line says what it is before the title says
              which. Never green — the dot on the mark is the one thing that
              lights. */}
          <div className="beacon-status">{CAPTION[state]}</div>
          {/* Two lines, not a marquee. The marquee is the right answer in the
              nav row, where the slot is a couple of hundred pixels wide and
              there is nowhere for a long title to go — but here the title has
              a whole screen under it and the page can simply be as tall as the
              name is. A title that scrolls has to be waited for; one that
              wraps is read. Past two lines it still ellipsises, because a
              four-line song title would push the album art off the screen. */}
          <div className="beacon-track beacon-track--wrap">{title}</div>
          {artist && <div className="beacon-artist">{artist}</div>}
        </div>
      </div>
    </div>
  );
}
