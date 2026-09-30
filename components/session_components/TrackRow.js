// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/session_components/TrackRow.js
// One track in the session's list: its number, its name, its stars and its
// heart — and, under the name, what has been said about it or the offer to
// say something.
//
// ── The row, 2026-09-29 (Miyel's brief, *the session becomes one screen*) ──
// Rating and hearting happen here, in the list, with a thumb. Nothing opens
// to do either. Under the name:
//
//   rated, nothing written   a quiet *Any notes?*
//   written                  the note itself, in place of the offer
//   not rated                nothing at all
//
// Pressing the offer or the note opens the field right under the track,
// with the keyboard, and it closes again when it is left empty. The brief
// drew this as a sheet over the list, and it was built as one for an hour;
// Miyel on seeing it, 2026-09-29: "the notes field should open in the
// tracklist, not as a popup — you click and it opens right under that track
// with the keyboard open." A field in the middle of the column is what sank
// the list in 2026-09-18, when every row had one; here only the track being
// logged ever has one, and the page lifts it clear of the keyboard the way
// it lifts the album note (app/session/page.js).
//
// ── The track being logged ────────────────────────────────────────────────
// Anything done to a track puts it on air — its name pressed, a star, the
// heart (Miyel, 2026-09-29: "any sort of click on a track counts as lighting
// it as live"). Its number gives way to the live dot and the row takes the
// faintest green; *Add notes* stands under that row alone, so the list never
// reads as a column of questions.
//
// Every row's stars and heart are live. For an hour a row was locked until
// pressed, because the stars took every thumb that came down to scroll; the
// stars now tell a scroll from a tap from a drag themselves (StarRating.js),
// which is the middle Miyel asked for — "sometimes I want to edit stars
// without having to click the track."
//
// ── What a real listen found, 2026-09-30 ──────────────────────────────────
// Miyel, from a desk, an hour into a record: the box stayed open on a track
// after she had moved on; a finished note could only be shut by emptying it;
// and with a list full of notes "it gets hard to open the notes to edit, or
// click to a new track gets very slow". So: the box shuts when the cursor
// leaves it and when the name is pressed again, and when another track
// lights; a written note is a press on any row, lit or not; and the row is
// memoised, so typing in one note redraws one row and not the record.
'use client';
import { memo, useLayoutEffect, useRef } from 'react';
import { Heart } from '@phosphor-icons/react';
import StarRating from './StarRating';
import { colors } from '../../library/sitewide_visuals';

// Every handler takes the row's place in the list, so the list can hand the
// same functions to every row and a row that did not change is not redrawn.
function TrackRow({
  index, track,
  rating = 0, favorite = false, note = '',
  onAir = false,
  noting = false,
  onPress, onRate, onFavorite, onNote, onNoteChange, onNoteShut, onSend = null,
}) {
  const number = track.number || index + 1;
  const title = track.title;
  const written = !!note.trim();
  const offered = onAir && !written && !noting;

  // The cursor goes in as the field arrives, because pressing the offer was
  // asking to write — in the layout pass, while the press is still on the
  // stack, which is the only moment a phone raises its keyboard for it.
  const field = useRef(null);
  useLayoutEffect(() => {
    const el = field.current;
    if (!noting || !el) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(el.value.length, el.value.length);
  }, [noting]);

  return (
    <li className={'ses-row' + (onAir ? ' ses-row--on' : '')}>
      <span className="ses-row-n">
        {onAir
          ? <span className="ses-row-dot" role="img" aria-label="Being logged" />
          : number}
      </span>

      {/* The name is the press that puts the song on air — and, with its
          note box open, the press that shuts the box. A button in nothing
          but name. */}
      <button
        type="button"
        className="ses-row-name"
        onClick={() => (noting ? onNoteShut() : onPress(index))}
        aria-label={`${title}${onAir ? ', being logged' : ' — press to log this track'}`}
      >
        {title}
      </button>

      <div className="ses-row-marks">
        <StarRating value={rating} onChange={v => onRate(index, v)} size={16} roomy />
        {/* Favourite is deliberately separate from the rating — a song can
            be the one you keep returning to without being the best on the
            record. */}
        <button
          type="button"
          className="ses-heart"
          onClick={() => onFavorite(index)}
          title={favorite ? 'Remove from favourites' : 'Mark as a favourite song'}
          aria-label={favorite ? 'Remove from favourites' : 'Mark as a favourite song'}
          aria-pressed={favorite}
          style={{ color: favorite ? colors.fav : undefined }}
        >
          <Heart size={20} weight={favorite ? 'fill' : 'regular'} />
        </button>
      </div>

      {/* ── The line under the name ──────────────────────────────────────
          A written note, on any row: pressing it lights the track and opens
          the box it was written in. On the lit track, two words under it —
          *Add notes* (or *Edit notes*) and *Send track* — both in the
          caption face, centred. The envelope was tried beside the heart (it
          moved the stars), at the end of this line, and under the live dot,
          and none read right; a word cannot be mistaken for anything. */}
      {!noting && (written || onAir) && (
        <div className="ses-row-under">
          {written && (
            <button type="button" className="ses-row-note" onClick={() => onNote(index)} aria-label={`Notes on ${title}: ${note}. Press to edit`}>
              {note}
            </button>
          )}
          {onAir && (
            <div className="ses-row-doors">
              <button type="button" className="ses-row-offer" onClick={() => onNote(index)}>
                {offered ? 'Add notes' : 'Edit notes'}
              </button>
              {onSend && (
                <button type="button" className="ses-row-offer" onClick={() => onSend(track)} aria-label={`Send ${title} to somebody`}>
                  Send track
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* The note, in the same box the album note is written in, under the
          whole row (Miyel, 2026-09-29: "have the track notes match the
          album notes — that box opens"). Grown by layout, never measured —
          see .ses-grow. It shuts when the cursor leaves it: empty, the row
          goes back to offering; written, the words stand where it was. */}
      {noting && (
        <div className="ses-row-under ses-row-under--box">
          <div className="ses-note-box ses-row-box">
            <div className="ses-grow" data-said={note + ' '}>
              <textarea
                ref={field}
                className="ses-textarea"
                value={note}
                onChange={e => onNoteChange(index, e.target.value)}
                onBlur={onNoteShut}
                placeholder="Notes on this track"
                aria-label={`Notes on ${title}`}
                rows={3}
              />
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

export default memo(TrackRow);
