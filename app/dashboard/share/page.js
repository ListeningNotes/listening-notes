'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fonts } from '../../../library/sitewide_visuals';
import PasswordGate from '../../../components/session_components/PasswordGate';

const BG = '#f5f2ed';
const TEXT = '#1a1916';
const MUTED = '#9a9590';
const BORDER = '#e0dcd5';

export default function SessionShare() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.json())
      .then(d => { setAuthed(!!d.authed); setChecking(false); })
      .catch(() => setChecking(false));
  }, []);

  if (checking) return null;
  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: BG, fontFamily: fonts.sans, padding: '0 24px', textAlign: 'center', gap: 20,
    }}>
      <div style={{
        fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
        color: MUTED,
      }}>
        Share
      </div>

      <h1 style={{ fontFamily: fonts.serif, fontSize: 36, margin: 0, color: TEXT, lineHeight: 1.15 }}>
        Coming soon.
      </h1>

      <p style={{ fontFamily: fonts.sans, fontSize: 14, color: MUTED, lineHeight: 1.6, maxWidth: 420, margin: 0 }}>
        Auto-distribute new entries to Reddit and Instagram.
      </p>

      <div style={{
        marginTop: 12, padding: '20px 24px',
        background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14,
        maxWidth: 480, textAlign: 'left',
      }}>
        <div style={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: MUTED, marginBottom: 10 }}>
          To do
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, fontFamily: fonts.sans, fontSize: 13, color: TEXT, lineHeight: 1.7 }}>
          <li>Decide post format for each platform (title + body / caption + image)</li>
          <li>Reddit: create app at reddit.com/prefs/apps, store credentials</li>
          <li>Instagram: convert to Business account, link Facebook Page, Meta Developer app</li>
          <li>Backend route <code style={{ fontFamily: fonts.mono, background: BG, padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>/api/share</code> with provider switch</li>
          <li>Track which entries were shared where (DB column or new table)</li>
        </ul>
      </div>

      <Link href="/dashboard" style={{
        marginTop: 8, fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: MUTED, textDecoration: 'none',
        padding: '8px 18px', border: `1px solid ${BORDER}`, borderRadius: 999, background: '#fff',
      }}>
        ← Back to dashboard
      </Link>
    </div>
  );
}
