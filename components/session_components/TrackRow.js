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
// heart, its note opened (Miyel, 2026-09-29: "any sort of click on a track
// counts as lighting it as live"). Its number gives way to the live dot and
// the row takes the faintest green. The offer to write is on that row alone:
// *Any notes?* follows the song being logged rather than standing under
// every rated track, so the list never reads as a column of questions.
'use client';
import { useLayoutEffect, useRef } from 'react';
import { EnvelopeSimple, Heart } from '@phosphor-icons/react';
import StarRating from './StarRating';
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

  return (
    <li className={'ses-row' + (onAir ? ' ses-row--on' : '')}>
      <span className="ses-row-n">
        {onAir
          ? <span className="ses-row-dot" role="img" aria-label="Being logged" />
          : number}
      </span>

      <div className="ses-row-main">
        <button
          type="button"
          className="ses-row-name"
          onClick={onPress}
          aria-label={`${title}${onAir ? ', being logged' : ' — press to log this track'}`}
        >
          {title}
        </button>
        {offered && (
          <button type="button" className="ses-row-offer" onClick={onNote}>
            Any notes?
          </button>
        )}
        {written && !noting && (
          <button type="button" className="ses-row-note" onClick={onNote} aria-label={`Notes on ${title}: ${note}. Press to edit`}>
            {note}
          </button>
        )}
        {noting && (
          <div className="ses-row-field">
            {/* Grown by layout, never measured — see .ses-grow. */}
            <div className="ses-grow" data-said={note + ' '}>
              <textarea
                ref={field}
                className="ses-textarea"
                value={note}
                onChange={e => onNoteChange(e.target.value)}
                // Left empty, the field shuts again; written in, the words
                // stand where it was.
                onBlur={() => { if (!note.trim()) onNoteShut(); }}
                aria-label={`Notes on ${title}`}
                rows={2}
              />
            </div>
            {/* Send this song, at the foot of its note: you are already
                looking at one song and thinking about it. */}
            {onSend && (
              <button type="button" className="ses-heart ses-row-send" onMouseDown={e => e.preventDefault()} onClick={onSend} aria-label={`Send ${title} to somebody`} title="Send this song">
                <EnvelopeSimple size={18} weight="regular" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="ses-row-marks">
        <StarRating value={rating} onChange={onRate} size={16} roomy />
        {/* Favourite is deliberately separate from the rating — a song can
            be the one you keep returning to without being the best on the
            record. Filled once it is one, outline while it isn't. */}
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
      </div>
    </li>
  );
}
