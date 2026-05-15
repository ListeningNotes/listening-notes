'use client';

import { useEffect, useRef, useCallback } from 'react';

export default function AlbumStrip({ entries, onTileClick }) {
  const trackRef = useRef(null);
  const animFrameRef = useRef(null);
  const posRef = useRef(0);
  const pausedRef = useRef(false);
  const speed = 0.5;

  const tiles = entries.length > 0 ? [...entries, ...entries, ...entries] : [];

  const tick = useCallback(() => {
    const el = trackRef.current;
    if (!el) { animFrameRef.current = requestAnimationFrame(tick); return; }
    if (!pausedRef.current) {
      const third = el.scrollWidth / 3;
      posRef.current += speed;
      if (posRef.current >= third) posRef.current -= third;
      el.style.transform = 'translateX(-' + posRef.current + 'px)';
    }
    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [tick, entries]);

  if (entries.length === 0) return null;

  return (
    <div className="strip-viewport">
      <div className="strip-track" ref={trackRef}>
        {tiles.map((entry, i) => (
          <button
            key={entry.id + '-' + i}
            className="strip-tile"
            onClick={() => onTileClick(entry.slug)}
            aria-label={entry.album + ' by ' + entry.artist}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            {entry.album_art
              ? <img src={entry.album_art} alt={entry.album} className="strip-tile-img" draggable={false} loading="lazy" />
              : <div className="strip-tile-placeholder">{entry.album?.[0] ?? '♪'}</div>
            }
            <div className="strip-tile-hover">
              <div className="strip-tile-hover-album">{entry.album}</div>
              <div className="strip-tile-hover-artist">{entry.artist}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
