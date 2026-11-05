// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/JournalPlate.js
// The journal, cut as a printing plate — and the room it is printed in.
//
// The second thing the share printer prints (the record is EntryPlate.js).
// It shows people at a glance what you listen to (Miyel, 2026-11-03): the mark
// at the head, your records, and at the foot your face with a bit about you.
// Nothing written about a record travels and no address is printed; Save puts
// the journal's address on the clipboard. The portrait is a portrait: no code
// on anything digital.
//
// ── The print is the view ────────────────────────────────────────────────
// It opens from the wall's own line and prints what the wall is showing, in
// the wall's order (library/handoff.js, handOffWall), with a small caption
// when the wall is filtered. So there is no choosing of records here. Opened
// by its address, it prints the whole journal, newest first.
//
// ── Styles ───────────────────────────────────────────────────────────────
// How the records move, each a scene with its own clock: step it, draw it.
// A scene is told the time rather than reading it, so Save can run one faster
// than real time for the video (library/video_file.js). Snake is the parked
// screensaver's own steering and food (session_components/backgrounds/
// Snake.js), the album it eats joining at the tail, Miyel's one change. Rain
// is that folder's numbers too. Bounce is a bar, a ball and the albums, nothing
// coming down to replace what is broken.
//
// The preview on screen IS the plate, drawn at the paper's full size and shown
// smaller, so the picture saved is the picture approved.

'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowsHorizontal, Cards, CloudRain, Moon, Pause, Sun } from '@phosphor-icons/react';
import { FRAMES, INKS, loadMark, loadPicture, MARK_ASPECT, drawTracked, ellipsize, roundRect } from './SharePrinter';
import PrintBar from './Slug_Page/PrintBar';
import { useBookplate } from './Bookplate';
import { usePress, readFamilies } from '../../hooks/usePress';
import { wallHandedOver } from '../../library/handoff';

const MOVING = ['drift', 'rain', 'swap', 'deal', 'snake', 'bounce'];
const STYLES = ['still', ...MOVING];
const SIZES = ['story', 'portrait', 'square'];
const ALBUM_SIZES = ['s', 'm', 'l'];
const LOOKS = ['bottom', 'middle', 'top', 'minimal'];
const COLS = { s: 7, m: 5, l: 3 };
const SNAKE_COLS = { 7: 12, 5: 10, 3: 7 };   // by the album size's columns
const MOST_COVERS = 120;               // more than any wall of these can show at once
const SNAKE_HOP = 0.3;                 // a little slower than the screensaver's: Miyel, "too fast"

// ── Measurements, in units of a 340-wide column ────────────────────────────
const COL = 340;
const MARK_H = 28, CAPTION = 9, FACE = 52, NAME = 19, GENRES = 12, NUMBER = 15, WORD = 6.2;

// A small, seedable random, so a scene is its own and nothing else's.
function randomFrom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Covers, cut once at the size they are drawn: dozens of clipped pictures a
// frame is what a phone cannot afford, and the same few squares reused is.
const cut = new WeakMap();
function sprite(img, size) {
  const s = Math.max(1, Math.round(size));
  let sizes = cut.get(img);
  if (!sizes) { sizes = new Map(); cut.set(img, sizes); }
  if (sizes.has(s)) return sizes.get(s);
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  roundRect(ctx, 0, 0, s, s, s * 0.055);
  ctx.clip();
  const k = Math.max(s / img.naturalWidth, s / img.naturalHeight);
  ctx.drawImage(img, (s - img.naturalWidth * k) / 2, (s - img.naturalHeight * k) / 2, img.naturalWidth * k, img.naturalHeight * k);
  sizes.set(s, c);
  return c;
}

// The grid. The album size says how many across; when the wall has too few
// records to fill that, they grow until they do, so a filtered print never
// looks unfinished.
function grid(area, n, across) {
  const G = Math.max(2, area.w * 0.012);
  const sideFor = c => (area.w - G * (c - 1)) / c;
  let cols = across;
  let S = sideFor(cols);
  let rows = Math.max(1, Math.floor((area.h + G) / (S + G)));
  if (n > 0 && n < cols * rows) {
    let best = 0;
    for (let c = 1; c <= n; c++) {
      const r = Math.ceil(n / c);
      const s = Math.min(sideFor(c), (area.h - G * (r - 1)) / r);
      if (s > best) { best = s; cols = c; rows = r; }
    }
    S = best;
  }
  const left = (area.w - (cols * S + (cols - 1) * G)) / 2;
  const top = (area.h - (rows * S + (rows - 1) * G)) / 2;
  return { cols, rows, S, G, at: (c, r) => ({ x: left + c * (S + G), y: top + r * (S + G) }) };
}

function gridTiles(covers, area, across) {
  const g = grid(area, covers.length, across);
  const tiles = [];
  for (let i = 0; i < Math.min(covers.length, g.cols * g.rows); i++) tiles.push({ img: covers[i], ...g.at(i % g.cols, Math.floor(i / g.cols)) });
  return { tiles, g };
}

// ── The scenes ─────────────────────────────────────────────────────────────
// Each draws in the area's own coordinates; the plate has clipped to it.

