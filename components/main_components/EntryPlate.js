// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/EntryPlate.js
// A record, cut as a printing plate.
//
// The first thing the share printer prints, and the one that matters: a
// profile is shared once, an entry every time a record is finished. Handed to
// SharePrinter.js, which owns the paper sizes, the looks you turn through and
// the two buttons at the bottom, and which knows nothing about records. This
// file knows nothing about Instagram. Adding a printable thing to the site is
// writing one of these, not touching the press.
//
// ── What a print carries ──────────────────────────────────────────────────
//
//   the cover, large — it is what stops a scroll, so it is the subject.
//   whose journal, small, in the label face. the album. the artist and year.
//   the stars. the marks. and a foot: the mark on the left, the code on the
//   right, small, near it.
//
// The notes never travel. A card that says everything is a post, and a post
// is terminal; this one is deliberately insufficient so the code has a reason
// to be scanned. Same layout on every look and every paper — the background
// changes mood, never information (DECISIONS: fixed layout, swappable
// background).
//
// ── The code ──────────────────────────────────────────────────────────────
// Plain, level M, the entry's own address. Not the pressed photo code the
// cover turns into on the page: measured on 2026-09-12, that one needs four
// hundred pixels of a Story to read from a phone held at arm's length, and
// the plain one reads at two hundred. Small near the mark means plain. It
// has a floor in paper pixels (CODE_FLOOR) that the fit-to-paper correction
// is not allowed to go under, because the square print would otherwise shrink
// it into a texture. And it stays dark on light whatever the look: a camera
// looks for dark on light, so on a night print the code brings its own stock.
//
// ── Everything hangs off the cover's edges ────────────────────────────────
// The cover sets the column; the writing is ranged left to its left edge and
// the foot runs edge to edge. A centred title under a square reads as a
// poster; ranged to the sleeve it reads as the back of one.
//
// ── Units ─────────────────────────────────────────────────────────────────
// Every measurement is in units of a 340-wide column — the card's own column,
// so the type here is the site's type — and the whole layout is those numbers
// times one unit, fitted first to the paper's width and then, if it overran,
// to its height. Opened out on wide paper (link previews) the cover goes to
// the left and the writing beside it; the same rows, the fold moved.

'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import SharePrinter, { loadMark, loadPicture, MARK_ASPECT, drawTracked, drawPath, ellipsize, wrapLines, roundRect } from './SharePrinter';
import { parseRating } from '../../library/entry_formatter';
import { CODE_QUIET } from '../../library/code_shape';

// ── Measurements, in column units ─────────────────────────────────────────
const COL = 340;
const KEEPER = 8.5;
const TITLE = 26, TITLE_LEAD = 26 * 1.08;
const LINE = 13, LINE_LEAD = 13 * 1.5;
const STAR = 17, STAR_GAP = 5;
const PILL = 8, PILL_H = 20, PILL_PAD = 9, PILL_GAP = 6;
const MARK_H = 16;
const CODE = 64;
// …but never less than this much of the paper's shorter side, quiet zone
// included: 200 of a 1080 Story, which is where a phone camera still reads it.
const CODE_FLOOR = 0.185;
const COVER_RADIUS = 6;
const COLUMN_GAP = 28;   // opened out: between the cover and the writing
const GAP = { keeper: 24, title: 7, line: 6, stars: 18, pills: 14, foot: 28 };

// How much of the paper the print is allowed, and the height it must fit in.
// Narrower over a backdrop, for the reason IdentityCardPlate gives: the scrim
// is the print plus its padding.
const FILL_BARE = 0.82;
const FILL_OVER = 0.72;
const FILL_H = 0.86;
const PANEL_PAD = 22;
const PANEL_RADIUS = 22;

