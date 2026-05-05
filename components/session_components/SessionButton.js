'use client';
import { fonts } from '../../library/sitewide_visuals';
import { tx, bdr } from '../../library/session_styles';

// The standard pill-shaped action button used throughout the session panel.
// accent=true renders the yellow-green highlight for primary actions.

export default function SessionButton({ onClick, disabled = false, accent = false, children, style: extra = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase',
      color: disabled ? tx(0.22) : tx(0.78),
      background: disabled ? 'rgba(255,255,255,0.3)' : accent ? 'rgba(200,212,122,0.7)' : 'rgba(255,255,255,0.55)',
      border: `1px solid ${disabled ? bdr(0.06) : accent ? 'rgba(200,212,122,0.5)' : bdr(0.1)}`,
      borderRadius: 50, padding: '11px 30px',
      boxShadow: disabled ? 'none' : accent
        ? `0 0 18px rgba(200,212,122,0.22), 0 4px 12px ${bdr(0.1)}, inset 0 1px 0 rgba(255,255,255,0.55)`
        : `0 2px 8px ${bdr(0.07)}, inset 0 1px 0 rgba(255,255,255,0.55)`,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s ease', flexShrink: 0, ...extra,
    }}>{children}</button>
  );
}
