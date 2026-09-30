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
// ── Locked until pressed, 2026-09-29 ──────────────────────────────────────
// A row does nothing until it is pressed. Pressed, it is the track being
// logged — its number gives way to the live dot, the row takes the faintest
// green — and only then are its stars, its heart and its note there to set.
// Every other row shows what it was given and takes a thumb as a scroll.
// Miyel, on the first list where every row's stars were live: "I'm having a
// hard time actually scrolling through the track list, because if you scroll
// anywhere by the stars, you start rating the song… every song is locked
// until you click it." The offer to write is on that row alone: *Any notes?*
// follows the song being logged rather than standing under every rated
// track, so the list never reads as a column of questions.
'use client';
import { useLayoutEffect, useRef } from 'react';
import { EnvelopeSimple, Heart } from '@phosphor-icons/react';
import StarRating from './StarRating';
import Stars from '../main_components/StarRating';
import { colors } from '../../library/sitewide_visuals';

export default function TrackRow({
  number, title,
  rating = 0, favorite = false, note = '',
  onAir = false,
  noting = false,
  onPress, onRate, onFavorite, onNote, onNoteChange, onNoteShut, onSend = null,
}) {
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

  // Shut: the whole row is one press, and shows what it was given.
  if (!onAir) {
    return (
      <li className="ses-row">
        <button
          type="button"
          className="ses-row-press"
          onClick={onPress}
          aria-label={`${number}. ${title}${rating ? `, ${rating} out of 5` : ''}${favorite ? ', a favourite' : ''} — press to log this track`}
        >
          <span className="ses-row-n">{number}</span>
          <div className="ses-row-main">
            <span className="ses-row-name">{title}</span>
            {written && <span className="ses-row-note">{note}</span>}
          </div>
          <div className="ses-row-marks" aria-hidden="true">
            <Stars rating={rating} size={16} />
            <span className="ses-heart" style={{ color: favorite ? colors.fav : undefined }}>
              <Heart size={20} weight={favorite ? 'fill' : 'regular'} />
            </span>
          </div>
        </button>
      </li>
    );
  }

  // Open: the track being logged, with everything about it there to set.
  return (
    <li className="ses-row ses-row--on">
      <span className="ses-row-n">
        <span className="ses-row-dot" role="img" aria-label="Being logged" />
      </span>

      <div className="ses-row-main">
        <span className="ses-row-name">{title}</span>
        {offered && (
          <button type="button" className="ses-row-offer" onClick={onNote}>
            Add notes
          </button>
        )}
        {written && !noting && (
          <button type="button" className="ses-row-note" onClick={onNote} aria-label={`Notes on ${title}: ${note}. Press to edit`}>
            {note}
          </button>
        )}
      </div>

      <div className="ses-row-marks">
        <StarRating value={rating} onChange={onRate} size={16} roomy />
        {/* Favourite is deliberately separate from the rating — a song can
            be the one you keep returning to without being the best on the
            record. */}
        <button
          type="button"
          className="ses-heart"
          onClick={onFavorite}
          title={favorite ? 'Remove from favourites' : 'Mark as a favourite song'}
          aria-label={favorite ? 'Remove from favourites' : 'Mark as a favourite song'}
          aria-pressed={favorite}
          style={{ color: favorite ? colors.fav : undefined }}
        >
          <Heart size={20} weight={favorite ? 'fill' : 'regular'} />
        </button>
        {/* Send this song. Beside the heart on the track being logged, not
            in its note box — Miyel, 2026-09-29: "some won't click that box
            open." An envelope and not a paper plane, as the entry's own
            Send is: a letter to one person. */}
        {onSend && (
          <button type="button" className="ses-heart" onClick={onSend} aria-label={`Send ${title} to somebody`} title="Send this song">
            <EnvelopeSimple size={20} weight="regular" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* The note, in the same box the album note is written in, under the
          whole row (Miyel, 2026-09-29: "have the track notes match the
          album notes — that box opens"). Grown by layout, never measured —
          see .ses-grow. */}
      {noting && (
        <div className="ses-note-box ses-row-box">
          <div className="ses-grow" data-said={note + ' '}>
            <textarea
              ref={field}
              className="ses-textarea"
              value={note}
              onChange={e => onNoteChange(e.target.value)}
              // Left empty, the box shuts again; written in, the words stand
              // where it was.
              onBlur={() => { if (!note.trim()) onNoteShut(); }}
              placeholder="Any notes on this track?"
              aria-label={`Notes on ${title}`}
              rows={3}
            />
          </div>
        </div>
      )}
    </li>
  );
}
