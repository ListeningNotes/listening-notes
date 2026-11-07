// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/grounds.js
// What can move behind the card (day.js): the same card with its lights, over a different
// background, swiped through like a story's filters (Miyel, 2026-11-07, trying). Each is
// `ground(record, frame, { art, night, still })`, returning `paint(c, t)`, `over(c, t)` if
// it lies on top of the card as well, and `fog` if the card's words want a soft bank of the
// page's colour behind them: the background itself stays clear (Miyel, 2026-11-07). Each is only ever the album's real cover, its
// colours, or the page's. They run in fixed patterns, so the preview and the video agree.
'use client';

import { INKS, roundRect, sheet } from '../SharePrinter';
import { coverOf, huesOf } from './poster';

// A print cannot hear anything, so the beat is made up: two to the second, which comes round
// exactly on a six-second video. `kick` jumps on each beat and dies away.
const BEATS = 2;
const kick = t => Math.exp(-((t * BEATS) % 1) * 5);

// A little pattern of chance that comes out the same every time.
function dice(start) {
  let seed = start;
  return () => { seed = (seed * 16807) % 2147483647; return (seed % 100000) / 100000; };
}

// The cover blurred across the page. Safari's canvas has no blur filter, so where it is
// missing a cover shrunk and stretched back does the job.
export function reflectGround(record, frame, { art, night }) {
  const W = frame.w, H = frame.h;
  const page = sheet(W, H, c => {
    c.fillStyle = (night ? INKS.night : INKS.day).paper;
    c.fillRect(0, 0, W, H);
    const cover = art?.cover;
    if (cover?.naturalWidth) {
      const side = Math.max(W, H) * 1.3;
      const x = (W - side) / 2, y = (H - side) / 2;
      if (typeof c.filter === 'string') {
        c.filter = `blur(${Math.round(W * 0.03)}px) saturate(1.25)`;
        c.drawImage(cover, x, y, side, side);
        c.filter = 'none';
      } else {
        c.imageSmoothingQuality = 'high';
        c.drawImage(sheet(12, 12, t => t.drawImage(cover, 0, 0, 12, 12)), x, y, side, side);
      }
    }
  });
  return { fog: true, paint(c) { c.drawImage(page, 0, 0); } };
}

// Copies of the record drifting like a lava lamp: slow, some rising and some sinking,
// tiny ones and huge ones, each taking its time (Miyel, 2026-11-07).
export function fizzGround(record, frame, { art, night }) {
  const W = frame.w, H = frame.h;
  const u = Math.min(W, (H * 9) / 16) / 100;
  const paper = (night ? INKS.night : INKS.day).paper;
  const most = 46 * u;
  const copy = sheet(most, most, c => {
    roundRect(c, 0, 0, most, most, most * 0.08);
    c.clip();
    c.drawImage(coverOf(art, most), 0, 0);
  });
  const roll = dice(11);
  const blobs = Array.from({ length: 15 }, () => {
    const big = roll();
    return {
      x: roll() * W,
      // Mostly small, with a few very large: squaring it keeps the large ones rare.
      size: (4 + big * big * 42) * u,
      takes: 16 + roll() * 22,          // seconds for the whole way up and back
      phase: roll() * Math.PI * 2,
      tilt: (roll() - 0.5) * 0.7,
      spin: (roll() - 0.5) * 0.08,
      sway: roll() * Math.PI * 2,
      swayBy: (2 + roll() * 6) * u,
    };
  }).sort((a, b) => b.size - a.size);
  return {
    fog: true,
    paint(c, t) {
      c.fillStyle = paper;
      c.fillRect(0, 0, W, H);
      blobs.forEach(b => {
        const reach = H / 2 + b.size / 2;
        const y = H / 2 + reach * Math.sin(b.phase + (t * Math.PI * 2) / b.takes);
        c.save();
        c.translate(b.x + Math.sin(t * 0.25 + b.sway) * b.swayBy, y);
        c.rotate(b.tilt + b.spin * t);
        const size = b.size * (1 + 0.1 * kick(t));
        c.drawImage(copy, -size / 2, -size / 2, size, size);
        c.restore();
      });
    },
  };
}

