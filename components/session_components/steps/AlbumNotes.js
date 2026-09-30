// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { Heart, SketchLogo, Fingerprint } from '@phosphor-icons/react';
import StarRating from '../StarRating';

// The record, and what is said about it as a whole. The top of the session:
// cover, title, artist and year, the album's stars and its marks, all on the
// centre line, and under them a box that is plainly the field for the album
// note (Miyel's brief, *the session becomes one screen*, 2026-09-29, and her
// first look at it on a phone the same night: "center the album and album
// data, also the stars… make a box out of hairlines with rounded corners
// that is clearly a field for overall album notes"). The words inside it are
// the first brief's own, picked over a question: a question mark makes the
// box a question, and the box is meant to be a note already begun.
//
// No label over the note and none over the tracks: the preview says what
// each is, and here the box and the list say it themselves. The average of
// the track ratings is revealed from the horizon, where the ratings are
// (steps/TrackNotes.js), and drawn into the stars here as a ghost.
export default function AlbumNotes({
  album, artist, year, albumArt,
  overallNotes,
  setOverallNotes,
  rating,
  setRating,
  // The tracks' average, drawn into the stars once it has been asked for.
  ghost = 0,
  Masterpiece,
  Favorite,
  setFavorite,
  Formative,
  setFormative,
}) {
  const flag = (on, kind) => `ses-mark ses-mark--${kind}${on ? ' ses-mark--on' : ''}`;

  return (
    <section className="ses-record">
      {/* Where the picked cover lands (app/session/page.js, the landing). Its
          own class, not .ses-cover: the nav bar under the sheet draws its
          small beacon in that one. */}
      <span className="ses-record-cover" aria-hidden="true">
        {albumArt
          ? <img src={albumArt} alt="" />
          : <span className="ses-record-cover-none">♪</span>}
      </span>
      <h1 className="ses-record-title">{album}</h1>
      <p className="ses-record-by">
        {artist}{year ? ` · ${year}` : ''}
      </p>

      {/* The stars and the marks on one line. No label over the stars: five
          stars under a record you are logging are not ambiguous (Miyel,
          2026-09-18). */}
      <div className="ses-record-marks">
        <StarRating value={rating} onChange={setRating} size={26} roomy ghost={ghost} />
      </div>
      {/* The marks, a glyph over a word each — the album screen's own
          shape, back on Miyel's word ("let's label favorite and
          formative"). */}
      <div className="ses-marks">
        {/* Masterpiece is not pressed, 2026-09-17. It is read off the
            tracklist — every track rated, every rating five — so it turns
            up when it is true and is simply absent when it is not. */}
        {Masterpiece && (
          <span className={flag(true, 'mp') + ' ses-mark--said'} title="Every track is five stars">
            <SketchLogo size={24} weight="fill" aria-hidden="true" />
            <span className="ses-mark-word">Masterpiece</span>
          </span>
        )}
        <button
          type="button"
          className={flag(Favorite, 'fav')}
          onClick={() => setFavorite(!Favorite)}
          aria-pressed={Favorite}
          title="An album you love"
        >
          <Heart size={24} weight={Favorite ? 'fill' : 'regular'} aria-hidden="true" />
          <span className="ses-mark-word">Favorite</span>
        </button>
        <button
          type="button"
          className={flag(Formative, 'formative')}
          onClick={() => setFormative(!Formative)}
          aria-pressed={Formative}
          title="An album that made you"
        >
          {/* Bold, not fill: Phosphor's filled fingerprint is a solid pad
              with the ridges knocked out of it (Miyel, 2026-09-18). */}
          <Fingerprint size={24} weight={Formative ? 'bold' : 'regular'} aria-hidden="true" />
          <span className="ses-mark-word">Formative</span>
        </button>
      </div>

      {/* The album note: a box, so it reads as the field it is, with the
          question inside it until something is written. Grown by layout,
          never measured — see .ses-grow. */}
      <div className="ses-note-box ses-album-box">
        <div className="ses-grow" data-said={(overallNotes || '') + ' '}>
          <textarea
            className="ses-textarea"
            value={overallNotes}
            onChange={e => setOverallNotes(e.target.value)}
            placeholder="What it did, where you were, what you noticed…"
            aria-label="Album note"
            rows={3}
          />
        </div>
      </div>
    </section>
  );
}
