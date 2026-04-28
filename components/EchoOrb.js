'use client';
import { useRef, useEffect, useCallback } from 'react';

const MOOD_COLORS = {
  melancholic: '#6070a0',
  intense:     '#2a2030',
  warm:        '#c09060',
  curious:     '#8060c0',
  joyful:      '#80b040',
  thinking:    '#909090',
  default:     '#7060a0',
};

function hexToRgb(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

// Smoke particle system. Works at any canvas size — particle count, size,
// and boundary scale proportionally from a 1440×900 reference.
export default function EchoOrb({ mood = 'default', active = false, onClick, loading = false, albumArt = null, style = {} }) {
  const containerRef = useRef(null);
  const canvasRef    = useRef(null);
  const animRef      = useRef(null);
  const stateRef     = useRef({ mood, active, loading });
  const systemRef    = useRef(null);

  useEffect(() => {
    stateRef.current = { mood: active ? 'curious' : mood, active, loading };
  }, [mood, active, loading]);

  const initSystem = useCallback((w, h) => {
    const count = Math.max(6, Math.round(180 * (w * h) / (1440 * 900)));
    const cx = w / 2, cy = h / 2;
    const maxR = Math.min(w, h) * 0.4;
    const baseSize = Math.min(w, h) * 0.09;

    const particles = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * maxR;
      return {
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: baseSize + Math.random() * baseSize * 1.4,
        opacity: 0,
        targetOpacity: 0.04 + Math.random() * 0.09,
        phaseOffset: Math.random() * Math.PI * 2,
        age: Math.random() * 600,
      };
    });

    systemRef.current = { particles, w, h };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const canvas    = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    let lastW = 0, lastH = 0;
    let resizeTimer = null;

    function setup() {
      const { width, height } = container.getBoundingClientRect();
      const w = Math.round(width);
      const h = Math.round(height);
      if (w === lastW && h === lastH) return;
      lastW = w; lastH = h;
      canvas.width  = w;
      canvas.height = h;
      initSystem(w, h);
    }

    setup();

    const observer = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(setup, 700);
    });
    observer.observe(container);

    function draw() {
      const sys = systemRef.current;
      if (!sys) { animRef.current = requestAnimationFrame(draw); return; }
      const { particles, w, h } = sys;
      const { mood: m, loading: ld } = stateRef.current;
      const [r, g, b] = hexToRgb(MOOD_COLORS[m] || MOOD_COLORS.default);
      const speed  = ld ? 2.2 : 1;
      const opMult = ld ? 1.5 : 1;
      const cx = w / 2, cy = h / 2;
      const boundary = Math.min(w, h) * 0.42;

      ctx.clearRect(0, 0, w, h);

      for (const p of particles) {
        p.age += speed;

        const dx = cx - p.x, dy = cy - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > boundary * 0.55) {
          p.vx += dx * 0.00006;
          p.vy += dy * 0.00006;
        }
        p.vx += (Math.random() - 0.5) * 0.013 * speed;
        p.vy += (Math.random() - 0.5) * 0.013 * speed;
        p.vx *= 0.987;
        p.vy *= 0.987;
        p.x += p.vx * speed;
        p.y += p.vy * speed;

        const breatheOp = (Math.sin(p.age * 0.006 + p.phaseOffset) + 1) / 2;
        const tOp = p.targetOpacity * opMult * (0.45 + 0.55 * breatheOp);
        p.opacity += (tOp - p.opacity) * 0.02;

        const breatheSize = (Math.sin(p.age * 0.004 + p.phaseOffset * 1.3) + 1) / 2;
        const s = p.size * (0.78 + 0.22 * breatheSize);

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, s);
        grad.addColorStop(0, `rgba(${r},${g},${b},${p.opacity})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      clearTimeout(resizeTimer);
      observer.disconnect();
    };
  }, [initSystem]);

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      style={{
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
      {loading && albumArt && (
        <img
          src={albumArt}
          alt=""
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            width: '40%',
            height: '40%',
            objectFit: 'cover',
            borderRadius: 6,
            pointerEvents: 'none',
            boxShadow: '0 4px 28px rgba(0,0,0,0.45)',
            transition: 'opacity 0.5s ease',
          }}
        />
      )}
    </div>
  );
}
