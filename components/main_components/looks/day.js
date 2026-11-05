// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/day.js
// Day and Night, the default: the card as it reads on the entry page, exported,
// in day mode or night mode (Miyel, 2026-11-04). The page's own colour, the cover,
// the title, the artist, the stars, the marks as the post's chips, and the horizon
// from further down the page. Nothing moves, so it saves as a picture, and it is
// the plain one on purpose: nobody chooses it, it is what you get by never opening
// the row. Not the posted date: a line nobody needed on a print (2026-09-12).
//
// The numbers are the post's own pixels, on a 340-wide column.
'use client';

import {
  INKS, STAR_PATH, HEART_PATH, MARK_ASPECT,
  drawTracked, drawPath, roundRect, wrapLines,
} from '../SharePrinter';

const COL = 340, ART = 265, ART_RADIUS = 16;
const MARK_H = 44;
const TITLE = 26, TITLE_LEAD = 26 * 1.22;
const ARTIST = 11, ARTIST_LEAD = 11 * 1.4;
const STAR = 30, STAR_GAP = 4;
const CHIP = 13, CHIP_PAD_X = 10, CHIP_PAD_Y = 4, CHIP_GAP = 8, CHIP_RADIUS = 5;
const HORIZON_H = 52, HORIZON_HEAD = 13, HEART = 10, HEART_LIFT = 4, BAR_RADIUS = 3;
const GAP = 12;
const PAD = 0.07;
const GOLD = '#E8B84B';
const FAV = '#f0484f';
const CHIPS = {
  fav: { word: 'Favorite', ink: '#f0484f', edge: 'rgba(240,72,79,0.4)' },
  mp: { word: 'Masterpiece', ink: '#4a9bf0', edge: 'rgba(74,155,240,0.4)' },
  formative: { word: 'Formative', ink: '#3fa96b', edge: 'rgba(63,169,107,0.4)' },
};
const gapOf = n => (n > 24 ? 2 : n > 14 ? 3 : 4);

