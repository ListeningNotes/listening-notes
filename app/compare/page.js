'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { fonts } from '../../library/sitewide_visuals';
import TopNav from '../../components/main_components/TopNav';
import { useTheme } from '../../components/main_components/Lightswitch';

export default function ComparePage() {
  const { theme, toggle } = useTheme();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.style.background = '#0e0e0e';
    return () => {
      document.documentElement.removeAttribute('data-theme');
      document.body.style.background = '';
    };
  }, []);

  return (
    <div style={{ background: '#0e0e0e', minHeight: '100vh', color: '#e8e4dc', fontFamily: fonts.sans }}>
      <TopNav onToggleTheme={toggle} theme={theme} />
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: 'calc(100vh - 120px)', padding: '0 24px', textAlign: 'center', gap: 24,
      }}>
        <div style={{
          fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
          color: '#ddeeff', opacity: 0.7,
        }}>
          Compare
        </div>
        <h1 style={{
          fontFamily: fonts.serif, fontSize: 'clamp(40px, 8vw, 72px)', margin: 0, lineHeight: 1.05,
          letterSpacing: '-0.02em', maxWidth: 720,
        }}>
          Coming soon.
        </h1>
        <p style={{
          fontFamily: fonts.sans, fontSize: 16, lineHeight: 1.6, color: '#a8a39a',
          maxWidth: 480, margin: 0,
        }}>
          A way to put two albums side by side and trace the differences in how they were heard.
        </p>
        <Link href="/" style={{
          fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
          color: '#ddeeff', textDecoration: 'none', padding: '10px 22px',
          border: '1px solid #2a2a2a', borderRadius: 999, marginTop: 8,
        }}>
          ← Back home
        </Link>
      </div>
    </div>
  );
}
