// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';

import { useState } from 'react';
import { useListeningBeacon } from '../../hooks/useListeningBeacon';

// One beacon, one size. There used to be a `compact` shape as well, drawn in
// the nav row of every page — that row does not carry it any more, so the
// second shape has nothing to draw and is gone with it.

// The three states, and what each one is called. The labels do double duty:
// they say what is happening and what kind of beacon somebody runs, without
// anything having to explain itself. Which one is showing is decided on the
// server — see app/api/public/beacon/route.js — because a visitor's browser
// has no way of knowing whether a listen is open.
//
// "Now logging" is not a fallback. It is the better of the two live states to
// find on a journal: somebody sitting with a record and writing about it,
// rather than music being on in a room.
const CAPTION = {
  logging: 'Now logging',
  listening: 'Now listening',
  logged: 'Last logged',
};

export default function ListeningBeacon() {
  const { state, album, artist, art, track, isLive } = useListeningBeacon();
  // A song in the two live states; a whole record in the third, where what is
  // being shown is an entry and an entry is an album.
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
          {/* A "Last played" stamp used to sit across the idle cover. The
              caption below says which of the three states this is, in words,
              forty pixels away — so the stamp was the same sentence twice, and
              in the wrong tense now that the idle state is a record that was
              logged rather than one that was played. The art still greys,
              which is the part that was doing the work. */}
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
