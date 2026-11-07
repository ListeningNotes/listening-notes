// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/day.js
// Day and Night, the default: the card as it reads on the entry page, exported,
// in day mode or night mode (Miyel, 2026-11-04). The page's own colour, the cover,
// the title, the artist, the stars and a row of the three marks, large with a small word
// under each, those not given as ghosts like unlit stars (2026-11-06), under a large mark
// at the head, with no horizon (trying, 2026-11-06). It is the plain one on purpose. Animated, the card
// settles quickly and smoothly, since most people tap through stories: the cover glides
// up into place, the lines come down from under it, the bars rise; Still is that last moment as a picture. Not the
// posted date: a line nobody needed on a print (2026-09-12).
//
// The numbers are the post's own pixels, on a 340-wide column.
'use client';

import {
  INKS, STAR_PATH, SYMBOLS, MARK_ASPECT,
  drawTracked, drawPath, roundRect, wrapLines, clamp01, sheet,
} from '../SharePrinter';

const COL = 340, ART = 265, ART_RADIUS = 16;
const MARK_H = 72, MARK_TOP = 0.05;
const TITLE = 26, TITLE_LEAD = 26 * 1.22;
const ARTIST = 11, ARTIST_LEAD = 11 * 1.4;
const STAR = 30, STAR_GAP = 4;
const SYMBOL = 36, SYMBOL_WORD = 8.5, SYMBOL_ACROSS = 92;
const GAP = 12;
const PAD = 0.07;
const GOLD = '#E8B84B';
const MARKS = [
  { tag: 'fav', word: 'Favorite', ink: '#f0484f' },
  { tag: 'mp', word: 'Masterpiece', ink: '#4a9bf0' },
  { tag: 'formative', word: 'Formative', ink: '#3fa96b' },
];
const GLIDES_IN = 0.7;
const ROLLS_AT = 0.25, ROLLS_IN = 0.75;
const smooth = v => v * v * (3 - 2 * v);
const easeOut = v => 1 - (1 - v) ** 3;

export function paperScene(night) {
  return (record, frame, { art, families, still = false }) => {
    const { stars, artistLine, tags, entry } = record;
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
        + (GAP + SYMBOL + 4 + SYMBOL_WORD * 1.3) * U;
      return { titleLines, artistLines, h };
    };
    const roomW = W * (1 - PAD * 2), roomH = H * (1 - PAD * 2);
    let U = roomW / COL;
    let laid = lay(U);
    if (laid.h > roomH) { U *= roomH / laid.h; laid = lay(U); }
    const px = n => n * U;
    const colW = px(COL), left = (W - colW) / 2;

    // The cover with its lift and hairline, once; a shadow is dear on every frame.
    const size = px(ART), radius = px(ART_RADIUS), margin = px(60);
    const card = sheet(size + margin * 2, size + margin * 2, c => {
      c.save();
      c.shadowColor = ink.lift[1];
      c.shadowBlur = px(48);
      c.shadowOffsetY = px(16);
      c.fillStyle = ink.warm;
      roundRect(c, margin, margin, size, size, radius);
      c.fill();
      c.shadowColor = ink.lift[0];
      c.shadowBlur = px(20);
      c.shadowOffsetY = px(4);
      c.fill();
      c.restore();
      if (art?.cover?.naturalWidth) {
        c.save();
        roundRect(c, margin, margin, size, size, radius);
        c.clip();
        c.drawImage(art.cover, margin, margin, size, size);
        c.restore();
      }
      c.strokeStyle = ink.edge;
      c.lineWidth = Math.max(1, px(0.8));
      roundRect(c, margin, margin, size, size, radius);
      c.stroke();
    });

    function paintAt(c, t) {
      c.fillStyle = ink.paper;
      c.fillRect(0, 0, W, H);
      const cx = W / 2;

      // The mark high up, large; the rest centred in what is left.
      const markY = H * MARK_TOP, markEnd = markY + px(MARK_H);
      if (art?.mark) {
        const mw = px(MARK_H) * MARK_ASPECT;
        c.drawImage(art.mark, cx - mw / 2, markY, mw, px(MARK_H));
      }
      const stack = laid.h - px(MARK_H + GAP);
      let y = markEnd + Math.max(px(GAP), (H - markEnd - H * PAD - stack) / 2);

      // The cover glides up into place, growing the last little way.
      const glide = easeOut(clamp01(t / GLIDES_IN));
      const drawn = card.width * (0.94 + 0.06 * glide);
      c.drawImage(card, cx - drawn / 2, y + size / 2 + (1 - glide) * size * 0.1 - drawn / 2, drawn, drawn);
      y += size + px(GAP);

      // Everything under the cover unrolls downward, together.
      const unroll = smooth(clamp01((t - ROLLS_AT) / ROLLS_IN));
      if (unroll <= 0) return;
      c.save();
      c.beginPath();
      c.rect(0, y - px(GAP), W, (H - y + px(GAP)) * unroll);
      c.clip();
      c.textBaseline = 'top';
      const titleY = y;
      {
        c.textAlign = 'center';
        c.font = `700 ${px(TITLE)}px ${sans}`;
        c.fillStyle = ink.ink;
        laid.titleLines.forEach((line, i) => c.fillText(line, cx, titleY + i * px(TITLE_LEAD)));
        c.textAlign = 'left';
      }
      y += laid.titleLines.length * px(TITLE_LEAD);

      if (laid.artistLines.length) {
        y += px(GAP * 0.7);
        const artistY = y;
        {
          c.font = `400 ${px(ARTIST)}px ${mono}`;
          c.fillStyle = ink.soft;
          laid.artistLines.forEach((line, i) => drawTracked(c, line, cx, artistY + i * px(ARTIST_LEAD), px(ARTIST) * 0.14, 'center'));
        }
        y += laid.artistLines.length * px(ARTIST_LEAD);
      }

      if (stars > 0) {
        y += px(GAP);
        const box = px(STAR), step = px(STAR + STAR_GAP);
        const from = cx - (5 * box + 4 * px(STAR_GAP)) / 2;
        const starY = y;
        for (let i = 0; i < 5; i++) {
          const sx = from + i * step;
          {
            drawPath(c, STAR_PATH, sx, starY, box, 18, ink.unlit);
            const part = clamp01(stars - i);
            if (part > 0) {
              c.save();
              c.beginPath();
              c.rect(sx, starY, box * part, box);
              c.clip();
              drawPath(c, STAR_PATH, sx, starY, box, 18, GOLD);
              c.restore();
            }
          }
        }
        y += box;
      }

      // The three marks in a row: those given in their colours, the rest as ghosts.
      y += px(GAP);
      MARKS.forEach(({ tag, word, ink: lit }, i) => {
        const on = tags.includes(tag);
        const at = cx + (i - 1) * px(SYMBOL_ACROSS);
        drawPath(c, SYMBOLS[tag], at - px(SYMBOL) / 2, y, px(SYMBOL), 256, on ? lit : ink.rule);
        c.font = `400 ${px(SYMBOL_WORD)}px ${mono}`;
        c.fillStyle = on ? lit : ink.faint;
        drawTracked(c, word.toUpperCase(), at, y + px(SYMBOL + 4), px(SYMBOL_WORD) * 0.1, 'center');
      });
      c.restore();
    }

    let t = still ? 30 : 0;
    return {
      step(dt) { t += dt; },
      paint(c) { paintAt(c, t); },
    };
  };
}
