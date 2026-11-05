// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/mosaic.js
// Mosaic: everything becomes a tile. The cover is fractured on a grid six across
// and its pieces slide home until it is the real image (Miyel, 2026-11-04: a mosaic
// that never makes it only looked broken). The stars, marks and title are tiles laid
// in under it, and the horizon is a block of tiles filling whatever paper is left:
// a column for each track, as many lit as it was rated, the top one red on a
// favourite. On a paper with no room for that it is a strip, as bright as it was
// rated, with no favourites: a heart does not survive at that scale.
'use client';

import {
  ARRIVES, TONES, STAR_PATH, SYMBOLS, MARK_ASPECT,
  drawPath, drawArtist, popped, easeOut, clamp01, sheet, fitTitle,
} from '../SharePrinter';

const INK = '#15151a';
const COLUMNS = 6;
const TRAVEL = 3;
const TILES_HIGH = 5;

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
  const left = H - W - half - titleH;
  const block = bars.length && left >= half * 2.5;
  const floorH = !bars.length ? 0 : block ? left : half;
  const titleTop = H - floorH - titleH;
  const marksY = titleTop - half;

  const plate = sheet(W, H, c => {
    // The mark on a tile of its own, at the grid's corner.
    const markH = 3.8 * u, markW = markH * MARK_ASPECT;
    const plateW = markW + 4 * u, plateH = markH + 2.6 * u;
    c.fillStyle = INK;
    c.fillRect(0, 0, plateW, plateH);
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
      c.fillRect(0, H - floorH, W, floorH);
      bars.forEach((v, i) => {
        const on = easeOut(clamp01((t - ARRIVES.floor - i * 0.04) / 0.5));
        if (on <= 0) return;
        if (!block) {
          // The strip: a tile for each track, as bright as it was rated.
          c.fillStyle = `rgba(255,255,255,${0.1 + 0.68 * v})`;
          c.fillRect(i * slot, H - floorH * on, slot + 0.5, floorH * on);
          return;
        }
        const cellH = floorH / TILES_HIGH, grout = Math.max(1, u * 0.2);
        const litCount = Math.round(v * TILES_HIGH);
        for (let n = 0; n < TILES_HIGH * on; n++) {
          const isLit = n < litCount;
          c.fillStyle = !isLit ? 'rgba(255,255,255,0.08)'
            : favs[i] && n === litCount - 1 ? TONES.fav
            : 'rgba(255,255,255,0.92)';
          c.fillRect(i * slot + grout / 2, H - (n + 1) * cellH + grout / 2, slot - grout, cellH - grout);
        }
      });
    }
  }

  let t = still ? 30 : 0;
  return {
    step(dt) { t += dt; },
    paint(c) { paintAt(c, t); },
  };
}
