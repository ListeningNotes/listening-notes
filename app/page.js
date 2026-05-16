'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTheme } from '../components/main_components/Lightswitch';
import TopNav from '../components/main_components/TopNav';
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
      <TopNav onToggleTheme={toggleTheme} theme={theme} hideBeacon />
      <main className="hp-main">
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
      </main>
      {modalSlug && (
        <EntryModal slug={modalSlug} onClose={() => setModalSlug(null)} />
      )}
    </div>
  );
}
