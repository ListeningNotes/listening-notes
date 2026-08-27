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

export default function Chip({ children, accent, tone }) {
  const t = TONES[tone];
  return (
    <span style={{
      fontFamily: fonts.mono, fontSize: '10px', letterSpacing: '0.08em',
      border: `1px solid ${t ? t.border : 'var(--border)'}`,
      color: t ? t.color : accent ? 'var(--accent)' : 'var(--ink-soft)',
      borderRadius: '4px', padding: '3px 8px'
    }}>
      {children}
    </span>
  );
}
