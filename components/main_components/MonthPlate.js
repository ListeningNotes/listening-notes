// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/MonthPlate.js
// A month, cut as a printing plate.
//
// The third thing the share printer prints (the record is EntryPlate.js, the
// journal JournalPlate.js, whose room at /printer prints this one too: the
// line of words over the paper turns between the journal and its months,
// Miyel's pick, 2026-11-02).
//
// The still look (the printer brief): the month at the head, how many records
// came into the journal that month — the number the wall's By month heading
// gives, a record counted in the month it arrived — a grid of their covers in
// the wall's order, the marks tallied in their own colours with a zero left
// off, and the keeper's face, name and the LN. mark at the foot. The moving
// look, where the grid comes off and the covers move, comes with the grounds.
//
// Nothing is ordered by how much anybody logs, and nothing written about a
// record travels; Save puts the journal's address on the clipboard.

import { drawTracked, ellipsize, roundRect, drawPath, loadMark, loadPicture, MARK_ASPECT } from './SharePrinter';
import { INKS, SYMBOLS, TONES } from './EntryPlate';
import { drawPortrait } from './JournalPlate';

// ── Measurements, in units of a 340-wide column ────────────────────────────
const COL = 340;
const MONTH = 11;                      // the head, in the label face
const COUNT = 72, COUNT_WORD = 9;
const SYMBOL = 20, TALLY = 18, TALLY_WORD = 7.5;
const FACE = 34, NAME = 15;
const MARK_H = 22;
const GRID_GAP = 0.03;                 // between covers, as a share of one

// The marks, in the order the record's print gives its chips.
const MARKS = [
  { key: 'favorites', tone: 'fav', one: 'favorite', many: 'favorites' },
  { key: 'masterpieces', tone: 'mp', one: 'masterpiece', many: 'masterpieces' },
  { key: 'formative', tone: 'formative', one: 'formative', many: 'formative' },
];

// The most covers a grid can be drawn with at the size each one can have:
// every column count is tried and the one giving the biggest sleeve wins.
function gridFor(n, w, h) {
  let best = { cols: 1, rows: n, s: 0 };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const s = Math.min(w / (cols + GRID_GAP * (cols - 1)), h / (rows + GRID_GAP * (rows - 1)));
    if (s > best.s) best = { cols, rows, s };
  }
  return best;
}

function drawGrid(c, covers, box, ink) {
  const n = covers.length;
  if (!n) return;
  const { cols, rows, s } = gridFor(n, box.w, box.h);
  const gap = s * GRID_GAP;
  const top = box.y + (box.h - (rows * s + (rows - 1) * gap)) / 2;
  covers.forEach((img, i) => {
    const row = Math.floor(i / cols);
    // The last row, short, is centred under the others.
    const inRow = row === rows - 1 ? n - row * cols : cols;
    const left = box.x + (box.w - (inRow * s + (inRow - 1) * gap)) / 2;
    const x = left + (i % cols) * (s + gap);
    const y = top + row * (s + gap);
    c.save();
    roundRect(c, x, y, s, s, s * 0.035);
    c.clip();
    c.fillStyle = ink.rule;
    c.fillRect(x, y, s, s);
    if (img?.naturalWidth) {
      const k = Math.max(s / img.naturalWidth, s / img.naturalHeight);
      c.drawImage(img, x - (img.naturalWidth * k - s) / 2, y - (img.naturalHeight * k - s) / 2, img.naturalWidth * k, img.naturalHeight * k);
    }
    c.restore();
  });
}

