'use client';

import Link from 'next/link';
import { fonts } from '../../library/sitewide_visuals';
import DotNav from '../../components/main_components/DotNav';
import { useTheme } from '../../components/main_components/Lightswitch';

export default function ComparePage() {
  const { theme, toggle } = useTheme();

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--ink)', fontFamily: fonts.sans }}>
      <Link href="/" className="hp-logo-mini" aria-label="Listening Notes">
        <img src="/Logo.png" alt="Listening Notes" style={{ height: 30, width: 'auto', display: 'block', filter: theme === 'dark' ? 'invert(1)' : 'none' }} />
      </Link>
      <div className="hp-corner">
        <a
          href="https://instagram.com/listeningnotes.blog"
          target="_blank"
          rel="noopener noreferrer"
          className="hp-icon-btn"
          aria-label="Instagram"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/></svg>
        </a>
        <button className="hp-icon-btn" onClick={toggle} aria-label="Toggle theme">
          {theme === 'dark' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"/></svg>
          )}
        </button>
      </div>
      <DotNav />
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: 'calc(100vh - 120px)', padding: '0 24px', textAlign: 'center', gap: 24,
      }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 'clamp(40px, 8vw, 72px)', margin: 0, lineHeight: 1.05,
          letterSpacing: '-0.02em', maxWidth: 720,
        }}>
          Coming soon.
        </h1>
        <p style={{
          fontFamily: fonts.sans, fontSize: 16, lineHeight: 1.6, color: 'var(--ink-soft)',
          maxWidth: 480, margin: 0,
        }}>
          A way to put two albums side by side and trace the differences in how they were heard.
        </p>
        <Link href="/" style={{
          fontFamily: 'var(--font-label)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--ink)', textDecoration: 'none', padding: '10px 22px',
          border: '1px solid var(--border)', borderRadius: 999, marginTop: 8,
        }}>
          ← Back home
        </Link>
      </div>
    </div>
  );
}
