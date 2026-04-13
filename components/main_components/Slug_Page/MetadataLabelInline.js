'use client';
import { fonts } from '../../../library/sitewide_visuals';

export default function MetadataLabelInline({ children }) {
  return (
    <span style={{ fontFamily: fonts.mono, fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#555' }}>
      {children}
    </span>
  );
}
