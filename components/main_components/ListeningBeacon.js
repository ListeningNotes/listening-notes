// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';

import { useState } from 'react';
import { useListeningBeacon } from '../../hooks/useListeningBeacon';

// One beacon, one size. There used to be a `compact` shape as well, drawn in
// the nav row of every page — that row does not carry it any more, so the
// second shape has nothing to draw and is gone with it.

// One beacon, two states:
//
//   Now logging  →  Last logged
//
// Which one is showing is decided on the server — see
// app/api/public/beacon/route.js — because a visitor's browser has no way of
// knowing whether a listen is open.
//
// There were four until 2026-09-16, because there were two beacons and the
// other one was Last.fm's ("Now listening" → "Last played"). It went while
// nobody had one connected. What is left is the better thing to find on a
// journal anyway: somebody sitting with a record and writing about it, rather
// than music being on in a room.
const CAPTION = {
  logging: 'Now logging',
  logged: 'Last logged',
};

// OUT OF SESSION was stamped across the idle art from 2026-09-16 until
// 2026-09-17, when Miyel took it off (this brief). It said the state was off
// while the caption under it said which record this was, which is two
// sentences about two different things — and that was the argument for it.
// What beat it: the caption is already the state line (LAST LOGGED, and NOW
// LOGGING when it is live), so the stamp was the same fact in a second voice
// laid over somebody's album art. DECISIONS retired the Last-played stamp on
// 2026-09-15 for exactly this reason and this one outlived it by a day.
//
// The art still greys when nothing is open, which is the half that was doing
// the work.

// `children` is the owner's line, and it belongs to whoever is drawing the
// beacon rather than to the beacon: pressing it turns floor one into the
// picker, which is a thing about the pane and not about this component (see
// HomeNav). It lands under the artist, inside the meta stack, so it reads as
// the last line of the record's own block rather than as furniture parked
// underneath it. Drawn on the empty beacon too — a copy on its first
// afternoon is exactly the one that needs a way to start.
export default function ListeningBeacon({ children = null }) {
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
  // picked up — or a journal whose keeper has switched the beacon off, which
  // says the same thing on purpose, because a visitor is owed neither.
  //
  // This is the stand-in Miyel asked for on 2026-09-16, and since that day it
  // is seen far more often: the beacon screen used to be dropped entirely on a
  // copy with nothing logged, and now the screen is always there and this line
  // is what stands on it. The tile used to draw itself anyway — a white square,
  // a grey note and a dash, the largest thing on the landing page, looking
  // broken. What is left is one quiet line.
  if (!title) {
    return (
      <div className="beacon-stage beacon-stage--quiet">
        <p className="beacon-quiet">Nothing logged yet.</p>
        {children}
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
          {children}
        </div>
      </div>
    </div>
  );
}
