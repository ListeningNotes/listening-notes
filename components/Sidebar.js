'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import { useListeningBeacon } from '../hooks/useListeningBeacon';
import { useState } from 'react';

const NAV_LINKS = [
  { href: '/',          label: 'Home',    icon: '⌂' },
  { href: '/about',     label: 'About',   icon: '○' },
  { href: '/specs',     label: 'Specs',   icon: '⊟' },
  { href: '/index',     label: 'Index',   icon: '★' },
  { href: '/submit',    label: 'Submit',  icon: '↑' },
  { href: '/shuffle',   label: 'Shuffle', icon: '⇌' },
  { href: '/compare',   label: 'Compare', icon: '↕' },
  { href: '/archive',   label: 'Archive', icon: '▦' },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const pathname = usePathname();
  const { theme, toggle, mounted } = useTheme();
  const { track, isLive } = useListeningBeacon();

  return (
    <>
      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          className="sb-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
        {/* Top: wordmark */}
        <div className="sb-wordmark">
          <Link href="/" className="sb-title-link">
            Listening<br />Notes
          </Link>
          <p className="sb-tagline">a listening journal</p>
        </div>

        {/* Nav */}
        <nav className="sb-nav" aria-label="Main navigation">
          {NAV_LINKS.map(({ href, label, icon }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`sb-link ${active ? 'sb-link--active' : ''}`}
                onClick={onClose}
              >
                <span className="sb-link-icon" aria-hidden="true">{icon}</span>
                <span className="sb-link-label">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="sb-divider" />

        {/* Listening beacon */}
        <div className="sb-beacon">
          <div className="sb-beacon-label">
            <span className={`sb-dot ${isLive ? 'sb-dot--live' : ''}`} />
            <span>{isLive ? 'Now listening' : 'Last played'}</span>
          </div>

          {track ? (
            <div className={`sb-card ${isLive ? 'sb-card--live' : 'sb-card--idle'}`}>
              {track.image && (
                <div className="sb-card-art-wrap">
                  <img
                    src={track.image}
                    alt=""
                    className="sb-card-art"
                  />
                  {!isLive && <div className="sb-card-idle-overlay" />}
                </div>
              )}
              <div className="sb-card-meta">
                <div className="sb-card-track">{track.name}</div>
                <div className="sb-card-artist">{track.artist}</div>
              </div>
            </div>
          ) : (
            <div className="sb-card sb-card--empty">
              <div className="sb-card-meta">
                <div className="sb-card-track">—</div>
              </div>
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <div className="sb-footer">
          {mounted && (
            <button
              className="sb-theme-btn"
              onClick={toggle}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              <span className="sb-theme-icon">
                {theme === 'dark' ? '◑' : '◐'}
              </span>
              <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            </button>
          )}
          <span className="sb-footer-year">© {new Date().getFullYear()}</span>
        </div>
      </aside>
    </>
  );
}