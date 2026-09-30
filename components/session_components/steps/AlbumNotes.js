// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useLayoutEffect, useRef, useState } from 'react';
import { Heart, SketchLogo, Fingerprint } from '@phosphor-icons/react';
import StarRating from '../StarRating';

// The record, and what is said about it as a whole. The top of the session,
// in the entry page's own order: cover, title, artist and year, the album's
// stars and its marks on one line; then the album note (Miyel's brief, *the
// session becomes one screen*, 2026-09-29).
//
// It was the Album screen — the third of four — with the horizon over the
// score and the marks as a glyph over a word each. The horizon is with the
// tracks now, where the entry draws it (steps/TrackNotes.js), and the marks
// sit beside the stars as the entry shows them, a glyph each: the heart, the
// fingerprint, and the diamond only when the tracks have earned it.
//
// ── The album note is offered, not asked for ──────────────────────────────
// Closed as a quiet *Any notes?* until it is pressed, and the writing once
// there is any. The one field on the screen that opens in place: it is at
// the top, with nothing under it for a keyboard to cover but the tracks,
// which can wait. An empty field is a question; the session offers.
export default function AlbumNotes({
  album, artist, year, albumArt,
  overallNotes,
  setOverallNotes,
  rating,
  setRating,
  Masterpiece,
  Favorite,
  setFavorite,
  Formative,
  setFormative,
}) {
  const [opened, setOpened] = useState(false);
  const asked = useRef(false);
  const field = useRef(null);
  const open = opened || !!overallNotes;

  // The cursor goes in as the field arrives, because pressing the offer was
  // asking to write — in the layout pass, while the press is still on the
  // stack, which is the only moment a phone raises its keyboard for it.
  useLayoutEffect(() => {
    if (!asked.current || !field.current) return;
    asked.current = false;
    field.current.focus({ preventScroll: true });
  }, [open]);

  const flag = (on, kind) => `ses-flag ses-flag--${kind}${on ? ' ses-flag--on' : ''}`;

  return (
    <section className="ses-record">
      <div className="ses-record-head">
        {/* Where the picked cover lands (app/session/page.js, the landing).
            It was the header's small beacon, and the header is gone. Its
            own class, not .ses-cover: the nav bar under the sheet draws its
            small beacon in that one. */}
        <span className="ses-record-cover" aria-hidden="true">
          {albumArt
            ? <img src={albumArt} alt="" />
            : <span className="ses-record-cover-none">♪</span>}
        </span>
        <div className="ses-record-text">
          <h1 className="ses-record-title">{album}</h1>
          <p className="ses-record-by">
            {artist}{year ? ` · ${year}` : ''}
          </p>
          <div className="ses-record-marks">
            {/* The album's own score. No label over it — five stars under a
                record you are logging are not ambiguous (Miyel, 2026-09-18). */}
            <StarRating value={rating} onChange={setRating} size={20} roomy />
            <button
              type="button"
              className={flag(Favorite, 'fav')}
              onClick={() => setFavorite(!Favorite)}
              aria-pressed={Favorite}
              aria-label="Favorite"
              title="An album you love"
            >
              <Heart size={22} weight={Favorite ? 'fill' : 'regular'} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={flag(Formative, 'formative')}
              onClick={() => setFormative(!Formative)}
              aria-pressed={Formative}
              aria-label="Formative"
              title="An album that made you"
            >
              {/* Bold, not fill: Phosphor's filled fingerprint is a solid
                  pad with the ridges knocked out of it (Miyel, 2026-09-18). */}
              <Fingerprint size={22} weight={Formative ? 'bold' : 'regular'} aria-hidden="true" />
            </button>
            {/* Masterpiece is not pressed, 2026-09-17. It is read off the
                tracklist — every track rated, every rating five — so it turns
                up when it is true and is simply absent when it is not. */}
            {Masterpiece && (
              <span className={flag(true, 'mp') + ' ses-flag--said'} title="Every track is five stars" aria-label="Masterpiece" role="img">
                <SketchLogo size={22} weight="fill" aria-hidden="true" />
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="ses-album-note">
        <span className="ses-label">Album note</span>
        {open ? (
          /* Grown by layout, never measured — see .ses-grow. */
          <div className="ses-grow" data-said={(overallNotes || '') + ' '}>
            <textarea
              ref={field}
              className="ses-textarea"
              value={overallNotes}
              // Opened for good once it has been written in, so taking the
              // last word back out does not take the field from under the
              // cursor.
              onChange={e => { setOpened(true); setOverallNotes(e.target.value); }}
              aria-label="Album note"
              rows={3}
            />
          </div>
        ) : (
          <button type="button" className="ses-row-offer ses-album-offer" onClick={() => { asked.current = true; setOpened(true); }}>
            Any notes?
          </button>
        )}
      </div>
    </section>
  );
}
