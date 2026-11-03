// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// Covers falling in lanes, big ones a little faster, each at a slight tilt.
//
// Drawn on a canvas since 2026-11-02, so the share printer can lay it into a
// print and record it (the printer brief). Same lanes, sizes, speeds and
// tilt as the DOM one it replaces.
'use client';
import { useEffect, useRef } from 'react';
import { backgroundScale } from '../../../library/background_scale';

const TILE_MIN  = 80;
const TILE_MAX  = 280;
const GAP       = 24;
const FALL_MIN  = 14;
const FALL_MAX  = 28;
const LEAD      = 180;               // how far above the top a tile starts

export default function Rain({ albums = [] }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!albums.length) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    let W, H, raf, tiles = [];
    const begun = performance.now();

    const images = albums.map(a => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = a.album_art;
      return img;
    });

    function build() {
      const lanes = Math.max(3, Math.floor(W / (TILE_MAX + GAP)));
      const step  = W / lanes;
      // Shuffle once, deal round-robin — no repeats until all albums shown
      const order = [...images.keys()].sort(() => Math.random() - 0.5);
      let cursor = 0;
      tiles = [];
      for (let lane = 0; lane < lanes; lane++) {
        for (let i = 0; i < 2; i++) {
          const img = order[cursor++ % order.length];
          // Bias toward extremes so "close" and "far" tiles are more common than mid-size
          const t    = Math.random();
          const size = Math.round(TILE_MIN + (t < 0.4 ? t / 0.4 * 0.3 : (t - 0.4) / 0.6) * (TILE_MAX - TILE_MIN));
          const dur  = FALL_MIN + Math.random() * (FALL_MAX - FALL_MIN);
          // Bigger tiles fall slightly faster (parallax feel)
          const speed = dur * (1 - (size - TILE_MIN) / (TILE_MAX - TILE_MIN) * 0.3);
          tiles.push({
            x: lane * step + (step - size) / 2, size, dur: speed,
            start: -(Math.random() * speed), img, angle: ((Math.random() - 0.5) * 12 * Math.PI) / 180,
          });
        }
      }
    }

    function resize() {
      // Mobile draws into a larger coordinate space than it displays, so the
      // artwork keeps its desktop share of the screen. 1 on desktop.
      const k = backgroundScale();
      W = canvas.width  = Math.round((canvas.parentElement?.clientWidth  || window.innerWidth) / k);
      H = canvas.height = Math.round((canvas.parentElement?.clientHeight || window.innerHeight) / k);
      build();
    }

    function loop(now) {
      const seconds = (now - begun) / 1000;
      ctx.clearRect(0, 0, W, H);
      for (const tile of tiles) {
        const img = images[tile.img];
        if (!img?.complete || !img.naturalWidth) continue;
        const t = (((seconds - tile.start) % tile.dur) + tile.dur) % tile.dur / tile.dur;
        const y = -LEAD + t * (H + LEAD * 2);
        ctx.save();
        ctx.translate(tile.x + tile.size / 2, y + tile.size / 2);
        ctx.rotate(tile.angle);
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.25)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 8;
        ctx.beginPath();
        ctx.roundRect(-tile.size / 2, -tile.size / 2, tile.size, tile.size, 16);
        ctx.fill();
        ctx.restore();
        ctx.beginPath();
        ctx.roundRect(-tile.size / 2, -tile.size / 2, tile.size, tile.size, 16);
        ctx.clip();
        ctx.drawImage(img, -tile.size / 2, -tile.size / 2, tile.size, tile.size);
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