export function paperScene(night) {
  return (record, frame, { art, families }) => {
    const { stars, artistLine, tags, bars, favs, entry } = record;
    const { sans, mono } = families;
    const ink = night ? INKS.night : INKS.day;
    const W = frame.w, H = frame.h;
    const measure = document.createElement('canvas').getContext('2d');

    // Width sets the unit; if the stack overruns the paper, the unit comes down
    // by the overrun, and everything with it.
    const lay = U => {
      measure.font = `700 ${TITLE * U}px ${sans}`;
      const titleLines = wrapLines(measure, entry?.album || '', COL * U, 3);
      measure.font = `400 ${ARTIST * U}px ${mono}`;
      const artistLines = wrapLines(measure, artistLine, COL * U * 0.86, 2);
      const h = (MARK_H + GAP + ART + GAP) * U + titleLines.length * TITLE_LEAD * U
        + (artistLines.length ? GAP * 0.7 * U + artistLines.length * ARTIST_LEAD * U : 0)
        + (stars > 0 ? (GAP + STAR) * U : 0)
        + (tags.length ? (GAP + CHIP * 1.2 + CHIP_PAD_Y * 2) * U : 0)
        + (bars.length ? (GAP + HORIZON_HEAD + HORIZON_H) * U : 0);
      return { titleLines, artistLines, h };
    };
    const roomW = W * (1 - PAD * 2), roomH = H * (1 - PAD * 2);
    let U = roomW / COL;
    let laid = lay(U);
    if (laid.h > roomH) { U *= roomH / laid.h; laid = lay(U); }
    const px = n => n * U;
    const colW = px(COL), left = (W - colW) / 2;

    function paint(c) {
      c.fillStyle = ink.paper;
      c.fillRect(0, 0, W, H);
      let y = (H - laid.h) / 2;
      const cx = W / 2;

      if (art?.mark) {
        const mw = px(MARK_H) * MARK_ASPECT;
        c.drawImage(art.mark, cx - mw / 2, y, mw, px(MARK_H));
      }
      y += px(MARK_H + GAP);

      // The cover: the square's radius, its lift, a hairline.
      const size = px(ART), ax = cx - size / 2, radius = px(ART_RADIUS);
      c.save();
      c.shadowColor = ink.lift[1];
      c.shadowBlur = px(48);
      c.shadowOffsetY = px(16);
      c.fillStyle = ink.warm;
      roundRect(c, ax, y, size, size, radius);
      c.fill();
      c.shadowColor = ink.lift[0];
      c.shadowBlur = px(20);
      c.shadowOffsetY = px(4);
      c.fill();
      c.restore();
      if (art?.cover?.naturalWidth) {
        c.save();
        roundRect(c, ax, y, size, size, radius);
        c.clip();
        c.drawImage(art.cover, ax, y, size, size);
        c.restore();
      }
      c.strokeStyle = ink.edge;
      c.lineWidth = Math.max(1, px(0.8));
      roundRect(c, ax, y, size, size, radius);
      c.stroke();
      y += size + px(GAP);

      c.textBaseline = 'top';
      c.textAlign = 'center';
      c.font = `700 ${px(TITLE)}px ${sans}`;
      c.fillStyle = ink.ink;
      laid.titleLines.forEach(line => { c.fillText(line, cx, y); y += px(TITLE_LEAD); });
      c.textAlign = 'left';

      if (laid.artistLines.length) {
        y += px(GAP * 0.7);
        c.font = `400 ${px(ARTIST)}px ${mono}`;
        c.fillStyle = ink.soft;
        laid.artistLines.forEach(line => {
          drawTracked(c, line, cx, y, px(ARTIST) * 0.14, 'center');
          y += px(ARTIST_LEAD);
        });
      }

      if (stars > 0) {
        y += px(GAP);
        const box = px(STAR), step = px(STAR + STAR_GAP);
        const from = cx - (5 * box + 4 * px(STAR_GAP)) / 2;
        for (let i = 0; i < 5; i++) {
          const sx = from + i * step;
          drawPath(c, STAR_PATH, sx, y, box, 18, ink.unlit);
          const part = Math.min(1, Math.max(0, stars - i));
          if (part > 0) {
            c.save();
            c.beginPath();
            c.rect(sx, y, box * part, box);
            c.clip();
            drawPath(c, STAR_PATH, sx, y, box, 18, GOLD);
            c.restore();
          }
        }
        y += box;
      }

      if (tags.length) {
        y += px(GAP);
        const spacing = px(CHIP) * 0.08, padX = px(CHIP_PAD_X), h = px(CHIP * 1.2 + CHIP_PAD_Y * 2), gap = px(CHIP_GAP);
        c.font = `400 ${px(CHIP)}px ${mono}`;
        const across = word => [...word].reduce((n, ch) => n + c.measureText(ch).width + spacing, -spacing);
        const widths = tags.map(tag => across(CHIPS[tag].word) + padX * 2);
        let x = cx - (widths.reduce((n, w) => n + w, 0) + gap * (tags.length - 1)) / 2;
        c.textBaseline = 'middle';
        tags.forEach((tag, i) => {
          c.strokeStyle = CHIPS[tag].edge;
          c.lineWidth = Math.max(1, px(0.8));
          roundRect(c, x, y, widths[i], h, px(CHIP_RADIUS));
          c.stroke();
          c.fillStyle = CHIPS[tag].ink;
          drawTracked(c, CHIPS[tag].word, x + padX, y + h / 2 + px(0.5), spacing);
          x += widths[i] + gap;
        });
        c.textBaseline = 'top';
        y += h;
      }

      if (bars.length) {
        y += px(GAP + HORIZON_HEAD);
        const n = bars.length, gap = px(gapOf(n)), bw = Math.max(1, (colW - gap * (n - 1)) / n);
        const h = px(HORIZON_H), r = Math.min(px(BAR_RADIUS), bw / 2);
        bars.forEach((v, i) => {
          const bh = Math.max(0.03 * h, v * h), x0 = left + i * (bw + gap);
          c.fillStyle = ink.bar;
          c.beginPath();
          c.roundRect(x0, y + h - bh, bw, bh, [r, r, 0, 0]);
          c.fill();
          if (favs[i]) {
            const hs = px(HEART);
            drawPath(c, HEART_PATH, x0 + (bw - hs) / 2, y + h - bh - hs - px(HEART_LIFT), hs, 24, FAV);
          }
        });
      }
    }

    return { step() {}, paint };
  };
}
