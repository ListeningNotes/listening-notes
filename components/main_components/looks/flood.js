// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/flood.js
// Flood: the whole page is the cover reflected, blurred across the paper under a light
// wash by day and a dark one at night (Miyel, 2026-11-06), with the real cover in the
// middle and everything else in black or white, centred. Its own way in, unlike the
// others: the picture fills the page, close up and clear, then melts into its reflection
// while the album and the words dissolve in over it (Miyel, 2026-11-06). The one place
// a print dissolves, and at her asking.
'use client';

import { HEART_PATH, INKS, MARK_ASPECT, clamp01, drawPath, roundRect, sheet } from '../SharePrinter';
import { coverOf, factRows, goldStroke, markIn } from './poster';

const MELTS_AT = 0.4, MELTS_IN = 1.3;  // the picture blurring
const ALBUM_AT = 0.7, ALBUM_IN = 0.8;  // the album dissolving in
const WORDS_AT = 1.0, WORDS_IN = 0.8;  // the rest
const DRAWS_BACK = 1.15;               // how close up the picture starts
const BLURS = [0.006, 0.012, 0.02, 0.03];  // each step of the melt, of the page's width
const TINIES = [64, 32, 20, 12];       // the same, where the canvas has no blur of its own
const smooth = v => v * v * (3 - 2 * v);

// The cover across the paper, overscanned so no edge shows, at one step of the melt: 0 is
// clear, and the last is the reflection. Safari's canvas has no blur filter, so where it
// is missing a cover shrunk and stretched back does the job.
function meltStep(art, W, H, step, paper) {
  return sheet(W, H, c => {
    c.fillStyle = paper;
    c.fillRect(0, 0, W, H);
    const cover = art?.cover;
    if (!cover?.naturalWidth) return;
    const side = Math.max(W, H) * 1.3;
    const x = (W - side) / 2, y = (H - side) / 2;
    if (step === 0) c.drawImage(cover, x, y, side, side);
    else if (typeof c.filter === 'string') {
      c.filter = `blur(${Math.round(W * BLURS[step - 1])}px) saturate(${1 + (0.25 * step) / BLURS.length})`;
      c.drawImage(cover, x, y, side, side);
      c.filter = 'none';
    } else {
      const n = TINIES[step - 1];
      const tiny = sheet(n, n, t => t.drawImage(cover, 0, 0, n, n));
      c.imageSmoothingQuality = 'high';
      c.drawImage(tiny, x, y, side, side);
    }
  });
}

export const floodScene = night => (record, frame, { art, families, still = false }) => {
  const { bars, favs } = record;
  const W = frame.w, H = frame.h;
  const u = Math.min(W, (H * 9) / 16) / 100;
  const paper = night ? INKS.night.paper : INKS.day.paper;
  // A shade darker than the page's own wash at night, for white words over a pale cover.
  const wash = night ? 'rgba(14,14,14,0.62)' : INKS.day.wash;
  // The melt's steps are only made for a print that moves; Still is its last.
  const steps = still
    ? [meltStep(art, W, H, BLURS.length, paper)]
    : Array.from({ length: BLURS.length + 1 }, (_, i) => meltStep(art, W, H, i, paper));
  const ink = night ? '#ffffff' : '#000000';
  const faint = night ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)';

  const margin = 7 * u;
  const markH = 6 * u, markW = markH * MARK_ASPECT;
  const markY = 7 * u;
  const size = Math.min(W - margin * 2, H * 0.42);
  const coverY = markY + markH + 3.5 * u;
  const cover = sheet(size, size, c => {
    roundRect(c, 0, 0, size, size, size * 0.06);
    c.clip();
    c.drawImage(coverOf(art, size), 0, 0);
    if (record.isMasterpiece) {
      goldStroke(c, size * 0.036, 0, 0, size, size);
      roundRect(c, 0, 0, size, size, size * 0.06);
      c.stroke();
    }
  });
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
    // The picture melting: each step dissolving into the next, drawing back as it goes.
    const melt = smooth(clamp01((t - MELTS_AT) / MELTS_IN));
    const at = melt * (steps.length - 1);
    const from = Math.min(steps.length - 1, Math.floor(at));
    const zoom = DRAWS_BACK + (1 - DRAWS_BACK) * melt;
    const drawStep = step => c.drawImage(step, (W - W * zoom) / 2, (H - H * zoom) / 2, W * zoom, H * zoom);
    drawStep(steps[from]);
    if (from < steps.length - 1) {
      c.globalAlpha = at - from;
      drawStep(steps[from + 1]);
    }
    c.globalAlpha = still ? 1 : melt;
    c.fillStyle = wash;
    c.fillRect(0, 0, W, H);

    // The album and the mark, dissolving in as they settle.
    const album = smooth(clamp01((t - ALBUM_AT) / ALBUM_IN));
    if (album > 0) {
      const drawn = size * (1.08 - 0.08 * album);
      c.globalAlpha = album;
      c.drawImage(cover, (W - drawn) / 2, coverY + (size - drawn) / 2, drawn, drawn);
      c.drawImage(mark, (W - markW) / 2, markY);
    }

    // The rest.
    const words = smooth(clamp01((t - WORDS_AT) / WORDS_IN));
    if (words > 0) {
      c.globalAlpha = words;
      bars.forEach((v, i) => {
        const h = Math.max(floorH * 0.06, floorH * v);
        c.fillStyle = ink;
        c.fillRect(margin + i * slot + barGap / 2, floorY + floorH - h, slot - barGap, h);
        if (favs[i]) drawPath(c, HEART_PATH, margin + i * slot + (slot - heartBox) / 2, floorY + floorH - h - heartBox - 0.8 * u, heartBox, 24, ink);
      });
      rows.paint(c, margin, rowsTop, ink, faint);
    }
    c.globalAlpha = 1;
  }

  let t = still ? 30 : 0;
  return {
    step(dt) { t += dt; },
    paint(c) { paintAt(c, t); },
  };
};
