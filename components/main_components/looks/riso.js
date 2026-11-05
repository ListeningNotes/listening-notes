// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/riso.js
// Riso: a two-ink poster. The cover is separated into a red plate and a blue
// plate, each a real halftone with its dots at its own angle, and they land from
// opposite corners a little out of register. Everything else is the same two inks
// overprinted on the same sheet, nothing on top of anything like a sticker: the
// title runs over the bars and the two inks make a third where they cross.
//
// The separation is by the pixel. A cover that will not be read throws here, and
// the print falls back to Day.
'use client';

import {
  ARRIVES, STAR_PATH, HEART_PATH, SYMBOLS, MARK_ASPECT,
  drawArtist, drawPath, easeOut, clamp01, sheet, fitTitle,
} from '../SharePrinter';

const SHEET = '#f4f0e5';
const RED = '#e8513f';
const BLUE = '#2f55c0';
const LANDS_IN = 2.4;

// One plate of dots: `density` says how much ink a pixel wants, and each dot on a
// grid turned to `angle` is as large as the ink under it.
function halftone(px, side, size, ink, angle, cell, density) {
  return sheet(size, size, c => {
    c.fillStyle = ink;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const reach = Math.ceil((size * 1.5) / cell);
    for (let a = -reach; a <= reach; a++) {
      for (let b = -reach; b <= reach; b++) {
        const x = size / 2 + (a * cos - b * sin) * cell;
        const y = size / 2 + (a * sin + b * cos) * cell;
        if (x < -cell || y < -cell || x > size + cell || y > size + cell) continue;
        const sx = Math.min(side - 1, Math.max(0, Math.round((x / size) * (side - 1))));
        const sy = Math.min(side - 1, Math.max(0, Math.round((y / size) * (side - 1))));
        const i = (sy * side + sx) * 4;
        const amount = density(px[i] / 255, px[i + 1] / 255, px[i + 2] / 255);
        if (amount < 0.04) continue;
        c.beginPath();
        c.arc(x, y, cell * 0.74 * Math.sqrt(amount), 0, Math.PI * 2);
        c.fill();
      }
    }
  });
}

function overprint(c, paint) {
  c.save();
  c.globalCompositeOperation = 'multiply';
  paint();
  c.restore();
}

