// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// The screensaver (2026-11-25), drawn from the place that was the keeper's
// home on a phone for four days, 2026-11-21 to 25 (DECISIONS-ARCHIVE): album
// art that never stops moving, full screen, with nothing on it but the LN.
// mark. It is the opening screen while the journal loads and comes back after
// a while untouched (HomeNav); a tap scatters it off the page.
//
// Two rooms. The salon: the covers hung frame to frame across the whole
// screen, the wall panning slowly past, one now and then breathing larger.
// The listening room: the album logged last, large and turning like a record,
// its colour washing the room, the rest circling it; the one she liked least,
// kept for when a different room greets each opening.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { sizedAlbumArt } from '../../library/music_data_api';

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

// The screensaver and the wall are one set of albums (Miyel, 2026-11-25: "the
// albums on the screensaver [are] the same live entity as the wall behind
// it… they should move into place, or get into formation, like it's coming
// awake and resting"). Tapped, each cover on the wall's screen is taken by
// the nearest cover of the screensaver, which glides into its place and
// settles there as it; the covers with no place on screen drift off past
// the nearest edge. Coming back, the covers lift off the wall into the
// screensaver's arrangement and the others drift in from the edges, and
// only then does the ground come in behind them and the wall start to pan.
// The wall's own covers stand aside while theirs are in the air.
export const SCATTER_MS = 1250;
const MOVE_S = 1.2;

const smooth = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const between = (a, b, k) => a + (b - a) * k;

// The wall's covers on the screen just now: where each is, its picture and
// its corners.
function wallCovers(W, H) {
  return [...document.querySelectorAll('.hn-pane--home [data-tile-slug] .ft-art')]
    .map(img => ({ img, r: img.getBoundingClientRect() }))
    .filter(({ r }) => r.width > 0 && r.bottom > 0 && r.top < H && r.right > 0 && r.left < W)
    .map(({ img, r }) => ({
      img, x: r.left, y: r.top, s: r.width,
      round: parseFloat(getComputedStyle(img.closest('.ft-face') || img).borderTopLeftRadius) || 9,
    }));
}

