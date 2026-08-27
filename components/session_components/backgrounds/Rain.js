// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useRef, useState } from 'react';
import { backgroundScale } from '../../../library/background_scale';

const TILE_MIN  = 80;
const TILE_MAX  = 280;
const GAP       = 24;
const FALL_MIN  = 14;
const FALL_MAX  = 28;

export default function Rain({ albums = [] }) {
  const wrapRef   = useRef(null);
  const [tiles, setTiles] = useState([]);

  useEffect(() => {
    if (!albums.length) return;

    function build() {
      const W      = wrapRef.current?.clientWidth || window.innerWidth;
      // Tiles keep their desktop share of the width. 1 on desktop.
      const k      = backgroundScale();
      const tMin   = TILE_MIN * k, tMax = TILE_MAX * k, gap = GAP * k;
      const lanes  = Math.max(3, Math.floor(W / (tMax + gap)));
      const step   = W / lanes;
      const built  = [];

      // Shuffle once, deal round-robin — no repeats until all albums shown
      const shuffled = [...albums].sort(() => Math.random() - 0.5);
      let cursor = 0;

      for (let lane = 0; lane < lanes; lane++) {
        for (let i = 0; i < 2; i++) {
          const img  = shuffled[cursor % shuffled.length];
          cursor++;
          // Bias toward extremes so "close" and "far" tiles are more common than mid-size
          const t    = Math.random();
          const size = Math.round(tMin + (t < 0.4 ? t / 0.4 * 0.3 : (t - 0.4) / 0.6) * (tMax - tMin));
          const dur  = FALL_MIN + Math.random() * (FALL_MAX - FALL_MIN);
          // Bigger tiles fall slightly faster (parallax feel)
          const speed = dur * (1 - (size - tMin) / (tMax - tMin) * 0.3);
          const delay = -(Math.random() * speed);
          const angle = (Math.random() - 0.5) * 12;
          const x    = lane * step + (step - size) / 2;
          built.push({ id: `${lane}-${i}`, x, size, dur: speed, delay, img, angle });
        }
      }
      setTiles(built);
    }

    build();
    window.addEventListener('resize', build);
    return () => window.removeEventListener('resize', build);
  }, [albums]);

  return (
    <div ref={wrapRef} style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      pointerEvents: 'none', zIndex: 0,
    }}>
      <style>{`
        @keyframes rain-fall {
          from { transform: translateY(-180px) rotate(var(--angle)); }
          to   { transform: translateY(calc(100vh + 180px)) rotate(var(--angle)); }
        }
      `}</style>

      {tiles.map(t => (
        <div
          key={t.id}
          style={{
            position:  'absolute',
            left:      t.x,
            top:       0,
            width:     t.size,
            height:    t.size,
            '--angle': `${t.angle}deg`,
            animation: `rain-fall ${t.dur}s ${t.delay}s linear infinite`,
            borderRadius: 16,
            overflow:  'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          }}
        >
          <img
            src={t.img?.album_art}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      ))}
    </div>
  );
}
