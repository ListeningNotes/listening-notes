'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTheme } from '../components/main_components/Lightswitch';
import TopNav from '../components/main_components/TopNav';
import Hero from '../components/main_components/Hero';
import AlbumStrip from '../components/main_components/AlbumStrip';
import EntryModal from '../components/main_components/EntryModal';

function AmbientScatter({ entries }) {
  const tiles = useMemo(() => {
    const withArt = entries.filter(e => e?.album_art);
    if (withArt.length === 0) return [];
    return Array.from({ length: 35 }).map(() => {
      const entry = withArt[Math.floor(Math.random() * withArt.length)];
      const size = 40 + Math.random() * 80;
      return {
        art: entry.album_art,
        size,
        left: Math.random() * 100,
        top: Math.random() * 100,
        opacity: 0.25 + Math.random() * 0.2,
        rotate: (Math.random() - 0.5) * 8,
      };
    });
  }, [entries]);

  return (
    <div className="hp-ambient" aria-hidden="true">
      {tiles.map((t, i) => (
        <div
          key={i}
          className="hp-ambient-tile"
          style={{
            width: t.size,
            height: t.size,
            left: t.left + '%',
            top: t.top + '%',
            opacity: t.opacity,
            backgroundImage: `url(${t.art})`,
            transform: `rotate(${t.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}

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
      <AmbientScatter entries={entries} />
      <TopNav onToggleTheme={toggleTheme} theme={theme} hideBeacon />
      <main className="hp-main">
        <div className="hp-hero-grid">
          <Hero />
          <div className="hp-pulse-card hp-pulse-card--placeholder">
            <div className="hp-pulse-label">This week</div>
          </div>
        </div>
        <section className="hp-recent">
          <div className="hp-recent-header">
            <div className="hp-recent-label">Recently logged</div>
            <Link href="/archive" className="hp-recent-link">See archive →</Link>
          </div>
          {loading ? (
            <div className="strip-skeleton">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="strip-skeleton-tile" />)}
            </div>
          ) : (
            <AlbumStrip entries={entries} onTileClick={setModalSlug} />
          )}
        </section>
        <div className="hp-cta">
          <Link href="/archive" className="hp-cta-btn hp-cta-btn--filled">See full archive →</Link>
          <Link href="/submit" className="hp-cta-btn hp-cta-btn--outline">Submit an album</Link>
        </div>
      </main>
      {modalSlug && (
        <EntryModal slug={modalSlug} onClose={() => setModalSlug(null)} />
      )}
    </div>
  );
}