const scenes = {
  still(covers, area, across) {
    const { tiles, g } = gridTiles(covers, area, across);
    return {
      step() {},
      draw(c) { for (const t of tiles) c.drawImage(sprite(t.img, g.S), t.x, t.y); },
    };
  },

  // Rows sliding sideways, each the other way to the one before.
  drift(covers, area, across) {
    const g = grid(area, covers.length, across);
    const unit = area.w / 270;
    const len = Math.max(g.cols + 2, Math.ceil(covers.length / g.rows));
    const lanes = [];
    let cur = 0;
    for (let r = 0; r < g.rows; r++) {
      const items = [];
      for (let k = 0; k < len; k++) items.push(covers[cur++ % covers.length]);
      lanes.push({ items, dir: r % 2 ? 1 : -1, speed: (10 + ((r * 7) % 5)) * unit, y: g.at(0, r).y });
    }
    const pitch = g.S + g.G;
    const span = len * pitch;
    let t = 0;
    return {
      step(dt) { t += dt; },
      draw(c) {
        for (const lane of lanes) {
          lane.items.forEach((img, k) => {
            let p = (k * pitch + t * lane.speed * lane.dir) % span;
            if (p < 0) p += span;
            c.drawImage(sprite(img, g.S), p - pitch, lane.y);
          });
        }
      },
    };
  },

  // Covers falling in lanes at a slight tilt, big ones a little faster.
  rain(covers, area, _across, random) {
    const k = (area.w / 1080) * 1.6;
    const tMin = 80 * k, tMax = 280 * k, gap = 24 * k;
    // More to a lane and more lanes than the screensaver had (Miyel, 2026-11-03:
    // "more albums falling"), spaced out down each lane so they do not clump.
    const lanes = Math.max(4, Math.floor(area.w / (tMax + gap)));
    const step = area.w / lanes;
    const perLane = Math.max(4, Math.round(area.h / (200 * k)));
    const order = [...covers].map(img => ({ img, at: random() })).sort((a, b) => a.at - b.at).map(o => o.img);
    const tiles = [];
    let cur = 0;
    for (let l = 0; l < lanes; l++) {
      for (let i = 0; i < perLane; i++) {
        const u = random();
        const size = Math.round(tMin + (u < 0.4 ? (u / 0.4) * 0.3 : (u - 0.4) / 0.6) * (tMax - tMin));
        const dur = (14 + random() * 14) * (1 - ((size - tMin) / (tMax - tMin)) * 0.3);
        tiles.push({ img: order[cur++ % order.length], size, x: l * step + (step - size) / 2, dur, start: -((i + random() * 0.7) / perLane) * dur, angle: ((random() - 0.5) * 12 * Math.PI) / 180 });
      }
    }
    const lead = tMax * 0.3;
    let t = 0;
    return {
      step(dt) { t += dt; },
      draw(c) {
        for (const tile of tiles) {
          const p = (((t - tile.start) % tile.dur) + tile.dur) % tile.dur / tile.dur;
          const y = -tile.size - lead + p * (area.h + tile.size * 2 + lead * 2);
          c.save();
          c.translate(tile.x + tile.size / 2, y + tile.size / 2);
          c.rotate(tile.angle);
          c.drawImage(sprite(tile.img, tile.size), -tile.size / 2, -tile.size / 2);
          c.restore();
        }
      },
    };
  },

  // A departures board (Miyel, 2026-11-03: "more like a train station
  // flipboard than passing around"): a row at a time, left to right, each
  // cover flapping through a few albums and settling on a new one, so the wall
  // works through the whole collection. The word is Flip; the stored key is
  // still `swap`, so a browser that remembered it opens on it.
  swap(covers, area, across, random, _once, ink) {
    const { tiles, g } = gridTiles(covers, area, across);
    const FLAP = 0.15;
    const live = tiles.map(t => ({ ...t, queue: [], age: 0, delay: 0 }));
    let next = tiles.length, wait = 0.4;
    const half = g.S / 2;
    return {
      step(dt) {
        wait -= dt;
        if (wait <= 0 && covers.length > 1) {
          wait = 1.1 + random() * 0.8;
          const row = Math.floor(random() * g.rows);
          live.filter((_, i) => Math.floor(i / g.cols) === row).forEach((t, i) => {
            if (t.queue.length) return;
            const flaps = 3 + Math.floor(random() * 3);
            for (let f = 0; f < flaps; f++) t.queue.push(covers[next++ % covers.length]);
            t.delay = i * 0.07;
            t.age = 0;
          });
        }
        for (const t of live) {
          if (!t.queue.length) continue;
          if (t.delay > 0) { t.delay -= dt; continue; }
          t.age += dt;
          if (t.age >= FLAP) { t.img = t.queue.shift(); t.age = 0; }
        }
      },
      draw(c) {
        for (const t of live) {
          const from = sprite(t.img, g.S);
          const w = from.width, h = from.height / 2;
          const turning = t.queue.length && t.delay <= 0;
          if (!turning) {
            c.drawImage(from, t.x, t.y);
          } else {
            const to = sprite(t.queue[0], g.S);
            const k = t.age / FLAP;
            // Behind: the new top, the old bottom. In front: the old top
            // folding down to the hinge, then the new bottom falling from it.
            c.drawImage(to, 0, 0, w, h, t.x, t.y, g.S, half);
            c.drawImage(from, 0, h, w, h, t.x, t.y + half, g.S, half);
            if (k < 0.5) {
              const fold = half * (1 - k * 2);
              c.drawImage(from, 0, 0, w, h, t.x, t.y + half - fold, g.S, fold);
            } else {
              c.drawImage(to, 0, h, w, h, t.x, t.y + half, g.S, half * (k * 2 - 1));
            }
          }
          // The slit every flap hangs from.
          c.fillStyle = ink.paper;
          c.fillRect(t.x, t.y + half - Math.max(0.5, g.S * 0.006), g.S, Math.max(1, g.S * 0.012));
        }
      },
    };
  },

  // Covers landing one by one until the sheet is full. A video deals once and
  // holds, so its last frame is the whole wall; the preview deals again.
  deal(covers, area, across, _random, once) {
    const { tiles, g } = gridTiles(covers, area, across);
    const dealing = 3.2, flight = 0.55, cycle = 7;
    let t = 0;
    return {
      step(dt) { t += dt; },
      draw(c) {
        const local = once ? t : t % cycle;
        tiles.forEach((tile, i) => {
          const k = Math.min(1, Math.max(0, (local - (i / Math.max(1, tiles.length)) * dealing) / flight));
          const from = area.h + g.S;
          c.drawImage(sprite(tile.img, g.S), tile.x, from + (tile.y - from) * (1 - (1 - k) ** 3));
        });
      },
    };
  },

  snake(covers, area, across, random, _once, ink) {
    const cols = SNAKE_COLS[across] || 10;
    const G = area.w * 0.006;
    const S = (area.w - G * (cols - 1)) / cols;
    const rows = Math.max(1, Math.floor((area.h + G) / (S + G)));
    const top = (area.h - (rows * S + (rows - 1) * G)) / 2;
    const at = p => ({ x: p.x * (S + G), y: top + p.y * (S + G) });
    const key = (x, y) => `${x},${y}`;
    const longest = Math.min(40, Math.floor(cols * rows * 0.75));
    let positions, arts, dir, food, foodAt, wait, hold;
    let next = 0;

    function placeFood() {
      const occupied = new Set(positions.map(p => key(p.x, p.y)));
      const head = positions[0];
      const midX = Math.floor(cols / 2), midY = Math.floor(rows / 2);
      const quads = [
        { x1: 0, y1: 0, x2: midX, y2: midY }, { x1: midX, y1: 0, x2: cols, y2: midY },
        { x1: 0, y1: midY, x2: midX, y2: rows }, { x1: midX, y1: midY, x2: cols, y2: rows },
      ].map(q => {
        const dist = Math.abs((q.x1 + q.x2) / 2 - head.x) + Math.abs((q.y1 + q.y2) / 2 - head.y);
        const density = positions.filter(p => p.x >= q.x1 && p.x < q.x2 && p.y >= q.y1 && p.y < q.y2).length;
        return { q, score: dist - density * 2 };
      }).sort((a, b) => b.score - a.score);
      foodAt = null;
      for (const { q } of quads) {
        for (let a = 0; a < 60 && !foodAt && q.x2 > q.x1 && q.y2 > q.y1; a++) {
          const fx = q.x1 + Math.floor(random() * (q.x2 - q.x1));
          const fy = q.y1 + Math.floor(random() * (q.y2 - q.y1));
          if (!occupied.has(key(fx, fy))) foodAt = { x: fx, y: fy };
        }
        if (foodAt) break;
      }
      food = covers[next++ % covers.length];
      return Boolean(foodAt);
    }
    function begin() {
      positions = [{ x: Math.floor(cols / 2), y: Math.floor(rows / 2) }];
      arts = [];
      dir = { x: 1, y: 0 };
      wait = SNAKE_HOP;
      hold = 0;
      placeFood();
    }
    function floodFill(sx, sy, body) {
      const seen = new Set([key(sx, sy)]);
      const queue = [{ x: sx, y: sy }];
      while (queue.length) {
        const { x, y } = queue.shift();
        for (const d of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]) {
          const nx = x + d.x, ny = y + d.y;
          const k = key(nx, ny);
          if (nx < 0 || nx >= cols || ny < 0 || ny >= rows || body.has(k) || seen.has(k)) continue;
          seen.add(k);
          queue.push({ x: nx, y: ny });
        }
      }
      return seen.size;
    }
    function steer() {
      const head = positions[0], tail = positions[positions.length - 1];
      const body = new Set(positions.slice(1).map(p => key(p.x, p.y)));
      const safe = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }].filter(d => {
        if (d.x === -dir.x && d.y === -dir.y) return false;
        const nx = head.x + d.x, ny = head.y + d.y;
        return nx >= 0 && nx < cols && ny >= 0 && ny < rows && !body.has(key(nx, ny));
      });
      if (!safe.length) return null;
      const minSpace = Math.max(Math.floor(cols * rows * 0.35), positions.length * 2);
      const cmx = positions.reduce((s, p) => s + p.x, 0) / positions.length;
      const cmy = positions.reduce((s, p) => s + p.y, 0) / positions.length;
      const scored = safe.map(d => {
        const nx = head.x + d.x, ny = head.y + d.y;
        return {
          d,
          space: floodFill(nx, ny, body),
          distFood: Math.abs(nx - foodAt.x) + Math.abs(ny - foodAt.y),
          distTail: Math.abs(nx - tail.x) + Math.abs(ny - tail.y),
          spread: Math.abs(nx - cmx) + Math.abs(ny - cmy),
          straight: d.x === dir.x && d.y === dir.y ? 3 : 0,
        };
      });
      const roomy = scored.filter(s => s.space >= minSpace);
      if (roomy.length) {
        const worth = s => -s.distFood * 3 + s.spread * 1.5 + s.straight;
        roomy.sort((a, b) => worth(b) - worth(a));
        return random() < 0.9 ? roomy[0].d : roomy[Math.min(1, roomy.length - 1)].d;
      }
      scored.sort((a, b) => a.distTail - b.distTail || b.space - a.space);
      return scored[0].d;
    }
    function hop() {
      const d = steer();
      if (!d) { hold = 0.8; return; }
      dir = d;
      const nx = positions[0].x + dir.x, ny = positions[0].y + dir.y;
      const ate = nx === foodAt.x && ny === foodAt.y;
      positions.unshift({ x: nx, y: ny });
      if (ate) {
        // The album it ate joins at the tail, where that square already is.
        arts.push(food);
        if (positions.length >= longest || !placeFood()) hold = 1.2;
      } else {
        positions.pop();
      }
    }
    begin();
    return {
      step(dt) {
        if (hold > 0) { hold -= dt; if (hold <= 0) begin(); return; }
        wait -= dt;
        while (wait <= 0 && hold <= 0) { wait += SNAKE_HOP; hop(); }
      },
      draw(c) {
        if (foodAt && food) {
          const f = at(foodAt);
          c.save();
          c.shadowColor = 'rgba(0,0,0,0.3)';
          c.shadowBlur = S * 0.16;
          c.drawImage(sprite(food, S), f.x, f.y);
          c.restore();
          c.strokeStyle = 'rgba(255,255,255,0.85)';
          c.lineWidth = Math.max(1, S * 0.025);
          roundRect(c, f.x, f.y, S, S, S * 0.055);
          c.stroke();
        }
        for (let i = positions.length - 1; i > 0; i--) {
          const art = arts[i - 1];
          if (!art) continue;
          const p = at(positions[i]);
          c.globalAlpha = 1 - ((i - 1) / (positions.length + 2)) * 0.4;
          c.drawImage(sprite(art, S), p.x, p.y);
          c.globalAlpha = 1;
        }
        const h = at(positions[0]);
        c.fillStyle = ink.ink;
        roundRect(c, h.x, h.y, S, S, S * 0.1);
        c.fill();
        c.fillStyle = ink.paper;
        for (const [ex, ey] of dir.x !== 0 ? [[0.65, 0.28], [0.65, 0.72]] : [[0.28, 0.65], [0.72, 0.65]]) {
          c.beginPath();
          c.arc(h.x + S * ex, h.y + S * ey, S * 0.04, 0, Math.PI * 2);
          c.fill();
        }
      },
    };
  },

  // A bar at the foot, a ball, and the albums at the top. Each hit breaks one
  // and nothing comes down to replace it; the last gone, the next albums come.
  bounce(covers, area, across, random, _once, ink) {
    const room = { w: area.w, h: area.h * 0.66 };
    let start = 0, g, bricks, shards, x, y, vx, vy, barX, aim, hold;
    const ballR = Math.max(area.w * 0.014, 5);
    const barW = area.w * 0.26, barH = area.w * 0.022, barY = area.h - barH - area.w * 0.01;
    const speed = area.h * 0.52;
    function begin() {
      const shown = covers.slice(start).concat(covers.slice(0, start));
      g = grid(room, shown.length, across);
      const fits = Math.min(shown.length, g.cols * g.rows);
      bricks = [];
      for (let i = 0; i < fits; i++) {
        const p = g.at(i % g.cols, Math.floor(i / g.cols));
        bricks.push({ img: shown[i], x: p.x, y: p.y });
      }
      start = (start + fits) % covers.length;
      shards = [];
      x = area.w / 2;
      y = barY - ballR - 1;
      const a = ((-65 - random() * 50) * Math.PI) / 180;
      vx = Math.cos(a) * speed;
      vy = Math.sin(a) * speed;
      barX = area.w / 2;
      aim = 0;
      hold = 0;
    }
    begin();
    return {
      step(dt) {
        shards = shards.filter(s => (s.age += dt) < 0.5);
        if (hold > 0) { hold -= dt; if (hold <= 0) begin(); return; }
        x += vx * dt;
        y += vy * dt;
        if (x < ballR) { x = ballR; vx = Math.abs(vx); }
        if (x > area.w - ballR) { x = area.w - ballR; vx = -Math.abs(vx); }
        if (y < ballR) { y = ballR; vy = Math.abs(vy); }
        for (const b of bricks) {
          const nx = Math.max(b.x, Math.min(x, b.x + g.S)), ny = Math.max(b.y, Math.min(y, b.y + g.S));
          if ((x - nx) ** 2 + (y - ny) ** 2 > ballR * ballR) continue;
          if (x > b.x && x < b.x + g.S) vy = y < b.y + g.S / 2 ? -Math.abs(vy) : Math.abs(vy);
          else if (y > b.y && y < b.y + g.S) vx = x < b.x + g.S / 2 ? -Math.abs(vx) : Math.abs(vx);
          else { vx = -vx; vy = -vy; }
          for (const [p, q] of [[0, 0], [1, 0], [0, 1], [1, 1]]) shards.push({ img: b.img, s: g.S, p, q, x: b.x, y: b.y, age: 0 });
          bricks = bricks.filter(o => o !== b);
          break;
        }
        // The bar plays itself, a little off centre so the ball goes somewhere new.
        const want = Math.max(barW / 2, Math.min(area.w - barW / 2, x + aim));
        barX += (want - barX) * Math.min(1, dt * 12);
        if (vy > 0 && y + ballR >= barY && y < barY + barH && x > barX - barW / 2 - ballR && x < barX + barW / 2 + ballR) {
          const off = Math.max(-1, Math.min(1, (x - barX) / (barW / 2)));
          const t = ((-90 + off * 58) * Math.PI) / 180;
          vx = Math.cos(t) * speed;
          vy = Math.sin(t) * speed;
          y = barY - ballR;
          aim = (random() - 0.5) * barW * 0.8;
        }
        if (y > area.h + ballR) { x = barX; y = barY - ballR; vy = -Math.abs(vy); }
        if (!bricks.length) hold = 1;
      },
      draw(c) {
        for (const b of bricks) c.drawImage(sprite(b.img, g.S), b.x, b.y);
        for (const s of shards) {
          const k = s.age / 0.5;
          const half = s.s / 2;
          const sp = sprite(s.img, s.s);
          const dx = (s.p ? 1 : -1) * s.s * 0.7 * k, dy = (s.q ? 1 : -0.4) * s.s * 0.7 * k;
          c.save();
          c.translate(s.x + s.p * half + half / 2 + dx, s.y + s.q * half + half / 2 + dy);
          c.rotate(((s.p ? 1 : -1) * 70 * k * Math.PI) / 180);
          c.scale(1 - k, 1 - k);
          c.drawImage(sp, (s.p * sp.width) / 2, (s.q * sp.height) / 2, sp.width / 2, sp.height / 2, -half / 2, -half / 2, half, half);
          c.restore();
        }
        c.fillStyle = ink.ink;
        c.beginPath();
        c.arc(x, y, ballR, 0, Math.PI * 2);
        c.fill();
        roundRect(c, barX - barW / 2, barY, barW, barH, barH / 2);
        c.fill();
      },
    };
  },
};

