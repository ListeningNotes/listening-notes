'use client';

import StarRating from '../StarRating';
import { fonts } from '../../../library/sitewide_visuals';

const DIVIDER = 'var(--border)';

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
      fontFamily: fonts.sans,
      background: 'var(--panel)',
      backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
      maxHeight: visible ? 52 : 0,
      opacity: visible ? 1 : 0,
      overflow: 'hidden',
      transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease',
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', flexShrink: 0 }}>{entry?.album}</div>
      <div style={{ fontSize: 11, color: 'var(--ink-soft)', flexShrink: 0 }}>{entry?.artist}{entry?.year ? ' · ' + entry.year : ''}</div>
      <div style={{ width: 1, height: 16, background: 'var(--border)', flexShrink: 0 }} />
      <StarRating rating={entry?.rating} size={12} glow={masterpiece} />
      {masterpiece && (
        <span className="ln-masterpiece-shine" style={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 500 }}>
          Masterpiece
        </span>
      )}
      {/* The divider and the separator both used to be unconditional because a
          relationship always followed them. With that gone, Submission is the
          only thing left down here — so the rule appears only when there is
          something for it to divide, and the middot that used to sit between
          two labels goes with the label it separated. */}
      {isSubmission && (
        <>
          <div style={{ width: 1, height: 16, background: 'var(--border)', flexShrink: 0 }} />
          <span style={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)' }}>Submission</span>
        </>
      )}
    </div>
  );
}
