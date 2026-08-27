// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useRef } from 'react';
import { backgroundScale } from '../../../library/background_scale';

const SPINE_W  = 32;
const HOLD_MS  = 3500;

// easing functions
const easeOut  = t => 1 - Math.pow(1 - t, 3);
const easeIn   = t => t * t * t;
const easeInOut= t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;

export default function Vinyl({ albums = [] }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!albums.length) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    let W, H, raf, spines, schedTimer;

    const images = albums.map(a => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = a.album_art;
      return img;
    });

    function dominantColor(img) {
      try {
        const c = document.createElement('canvas');
        c.width = 8; c.height = 8;
        const x = c.getContext('2d');
        x.drawImage(img, 0, 0, 8, 8);
        const d = x.getImageData(0, 0, 8, 8).data;
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i+1]; b += d[i+2]; }
        const n = d.length / 4;
        return [Math.round(r/n), Math.round(g/n), Math.round(b/n)];
      } catch { return [80, 80, 80]; }
    }

    function resize() {
      // Mobile draws into a larger coordinate space than it displays, so the
      // artwork keeps its desktop share of the screen. 1 on desktop.
      const k = backgroundScale();
      W = canvas.width  = Math.round((canvas.parentElement?.clientWidth  || window.innerWidth) / k);
      H = canvas.height = Math.round((canvas.parentElement?.clientHeight || window.innerHeight) / k);
      initSpines();
    }

    function initSpines() {
      const count = Math.floor(W / SPINE_W);
      const pool  = [...Array(images.length).keys()].sort(() => Math.random() - 0.5);
      spines = Array.from({ length: count }, (_, i) => ({
        imgIdx:   pool[i % pool.length],
        color:    [80, 80, 80],
        colorSet: false,
        homeX:    i * SPINE_W,
        // animation state
        phase:    'idle', // idle | lifting | expanding | holding | shrinking | lowering
        progress: 0,
        startT:   0,
      }));
      scheduleNext(1500);
    }

    function scheduleNext(delay) {
      clearTimeout(schedTimer);
      schedTimer = setTimeout(pickAndPull, delay ?? (1500 + Math.random() * 1000));
    }

    let active = -1;

    function pickAndPull() {
      if (active >= 0) return; // already animating
      active = Math.floor(Math.random() * spines.length);
      spines[active].phase    = 'lifting';
      spines[active].startT   = performance.now();
      spines[active].progress = 0;
    }

    // Phase durations in ms
    const DUR = { lifting: 700, expanding: 600, holding: HOLD_MS, shrinking: 500, lowering: 650 };

    function getPhaseProgress(s, now) {
      return Math.min((now - s.startT) / DUR[s.phase], 1);
    }

    function advancePhase(s, now) {
      const next = { lifting:'expanding', expanding:'holding', holding:'shrinking', shrinking:'lowering', lowering:'idle' };
      s.phase    = next[s.phase];
      s.startT   = now;
      s.progress = 0;
      if (s.phase === 'idle') {
        active = -1;
        scheduleNext();
      }
    }

    function drawSpine(s, now) {
      const CARD   = Math.min(W * 0.40, H * 0.65);
      const img    = images[s.imgIdx];
      const [r,g,b]= s.color;

      // Compute current geometry based on phase + progress
      let x = s.homeX, y = 0, w = SPINE_W, h = H, artAlpha = 0;

      if (s.phase === 'idle') {
        x = s.homeX; y = 0; w = SPINE_W; h = H;

      } else if (s.phase === 'lifting') {
        const p  = easeOut(getPhaseProgress(s, now));
        // Slide up: spine peeks up from shelf by ~15% of screen
        const lift = H * 0.15 * p;
        x = s.homeX; y = -lift; w = SPINE_W; h = H;

      } else if (s.phase === 'expanding') {
        const p  = easeInOut(getPhaseProgress(s, now));
        const lift = H * 0.15; // held at lifted position
        // Move to center, expand to cover art
        const tx = W / 2 - CARD / 2;
        const ty = H / 2 - CARD / 2;
        x = s.homeX + (tx - s.homeX) * p;
        y = -lift   + (ty - (-lift))  * p;
        w = SPINE_W + (CARD - SPINE_W) * p;
        h = H       + (CARD - H)       * p;
        artAlpha = Math.max(0, (p - 0.5) * 2); // art fades in second half

      } else if (s.phase === 'holding') {
        x = W / 2 - CARD / 2;
        y = H / 2 - CARD / 2;
        w = CARD; h = CARD; artAlpha = 1;

      } else if (s.phase === 'shrinking') {
        const p  = easeInOut(getPhaseProgress(s, now));
        const tx = s.homeX, ty = -H * 0.15;
        x = W / 2 - CARD / 2 + (tx - (W / 2 - CARD / 2)) * p;
        y = H / 2 - CARD / 2 + (ty - (H / 2 - CARD / 2)) * p;
        w = CARD + (SPINE_W - CARD) * p;
        h = CARD + (H - CARD)       * p;
        artAlpha = Math.max(0, 1 - p * 2);

      } else if (s.phase === 'lowering') {
        const p  = easeIn(getPhaseProgress(s, now));
        const lift = H * 0.15 * (1 - p);
        x = s.homeX; y = -lift; w = SPINE_W; h = H;
      }

      const isPulled = s.phase !== 'idle';

      ctx.save();
      ctx.shadowColor = isPulled ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.12)';
      ctx.shadowBlur  = isPulled ? 50 : 6;

      // Draw spine color
      if (artAlpha < 1) {
        const sg = ctx.createLinearGradient(x, y, x + w, y);
        sg.addColorStop(0,   `rgba(${r},${g},${b},0.95)`);
        sg.addColorStop(0.4, `rgba(${Math.min(r+35,255)},${Math.min(g+35,255)},${Math.min(b+35,255)},0.95)`);
        sg.addColorStop(1,   `rgba(${r},${g},${b},0.95)`);
        ctx.fillStyle   = sg;
        ctx.globalAlpha = 1 - artAlpha;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, w > SPINE_W * 2 ? 10 : 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        // Highlight edge
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(x, y, 2, h);
      }

      // Draw album art on top as it expands
      if (artAlpha > 0 && img?.complete) {
        ctx.globalAlpha = artAlpha;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 12);
        ctx.clip();
        ctx.drawImage(img, x, y, w, h);
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    }

    function loop() {
      const now = performance.now();
      ctx.clearRect(0, 0, W, H);

      spines.forEach(s => {
        const img = images[s.imgIdx];
        if (img?.complete && !s.colorSet) {
          s.color    = dominantColor(img);
          s.colorSet = true;
        }
        // Advance phase if duration elapsed
        if (s.phase !== 'idle' && (now - s.startT) >= DUR[s.phase]) {
          advancePhase(s, now);
        }
      });

      // Draw idle spines first, active on top
      spines.forEach((s, i) => { if (i !== active) drawSpine(s, now); });
      if (active >= 0) drawSpine(spines[active], now);

      raf = requestAnimationFrame(loop);
    }

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(schedTimer);
      window.removeEventListener('resize', resize);
    };
  }, [albums]);

  // width/height are what make the scaled coordinate space work: an
  // absolutely positioned canvas with only inset:0 keeps its intrinsic
  // bitmap size and overflows, instead of scaling the bitmap into the box.
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }} />;
}
