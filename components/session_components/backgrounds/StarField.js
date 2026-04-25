'use client';

// Tiny album thumbnails drifting upward slowly, fading in and out
const COUNT = 24;
const SIZE  = 40;

export default function StarField({ albums = [] }) {
  if (!albums.length) return null;

  const particles = Array.from({ length: COUNT }, (_, i) => ({
    left:     `${(i / COUNT) * 100 + (Math.random() * (100 / COUNT) - 50 / COUNT)}%`,
    bottom:   `${Math.random() * -20}%`,
    duration: 14 + Math.random() * 16,
    delay:    -(Math.random() * 30),
    album:    albums[i % albums.length],
    rotate:   Math.random() * 360,
    size:     SIZE + Math.floor(Math.random() * 24),
  }));

  const keyframe = `@keyframes rise {
    0%   { transform: translateY(0)      rotate(var(--rot)); opacity: 0; }
    10%  { opacity: 0.8; }
    90%  { opacity: 0.6; }
    100% { transform: translateY(-120vh) rotate(calc(var(--rot) + 180deg)); opacity: 0; }
  }`;

  return (
    <>
      <style>{keyframe}</style>
      {particles.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', zIndex: 0, pointerEvents: 'none',
          left: p.left, bottom: p.bottom,
          width: p.size, height: p.size,
          borderRadius: 8, overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          '--rot': `${p.rotate}deg`,
          animation: `rise ${p.duration}s linear ${p.delay}s infinite`,
        }}>
          <img src={p.album.album_art} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      ))}
    </>
  );
}
