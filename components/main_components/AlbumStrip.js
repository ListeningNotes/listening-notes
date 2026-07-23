'use client';

import { useEffect, useRef } from 'react';

const AUTO_SPEED = 0.5; // px per frame while drifting

export default function AlbumStrip({ entries, onTileClick, openSlug, variant = 'scroll' }) {
  const scrollRef = useRef(null);
  const speedRef = useRef(1);        // current drift multiplier
  const targetSpeedRef = useRef(1);  // 1 = drifting, 0 = frozen (modal open)

  // Freeze the drift while a modal is open; the tick eases toward this target.
  useEffect(() => {
    targetSpeedRef.current = openSlug ? 0 : 1;
  }, [openSlug]);

  useEffect(() => {
    if (variant === 'grid') return; // static grid — no drift/touch/wheel drag
    const el = scrollRef.current;
    if (!el) return;
    const track = el.firstElementChild;
    if (!track) return;

    let raf = null;
    let dir = 1;
    let offset = 0;       // subpixel-precise horizontal position of the track
    let lastTouchX = null;

    function maxOffset() {
      return Math.max(track.scrollWidth - el.clientWidth, 0);
    }

    function clamp() {
      const max = maxOffset();
      if (offset >= max) { offset = max; dir = -1; }
      else if (offset <= 0) { offset = 0; dir = 1; }
    }

    // Roundabout depth: tiles ease down in size + brightness toward the edges.
    function applyDepth() {
      const center = window.innerWidth / 2;
      for (const tile of track.children) {
        const r = tile.getBoundingClientRect();
        const tileCenter = r.left + r.width / 2;
        const norm = Math.min(Math.abs(tileCenter - center) / center, 1);
        const eased = norm * norm; // hold size near centre, fall off toward edges
        tile.style.setProperty('--depth', (1 - eased * 0.18).toFixed(3));
        tile.style.setProperty('--dim', (1 - eased * 0.16).toFixed(3));
      }
    }

    // Drift eases to a stop when frozen and eases back in on resume; manual
    // input still adds to the offset regardless of the drift multiplier.
    function tick() {
      speedRef.current += (targetSpeedRef.current - speedRef.current) * 0.12;
      offset += AUTO_SPEED * dir * speedRef.current;
      clamp();
      track.style.transform = `translateX(${-offset}px)`;
      applyDepth();
      raf = requestAnimationFrame(tick);
    }

    // Either axis nudges the strip horizontally — sideways swipe or vertical wheel.
    function onWheel(e) {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta === 0) return;
      offset += delta;
      clamp();
      e.preventDefault();
    }

    function onTouchStart(e) { lastTouchX = e.touches[0].clientX; }
    function onTouchMove(e) {
      if (lastTouchX === null) return;
      const x = e.touches[0].clientX;
      offset -= x - lastTouchX;
      lastTouchX = x;
      clamp();
    }
    function onTouchEnd() { lastTouchX = null; }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('wheel', onWheel, { passive: false });

    raf = requestAnimationFrame(tick);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('wheel', onWheel);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [entries, variant]);

  if (entries.length === 0) return null;

  const isGrid = variant === 'grid';
  // The grid scrolls within its own container now, so it isn't limited to
  // what fits on one screen — just a sane cap so it doesn't load hundreds
  // of images if the account has a huge history.
  const displayEntries = isGrid ? entries.slice(0, 24) : entries;

  return (
    <div className={'hp-strip' + (isGrid ? ' hp-strip--grid' : '')} ref={scrollRef}>
      <div className={'hp-strip-track' + (isGrid ? ' hp-strip-track--grid' : '')}>
        {displayEntries.map(entry => (
          <button
            key={entry.id}
            data-tile-slug={entry.slug}
            className={'strip-tile' + (isGrid ? ' strip-tile--grid' : '') + (entry.slug === openSlug ? ' strip-tile--ghost' : '')}
            onClick={e => {
              const r = e.currentTarget.getBoundingClientRect();
              onTileClick(entry.slug, { left: r.left, top: r.top, width: r.width, height: r.height });
            }}
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
