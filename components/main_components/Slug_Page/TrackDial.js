// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// components/main_components/Slug_Page/TrackDial.js
// One track, full screen, while you decide what it is worth.
//
// ── It unfolds in the row, it does not float over it ──────────────────────
// This was a centred sheet over a dimmed page for about an hour on 2026-09-17,
// and DECISIONS had already ruled that out twice: "a control opens where it
// belongs, not floating in the middle of a darkened screen — twice in a week a
// popup was built and taken back out, so it is a rule". The replacement was
// written down too, and written about this exact place: "pushing content down
// is not the problem to avoid. A form unfolding in the tracklist shoves
// everything below it down. That is what leaving room for something looks
// like; the page grows and you scroll."
//
// So the row opens into it. Nothing is covered, there is no scrim to dismiss,
// and the track you are rating stays where it was in the list with its
// neighbours still around it — which is most of what "seamless" meant.
//
// ── Why a screen for one number ───────────────────────────────────────────
// A track's stars were a 14px row split into halves, so the real target was
// seven pixels across. Growing the hit areas fixed the *missing* (2026-09-17)
// and left the other half of the problem, which Miyel named: "it's still
// really easy to mis-click a half star and not really see it." A target you
// can hit is not the same as a value you can see — at that size three and a
// half stars and four look identical at arm's length, and the only way to
// check your own answer is to lean in.
//
// So the row stops being the control. Press anywhere near it and the track
// comes up on its own screen, at a size where half a star is obvious and the
// number is printed beside it in words. It is the session's *one track per
// screen* arriving on the entry page, which is where a correction happens.
//
// ── Dragging and pressing are the same gesture ────────────────────────────
// The whole row is one surface and the value is read off where your finger
// is, so a press is a drag of no distance. That is what makes half stars
// reachable without aiming: you land anywhere, see what you got, and slide
// until it says what you meant. Below the first half-star it reads zero,
// because taking a rating off has to be as easy as putting one on.
//
// ── Why it is not rendered where it is opened ─────────────────────────────
// The entry layer is fixed at z-index 200 and owns sideways as "the next
// record". A full-screen thing inside the tracklist would be underneath it,
// and — worse — a drag across the stars would be read as a swipe and land you
// on another album halfway through rating a song. So the entry page renders
// this beside .ln-screens, inside the layer, and marks itself busy while it is
// open, which is the same guard Credit uses (LayerEntry, .ln-busy).

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Heart, X } from '@phosphor-icons/react';

const STARS = [1, 2, 3, 4, 5];

// What the row is worth at this point along it. Half-star steps, and anything
// left of the first half reads as none — so the leftmost sliver clears it.
function valueAt(clientX, row) {
  if (!row) return 0;
  const box = row.getBoundingClientRect();
  const along = (clientX - box.left) / box.width;
  const raw = Math.round(along * 10) / 2;
  return Math.min(5, Math.max(0, raw));
}

// ── Nothing changes until it is accepted ──────────────────────────────────
// The row above keeps the rating it had while this is open, and the dial holds
// the new one to itself until the tick (Miyel, 2026-09-17). Dragging used to
// rewrite the row live, which meant opening a track to *look* at it was
// already editing it — "I'm not actually trying to edit these, I'm trying to
// make sure I don't change anything."
//
// So there are two values on screen at once: what the track is, still up in
// its row, and what it would become, down here at four times the size. The
// tick takes the second one. The cross throws it away.
//
// **The tick is not Save.** It settles this track's stars into the correction
// being written; the entry is still saved by the bar at the foot, like every
// other field. That is the one thing this pair has to not lie about.
export default function TrackDial({ track, rating = 0, favorite = false, onField, onClose }) {
  const row = useRef(null);
  const [dragging, setDragging] = useState(false);
  // Seeded once, on open. Deliberately not synced to the props afterwards:
  // the whole point is that the two can differ until the tick.
  const [stars, setStars] = useState(Number(rating) || 0);
  const [loved, setLoved] = useState(!!favorite);

  const accept = useCallback(() => {
    if (stars !== (Number(rating) || 0)) onField('rating', stars);
    if (loved !== !!favorite) onField('favorite', loved);
    onClose();
  }, [stars, loved, rating, favorite, onField, onClose]);

  // Pointer events rather than touch: one set of handlers covers a finger, a
  // trackpad and a mouse, and setPointerCapture keeps the drag alive when the
  // finger leaves the row — which it will, because a thumb overshoots.
  const down = e => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDragging(true);
    setStars(valueAt(e.clientX, row.current));
  };
  const move = e => { if (dragging) setStars(valueAt(e.clientX, row.current)); };
  const up = () => setDragging(false);

  useEffect(() => {
    const key = e => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
      if (e.key === 'Enter') { e.preventDefault(); accept(); return; }
      // The keyboard gets the same half steps the finger does.
      if (e.key === 'ArrowRight') { e.preventDefault(); setStars(v => Math.min(5, v + 0.5)); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); setStars(v => Math.max(0, v - 0.5)); }
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [onClose, accept]);

  const said = stars === 0 ? 'Not rated' : `${stars % 1 ? stars.toFixed(1) : stars} ${stars === 1 ? 'star' : 'stars'}`;

  return (
    <div className="td-open" aria-label={`Rate ${track?.name || 'this track'}`}>
      {/* One line: the heart, the stars, and the two that settle it, in the
          order the row upstairs has them. Nothing is a pill (Miyel,
          2026-09-17) — a mark you press should look like the mark, not like a
          mark in a container. */}
      <div className="td-controls">
        <button
          type="button"
          className={'td-heart' + (loved ? ' td-heart--on' : '')}
          onClick={() => setLoved(v => !v)}
          aria-pressed={loved}
          aria-label="Favourite"
        >
          <Heart size={32} weight={loved ? 'fill' : 'regular'} aria-hidden="true" />
        </button>

        {/* One surface, not five buttons: the value is where your finger is. */}
        <div
          ref={row}
          className={'td-row' + (dragging ? ' td-row--held' : '')}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          role="slider"
          tabIndex={0}
          aria-label="Stars"
          aria-valuemin={0}
          aria-valuemax={5}
          aria-valuenow={stars}
          /* The words only for a screen reader now: the stars say it on
             screen and printing it underneath was the same answer twice
             (Miyel, 2026-09-17). */
          aria-valuetext={said}
        >
          {STARS.map(n => {
            const full = stars >= n;
            const half = !full && stars >= n - 0.5;
            return (
              <span key={n} className="td-star" aria-hidden="true">
                <span className="td-star-off">★</span>
                {(full || half) && (
                  <span className="td-star-on" style={{ width: full ? '100%' : '50%' }}>★</span>
                )}
              </span>
            );
          })}
        </div>

        {/* Right of the stars, and apart from each other: they do opposite
            things and a thumb should not be able to mean one and hit the
            other. They settle the stars, not the entry — the bar at the foot
            still saves that. */}
        <span className="td-acts">
          <button type="button" className="td-act" onClick={onClose} aria-label="Leave the rating as it was">
            <X size={17} weight="bold" aria-hidden="true" />
          </button>
          <button type="button" className="td-act td-act--yes" onClick={accept} aria-label="Use this rating">
            <Check size={19} weight="bold" aria-hidden="true" />
          </button>
        </span>
      </div>

    </div>
  );
}
