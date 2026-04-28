'use client';
import { useRef, useEffect } from 'react';

const MOOD_RGB = {
  melancholic: [96,  112, 160],
  intense:     [42,  32,  48 ],
  warm:        [192, 144, 96 ],
  curious:     [128, 96,  192],
  joyful:      [128, 176, 64 ],
  thinking:    [144, 144, 144],
  default:     [112, 96,  160],
};

// 56px rounded-square orb — album art fills it, smoke halo orbits outside.
export default function EchoOrb({ albumArt = '', mood = 'default', active = false, loading = false, onClick }) {
  const canvasRef = useRef(null);
  const propsRef  = useRef({ mood, active, loading });
  useEffect(() => { propsRef.current = { mood, active, loading }; });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const SIZE = 96; // canvas px — larger than orb so halo can bleed outside
    canvas.width  = SIZE;
    canvas.height = SIZE;

    // Halo particles orbit just outside the 56px orb (radius 28px → orbit ~32–38px)
    const particles = Array.from({ length: 28 }, (_, i) => ({
      angle:      (i / 28) * Math.PI * 2 + Math.random() * 0.15,
      r:          32 + Math.random() * 6,
      speed:      0.005 + Math.random() * 0.007,
      size:       1.4 + Math.random() * 2.2,
      phase:      Math.random() * Math.PI * 2,
      phaseSpeed: 0.014 + Math.random() * 0.018,
    }));

    let raf;
    function draw() {
      const { mood: m, active: a, loading: l } = propsRef.current;
      ctx.clearRect(0, 0, SIZE, SIZE);

      const [r, g, b]  = MOOD_RGB[m] || MOOD_RGB.default;
      const speedMult  = l ? 2.6 : a ? 1.5 : 1;
      const cx = SIZE / 2, cy = SIZE / 2;

      particles.forEach(p => {
        p.angle += p.speed * speedMult;
        p.phase += p.phaseSpeed * speedMult;

        const wobble = Math.sin(p.phase) * 2.8;
        const px = cx + Math.cos(p.angle) * (p.r + wobble);
        const py = cy + Math.sin(p.angle) * (p.r + wobble);

        const pulse     = 0.5 + 0.5 * Math.sin(p.phase * 0.8);
        const baseAlpha = l ? 0.92 : a ? 0.78 : 0.52;
        const alpha     = baseAlpha * pulse;

        const grad = ctx.createRadialGradient(px, py, 0, px, py, p.size * 2.2);
        grad.addColorStop(0, `rgba(${r},${g},${b},${alpha.toFixed(3)})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, p.size * 2.2, 0, Math.PI * 2);
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <div
        onClick={onClick}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          zIndex: 20,
          cursor: onClick ? 'pointer' : 'default',
        }}
      >
        {/* Halo — centered on orb, bleeds outside */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top:  '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            width:  96,
            height: 96,
            pointerEvents: 'none',
          }}
        />

        {/* Orb — album art fills the square */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 8,
          overflow: 'hidden',
          background: '#1a1520',
          boxShadow: '0 4px 20px rgba(0,0,0,0.38)',
          animation: loading ? 'echo-orb-pulse 0.85s ease-in-out infinite' : 'none',
        }}>
          {albumArt && (
            <img
              src={albumArt}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes echo-orb-pulse {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.07); }
        }
      `}</style>
    </>
  );
}
