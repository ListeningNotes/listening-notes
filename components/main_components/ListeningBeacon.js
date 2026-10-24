// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';

import { useState } from 'react';
import { CAPTION, useListeningBeacon } from '../../hooks/useListeningBeacon';

// One beacon, one size. There used to be a `compact` shape as well, drawn in
// the nav row of every page — that row does not carry it any more, so the
// second shape has nothing to draw and is gone with it.

// The two captions live with the two states, in the hook — the small beacon in
// the bar and the one in the session's header say the same two words and are
// not in this file.

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

// The owner's way into a listen used to be passed in here as `children` and
// drawn under the artist, inside this stack. It went on 2026-09-18 with
// Miyel's brief: it is a control about the pane and not about the record, it
// was the one thing on the screen in a different voice, and it stood in the
// column the cover has to be able to grow into. It lives under the recents
// now and belongs entirely to HomeNav — this component draws a record and
// nothing else.
//
// `choosing` stood the whole record down while one was picked on the beacon
// itself (2026-09-17); it went with that picker on 2026-10-21, when the
// session became a sheet raised from the Listen bar.
// `emptied` takes the picture out of the slot and leaves the slot. It is the
// middle of the drop: the cover has left the beacon and is on its way down
// into the journal, and for those few hundred milliseconds the beacon is
// holding a space rather than showing a record (Miyel's beacon brief, item
// 4). Everything else stays where it is, so nothing on the screen moves while
// one thing falls across it.
export default function ListeningBeacon({ emptied = false }) {
  const { state, album, artist, art, track, isLive, rated } = useListeningBeacon();
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

  // ── The bars rise and fall, 2026-10-23 ─────────────────────────────────
  // Never appearing or vanishing (Miyel: "I never like when something just
  // appears or disappears. Those horizon bars should rise or fall"). So the
  // floor keeps its places once a listen has said how many there are, and a
  // listen that ends lowers its bars to nothing in those same places rather
  // than taking them away; a bar arriving grows up from the cover's edge
  // (nav.css, beacon-bar-rise).
  const live = isLive && !emptied;
  const [places, setPlaces] = useState(0);
  if (live && rated?.length && rated.length !== places) setPlaces(rated.length);
  const count = live && rated?.length ? rated.length : places;
  const anyRated = live && Boolean(rated?.some(r => r > 0));

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
      </div>
    );
  }

  return (
    <div className="beacon-stage">
      <div className="beacon-card beacon-card--main">
        {/* This carried data-grows="/session" for half an hour on 2026-09-18,
            so the session grew out of the cover. Miyel's next look said the
            move is the other way round: the cover travels to the session's
            header and the sheet rises to meet it, which is one movement
            rather than a sheet unfolding out of a picture that then has to go
            somewhere else anyway. See the note above LANDING_MS in
            HomeNav.js. */}
        <div className={'beacon-art-wrap' + (isLive ? ' beacon-art-wrap--live' : '')}>
          {/* The beacon's own empty state while the drop is under way: a slot
              with nothing in it is a place for something to arrive. */}
          {emptied
            ? <div className="beacon-art-empty" aria-hidden="true" />
            : artUrl
              ? <img src={artUrl} alt={title} className={'beacon-art' + (!isLive ? ' beacon-art--idle' : '')} onError={() => setFailed(artUrl)} />
              : <div className="beacon-art-placeholder">♪</div>
          }
          {/* Only on art, and only while it is grey. Over the ♪ placeholder
              this would be writing on an empty square, and over lit art it
              would be a scrim across the one cover on this site that is
              meant to be in full colour. */}
          {!emptied && !isLive && artUrl && (
            <div className="beacon-idle-overlay"><span>{CAPTION[state]}</span></div>
          )}
          {/* ── The cover wears its listen, 2026-10-23 ───────────────────
              While a listen is open, a bar on the cover's foot for each
              track rated, as tall as its rating, in the record's own order
              and place: every track has a slot across the cover's width and
              one not yet rated draws nothing, so a five-track record fills
              it once it is done (Miyel's beacon brief, and her pick of the
              mockups: "the horizon drawn directly onto the cover"). No
              colour on the newest — the cover in colour already says it is
              live. A shade at the foot of the art only, so white bars read on
              a pale cover. Not HorizonChart, the entry's labelled chart:
              this carries no labels, hearts or titles.

              Retired the same day, her call: nothing sends the ratings, so
              nothing is drawn here until it is turned back on (DECISIONS,
              the bars on the beacon's cover). */}
          {!emptied && artUrl && count > 0 && (
            <div className={'beacon-foot' + (anyRated ? ' beacon-foot--up' : '')} aria-hidden="true">
              <div className="beacon-floor">
                {Array.from({ length: count }, (_, i) => {
                  const r = live ? Number(rated?.[i]) || 0 : 0;
                  return <i key={i} style={{ height: `${(r / 5) * 100}%` }} />;
                })}
              </div>
            </div>
          )}
        </div>
        <div className="beacon-meta">
          {/* The caption, under the record — but only where it is not already
              on it. See the note at the top: greyed art carries its own
              caption and this line would be the second copy of it. Never
              green; the dot beside it is the one thing that lights. */}
          {/* Only where there is no cover to say it on, and only when the
              listen is over. A live beacon says nothing in words at all
              (Miyel, 2026-09-18): "there doesn't need to be a Now logging
              line — the green dot and the coloured album is enough." It is:
              the art is in full colour, the card's shadow deepens, and the
              dot on the mark is lit. Three signals and a caption repeating
              them is the fourth. */}
          {!emptied && !isLive && !artUrl && <div className="beacon-status">{CAPTION[state]}</div>}
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
          {/* Kept on the page while a record is being chosen, and collapsed by
              the stylesheet on the same clock as everything else. They were
              simply removed, which took 187px out of the card in one frame —
              and a card that is suddenly shorter re-centres, so the cover
              *dropped* 59px before it began climbing. Measured 2026-09-18,
              and it is the last of what Miyel kept calling not fluid. */}
          <div className="beacon-track beacon-track--wrap">{title}</div>
          {artist && <div className="beacon-artist">{artist}</div>}
        </div>
      </div>
    </div>
  );
}
