'use client';
import { useEffect, useRef } from 'react';

const TILE = 90;

export default function WaveGrid({ albums = [] }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!albums.length) return;
    const el = containerRef.current;
    if (!el) return;
    let raf, t = 0;

    function tick() {
      const tiles = el.querySelectorAll('.wg-tile');
      tiles.forEach((tile) => {
        const col = parseInt(tile.dataset.col);
        const row = parseInt(tile.dataset.row);
        const wave = Math.sin(t + col * 0.5) * 8 + Math.cos(t * 0.7 + row * 0.5) * 6;
        const scale = 0.92 + Math.abs(Math.sin(t * 0.5 + col * 0.3 + row * 0.4)) * 0.12;
        tile.style.transform = `translateY(${wave}px) scale(${scale})`;
      });
      t += 0.022;
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [albums]);

  if (!albums.length) return null;

  const cols = Math.ceil(window?.innerWidth  / TILE) + 2 || 22;
  const rows = Math.ceil(window?.innerHeight / TILE) + 2 || 14;

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {Array.from({ length: rows }, (_, row) =>
        Array.from({ length: cols }, (_, col) => {
          const album = albums[(row * cols + col) % albums.length];
          return (
            <div
              key={`${row}-${col}`}
              className="wg-tile"
              data-col={col}
              data-row={row}
              style={{
                position: 'absolute',
                left: col * TILE - TILE,
                top:  row * TILE - TILE,
                width: TILE - 4, height: TILE - 4,
                borderRadius: 10, overflow: 'hidden',
                willChange: 'transform',
              }}
            >
              <img src={album.album_art} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          );
        })
      )}
    </div>
  );
}
