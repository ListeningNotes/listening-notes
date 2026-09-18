// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useRef, useState } from 'react';
import { Heart, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { ContentsStrip } from './RecordContents';
import { colors } from '../../../library/sitewide_visuals';
import StarRating from '../StarRating';

// Step 1 — one track at a time. The name and number at the top, the stars,
// the note, and a way to the next one.
//
// This used to be every track as an expandable row in one scrolling list,
// which is the worst thing on a phone: a long column of rows with a text
// field opening somewhere in the middle of it, the keyboard covering the
// rest. One track per screen matches the pace of the record — you are on
// track four, so track four is what is on screen. Twelve small moments
// instead of one long list. It turned out to be better on a desktop too.
//
// Moving between tracks is the arrows, the strip, or a swipe. The strip is the
// horizon being built: one column per track, its bar rising as it is rated,
// its title under it the way the entry page writes them, and a dot that is
// empty until something is written, filled once it is, and lit for the track
// on screen. It is how you see where you are on a record, and how you get
// back to an earlier song by name rather than by counting.
//
// The step is not skippable — the track notes are what the journal is built
// on — but nothing here insists on a note for every song. A swipe or the
// right caret on the last track goes on to the notes; on the first track the
// other way goes back to the album, so the whole listen is one continuous
// swipe. The quiet link under the carets is for leaving the list early.

// How far a finger has to travel sideways to turn the page, and how much
// more sideways than up-and-down it has to be. A scroll through a long note
// drifts a few pixels sideways and must not change the track.
const SWIPE_PX = 56;
const SWIPE_RATIO = 1.5;

export default function TrackNotes({
  tracks,
  tracksLoading,
  trackNotes,
  setTrackNotes,
  trackRatings,
  setTrackRatings,
  trackFavorites,
  setTrackFavorites,
  openTrack,
  setOpenTrack,
  onPrev,
  onNext,
}) {
  const list = tracks || [];
  const count = list.length;
  const i = Math.min(Math.max(0, openTrack || 0), Math.max(0, count - 1));
  const t = list[i];

  // Which way the last turn went, so the card slides in from the right going
  // forward and from the left coming back — the same language as the steps.
  const [dir, setDir] = useState(1);
  const textRef = useRef(null);
  const touch = useRef(null);

  function goTo(n) {
    if (n < 0) { onPrev?.(); return; }
    if (n >= count) { onNext(); return; }
    if (n === i) return;
    setDir(n > i ? 1 : -1);
    setOpenTrack(n);
  }

  // A mouse and a keyboard want the cursor in the note the moment a track
  // opens. A phone does not: focusing pops the keyboard up over the track you
  // have just arrived at, on every swipe.
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
    if (window.matchMedia?.('(pointer: fine)').matches) el.focus({ preventScroll: true });
  }, [i, count]);

  function onTouchStart(e) {
    const p = e.touches[0];
    touch.current = { x: p.clientX, y: p.clientY };
  }
  function onTouchEnd(e) {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const p = e.changedTouches[0];
    const dx = p.clientX - start.x;
    const dy = p.clientY - start.y;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * SWIPE_RATIO) return;
    goTo(dx < 0 ? i + 1 : i - 1);
  }

  if (tracksLoading && !tracks) {
    return (
      <div>
        <span className="ses-label">Tracks</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
          {[...Array(6)].map((_, k) => (
            <div key={k} className="ses-skel" style={{ animationDelay: `${k * 0.06}s` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!count) {
    return (
      <div>
        <span className="ses-label">Tracks</span>
        <p className="ses-prose" style={{ color: 'var(--ink-soft)', marginTop: 18 }}>
          No tracklist found for this record. Go on to the album notes.
        </p>
        <div style={{ marginTop: 28 }}>
          <button type="button" className="ses-btn ses-btn--primary" onClick={onNext}>Continue →</button>
        </div>
      </div>
    );
  }

  const fav = !!trackFavorites?.[i];
  const last = i === count - 1;

  return (
    <div className="ses-track" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* "Track 3 of 10" and the running time were here until 2026-09-18.
          Both went for the same reason: the strip under them already draws
          every track with the one you are on lit, so the count is a sentence
          about a picture you are looking at — and a song's length is a fact
          about the record rather than anything you are deciding. Miyel:
          "it's intuitive… it will look cleaner." */}

      {/* The strip, shared with the contents screen — the same picture of
          the record, and the same taps. Unrated tracks are stubs here rather
          than empty slots: there the bars are an invitation, here they are a
          picture of how far you have got. */}
      <ContentsStrip
        tracks={list}
        trackRatings={trackRatings}
        trackFavorites={trackFavorites}
        trackNotes={trackNotes}
        current={i}
        onPick={goTo}
      />

      {/* Keyed on the track so each one mounts fresh and slides in. */}
      <div key={i} className={`ses-turn${dir < 0 ? ' ses-turn--back' : ''}`}>
        <h2 className="ses-title">{t.title}</h2>

        <div className="ses-track-marks">
          <StarRating value={trackRatings[i] || 0} onChange={v => setTrackRatings(prev => ({ ...prev, [i]: v }))} size={32} />
          {/* Favourite is deliberately separate from the rating — a song can
              be the one you keep returning to without being the best on the
              record. Filled once it is one, outline while it isn't. */}
          <button
            type="button"
            className="ses-heart"
            onClick={() => setTrackFavorites(prev => ({ ...prev, [i]: !prev[i] }))}
            title={fav ? 'Remove from favourites' : 'Mark as a favourite song'}
            aria-label={fav ? 'Remove from favourites' : 'Mark as a favourite song'}
            aria-pressed={fav}
            style={{ color: fav ? colors.fav : undefined }}
          >
            <Heart size={24} weight={fav ? 'fill' : 'regular'} />
          </button>
        </div>

        <textarea
          ref={textRef}
          className="ses-textarea"
          value={trackNotes[i] || ''}
          onChange={e => {
            setTrackNotes(prev => ({ ...prev, [i]: e.target.value }));
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          placeholder="Notes for this track…"
          rows={5}
        />
      </div>

      {/* The same small round caret the rest of the site turns pages with. */}
      <div className="ses-track-nav">
        <button type="button" className="ses-caret" onClick={() => goTo(i - 1)} aria-label={i === 0 ? 'Back to the album' : 'Previous track'}>
          <CaretLeft size={16} weight="bold" aria-hidden="true" />
        </button>
        <button type="button" className="ses-caret" onClick={() => goTo(i + 1)} aria-label={last ? 'On to the album notes' : 'Next track'}>
          <CaretRight size={16} weight="bold" aria-hidden="true" />
        </button>
      </div>

      <div className="ses-center" style={{ marginTop: 22 }}>
        <button type="button" className="ses-quiet" onClick={onNext}>Album notes →</button>
      </div>
    </div>
  );
}
