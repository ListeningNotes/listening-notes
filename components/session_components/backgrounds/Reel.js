'use client';
import { useEffect, useRef } from 'react';

const CARD  = 220;
const R     = 16;
const COUNT = 10;

export default function Reel({ albums = [] }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!albums.length) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    let W, H, raf;

    const images = albums.map(a => {
      const img = new Image();
      img.src = a.album_art;
      return img;
    });

    const slotAngle = (Math.PI * 2) / COUNT;

    // Initialize slots with no duplicates
    function freshSlots() {
      const pool = [...Array(images.length).keys()].sort(() => Math.random() - 0.5);
      return Array.from({ length: COUNT }, (_, i) => pool[i % pool.length]);
    }
    const slots = freshSlots();

    let angle      = 0;
    let target     = 0;
    let angVel     = 0.28 + Math.random() * 0.16; // start spinning immediately
    let lastBack   = -1;

    let phase      = 'spinning';
    let phaseTimer = 0;
    let ticksLeft  = 0;

    function pickUnused() {
      const used = new Set(slots);
      const avail = [...Array(images.length).keys()].filter(i => !used.has(i));
      return avail.length > 0
        ? avail[Math.floor(Math.random() * avail.length)]
        : Math.floor(Math.random() * images.length);
    }

    function snapToSlot() {
      const front = Math.PI / 2;
      const k     = Math.round((front - target) / slotAngle);
      target      = front - k * slotAngle;
    }

    function swapBack(angleRef) {
      let minSin = Infinity, backSlot = 0;
      for (let i = 0; i < COUNT; i++) {
        const s = Math.sin(angleRef + i * slotAngle);
        if (s < minSin) { minSin = s; backSlot = i; }
      }
      if (backSlot !== lastBack) {
        slots[backSlot] = pickUnused();
        lastBack = backSlot;
      }
    }

    function startSpin() {
      angVel = 0.28 + Math.random() * 0.16;
      phase  = 'spinning';
    }

    function rr(ax, ay, w, h) {
      ctx.beginPath();
      ctx.moveTo(ax + R, ay);
      ctx.lineTo(ax + w - R, ay);
      ctx.quadraticCurveTo(ax + w, ay, ax + w, ay + R);
      ctx.lineTo(ax + w, ay + h - R);
      ctx.quadraticCurveTo(ax + w, ay + h, ax + w - R, ay + h);
      ctx.lineTo(ax + R, ay + h);
      ctx.quadraticCurveTo(ax, ay + h, ax, ay + h - R);
      ctx.lineTo(ax, ay + R);
      ctx.quadraticCurveTo(ax, ay, ax + R, ay);
      ctx.closePath();
    }

    function drawReel(renderAngle, globalAlpha) {
      const cx      = W / 2;
      const radiusX = W * 0.34;
      const radiusY = H * 0.28;
      const cy      = H * 0.72 - radiusY; // front card lands at 72% down

      // sinA=depth (1=front/bottom, -1=back/top), cosA=horizontal spread
      const order = Array.from({ length: COUNT }, (_, i) => i)
        .sort((a, b) => Math.sin(renderAngle + a * slotAngle) - Math.sin(renderAngle + b * slotAngle));

      order.forEach(i => {
        const a      = renderAngle + i * slotAngle;
        const z      = Math.sin(a);
        const t      = (z + 1) / 2;
        const scale  = 0.22 + 1.1 * Math.pow(t, 3.2); // steep curve = clear front card
        const alpha  = globalAlpha * (0.1 + 0.9 * Math.pow(t, 2.0));
        const w      = CARD * scale;
        const x      = cx + Math.cos(a) * radiusX - w / 2;
        const y      = cy + z * radiusY - w / 2;
        const img    = images[slots[i]];
        if (!img?.complete) return;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur  = 30 * scale;
        rr(x, y, w, w);
        ctx.clip();
        ctx.drawImage(img, x, y, w, w);
        ctx.restore();

        if (z > 0.85 && globalAlpha > 0.8) {
          ctx.save();
          ctx.globalAlpha = 0.22;
          ctx.strokeStyle = '#fff';
          ctx.lineWidth   = 3;
          rr(x, y, w, w);
          ctx.stroke();
          ctx.restore();
        }
      });
    }

    function loop() {
      // State machine
      if (phase === 'waiting') {
        if (--phaseTimer <= 0) startSpin();

      } else if (phase === 'spinning') {
        target -= angVel;
        angVel *= 0.988;
        swapBack(target); // replace albums as they rotate through the back
        if (angVel < 0.008) {
          snapToSlot();
          phase = 'settling';
        }

      } else if (phase === 'settling') {
        // Wait until angle is very close to target before starting ticks
        if (Math.abs(target - angle) < 0.005) {
          angle      = target;
          ticksLeft  = 6 + Math.floor(Math.random() * 8);
          phaseTimer = 50 + Math.floor(Math.random() * 40);
          phase      = 'ticking';
        }

      } else if (phase === 'ticking') {
        if (--phaseTimer <= 0) {
          if (ticksLeft > 0) {
            target    -= slotAngle;
            swapBack(target);
            ticksLeft--;
            phaseTimer = 110 + Math.floor(Math.random() * 90);
          } else {
            phaseTimer = 40 + Math.floor(Math.random() * 60);
            phase      = 'waiting';
          }
        }
      }

      // Ease current angle toward target
      const ease = phase === 'spinning' ? 0.18 : phase === 'settling' ? 0.04 : 0.06;
      angle += (target - angle) * ease;

      ctx.clearRect(0, 0, W, H);

      drawReel(angle, 1);

      raf = requestAnimationFrame(loop);
    }

    function resize() {
      W = canvas.width  = canvas.parentElement?.clientWidth  || window.innerWidth;
      H = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    }

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [albums]);

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }} />;
}
