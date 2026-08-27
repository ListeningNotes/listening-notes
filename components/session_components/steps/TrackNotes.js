// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { Heart } from '@phosphor-icons/react';
import { fonts, colors } from '../../../library/sitewide_visuals';
import { tx, bdr, dk, lbl } from '../../../library/session_styles';
import { TrackLength } from '../../../library/session_timers';
import SessionButton from '../SessionButton';
import StarRating from '../StarRating';

// Step 1 — expandable track list with per-track notes and star ratings.
// Three states are readable at a glance: the track being written about (lit
// surface), tracks already covered (filled marker), and ones still to do
// (hollow marker). The Echo toggle used to live in this header; it moved to the
// panel chrome so the same button follows you into Album Notes.

export default function TrackNotes({
  tracks,
  tracksLoading,
  trackNotes,
  setTrackNotes,
  trackRatings,
  setTrackRatings,
  trackFavorites,
  setTrackFavorites,
  openTrack,
  setOpenTrack,
  onNext,
}) {
  return (
    <div style={{ width: '100%' }}>
      <div style={{ marginBottom: 20 }}>
        <span style={lbl}>Track Notes</span>
      </div>

      {tracksLoading && !tracks && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...Array(10)].map((_, i) => (
            <div key={i} style={{ height: 46, borderRadius: 8, background: bdr(0.06), animation: `ln-pulse 1.6s ease-in-out ${i * 0.06}s infinite` }} />
          ))}
        </div>
      )}

      {tracks && tracks.length === 0 && (
        <div style={{ paddingTop: 60, textAlign: 'center', fontFamily: fonts.mono, fontSize: 12, color: tx(0.3) }}>
          No tracklist found — continue with album notes
        </div>
      )}

      {tracks && tracks.map((t, i) => {
        const isOpen  = openTrack === i;
        const fav     = !!trackFavorites?.[i];
        const covered = !!(trackNotes[i]?.trim()) || (trackRatings[i] || 0) > 0 || fav;
        return (
          <div
            key={i}
            style={{
              borderRadius: 10,
              background: isOpen ? dk(0.34) : 'transparent',
              boxShadow: isOpen ? `inset 0 0 0 1px ${bdr(0.12)}` : 'none',
              marginBottom: isOpen ? 8 : 0,
              borderBottom: isOpen ? 'none' : `1px solid ${bdr(0.06)}`,
              transition: 'background 0.18s, box-shadow 0.18s',
            }}
          >
            <div
              onClick={() => setOpenTrack(isOpen ? null : i)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: isOpen ? '15px 16px' : '15px 6px', cursor: 'pointer', userSelect: 'none' }}
            >
              {/* Covered / still to do */}
              <span style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: covered ? tx(0.7) : 'transparent',
                border: `1px solid ${covered ? tx(0.7) : bdr(0.25)}`,
                transition: 'background 0.2s, border-color 0.2s',
              }} />
              <span style={{ fontFamily: fonts.mono, fontSize: 12, color: tx(0.3), minWidth: 22, flexShrink: 0 }}>{t.number}.</span>
              <span style={{
                fontFamily: fonts.mono, fontSize: 14, flex: 1, minWidth: 0,
                color: isOpen ? tx(0.95) : covered ? tx(0.78) : tx(0.6),
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                transition: 'color 0.18s',
              }}>{t.title}</span>
              {t.duration && <span style={{ fontFamily: fonts.mono, fontSize: 11, color: tx(0.25), flexShrink: 0 }}>{TrackLength(t.duration)}</span>}
              {/* Favourite is deliberately separate from the rating — a song can
                  be the one you keep returning to without being the best on the
                  record. */}
              <button
                onClick={e => { e.stopPropagation(); setTrackFavorites(prev => ({ ...prev, [i]: !prev[i] })); }}
                title={fav ? 'Remove from favourites' : 'Mark as a favourite song'}
                aria-label={fav ? 'Remove from favourites' : 'Mark as a favourite song'}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
                  display: 'inline-flex', lineHeight: 1, flexShrink: 0,
                  color: fav ? colors.fav : tx(0.22),
                  transition: 'color 0.15s',
                }}
              >
                {/* Filled once it's a favourite, outline while it isn't —
                    one icon in two weights rather than two glyphs. */}
                <Heart size={16} weight={fav ? 'fill' : 'regular'} />
              </button>
              <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0 }}>
                <StarRating value={trackRatings[i] || 0} onChange={v => setTrackRatings(prev => ({ ...prev, [i]: v }))} size={20} />
              </div>
              <span style={{ fontFamily: fonts.mono, fontSize: 11, color: tx(0.3), flexShrink: 0, width: 12, textAlign: 'center' }}>
                {isOpen ? '▴' : '▾'}
              </span>
            </div>
            {isOpen && (
              <div style={{ padding: '0 16px 16px 48px' }}>
                <textarea
                  autoFocus
                  ref={el => {
                    // Size to content on open, not only while typing — otherwise
                    // reopening a track clips its notes behind overflow:hidden.
                    if (!el) return;
                    el.style.height = 'auto';
                    el.style.height = el.scrollHeight + 'px';
                  }}
                  value={trackNotes[i] || ''}
                  onChange={e => {
                    setTrackNotes(prev => ({ ...prev, [i]: e.target.value }));
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  placeholder="notes for this track..."
                  rows={2}
                  style={{
                    fontFamily: fonts.mono, fontSize: 13, lineHeight: 1.8, color: tx(0.85),
                    background: 'transparent', border: 'none',
                    borderBottom: `1px solid ${bdr(0.12)}`, outline: 'none',
                    width: '100%', padding: '4px 0', resize: 'none', overflow: 'hidden', display: 'block',
                  }}
                />
              </div>
            )}
          </div>
        );
      })}

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
        <SessionButton onClick={onNext} accent>Continue →</SessionButton>
      </div>
    </div>
  );
}
