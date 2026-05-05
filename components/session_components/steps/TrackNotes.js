'use client';
import { fonts } from '../../../library/sitewide_visuals';
import { tx, bdr, lbl } from '../../../library/session_styles';
import { TrackLength } from '../../../library/session_timers';
import SessionButton from '../SessionButton';
import StarRating from '../StarRating';

// Step 1 — expandable track list with per-track notes and star ratings.

export default function TrackNotes({
  tracks,
  tracksLoading,
  trackNotes,
  setTrackNotes,
  trackRatings,
  setTrackRatings,
  openTrack,
  setOpenTrack,
  onNext,
}) {
  const ratedCount = Object.values(trackRatings).filter(v => v > 0);
  const avg = ratedCount.length
    ? (ratedCount.reduce((a, b) => a + b, 0) / ratedCount.length).toFixed(2)
    : null;

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={lbl}>Track Notes</span>
        {avg && <span style={{ fontFamily: fonts.mono, fontSize: 10, color: tx(0.35) }}>avg {avg} / 5</span>}
      </div>

      {tracksLoading && !tracks && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...Array(10)].map((_, i) => (
            <div key={i} style={{ height: 38, borderRadius: 8, background: 'rgba(0,0,0,0.06)', animation: `ln-pulse 1.6s ease-in-out ${i * 0.06}s infinite` }} />
          ))}
        </div>
      )}

      {tracks && tracks.length === 0 && (
        <div style={{ paddingTop: 60, textAlign: 'center', fontFamily: fonts.mono, fontSize: 11, color: tx(0.28) }}>
          No tracklist found — continue with album notes
        </div>
      )}

      {tracks && tracks.map((t, i) => {
        const isOpen = openTrack === i;
        return (
          <div key={i} style={{ borderBottom: `1px solid ${bdr(0.07)}` }}>
            <div
              onClick={() => setOpenTrack(isOpen ? null : i)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', cursor: 'pointer', userSelect: 'none' }}
            >
              <span style={{ fontFamily: fonts.mono, fontSize: 10, color: tx(0.22), minWidth: 20 }}>{t.number}.</span>
              <span style={{ fontFamily: fonts.mono, fontSize: 12, color: tx(0.75), flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
              {t.duration && <span style={{ fontFamily: fonts.mono, fontSize: 10, color: tx(0.22) }}>{TrackLength(t.duration)}</span>}
              <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0 }}>
                <StarRating value={trackRatings[i] || 0} onChange={v => setTrackRatings(prev => ({ ...prev, [i]: v }))} size={14} />
              </div>
              <span style={{ fontFamily: fonts.mono, fontSize: 10, color: tx(0.25), flexShrink: 0, width: 12, textAlign: 'center' }}>
                {isOpen ? '▴' : '▾'}
              </span>
            </div>
            {isOpen && (
              <div style={{ paddingBottom: 14, paddingLeft: 28, paddingRight: 4 }}>
                <textarea
                  autoFocus
                  value={trackNotes[i] || ''}
                  onChange={e => {
                    setTrackNotes(prev => ({ ...prev, [i]: e.target.value }));
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  placeholder="notes for this track..."
                  rows={2}
                  style={{
                    fontFamily: fonts.mono, fontSize: 12, color: tx(0.7),
                    background: 'transparent', border: 'none',
                    borderBottom: `1px solid ${bdr(0.08)}`, outline: 'none',
                    width: '100%', padding: '4px 0', resize: 'none', overflow: 'hidden', display: 'block',
                  }}
                />
              </div>
            )}
          </div>
        );
      })}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
        <SessionButton onClick={onNext} accent>Continue →</SessionButton>
      </div>
    </div>
  );
}