// ── Ink ────────────────────────────────────────────────────────────────────
// base.css, stated rather than read: a print is the same colour wherever it
// is made. The night set is the site's dark theme.
const INKS = {
  day: {
    ink: '#1a1a1a', soft: '#6b6b6b', faint: '#a8a8a8', warm: '#efebe2',
    rule: 'rgba(26,26,26,0.15)', unlit: '#d6d3cc',
    veil: 'rgba(238,240,236,0.30)', panel: 'rgba(238,240,236,0.96)', panelEdge: 'rgba(255,255,255,0.70)',
  },
  night: {
    ink: '#e8e4dc', soft: '#888888', faint: '#666666', warm: '#161616',
    rule: 'rgba(232,228,220,0.16)', unlit: '#3a3a3a',
    veil: 'rgba(14,14,14,0.34)', panel: 'rgba(14,14,14,0.96)', panelEdge: 'rgba(255,255,255,0.12)',
  },
};
// The code's two colours never follow the look — see the note at the top.
const CODE_INK = '#191917';
const CODE_STOCK = '#f5f4ef';
const GOLD = '#E8B84B';
// The same three marks, in the same colours, as the entry's link preview.
const MARKS = { masterpiece: ['Masterpiece', '#4a9bf0'], favorite: ['Favorite', '#f0484f'], formative: ['Formative', '#3fa96b'] };
// A star as a shape, in a 24-box. Neither typeface carries one.
const STAR_PATH = 'M12 2.5l2.95 6.3 6.9.8-5.1 4.7 1.35 6.85L12 17.75l-6.1 3.4 1.35-6.85-5.1-4.7 6.9-.8z';

// ── The code, as a path ────────────────────────────────────────────────────
// The smallest version that holds the address at level M, the way AddressCode
// draws it on the page: whole cells, no inset, one path. Built once per plate.
function buildCode(url) {
  try {
    const { modules } = QRCode.create(url, { errorCorrectionLevel: 'M' });
    let d = '';
    for (let row = 0; row < modules.size; row++) {
      for (let col = 0; col < modules.size; col++) {
        if (modules.data[row * modules.size + col]) d += `M${col} ${row}h1v1h-1z`;
      }
    }
    return { d, size: modules.size };
  } catch {
    return null;
  }
}

// A row of the print: the air above it, its height, and how it draws into
// the box it is given. Measured and drawn by the same numbers so the two
// passes cannot disagree.
function textRow({ gap, lines, size, lead, colour, font }) {
  return {
    gap,
    h: lines.length * lead,
    draw(c, x, y) {
      c.font = font;
      c.fillStyle = colour;
      c.textBaseline = 'top';
      c.textAlign = 'left';
      const drop = (lead - size) / 2;
      lines.forEach((line, i) => c.fillText(line, x, y + i * lead + drop));
    },
  };
}

// How wide a tracked line will be, before it is drawn — for sizing a pill.
function trackedWidth(c, text, spacing) {
  const chars = [...String(text)];
  let total = 0;
  for (const ch of chars) total += c.measureText(ch).width + spacing;
  return Math.max(0, total - spacing);
}

// ── The plate ──────────────────────────────────────────────────────────────

