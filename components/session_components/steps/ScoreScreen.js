// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useState } from 'react';
import { Heart, SketchLogo } from '@phosphor-icons/react';
import { fonts, colors } from '../../../library/sitewide_visuals';
import { tx, bdr, dk, lbl } from '../../../library/session_styles';
import { goldBurst } from '../../../library/gold_burst';
import SessionButton from '../SessionButton';
import StarRating from '../StarRating';
import HorizonChart from '../../main_components/HorizonChart';

// Step 3 — the album's shape, then the score. This replaces the old Reflect
// step: seeing the per-track ratings drawn out is what turns the overall rating
// into a judgement rather than a guess. Reflect moved to Track Notes, where
// the questions actually came up.

export default function ScoreScreen({
  tracks,
  trackRatings,
  trackFavorites,
  rating,
  setRating,
  Masterpiece,
  setMasterpiece,
  Favorite,
  setFavorite,
  onNext,
}) {
  // Same reasoning as the track list — a running average shouldn't steer the
  // score before it's been decided.
  const [avgShown, setAvgShown] = useState(false);

  const list  = tracks || [];
  const rated = Object.values(trackRatings || {}).filter(v => v > 0);
  const avg   = rated.length ? (rated.reduce((a, b) => a + b, 0) / rated.length).toFixed(2) : null;

  // Marking a masterpiece fires the same burst as the Surprise dot, so it feels
  // like the rest of the site rather than ticking a box.
  function toggleMasterpiece(e) {
    const next = !Masterpiece;
    setMasterpiece(next);
    if (next) goldBurst(e);
  }

  // inline-flex so the mark sits on the pill's centre line rather than the
  // text baseline — the same reason .ln-mark does it on an archive card.
  const pill = (active) => ({
    display: 'inline-flex', alignItems: 'center', gap: 8,
    fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase',
    color: active ? tx(0.96) : tx(0.5),
    background: active ? dk(0.58) : dk(0.34),
    border: `1px solid ${active ? bdr(0.45) : bdr(0.14)}`,
    borderRadius: 50, padding: '10px 24px', cursor: 'pointer',
    boxShadow: active ? `0 0 16px 2px rgba(255,255,255,0.16), inset 0 1px 0 ${bdr(0.2)}` : 'none',
    transition: 'all 0.18s ease',
  });

  return (
    <div style={{ width: '100%' }}>

      <div style={{ ...lbl, marginBottom: 16 }}>Listening Horizon</div>

      {list.length > 0 ? (
        <>
          <HorizonChart tracks={list} trackRatings={trackRatings} favorites={trackFavorites} height={130} labels />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 10, marginBottom: 34 }}>
            <span style={lbl}>{rated.length} of {list.length} rated</span>
            {avg && (
              <button
                onClick={() => setAvgShown(v => !v)}
                style={{
                  fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.06em',
                  color: avgShown ? tx(0.55) : tx(0.3),
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                }}
              >
                {avgShown ? `avg ${avg} / 5` : 'reveal average'}
              </button>
            )}
          </div>
        </>
      ) : (
        <div style={{ ...lbl, marginBottom: 36 }}>No tracklist — score the album on its own terms</div>
      )}

      <div style={{ borderTop: `1px solid ${bdr(0.07)}`, paddingTop: 30, textAlign: 'center' }}>
        <div style={{ ...lbl, marginBottom: 20 }}>Your Score</div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <StarRating value={rating} onChange={setRating} size={38} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Phosphor's SketchLogo and Heart — the same two marks an archive
              card carries, in the same two colours. These were a ✦ and a ♥
              text glyph, which is why a masterpiece looked like one thing here
              and another thing on the entry it produced. */}
          <button onClick={toggleMasterpiece} style={pill(Masterpiece)}>
            {Masterpiece && <SketchLogo size={13} weight="fill" color={colors.mp} />}
            Masterpiece
          </button>
          <button onClick={() => setFavorite(!Favorite)} style={pill(Favorite)}>
            {Favorite && <Heart size={13} weight="fill" color={colors.fav} />}
            Favorite
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
        <SessionButton onClick={onNext} accent>Continue →</SessionButton>
      </div>
    </div>
  );
}
