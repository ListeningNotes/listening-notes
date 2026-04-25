'use client';
import { useEffect, useRef } from 'react';

const W = 160, H = 160;

export default function BouncingDVD({ albums = [] }) {
  const ref   = useRef(null);
  const state = useRef({ x: 200, y: 200, vx: 1.8, vy: 1.4, idx: 0 });

  useEffect(() => {
    if (!albums.length) return;
    let raf;

    function tick() {
      const s  = state.current;
      const el = ref.current;
      if (!el) return;
      const pw = el.parentElement?.clientWidth  || window.innerWidth;
      const ph = el.parentElement?.clientHeight || window.innerHeight;

      let hit = false;
      s.x += s.vx; s.y += s.vy;
      if (s.x <= 0)      { s.x = 0;      s.vx =  Math.abs(s.vx); hit = true; }
      if (s.x >= pw - W) { s.x = pw - W; s.vx = -Math.abs(s.vx); hit = true; }
      if (s.y <= 0)      { s.y = 0;      s.vy =  Math.abs(s.vy); hit = true; }
      if (s.y >= ph - H) { s.y = ph - H; s.vy = -Math.abs(s.vy); hit = true; }

      if (hit) {
        s.idx = (s.idx + 1) % albums.length;
        const img = el.querySelector('img');
        if (img) img.src = albums[s.idx].album_art;
      }

      el.style.transform = `translate(${s.x}px, ${s.y}px)`;
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [albums]);

  if (!albums.length) return null;

  return (
    <div ref={ref} style={{
      position: 'absolute', zIndex: 0, pointerEvents: 'none',
      width: W, height: H, borderRadius: 20, overflow: 'hidden',
      boxShadow: '0 12px 48px rgba(0,0,0,0.2)',
    }}>
      <img src={albums[0]?.album_art} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    </div>
  );
}