function Salon({ entries, still, scatter = false, arrive = false }) {
  const covers = useCovers(entries, HUNG, 240);
  const plan = useRef(null);
  useEffect(() => () => document.documentElement.removeAttribute('data-settling'), []);
  const draw = (pen, W, H, t) => {
    const cell = Math.round(W / 3.1), gap = 10, unit = cell + gap;
    const n = covers.length;
    // The arrangement at a moment: every cell, the cover in it, and which one
    // is breathing.
    const gridAt = (when, breathe) => {
      const shift = when * 14, past = Math.floor(shift / unit), frac = shift - past * unit;
      const beat = Math.floor(when / 3), swell = Math.sin(((when % 3) / 3) * Math.PI) * 0.12;
      const cells = [];
      for (let r = -1; r * unit < H + unit; r++) {
        const lean = r % 2 ? unit / 2 : 0;
        for (let c = -1; c * unit - frac + lean < W + unit; c++) {
          const k = c + past;
          const near = breathe && ((r * 5 + k) % 9 + 9) % 9 === beat % 9;
          const s = cell * (1 + (near ? swell : 0));
          cells.push({
            key: `${r},${k}`, r, k, near, s,
            idx: ((r * 7 + k * 3) % n + n) % n,
            x: c * unit - frac + lean - (s - cell) / 2,
            y: r * unit + 6 + Math.sin(when * 0.4 + k) * 2 - (s - cell) / 2,
          });
        }
      }
      return cells;
    };
    const moving = scatter ? 'settle' : arrive ? 'arrive' : null;
    if (moving && n && (!plan.current || plan.current.kind !== moving)) {
      const cells = gridAt(t, false);
      const free = new Set(cells.map(c => c.key));
      const pairs = new Map();
      for (const tile of wallCovers(W, H)) {
        let best = null, far = Infinity;
        for (const c of cells) {
          if (!free.has(c.key)) continue;
          const d = (c.x - tile.x) ** 2 + (c.y - tile.y) ** 2;
          if (d < far) { far = d; best = c; }
        }
        if (best) { free.delete(best.key); pairs.set(best.key, tile); }
      }
      plan.current = { kind: moving, from: t, pairs, frozen: moving === 'settle' ? cells : null };
      document.documentElement.setAttribute('data-settling', '');
    }
    if (!moving) plan.current = null;
    const quiet = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const p = plan.current ? (quiet ? 1 : Math.min(1, (t - plan.current.from) / MOVE_S)) : 0;
    const e = smooth(p);
    const kind = plan.current?.kind;
    const landed = kind === 'arrive' && p >= 1;
    if (landed) document.documentElement.removeAttribute('data-settling');
    // The ground is there at rest, and not while the covers are moving
    // between it and the wall.
    if (!kind || landed) { pen.fillStyle = '#16140f'; pen.fillRect(0, 0, W, H); }
    else pen.clearRect(0, 0, W, H);
    if (!n) return;
    const cells = plan.current?.frozen || gridAt(t, !kind || landed);
    for (const c of cells) {
      const tile = kind && !landed ? plan.current.pairs.get(c.key) : null;
      let { x, y, s } = c;
      let round = 3, img = covers[c.idx], lift = 1;
      pen.save();
      if (tile) {
        // 0 in its cell, 1 in its place on the wall.
        const k = kind === 'settle' ? e : 1 - e;
        x = between(c.x, tile.x, k); y = between(c.y, tile.y, k); s = between(c.s, tile.s, k);
        round = between(3, tile.round, k); lift = 1 - k;
        img = tile.img;
      } else if (kind && !landed) {
        // The rest go out past the nearest edge, or come in from it.
        const luck = Math.abs(Math.sin(c.r * 12.9898 + c.k * 78.233)) % 1;
        const g = kind === 'settle' ? e : 1 - e;
        const q = Math.max(0, Math.min(1, (g - luck * 0.3) / 0.7));
        const ox = x + s / 2 - W / 2, oy = y + s / 2 - H / 2, far = Math.hypot(ox, oy) || 1;
        const reach = q * q * Math.max(W, H) * 1.3;
        x += (ox / far) * reach; y += (oy / far) * reach;
        pen.translate(x + s / 2, y + s / 2); pen.rotate((luck - 0.5) * q * 1.4); pen.translate(-(x + s / 2), -(y + s / 2));
      }
      if (lift > 0.02) {
        pen.shadowColor = `rgba(0,0,0,${0.45 * lift})`; pen.shadowBlur = (c.near ? 30 : 16) * lift; pen.shadowOffsetY = 6 * lift;
        pen.fillStyle = '#000'; pen.beginPath(); pen.roundRect(x, y, s, s, round); pen.fill();
        pen.shadowColor = 'transparent';
      }
      drawCover(pen, img, x, y, s, round);
      pen.restore();
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

// The rooms the screensaver is drawn as. The salon for now; a different one
// each time, later (the listening room is hers to keep or drop).
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

// Since 2026-11-27 it is also the profile (Landing.js), handed in as
// children and set at its foot, with the mark moved to the top: one screen
// that anybody opens a journal to, the keeper and a visitor alike (Miyel:
// "should it just be the same whether it's your profile or not").
// While the keeper is logging, every cover in it is the album playing, moving
// as the covers always do (Miyel, 2026-11-27: "they all become that one
// album") — the screensaver broadcasting the listen until a saver of its own
// is thought of. `live` is that album's art.
export function Screensaver({ entries, arriving, leaving, logo, onEnter, children = null, live = null }) {
  const remembered = useRemembered();
  const own = entries.some(e => e.album_art) ? entries : remembered;
  const shown = live ? [{ album_art: live }] : own;
  return (
    <div className={'saver' + (arriving ? ' saver--arriving' : '') + (leaving ? ' saver--leaving' : '') + (children ? ' saver--profile' : '')} onClick={onEnter} role="presentation">
      <Room entries={shown} still={false} scatter={leaving} arrive={arriving} />
      {children}
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
