// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/solitaire.js
// Solitaire: a take on the Solitaire screensaver (session_components/backgrounds). Copies
// of the cover keep coming in from the top corners and bouncing across the head of the
// page, leaving a trail of themselves that stays and thickens. The album lands on top of
// it and the rest comes up from the bottom. It never has to settle, since Animated saves
// as a video; Still is the trail as it stands after the first few (Miyel, 2026-11-06).
//
// The bouncing runs in fixed steps, however the time arrives, so the preview and the
// video draw the same trail, and Still is the same trail run to its end at once.
'use client';

import { HEART_PATH, INKS, MARK_ASPECT, clamp01, drawPath, roundRect, sheet } from '../SharePrinter';
import { coverOf, easeOut, factRows, hueOf, inkOf, markIn } from './poster';

const TICK = 1 / 60, STAMP_EVERY = 2;
const SETS_OFF_EVERY = 0.5;            // a new copy
const CROSSES_IN = 1.25;               // each copy, across the page
const BOUNCE = 0.74;
const STILL_AT = 2.2;                  // how much trail Still shows
const HEIGHTS = [1, 1.2, 1.6, 1.1, 1.4]; // how far above the page each sets off, in turn
const LANDS_AT = 1.2, LANDS_IN = 0.6;  // the album
const RISES_AT = 1.2, RISES_IN = 0.7;  // everything else

export const solitaireScene = night => (record, frame, { art, families, still = false }) => {
  const { bars, favs } = record;
  const W = frame.w, H = frame.h;
  const u = Math.min(W, (H * 9) / 16) / 100;
  const paper = night ? INKS.night : INKS.day;
  const { ink, faint } = inkOf(hueOf(art), night);

  const zone = 92 * u;                 // the head of the page, where the trail stays
  const small = 30 * u;
  const solid = coverOf(art, small);
  const copy = sheet(small, small, c => {
    roundRect(c, 0, 0, small, small, small * 0.06);
    c.clip();
    c.drawImage(solid, 0, 0);
  });
  const trail = sheet(W, zone, () => {});
  const onTrail = trail.getContext('2d');

  // Each sets off above the page and lands on the floor of the zone.
  const floor = zone - small;
  const speed = (W + small) / CROSSES_IN;
  const gravity = 620 * u;
  let copies = [];
  let ran = 0, ticks = 0, made = 0;
  function advance() {
    if (ran >= made * SETS_OFF_EVERY) {
      const left = made % 2 === 0;
      copies.push({ x: left ? -small : W, y: -small * HEIGHTS[made % HEIGHTS.length], vx: left ? speed : -speed, vy: 0 });
      made += 1;
    }
    ran += TICK;
    ticks += 1;
    copies = copies.filter(card => card.x >= -small && card.x <= W);
    copies.forEach(card => {
      card.vy += gravity * TICK;
      card.x += card.vx * TICK;
      card.y += card.vy * TICK;
      if (card.y > floor) { card.y = floor; card.vy *= -BOUNCE; }
      if (ticks % STAMP_EVERY === 0) onTrail.drawImage(copy, card.x, card.y);
    });
  }

  // The album, with its lift baked in, since a shadow is dear on every frame.
  const size = 62 * u;
  const landY = 14 * u;
  const lift = 8 * u;
  const album = sheet(size + lift * 2, size + lift * 2, c => {
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.35)';
    c.shadowBlur = 5 * u;
    c.shadowOffsetY = 1.5 * u;
    c.fillStyle = paper.warm;
    roundRect(c, lift, lift, size, size, size * 0.06);
    c.fill();
    c.restore();
    roundRect(c, lift, lift, size, size, size * 0.06);
    c.clip();
    c.drawImage(coverOf(art, size), lift, lift);
  });

  const markH = 3.8 * u, markW = markH * MARK_ASPECT;
  const tab = sheet(markW + 3.6 * u, markH + 2.4 * u, c => {
    c.fillStyle = paper.paper;
    c.fillRect(0, 0, c.canvas.width, c.canvas.height);
    c.drawImage(markIn(art, markW, markH, ink), 1.8 * u, 1.2 * u);
  });

  const margin = 5 * u;
  const floorH = bars.length ? H * 0.12 : 0;
  const slot = bars.length ? W / bars.length : 0;
  const barGap = Math.min(0.9 * u, slot * 0.14);
  const heartBox = Math.min(4 * u, slot * 0.8);
  const hasHearts = favs.some(Boolean) && bars.length > 0;
  const roomTop = zone + 3 * u;
  const roomEnd = H - floorH - (bars.length ? 1.5 * u + (hasHearts ? heartBox + u : 0) : margin);
  const rows = factRows({ record, families, u, wide: W - margin * 2, room: roomEnd - roomTop });
  const rowsTop = roomTop + Math.max(0, (roomEnd - roomTop - rows.height) / 2);

  function paintAt(c, t) {
    c.fillStyle = paper.paper;
    c.fillRect(0, 0, W, H);
    c.drawImage(trail, 0, 0);

    const up = (1 - easeOut(clamp01((t - RISES_AT) / RISES_IN))) * (H - zone);
    c.save();
    c.translate(0, up);
    bars.forEach((v, i) => {
      const h = Math.max(floorH * 0.05, floorH * v);
      c.fillStyle = ink;
      c.fillRect(i * slot + barGap / 2, H - h, slot - barGap, h);
      if (favs[i]) drawPath(c, HEART_PATH, i * slot + (slot - heartBox) / 2, H - h - heartBox - u, heartBox, 24, ink);
    });
    rows.paint(c, margin, rowsTop, ink, faint);
    c.restore();

    const drop = (1 - easeOut(clamp01((t - LANDS_AT) / LANDS_IN))) * (landY + size + lift * 2);
    c.drawImage(album, (W - size) / 2 - lift, landY - lift - drop);
    c.drawImage(tab, 0, 0);
  }

  let t = still ? 30 : 0;
  while (still && ran < STILL_AT) advance();
  return {
    step(dt) {
      t += dt;
      while (ran < t) advance();
    },
    paint(c) { paintAt(c, t); },
  };
};
