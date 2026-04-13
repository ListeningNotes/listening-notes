'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTheme } from '../components/main_components/Lightswitch';
import TopNav from '../components/main_components/TopNav';
import Hero from '../components/main_components/Hero';
import AlbumStrip from '../components/main_components/AlbumStrip';
import EntryModal from '../components/main_components/EntryModal';

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
      <TopNav onToggleTheme={toggleTheme} theme={theme} />
      <Hero />
      <div className="hero-divider" />
      <div className="hp-strip-section">
        <div className="strip-label">Recent entries</div>
        {loading ? (
          <div className="strip-skeleton">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="strip-skeleton-tile" />)}
          </div>
        ) : (
          <AlbumStrip entries={entries} onTileClick={setModalSlug} />
        )}
        <div className="hp-cta">
          <Link href="/archive" className="hp-cta-btn hp-cta-btn--filled">See full archive →</Link>
          <Link href="/submit" className="hp-cta-btn hp-cta-btn--outline">Submit an album</Link>
        </div>
      </div>
      {modalSlug && (
        <EntryModal slug={modalSlug} onClose={() => setModalSlug(null)} />
      )}
    </div>
  );
}
