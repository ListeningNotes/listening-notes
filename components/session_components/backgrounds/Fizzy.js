'use client';
import { backgroundScale } from '../../../library/background_scale';

const COUNT = 32;

// depth 0 = far: tiny, slow, faint — depth 1 = close: large, fast, vivid
function makeParticle(i, albums) {
  const depth    = Math.random();
  // Bubbles keep their desktop share of the screen. 1 on desktop.
  const k        = backgroundScale();
  const size     = Math.round((28 + depth * 120) * k);   // 28px → 148px on desktop
  const duration = 36 - depth * 22;                // 36s (far) → 14s (close)
  const opacity  = 0.2 + depth * 0.7;
  const spin     = depth * 200;                     // close ones spin more
  return {
    left:     `${(i / COUNT) * 100 + (Math.random() * (100 / COUNT) - 50 / COUNT)}%`,
    bottom:   `${Math.random() * -20}%`,
    duration,
    delay:    -(Math.random() * duration),
    album:    albums[i % albums.length],
    rotate:   Math.random() * 360,
    spin,
    size,
    opacity,
    borderRadius: (6 + depth * 16) * k,
    shadow: depth > 0.7
      ? '0 12px 40px rgba(0,0,0,0.25)'
      : depth > 0.4
      ? '0 4px 16px rgba(0,0,0,0.12)'
      : 'none',
  };
}

export default function Fizzy({ albums = [] }) {
  if (!albums.length) return null;

  const particles = Array.from({ length: COUNT }, (_, i) => makeParticle(i, albums));

  const keyframes = particles.map((_, i) => `
    @keyframes rise${i} {
      0%   { transform: translateY(0)      rotate(var(--rot${i})); opacity: 0; }
      10%  { opacity: var(--op${i}); }
      90%  { opacity: calc(var(--op${i}) * 0.7); }
      100% { transform: translateY(-120vh) rotate(calc(var(--rot${i}) + ${particles[i].spin}deg)); opacity: 0; }
    }
  `).join('\n');

  return (
    <>
      <style>{keyframes}</style>
      {particles.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', zIndex: 0, pointerEvents: 'none',
          left: p.left, bottom: p.bottom,
          width: p.size, height: p.size,
          borderRadius: p.borderRadius, overflow: 'hidden',
          boxShadow: p.shadow,
          [`--rot${i}`]: `${p.rotate}deg`,
          [`--op${i}`]:  p.opacity,
          animation: `rise${i} ${p.duration}s linear ${p.delay}s infinite`,
        }}>
          <img src={p.album.album_art} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      ))}
    </>
  );
}
