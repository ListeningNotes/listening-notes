// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useRef, useState } from 'react';
import { Heart, CaretLeft, CaretRight } from '@phosphor-icons/react';
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

// ── The strip ─────────────────────────────────────────────────────────────
// Every track as a bar, the one you are on lit, the ones you have said
// something about marked underneath. It lived in RecordContents.js for an
// hour, shared: the contents screen drew it with every track as an empty slot
// at full height, which is what the brief asked for and which read on the
// screen as a horizon chart with no data in it (Miyel, 2026-09-18: "remove
// fake horizon from overview").
//
// So it is back where it started, with one caller. The bars mean something
// here — they are a picture of how far through the record you are and what
// you thought of it as you went — and they meant nothing on a screen you
// reach before hearing a note.
function Strip({
  tracks, trackRatings = {}, trackFavorites = {}, trackNotes = {},
  current = -1, onPick, onSliding,
}) {
  const list = tracks || [];
  // ── Sliding along it ─────────────────────────────────────────────────────
  // Press the strip and drag, and the track under your finger is the one on
  // screen — the note, the stars and the heart underneath all following.
  // Miyel, 2026-09-18: "smooth scrolling across the track horizon builder, to
  // scroll through tracks the same way you can lock and scroll through stars,
  // without switching screens."
  //
  // It is the same gesture the stars already use and it earns the same guard,
  // one column up: a drag that begins here belongs here, and must not also
  // turn the page or pull the sheet down. See `data-slide` below.
  //
  // The columns are measured once, at the press, rather than worked out from
  // the geometry — the strip has a 26px indent and a 3px gap and the columns
  // are `flex: 1`, so the arithmetic would be three numbers kept in step with
  // a stylesheet by hand. Rects also give the gaps for free: a finger between
  // two columns is inside neither, and the last column that *was* hit stays
  // lit rather than flickering.
  //
  // Past either end the nearest track stays chosen. Sliding off the right of a
  // record should not walk you into the album notes — leaving the list is what
  // the carets and the swipe are for, and a gesture that overshoots is not a
  // decision to move on.
  const stripRef = useRef(null);
  const boxesRef = useRef([]);
  const slidingRef = useRef(false);
  const pickRef = useRef(onPick);
  useEffect(() => { pickRef.current = onPick; }, [onPick]);

  function pickAt(x) {
    const boxes = boxesRef.current;
    if (!boxes.length) return;
    let k = boxes.findIndex(b => x >= b.left && x <= b.right);
    if (k < 0) {
      if (x < boxes[0].left) k = 0;
      else if (x > boxes[boxes.length - 1].right) k = boxes.length - 1;
      else return;            // in a gap: leave whatever is open, open
    }
    pickRef.current?.(k);
  }

  function slideStart(event) {
    const el = stripRef.current;
    if (!el || event.button > 0) return;
    boxesRef.current = [...el.children].map(c => c.getBoundingClientRect());
    slidingRef.current = true;
    onSliding?.(true);
    // Keeps the drag on this row even when the finger wanders off it — which
    // it will, because the strip is 56px tall and a slide along it is not a
    // careful movement. In a try because capturing a pointer the browser did
    // not issue throws, which is only reachable from synthetic events but
    // costs nothing to survive.
    try { el.setPointerCapture?.(event.pointerId); } catch { /* not a real pointer */ }
    pickAt(event.clientX);
  }
  function slideMove(event) {
    if (!slidingRef.current) return;
    pickAt(event.clientX);
  }
  function slideEnd() {
    if (!slidingRef.current) return;
    slidingRef.current = false;
    onSliding?.(false);
  }
  useEffect(() => () => onSliding?.(false), [onSliding]);

  return (
    <div
      ref={stripRef}
      className={'ses-strip' + (list.length > 18 ? ' ses-strip--dense' : '')}
      role="tablist"
      aria-label="Tracks"
      /* What the stars say with role="slider": a drag that starts here is
         this row's, not the page's. The session's own swipe and the layer's
         pull both stand down for it — a tablist cannot claim to be a slider,
         so it says the same thing in its own words. */
      data-slide=""
      onPointerDown={slideStart}
      onPointerMove={slideMove}
      onPointerUp={slideEnd}
      onPointerCancel={slideEnd}
    >
      {list.map((tr, k) => {
        const r = trackRatings[k] || 0;
        const fav = !!trackFavorites?.[k];
        const covered = !!(trackNotes?.[k]?.trim()) || r > 0 || fav;
        const pct = Math.max(5, (r / 5) * 100);
        const cls = ['ses-strip-col', covered && 'ses-strip-col--done', k === current && 'ses-strip-col--now']
          .filter(Boolean).join(' ');
        return (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={k === current}
            aria-label={`${tr.number || k + 1}. ${tr.title}${r ? ` — ${r} / 5` : ''}`}
            title={`${tr.number || k + 1}. ${tr.title}`}
            className={cls}
            onClick={() => onPick?.(k)}
          >
            <span className="ses-strip-bars">
              {/* A favourite wears its heart above the bar — the entry's
                  horizon does the same — in ink here rather than red, so the
                  strip stays one colour while it is being built. */}
              {fav && (
                <span className="ses-strip-heart" style={{ bottom: `calc(${pct}% + 3px)` }}>
                  <Heart size={9} weight="fill" aria-hidden="true" />
                </span>
              )}
              <span className={'ses-strip-bar' + (r ? ' ses-strip-bar--rated' : '')} style={{ height: `${pct}%` }} />
            </span>
            <span className="ses-strip-dot" aria-hidden="true" />
            <span className="ses-strip-label" aria-hidden="true">
              <span className="ses-strip-title">{tr.title}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}


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
  // While a finger is travelling along the strip the card must not play its
  // turn on every column it passes — a dozen 300ms slides fired a few
  // milliseconds apart is a strobe, not a movement. The card still remounts
  // (it is keyed on the track), it simply arrives without the animation, so
  // what you see is the note changing under a finger rather than a stack of
  // cards being dealt.
  const [sliding, setSliding] = useState(false);
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

  // Sideways here means the next track — except on the stars, where sideways
  // means the rating (Miyel, 2026-09-18). They are the same gesture on the
  // same axis a centimetre apart, and `touch-action: none` on the star row
  // only stops the *browser* panning: these handlers still fire, so dragging
  // from three stars to four also landed you on track four.
  //
  // Asked of where the finger went down rather than of any flag, because that
  // is the whole question: a drag that begins on the stars belongs to the
  // stars until it is let go.
  function onTouchStart(e) {
    if (e.target.closest?.('[role="slider"]')) { touch.current = null; return; }
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
      <Strip
        tracks={list}
        trackRatings={trackRatings}
        trackFavorites={trackFavorites}
        trackNotes={trackNotes}
        current={i}
        onPick={goTo}
        onSliding={setSliding}
      />

      {/* Keyed on the track so each one mounts fresh and slides in. */}
      <div key={i} className={`ses-turn${sliding ? ' ses-turn--still' : dir < 0 ? ' ses-turn--back' : ''}`}>
        {/* ── The title and its marks, on one line ────────────────────────
            They were stacked until 2026-09-18 — the title, then the stars
            under it — which is the one arrangement this site uses nowhere
            else. An entry's tracklist, the archive, the contents screen: all
            of them put the name at the left and what you made of it at the
            right, and Miyel's note was exactly that ("that's the setup on
            every other page of the site").

            What it costs is room. Five stars and a heart take a fixed 170-odd
            pixels out of a phone's width whatever the song is called, so the
            title lives in what is left and wraps when it has to. That is the
            trade and it is the right way round: the marks are the thing you
            came to this screen to set, and a long title reading over two
            lines is a smaller price than a score that moves about.

            So the stars are smaller than they were — 20px rather than 32 —
            and `roomy` buys the height back: a 44px row to drag along,
            drawn at 20. The drag is shorter than it was and every half step
            is still about thirteen pixels, which is a thumb's width of
            travel per half star. */}
        <div className="ses-track-head">
          <h2 className="ses-title ses-title--track">{t.title}</h2>

          <div className="ses-track-marks">
            <StarRating value={trackRatings[i] || 0} onChange={v => setTrackRatings(prev => ({ ...prev, [i]: v }))} size={20} roomy />
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
              <Heart size={20} weight={fav ? 'fill' : 'regular'} />
            </button>
          </div>
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

      {/* The carets, bare. They sat in a bordered circle each until
          2026-09-18 — the same pill the marks on the album screen were in
          until the day before, and out for the same reason: a control is the
          mark, not a mark in a container (DECISIONS, 2026-09-17). Miyel:
          "also remove pill from around left and right carats." Bigger with
          the circle gone, because the circle was doing the work of being
          visible and now the glyph has to.

          The right one is also how the tracks end: on the last track it is
          the way on to the album notes, which is what the quiet "Album notes
          →" under it used to be. That link went the same day — "i think its
          intuitive enough that theyre not needed" — and it is not a loss,
          because the forward swipe reaches the album notes too. */}
      <div className="ses-track-nav">
        <button type="button" className="ses-caret" onClick={() => goTo(i - 1)} aria-label={i === 0 ? 'Back to the album' : 'Previous track'}>
          <CaretLeft size={22} weight="bold" aria-hidden="true" />
        </button>
        <button type="button" className="ses-caret" onClick={() => goTo(i + 1)} aria-label={last ? 'On to the album notes' : 'Next track'}>
          <CaretRight size={22} weight="bold" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