export function risoScene(record, frame, { art, families, still = false }) {
  const { stars, artistLine, tags, bars, favs, entry } = record;
  const { sans, mono } = families;
  const W = frame.w, H = frame.h;
  const u = Math.min(W, (H * 9) / 16) / 100;

  // The cover takes the head of the sheet, off the edges where it can.
  const size = Math.min(W, H * 0.6);
  const ax = (W - size) / 2;
  const floorH = bars.length ? H * 0.2 : 0;
  const margin = 5 * u;
  const roomTop = size + 3 * u;
  const overlap = bars.length ? floorH * 0.28 : 0;
  const room = H - floorH + overlap - margin * (bars.length ? 0 : 1) - roomTop;
  const heightAt = (k, lines) => ((stars > 0 || tags.length ? 10.5 : 0) + (artistLine ? 5.4 : 0) + lines * 13) * k * u;
  const titleFont = k => `900 ${14 * k * u}px ${sans}`;
  const { k, lines: titleLines } = fitTitle({ album: entry?.album, fontAt: titleFont, wide: W - margin * 2, room, heightAt });
  const rowsTop = H - floorH + overlap - margin * (bars.length ? 0 : 1) - heightAt(k, titleLines.length);

  // ── The plates ────────────────────────────────────────────────────────
  const side = 180;
  const small = sheet(side, side, c => {
    if (art?.cover?.naturalWidth) c.drawImage(art.cover, 0, 0, side, side);
    else { c.fillStyle = '#999'; c.fillRect(0, 0, side, side); }
  });
  const px = small.getContext('2d').getImageData(0, 0, side, side).data;
  const cell = Math.max(5, 1 * u);
  // Red prints what lacks green, blue what lacks red, so a red shirt is red ink, a
  // blue sky is blue with a little red in it, and black is both.
  const plateRed = halftone(px, side, size, RED, (15 * Math.PI) / 180, cell, (r, g, b) => clamp01(1 - (g * 0.8 + b * 0.2)));
  const plateBlue = halftone(px, side, size, BLUE, (75 * Math.PI) / 180, cell, r => clamp01(1 - r));
  const off = [1.1 * u, 0.9 * u];

  // ── The sheet ─────────────────────────────────────────────────────────
  const under = sheet(W, H, c => {
    c.fillStyle = SHEET;
    c.fillRect(0, 0, W, H);
  });
  // The mark, knocked out of the plates at the corner, in the one ink.
  const markH = 3.8 * u, markW = markH * MARK_ASPECT;
  const tab = sheet(markW + 3.6 * u, markH + 2.4 * u, c => {
    c.fillStyle = SHEET;
    c.fillRect(0, 0, c.canvas.width, c.canvas.height);
    if (art?.mark) c.drawImage(art.mark, 1.8 * u, 1.2 * u, markW, markH);
  });

  const starBox = 7.6 * k * u, starGap = 1.1 * k * u;
  const markBox = 7.6 * k * u, markGap = 1.8 * k * u;
  const lead = 13 * k * u;
  const slot = bars.length ? W / bars.length : 0;
  const barGap = Math.min(0.9 * u, slot * 0.14);

  function paintAt(c, t) {
    c.drawImage(under, 0, 0);

    // The bars first: the title goes over them.
    bars.forEach((v, i) => {
      const on = easeOut(clamp01((t - ARRIVES.floor - i * 0.03) / 0.8));
      if (on <= 0) return;
      const h = Math.max(floorH * 0.05, floorH * v) * on;
      overprint(c, () => {
        c.fillStyle = RED;
        c.fillRect(i * slot + barGap / 2, H - h, slot - barGap, h);
      });
    });

    const away = 1 - easeOut(Math.min(1, t / LANDS_IN));
    overprint(c, () => {
      c.drawImage(plateRed, ax - away * W, -away * H * 0.4);
      c.drawImage(plateBlue, ax + off[0] + away * W, off[1] + away * H * 0.4);
    });
    if (away < 0.02) c.drawImage(tab, 0, 0);

    let y = rowsTop;
    if (stars > 0 || tags.length) {
      const rowY = y;
      overprint(c, () => {
        for (let i = 0; i < 5 && stars > 0; i++) {
          const x = margin + i * (starBox + starGap);
          if (t < ARRIVES.stars + i * 0.15) continue;
          drawPath(c, STAR_PATH, x, rowY, starBox, 18, 'rgba(47,85,192,0.2)');
          const part = clamp01(stars - i);
          if (part > 0) {
            c.save();
            c.beginPath();
            c.rect(x, rowY, starBox * part, starBox);
            c.clip();
            drawPath(c, STAR_PATH, x, rowY, starBox, 18, BLUE);
            c.restore();
          }
        }
        tags.forEach((tag, i) => {
          if (t < ARRIVES.tags + i * 0.2) return;
          const x = W - margin - (tags.length - i) * markBox - (tags.length - i - 1) * markGap;
          drawPath(c, SYMBOLS[tag], x, rowY, markBox, 256, RED);
        });
      });
      y += 10.5 * k * u;
    }
    if (artistLine) {
      const artistY = y;
      if (t >= ARRIVES.artist) {
        overprint(c, () => drawArtist(c, artistLine, margin, artistY, { size: 2.9 * k * u, tracking: 0.24, wide: W - margin * 2, least: W * 0.02, colour: BLUE, mono, align: 'left' }));
      }
      y += 5.4 * k * u;
    }
    if (t >= ARRIVES.title) {
      const titleY = y;
      overprint(c, () => {
        c.font = titleFont(k);
        c.textBaseline = 'top';
        c.textAlign = 'left';
        c.fillStyle = BLUE;
        titleLines.forEach((line, i) => c.fillText(line, margin, titleY + i * lead));
      });
    }

    // A favourite: a heart in blue on the top of its bar.
    bars.forEach((v, i) => {
      if (!favs[i] || t < ARRIVES.hearts + i * 0.03) return;
      const box = Math.min(3.4 * u, slot * 0.7);
      const h = Math.max(floorH * 0.05, floorH * v);
      overprint(c, () => drawPath(c, HEART_PATH, i * slot + (slot - box) / 2, H - h + 0.6 * u, box, 24, BLUE));
    });
  }

  let t = still ? 30 : 0;
  return {
    step(dt) { t += dt; },
    paint(c) { paintAt(c, t); },
  };
}
