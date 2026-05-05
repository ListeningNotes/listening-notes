// app/session/page.js
// Session hub — the private dashboard landing page.
// Password protected. Never linked publicly.

'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { fonts } from '../../library/sitewide_visuals';
import PasswordGate from '../../components/session_components/PasswordGate';
import { Headphones, Stack, Envelope, PaperPlane } from '@phosphor-icons/react';
import backgrounds from '../../components/session_components/backgrounds';

const cards = [
  { href: '/echo',  label: 'Listen',  Icon: Headphones },
  { href: '/dashboard/entries', label: 'Entries', Icon: Stack },
  { href: '/dashboard/inbox',   label: 'Inbox',   Icon: Envelope },
  { href: '/dashboard/share',   label: 'Share',   Icon: PaperPlane },
];

export default function SessionHub() {
  const [authed, setAuthed]   = useState(false);
  const [checking, setChecking] = useState(true);
  const [albums, setAlbums]   = useState([]);
  // Pick once per mount, stable across re-renders
  const Background = useRef(backgrounds[Math.floor(Math.random() * backgrounds.length)]).current;

  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.json())
      .then(d => setAuthed(!!d.authed))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (!authed) return;
    fetch('/api/entries')
      .then(r => r.json())
      .then(d => {
        const withArt = (d.entries || []).filter(e => e.album_art);
        setAlbums(withArt.sort(() => Math.random() - 0.5));
      })
      .catch(() => {});
  }, [authed]);

  if (checking) return <div style={{ minHeight: '100vh', background: '#eef0ec' }} />;
  if (!authed)  return <PasswordGate onAuth={() => setAuthed(true)} />;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.sans, position: 'relative', overflow: 'hidden', background: '#eef0ec' }}>
      <style>{`
        .hub-card { transition: transform 0.22s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.2s ease; }
        .hub-card:hover { transform: translateY(-6px) scale(1.04); box-shadow: 0 24px 60px rgba(0,0,0,0.15); }
      `}</style>

      {/* ── Background (randomly selected) ── */}
      <Background albums={albums} />

      {/* ── Frosted glass — blur(Xpx) = blur strength, last rgba = tint opacity ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, backdropFilter: 'blur(1px)', WebkitBackdropFilter: 'blur(1px)', background: 'rgba(214, 214, 214, 0.33)', pointerEvents: 'none' }} />

      {/* ── Logo ── */}
      <div style={{ position: 'absolute', top: '12vh', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', zIndex: 2, whiteSpace: 'nowrap' }}>
        <img src="/Logo.png" alt="Listening Notes" style={{ height: 160, width: 'auto', display: 'block', margin: '0 auto 8px' }} />
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.3)' }}>
          session
        </div>
      </div>

      {/* ── Cards ── */}
      <div style={{ display: 'flex', gap: 80, alignItems: 'center', position: 'relative', zIndex: 2 }}>
        {cards.map(({ href, label, Icon }) => (
          <Link key={href} href={href} style={{ textDecoration: 'none' }}>
            <div className="hub-card" style={{ width: 200, height: 200, borderRadius: 40, background: 'rgba(255,255,255,0.72)', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg, rgba(255,255,255,0.6) 0%, transparent 60%)' }} />
              <Icon size={100} weight="fill" color="#1a1916" style={{ position: 'relative', zIndex: 1, opacity: 0.85 }} />
              <div style={{ position: 'relative', zIndex: 1, fontFamily: fonts.sans, fontSize: 13, color: 'rgba(26,25,22,0.5)', letterSpacing: '0.01em' }}>{label}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
