'use client';

import StarRating from '../StarRating';

const FONT = "'DM Sans', sans-serif";
const MONO = "'DM Mono', monospace";
const DIVIDER = 'rgba(255,255,255,0.07)';

export default function StickyHeader({ entry, visible }) {
  const masterpiece = entry?.masterpiece === true;
  const isSubmission = entry?.entry_type === 'Submission';

  return (
    <div style={{
      flexShrink: 0,
      borderBottom: '1px solid ' + DIVIDER,
      padding: '10px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      fontFamily: FONT,
      background: 'rgba(8,6,14,0.3)',
      maxHeight: visible ? 52 : 0,
      opacity: visible ? 1 : 0,
      overflow: 'hidden',
      transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease',
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#f0ece4', letterSpacing: '-0.02em', flexShrink: 0 }}>{entry?.album}</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>{entry?.artist}{entry?.year ? ' · ' + entry.year : ''}</div>
      <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
      <StarRating rating={entry?.rating} size={12} glow={masterpiece} />
      {masterpiece && (
        <span className="ln-masterpiece-shine" style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 500 }}>
          Masterpiece
        </span>
      )}
      <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
      {entry?.relationship && (
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)' }}>
          {entry.relationship}
        </span>
      )}
      {isSubmission && (
        <>
          <span style={{ color: 'rgba(255,255,255,0.15)', fontFamily: MONO, fontSize: 9 }}>·</span>
          <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(200,212,122,0.6)' }}>Submission</span>
        </>
      )}
    </div>
  );
}
