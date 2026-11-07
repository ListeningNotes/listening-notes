// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/grounds.js
// What can move behind the card (day.js): the same card with its lights, over something
// lovely and calm to watch (Miyel, 2026-11-07: "a moment of beauty"), swiped through like a
// story's filters. Nothing bumps to a beat. Each is `ground(record, frame, { art, night })`,
// returning `paint(c, t)`, with `fog` when the card's words want a soft bank of the page's
// colour behind them, so the background itself stays clear. Each is only ever the album's
// real cover or its colours, in fixed patterns, so the preview and the video agree.
'use client';

import { INKS, roundRect, sheet } from '../SharePrinter';
import { coverOf, reflectionOf } from './poster';

const TURN = Math.PI * 2;

// A little pattern of chance that comes out the same every time.
function dice(start) {
  let seed = start;
  return () => { seed = (seed * 16807) % 2147483647; return (seed % 100000) / 100000; };
}

// The cover's own colours, the vivid ones first, several and unlike each other.
function paletteOf(art, most = 5) {
  const side = 80;
  const small = sheet(side, side, c => {
    if (art?.cover?.naturalWidth) c.drawImage(art.cover, 0, 0, side, side);
    else { c.fillStyle = '#888'; c.fillRect(0, 0, side, side); }
  });
  const px = small.getContext('2d').getImageData(0, 0, side, side).data;
  const boxes = new Map();
  for (let i = 0; i < px.length; i += 4) {
    const key = (px[i] >> 5) * 64 + (px[i + 1] >> 5) * 8 + (px[i + 2] >> 5);
    const box = boxes.get(key) || { n: 0, r: 0, g: 0, b: 0 };
    box.n++; box.r += px[i]; box.g += px[i + 1]; box.b += px[i + 2];
    boxes.set(key, box);
  }
  const pull = ({ n, r, g, b }) => n * (0.1 + (Math.max(r, g, b) - Math.min(r, g, b)) / n / 255);
  const kept = [];
  [...boxes.values()].sort((a, b) => pull(b) - pull(a)).forEach(({ n, r, g, b }) => {
    const colour = [r / n, g / n, b / n];
    if (kept.length < most && kept.every(k => Math.hypot(k[0] - colour[0], k[1] - colour[1], k[2] - colour[2]) >= 60)) kept.push(colour);
  });
  return kept.length ? kept : [[140, 140, 140]];
}

// Soft orbs of the album's colours, swirling slowly round one another.
export function orbsGround(record, frame, { art, night }) {
  const W = frame.w, H = frame.h;
  const u = Math.min(W, (H * 9) / 16) / 100;
  const paper = (night ? INKS.night : INKS.day).paper;
  const palette = paletteOf(art);
  const roll = dice(41);
  const orbs = Array.from({ length: 9 }, (_, i) => {
    const [r, g, b] = palette[i % palette.length];
    const radius = (34 + roll() * 46) * u;
    const art2 = sheet(radius * 2, radius * 2, c => {
      const soft = c.createRadialGradient(radius, radius, 0, radius, radius, radius);
      soft.addColorStop(0, `rgba(${r | 0},${g | 0},${b | 0},0.95)`);
      soft.addColorStop(0.55, `rgba(${r | 0},${g | 0},${b | 0},0.5)`);
      soft.addColorStop(1, `rgba(${r | 0},${g | 0},${b | 0},0)`);
      c.fillStyle = soft;
      c.fillRect(0, 0, radius * 2, radius * 2);
    });
    return {
      art: art2,
      radius,
      wide: (20 + roll() * 45) * u,
      tall: (30 + roll() * 70) * u,
      takes: (14 + roll() * 20) * (roll() < 0.5 ? 1 : -1),
      phase: roll() * TURN,
      midX: W * (0.25 + roll() * 0.5),
      midY: H * (0.15 + roll() * 0.7),
    };
  });
  return {
    fog: true,
    paint(c, t) {
      c.fillStyle = paper;
      c.fillRect(0, 0, W, H);
      c.save();
      // Light adding up in the dark; by day, soft paint, which never goes muddy.
      if (night) c.globalCompositeOperation = 'lighter';
      orbs.forEach(o => {
        const a = o.phase + (t * TURN) / o.takes;
        c.drawImage(o.art, o.midX + Math.cos(a) * o.wide - o.radius, o.midY + Math.sin(a) * o.tall - o.radius);
      });
      c.restore();
    },
  };
}

