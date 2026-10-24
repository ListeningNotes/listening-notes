// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// The stars inside a listen: the album's score, and a track's.
//
// ── Drag, not aim ─────────────────────────────────────────────────────────
// It was five stars each split down the middle, with a click handler on every
// half. Reading that was fine; pressing it was aiming — the real target is
// half a star wide, seven pixels at the size a tracklist uses, against the
// forty-odd a fingertip covers. The halves grew invisible hit areas to cope,
// which helped and left the underlying problem: picking three and a half
// stars meant landing on a specific sliver.
//
// So the row is one control now and you slide along it, which is the dial the
// entry's editor got on 2026-09-17 and the thing Miyel asked for here —
// "the same mechanics as the track editing we did before where you can drag
// them if you need to. I liked that. I think it was clean."
//
// The maths is `valueAt` from that dial, deliberately identical: half steps,
// and the sliver left of the first half reads as none, so the way to clear a
// rating is to drag off the left end of it. That replaces the old press-the-
// same-star-again, which nobody could have guessed at and which a drag makes
// unnecessary.
//
// ── Pointer events, and why ───────────────────────────────────────────────
// One set of handlers covers a finger, a trackpad and a mouse, and
// setPointerCapture keeps the drag alive once the finger leaves the row —
// which it will, because a thumb overshoots.
//
// ── A finger going up and down is a scroll, 2026-09-29 ────────────────────
// It was `touch-action: none`, and the row set its value the moment a finger
// landed. With every track a row in one list (Miyel's brief, *the session
// becomes one screen*) that made the list unscrollable by its right-hand
// third: a thumb coming down to scroll landed on a star row, the row took it,
// and the stars ran right while the page stood still — "the stars moving
// right, right, right, while you scroll." Locking every row until pressed
// answered it for an hour and was "super awkward" the other way.
//
// So the row now waits to see what a finger means. `touch-action: pan-y`
// hands anything up-and-down to the browser as a scroll; a movement that is
// plainly sideways becomes the drag, captured and followed as before; and a
// press that goes nowhere is a tap, set where it lifted. Nothing is set on
// the way down any more, which is the whole change.
//
// ── The stars come up to meet the thumb, 2026-10-17 ───────────────────────
// Miyel, and a tester before her: rating a track "is difficult… it's too
// small. It's too hard to switch between half and full stars." A track's
// stars are sixteen pixels and a half star is eleven pixels of thumb travel,
// under the thumb that is doing the travelling. Her idea: "a magnifying
// screen, almost like a pop-up that's big so that you can accurately choose
// the stars… only there when your thumb is on the stars." So on a touch
// screen, once a finger has said it means the stars — sliding along them, or
// resting on them a moment — the five stars stand up large over it, clear of
// the thumb, and the big ones are the control: the star over the thumb is the
// rating. They go the moment the finger lifts.
// A mouse never sees them — a pointer is already precise, and has the hover.
//
// ── The big ones, not the small, 2026-10-17 ──────────────────────────────
// The first build only showed the rating large and still read it off how far
// the thumb had travelled from where it landed on the small row. Miyel, on
// her phone the same evening: "it is following my thumb on small stars not
// the bigger view… the screen scrolls up and down while I try to assign
// stars, I can't even get to 5 stars because my thumb hits the side of the
// page" — a track's stars sit at the right edge, and counting from there ran
// five stars off the screen. So the big stars stand centred, as wide as the
// screen allows, and the thumb is read against them; the big star over the
// thumb is filled to the half it is on. And while they are up the page holds
// still: the gesture is the rating's until the finger lifts. A thumb that
// rested by mistake leaves by moving well up or down, and sets nothing.

