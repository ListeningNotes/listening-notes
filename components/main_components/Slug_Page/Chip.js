// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { fonts } from '../../../library/sitewide_visuals';

// tone picks the colour a chip carries. Favourite and masterpiece use the same
// red and blue as their marks everywhere else on the site, so the chip and the
// heart or diamond it stands for are recognisably the same thing. The border
// takes the colour too, at low opacity — a coloured word inside a grey outline
// reads as text that happens to be tinted rather than as a labelled state.
// The literals are fallbacks, not duplicates: color-mix() with an undefined
// custom property is invalid, and an invalid border colour drops the whole
// border — so a stale stylesheet turned the masterpiece chip into plain text
// with no box at all, while the favourite chip beside it looked fine.
const TONES = {
  fav: { color: 'var(--fav, #f0484f)', border: 'color-mix(in srgb, var(--fav, #f0484f) 40%, transparent)' },
  mp:  { color: 'var(--mp, #4a9bf0)',  border: 'color-mix(in srgb, var(--mp, #4a9bf0) 40%, transparent)' },
  formative: { color: 'var(--formative, #3fa96b)', border: 'color-mix(in srgb, var(--formative, #3fa96b) 40%, transparent)' },
};

// Given onClick, the chip is a button — the Submission chip opens the chain
// behind a record, 2026-09-14 — drawn exactly as the others so the row stays
// one object repeated; what says it can be pressed is the small caret its
// caller puts inside it, the way the cover wears its corner mark.
//
// `type` makes it a form's own button without an onClick: the send page's Send
// it, 2026-09-19, which has to submit rather than call something. Passing it is
// the only way a caller gets a button out of this without a handler, and every
// caller that does not pass it is drawn exactly as before.
export default function Chip({ children, accent, tone, onClick, expanded, label, type, disabled }) {
  const t = TONES[tone];
  // inline-flex and nowrap, so a chip that carries a mark before its word
  // — the envelope on Submission, 2026-09-13 — never folds the two onto
  // separate lines when the row it sits in gets narrow.
  const style = {
    display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
    fontFamily: fonts.mono, fontSize: '10px', letterSpacing: '0.08em',
    border: `1px solid ${t ? t.border : 'var(--border)'}`,
    color: t ? t.color : accent ? 'var(--accent)' : 'var(--ink-soft)',
    borderRadius: '4px', padding: '3px 8px'
  };
  if (onClick || type) {
    return (
      <button
        type={type || 'button'}
        onClick={onClick}
        disabled={disabled}
        aria-expanded={expanded}
        aria-label={label}
        style={{
          ...style,
          background: 'transparent',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          lineHeight: 'inherit',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {children}
      </button>
    );
  }
  return <span style={style}>{children}</span>;
}
