'use client';

import Link from 'next/link';
import { fonts } from '../../library/sitewide_visuals';
import DotNav from '../../components/main_components/DotNav';
import SiteNav from '../../components/main_components/SiteNav';

export default function ComparePage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--ink)', fontFamily: fonts.sans }}>
      <SiteNav />
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