// ── The plate ──────────────────────────────────────────────────────────────
// month: { key, label } — label as the print heads it, "October 2026".
// records: the month's records in the wall's order, each { art, marks }.
export function monthPlate({ month, records, name, portrait, position }) {
  const tally = MARKS
    .map(m => ({ ...m, n: records.filter(r => r.marks[m.key]).length }))
    .filter(m => m.n > 0);

  return {
    title: month.label,
    fileName: `month-${month.key}`,

    async load({ isDark }) {
      const [mark, face, ...covers] = await Promise.all([
        loadMark(isDark ? INKS.night.ink : INKS.day.ink),
        loadPicture(portrait),
        ...records.map(r => loadPicture(r.art)),
      ]);
      return { mark, face, covers };
    },

    draw(ctx, frame, { art, isDark, families }) {
      const ink = isDark ? INKS.night : INKS.day;
      const { sans, mono } = families;
      const W = frame.w, H = frame.h;
      const U = Math.min(W, H) / COL;
      const px = n => n * U;
      const pad = Math.min(W, H) * 0.07;
      // Square and wider set the grid beside the words: stacked on a square
      // the grid came out a strip one cover high (2026-11-02).
      const side = W / H > 0.9;
      const covers = art?.covers || records.map(() => null);

      ctx.textBaseline = 'top';
      ctx.fillStyle = ink.paper;
      ctx.fillRect(0, 0, W, H);

      // ── the pieces, each drawn from its top edge in a column ─────────────
      const headH = px(MONTH) * 1.4;
      function drawHead(x, y, w) {
        ctx.font = `400 ${px(MONTH)}px ${mono}`;
        ctx.fillStyle = ink.soft;
        drawTracked(ctx, month.label.toUpperCase(), x + w / 2, y, px(MONTH) * 0.18, 'center');
      }
      // The number comes down in size when the covers need the room.
      let count = COUNT;
      const countHAt = n => px(n) * 1.05 + px(4) + px(COUNT_WORD) * 1.4;
      let countH = countHAt(count);
      function drawCount(x, y, w) {
        ctx.font = `700 ${px(count)}px ${sans}`;
        ctx.fillStyle = ink.ink;
        ctx.textAlign = 'center';
        ctx.fillText(records.length.toLocaleString(), x + w / 2, y);
        ctx.textAlign = 'left';
        ctx.font = `400 ${px(COUNT_WORD)}px ${mono}`;
        ctx.fillStyle = ink.soft;
        drawTracked(ctx, (records.length === 1 ? 'record' : 'records').toUpperCase(), x + w / 2, y + px(count) * 1.05 + px(4), px(COUNT_WORD) * 0.16, 'center');
      }
      const tallyH = tally.length ? px(SYMBOL) + px(6) + px(TALLY_WORD) * 1.4 : 0;
      function drawTally(x, y, w) {
        if (!tally.length) return;
        const cell = Math.min(w / tally.length, px(110));
        const left = x + (w - cell * tally.length) / 2;
        tally.forEach((m, i) => {
          const mid = left + cell * (i + 0.5);
          ctx.font = `700 ${px(TALLY)}px ${sans}`;
          const nw = ctx.measureText(String(m.n)).width;
          const pairW = px(SYMBOL) + px(6) + nw;
          const sx = mid - pairW / 2;
          drawPath(ctx, SYMBOLS[m.tone], sx, y, px(SYMBOL), 256, TONES[m.tone].ink);
          ctx.fillStyle = ink.ink;
          ctx.fillText(String(m.n), sx + px(SYMBOL) + px(6), y + (px(SYMBOL) - px(TALLY)) / 2);
          ctx.font = `400 ${px(TALLY_WORD)}px ${mono}`;
          ctx.fillStyle = ink.soft;
          drawTracked(ctx, (m.n === 1 ? m.one : m.many).toUpperCase(), mid, y + px(SYMBOL) + px(6), px(TALLY_WORD) * 0.14, 'center');
        });
      }
      // In a column too narrow for the marks side by side, one under another.
      const listRow = px(SYMBOL) * 1.5;
      const listH = tally.length * listRow;
      function drawTallyList(x, y, w) {
        let rowY = y;
        const blockW = px(SYMBOL) + px(8) + px(TALLY) * 1.4 + px(8) + px(70);
        const left = x + Math.max(0, (w - blockW) / 2);
        for (const m of tally) {
          drawPath(ctx, SYMBOLS[m.tone], left, rowY, px(SYMBOL), 256, TONES[m.tone].ink);
          ctx.font = `700 ${px(TALLY)}px ${sans}`;
          ctx.fillStyle = ink.ink;
          const nx = left + px(SYMBOL) + px(8);
          ctx.fillText(String(m.n), nx, rowY + (px(SYMBOL) - px(TALLY)) / 2);
          const nw = ctx.measureText(String(m.n)).width;
          ctx.font = `400 ${px(TALLY_WORD)}px ${mono}`;
          ctx.fillStyle = ink.soft;
          drawTracked(ctx, (m.n === 1 ? m.one : m.many).toUpperCase(), nx + nw + px(8), rowY + (px(SYMBOL) - px(TALLY_WORD)) / 2, px(TALLY_WORD) * 0.14, 'left');
          rowY += listRow;
        }
      }
      // The foot: a hairline, the face and the name to the left, the mark to
      // the right.
      const footH = px(12) + px(FACE);
      function drawFoot(x, y, w) {
        ctx.fillStyle = ink.rule;
        ctx.fillRect(x, y, w, Math.max(1, U * 0.8));
        const row = y + px(12);
        let textX = x;
        if (portrait) {
          drawPortrait(ctx, art?.face, x + px(FACE) / 2, row + px(FACE) / 2, px(FACE), 0, ink.paper, position);
          textX = x + px(FACE) + px(10);
        }
        const mh = px(MARK_H), mw = mh * MARK_ASPECT;
        if (art?.mark) ctx.drawImage(art.mark, x + w - mw, row + (px(FACE) - mh) / 2, mw, mh);
        if (name) {
          ctx.font = `700 ${px(NAME)}px ${sans}`;
          ctx.fillStyle = ink.ink;
          ctx.fillText(ellipsize(ctx, name, x + w - mw - px(14) - textX), textX, row + (px(FACE) - px(NAME)) / 2);
        }
      }

      if (side) {
        // The grid on the left half, the words in a column on the right. On
        // a square the foot runs under both, or the name had no room.
        const square = W / H < 1.3;
        const bottom = square ? H - pad - footH - px(20) : H - pad;
        const split = W * 0.5;
        drawGrid(ctx, covers, { x: pad, y: pad, w: split - pad * 1.5, h: bottom - pad }, ink);
        const cx = split + pad * 0.5, cw = W - pad - cx;
        const listed = cw < px(220);
        const marksH = listed ? listH : tallyH;
        const words = headH + px(14) + countH + (tally.length ? px(26) + marksH : 0);
        let at = pad + (bottom - pad - (square ? 0 : footH) - words) / 2;
        drawHead(cx, at, cw); at += headH + px(14);
        drawCount(cx, at, cw); at += countH + px(26);
        if (listed) drawTallyList(cx, at, cw); else drawTally(cx, at, cw);
        if (square) drawFoot(pad, H - pad - footH, W - pad * 2);
        else drawFoot(cx, H - pad - footH, cw);
        return [];
      }

      // Tall and square: head, count, grid, tally, foot, down the paper.
      const x = pad, w = W - pad * 2;
      const rest = headH + px(10) + px(20) + px(22) + (tally.length ? tallyH + px(22) : 0) + footH + pad * 2;
      const wantGrid = H * 0.42;
      if (H - rest - countH < wantGrid) {
        count = Math.max(COUNT * 0.55, COUNT - (wantGrid - (H - rest - countH)) / U / 1.05);
        countH = countHAt(count);
      }
      let at = pad;
      drawHead(x, at, w); at += headH + px(10);
      drawCount(x, at, w); at += countH + px(20);
      const footY = H - pad - footH;
      const tallyY = footY - px(22) - tallyH;
      const gridBottom = (tally.length ? tallyY : footY) - px(22);
      drawGrid(ctx, covers, { x, y: at, w, h: Math.max(0, gridBottom - at) }, ink);
      drawTally(x, tallyY, w);
      drawFoot(x, footY, w);
      return [];
    },
  };
}
