'use client';
import { fonts } from '../../../library/sitewide_visuals';

export default function Chip({ children, accent }) {
  return (
    <span style={{
      fontFamily: fonts.mono, fontSize: '10px', letterSpacing: '0.08em',
      border: '1px solid ' + (accent ? 'rgba(200,212,122,0.3)' : '#2a2a2a'),
      color: accent ? '#c8d47a' : '#a8a49c',
      borderRadius: '4px', padding: '3px 8px'
    }}>
      {children}
    </span>
  );
}
