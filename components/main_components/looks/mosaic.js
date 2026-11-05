// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/mosaic.js
// Mosaic: everything becomes a tile, on one grid six across that fills the whole
// page. The cover, cut to fill it, is fractured on that grid and its pieces slide
// home until it is the real image (Miyel, 2026-11-04: a mosaic that never makes it
// only looked broken). Laid into the same grid at the foot: the horizon, a strip of
// tiles as bright as each track was rated, red on a favourite; the stars and marks;
// the title on a white tile. The grid is the only furniture.
'use client';

import {
  ARRIVES, TONES, STAR_PATH, SYMBOLS, MARK_ASPECT,
  drawPath, drawArtist, popped, easeOut, clamp01, sheet, fitTitle,
} from '../SharePrinter';

const INK = '#15151a';
const COLUMNS = 6;
const TRAVEL = 3;

export function mosaicScene(record, frame, { art, families, still = false }) {
  const { stars, artistLine, tags, bars, favs, entry } = record;
  const { sans, mono } = families;
  const W = frame.w, H = frame.h;
  const u = Math.min(W, (H * 9) / 16) / 100;
  const tile = W / COLUMNS, half = tile / 2;

  // ── The pieces ────────────────────────────────────────────────────────
  // The same record breaks the same way every time, on the preview and in the video.
  let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const cell = () => Math.floor(rnd() * COLUMNS);
  const pieces = [];
  const rows = Math.ceil(H / tile);
  for (let i = 0; i < COLUMNS * rows; i++) {
    pieces.push({ col: i % COLUMNS, row: Math.floor(i / COLUMNS), from: [cell(), Math.floor(rnd() * rows)], delay: rnd() * 3.6 });
  }
  const SETTLED = 3.6 + TRAVEL;

  const flat = sheet(W, H, c => {
    const img = art?.cover;
    if (img?.naturalWidth) {
      const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      c.drawImage(img, (W - img.naturalWidth * s) / 2, (H - img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
    } else { c.fillStyle = '#777'; c.fillRect(0, 0, W, H); }
  });

  // ── The stack, under the cover, in whole half-tiles so it sits in the grid ──
  const titlePadX = 3 * u + half * 0.2;
  const artistH = artistLine ? Math.max(4.6 * u, W * 0.034) : 0;
  const titleFont = k => `900 ${10.4 * k * u}px ${sans}`;
  const heightAt = (k, lines) => (lines * 10.8 + 2) * k * u + artistH;
  const { k, lines: titleLines } = fitTitle({
    album: entry?.album, fontAt: titleFont, wide: W - titlePadX * 2, room: H * 0.34, heightAt,
  });
  const titleH = Math.ceil((heightAt(k, titleLines.length) + 2 * u) / half) * half;
  const titleTop = H - titleH;
  const marksY = titleTop - half;
  const stripH = bars.length ? half : 0;
  const stripY = marksY - stripH;

  const plate = sheet(W, tile, c => {
    // The mark on a tile of its own, at the grid's corner.
    const markH = 3.8 * u, markW = markH * MARK_ASPECT;
    c.fillStyle = INK;
    c.fillRect(0, 0, markW + 4 * u, markH + 2.6 * u);
    if (art?.mark) c.drawImage(art.mark, 2 * u, 1.3 * u, markW, markH);
  });

  function drawStar(c, i, part) {
    const x = i * half, glyph = half * 0.66;
    c.fillStyle = part > 0 ? 'rgba(255,255,255,0.93)' : 'rgba(255,255,255,0.28)';
    c.fillRect(x, marksY, half, half);
    const gx = x + (half - glyph) / 2, gy = marksY + (half - glyph) / 2;
    drawPath(c, STAR_PATH, gx, gy, glyph, 18, part > 0 ? 'rgba(0,0,0,0.16)' : 'rgba(0,0,0,0.4)');
    if (part > 0) {
      c.save();
      c.beginPath();
      c.rect(gx, gy, glyph * part, glyph);
      c.clip();
      drawPath(c, STAR_PATH, gx, gy, glyph, 18, INK);
      c.restore();
    }
  }

  function paintAt(c, t) {
    c.fillStyle = INK;
    c.fillRect(0, 0, W, H);
    if (t >= SETTLED) c.drawImage(flat, 0, 0);
    else {
      pieces.forEach(piece => {
        const v = easeOut(clamp01((t - piece.delay) / TRAVEL));
        const x = piece.from[0] + (piece.col - piece.from[0]) * v;
        const y = piece.from[1] + (piece.row - piece.from[1]) * v;
        c.drawImage(flat, x * tile, y * tile, tile, tile, piece.col * tile, piece.row * tile, tile + 0.5, tile + 0.5);
      });
    }
    c.drawImage(plate, 0, 0);

    if (stars > 0) {
      for (let i = 0; i < 5; i++) {
        popped(c, ARRIVES.stars + i * 0.2, i * half + half / 2, marksY + half / 2, () => drawStar(c, i, clamp01(stars - i)), t);
      }
    }
    tags.forEach((tag, i) => {
      const x = W - (tags.length - i) * half;
      popped(c, ARRIVES.tags + i * 0.15, x + half / 2, marksY + half / 2, () => {
        c.fillStyle = TONES[tag];
        c.fillRect(x, marksY, half, half);
        const glyph = half * 0.62;
        drawPath(c, SYMBOLS[tag], x + (half - glyph) / 2, marksY + (half - glyph) / 2, glyph, 256, '#fff');
      }, t);
    });

    popped(c, ARRIVES.title, W / 2, titleTop + titleH / 2, () => {
      c.fillStyle = '#fff';
      c.fillRect(0, titleTop, W, titleH);
      c.fillStyle = INK;
      c.font = titleFont(k);
      c.textBaseline = 'top';
      c.textAlign = 'left';
      const block = heightAt(k, titleLines.length);
      let y = titleTop + (titleH - block) / 2;
      titleLines.forEach(line => { c.fillText(line, titlePadX, y); y += 10.8 * k * u; });
      if (artistLine) {
        drawArtist(c, artistLine, titlePadX, y + 2 * k * u, { size: 2.9 * u, tracking: 0.22, wide: W - titlePadX * 2, least: W * 0.02, colour: INK, mono, align: 'left' });
      }
    }, t);

    if (bars.length) {
      const slot = W / bars.length;
      c.fillStyle = INK;
      c.fillRect(0, stripY, W, stripH);
      bars.forEach((v, i) => {
        const on = easeOut(clamp01((t - ARRIVES.floor - i * 0.04) / 0.5));
        if (on <= 0) return;
        const bright = 0.1 + 0.8 * v;
        c.fillStyle = favs[i] ? `rgba(240,72,79,${Math.max(0.45, bright)})` : `rgba(255,255,255,${bright})`;
        c.fillRect(i * slot + 1, stripY + (stripH * (1 - on)) / 2, slot - 2, stripH * on);
      });
    }
  }

  let t = still ? 30 : 0;
  return {
    step(dt) { t += dt; },
    paint(c) { paintAt(c, t); },
  };
}
