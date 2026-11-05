// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/mosaic.js
// Mosaic: everything becomes a tile. The cover is fractured on a grid six across
// and its pieces slide home until it is the real image (Miyel, 2026-11-04: a mosaic
// that never makes it only looked broken). Under it, laid in like the rest, the
// horizon is a strip of tiles as bright as each track was rated, red on a favourite,
// not rising from the foot of the page; then the stars and marks, then the title on
// a white tile at the foot. Paper left over at the head is a masthead for the mark.
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
  for (let i = 0; i < COLUMNS * COLUMNS; i++) {
    pieces.push({ col: i % COLUMNS, row: Math.floor(i / COLUMNS), from: [cell(), cell()], delay: rnd() * 3.6 });
  }
  const SETTLED = 3.6 + TRAVEL;

  const flat = sheet(W, W, c => {
    const img = art?.cover;
    if (img?.naturalWidth) c.drawImage(img, 0, 0, W, W);
    else { c.fillStyle = '#777'; c.fillRect(0, 0, W, W); }
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
  const stripH = !bars.length ? 0 : marksY >= W + tile ? tile : half;
  const stripY = marksY - stripH;
  const coverY = Math.max(0, stripY - W);
  const masthead = coverY >= tile;

  const plate = sheet(W, Math.max(coverY, tile), c => {
    if (masthead) {
      // The mark, large, in the room above the cover.
      const markH = Math.min(coverY * 0.34, 12 * u), markW = markH * MARK_ASPECT;
      if (art?.mark) c.drawImage(art.mark, (W - markW) / 2, (coverY - markH) / 2, markW, markH);
      return;
    }
    // No room for that: the mark on a tile of its own, at the grid's corner.
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
    if (t >= SETTLED) c.drawImage(flat, 0, coverY);
    else {
      pieces.forEach(piece => {
        const v = easeOut(clamp01((t - piece.delay) / TRAVEL));
        const x = piece.from[0] + (piece.col - piece.from[0]) * v;
        const y = piece.from[1] + (piece.row - piece.from[1]) * v;
        c.drawImage(flat, x * tile, y * tile, tile, tile, piece.col * tile, coverY + piece.row * tile, tile + 0.5, tile + 0.5);
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
