'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTheme } from '../components/main_components/Lightswitch';
import Hero from '../components/main_components/Hero';
import AlbumStrip from '../components/main_components/AlbumStrip';
import EntryModal from '../components/main_components/EntryModal';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/archive', label: 'Archive' },
  { href: '/compare', label: 'Compare' },
  { href: '/about', label: 'About' },
  { href: '/submit', label: 'Submit' },
];

export default function HomePage() {
  const { theme, toggle: toggleTheme } = useTheme();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalSlug, setModalSlug] = useState(null);

  useEffect(() => {
    fetch('/api/entries')
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data.entries || []);
        setEntries(list);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="hp">
      <div className="hp-corner">
        <a
          href="https://instagram.com/listeningnotes.blog"
          target="_blank"
          rel="noopener noreferrer"
          className="hp-icon-btn"
          aria-label="Instagram"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/></svg>
        </a>
        <button className="hp-icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"/></svg>
          )}
        </button>
      </div>

      <main className="hp-main">
        <header className="hp-head">
          <Link href="/" className="hp-logo" aria-label="Listening Notes">
            <img
              src="/Logo.png"
              alt="Listening Notes"
              style={{ filter: theme === 'dark' ? 'invert(1)' : 'none' }}
            />
          </Link>
          <nav className="hp-dotnav" aria-label="Site navigation">
            {NAV.map(p => (
              <Link
                key={p.href}
                href={p.href}
                className={'hp-dot' + (p.href === '/' ? ' hp-dot--active' : '')}
                aria-label={p.label}
              >
                <span className="hp-dot-label">{p.label}</span>
              </Link>
            ))}
          </nav>
        </header>

        <div className="hp-strip-label">Recently logged</div>
        {loading ? (
          <div className="hp-strip">
            <div className="hp-strip-track">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="strip-tile strip-tile--skeleton" />
              ))}
            </div>
          </div>
        ) : (
          <AlbumStrip entries={entries} onTileClick={setModalSlug} />
        )}

        <Hero />
      </main>
      {modalSlug && (
        <EntryModal slug={modalSlug} onClose={() => setModalSlug(null)} />
      )}
    </div>
  );
}
