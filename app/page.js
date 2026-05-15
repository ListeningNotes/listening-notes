'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTheme } from '../components/main_components/Lightswitch';
import EchoNetwork from '../components/EchoNetwork';
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

  // Live-tunable widget frosting (temporary controls).
  const [blur, setBlur] = useState(48);
  const [frost, setFrost] = useState(45);

  const cardGlass = {
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`,
    background: `rgba(255,255,255,${frost / 100})`,
  };

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
      <EchoNetwork />
      <div
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 1,
          backdropFilter: 'blur(1px)', WebkitBackdropFilter: 'blur(1px)',
          background: 'rgba(214,214,214,0.33)', pointerEvents: 'none',
        }}
      />
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

      {/* Temporary widget tuning */}
      <div className="hp-tuner">
        <div className="hp-tuner-row">
          <label>Blur</label>
          <input type="range" min="0" max="80" value={blur}
            onChange={e => setBlur(Number(e.target.value))} />
          <span>{blur}px</span>
        </div>
        <div className="hp-tuner-row">
          <label>White frost</label>
          <input type="range" min="0" max="100" value={frost}
            onChange={e => setFrost(Number(e.target.value))} />
          <span>{frost}%</span>
        </div>
      </div>
    </div>
  );
}
