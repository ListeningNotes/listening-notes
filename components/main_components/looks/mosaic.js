// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/mosaic.js
// Mosaic: everything becomes a tile, on one grid six across that fills the paper.
// The cover is fractured into it and its pieces slide toward their places, and
// about a third never arrive. It must not finish solving: a mosaic that completes
// is only a slow reveal of a photograph. The stars, marks and title are tiles
// laid into the same grid; the grid is the only furniture.
//
// A heart does not survive at tile scale, so the horizon has none here. A hairline
// keeps the grid visible on a sparse cover, where the pieces all look alike.
'use client';

import {
  ARRIVES, TONES, STAR_PATH, SYMBOLS, MARK_ASPECT,
  drawPath, drawArtist, popped, easeOut, clamp01, sheet, fitTitle,
} from '../SharePrinter';

const INK = '#15151a';
const COLUMNS = 6;
const LOST = 0.34;
const WANDER_SECONDS = 5;

export function mosaicScene(record, frame, { art, families, still = false }) {
  const { stars, artistLine, tags, bars, entry } = record;
  const { sans, mono } = families;
  const W = frame.w, H = frame.h;
  const u = Math.min(W, (H * 9) / 16) / 100;
  const tile = W / COLUMNS, half = tile / 2;
  const rows = Math.ceil(H / tile);

  // ── The pieces ────────────────────────────────────────────────────────
  // The same record breaks the same way every time, on the preview and in the video.
  let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const cell = () => Math.floor(rnd() * COLUMNS);
  const pieces = [];
  for (let i = 0; i < COLUMNS * rows; i++) {
    const col = i % COLUMNS, row = Math.floor(i / COLUMNS);
    const lost = rnd() < LOST;
    pieces.push({
      col, row, lost,
      from: [cell(), cell()],
      to: lost ? [cell(), cell()] : [col, row % COLUMNS],
      next: [cell(), cell()],
      delay: rnd() * 2.6,
      offset: rnd() * WANDER_SECONDS,
    });
  }
  const glide = v => easeOut(clamp01(v));
  function cropOf(piece, t) {
    const v = glide((t - piece.delay) / 2.8);
    let x = piece.from[0] + (piece.to[0] - piece.from[0]) * v;
    let y = piece.from[1] + (piece.to[1] - piece.from[1]) * v;
    // A lost piece keeps looking for its place, and keeps not finding it.
    if (piece.lost && !still) {
      const w = (Math.sin(((t + piece.offset) * Math.PI * 2) / (WANDER_SECONDS * 2)) + 1) / 2;
      x += (piece.next[0] - piece.to[0]) * w * clamp01(t / 6);
      y += (piece.next[1] - piece.to[1]) * w * clamp01(t / 6);
    }
    return [x, y];
  }

  const flat = sheet(W, W, c => {
    const img = art?.cover;
    if (img?.naturalWidth) c.drawImage(img, 0, 0, W, W);
    else { c.fillStyle = '#777'; c.fillRect(0, 0, W, W); }
  });

  // ── The stack, up from the foot, whole half-tiles so it sits in the grid ──
  const stripH = bars.length ? half : 0;
  const titlePadX = 3 * u + half * 0.2;
  const artistH = artistLine ? Math.max(4.6 * u, W * 0.034) : 0;
  const titleFont = k => `900 ${10.4 * k * u}px ${sans}`;
  const heightAt = (k, lines) => (lines * 10.8 + 2) * k * u + artistH;
  const { k, lines: titleLines } = fitTitle({
    album: entry?.album, fontAt: titleFont, wide: W - titlePadX * 2, room: H * 0.34, heightAt,
  });
  const titleH = Math.ceil((heightAt(k, titleLines.length) + 2 * u) / half) * half;
  const titleTop = H - stripH - titleH;
  const marksY = titleTop - half;

  const over = sheet(W, H, c => {
    const shade = c.createLinearGradient(0, 0, 0, H);
    shade.addColorStop(0, 'rgba(0,0,0,0.28)');
    shade.addColorStop(0.14, 'rgba(0,0,0,0)');
    shade.addColorStop(0.46, 'rgba(0,0,0,0)');
    shade.addColorStop(0.82, 'rgba(0,0,0,0.84)');
    c.fillStyle = shade;
    c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(0,0,0,0.1)';
    for (let i = 1; i < COLUMNS; i++) c.fillRect(i * tile, 0, 1, H);
    for (let i = 1; i <= rows; i++) c.fillRect(0, i * tile, W, 1);
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
    pieces.forEach(piece => {
      const [x, y] = cropOf(piece, t);
      c.drawImage(flat, x * tile, y * tile, tile, tile, piece.col * tile, piece.row * tile, tile + 0.5, tile + 0.5);
    });
    c.drawImage(over, 0, 0);

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

    // The strip: a tile for each track, no gaps, as bright as it was rated.
    if (bars.length) {
      const slot = W / bars.length;
      c.fillStyle = INK;
      c.fillRect(0, H - stripH, W, stripH);
      bars.forEach((v, i) => {
        const on = easeOut(clamp01((t - ARRIVES.floor - i * 0.04) / 0.5));
        if (on <= 0) return;
        c.fillStyle = `rgba(255,255,255,${0.1 + 0.68 * v})`;
        c.fillRect(i * slot, H - stripH * on, slot + 0.5, stripH * on);
      });
    }
  }

  let t = still ? 30 : 0;
  return {
    step(dt) { t += dt; },
    paint(c) { paintAt(c, t); },
  };
}