// A snake made of pieces of the cover, each piece the part of the picture it is passing
// over, so its trail hints at the album as it winds about the page.
export function snakeGround(record, frame, { art, night }) {
  const W = frame.w, H = frame.h;
  const u = Math.min(W, (H * 9) / 16) / 100;
  const paper = (night ? INKS.night : INKS.day).paper;
  const cell = 12.5 * u, gap = 0.7 * u;
  const across = Math.ceil(W / cell), down = Math.ceil(H / cell);
  const side = Math.max(W, H);
  const picture = coverOf(art, side);
  const offX = (W - side) / 2, offY = (H - side) / 2;
  const roll = dice(29);
  const path = [];
  let x = Math.floor(across / 2), y = Math.floor(down / 2), dx = 1, dy = 0;
  for (let i = 0; i < 1600; i++) {
    path.push([x, y]);
    const blocked = x + dx < 0 || x + dx >= across || y + dy < 0 || y + dy >= down;
    if (blocked || roll() < 0.16) {
      const left = roll() < 0.5;
      [dx, dy] = dy ? [left ? 1 : -1, 0] : [0, left ? 1 : -1];
      if (x + dx < 0 || x + dx >= across || y + dy < 0 || y + dy >= down) [dx, dy] = [-dx, -dy];
    }
    x += dx; y += dy;
  }
  const SPEED = BEATS * 6;  // six cells to the beat
  return {
    fog: true,
    paint(c, t) {
      c.fillStyle = paper;
      c.fillRect(0, 0, W, H);
      const head = Math.min(path.length - 1, Math.floor(t * SPEED));
      const long = Math.min(70, 16 + t * 9);
      for (let i = Math.max(0, head - Math.floor(long)); i <= head; i++) {
        const [cx, cy] = path[i];
        const px = cx * cell, py = cy * cell;
        c.drawImage(picture, px - offX, py - offY, cell, cell, px + gap / 2, py + gap / 2, cell - gap, cell - gap);
      }
    },
  };
}

// An old set: the album's colour with CRT lines over everything, the card included, and a
// band rolling down the screen.
export function crtGround(record, frame, { art, night, still }) {
  const W = frame.w, H = frame.h;
  const u = Math.min(W, (H * 9) / 16) / 100;
  const { first: hue } = huesOf(art);
  const page = sheet(W, H, c => {
    const wash = c.createLinearGradient(0, 0, 0, H);
    if (hue === null) {
      wash.addColorStop(0, night ? '#0b0b0b' : '#d6d6d6');
      wash.addColorStop(1, night ? '#2b2b2b' : '#f2f2f2');
    } else {
      wash.addColorStop(0, night ? `hsl(${hue},75%,10%)` : `hsl(${hue},85%,80%)`);
      wash.addColorStop(1, night ? `hsl(${hue},80%,20%)` : `hsl(${hue},90%,90%)`);
    }
    c.fillStyle = wash;
    c.fillRect(0, 0, W, H);
  });
  const pitch = Math.max(3, Math.round(0.55 * u));
  const tube = sheet(W, H, c => {
    c.fillStyle = 'rgba(0,0,0,0.2)';
    for (let x = 0; x < W; x += pitch * 2) c.fillRect(x, 0, pitch, H);
    c.fillStyle = 'rgba(0,0,0,0.04)';
    for (let y = 0; y < H; y += pitch * 3) c.fillRect(0, y, W, pitch);
  });
  const bandH = 26 * u;
  return {
    paint(c) { c.drawImage(page, 0, 0); },
    over(c, t) {
      if (!still) {
        c.fillStyle = 'rgba(255,255,255,0.08)';
        c.fillRect(0, ((t % 2.6) / 2.6) * (H + bandH) - bandH, W, bandH);
      }
      c.drawImage(tube, 0, 0);
    },
  };
}