export function entryPlate({ entry, keeper, address }) {
  const score = parseRating(entry?.rating);
  const isMasterpiece = entry?.masterpiece === true || entry?.rating === 'Masterpiece';
  const stars = isMasterpiece ? 5 : score;
  const marks = Object.entries(MARKS)
    .filter(([key]) => (key === 'masterpiece' ? isMasterpiece : entry?.[key] === true || entry?.[key] === 'true'))
    .map(([, [label, colour]]) => ({ label, colour }));
  const listen = entry?.listen_total > 1 ? `Listen ${entry.listen_number}` : null;
  const line = [entry?.artist, entry?.year].filter(Boolean).join('  ·  ');
  const code = address ? buildCode(address) : null;

  // What the printer offers to leave off. The cover, the album, the artist
  // and the foot are not switches: they are the card.
  const toggles = [];
  if (keeper) toggles.push({ key: 'keeper', label: 'Keeper', on: true });
  if (stars > 0) toggles.push({ key: 'stars', label: 'Stars', on: true });
  if (marks.length || listen) toggles.push({ key: 'marks', label: 'Marks', on: true });

  return {
    title: 'The record',
    fileName: entry?.slug || 'record',
    toggles,

    // Two pictures: the mark in the look's ink, and the cover. Either may come
    // back null and the plate draws on without it.
    async load({ isDark }) {
      const [mark, cover] = await Promise.all([
        loadMark(isDark ? INKS.night.ink : INKS.day.ink),
        loadPicture(entry?.album_art),
      ]);
      return { mark, cover };
    },

    draw(ctx, frame, { art, shown, isDark, families, backdrop }) {
      const ink = isDark ? INKS.night : INKS.day;
      const { sans, mono } = families;
      const on = key => (shown ? shown[key] !== false : true);
      const spread = frame.w / frame.h > 1.3;
      const fillW = backdrop ? FILL_OVER : FILL_BARE;
      const codeFloor = Math.min(frame.w, frame.h) * CODE_FLOOR;

      // ── measure, then fit ────────────────────────────────────────────────
      // Width decides the unit. If the result is too tall the unit comes down
      // by the overrun — more than once, because the code's floor does not
      // scale with it and one correction lands short.
      let U = spread
        ? Math.min((frame.h * fillW) / COL, (frame.w * fillW) / (COL * 2 + COLUMN_GAP))
        : (frame.w * fillW) / COL;
      const roomH = spread ? frame.h * fillW : frame.h * FILL_H;
      let built = build(U);
      for (let pass = 0; pass < 3 && built.h > roomH * 1.005; pass++) {
        U *= roomH / built.h;
        built = build(U);
      }

      function build(unit) {
        const px = n => n * unit;
        const colW = px(COL);
        const codeBox = Math.max(px(CODE), codeFloor);
        const rows = [];
        const showKeeper = Boolean(keeper) && on('keeper');

        // the cover, at the head of the column. Opened out it is beside the
        // column and not in this stack at all.
        if (!spread) rows.push({ gap: 0, h: colW, draw: (c, x, y, w) => drawCover(c, x, y, w, unit) });

        // whose journal
        if (showKeeper) {
          rows.push({
            gap: px(GAP.keeper),
            h: px(KEEPER) * 1.4,
            draw(c, x, y) {
              c.textBaseline = 'top';
              c.font = `400 ${px(KEEPER)}px ${mono}`;
              c.fillStyle = ink.faint;
              drawTracked(c, keeper.toUpperCase(), x, y, px(KEEPER) * 0.18, 'left');
            },
          });
        }

        // the album
        ctx.font = `700 ${px(TITLE)}px ${sans}`;
        rows.push(textRow({
          gap: px(showKeeper ? GAP.title : GAP.keeper),
          lines: wrapLines(ctx, entry?.album || '', colW, 3),
          size: px(TITLE), lead: px(TITLE_LEAD), colour: ink.ink,
          font: `700 ${px(TITLE)}px ${sans}`,
        }));

        // the artist and the year
        if (line) {
          ctx.font = `400 ${px(LINE)}px ${sans}`;
          rows.push(textRow({
            gap: px(GAP.line),
            lines: [ellipsize(ctx, line, colW)],
            size: px(LINE), lead: px(LINE_LEAD), colour: ink.soft,
            font: `400 ${px(LINE)}px ${sans}`,
          }));
        }

        // the stars
        if (stars > 0 && on('stars')) {
          rows.push({ gap: px(GAP.stars), h: px(STAR), draw: (c, x, y) => drawStars(c, x, y, unit) });
        }

        // the marks, and which listen this was
        const pills = [];
        if (on('marks')) {
          for (const m of marks) pills.push({ label: m.label, colour: m.colour, edge: m.colour });
          if (listen) pills.push({ label: listen, colour: ink.soft, edge: ink.rule });
        }
        if (pills.length) {
          rows.push({ gap: px(GAP.pills), h: px(PILL_H), draw: (c, x, y, w) => drawPills(c, x, y, w, pills, unit) });
        }

        // the foot: the mark, and the code near it
        const footH = Math.max(codeBox, px(MARK_H));
        rows.push({ gap: px(GAP.foot), h: footH, draw: (c, x, y, w) => drawFoot(c, x, y, w, footH, codeBox, unit) });

        const stack = rows.reduce((sum, row) => sum + row.gap + row.h, 0);
        return { rows, stack, h: spread ? Math.max(stack, colW) : stack, colW };
      }

      // ── the cover ────────────────────────────────────────────────────────
      function drawCover(c, x, y, size, unit) {
        const radius = COVER_RADIUS * unit;
        c.save();
        c.shadowColor = 'rgba(0,0,0,0.18)';
        c.shadowBlur = 40 * unit;
        c.shadowOffsetY = 14 * unit;
        c.fillStyle = ink.warm;
        roundRect(c, x, y, size, size, radius);
        c.fill();
        c.restore();
        const img = art?.cover;
        if (!img?.naturalWidth) return;
        // object-fit: cover, by hand. Apple's art is square; a cover that is
        // not is scaled to fill and centred.
        const scale = Math.max(size / img.naturalWidth, size / img.naturalHeight);
        const drawW = img.naturalWidth * scale;
        const drawH = img.naturalHeight * scale;
        c.save();
        roundRect(c, x, y, size, size, radius);
        c.clip();
        c.drawImage(img, x - (drawW - size) / 2, y - (drawH - size) / 2, drawW, drawH);
        c.restore();
      }

      // ── the stars ────────────────────────────────────────────────────────
      // Whole stars lit in gold, the rest in the look's unlit grey, and a half
      // where the score has one. A fractional score is also written after
      // them, as the link preview does, since a half star is easy to miss.
      function drawStars(c, x, y, unit) {
        const box = STAR * unit;
        const step = (STAR + STAR_GAP) * unit;
        const whole = Math.floor(stars + 0.001);
        const half = stars - whole >= 0.25 && stars - whole < 0.75;
        for (let n = 1; n <= 5; n++) {
          const sx = x + (n - 1) * step;
          drawPath(c, STAR_PATH, sx, y, box, 24, n <= whole ? GOLD : ink.unlit);
          if (half && n === whole + 1) {
            c.save();
            c.beginPath();
            c.rect(sx, y, box / 2, box);
            c.clip();
            drawPath(c, STAR_PATH, sx, y, box, 24, GOLD);
            c.restore();
          }
        }
        if (!isMasterpiece && score > 0 && !Number.isInteger(score)) {
          c.font = `400 ${(LINE - 1) * unit}px ${mono}`;
          c.fillStyle = ink.soft;
          c.textBaseline = 'middle';
          c.textAlign = 'left';
          c.fillText(String(score), x + 5 * step + 2 * unit, y + box / 2);
          c.textBaseline = 'top';
        }
      }

      // ── the marks ────────────────────────────────────────────────────────
      // Outlined pills in the mark's own colour, the label face, tracked.
      // They run left from the cover's edge and stop rather than wrap: a
      // second row of marks would be a print about the marks.
      function drawPills(c, x, y, w, pills, unit) {
        const h = PILL_H * unit;
        const pad = PILL_PAD * unit;
        const spacing = PILL * unit * 0.12;
        c.font = `400 ${PILL * unit}px ${mono}`;
        let cx = x;
        for (const pill of pills) {
          const text = pill.label.toUpperCase();
          const tw = trackedWidth(c, text, spacing);
          const pw = tw + pad * 2;
          if (cx + pw > x + w + 0.5) break;
          c.strokeStyle = pill.edge;
          c.lineWidth = Math.max(1, 1.4 * unit);
          roundRect(c, cx, y, pw, h, h / 2);
          c.stroke();
          c.fillStyle = pill.colour;
          c.textBaseline = 'middle';
          drawTracked(c, text, cx + pad, y + h / 2 + 0.5 * unit, spacing, 'left');
          c.textBaseline = 'top';
          cx += pw + PILL_GAP * unit;
        }
      }

      // ── the foot ─────────────────────────────────────────────────────────
      // The mark at the left edge, the code at the right, both centred on the
      // row. On a night print the code sits on its own light stock, exactly
      // its box and no more; on a day print the paper is the stock.
      function drawFoot(c, x, y, w, h, codeBox, unit) {
        if (art?.mark) {
          const mh = MARK_H * unit;
          c.drawImage(art.mark, x, y + (h - mh) / 2, mh * MARK_ASPECT, mh);
        }
        if (!code) return;
        const cx = x + w - codeBox;
        const cy = y + (h - codeBox) / 2;
        if (isDark) {
          c.fillStyle = CODE_STOCK;
          roundRect(c, cx, cy, codeBox, codeBox, 4 * unit);
          c.fill();
        }
        const cell = codeBox / (code.size + CODE_QUIET * 2);
        c.save();
        c.translate(cx + CODE_QUIET * cell, cy + CODE_QUIET * cell);
        c.scale(cell, cell);
        c.fillStyle = CODE_INK;
        c.fill(new Path2D(code.d));
        c.restore();
      }

      // ── lay it down ──────────────────────────────────────────────────────
      const { rows, stack, h, colW } = built;
      const blockW = spread ? colW * 2 + COLUMN_GAP * U : colW;
      const originX = (frame.w - blockW) / 2;
      const originY = (frame.h - h) / 2;

      // The scrim, only when something is moving behind the print.
      if (backdrop) {
        ctx.fillStyle = ink.veil;
        ctx.fillRect(0, 0, frame.w, frame.h);
        const pad = PANEL_PAD * U;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.28)';
        ctx.shadowBlur = 30 * U;
        ctx.shadowOffsetY = 8 * U;
        ctx.fillStyle = ink.panel;
        roundRect(ctx, originX - pad, originY - pad, blockW + pad * 2, h + pad * 2, PANEL_RADIUS * U);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = ink.panelEdge;
        ctx.lineWidth = Math.max(1, 0.5 * U);
        roundRect(ctx, originX - pad, originY - pad, blockW + pad * 2, h + pad * 2, PANEL_RADIUS * U);
        ctx.stroke();
      }

      if (spread) {
        drawCover(ctx, originX, originY + (h - colW) / 2, colW, U);
        const textX = originX + colW + COLUMN_GAP * U;
        let y = originY + (h - stack) / 2;
        for (const row of rows) {
          y += row.gap;
          row.draw(ctx, textX, y, colW);
          y += row.h;
        }
      } else {
        let y = originY;
        for (const row of rows) {
          y += row.gap;
          row.draw(ctx, originX, y, colW);
          y += row.h;
        }
      }
    },
  };
}

// ── The page's half ────────────────────────────────────────────────────────
// What app/printer/page.js renders for the keeper: the press, open, with this
// record on it. Closing puts the address back — the layer it rose on closes
// with it — and, opened cold with nowhere to go back to, lands on the record.
export default function EntryPlate({ entry, keeper, address, layered = false }) {
  const router = useRouter();
  const plate = useMemo(() => entryPlate({ entry, keeper, address }), [entry, keeper, address]);
  const slug = entry?.slug;
  const close = useCallback(() => {
    if (window.history.length > 1) router.back();
    else router.push(slug ? `/entries/${slug}` : '/');
  }, [router, slug]);
  return <SharePrinter open inline={layered} plate={plate} link={address || null} onClose={close} />;
}
