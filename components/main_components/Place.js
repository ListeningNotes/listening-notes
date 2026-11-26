// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// The place, 2026-11-21 (Miyel: "this is the direction"). On the keeper's
// phone the app opens into a room, not a feed: album art that never stops
// moving, Start a listen at the foot and the rooms as glass keys under it.
// A key raises that room over the place like a shelf (HomeNav, roomUp);
// pulled down, it goes, and the place is still going underneath.
//
// The keeper's alone, and a phone's alone: a visitor gets the journal as it
// was, and a desk keeps its spine (nav.css hides this above 768px).
//
// Two rooms so far. The salon: the covers hung frame to frame across the
// whole screen, the wall panning slowly past, one now and then breathing
// larger (Miyel, 2026-11-22: "a more full screen background"). The listening
// room: the album logged last, large and turning like a record, its colour
// washing the room, the rest circling it; the one she liked least, kept for
// when a different room greets each opening of the app.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { Globe, SquaresFour, User, Users, X } from '@phosphor-icons/react';
import { readArtColor, sizedAlbumArt } from '../../library/music_data_api';

const CIRCLING = 12;
const HUNG = 40;

// The covers a room is made of: the newest first, each loaded once.
function useCovers(entries, count, firstSize) {
  const [covers, setCovers] = useState([]);
  const key = entries.slice(0, count).map(e => e.album_art).join('|');
  useEffect(() => {
    const list = entries.filter(e => e.album_art).slice(0, count);
    setCovers(list.map((e, i) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = sizedAlbumArt(e.album_art, i === 0 ? firstSize : 240);
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

// A room's canvas: sized to the screen, drawn every frame while it shows,
// held on one frame under reduced motion, and idle at a desk's width.
function Canvas({ draw, still }) {
  const ref = useRef(null);
  const paint = useRef(draw);
  useEffect(() => { paint.current = draw; }, [draw]);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const pen = canvas.getContext('2d');
    let raf = 0, idle = 0, W = 0, H = 0;
    const size = () => {
      const d = window.devicePixelRatio || 1;
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * d; canvas.height = H * d;
      pen.setTransform(d, 0, 0, d, 0, 0);
    };
    size();
    const start = performance.now();
    const quiet = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const frame = now => {
      // Not drawn at this width (a desk): look again in a second rather than paint nothing sixty times one.
      if (!canvas.clientWidth) { idle = window.setTimeout(() => { size(); raf = requestAnimationFrame(frame); }, 1000); return; }
      if (!W) size();
      paint.current(pen, W, H, quiet ? 0 : (now - start) / 1000);
      if (!quiet && !still) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    window.addEventListener('resize', size);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(idle); window.removeEventListener('resize', size); };
  }, [still]);
  return <canvas className="pl-art" ref={ref} aria-hidden="true" />;
}

function Salon({ entries, still }) {
  const covers = useCovers(entries, HUNG, 240);
  const draw = (pen, W, H, t) => {
    pen.fillStyle = '#16140f'; pen.fillRect(0, 0, W, H);
    if (!covers.length) return;
    const cell = Math.round(W / 3.1), gap = 10, unit = cell + gap;
    const shift = t * 14, past = Math.floor(shift / unit), frac = shift - past * unit;
    const n = covers.length;
    // One cover at a time breathes larger, for three seconds each.
    const beat = Math.floor(t / 3), swell = Math.sin(((t % 3) / 3) * Math.PI) * 0.12;
    for (let r = -1; r * unit < H + unit; r++) {
      const lean = r % 2 ? unit / 2 : 0;
      for (let c = -1; c * unit - frac + lean < W + unit; c++) {
        const k = c + past;
        const idx = ((r * 7 + k * 3) % n + n) % n;
        const near = ((r * 5 + k) % 9 + 9) % 9 === beat % 9;
        const s = cell * (1 + (near ? swell : 0));
        const x = c * unit - frac + lean - (s - cell) / 2;
        const y = r * unit + 6 + Math.sin(t * 0.4 + k) * 2 - (s - cell) / 2;
        pen.save();
        pen.shadowColor = 'rgba(0,0,0,0.45)'; pen.shadowBlur = near ? 30 : 16; pen.shadowOffsetY = 6;
        pen.fillStyle = '#000'; pen.beginPath(); pen.roundRect(x, y, s, s, 3); pen.fill();
        pen.restore();
        drawCover(pen, covers[idx], x, y, s, 3);
      }
    }
  };
  return <Canvas draw={draw} still={still} />;
}

function ListeningRoom({ entries, hue, still }) {
  const covers = useCovers(entries, CIRCLING + 1, 600);
  const draw = (pen, W, H, t) => {
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
  };
  return <Canvas draw={draw} still={still} />;
}

// While a listen is in hand it is the place (Miyel, 2026-11-22: "session will
// take over the home page"): the listen itself, under the rooms, so pulling a
// room down is returning to it. Loaded only when there is one.
const Listen = dynamic(() => import('../../app/session/page'), { ssr: false });

// The room the place shows. One for now; a different one each opening later.
const ROOMS = { salon: Salon, listening: ListeningRoom };
const Room = ROOMS.salon;

// ── The screensaver, 2026-11-25 (Miyel's blend of the place and her brief) ──
// The salon, full screen and nothing else on it but the LN. mark: the loading
// screen while the journal opens (the sleeping database takes a few seconds to
// wake, and a still page in that time "feels like it's actually broken"), and
// after a while untouched it comes back over whatever was open. A tap — the
// mark, or anywhere — lifts it away onto exactly where you were. Never during
// a listen (HomeNav). The keeper's phone only.
//
// It cannot wait for the albums, which are the slow part, so it draws the
// covers this browser remembers from the last time the journal was open.
// A browser that remembers none — a new phone, a visitor — gets no loading
// screen at all.
const REMEMBERED = 'ln_saver_covers';
export function rememberCovers(entries) {
  const list = entries.filter(e => e.album_art).slice(0, HUNG).map(e => e.album_art);
  if (!list.length) return;
  try { localStorage.setItem(REMEMBERED, JSON.stringify(list)); } catch { /* storage off: no loading screen */ }
}
let rememberedRaw = null, rememberedList = [];
function rememberedNow() {
  let raw = null;
  try { raw = localStorage.getItem(REMEMBERED); } catch { /* storage off */ }
  if (raw !== rememberedRaw) {
    rememberedRaw = raw;
    try { rememberedList = (JSON.parse(raw) || []).map(album_art => ({ album_art })); } catch { rememberedList = []; }
  }
  return rememberedList;
}
const NONE = [];
// Whether this browser has covers to open on, read once the page is the
// browser's (a server never does).
export function useRemembered() {
  return useSyncExternalStore(() => () => {}, rememberedNow, () => NONE);
}

export function Screensaver({ entries, arriving, leaving, logo, onEnter }) {
  const remembered = useRemembered();
  const shown = entries.some(e => e.album_art) ? entries : remembered;
  return (
    <div className={'saver' + (arriving ? ' saver--arriving' : '') + (leaving ? ' saver--leaving' : '')} onClick={onEnter} role="presentation">
      <Salon entries={shown} still={false} />
      <button
        type="button"
        className="saver-mark"
        onClick={e => { e.stopPropagation(); onEnter(); }}
        aria-label="Open your journal"
      >
        {logo}
      </button>
    </div>
  );
}

export default function Place({ entries, held, waiting, community, roomUp, cardOpen, portrait, logo, lights, onRoom, onFace }) {
  // The colour of the album the room is made of, for the wash and the glass.
  const [hue, setHue] = useState(null);
  const first = entries.find(e => e.album_art)?.album_art;
  useEffect(() => {
    let gone = false;
    readArtColor(first).then(c => { if (!gone) setHue(c && !c.plain ? Math.round(c.hue) : null); });
    return () => { gone = true; };
  }, [first]);

  // The listen replaces the room on the place (Miyel, 2026-11-22: "session
  // replaces the screensaver and those archive, friend and community buttons
  // stay"): Start a listen opens it here rather than on a page of its own,
  // and a record in hand keeps it here. Ending it — posting, discarding,
  // saving the draft — takes the record out of hand and the room comes back;
  // so does pulling down out of the picker before a record is chosen. When it
  // is open as a sheet of its own (/session) the sheet is the listen and
  // this stands back.
  const path = usePathname();
  const [started, setStarted] = useState(false);
  // A record going out of hand ends the listen here; noticed as the render
  // that sees it go, rather than in an effect a render later.
  const [heldBefore, setHeldBefore] = useState(held);
  if (held !== heldBefore) {
    setHeldBefore(held);
    if (heldBefore && !held) setStarted(false);
  }
  const listening = (Boolean(held) || started) && path !== '/session';

  // While a note is being typed in the listen, the keys step down out of the
  // way of the writing and the keyboard, as the listen's own bar does.
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    if (!listening) return undefined;
    const look = () => window.setTimeout(() => {
      const el = document.activeElement;
      setTyping(Boolean(el?.closest?.('.pl-listen')) && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.isContentEditable));
    }, 0);
    document.addEventListener('focusin', look);
    document.addEventListener('focusout', look);
    return () => { document.removeEventListener('focusin', look); document.removeEventListener('focusout', look); };
  }, [listening]);

  return (<>
    <div
      className={'pl' + (roomUp ? ' pl--under' : '') + (listening ? ' pl--listen' : '') + (listening && typing ? ' pl--typing' : '')}
      style={hue == null ? undefined : { '--pl-h': hue }}
      data-plain={hue == null ? '' : undefined}
    >
      {/* Under a raised room nothing of it shows, so it stops drawing. */}
      {listening ? (
        <div className="pl-listen"><Listen onLeave={() => setStarted(false)} /></div>
      ) : (<>
      <Room entries={entries} hue={hue} still={roomUp || cardOpen} />
      {/* The journal's own mark, as it stands in the top row. */}
      <span className="pl-mark" aria-hidden="true">{logo}</span>
      </>)}
      {/* The rooms stay at the foot over a listen, above its own bar. */}
      <nav className="pl-doors" aria-label="The journal">
        {!listening && (
          <button type="button" className="pl-key pl-key--listen" onClick={() => setStarted(true)}>
            Start a listen
          </button>
        )}
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
      <div className={'pl-top' + (cardOpen ? ' pl-top--card' : '')}>
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
        {/* Night and sound beside the face over a listen; not on the art,
            where they did not belong (Miyel, 2026-11-22). */}
        {!cardOpen && listening && lights}
      </div>
    )}
  </>);
}