// A visualizer made of the record itself: every track a bar of the real cover, reaching in
// from the top and the bottom of the page, as tall as its rating allows, jumping with the
// beat and wandering a little on its own. Its waves all come round on the six-second video.
export function levelsGround(record, frame, { art, night }) {
  const W = frame.w, H = frame.h;
  const u = Math.min(W, (H * 9) / 16) / 100;
  const paper = (night ? INKS.night : INKS.day).paper;
  const side = Math.max(W, H);
  const picture = coverOf(art, side);
  const offX = (W - side) / 2, offY = (H - side) / 2;
  const roll = dice(53);
  const source = record.bars.length ? record.bars : [0.7, 0.9, 0.6, 0.8, 1, 0.7, 0.85, 0.65];
  const bands = source.map(level => ({
    level: Math.max(0.25, level),
    slow: 1 + Math.floor(roll() * 3),
    quick: 4 + Math.floor(roll() * 5),
    phase: roll() * Math.PI * 2,
    punch: 0.35 + roll() * 0.65,
  }));
  const slot = W / bands.length;
  const gap = Math.min(0.9 * u, slot * 0.12);
  const reach = H * 0.5;
  return {
    fog: true,
    paint(c, t) {
      c.fillStyle = paper;
      c.fillRect(0, 0, W, H);
      const hit = kick(t);
      const turn = (t * Math.PI * 2) / 6;
      bands.forEach((band, i) => {
        const move = 0.42
          + 0.18 * Math.sin(turn * band.slow + band.phase)
          + 0.1 * Math.sin(turn * band.quick + band.phase * 2)
          + 0.3 * hit * band.punch;
        const h = Math.max(2 * u, reach * band.level * Math.min(1, move));
        const x = i * slot + gap / 2, wide = slot - gap;
        c.drawImage(picture, x - offX, 0 - offY, wide, h, x, 0, wide, h);
        c.drawImage(picture, x - offX, H - h - offY, wide, h, x, H - h, wide, h);
      });
    },
  };
}

// A dark room lit only by the album: its own colours thrown on the walls behind it, swelling
// and fading with the beat, harder for a record rated higher (Miyel, 2026-11-07). `pulse`
// tells the card how hard the music is hitting, so the cover and the lights move with it.
export function glowGround(record, frame, { art, still, place }) {
  const W = frame.w, H = frame.h;
  const paper = INKS.night.paper;
  const love = 0.35 + 0.65 * Math.min(1, (record.stars || 0) / 5);
  const bloomOf = (reach, blur, saturate) => {
    const side = place.size * reach;
    return sheet(side, side, c => {
      const cover = art?.cover;
      if (cover?.naturalWidth) {
        const inner = side * 0.62, at = (side - inner) / 2;
        if (typeof c.filter === 'string') {
          c.filter = `blur(${Math.round(place.size * blur)}px) saturate(${saturate})`;
          c.drawImage(cover, at, at, inner, inner);
          c.filter = 'none';
        } else {
          c.imageSmoothingQuality = 'high';
          c.drawImage(sheet(8, 8, t => t.drawImage(cover, 0, 0, 8, 8)), at * 0.6, at * 0.6, side - at * 1.2, side - at * 1.2);
        }
      }
      // Fades to nothing before its edge, so the light has no shape of its own.
      c.globalCompositeOperation = 'destination-in';
      const fade = c.createRadialGradient(side / 2, side / 2, side * 0.2, side / 2, side / 2, side * 0.5);
      fade.addColorStop(0, 'rgba(0,0,0,1)');
      fade.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = fade;
      c.fillRect(0, 0, side, side);
    });
  };
  const near = bloomOf(1.9, 0.14, 1.8);
  const far = bloomOf(3.4, 0.26, 1.6);
  const pulse = t => {
    if (still) return 0.55;
    const beat = Math.floor(t * BEATS);
    const accent = beat % 4 === 0 ? 1 : beat % 2 === 0 ? 0.7 : 0.45;
    const swell = 0.65 + 0.35 * Math.sin((t * Math.PI * 2) / 6 - Math.PI / 2);
    return love * swell * (0.3 + 0.7 * kick(t) * accent);
  };
  const lay = (c, bloom, scale, alpha) => {
    const side = bloom.width * scale;
    c.globalAlpha = Math.min(1, alpha);
    c.drawImage(bloom, W / 2 - side / 2, place.y - side / 2, side, side);
  };
  return {
    fog: true,
    pulse,
    paint(c, t) {
      c.fillStyle = paper;
      c.fillRect(0, 0, W, H);
      const hit = pulse(t);
      c.save();
      c.globalCompositeOperation = 'lighter';
      lay(c, far, 1 + 0.18 * hit, 0.25 + 0.75 * hit);
      lay(c, near, 1 + 0.08 * hit, 0.4 + 0.6 * hit);
      c.restore();
    },
  };
}
