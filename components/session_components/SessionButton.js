'use client';
import { fonts } from '../../library/sitewide_visuals';
import { tx, bdr, dk } from '../../library/session_styles';

// The standard pill-shaped action button used throughout the session panel.
// Text stays white everywhere; emphasis comes from how dark the surface is
// underneath it. accent=true is the primary action, pulse=true adds the
// breathing white glow — reserved for the button that starts a listen.

// `title` is here so a caller that shortens the label — the session sidebar
// does, once it collapses to a rail — can still say what the button is.
export default function SessionButton({ onClick, disabled = false, accent = false, pulse = false, title, children, style: extra = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} style={{
      fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase',
      color: disabled ? tx(0.3) : accent ? tx(0.96) : tx(0.8),
      background: disabled ? dk(0.22) : accent ? dk(0.58) : dk(0.42),
      border: `1px solid ${disabled ? bdr(0.06) : accent ? bdr(0.5) : bdr(0.16)}`,
      borderRadius: 50, padding: '11px 30px',
      boxShadow: disabled ? 'none' : accent
        ? `0 0 16px 2px rgba(255,255,255,0.3), 0 4px 14px ${dk(0.4)}, inset 0 1px 0 ${bdr(0.2)}`
        : `0 2px 8px ${dk(0.28)}, inset 0 1px 0 ${bdr(0.12)}`,
      animation: pulse && !disabled ? 'ln-lit 2.4s ease-in-out infinite' : undefined,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s ease', flexShrink: 0, ...extra,
    }}>{children}</button>
  );
}
