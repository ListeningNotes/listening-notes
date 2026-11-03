// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// Covers rising like bubbles: far ones tiny, slow and faint, close ones large,
// fast and turning.
//
// Drawn on a canvas since 2026-11-02, so the share printer can lay it into a
// print and record it (the printer brief). Same depths, speeds, spin and
// fades as the DOM one it replaces.
'use client';
import { useEffect, useRef } from 'react';
import { backgroundScale } from '../../../library/background_scale';

const COUNT = 32;

// depth 0 = far: tiny, slow, faint — depth 1 = close: large, fast, vivid
function makeParticle(i) {
  const depth    = Math.random();
  const duration = 36 - depth * 22;                // 36s (far) → 14s (close)
  return {
    lane:     (i / COUNT) + (Math.random() * (1 / COUNT) - 0.5 / COUNT),
    bottom:   Math.random() * -0.2,                // a share of the height
    size:     28 + depth * 120,                    // 28 → 148
    duration,
    start:    -(Math.random() * duration),
    opacity:  0.2 + depth * 0.7,
    rotate:   Math.random() * 360,
    spin:     depth * 200,
    radius:   6 + depth * 16,
    shadow:   depth > 0.7 ? [40, 0.25, 12] : depth > 0.4 ? [16, 0.12, 4] : null,
    album:    i,
  };
}

export default function Fizzy({ albums = [] }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!albums.length) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    let W, H, raf;
    const begun = performance.now();

    const images = albums.map(a => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = a.album_art;
      return img;
    });
    const particles = Array.from({ length: COUNT }, (_, i) => makeParticle(i));

    function resize() {
      // Mobile draws into a larger coordinate space than it displays, so the
      // artwork keeps its desktop share of the screen. 1 on desktop.
      const k = backgroundScale();
      W = canvas.width  = Math.round((canvas.parentElement?.clientWidth  || window.innerWidth) / k);
      H = canvas.height = Math.round((canvas.parentElement?.clientHeight || window.innerHeight) / k);
    }

    function loop(now) {
      const seconds = (now - begun) / 1000;
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        const img = images[p.album % images.length];
        if (!img?.complete || !img.naturalWidth) continue;
        const t = (((seconds - p.start) % p.duration) + p.duration) % p.duration / p.duration;
        // In over the first tenth, down to seven tenths by the ninth, out by the end.
        const alpha = t < 0.1 ? (t / 0.1) * p.opacity
          : t < 0.9 ? p.opacity * (1 - 0.3 * (t - 0.1) / 0.8)
          : p.opacity * 0.7 * (1 - (t - 0.9) / 0.1);
        const x = p.lane * W;
        const y = H - p.bottom * H - p.size - t * H * 1.2;
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.translate(x + p.size / 2, y + p.size / 2);
        ctx.rotate(((p.rotate + p.spin * t) * Math.PI) / 180);
        if (p.shadow) {
          ctx.save();
          ctx.shadowBlur = p.shadow[0];
          ctx.shadowColor = `rgba(0,0,0,${p.shadow[1]})`;
          ctx.shadowOffsetY = p.shadow[2];
          ctx.beginPath();
          ctx.roundRect(-p.size / 2, -p.size / 2, p.size, p.size, p.radius);
          ctx.fill();
          ctx.restore();
        }
        ctx.beginPath();
        ctx.roundRect(-p.size / 2, -p.size / 2, p.size, p.size, p.radius);
        ctx.clip();
        ctx.drawImage(img, -p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
      raf = requestAnimationFrame(loop);
    }

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [albums]);

  // width/height are what make the scaled coordinate space work: an
  // absolutely positioned canvas with only inset:0 keeps its intrinsic
  // bitmap size and overflows, instead of scaling the bitmap into the box.
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }} />;
}
