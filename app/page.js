'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '../components/Sidebar';

export default function HomePage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);

  useEffect(() => {
    fetch('/api/entries')
      .then(r => r.json())
      .then(data => {
        // handle both {entries: [...]} and plain array
        const list = Array.isArray(data) ? data : (data.entries || []);
        setEntries(list);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="layout">
      <button
        className={`sb-hamburger ${mobileOpen ? 'sb-hamburger--open' : ''}`}
        onClick={() => setMobileOpen(v => !v)}
        aria-label="Toggle navigation"
      >
        <span /><span /><span />
      </button>

      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <main className="main">
        <div className="page-header">
          <h1 className="page-heading">
            <span className="page-heading-count">{loading ? '—' : entries.length}</span>
            <span className="page-heading-label">entries</span>
          </h1>
        </div>

        {loading ? (
          <div className="grid-loading">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="tile--skeleton" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="grid-empty">No entries yet.</div>
        ) : (
          <div className="album-grid">
            {entries.map(entry => (
              <AlbumTile
                key={entry.id}
                entry={entry}
                hovered={hoveredId === entry.id}
                onHover={setHoveredId}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function AlbumTile({ entry, hovered, onHover }) {
  const stars = entry.rating ? Math.round(entry.rating) : null;

  return (
    <Link
      href={`/entries/${entry.slug}`}
      className={`tile ${hovered ? 'tile--hovered' : ''}`}
      onMouseEnter={() => onHover(entry.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="tile-art-wrap">
        {entry.album_art ? (
          <img
            src={entry.album_art}
            alt={`${entry.album} by ${entry.artist}`}
            className="tile-art"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="tile-art-placeholder">
            <span>{entry.album?.[0] ?? '♪'}</span>
          </div>
        )}
        <div className="tile-overlay">
          <div className="tile-overlay-inner">
            <div className="tile-overlay-album">{entry.album}</div>
            <div className="tile-overlay-artist">{entry.artist}</div>
            {entry.year && <div className="tile-overlay-year">{entry.year}</div>}
            {stars && (
              <div className="tile-overlay-stars">
                {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="tile-label">
        <span className="tile-label-album">{entry.album}</span>
        <span className="tile-label-artist">{entry.artist}</span>
      </div>
    </Link>
  );
}
