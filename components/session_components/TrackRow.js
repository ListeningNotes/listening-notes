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
// Pressing the offer or the note opens the note sheet over the list
// (NoteSheet.js) — never a field in the row. A field opening in the middle of
// a long column, with the keyboard covering the rest, is why the list was
// pulled the last time it was tried (2026-09-18), and a sheet is not in the
// middle of the column.
//
// ── The track being logged ────────────────────────────────────────────────
// Pressing the name puts the song on air: its number gives way to the live
// dot and the row takes the faintest green. Only the name — Miyel:
// "whichever song you're clicked on is the one that's on air, not rating it."
'use client';
import { Heart } from '@phosphor-icons/react';
import StarRating from './StarRating';
import { colors } from '../../library/sitewide_visuals';

export default function TrackRow({
  number, title,
  rating = 0, favorite = false, note = '',
  onAir = false,
  onPress, onRate, onFavorite, onNote,
}) {
  const written = !!note.trim();
  const offered = rating > 0 && !written;

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
        {written && (
          <button type="button" className="ses-row-note" onClick={onNote} aria-label={`Notes on ${title}: ${note}. Press to edit`}>
            {note}
          </button>
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
