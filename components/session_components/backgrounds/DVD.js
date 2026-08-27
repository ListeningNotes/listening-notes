// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useRef } from 'react';
import { backgroundScale } from '../../../library/background_scale';

const W = 250, H = 250;

export default function DVD({ albums = [] }) {
  const wrapRef = useRef(null);
  const imgRef  = useRef(null);
  const state   = useRef({ x: 100, y: 100, vx: 3.5, vy: 2.8, idx: 0 });
  // Drawn with the DOM rather than a canvas, so the cover is sized directly
  // instead of by widening a coordinate space. 1 on desktop.
  const k = backgroundScale();
  const cw = Math.round(W * k), ch = Math.round(H * k);

  useEffect(() => {
    if (!albums.length) return;
    let raf;

    function tick() {
      const s    = state.current;
      const wrap = wrapRef.current;
      const img  = imgRef.current;
      if (!wrap || !img) return;

      const pw = wrap.clientWidth;
      const ph = wrap.clientHeight;

      s.x += s.vx;
      s.y += s.vy;

      let hit = false;
      if (s.x <= 0)      { s.x = 0;      s.vx =  Math.abs(s.vx); hit = true; }
      if (s.x >= pw - cw) { s.x = pw - cw; s.vx = -Math.abs(s.vx); hit = true; }
      if (s.y <= 0)       { s.y = 0;       s.vy =  Math.abs(s.vy); hit = true; }
      if (s.y >= ph - ch) { s.y = ph - ch; s.vy = -Math.abs(s.vy); hit = true; }

      if (hit) {
        s.idx = (s.idx + 1) % albums.length;
        img.src = albums[s.idx].album_art;
      }

      img.parentElement.style.left = `${s.x}px`;
      img.parentElement.style.top  = `${s.y}px`;
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [albums]);

  if (!albums.length) return null;

  return (
    <div ref={wrapRef} style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', width: cw, height: ch, borderRadius: Math.round(24 * k), overflow: 'hidden', boxShadow: '0 12px 48px rgba(0,0,0,0.2)', top: 100, left: 100 }}>
        <img ref={imgRef} src={albums[0]?.album_art} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
    </div>
  );
}
