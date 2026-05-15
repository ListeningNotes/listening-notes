'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  // Pick one random screensaver background per visit (same logic as the dashboard).
  const Background = useRef(backgrounds[Math.floor(Math.random() * backgrounds.length)]).current;
  // Live-tunable frosting + background (temporary controls).
  const [blur, setBlur] = useState(48);
  const [frost, setFrost] = useState(45);
  const [bgBlur, setBgBlur] = useState(0);
  const [bgFade, setBgFade] = useState(0);

  const cardGlass = {
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`,
    background: `rgba(255,255,255,${frost / 100})`,
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
      <div
        className="hp-screensaver"
        style={{ filter: bgBlur ? `blur(${bgBlur}px)` : 'none' }}
        aria-hidden="true"
      >
        <Background albums={bgAlbums} />
      </div>
      {bgFade > 0 && (
        <div
          className="hp-bg-fade"
          style={{ opacity: bgFade / 100 }}
          aria-hidden="true"
        />
      )}
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

      {/* Temporary frosting tuning controls */}
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
        <div className="hp-tuner-row">
          <label>BG blur</label>
          <input type="range" min="0" max="80" value={bgBlur}
            onChange={e => setBgBlur(Number(e.target.value))} />
          <span>{bgBlur}px</span>
        </div>
        <div className="hp-tuner-row">
          <label>BG fade</label>
          <input type="range" min="0" max="100" value={bgFade}
            onChange={e => setBgFade(Number(e.target.value))} />
          <span>{bgFade}%</span>
        </div>
      </div>
    </div>
  );
}
