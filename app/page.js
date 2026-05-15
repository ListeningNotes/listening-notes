'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTheme } from '../components/main_components/Lightswitch';
import backgrounds from '../components/session_components/backgrounds';
import TopNav from '../components/main_components/TopNav';
import Hero from '../components/main_components/Hero';
import PulseCard from '../components/main_components/PulseCard';
import AlbumStrip from '../components/main_components/AlbumStrip';
import EntryModal from '../components/main_components/EntryModal';

export default function HomePage() {
  const { theme, toggle: toggleTheme } = useTheme();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalSlug, setModalSlug] = useState(null);
  // Screensaver background — starts random, flip through with the panel.
  const [bgIndex, setBgIndex] = useState(() => Math.floor(Math.random() * backgrounds.length));
  const Background = backgrounds[bgIndex];
  const stepBg = d => setBgIndex(i => (i + d + backgrounds.length) % backgrounds.length);

  const cardGlass = {
    backdropFilter: 'blur(48px)',
    WebkitBackdropFilter: 'blur(48px)',
    background: 'rgba(255,255,255,0.45)',
  };

  // Albums with art, shuffled — fed to the screensaver background.
  const bgAlbums = useMemo(
    () => entries.filter(e => e?.album_art).sort(() => Math.random() - 0.5),
    [entries]
  );

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
      <div className="hp-screensaver" aria-hidden="true">
        <Background key={bgIndex} albums={bgAlbums} />
      </div>
      <TopNav onToggleTheme={toggleTheme} theme={theme} hideBeacon />
      <main className="hp-main">
        <div className="hp-hero-grid">
          <Hero glass={cardGlass} />
          <PulseCard entries={entries} glass={cardGlass} />
        </div>
        <section className="hp-recent" style={cardGlass}>
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

      {/* Temporary screensaver picker */}
      <div className="hp-tuner">
        <div className="hp-tuner-flip">
          <button onClick={() => stepBg(-1)} aria-label="Previous background">◀</button>
          <span className="hp-tuner-name">{Background.name || 'Background'}</span>
          <button onClick={() => stepBg(1)} aria-label="Next background">▶</button>
        </div>
        <div className="hp-tuner-count">{bgIndex + 1} / {backgrounds.length}</div>
      </div>
    </div>
  );
}
