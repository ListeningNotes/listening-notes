// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';

import { useListeningBeacon } from '../../hooks/useListeningBeacon';

// One beacon, one size. There used to be a `compact` shape as well, drawn in
// the nav row of every page — that row does not carry it any more, so the
// second shape has nothing to draw and is gone with it. `statusAboveArt` went
// at the same time: the status line it placed had already been reduced to
// null, so it was a switch between nothing and nothing.
export default function ListeningBeacon() {
  const { track: trackObj, isLive } = useListeningBeacon();
  const trackName = trackObj?.name || '—';
  const artistName = trackObj?.artist || '';
  const artUrl = trackObj?.image || '';

  // The recent listens used to be gathered here, in a second poll of the same
  // endpoint, and fanned out around the beacon when you pressed it. They are a
  // row of their own now, below the beacon and always visible — see the note in
  // hooks/useListeningBeacon.js, which derives them from the poll this already
  // makes. Pressing the beacon no longer does anything, so it stopped being a
  // button.

  // "Now listening" and "Not listening" used to be written out above the art.
  // They said what the page already shows: a record with a title and an artist
  // under it, on a page whose mark carries a lit dot while something is
  // playing. Two words of label over an image that is the whole point of the
  // screen was spacing spent on a caption.
  //
  // The distinction they carried is not lost — the idle state greys the art
  // and prints "last played" across it, which is the same fact told by the
  // thing it is about.

  return (
    <div className="beacon-stage">
      <div className="beacon-card beacon-card--main">
        <div className={'beacon-art-wrap' + (isLive ? ' beacon-art-wrap--live' : '')}>
          {artUrl
            ? <img src={artUrl} alt={trackName} className={'beacon-art' + (!isLive ? ' beacon-art--idle' : '')} />
            : <div className="beacon-art-placeholder">♪</div>
          }
          {!isLive && artUrl && <div className="beacon-idle-overlay"><span>Last played</span></div>}
        </div>
        <div className="beacon-meta">
          {/* Two lines, not a marquee. The marquee is the right answer in the
              nav row, where the slot is a couple of hundred pixels wide and
              there is nowhere for a long title to go — but here the title has
              a whole screen under it and the page can simply be as tall as the
              name is. A title that scrolls has to be waited for; one that
              wraps is read. Past two lines it still ellipsises, because a
              four-line song title would push the album art off the screen. */}
          <div className="beacon-track beacon-track--wrap">{trackName || '—'}</div>
          {artistName && <div className="beacon-artist">{artistName}</div>}
        </div>
      </div>
    </div>
  );
}
