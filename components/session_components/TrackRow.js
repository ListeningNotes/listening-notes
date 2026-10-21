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
//
// ── Only a note's own words open it, 2026-10-17 ───────────────────────────
// Miyel, after two listens: "if I click on a song, just to click on a song
// to go to it, to highlight it on the beacon or to re-rate it or something,
// it should not open the notes with the keyboard." Add notes, Edit notes and
// the written note itself are the only presses that bring the keyboard up.
// A name, a star or a heart lights the track and puts any other track's
// note away, keyboard and all (letGo, app/session/page.js) — the box used to
// be taken off the screen with the cursor still in it, and iOS kept the
// keyboard up over nothing.
'use client';
import { memo, useLayoutEffect, useRef } from 'react';
import { Heart, PencilSimple } from '@phosphor-icons/react';
import StarRating from './StarRating';
import { colors } from '../../library/sitewide_visuals';

// Every handler takes the row's place in the list, so the list can hand the
// same functions to every row and a row that did not change is not redrawn.
function TrackRow({
  index, track,
  rating = 0, favorite = false, note = '',
  onAir = false,
  noting = false,
  onPress, onRate, onFavorite, onNote, onNoteChange, onNoteShut,
}) {
  const number = track.number || index + 1;
  const title = track.title;
  const written = !!note.trim();

  // The cursor goes in as the field arrives, because pressing the offer was
  // asking to write — in the layout pass, while the press is still on the
  // stack, which is the only moment a phone raises its keyboard for it.
  // First the page is asked to move the box onto where the keyboard will be
  // (app/session/page.js), so iOS is shown a field already in view and has
  // no slide of its own to make — the same order a tap on a note keeps.
  //
  // ── The cursor is placed before the keyboard comes, 2026-10-17 ─────────
  // It was put at the end of the writing just after the focus, with the
  // keyboard already starting. iOS's keyboard keeps its own copy of the
  // words around the cursor, to correct and suggest from, and a cursor moved
  // by the page once it has started is a move it can miss — WebKit's own
  // reports describe the copy going stale, the next word left uncapitalised
  // and corrections made against text that is not there (bugs 236937,
  // 265856). Miyel, 2026-10-17: autocorrect "feels funny… choosing weird
  // words to change". So the cursor goes in first and the focus second, the
  // order the tap on a note already kept, and the keyboard starts from the
  // right place. Where it goes: the letter pressed, when the note was pressed
  // (letterUnder, below), or the end.
  const field = useRef(null);
  const caret = useRef(null);
  useLayoutEffect(() => {
    const el = field.current;
    if (!noting || !el) return;
    el.dispatchEvent(new Event('ses-note-opening', { bubbles: true }));
    const at = Math.min(caret.current ?? el.value.length, el.value.length);
    caret.current = null;
    el.setSelectionRange(at, at);
    el.focus({ preventScroll: true });
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
        {/* ── The pencil, 2026-10-21 ──────────────────────────────────────
            At the end of the lit row, in a slot every row keeps and leaves
            empty, so the stars never move when it appears — the thing that
            sank the envelope in September (Miyel's brief, home and the
            session). A mark small enough to ignore on a night with nothing
            to say, and there when there is: writing a track note has to
            feel optional, and a word or an open box under the row read as
            a field to fill in. It opens the note, the way the written note
            itself does. */}
        <span className="ses-row-pen">
          {onAir && !noting && (
            <button
              type="button"
              className="ses-pen"
              onClick={() => onNote(index)}
              title={written ? 'Edit the note on this track' : 'Write about this track'}
              aria-label={written ? `Edit the note on ${title}` : `Write about ${title}`}
            >
              <PencilSimple size={17} weight="regular" />
            </button>
          )}
        </span>
      </div>

      {/* ── The line under the name ──────────────────────────────────────
          A written note, on any row: pressing it lights the track and opens
          the box it was written in, the cursor on the letter pressed. The two
          words that stood under the lit track — Add notes and Send track —
          went for the pencil on 2026-10-21, and sending went with them: a
          song is sent from a real post, not from a listen (Miyel). */}
      {!noting && written && (
        <div className="ses-row-under">
          <button type="button" className="ses-row-note" onClick={e => { caret.current = letterUnder(e); onNote(index); }} aria-label={`Notes on ${title}: ${note}. Press to edit`}>
            {note}
          </button>
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
                data-track={index}
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

// Which letter of a written note a press landed on, so the box opens with
// the cursor there: fixing a word starts with the cursor on the word, and it
// used to open at the end of the note, a second tap away (Miyel, 2026-10-17:
// "it's hard to highlight to fix the spelling of a word"). The note on the
// row is the note's text and nothing else, so a place in it is a place in
// the field. Null for a press with no point — a key — which opens at the end.
function letterUnder(e) {
  const box = e.currentTarget;
  if (!e.clientX && !e.clientY) return null;
  const range = document.caretRangeFromPoint?.(e.clientX, e.clientY);
  if (range && box.contains(range.startContainer)) return range.startOffset;
  const spot = document.caretPositionFromPoint?.(e.clientX, e.clientY);
  if (spot && box.contains(spot.offsetNode)) return spot.offset;
  return null;
}

export default memo(TrackRow);