// A cover whose site lets a page read its pixels, or nothing. One that does not
// (a few from outside Apple's catalogue) would stop the print being saved at
// all, so it is left off the print rather than the print being lost.
function readableCover(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// The face in a circle. object-position as the card has it.
function drawPortrait(c, img, cx, cy, d, position) {
  c.save();
  c.beginPath();
  c.arc(cx, cy, d / 2, 0, Math.PI * 2);
  c.clip();
  c.fillStyle = '#8a7a6a';
  c.fillRect(cx - d / 2, cy - d / 2, d, d);
  if (img?.naturalWidth) {
    const k = Math.max(d / img.naturalWidth, d / img.naturalHeight);
    const dw = img.naturalWidth * k, dh = img.naturalHeight * k;
    const [px, py] = String(position || '50% 50%').split(/\s+/).map(v => (parseFloat(v) || 50) / 100);
    c.drawImage(img, cx - d / 2 + (d - dw) * px, cy - d / 2 + (d - dh) * py, dw, dh);
  }
  c.restore();
}

// ── The plate ──────────────────────────────────────────────────────────────

export function journalPlate({ name, portrait, position, counts, genres, covers, caption = '' }) {
  const coverList = covers.slice(0, MOST_COVERS);

  // What never moves, drawn once: the paper, the mark, the caption, the foot.
  // Returns where the records go.
  function layOut(c, frame, { art, shown, ink, families }) {
    const { sans, mono } = families;
    const W = frame.w, H = frame.h;
    const px = n => (n * Math.min(W, H * 0.72)) / COL;
    const side = W * 0.05, head = H * 0.03;
    c.textBaseline = 'top';
    c.textAlign = 'left';
    c.fillStyle = ink.paper;
    c.fillRect(0, 0, W, H);

    let y = head;
    if (art?.mark) {
      const mh = px(MARK_H), mw = mh * MARK_ASPECT;
      c.drawImage(art.mark, (W - mw) / 2, y, mw, mh);
      y += mh;
    }
    y += px(8);
    if (caption) {
      c.font = `400 ${px(CAPTION)}px ${mono}`;
      c.fillStyle = ink.soft;
      drawTracked(c, ellipsize(c, caption.toUpperCase(), W - side * 2), W / 2, y, px(CAPTION) * 0.18, 'center');
      y += px(CAPTION) * 1.2 + px(8);
    }

    // The ID: the face, and beside it the name, the genres and the numbers.
    // Where it sits is the ID word's: at the foot, under the mark, on a label
    // over the middle of the wall, or just the face and name, small.
    const look = shown?.look || 'bottom';
    const minimal = look === 'minimal';
    const showGenres = !minimal && genres.length > 0;
    const showNumbers = !minimal && counts.length > 0;
    const faceD = px(minimal ? 30 : FACE);
    const nameSize = px(minimal ? 14 : NAME);
    const textH = nameSize * 1.15 + (showGenres ? px(3) + px(GENRES) * 1.2 : 0) + (showNumbers ? px(5) + px(NUMBER) * 1.1 + px(WORD) * 1.3 : 0);
    const idH = Math.max(faceD, textH);
    const drawId = (pen, left, top, width) => {
      drawPortrait(pen, art?.face, left + faceD / 2, top + idH / 2, faceD, position);
      const tx = left + faceD + px(11);
      const tw = left + width - tx;
      let ty = top + (idH - textH) / 2;
      pen.textBaseline = 'top';
      if (name) {
        pen.font = `800 ${nameSize}px ${sans}`;
        pen.fillStyle = ink.ink;
        pen.fillText(ellipsize(pen, name, tw), tx, ty);
      }
      ty += nameSize * 1.15;
      if (showGenres) {
        ty += px(3);
        pen.font = `400 ${px(GENRES)}px ${sans}`;
        pen.fillStyle = ink.soft;
        pen.fillText(ellipsize(pen, genres.join(' · '), tw), tx, ty);
        ty += px(GENRES) * 1.2;
      }
      if (showNumbers) {
        ty += px(5);
        let x = tx;
        for (const f of counts) {
          const n = f.n.toLocaleString();
          const word = f.word.toUpperCase();
          pen.font = `700 ${px(NUMBER)}px ${sans}`;
          pen.fillStyle = ink.ink;
          pen.fillText(n, x, ty);
          const numW = pen.measureText(n).width;
          pen.font = `400 ${px(WORD)}px ${mono}`;
          pen.fillStyle = ink.soft;
          pen.fillText(word, x, ty + px(NUMBER) * 1.1);
          x += Math.max(numW, pen.measureText(word).width) + px(12);
        }
      }
    };
    const rule = at => { c.fillStyle = ink.rule; c.fillRect(side, at, W - side * 2, Math.max(1, px(0.8))); };
    const bottomEdge = H - head;

    if (look === 'top') {
      drawId(c, side, y, W - side * 2);
      y += idH + px(10);
      rule(y);
      y += px(10);
      return { area: { x: side, y, w: W - side * 2, h: Math.max(10, bottomEdge - y) } };
    }
    if (look === 'middle') {
      // A label stuck over the wall, so it is drawn over the records.
      const area = { x: side, y, w: W - side * 2, h: Math.max(10, bottomEdge - y) };
      const inset = px(12);
      const labelW = W - side * 2 - px(16), labelH = idH + inset * 2;
      const labelX = (W - labelW) / 2, labelY = y + (area.h - labelH) / 2;
      return {
        area,
        over(pen) {
          pen.save();
          pen.shadowColor = 'rgba(0,0,0,0.35)';
          pen.shadowBlur = px(18);
          pen.shadowOffsetY = px(6);
          pen.fillStyle = ink.paper;
          roundRect(pen, labelX, labelY, labelW, labelH, px(10));
          pen.fill();
          pen.restore();
          drawId(pen, labelX + inset, labelY + inset, labelW - inset * 2);
        },
      };
    }
    const idY = bottomEdge - idH;
    drawId(c, side, idY, W - side * 2);
    const ruleY = idY - px(10);
    rule(ruleY);
    return { area: { x: side, y, w: W - side * 2, h: Math.max(10, ruleY - px(10) - y) } };
  }

  // One style on one paper: the still parts kept, the records drawn over them.
  function scene(frame, { art, shown, isDark, families, once = false }) {
    const ink = isDark ? INKS.night : INKS.day;
    const base = document.createElement('canvas');
    base.width = frame.w;
    base.height = frame.h;
    const { area, over } = layOut(base.getContext('2d'), frame, { art, shown, ink, families });
    // Kept as a picture too, so a moving print does not redraw its text.
    let cover = null;
    if (over) {
      cover = document.createElement('canvas');
      cover.width = frame.w;
      cover.height = frame.h;
      over(cover.getContext('2d'));
    }
    const list = (art?.covers || []).filter(Boolean);
    const across = COLS[shown?.albums] || COLS.m;
    const kind = list.length ? (scenes[shown?.style] ? shown.style : 'still') : null;
    const made = kind ? scenes[kind](list, { w: area.w, h: area.h }, across, randomFrom(Date.now()), once, ink) : null;
    return {
      step(dt) { made?.step(dt); },
      paint(c) {
        c.drawImage(base, 0, 0);
        if (made) {
          c.save();
          c.beginPath();
          c.rect(area.x, area.y, area.w, area.h);
          c.clip();
          c.translate(area.x, area.y);
          made.draw(c);
          c.restore();
        }
        if (cover) c.drawImage(cover, 0, 0);
      },
    };
  }

  return {
    title: 'Your journal',
    fileName: 'journal',
    scene,

    async load({ isDark }) {
      const [mark, face, ...sleeves] = await Promise.all([
        loadMark(isDark ? INKS.night.ink : INKS.day.ink),
        loadPicture(portrait),
        ...coverList.map(readableCover),
      ]);
      return { mark, face, covers: sleeves.filter(Boolean) };
    },

    // The picture, for Save with nothing moving.
    draw(ctx, frame, { art, shown, isDark, families }) {
      scene(frame, { art, shown: { ...shown, style: 'still' }, isDark, families }).paint(ctx);
      return [];
    },
  };
}

// ── The room ───────────────────────────────────────────────────────────────
// /printer, for the keeper: the paper in the middle, the bar under it. A tap on
// the print hides the bar and a sideways swipe turns the style.

// Glyphs Phosphor has no word for: Snake is squares, as its body is; Bounce a
// ball over a bar; the album sizes solid blocks, the card shapes outlines, so
// a large album and a square card cannot be mistaken for each other.
function Glyph({ children }) {
  return <svg width="23" height="23" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">{children}</svg>;
}
const blocks = n => {
  const gap = 14, box = 184, c = (box - gap * (n - 1)) / n;
  const out = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) out.push(<rect key={`${i}${j}`} x={36 + i * (c + gap)} y={36 + j * (c + gap)} width={c} height={c} rx="8" />);
  return <Glyph>{out}</Glyph>;
};
const shape = (w, h) => <Glyph><rect x={(256 - w) / 2} y={(256 - h) / 2} width={w} height={h} rx="14" fill="none" stroke="currentColor" strokeWidth="16" /></Glyph>;
const STYLE_WORDS = {
  still: ['Still', <Pause key="still" size={23} aria-hidden="true" />],
  drift: ['Drift', <ArrowsHorizontal key="drift" size={23} aria-hidden="true" />],
  rain: ['Rain', <CloudRain key="rain" size={23} aria-hidden="true" />],
  swap: ['Flip', <Glyph key="flip"><rect x="48" y="36" width="160" height="80" rx="14" /><rect x="48" y="140" width="160" height="80" rx="14" /></Glyph>],
  deal: ['Deal', <Cards key="deal" size={23} aria-hidden="true" />],
  snake: ['Snake', <Glyph key="snake"><path d="M40 64h56v56H40zM104 64h56v56h-56zM168 64h56v56h-56zM168 128h56v56h-56zM104 136h48v48h-48z" /></Glyph>],
  bounce: ['Bounce', <Glyph key="bounce"><rect x="48" y="196" width="160" height="24" rx="12" /><circle cx="150" cy="96" r="30" /></Glyph>],
};
const ALBUM_WORDS = { s: ['Small', blocks(3)], m: ['Medium', blocks(2)], l: ['Large', blocks(1)] };
const SIZE_WORDS = { story: ['9:16', shape(112, 200)], portrait: ['4:5', shape(150, 188)], square: ['1:1', shape(170, 170)] };
const PAPER_WORDS = { day: ['Day', <Sun key="day" size={23} aria-hidden="true" />], night: ['Night', <Moon key="night" size={23} aria-hidden="true" />] };
const LOOK_WORDS = { bottom: 'Bottom', middle: 'Middle', top: 'Top', minimal: 'Minimal' };

