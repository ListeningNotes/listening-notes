'use client';
import { fonts } from '../../../library/sitewide_visuals';

export default function Chip({ children, accent }) {
  return (
    <span style={{
      fontFamily: fonts.mono, fontSize: '10px', letterSpacing: '0.08em',
      border: '1px solid var(--border)',
      color: accent ? 'var(--accent)' : 'var(--ink-soft)',
      borderRadius: '4px', padding: '3px 8px'
    }}>
      {children}
    </span>
  );
}