// The stars at the size they stand up at — as big as the screen's width
// allows, up to this — and the room between and round them.
const BIG_MOST = 56;
const BIG_GAP = 10;
const BIG_PAD = 14;
const EDGE = 12;
// How long a finger rests on the stars before they come up without a slide.
// Long enough that a thumb landing on a row on its way to scrolling the list
// does not raise them; short enough to feel like a response.
//
// ── Up at the press, 2026-10-23 ──────────────────────────────────────────
// Miyel: "can stars magnify right when pressed? I think there's a bit of a
// delay." They stand up the moment a finger lands now, and this is how long
// they stay only a picture: a thumb that goes up or down in that time was
// scrolling the list, and they sit down and let it; one that lifts was a tap
// and sets the small star it tapped, as a tap always has. Past it, a rest:
// the big stars are the control and the page holds still.
const REST_MS = 220;
// How far up or down a rested thumb moves to put the big stars away unset.
const LEAVE_PX = 40;

// What the row is worth at this point along it.
function valueAt(clientX, row) {
  if (!row) return 0;
  const box = row.getBoundingClientRect();
  const along = (clientX - box.left) / box.width;
  const raw = Math.round(along * 10) / 2;
  return Math.min(5, Math.max(0, raw));
}

// What the big stars are worth under a thumb at this point: filled to the
// half of the star it is over, so the right half of the third star is three
// and its left half two and a half; nothing left of the first, five past
// the last.
function valueOn(clientX, span) {
  const along = (clientX - span.left) / span.width;
  return Math.min(5, Math.max(0, Math.ceil(along * 10) / 2));
}