// The horizon made of the record itself: every track a bar of the real cover, reaching in
// from the top and the bottom of the page, as tall as its rating allows, rising and
// settling very slowly.
export function levelsGround(record, frame, { art, night }) {
  const W = frame.w, H = frame.h;
  const u = Math.min(W, (H * 9) / 16) / 100;
  const paper = (night ? INKS.night : INKS.day).paper;
  const side = Math.max(W, H);
  const picture = coverOf(art, side);
  const offX = (W - side) / 2, offY = (H - side) / 2;
  const roll = dice(53);
  const source = record.bars.length ? record.bars : [0.7, 0.9, 0.6, 0.8, 1, 0.7, 0.85, 0.65];
  const bands = source.map(level => ({ level: Math.max(0.3, level), phase: roll() * TURN, takes: 7 + roll() * 7 }));
  const slot = W / bands.length;
  const gap = Math.min(0.9 * u, slot * 0.12);
  const reach = H * 0.42;
  return {
    fog: true,
    paint(c, t) {
      c.fillStyle = paper;
      c.fillRect(0, 0, W, H);
      bands.forEach((band, i) => {
        const h = Math.max(2 * u, reach * band.level * (0.72 + 0.28 * Math.sin(band.phase + (t * TURN) / band.takes)));
        const x = i * slot + gap / 2, wide = slot - gap;
        c.drawImage(picture, x - offX, -offY, wide, h, x, 0, wide, h);
        c.drawImage(picture, x - offX, H - h - offY, wide, h, x, H - h, wide, h);
      });
    },
  };
}

// The cover blurred across the whole page, bright and full of its colour. Only the lower
// part dims, gently, for the words and lights to read on (Miyel, 2026-11-07: "still seems so
// dark"). Lifted once more with a screen of itself, since a phone's blur, made by stretching a
// tiny copy, comes out duller than a computer's.
export function reflectGround(record, frame, { art, night }) {
  const W = frame.w, H = frame.h;
  const blur = reflectionOf(art, W, H, night);
  const page = sheet(W, H, c => {
    c.drawImage(blur, 0, 0);
    c.globalCompositeOperation = 'screen';
    c.globalAlpha = 0.35;
    c.drawImage(blur, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    const dim = c.createLinearGradient(0, H * 0.55, 0, H * 0.75);
    dim.addColorStop(0, 'rgba(14,14,14,0)');
    dim.addColorStop(1, 'rgba(14,14,14,0.42)');
    c.fillStyle = dim;
    c.fillRect(0, H * 0.55, W, H * 0.45);
  });
  return { horizon: true, paint(c) { c.drawImage(page, 0, 0); } };
}

// Copies of the record drifting in deep space: huge and soft right up close, tiny and far
// away at the back, each at its own speed, very dreamy.
export function driftGround(record, frame, { art, night }) {
  const W = frame.w, H = frame.h;
  const u = Math.min(W, (H * 9) / 16) / 100;
  const paper = (night ? INKS.night : INKS.day).paper;
  const most = 70 * u;
  const sharp = sheet(most, most, c => {
    roundRect(c, 0, 0, most, most, most * 0.07);
    c.clip();
    c.drawImage(coverOf(art, most), 0, 0);
  });
  const soft = sheet(most, most, c => {
    if (typeof c.filter === 'string') {
      c.filter = `blur(${Math.round(most * 0.035)}px)`;
      c.drawImage(sharp, most * 0.08, most * 0.08, most * 0.84, most * 0.84);
      c.filter = 'none';
    } else {
      c.imageSmoothingQuality = 'high';
      c.drawImage(sheet(28, 28, s => s.drawImage(sharp, 0, 0, 28, 28)), most * 0.08, most * 0.08, most * 0.84, most * 0.84);
    }
  });
  const roll = dice(11);
  const copies = Array.from({ length: 20 }, () => {
    const depth = roll();
    const near = depth * depth;
    return {
      depth,
      size: (3.5 + near * 62) * u,
      x: roll() * W,
      y: roll() * H,
      // Everything leans the same way, the near ones faster, as it would from a slow train.
      vx: (0.6 + near * 11) * u * (0.6 + roll() * 0.8),
      vy: (-0.4 - near * 5) * u * (0.6 + roll() * 0.8),
      tilt: (roll() - 0.5) * 0.8,
      spin: (roll() - 0.5) * 0.05,
    };
  }).sort((a, b) => a.depth - b.depth);
  return {
    fog: true,
    paint(c, t) {
      c.fillStyle = paper;
      c.fillRect(0, 0, W, H);
      copies.forEach(b => {
        const rangeX = W + b.size * 2, rangeY = H + b.size * 2;
        const x = ((((b.x + b.vx * t) % rangeX) + rangeX) % rangeX) - b.size;
        const y = ((((b.y + b.vy * t) % rangeY) + rangeY) % rangeY) - b.size;
        c.save();
        c.translate(x, y);
        c.rotate(b.tilt + b.spin * t);
        // Only the middle distance is in focus.
        c.globalAlpha = night ? 0.45 + b.depth * 0.55 : 0.55 + b.depth * 0.45;
        c.drawImage(b.depth > 0.78 || b.depth < 0.22 ? soft : sharp, -b.size / 2, -b.size / 2, b.size, b.size);
        c.restore();
      });
    },
  };
}
