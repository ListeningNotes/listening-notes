'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fonts } from '../../../library/sitewide_visuals';
import { Headphones, Stack, Envelope, PaperPlane } from '@phosphor-icons/react';
import RainingAlbums from '../../../components/session_components/backgrounds/RainingAlbums';
import BouncingDVD   from '../../../components/session_components/backgrounds/BouncingDVD';
import FloatingOrbs  from '../../../components/session_components/backgrounds/FloatingOrbs';
import StarField     from '../../../components/session_components/backgrounds/StarField';
import WaveGrid      from '../../../components/session_components/backgrounds/WaveGrid';

const ALL = { RainingAlbums, BouncingDVD, FloatingOrbs, StarField, WaveGrid };

const cards = [
  { href: '/session/listen',  label: 'Listen',  Icon: Headphones },
  { href: '/session/entries', label: 'Entries', Icon: Stack },
  { href: '/session/inbox',   label: 'Inbox',   Icon: Envelope },
  { href: '/session/share',   label: 'Share',   Icon: PaperPlane },
];

export default function BgTest() {
  const [active, setActive] = useState('RainingAlbums');
  const [albums, setAlbums] = useState([]);
  const Background = ALL[active];

  useEffect(() => {
    fetch('/api/entries')
      .then(r => r.json())
      .then(d => {
        const withArt = (d.entries || []).filter(e => e.album_art);
        setAlbums(withArt.sort(() => Math.random() - 0.5).slice(0, 8));
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.sans, position: 'relative', overflow: 'hidden', background: '#eef0ec' }}>
      <style>{`
        .hub-card { transition: transform 0.22s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.2s ease; }
        .hub-card:hover { transform: translateY(-6px) scale(1.04); box-shadow: 0 24px 60px rgba(0,0,0,0.15); }
      `}</style>

      <Background albums={albums} />

      {/* Frosted glass */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, backdropFilter: 'blur(0.5px)', WebkitBackdropFilter: 'blur(5px)', background: 'rgba(220,222,220,0.5)', pointerEvents: 'none' }} />

      {/* Logo */}
      <div style={{ position: 'absolute', top: '12vh', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', zIndex: 2, whiteSpace: 'nowrap' }}>
        <img src="/Logo.png" alt="Listening Notes" style={{ height: 160, width: 'auto', display: 'block', margin: '0 auto 8px' }} />
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.3)' }}>
          session
        </div>
      </div>

      {/* Cards */}
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

      {/* Picker */}
      <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', gap: 8, background: 'rgba(255,255,255,0.9)', borderRadius: 14, padding: '10px 14px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)', backdropFilter: 'blur(12px)' }}>
        {Object.keys(ALL).map(name => (
          <button key={name} onClick={() => setActive(name)} style={{
            fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '0.08em',
            textTransform: 'uppercase', padding: '6px 14px', borderRadius: 8, border: 'none',
            cursor: 'pointer',
            background: active === name ? '#1a1916' : 'transparent',
            color: active === name ? '#fff' : '#7a776f',
          }}>
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
