// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// One cover bouncing off the edges, the next cover at every bounce.
//
// Drawn on a canvas since 2026-11-02, so the share printer can lay it into a
// print and record it (the printer brief: the DOM grounds are rewritten as
// canvas rather than taught to photograph themselves). Same size, speed and
// corners as the DOM one; the covers are asked for anonymously so the
// canvas stays readable.
'use client';
import { useEffect, useRef } from 'react';
import { backgroundScale } from '../../../library/background_scale';

const CARD = 250;
const R    = 24;
const VX   = 3.5, VY = 2.8;           // a frame's step, at sixty a second

export default function DVD({ albums = [] }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!albums.length) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    let W, H, raf, last = null;
    const s = { x: 100, y: 100, vx: VX, vy: VY, idx: 0 };

    const images = albums.map(a => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = a.album_art;
      return img;
    });

    function resize() {
      // Mobile draws into a larger coordinate space than it displays, so the
      // artwork keeps its desktop share of the screen. 1 on desktop.
      const k = backgroundScale();
      W = canvas.width  = Math.round((canvas.parentElement?.clientWidth  || window.innerWidth) / k);
      H = canvas.height = Math.round((canvas.parentElement?.clientHeight || window.innerHeight) / k);
    }

    function loop(now) {
      const steps = last === null ? 1 : Math.min(4, (now - last) / (1000 / 60));
      last = now;
      s.x += s.vx * steps;
      s.y += s.vy * steps;
      let hit = false;
      if (s.x <= 0)            { s.x = 0;            s.vx =  Math.abs(s.vx); hit = true; }
      if (s.x >= W - CARD)     { s.x = W - CARD;     s.vx = -Math.abs(s.vx); hit = true; }
      if (s.y <= 0)            { s.y = 0;            s.vy =  Math.abs(s.vy); hit = true; }
      if (s.y >= H - CARD)     { s.y = H - CARD;     s.vy = -Math.abs(s.vy); hit = true; }
      if (hit) s.idx = (s.idx + 1) % images.length;

      ctx.clearRect(0, 0, W, H);
      const img = images[s.idx];
      if (img?.complete && img.naturalWidth) {
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur  = 48;
        ctx.shadowOffsetY = 12;
        ctx.beginPath();
        ctx.roundRect(s.x, s.y, CARD, CARD, R);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(s.x, s.y, CARD, CARD, R);
        ctx.clip();
        ctx.drawImage(img, s.x, s.y, CARD, CARD);
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
