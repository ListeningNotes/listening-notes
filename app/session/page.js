'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fonts } from '../../library/sitewide_visuals';
import PasswordGate from '../../components/session_components/PasswordGate';

const BG = '#f5f2ed';
const TEXT = '#1a1916';
const MUTED = '#9a9590';
const BORDER = '#e0dcd5';

export default function SessionHub() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.json())
      .then(d => setAuthed(!!d.authed))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return <div style={{ minHeight: '100vh', background: BG }} />;
  }

  if (!authed) {
    return <PasswordGate onAuth={() => setAuthed(true)} />;
  }

  const actions = [
    { href: '/session/listen',  label: 'Listen',  sub: 'Start a session',       icon: '♫' },
    { href: '/session/entries', label: 'Entries', sub: 'Manage the archive',    icon: '▤' },
    { href: '/session/inbox',   label: 'Inbox',   sub: 'Comments & submissions', icon: '✉' },
    { href: '/session/share',   label: 'Share',   sub: 'Post to Reddit & Instagram', icon: '↗' },
  ];

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: BG, fontFamily: fonts.sans, padding: '0 24px',
    }}>
      <div style={{ fontFamily: fonts.serif, fontSize: 15, color: MUTED, marginBottom: 40, letterSpacing: '0.04em' }}>
        listening notes
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        {actions.map(({ href, label, sub, icon }) => (
          <Link key={href} href={href} style={{ textDecoration: 'none' }}>
            <div
              style={{
                width: 180, padding: '32px 24px 28px',
                background: '#fff',
                border: `1px solid ${BORDER}`,
                borderRadius: 20,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 12, cursor: 'pointer',
                transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#c8d47a';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.08)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = BORDER;
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div style={{
                width: 64, height: 64, borderRadius: 16,
                background: BG, border: `1px solid ${BORDER}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26, lineHeight: 1,
              }}>
                {icon}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: fonts.serif, fontSize: 20, color: TEXT, marginBottom: 4 }}>
                  {label}
                </div>
                <div style={{ fontFamily: fonts.mono, fontSize: 9, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1.5 }}>
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
