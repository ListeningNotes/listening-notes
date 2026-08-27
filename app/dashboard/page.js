// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/session/page.js
// Session hub — the private dashboard landing page.
// Password protected. Never linked publicly.

'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fonts } from '../../library/sitewide_visuals';
import PasswordGate from '../../components/session_components/PasswordGate';
import { Headphones, Stack, Envelope, PaperPlane } from '@phosphor-icons/react';
import backgrounds from '../../components/session_components/backgrounds';
import { useBookplate } from '../../components/main_components/Bookplate';

const cards = [
  { href: '/dashboard/echo',  label: 'Listen',  Icon: Headphones },
  { href: '/dashboard/entries', label: 'Entries', Icon: Stack },
  { href: '/dashboard/inbox',   label: 'Inbox',   Icon: Envelope },
  { href: '/dashboard/share',   label: 'Share',   Icon: PaperPlane },
];

export default function SessionHub() {
  const { cover_name } = useBookplate();
  const [authed, setAuthed]   = useState(false);
  const [checking, setChecking] = useState(true);
  const [albums, setAlbums]   = useState([]);
  // Pick once per mount, stable across re-renders
  // Lazy initialiser so the pick happens once, not on every render — the
  // useRef form re-rolled the dice each time and threw the result away.
  const [Background] = useState(() => backgrounds[Math.floor(Math.random() * backgrounds.length)]);

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
    <div className="hub-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.sans, position: 'relative', background: '#eef0ec' }}>
      <style>{`
        /* Sizes live here rather than inline so the phone rules below can
           actually win — an inline width can only be beaten with !important. */
        .hub-card {
          width: 200px; height: 200px; border-radius: 40px;
          transition: transform 0.22s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.2s ease;
        }
        .hub-card:hover { transform: translateY(-6px) scale(1.04); box-shadow: 0 24px 60px rgba(0,0,0,0.15); }
        .hub-page { overflow: hidden; }
        .hub-cards { display: flex; gap: 80px; align-items: center; }
        .hub-logo { position: absolute; top: 12vh; left: 50%; transform: translateX(-50%); text-align: center; }
        .hub-logo img { height: 160px; }

        /* One row of four 200px cards with 80px between them needs 1040px to
           stand up. On a phone it was three times the screen and the page
           clipped it, so the hub arrived already cut off. Two by two, with the
           logo dropped into the flow so it stops floating over them. */
        @media (max-width: 768px) {
          /* A phone held sideways is ~375px tall — the hub is taller than that,
             and clipping it would hide a card behind the bottom edge. */
          .hub-page { overflow-x: hidden; overflow-y: auto; justify-content: safe center; padding: 32px 20px; box-sizing: border-box; }
          .hub-logo { position: static; transform: none; margin-bottom: 26px; }
          .hub-logo img { height: 92px; }
          .hub-cards { flex-wrap: wrap; gap: 14px; justify-content: center; width: 100%; max-width: 340px; }
          .hub-cards > a { flex: 0 0 calc(50% - 7px); }
          .hub-card { width: 100%; height: auto; aspect-ratio: 1; border-radius: 26px; }
          .hub-card svg { width: 56px; height: 56px; }
          /* Nothing to lift on a touch screen, and the hover transform stuck
             on after a tap. */
          .hub-card:hover { transform: none; box-shadow: 0 8px 32px rgba(0,0,0,0.08); }
        }
      `}</style>

      {/* ── Background (randomly selected) ── */}
      <Background albums={albums} />

      {/* ── Frosted glass — blur(Xpx) = blur strength, last rgba = tint opacity ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, backdropFilter: 'blur(1px)', WebkitBackdropFilter: 'blur(1px)', background: 'rgba(214, 214, 214, 0.33)', pointerEvents: 'none' }} />

      {/* ── Logo ── */}
      <div className="hub-logo" style={{ zIndex: 2, whiteSpace: 'nowrap' }}>
        <img src="/Logo.png" alt={cover_name} style={{ width: 'auto', display: 'block', margin: '0 auto 8px' }} />
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.3)' }}>
          dashboard
        </div>
      </div>

      {/* ── Cards ── */}
      <div className="hub-cards" style={{ position: 'relative', zIndex: 2 }}>
        {cards.map(({ href, label, Icon }) => (
          <Link key={href} href={href} style={{ textDecoration: 'none' }}>
            <div className="hub-card" style={{ background: 'rgba(255,255,255,0.72)', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
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
