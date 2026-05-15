'use client';
import { fonts } from '../../../library/sitewide_visuals';

export default function MetadataLabel({ children }) {
  return (
    <div style={{ fontFamily: fonts.mono, fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
      {children}
    </div>
  );
}