const STORE = 'ln-printing-journal';
const noSubscription = () => () => {};
const oneOf = (list, value, fallback) => (list.includes(value) ? value : fallback);

export default function JournalPrinter({ layered = false }) {
  const router = useRouter();
  const settings = useBookplate();
  const [choices, setChoices] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(STORE) || '{}') || {}; } catch { return {}; }
  });
  useEffect(() => {
    try { sessionStorage.setItem(STORE, JSON.stringify(choices)); } catch { /* private mode */ }
  }, [choices]);
  const style = oneOf(STYLES, choices.style, 'still');
  const albums = oneOf(ALBUM_SIZES, choices.albums, 'm');
  const size = oneOf(SIZES, choices.size, 'story');
  const paper = oneOf(['day', 'night'], choices.paper, 'day');
  const look = oneOf(LOOKS, choices.look, 'bottom');
  const tab = oneOf(['style', 'card', 'info'], choices.tab, 'style');
  const frame = FRAMES[size];
  const isDark = paper === 'night';
  const isMoving = style !== 'still';

  // What the wall was showing as its door was pressed, or nothing if this
  // address was opened by itself: then the whole journal, newest first.
  const [wall] = useState(() => wallHandedOver());
  const [stamps, setStamps] = useState(null);
  const [entries, setEntries] = useState(null);
  // The journal's address, for the clipboard on Save: where this page is.
  const address = useSyncExternalStore(noSubscription, () => window.location.origin, () => '');
  const inBrowser = useSyncExternalStore(noSubscription, () => true, () => false);
  useEffect(() => {
    let live = true;
    fetch('/api/public/stamps').then(r => r.json()).then(s => { if (live) setStamps(s); }).catch(() => { if (live) setStamps({}); });
    if (!wall) {
      fetch('/api/entries').then(r => r.json()).then(d => {
        if (live) setEntries(Array.isArray(d?.entries) ? d.entries : []);
      }).catch(() => { if (live) setEntries([]); });
    }
    return () => { live = false; };
  }, [wall]);

  const name = (settings?.display_name || settings?.keeper_name || '').trim();
  const hiddenFields = settings?.hidden_fields;
  const hidden = useMemo(() => (Array.isArray(hiddenFields) ? hiddenFields : []), [hiddenFields]);
  const counts = useMemo(() => {
    if (!stamps || hidden.includes('albums')) return [];
    return [
      { word: 'albums', n: stamps.records ?? 0, always: true },
      { word: 'songs', n: stamps.songs ?? 0 },
      { word: 'masterpieces', n: stamps.masterpieces ?? 0 },
      { word: 'formative', n: stamps.formative ?? 0 },
    ].filter(f => f.always || f.n > 0);
  }, [stamps, hidden]);
  const genres = useMemo(() => (hidden.includes('genres') || !Array.isArray(stamps?.genres) ? [] : stamps.genres), [stamps, hidden]);
  const covers = useMemo(() => {
    if (wall) return wall.covers;
    if (!entries) return null;
    const seen = new Set();
    return entries.map(e => e.album_art).filter(src => src && !seen.has(src) && seen.add(src));
  }, [wall, entries]);

  const plate = useMemo(() => (covers && stamps ? journalPlate({
    name, portrait: settings?.portrait_url, position: settings?.portrait_position, counts, genres, covers, caption: wall?.caption || '',
  }) : null), [covers, stamps, name, settings?.portrait_url, settings?.portrait_position, counts, genres, wall]);

  const [art, setArt] = useState(null);
  useEffect(() => {
    if (!plate) return undefined;
    let live = true;
    plate.load({ isDark }).then(a => { if (live) setArt(a); });
    return () => { live = false; };
  }, [plate, isDark]);

  const shown = useMemo(() => ({ style, albums, look }), [style, albums, look]);
  const fonts = useMemo(() => ({ sans: '.jp-face-sans', mono: '.jp-face-mono' }), []);

  // A moving print saves as a video: a scene of its own, run off the screen on
  // its own clock, once where the style has an ending.
  const motion = useCallback(() => {
    if (!isMoving || !plate || !art) return null;
    const made = plate.scene(frame, { art, shown, isDark, families: readFamilies(fonts), once: true });
    return { width: frame.w, height: frame.h, frame: (ctx, dt) => { made.step(dt); made.paint(ctx); } };
  }, [isMoving, plate, art, frame, shown, isDark, fonts]);
  const press = usePress({ plate: plate || { load: async () => null, draw() {} }, shown, ground: isMoving ? style : paper, isDark, link: address, fonts, motion });
  const busy = press.saving;

  // The preview: the plate at the paper's size, shown smaller — drawn once when
  // still, every frame while it moves.
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !plate || !art) return undefined;
    canvas.width = frame.w;
    canvas.height = frame.h;
    const ctx = canvas.getContext('2d');
    const made = plate.scene(frame, { art, shown, isDark, families: readFamilies(fonts) });
    made.paint(ctx);
    if (!isMoving) return undefined;
    let raf, last = null;
    const tick = now => {
      if (last !== null) made.step(Math.min(0.05, (now - last) / 1000));
      last = now;
      made.paint(ctx);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [plate, art, frame, shown, isDark, fonts, isMoving]);

  // The sheet's furniture stands down, as it does while a record prints.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.printing = '1';
    return () => { delete root.dataset.printing; };
  }, []);

  const choose = change => { if (!busy) setChoices(c => ({ ...c, ...change })); };
  const [barAway, setBarAway] = useState(false);
  // A sideways swipe on the print turns the style; a tap hides the bar.
  const swipe = useRef(null);
  const onTouchStart = e => {
    if (e.touches.length === 1) swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = e => {
    const from = swipe.current;
    swipe.current = null;
    if (!from || !e.changedTouches?.length) return;
    const dx = e.changedTouches[0].clientX - from.x;
    const dy = e.changedTouches[0].clientY - from.y;
    if (Math.abs(dx) <= 42 || Math.abs(dx) <= Math.abs(dy)) return;
    const i = STYLES.indexOf(style);
    choose({ style: STYLES[(i + (dx < 0 ? 1 : -1) + STYLES.length) % STYLES.length] });
  };

  const done = () => { if (layered) router.back(); else router.push('/'); };
  const doors = (what, value, words) => Object.entries(words).map(([key, word]) => {
    const [label, icon] = Array.isArray(word) ? word : [word, null];
    return { key, label, icon, on: value === key, press: () => choose({ [what]: key }) };
  });
  const sections = [
    { key: 'style', label: 'Style', groups: [doors('style', style, STYLE_WORDS)] },
    { key: 'card', label: 'Card', groups: [doors('albums', albums, ALBUM_WORDS), doors('size', size, SIZE_WORDS), doors('paper', paper, PAPER_WORDS)] },
    { key: 'info', label: 'ID', groups: [doors('look', look, LOOK_WORDS)] },
  ];

  // Drawn in the browser only: the choices live in this tab's storage and the
  // bar is portalled onto the body, neither of which the server has.
  if (!inBrowser) return <div className="jp-room" />;
  return (
    <div className={'jp-room' + (barAway ? ' jp-room--full' : '')}>
      {/* The faces the canvas draws in, worn by something so they can be read. */}
      <span className="jp-face-sans" aria-hidden="true" />
      <span className="jp-face-mono" aria-hidden="true" />
      <div className="jp-paper" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onClick={() => setBarAway(a => !a)}>
        <canvas
          ref={canvasRef}
          className={'jp-canvas' + (art ? '' : ' jp-canvas--waiting')}
          width={frame.w}
          height={frame.h}
          role="img"
          aria-label={wall?.caption ? `Your journal: ${wall.caption}` : 'Your journal'}
        />
      </div>
      {press.picture || press.clip ? (
        <PrintBar
          final
          picture={press.picture}
          clip={press.clip}
          canSend={press.canSend}
          status={press.status}
          onBack={press.dismissPicture}
          onDeliver={press.deliver}
          canDeliver={press.canDeliver}
        />
      ) : (
        <PrintBar
          away={barAway}
          sections={sections}
          tab={tab}
          onTab={key => choose({ tab: key })}
          onSave={() => { if (!busy) press.save(size); }}
          onDone={done}
          status={press.status}
        />
      )}
    </div>
  );
}
