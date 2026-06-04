'use client';

import { useEffect, useRef } from 'react';

const AUTO_SPEED = 0.5; // px per frame while auto-scrolling

export default function AlbumStrip({ entries, onTileClick }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let raf = null;
    let paused = false;
    let dir = 1;

    // Roundabout depth: tiles shrink + dim as they near the screen edges.
    function applyDepth() {
      const center = window.innerWidth / 2;
      const track = el.firstElementChild;
      if (!track) return;
      for (const tile of track.children) {
        const r = tile.getBoundingClientRect();
        const tileCenter = r.left + r.width / 2;
        const norm = Math.min(Math.abs(tileCenter - center) / center, 1);
        const eased = norm * norm; // hold size near centre, fall off toward edges
        tile.style.setProperty('--depth', (1 - eased * 0.42).toFixed(3));
        tile.style.setProperty('--dim', (1 - eased * 0.4).toFixed(3));
      }
    }

    function tick() {
      if (!paused) {
        const max = el.scrollWidth - el.clientWidth;
        if (max > 0) {
          el.scrollLeft += AUTO_SPEED * dir;
          if (el.scrollLeft >= max)    { el.scrollLeft = max; dir = -1; }
          else if (el.scrollLeft <= 0) { el.scrollLeft = 0;   dir = 1;  }
        }
      }
      raf = requestAnimationFrame(tick);
    }

    function pause()  { paused = true;  }
    function resume() { paused = false; }

    // Translate vertical wheel to horizontal scroll for trackpads/mice.
    function onWheel(e) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    }

    el.addEventListener('mouseenter', pause);
    el.addEventListener('mouseleave', resume);
    el.addEventListener('touchstart', pause, { passive: true });
    el.addEventListener('touchend', resume, { passive: true });
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('scroll', applyDepth, { passive: true });
    window.addEventListener('resize', applyDepth);

    applyDepth();
    const settle = setTimeout(applyDepth, 120);
    raf = requestAnimationFrame(tick);

    return () => {
      el.removeEventListener('mouseenter', pause);
      el.removeEventListener('mouseleave', resume);
      el.removeEventListener('touchstart', pause);
      el.removeEventListener('touchend', resume);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('scroll', applyDepth);
      window.removeEventListener('resize', applyDepth);
      clearTimeout(settle);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [entries]);

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
