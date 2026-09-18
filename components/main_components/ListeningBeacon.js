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

// ── Where the caption is ──────────────────────────────────────────────────
// On the cover while the cover is grey, and under it once it lights.
//
// There were two lines for a day: OUT OF SESSION stamped across the idle art
// and LAST LOGGED under it. The brief took the stamp off on the grounds that
// they were one fact said twice, which was right — and Miyel's answer on
// 2026-09-17 was to keep the half I had thrown away. She liked the writing on
// the greyed cover; what was redundant was having it in both places. So the
// caption moved up onto the art and the line underneath went instead.
//
// It reads better as well as costing less: the scrim, the grey and the word
// are one object saying one thing — this record is not playing, here is when
// it was — where before the picture said it and then a line under the picture
// said it again.
//
// Lit, there is no scrim to write on and the art is in full colour, so the
// caption is under the record with its dot beside it, which is where the
// mockup puts it. And where there is no art at all — the ♪ placeholder — it
// is under the record too, because a label floating on an empty square is a
// label on nothing.

// `children` is the owner's line, and it belongs to whoever is drawing the
// beacon rather than to the beacon: pressing it turns floor one into the
// picker, which is a thing about the pane and not about this component (see
// HomeNav). It lands under the artist, inside the meta stack, so it reads as
// the last line of the record's own block rather than as furniture parked
// underneath it. Drawn on the empty beacon too — a copy on its first
// afternoon is exactly the one that needs a way to start.
// `choosing` stands the whole record down: while one is being picked the
// beacon is not reporting anything, it is a target waiting for a cover to
// land in it (Miyel's beacon brief, 2026-09-17). The art stays on screen,
// shrunk and dimmed by the pane — the page never goes blank, and the small
// cover is the thing the picked record flies into.
//
// It said CHOOSING A RECORD under the cover for an hour and Miyel took it
// off: the picker underneath, the shrunken cover and the × in the corner are
// already three things saying it, and a fourth in small caps was a label on a
// state nobody could be in by accident.
//
// It is passed in rather than worked out here for the same reason `children`
// is: what the pane is doing is the pane's business.
export default function ListeningBeacon({ children = null, choosing = false }) {
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
        {!choosing && <p className="beacon-quiet">Nothing logged yet.</p>}
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
          {/* Only on art, and only while it is grey. Over the ♪ placeholder
              this would be writing on an empty square, and over lit art it
              would be a scrim across the one cover on this site that is
              meant to be in full colour. */}
          {!choosing && !isLive && artUrl && (
            <div className="beacon-idle-overlay"><span>{CAPTION[state]}</span></div>
          )}
        </div>
        <div className="beacon-meta">
          {/* The caption, under the record — but only where it is not already
              on it. See the note at the top: greyed art carries its own
              caption and this line would be the second copy of it. Never
              green; the dot beside it is the one thing that lights. */}
          {!choosing && (isLive || !artUrl) && <div className="beacon-status">{CAPTION[state]}</div>}
          {/* Two lines, not a marquee. The marquee is the right answer in the
              nav row, where the slot is a couple of hundred pixels wide and
              there is nowhere for a long title to go — but here the title has
              a whole screen under it and the page can simply be as tall as the
              name is. A title that scrolls has to be waited for; one that
              wraps is read. Past two lines it still ellipsises, because a
              four-line song title would push the album art off the screen. */}
          {/* The record steps aside while something else is being said. The
              cover is still there, which is the whole point; what goes is the
              name of a record you are in the middle of replacing. */}
          {!choosing && <div className="beacon-track beacon-track--wrap">{title}</div>}
          {!choosing && artist && <div className="beacon-artist">{artist}</div>}
          {children}
        </div>
      </div>
    </div>
  );
}
