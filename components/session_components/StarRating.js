// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useRef, useState } from 'react';

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
// which it will, because a thumb overshoots. `touch-action: none` because a
// horizontal drag on a phone is otherwise the page deciding to scroll.
//
// A tap still works, and always did: pointerdown sets the value where you
// pressed, so a press with no movement is a press.

// What the row is worth at this point along it.
function valueAt(clientX, row) {
  if (!row) return 0;
  const box = row.getBoundingClientRect();
  const along = (clientX - box.left) / box.width;
  const raw = Math.round(along * 10) / 2;
  return Math.min(5, Math.max(0, raw));
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
  const [dragging, setDragging] = useState(false);
  // What a mouse is pointing at, for the preview a pointer can afford and a
  // finger cannot. Null on a touch screen, where the only preview is the drag
  // itself.
  const [hover, setHover] = useState(null);
  const display = hover ?? value;
  // The fill goes the moment there is something real in the row — a hint
  // under an answer is in the way. The tick stays, because a hairline under a
  // row of stars is a second fact beside them rather than a smudge on them.
  const showing = !display && ghost > 0 ? ghost : 0;

  const reach = roomy ? Math.max(10, Math.round((44 - size) / 2)) : 0;

  const set = clientX => {
    const next = valueAt(clientX, row.current);
    if (next !== value) onChange(next);
  };

  const down = e => {
    e.preventDefault();
    // Capture is an improvement, not a requirement: it keeps the drag alive
    // when the finger leaves the row. It can throw — a pointer that is
    // already gone by the time this runs has no id to capture — and an
    // exception here would take the press with it, so a rating that missed
    // its capture would not register at all.
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* the drag still works */ }
    setDragging(true);
    setHover(null);
    set(e.clientX);
  };
  const move = e => {
    if (dragging) { set(e.clientX); return; }
    if (e.pointerType === 'mouse') setHover(valueAt(e.clientX, row.current));
  };
  const up = () => setDragging(false);

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
      onPointerCancel={up}
      onPointerLeave={() => setHover(null)}
      onKeyDown={e => {
        // The keyboard gets the same half steps the finger does.
        if (e.key === 'ArrowRight') { e.preventDefault(); onChange(Math.min(5, (value || 0) + 0.5)); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); onChange(Math.max(0, (value || 0) - 0.5)); }
      }}
      style={{
        position: 'relative',
        display: 'flex',
        gap: roomy ? 7 : 1,
        touchAction: 'none',
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
    </div>
  );
}
