'use client';
import { useEffect, useRef } from 'react';
import { backgroundScale } from '../../../library/background_scale';

const CARD        = 250;
const GRAV        = 0.38;
const BOUNCE      = .7;
const R           = 10;
const STAMP_EVERY = 2;   // stamp a copy every N frames
const MAX_STAMPS  = 700;
const FADE_TAIL   = 0.25; // oldest 25% of stamps fade out

export default function Solitaire({ albums = [] }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!albums.length) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    let W, H, raf;
    let cards   = [];
    let stamps  = []; // { x, y, imgIdx } — permanent, never cleared
    let queue   = []; // { delay } pending spawns in current burst
    let timer   = 40; // frames until first burst

    const images = albums.map(a => {
      const img = new Image();
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

    function spawn() {
      const imgIdx = Math.floor(Math.random() * images.length);
      const dir    = Math.random() < 0.5 ? -1 : 1;
      cards.push({
        x:          CARD + Math.random() * (W - CARD * 2),
        y:          Math.random() * (H / 8),
        vx:         dir * (3 + Math.random() * 8),
        vy:         -2 + Math.random() * -4,
        grav:       GRAV,
        bounce:     BOUNCE,
        imgIdx,
        frame:      0,
        dead:       false,
      });
    }

    function scheduleBurst() {
      queue.push(0); // always exactly one card
      timer = 80 + Math.floor(Math.random() * 140);
    }

    function rr(x, y) {
      ctx.beginPath();
      ctx.moveTo(x + R, y);
      ctx.lineTo(x + CARD - R, y);
      ctx.quadraticCurveTo(x + CARD, y, x + CARD, y + R);
      ctx.lineTo(x + CARD, y + CARD - R);
      ctx.quadraticCurveTo(x + CARD, y + CARD, x + CARD - R, y + CARD);
      ctx.lineTo(x + R, y + CARD);
      ctx.quadraticCurveTo(x, y + CARD, x, y + CARD - R);
      ctx.lineTo(x, y + R);
      ctx.quadraticCurveTo(x, y, x + R, y);
      ctx.closePath();
    }

    function loop() {
      // Burst timer
      timer--;
      if (timer <= 0) scheduleBurst();

      // Fire queued spawns
      queue = queue
        .map(d => d - 1)
        .filter(d => { if (d <= 0) { spawn(); return false; } return true; });

      // Update cards
      cards.forEach(c => {
        c.vy    += c.grav;
        c.x     += c.vx;
        c.y     += c.vy;
        c.frame++;

        if (c.frame % STAMP_EVERY === 0) {
          stamps.push({ x: c.x, y: c.y, imgIdx: c.imgIdx });
        }

        if (c.y + CARD >= H) {
          c.y  = H - CARD;
          c.vy = -Math.abs(c.vy) * c.bounce;
          if (Math.abs(c.vy) < 1.5) c.dead = true;
        }

        if (c.x < -CARD * 2 || c.x > W + CARD * 2) c.dead = true;
      });
      cards = cards.filter(c => !c.dead);

      // Cap stamps so it doesn't grow forever
      if (stamps.length > MAX_STAMPS) stamps.splice(0, stamps.length - MAX_STAMPS);

      // Draw
      ctx.clearRect(0, 0, W, H);

      const fadeCount = Math.floor(stamps.length * FADE_TAIL);
      stamps.forEach((s, i) => {
        const img = images[s.imgIdx];
        if (!img?.complete) return;
        ctx.globalAlpha = i < fadeCount ? i / fadeCount : 1;
        ctx.drawImage(img, s.x, s.y, CARD, CARD);
      });
      ctx.globalAlpha = 1;

      cards.forEach(c => {
        const img = images[c.imgIdx];
        if (!img?.complete) return;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur  = 14;
        rr(c.x, c.y);
        ctx.clip();
        ctx.drawImage(img, c.x, c.y, CARD, CARD);
        ctx.restore();
      });

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
