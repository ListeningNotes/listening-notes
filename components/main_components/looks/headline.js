// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/headline.js
// Headline: a gig poster. The title fills the page in capitals, every line stretched to
// the full width, with the real cover small in the corner and the rest beside it.
'use client';

import { HEART_PATH, INKS, MARK_ASPECT, STAR_PATH, SYMBOLS, clamp01, drawArtist, drawPath } from '../SharePrinter';
import { coverOf, easeOut, hueOf, inkOf, markIn } from './poster';

const GLIDES_IN = 0.9;
const RISES_AT = 0.35, RISES_IN = 0.8, LINE_GAP = 0.06;
const MOST_LINES = 5;

// The title's words, one to a line, the shortest neighbours sharing once there are too many.
function linesOf(album) {
  const lines = String(album || '').toUpperCase().split(/\s+/).filter(Boolean);
  while (lines.length > MOST_LINES) {
    let at = 0;
    for (let i = 0; i < lines.length - 1; i++) {
      if (lines[i].length + lines[i + 1].length < lines[at].length + lines[at + 1].length) at = i;
    }
    lines.splice(at, 2, `${lines[at]} ${lines[at + 1]}`);
  }
  return lines;
}

export const headlineScene = night => (record, frame, { art, families, still = false }) => {
  const { stars, artistLine, tags, bars, favs, entry } = record;
  const { sans, mono } = families;
  const W = frame.w, H = frame.h;
  const u = Math.min(W, (H * 9) / 16) / 100;
  const paper = night ? INKS.night.paper : INKS.day.paper;
  const { ink, faint } = inkOf(hueOf(art), night);

  const margin = 5 * u;
  const least = 36 * u, most = 52 * u;
  const markH = 5 * u, markW = markH * MARK_ASPECT;
  const mark = markIn(art, markW, markH, ink);

  const floorH = bars.length ? 10 * u : 0;
  const slot = bars.length ? W / bars.length : 0;
  const barGap = Math.min(0.8 * u, slot * 0.16);
  const heartBox = Math.min(3.2 * u, slot * 0.8);
  const hasHearts = favs.some(Boolean) && bars.length > 0;

  // Each line as wide as the page, unless that makes the lot too tall for it.
  const top = margin + least + 4 * u;
  const end = H - floorH - 2 * u - (hasHearts ? heartBox + u : 0) - (bars.length ? 0 : margin);
  const measure = document.createElement('canvas').getContext('2d');
  const fontAt = px => `900 ${px}px ${sans}`;
  const words = linesOf(entry?.album);
  measure.font = fontAt(100);
  let sizes = words.map(line => Math.min(46 * u, ((W - margin * 2) / Math.max(1, measure.measureText(line).width)) * 100));
  const tall = sizes.reduce((n, px) => n + px * 0.94, 0);
  if (tall > end - top) sizes = sizes.map(px => (px * (end - top)) / tall);
  const used = sizes.reduce((n, px) => n + px * 0.94, 0);
  // A short title leaves room, and the cover takes it.
  const size = Math.min(most, least + Math.max(0, end - top - used));
  const ax = W - margin - size;
  const cover = coverOf(art, size, record.isMasterpiece);
  const besideWide = ax - margin * 2;
  let at = end - used;
  const placed = words.map((line, i) => {
    const place = { line, px: sizes[i], y: at };
    at += sizes[i] * 0.94;
    return place;
  });

  const starBox = 5.4 * u, starGap = 0.8 * u, markBox = 5.4 * u, markGap = 1.2 * u;

  function paintAt(c, t) {
    c.fillStyle = paper;
    c.fillRect(0, 0, W, H);
    const rising = delay => (1 - easeOut(clamp01((t - RISES_AT - delay) / RISES_IN))) * (H - top);

    c.save();
    c.translate(0, rising(0));
    bars.forEach((v, i) => {
      const h = Math.max(floorH * 0.06, floorH * v);
      c.fillStyle = ink;
      c.fillRect(i * slot + barGap / 2, H - h, slot - barGap, h);
      if (favs[i]) drawPath(c, HEART_PATH, i * slot + (slot - heartBox) / 2, H - h - heartBox - 0.8 * u, heartBox, 24, ink);
    });
    c.restore();

    c.textBaseline = 'top';
    c.textAlign = 'left';
    c.fillStyle = ink;
    placed.forEach(({ line, px, y }, i) => {
      c.font = fontAt(px);
      c.fillText(line, margin, y + rising((placed.length - 1 - i) * LINE_GAP));
    });

    const drop = (1 - easeOut(clamp01(t / GLIDES_IN))) * (margin + size);
    c.drawImage(mark, margin, margin);
    let y = margin + size - (artistLine ? 3.4 * u : 0) - (tags.length ? markBox + 1.6 * u : 0) - (stars > 0 ? starBox + 1.6 * u : 0);
    for (let i = 0; i < 5 && stars > 0; i++) {
      const x = margin + i * (starBox + starGap);
      drawPath(c, STAR_PATH, x, y, starBox, 18, faint);
      const part = clamp01(stars - i);
      if (part > 0) {
        c.save();
        c.beginPath();
        c.rect(x, y, starBox * part, starBox);
        c.clip();
        drawPath(c, STAR_PATH, x, y, starBox, 18, ink);
        c.restore();
      }
    }
    if (stars > 0) y += starBox + 1.6 * u;
    tags.forEach((tag, i) => drawPath(c, SYMBOLS[tag], margin + i * (markBox + markGap), y, markBox, 256, ink));
    if (tags.length) y += markBox + 1.6 * u;
    if (artistLine) drawArtist(c, artistLine, margin, y, { size: 2.4 * u, tracking: 0.18, wide: besideWide, least: W * 0.015, colour: ink, mono, align: 'left' });
    c.drawImage(cover, ax, margin - drop);
  }

  let t = still ? 30 : 0;
  return {
    step(dt) { t += dt; },
    paint(c) { paintAt(c, t); },
  };
};
