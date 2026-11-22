// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// The place, 2026-11-21 (Miyel: "this is the direction"). On the keeper's
// phone the app opens into a room, not a feed: album art that never stops
// moving, Start a listen at the foot and the rooms as glass keys under it.
// A key raises that room over the place like a shelf (HomeNav, roomUp); the
// X takes it down again and the place is still going underneath.
//
// The keeper's alone, and a phone's alone: a visitor gets the journal as it
// was, and a desk keeps its spine (nav.css hides this above 768px).
//
// One room so far, the listening room: the album logged last, large and
// turning like a record, its own colour washing the room, the rest of the
// covers circling it at a distance. The other rooms come later, one each
// time the app is opened.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Globe, SquaresFour, User, Users, X } from '@phosphor-icons/react';
import { readArtColor, sizedAlbumArt } from '../../library/music_data_api';

const CIRCLING = 12;

// The covers the room is made of: the newest first, each loaded once.
function useCovers(entries) {
  const [covers, setCovers] = useState([]);
  const key = entries.slice(0, CIRCLING + 1).map(e => e.album_art).join('|');
  useEffect(() => {
    const list = entries.filter(e => e.album_art).slice(0, CIRCLING + 1);
    setCovers(list.map((e, i) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = sizedAlbumArt(e.album_art, i === 0 ? 600 : 160);
      return img;
    }));
    // The list is keyed on the addresses, not the array, which is new on every fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return covers;
}

function drawCover(pen, img, x, y, s, r) {
  pen.save();
  pen.beginPath(); pen.roundRect(x, y, s, s, r); pen.clip();
  if (img.complete && img.naturalWidth) pen.drawImage(img, x, y, s, s);
  else { pen.fillStyle = 'rgba(255,255,255,0.12)'; pen.fillRect(x, y, s, s); }
  pen.restore();
}

function ListeningRoom({ entries, hue, still }) {
  const ref = useRef(null);
  const covers = useCovers(entries);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const pen = canvas.getContext('2d');
    let raf = 0, W = 0, H = 0;
    const size = () => {
      const d = window.devicePixelRatio || 1;
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * d; canvas.height = H * d;
      pen.setTransform(d, 0, 0, d, 0, 0);
    };
    size();
    const start = performance.now();
    const quiet = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let idle = 0;
    const frame = now => {
      // Not drawn at this width (a desk): look again in a second rather than paint nothing sixty times one.
      if (!canvas.clientWidth) { idle = window.setTimeout(() => { size(); raf = requestAnimationFrame(frame); }, 1000); return; }
      if (!W) size();
      const t = quiet ? 0 : (now - start) / 1000;
      const h = hue ?? 220, sat = hue == null ? 8 : 55;
      const wash = pen.createRadialGradient(W / 2 + Math.sin(t * 0.3) * 80, H * 0.42 + Math.cos(t * 0.25) * 90, 20, W / 2, H / 2, H * 0.8);
      wash.addColorStop(0, `hsl(${h} ${sat + 15}% 58%)`);
      wash.addColorStop(0.5, `hsl(${h + 30} ${sat}% 30%)`);
      wash.addColorStop(1, `hsl(${h + 60} ${Math.max(0, sat - 15)}% 11%)`);
      pen.fillStyle = wash; pen.fillRect(0, 0, W, H);
      const cx = W / 2, cy = H * 0.4;
      covers.slice(1).forEach((img, i, all) => {
        const a = t * 0.12 + (i / all.length) * Math.PI * 2;
        const R = Math.min(W * 0.46, 170) + Math.sin(t * 0.5 + i) * 12;
        const s = 34 + (i % 3) * 8;
        pen.save(); pen.shadowColor = 'rgba(0,0,0,0.3)'; pen.shadowBlur = 10;
        drawCover(pen, img, cx + Math.cos(a) * R - s / 2, cy + Math.sin(a) * R * 0.62 - s / 2, s, 4);
        pen.restore();
      });
      if (covers[0]) {
        const S = Math.min(W * 0.52, 210) * (1 + Math.sin(t * 0.8) * 0.02);
        pen.save(); pen.translate(cx, cy); pen.rotate(t * 0.05);
        pen.shadowColor = 'rgba(0,0,0,0.45)'; pen.shadowBlur = 40; pen.shadowOffsetY = 16;
        pen.fillStyle = 'rgba(0,0,0,0.2)'; pen.beginPath(); pen.roundRect(-S / 2, -S / 2, S, S, 10); pen.fill();
        pen.shadowColor = 'transparent';
        drawCover(pen, covers[0], -S / 2, -S / 2, S, 10);
        pen.restore();
      }
      if (!quiet && !still) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    window.addEventListener('resize', size);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(idle); window.removeEventListener('resize', size); };
  }, [covers, hue, still]);
  return <canvas className="pl-art" ref={ref} aria-hidden="true" />;
}

export default function Place({ entries, held, waiting, community, roomUp, cardOpen, portrait, onRoom, onDown, onFace }) {
  // The colour of the album the room is made of, for the wash and the glass.
  const [hue, setHue] = useState(null);
  const first = entries.find(e => e.album_art)?.album_art;
  useEffect(() => {
    let gone = false;
    readArtColor(first).then(c => { if (!gone) setHue(c && !c.plain ? Math.round(c.hue) : null); });
    return () => { gone = true; };
  }, [first]);

  return (<>
    <div
      className={'pl' + (roomUp ? ' pl--under' : '')}
      style={hue == null ? undefined : { '--pl-h': hue }}
      data-plain={hue == null ? '' : undefined}
    >
      {/* Under a raised room nothing of it shows, so it stops drawing. */}
      <ListeningRoom entries={entries} hue={hue} still={roomUp || cardOpen} />
      <span className="pl-mark" aria-hidden="true">LN<i /></span>
      <nav className="pl-doors" aria-label="The journal">
        <Link href="/session" className="pl-key pl-key--listen" data-grows="/session">
          {held ? `Back to ${held.album}` : 'Start a listen'}
        </Link>
        <div className="pl-rooms">
        <button type="button" className="pl-key" onClick={() => onRoom('home')}>
          <SquaresFour size={22} weight="regular" aria-hidden="true" />
          <span>Archive</span>
        </button>
        <button type="button" className="pl-key" onClick={() => onRoom('people')} aria-label={waiting ? 'Friends, something new' : 'Friends'}>
          <Users size={22} weight="regular" aria-hidden="true" />
          <span>Friends</span>
          {waiting && <i className="pl-new" aria-hidden="true" />}
        </button>
        {community && (
          <button type="button" className="pl-key" onClick={() => onRoom('community')}>
            <Globe size={22} weight="regular" aria-hidden="true" />
            <span>Community</span>
          </button>
        )}
        </div>
      </nav>
    </div>
    {/* Above the card as well as the place: the face opens the card, and is
        its X while it is open (the flight lands from here, HomeNav). */}
    {!roomUp && (
      <button
        type="button"
        className={'hdr-face pl-face' + (cardOpen ? ' hdr-face--open' : '')}
        onClick={onFace}
        aria-expanded={cardOpen}
        aria-label={cardOpen ? 'Close' : 'Your card'}
      >
        <User size={22} weight="regular" aria-hidden="true" />
        {portrait && <img src={portrait} alt="" />}
        <span className="hdr-face-x" aria-hidden="true"><X size={20} weight="bold" /></span>
      </button>
    )}
    {roomUp && (
      <button type="button" className="pl-down" onClick={onDown} aria-label="Back to the place">
        <X size={22} weight="regular" aria-hidden="true" />
      </button>
    )}
  </>);
}
