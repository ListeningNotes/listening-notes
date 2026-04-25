'use client';

// Each lane: how many degrees to spin over the full fall (slow lazy tumble)
const LANES = [
  { left: '3%',  size: 150, duration: 28, delay: 0,  from:   0, to:  200 },
  { left: '14%', size: 120, duration: 34, delay: 6,  from:  15, to: -230 },
  { left: '26%', size: 160, duration: 24, delay: 2,  from: -10, to:  180 },
  { left: '38%', size: 130, duration: 30, delay: 12, from:  20, to: -190 },
  { left: '52%', size: 145, duration: 26, delay: 4,  from:  -5, to:  220 },
  { left: '64%', size: 120, duration: 36, delay: 8,  from:  10, to: -170 },
  { left: '76%', size: 155, duration: 22, delay: 3,  from: -15, to:  210 },
  { left: '88%', size: 130, duration: 32, delay: 10, from:   5, to: -200 },
];

export default function RainingAlbums({ albums = [] }) {
  return (
    <>
      <style>{`
        @keyframes rain {
          from { transform: translateY(-220px) rotate(var(--r-from)); }
          to   { transform: translateY(110vh)  rotate(var(--r-to));   }
        }
      `}</style>
      {albums.map((entry, i) => {
        const lane = LANES[i % LANES.length];
        return (
          <div key={entry.slug || i} style={{
            position: 'absolute', zIndex: 0,
            width: lane.size, height: lane.size,
            left: lane.left, top: 0,
            borderRadius: 24, overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            pointerEvents: 'none',
            '--r-from': `${lane.from}deg`,
            '--r-to':   `${lane.to}deg`,
            animation: `rain ${lane.duration}s linear ${lane.delay}s infinite`,
            animationFillMode: 'backwards',
          }}>
            <img src={entry.album_art} alt={entry.album} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        );
      })}
    </>
  );
}
