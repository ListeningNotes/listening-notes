// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useState } from 'react';
import { Heart, SketchLogo, Fingerprint } from '@phosphor-icons/react';
import { colors } from '../../../library/sitewide_visuals';
import { goldBurst } from '../../../library/gold_burst';
import StarRating from '../StarRating';
import HorizonChart from '../../main_components/HorizonChart';

// Step 2 — the shape, the score, then the note. The horizon first, as the
// record actually went track by track; the stars under it, centred; the three
// marks in a single small row, each in its own colour once it is on; and the
// writing at the bottom where there is room for it to grow — a note field
// that keeps getting taller wants nothing underneath it but the button.
//
// The score had a screen of its own for a while. It is here now because the
// flow is one thing at a time and the score is not a thing on its own.

export default function AlbumNotes({
  tracks,
  trackRatings,
  trackFavorites,
  overallNotes,
  setOverallNotes,
  rating,
  setRating,
  Masterpiece,
  setMasterpiece,
  Favorite,
  setFavorite,
  Formative,
  setFormative,
  onNext,
}) {
  const list = tracks || [];
  const rated = Object.values(trackRatings || {}).filter(v => v > 0);
  const hasRatings = rated.length > 0;
  const avg = rated.length ? (rated.reduce((a, b) => a + b, 0) / rated.length).toFixed(2) : null;

  // A running average shouldn't steer the score before it's been decided.
  const [avgShown, setAvgShown] = useState(false);

  // Marking a masterpiece fires the same burst as the Surprise dot, so it feels
  // like the rest of the site rather than ticking a box.
  function toggleMasterpiece(e) {
    const next = !Masterpiece;
    setMasterpiece(next);
    if (next) goldBurst(e);
  }

  const flag = (on, kind) => `ses-flag ses-flag--${kind}${on ? ' ses-flag--on' : ''}`;

  return (
    <div>
      {list.length > 0 && hasRatings && (
        <div style={{ marginBottom: 30 }}>
          <div className="ses-label" style={{ marginBottom: 6 }}>Listening horizon</div>
          <HorizonChart
            tracks={list} trackRatings={trackRatings} favorites={trackFavorites}
            height={56} color="var(--ink-soft)" emptyColor="var(--border)" labelColor="var(--ink-faint)"
          />
          <div className="ses-actions" style={{ justifyContent: 'space-between', marginTop: 8 }}>
            <span className="ses-label">{rated.length} of {list.length} rated</span>
            {avg && (
              <button type="button" className="ses-quiet" style={{ borderBottom: 'none' }} onClick={() => setAvgShown(v => !v)}>
                {avgShown ? `avg ${avg} / 5` : 'reveal average'}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="ses-label" style={{ marginBottom: 16, textAlign: 'center' }}>Your score</div>
      <div className="ses-center">
        <StarRating value={rating} onChange={setRating} size={38} />
      </div>

      {/* Phosphor's SketchLogo, Heart and Fingerprint — the same three marks an
          archive card carries, in the same three colours, which the pill takes
          on once the mark is set. */}
      <div className="ses-actions ses-actions--center" style={{ marginTop: 18, gap: 6 }}>
        <button type="button" className={flag(Masterpiece, 'mp')} onClick={toggleMasterpiece} aria-pressed={Masterpiece}>
          <SketchLogo size={12} weight="fill" color={Masterpiece ? colors.mp : 'currentColor'} aria-hidden="true" />
          Masterpiece
        </button>
        <button type="button" className={flag(Favorite, 'fav')} onClick={() => setFavorite(!Favorite)} aria-pressed={Favorite}>
          <Heart size={12} weight={Favorite ? 'fill' : 'regular'} color={Favorite ? colors.fav : 'currentColor'} aria-hidden="true" />
          Favorite
        </button>
        <button type="button" className={flag(Formative, 'formative')} onClick={() => setFormative(!Formative)} aria-pressed={Formative}>
          <Fingerprint size={12} weight="bold" color={Formative ? colors.formative : 'currentColor'} aria-hidden="true" />
          Formative
        </button>
      </div>

      <hr className="ses-rule" style={{ margin: '30px 0 24px' }} />

      <div className="ses-label" style={{ marginBottom: 12 }}>Album notes</div>
      <textarea
        ref={el => {
          // Size on mount too, so returning to this step doesn't clip long notes.
          if (!el) return;
          el.style.height = 'auto';
          el.style.height = el.scrollHeight + 'px';
        }}
        className="ses-textarea"
        value={overallNotes}
        onChange={e => {
          setOverallNotes(e.target.value);
          e.target.style.height = 'auto';
          e.target.style.height = e.target.scrollHeight + 'px';
        }}
        placeholder="How does this album feel as a whole? Themes, impressions, context…"
        rows={7}
      />
      <div className="ses-label" style={{ marginTop: 8, textAlign: 'right' }}>{overallNotes.length} chars</div>

      {/* The same quiet link the tracks screen leaves with. */}
      <div className="ses-center" style={{ marginTop: 30 }}>
        <button type="button" className="ses-quiet" onClick={onNext}>Preview →</button>
      </div>
    </div>
  );
}
