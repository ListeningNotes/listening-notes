'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fonts } from '../../library/sitewide_visuals';

const PASSWORD = 'listeningnotes';
const BG = '#f5f2ed';
const TEXT = '#1a1916';
const MUTED = '#9a9590';
const BORDER = '#e0dcd5';

export default function SessionHub() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('ln_session_auth') === 'true') setAuthed(true);
  }, []);

  function handleAuth() {
    if (pw === PASSWORD) {
      localStorage.setItem('ln_session_auth', 'true');
      setAuthed(true);
    } else {
      setError(true);
      setPw('');
    }
  }

  if (!authed) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: BG, fontFamily: fonts.sans,
      }}>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div style={{ fontFamily: fonts.serif, fontSize: 28, color: TEXT, marginBottom: 32 }}>
            listening notes
          </div>
          <input
            type="password"
            value={pw}
            onChange={e => { setPw(e.target.value); setError(false); }}
            onKeyDown={e => e.key === 'Enter' && handleAuth()}
            placeholder="password"
            autoFocus
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#fff',
              border: `1px solid ${error ? '#c0392b' : BORDER}`,
              borderRadius: 8, padding: '12px 16px',
              fontFamily: fonts.mono, fontSize: 13, color: TEXT,
              outline: 'none', textAlign: 'center',
              transition: 'border-color 0.15s',
            }}
          />
          {error && (
            <div style={{ fontFamily: fonts.mono, fontSize: 11, color: '#c0392b', marginTop: 10, letterSpacing: '0.06em' }}>
              incorrect
            </div>
          )}
        </div>
      </div>
    );
  }

  const actions = [
    { href: '/session/listen', label: 'Listen',  sub: 'Start a session' },
    { href: '/session/entries', label: 'Entries', sub: 'Manage the archive' },
    { href: '/',               label: 'Site',    sub: 'Back to public view' },
  ];

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: BG, fontFamily: fonts.sans, gap: 8,
    }}>
      {actions.map(({ href, label, sub }) => (
        <Link key={href} href={href} style={{ textDecoration: 'none', width: 280 }}>
          <div
            style={{
              padding: '20px 28px',
              background: '#fff',
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#c8d47a';
              e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = BORDER;
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div>
              <div style={{ fontFamily: fonts.serif, fontSize: 20, color: TEXT, marginBottom: 2 }}>
                {label}
              </div>
              <div style={{ fontFamily: fonts.mono, fontSize: 10, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {sub}
              </div>
            </div>
            <div style={{ fontFamily: fonts.mono, fontSize: 14, color: MUTED }}>→</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
