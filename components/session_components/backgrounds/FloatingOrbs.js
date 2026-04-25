'use client';

// Album covers as large softly-drifting circles
export default function FloatingOrbs({ albums = [] }) {
  if (!albums.length) return null;

  // Each orb gets a unique looping path via generated keyframes
  const keyframes = albums.map((_, i) => {
    const x1 = (Math.random() * 120 - 60).toFixed(1);
    const y1 = (Math.random() * 80  - 40).toFixed(1);
    const x2 = (Math.random() * 100 - 50).toFixed(1);
    const y2 = (Math.random() * 100 - 50).toFixed(1);
    return `@keyframes orb${i} {
      0%   { transform: translate(0px, 0px); }
      33%  { transform: translate(${x1}px, ${y1}px); }
      66%  { transform: translate(${x2}px, ${y2}px); }
      100% { transform: translate(0px, 0px); }
    }`;
  }).join('\n');

  const positions = [
    { top: '8%',  left: '5%',  size: 200 },
    { top: '5%',  left: '60%', size: 180 },
    { top: '55%', left: '2%',  size: 220 },
    { top: '60%', left: '55%', size: 190 },
    { top: '30%', left: '30%', size: 170 },
    { top: '15%', left: '82%', size: 200 },
    { top: '70%', left: '78%', size: 180 },
    { top: '42%', left: '14%', size: 160 },
  ];

  const durations = [22, 28, 18, 24, 32, 20, 26, 30];

  return (
    <>
      <style>{keyframes}</style>
      {albums.map((entry, i) => {
        const pos = positions[i % positions.length];
        return (
          <div key={entry.slug || i} style={{
            position: 'absolute', zIndex: 0, pointerEvents: 'none',
            top: pos.top, left: pos.left,
            width: pos.size, height: pos.size,
            borderRadius: '50%', overflow: 'hidden',
            boxShadow: '0 8px 40px rgba(0,0,0,0.14)',
            animation: `orb${i} ${durations[i % durations.length]}s ease-in-out infinite`,
          }}>
            <img src={entry.album_art} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        );
      })}
    </>
  );
}
