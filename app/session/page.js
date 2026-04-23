'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fonts, colors } from '../../library/sitewide_visuals';

const PASSWORD = 'listeningnotes';

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
        background: colors.background, fontFamily: fonts.sans,
      }}>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div style={{ fontFamily: fonts.serif, fontSize: 28, color: colors.text, marginBottom: 32 }}>
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
              background: 'transparent',
              border: `1px solid ${error ? '#c0392b' : colors.border}`,
              borderRadius: 8, padding: '12px 16px',
              fontFamily: fonts.mono, fontSize: 13, color: colors.text,
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
    {
      href: '/session/listen',
      label: 'Listen',
      sub: 'Start a session',
      icon: '▶',
    },
    {
      href: '/session/entries',
      label: 'Entries',
      sub: 'Manage the archive',
      icon: '≡',
    },
    {
      href: '/',
      label: 'Site',
      sub: 'Back to the public view',
      icon: '↗',
    },
  ];

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: colors.background, fontFamily: fonts.sans,
      gap: 48,
    }}>
      <div style={{ fontFamily: fonts.serif, fontSize: 28, color: colors.text }}>
        session
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        {actions.map(({ href, label, sub, icon }) => (
          <Link key={href} href={href} style={{ textDecoration: 'none' }}>
            <div style={{
              width: 180, padding: '28px 24px',
              background: colors.panel,
              border: `1px solid ${colors.border}`,
              borderRadius: 16,
              display: 'flex', flexDirection: 'column', gap: 12,
              cursor: 'pointer',
              transition: 'border-color 0.15s, transform 0.15s',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(200,212,122,0.5)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = colors.border;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ fontSize: 22, color: colors.accent }}>{icon}</div>
              <div>
                <div style={{ fontFamily: fonts.serif, fontSize: 20, color: colors.text, marginBottom: 4 }}>
                  {label}
                </div>
                <div style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.secondary_text, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {sub}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