// `roomy` is the same stars with a thumb-sized row under them: the height
// comes from padding with a matching negative margin, so the row still
// occupies what it did and the stars stay the size they were.
// `ghost` is the average of the track ratings, drawn into the row rather than
// written out as a line of type above it (Miyel, 2026-09-18). Two things, and
// they are two because one of them is easy to read and the other is exact:
//
//   the fill — pale gold up to the average, on an empty row. What it is at a
//   glance.
//   the tick — a hairline under the row at the average's own position. Where
//   it is precisely, and the only thing left once a score is set over it.
//
// **The fill is not rounded to half stars.** It was, for an hour, and Miyel
// caught what that costs: an average of 4.89 drew as four and a half, which
// is the one reading that would have changed her mind about giving it a five.
// A score snaps to halves because it is being *chosen*; an average does not,
// because it is being *read* — so 4.89 draws as very nearly five and says so
// without a decimal point.
//
// The tick stays after a rating because the reveal has to keep meaning
// something. It did not, for an hour: the fill only ever showed on an empty
// row, so pressing reveal with a score already given did nothing at all, and
// Miyel found it. Rating blind and then checking whether it matched is the
// whole reason this is behind a press.
export default function StarRating({ value, onChange, size = 18, roomy = false, ghost = 0 }) {
  const row = useRef(null);
  // A ref, not state: the timer that raises the stars on a rest has to read
  // it as it is, not as it was when the timer was set.
  const dragging = useRef(false);
  // What a mouse is pointing at, for the preview a pointer can afford and a
  // finger cannot. Null on a touch screen, where the only preview is the drag
  // itself.
  const [hover, setHover] = useState(null);
  // The stars standing up over a thumb, while they are (below).
  const [loupe, setLoupe] = useState(null);
  const display = hover ?? loupe?.showing ?? value;
  // The fill goes the moment there is something real in the row — a hint
  // under an answer is in the way. The tick stays, because a hairline under a
  // row of stars is a second fact beside them rather than a smudge on them.
  const showing = !display && ghost > 0 ? ghost : 0;

  const reach = roomy ? Math.max(10, Math.round((44 - size) / 2)) : 0;

  const set = clientX => {
    const next = valueAt(clientX, row.current);
    if (next !== value) onChange(next);
  };

  // Where the finger landed, until it has said whether it is a tap, a drag
  // along the row, or a scroll — which the browser takes, and tells us of
  // with a pointercancel.
  const press = useRef(null);
  const SIDEWAYS = 6;
  const STILL = 8;

  // ── The stars standing up over the thumb ─────────────────────────────────
  // `zoom` is where the big stars run across the screen, which is what a
  // thumb is read against while they are up. `loupe` is where they are drawn
  // and, while they came up on a rest and nothing is set yet, the rating they
  // show. A rest only shows: it is set when the finger lifts.
  const zoom = useRef(null);
  const resting = useRef(null);
  // Up, and still inside REST_MS: a picture only, the page free to scroll.
  const fresh = useRef(false);
  useEffect(() => () => clearTimeout(resting.current), []);
  const standUp = (y, x, show = true) => {
    const across = window.innerWidth;
    const big = Math.max(32, Math.min(BIG_MOST, Math.floor((across - 2 * EDGE - 2 * BIG_PAD - 4 * BIG_GAP) / 5)));
    const width = 5 * big + 4 * BIG_GAP + 2 * BIG_PAD;
    const height = big + 2 * BIG_PAD;
    const left = Math.round((across - width) / 2);
    // Over the thumb with room for it; under it only where there is no room
    // above, which is a row at the very top of the screen.
    let top = y - 72 - height;
    if (top < EDGE) top = y + 56;
    // The stars themselves, inside the hairline and the padding.
    zoom.current = { left: left + 1 + BIG_PAD, width: 5 * big + 4 * BIG_GAP };
    // At the press itself they show the rating as it stands; the star over
    // the thumb only once the finger has rested.
    setLoupe({ left, top, big, showing: show ? valueOn(x, zoom.current) : null });
  };
  const sitDown = () => {
    clearTimeout(resting.current);
    fresh.current = false;
    zoom.current = null;
    setLoupe(null);
  };
  const slide = clientX => {
    const next = valueOn(clientX, zoom.current);
    if (next !== value) onChange(next);
  };

  // ── The page holds still while the stars are being set ──────────────────
  // `touch-action: pan-y` gives the browser every vertical movement, and a
  // thumb sliding along five stars is never perfectly level — the page
  // scrolled under the rating (Miyel, 2026-10-17). So a touch on the row that
  // starts sideways, or one the big stars are up for, is the rating's: its
  // moves are refused to the page until it lifts. A touch that starts up or
  // down is still a scroll. Listened for here and not through React, whose
  // touch listeners cannot refuse anything.
  useEffect(() => {
    const el = row.current;
    if (!el) return undefined;
    let from = null;
    let ours = false;
    const begin = e => {
      const t = e.touches[0];
      from = t ? { x: t.clientX, y: t.clientY } : null;
      ours = false;
    };
    const hold = e => {
      if (dragging.current || (zoom.current && !fresh.current)) ours = true;
      else if (from && e.touches.length === 1) {
        const t = e.touches[0];
        const dx = Math.abs(t.clientX - from.x);
        if (dx > 3 && dx > Math.abs(t.clientY - from.y)) ours = true;
      }
      if (ours && e.cancelable) e.preventDefault();
    };
    el.addEventListener('touchstart', begin, { passive: true });
    el.addEventListener('touchmove', hold, { passive: false });
    return () => {
      el.removeEventListener('touchstart', begin);
      el.removeEventListener('touchmove', hold);
    };
  }, []);

  const down = e => {
    if (e.button > 0) return;
    const touch = e.pointerType !== 'mouse';
    press.current = { x: e.clientX, y: e.clientY, at: { x: e.clientX, y: e.clientY }, id: e.pointerId, target: e.currentTarget, touch };
    setHover(null);
    clearTimeout(resting.current);
    if (!touch) return;
    standUp(e.clientY, e.clientX, false);
    fresh.current = true;
    resting.current = setTimeout(() => {
      fresh.current = false;
      const p = press.current;
      if (!p || dragging.current || !zoom.current) return;
      // A rest: the big star over the thumb.
      const shown = valueOn(p.at.x, zoom.current);
      setLoupe(l => (l ? { ...l, showing: shown } : l));
    }, REST_MS);
  };
  const move = e => {
    if (press.current) press.current.at = { x: e.clientX, y: e.clientY };
    if (dragging.current) {
      if (zoom.current) slide(e.clientX); else set(e.clientX);
      return;
    }
    // Up on a rest, and nothing set yet: they show the star over the thumb;
    // a move well up or down puts them away; a move sideways sets as it goes.
    const r = press.current;
    if (r && zoom.current) {
      const dx = e.clientX - r.x;
      const dy = e.clientY - r.y;
      // Up at the press and going up or down at once: a scroll. They sit
      // down and the list moves.
      if (fresh.current && Math.abs(dy) > STILL && Math.abs(dy) > Math.abs(dx)) { press.current = null; sitDown(); return; }
      if (Math.abs(dy) > LEAVE_PX && Math.abs(dy) > Math.abs(dx)) { press.current = null; sitDown(); return; }
      if (Math.abs(dx) > SIDEWAYS) {
        try { r.target.setPointerCapture?.(r.id); } catch { /* the slide still works */ }
        dragging.current = true;
        setLoupe(l => l && { ...l, showing: null });
        slide(e.clientX);
        return;
      }
      const shown = valueOn(e.clientX, zoom.current);
      setLoupe(l => (l && l.showing !== shown ? { ...l, showing: shown } : l));
      return;
    }
    let p = press.current;
    // A press that was let go somewhere else never told this row: the row
    // only hears a pointerup that lands on it. Left standing, the next mouse
    // that merely crossed the row read as that press still travelling, and
    // set the rating by passing over it — Miyel, 2026-09-30: "other tracks
    // went down in rating when I didn't even click near them." A mouse with
    // no button down is not pressing, whatever was remembered.
    if (p && e.pointerType === 'mouse' && e.buttons === 0) { press.current = null; p = null; }
    if (p) {
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      if (Math.abs(dx) > SIDEWAYS && Math.abs(dx) > Math.abs(dy)) {
        // Capture is an improvement, not a requirement: it keeps the drag
        // alive when the finger leaves the row. It can throw — a pointer
        // already gone has no id to capture — and an exception here would
        // take the drag with it.
        try { p.target.setPointerCapture?.(p.id); } catch { /* the drag still works */ }
        dragging.current = true;
        clearTimeout(resting.current);
        if (!p.touch) set(e.clientX);
        // Up now, and read against at once: the star over the thumb.
        else {
          standUp(p.y, e.clientX);
          setLoupe(l => l && { ...l, showing: null });
          slide(e.clientX);
        }
      }
      return;
    }
    if (e.pointerType === 'mouse') setHover(valueAt(e.clientX, row.current));
  };
  const up = e => {
    const p = press.current;
    const span = zoom.current;
    // Let go inside REST_MS: a tap, whatever is drawn over it.
    const tapped = fresh.current;
    press.current = null;
    sitDown();
    if (dragging.current) { dragging.current = false; return; }
    if (!p) return;
    // Up on a rest and let go without a slide: the star over the thumb.
    if (span && !tapped) { const next = valueOn(e.clientX, span); if (next !== value) onChange(next); return; }
    if (Math.abs(e.clientX - p.x) < STILL && Math.abs(e.clientY - p.y) < STILL) set(e.clientX);
  };
  const cancel = () => { press.current = null; dragging.current = false; sitDown(); };

  return (
    <div
      ref={row}
      role="slider"
      tabIndex={0}
      aria-label="Rating"
      aria-valuemin={0}
      aria-valuemax={5}
      aria-valuenow={value}
      aria-valuetext={value
        ? `${value} out of 5${ghost ? `. Your tracks average ${ghost}.` : ''}`
        : ghost ? `Not rated. Your tracks average ${ghost} out of 5.` : 'Not rated'}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={cancel}
      onPointerLeave={() => { setHover(null); if (!dragging.current) { press.current = null; if (zoom.current) sitDown(); } }}
      onKeyDown={e => {
        // The keyboard gets the same half steps the finger does.
        if (e.key === 'ArrowRight') { e.preventDefault(); onChange(Math.min(5, (value || 0) + 0.5)); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); onChange(Math.max(0, (value || 0) - 0.5)); }
      }}
      style={{
        position: 'relative',
        display: 'flex',
        gap: roomy ? 7 : 1,
        touchAction: 'pan-y',
        cursor: 'pointer',
        padding: roomy ? `${reach}px ${Math.round(reach / 3)}px` : 0,
        margin: roomy ? `-${reach}px -${Math.round(reach / 3)}px` : 0,
        width: 'fit-content',
        outline: 'none',
      }}
    >
      {/* The tick. Placed by the same sum `valueAt` reads a drag with — the
          average over five, along the row — so it stands exactly where
          dragging to that number would put your thumb. */}
      {ghost > 0 && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: `${(ghost / 5) * 100}%`,
            bottom: -7,
            width: 2,
            height: 7,
            marginLeft: -1,
            borderRadius: 1,
            background: '#E8B84B',
            pointerEvents: 'none',
          }}
        />
      )}
      {[1, 2, 3, 4, 5].map(n => {
        const filled = n <= display;
        const half = !filled && display >= n - 0.5 && display < n;
        return (
          <span key={n} style={{ position: 'relative', display: 'inline-block', width: size, height: size, flexShrink: 0 }}>
            <span style={{ position: 'absolute', inset: 0, color: '#d0ccc5', fontSize: size, lineHeight: 1, userSelect: 'none' }}>★</span>
            {(filled || half) && (
              <span style={{ position: 'absolute', inset: 0, overflow: 'hidden', width: filled ? size : size / 2, color: '#E8B84B', fontSize: size, lineHeight: 1, userSelect: 'none' }}>★</span>
            )}
            {/* The hint, in the same gold at half weight — the same colour so
                it is plainly the same measure, and plainly lighter than a
                score that has been given. It was 0.28 for an hour and Miyel
                could barely see it; the thing that keeps a hint from reading
                as an answer is that you asked for it and that it leaves the
                moment you rate, not that it is hard to make out. */}
            {!filled && !half && showing > n - 1 && (
              <span style={{
                position: 'absolute', inset: 0, overflow: 'hidden',
                /* Exactly as far as the average reaches into this star. */
                width: Math.min(1, showing - (n - 1)) * size,
                color: '#E8B84B', opacity: 0.5,
                fontSize: size, lineHeight: 1, userSelect: 'none', pointerEvents: 'none',
              }}>★</span>
            )}
          </span>
        );
      })}

      {/* The stars, stood up over the thumb. Drawn on the body, not in the
          row: the row lives inside sheets that scroll and are pinned to the
          screen, and these have to stand still over all of it. */}
      {loupe && createPortal(
        <div className="ses-loupe" aria-hidden="true" style={{ left: loupe.left, top: loupe.top, padding: BIG_PAD, gap: BIG_GAP }}>
          {[1, 2, 3, 4, 5].map(n => {
            const filled = n <= display;
            const half = !filled && display >= n - 0.5 && display < n;
            return (
              <span key={n} style={{ position: 'relative', display: 'inline-block', width: loupe.big, height: loupe.big, flexShrink: 0 }}>
                <span style={{ position: 'absolute', inset: 0, color: '#d0ccc5', fontSize: loupe.big, lineHeight: 1 }}>★</span>
                {(filled || half) && (
                  <span style={{ position: 'absolute', inset: 0, overflow: 'hidden', width: filled ? loupe.big : loupe.big / 2, color: '#E8B84B', fontSize: loupe.big, lineHeight: 1 }}>★</span>
                )}
              </span>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}
