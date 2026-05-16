'use client';

import { useEffect, useRef } from 'react';

export default function AlbumStrip({ entries, onTileClick }) {
  const scrollRef = useRef(null);

  // Let a vertical mouse-wheel scroll the strip horizontally.
  // Trackpads with horizontal intent already scroll natively.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function onWheel(e) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  if (entries.length === 0) return null;

  return (
    <div className="hp-strip" ref={scrollRef}>
      <div className="hp-strip-track">
        {entries.map(entry => (
          <button
            key={entry.id}
            className="strip-tile"
            onClick={() => onTileClick(entry.slug)}
            aria-label={entry.album + ' by ' + entry.artist}
          >
            {entry.album_art
              ? <img src={entry.album_art} alt={entry.album} className="strip-tile-img" draggable={false} loading="lazy" />
              : <div className="strip-tile-placeholder">{entry.album?.[0] ?? '♪'}</div>
            }
            <div className="strip-tile-hover">
              <div className="strip-tile-hover-album">{entry.album}</div>
              <div className="strip-tile-hover-artist">{entry.artist}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
