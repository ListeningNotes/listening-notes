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

  function nudge(dir) {
    const el = trackRef.current;
    if (!el) return;
    const third = el.scrollWidth / 3;
    pausedRef.current = true;
    posRef.current += dir * 280;
    if (posRef.current < 0) posRef.current += third;
    if (posRef.current >= third) posRef.current -= third;
    el.style.transform = 'translateX(-' + posRef.current + 'px)';
    setTimeout(() => { pausedRef.current = false; }, 1200);
  }

  if (entries.length === 0) return null;

  return (
    <div className="strip-outer">
      <button className="strip-arrow strip-arrow--left" onClick={() => nudge(-1)} aria-label="Previous">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
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
        <div className="strip-fade-left" />
        <div className="strip-fade-right" />
      </div>
      <button className="strip-arrow strip-arrow--right" onClick={() => nudge(1)} aria-label="Next">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
  );
}
