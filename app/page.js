'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTheme } from '../components/main_components/Lightswitch';
import { useListeningBeacon } from '../hooks/useListeningBeacon';
import TopNav from '../components/main_components/TopNav';
import Hero from '../components/main_components/Hero';
import PulseCard from '../components/main_components/PulseCard';
import AlbumStrip from '../components/main_components/AlbumStrip';
import EntryModal from '../components/main_components/EntryModal';

export default function HomePage() {
  const { theme, toggle: toggleTheme } = useTheme();
  const { track } = useListeningBeacon();
  // Last.fm serves a 300x300 thumbnail; swap the size segment out of the URL
  // to pull the original full-resolution upload for a crisp background.
  const bgArt = track?.image ? track.image.replace('/300x300/', '/') : '';
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalSlug, setModalSlug] = useState(null);
  // Keep the last two covers mounted so a new one can crossfade over the old.
  const [bgLayers, setBgLayers] = useState([]);

  useEffect(() => {
    if (!bgArt) return;
    setBgLayers(prev => {
      if (prev.length && prev[prev.length - 1].art === bgArt) return prev;
      return [...prev, { art: bgArt, key: Date.now() }].slice(-2);
    });
  }, [bgArt]);

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
      {bgLayers.map(layer => (
        <div
          key={layer.key}
          className="hp-bg"
          style={{ backgroundImage: `url(${layer.art})` }}
          aria-hidden="true"
        />
      ))}
      <TopNav onToggleTheme={toggleTheme} theme={theme} hideBeacon />
      <main className="hp-main">
        <div className="hp-hero-grid">
          <Hero />
          <PulseCard entries={entries} />
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
