// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/flood.js
// Flood: the whole page is the cover reflected, blurred across the paper under a light
// wash by day and a dark one at night (Miyel, 2026-11-06), with the real cover in the
// middle and everything else in black or white, centred. The cover comes down from the
// top and the rest comes up from the bottom to meet it.
'use client';

import { HEART_PATH, INKS, MARK_ASPECT, clamp01, drawPath, sheet } from '../SharePrinter';
import { coverOf, easeOut, factRows, markIn } from './poster';

const GLIDES_IN = 0.9;
const RISES_AT = 0.45, RISES_IN = 0.85;

// The cover blurred across the paper, overscanned so no edge shows. Safari's canvas has
// no blur filter, so where it is missing a cover shrunk and stretched back does the job.
function reflectionOf(art, W, H, night) {
  const ink = night ? INKS.night : INKS.day;
  return sheet(W, H, c => {
    c.fillStyle = ink.paper;
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
        const tiny = sheet(12, 12, t => t.drawImage(cover, 0, 0, 12, 12));
        c.imageSmoothingEnabled = true;
        c.imageSmoothingQuality = 'high';
        c.drawImage(tiny, x, y, side, side);
      }
    }
    // A shade darker than the page's own wash at night, for white words over a pale cover.
    c.fillStyle = night ? 'rgba(14,14,14,0.62)' : ink.wash;
    c.fillRect(0, 0, W, H);
  });
}

export const floodScene = night => (record, frame, { art, families, still = false }) => {
  const { bars, favs } = record;
  const W = frame.w, H = frame.h;
  const u = Math.min(W, (H * 9) / 16) / 100;
  const page = reflectionOf(art, W, H, night);
  const ink = night ? '#ffffff' : '#000000';
  const faint = night ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)';

  const margin = 7 * u;
  const markH = 6 * u, markW = markH * MARK_ASPECT;
  const markY = 7 * u;
  const size = Math.min(W - margin * 2, H * 0.42);
  const coverY = markY + markH + 3.5 * u;
  const cover = coverOf(art, size);
  const mark = markIn(art, markW, markH, ink);

  const floorH = bars.length ? 11 * u : 0;
  const floorY = H - floorH - margin;
  const heartBox = Math.min(3.6 * u, (bars.length ? (W - margin * 2) / bars.length : 0) * 0.8);
  const hasHearts = favs.some(Boolean) && bars.length > 0;
  const roomTop = coverY + size + 5 * u;
  const wordsEnd = floorY - 2 * u - (hasHearts ? heartBox + u : 0);
  const rows = factRows({ record, families, u, wide: W - margin * 2, room: wordsEnd - roomTop, align: 'center' });
  const rowsTop = roomTop + Math.max(0, (wordsEnd - roomTop - rows.height) / 2);
  const slot = bars.length ? (W - margin * 2) / bars.length : 0;
  const barGap = Math.min(0.8 * u, slot * 0.16);

  function paintAt(c, t) {
    c.drawImage(page, 0, 0);
    const up = (1 - easeOut(clamp01((t - RISES_AT) / RISES_IN))) * (H - coverY);
    c.save();
    c.translate(0, up);
    bars.forEach((v, i) => {
      const h = Math.max(floorH * 0.06, floorH * v);
      c.fillStyle = ink;
      c.fillRect(margin + i * slot + barGap / 2, floorY + floorH - h, slot - barGap, h);
      if (favs[i]) drawPath(c, HEART_PATH, margin + i * slot + (slot - heartBox) / 2, floorY + floorH - h - heartBox - 0.8 * u, heartBox, 24, ink);
    });
    rows.paint(c, margin, rowsTop, ink, faint);
    c.restore();
    c.drawImage(cover, (W - size) / 2, coverY - (1 - easeOut(clamp01(t / GLIDES_IN))) * (coverY + size));
    c.drawImage(mark, (W - markW) / 2, markY);
  }

  let t = still ? 30 : 0;
  return {
    step(dt) { t += dt; },
    paint(c) { paintAt(c, t); },
  };
};
