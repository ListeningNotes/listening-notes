// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { beginVisit, isNewSince } from '../../library/dog_ear';

const AUTO_SPEED = 0.5; // px per frame while drifting

// The homepage shows the last twenty listens and nothing more — it's the
// front door, not the collection. Everything past twenty is one tap away on
// the archive, which the buttons under the strip point at. Entries arrive
// newest-first from the API (ORDER BY created_at DESC), so this is a
// straight take from the top.
//
// Was ten, which ran out of strip before it ran out of interest. Twenty is
// also ten rows of the phone's two-across grid, so it lengthens the scroll on
// both — that's the same number doing two jobs, worth remembering if only one
// of them ever needs changing.
const RECENT_LIMIT = 20;

// How far a finger can travel before a tap counts as a swipe instead. The
// strip is dragged by the same finger that taps a tile, and these are links
// now — without this, flicking the strip sideways lands you on whichever
// album happened to be under your thumb.
const TAP_SLOP = 8;

export default function AlbumStrip({ entries, variant = 'scroll' }) {
  const scrollRef = useRef(null);
  const draggedRef = useRef(false);
  const tapStartRef = useRef(null);

  // How far the reader had got last time. Read in an effect rather than
  // during render because it comes out of localStorage, which the server
  // doesn't have — starting at null means the first paint carries no badges
  // and they arrive a frame later, instead of the markup disagreeing with
  // itself between the server and the browser.
  //
  // The fold is set from the newest entry on the page, not from the clock —
  // see dog_ear.js for why comparing a row against Date.now() is wrong here.
  // Guarded by a ref so it happens once per visit: entries arriving again
  // must not move the fold and wipe the badges mid-read.
  //
  // The read and the write happen in a frame callback rather than in the
  // effect body itself — "a frame later" is literal. Setting state straight
  // from an effect body fails lint here (see NOTES, Gotchas), and the
  // callback is the shape it asks for.
  const [fold, setFold] = useState(null);
  const foldedRef = useRef(false);
  useEffect(() => {
    if (foldedRef.current || entries.length === 0) return undefined;
    const frame = requestAnimationFrame(() => {
      foldedRef.current = true;
      const newest = entries.reduce(
        (max, e) => (max === null || new Date(e.created_at) > new Date(max) ? e.created_at : max),
        null,
      );
      setFold(beginVisit(newest));
    });
    return () => cancelAnimationFrame(frame);
  }, [entries]);

  // A tile is a plain link to the entry now, so a swipe that ends on one
  // would otherwise navigate. These mark the gesture as a drag once the
  // finger passes TAP_SLOP on either axis, and the tile's click handler
  // bows out. Both axes matter: the scroll strip is dragged sideways, and
  // the phone's recent-listens grid sits inside a vertical scroller.
  function onTapStart(e) {
    draggedRef.current = false;
    const t = e.touches[0];
    tapStartRef.current = { x: t.clientX, y: t.clientY };
  }
  function onTapMove(e) {
    const start = tapStartRef.current;
    if (!start) return;
    const t = e.touches[0];
    if (Math.abs(t.clientX - start.x) > TAP_SLOP || Math.abs(t.clientY - start.y) > TAP_SLOP) {
      draggedRef.current = true;
    }
  }

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

    function tick() {
      offset += AUTO_SPEED * dir;
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
  const displayEntries = entries.slice(0, RECENT_LIMIT);

  // A tile is a plain link to the entry — no metadata step in between. The
  // flip-to-metadata card lives on the archive grid instead (FlipTile.js),
  // which is what tells the two grids apart: the homepage is "take me to
  // this record", the archive is "tell me about this record".
  return (
    <div
      className={'hp-strip' + (isGrid ? ' hp-strip--grid' : '')}
      ref={scrollRef}
      onTouchStart={onTapStart}
      onTouchMove={onTapMove}
    >
      <div className={'hp-strip-track' + (isGrid ? ' hp-strip-track--grid' : '')}>
        {displayEntries.map(entry => (
          <Link
            key={entry.id}
            href={`/entries/${entry.slug}`}
            className={'strip-tile' + (isGrid ? ' strip-tile--grid' : '')}
            onClick={e => { if (draggedRef.current) e.preventDefault(); }}
            aria-label={entry.album + ' by ' + entry.artist}
          >
            {entry.album_art
              ? <img src={entry.album_art} alt={entry.album} className="strip-tile-img" draggable={false} loading="lazy" />
              : <div className="strip-tile-placeholder">{entry.album?.[0] ?? '♪'}</div>
            }
            {/* Sits above the art rather than on the metadata card, because
                the strip has no card — a homepage tile is "take me to this
                record", and this is the one thing worth saying before you
                get there. */}
            {isNewSince(entry.created_at, fold) && (
              <span className="ln-new-mark" aria-label="Posted since your last visit">New</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
