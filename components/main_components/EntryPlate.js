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
// ── What a print is, 2026-09-12 ───────────────────────────────────────────
// The entry page's first screen, on the record's own colour. Miyel's call,
// after the first version — a cover on plain cream with the facts under it —
// looked like every other app's share card: the print is the card a reader
// already knows from the journal, centred, the chips the post's chips, and
// the ground is the cover itself blurred across the paper under a wash. Every
// print is the colour of its album; a feed of them is a wall of sleeves.
//
//   the mark, centred at the head, as it is on every page; the keeper's
//   name under it. the cover, large. the album. the artist and year. the
//   stars. the chips. the horizon — the track ratings as bars, the shape of
//   the listen. Not the posted date: it is on the page, and on a print it
//   was a line nobody needed (Miyel, 2026-09-12).
//
// The notes never travel. A card that says everything is a post, and a post
// is terminal; this one is deliberately insufficient so the code has a reason
// to be scanned. Same layout on every look and paper — the look changes the
// wash and the ink, never the information (DECISIONS: fixed layout, swappable
// background).
//
// ── No code ───────────────────────────────────────────────────────────────
// There was one, for an afternoon: plain, level M, centred at the foot on
// its own stock, and it read at every size. It came off the same day
// (Miyel's brief) because a story is viewed on the phone that would have to
// scan it — a code on a print does no work in the case the print is for.
// What carries a reader to the entry is the poster's link sticker, and the
// press copies the address for it the moment the picture is made. In
// person, the art on the entry page already turns into its photo code. A
// physically printed flyer would earn a toggle, not a redesign; the sizes
// that would need are in NOTES.
//
// ── Units ─────────────────────────────────────────────────────────────────
// Every measurement is in units of a 340-wide column — a phone's screen one,
// 390 less its padding — so the numbers here are the post's own pixels, and
// the whole layout is those numbers times one unit: fitted first to the
// paper's width and then, if it overran, to its height. Opened out on wide
// paper (link previews) the cover goes to the left and the stack beside it.

'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import SharePrinter, { loadMark, loadPicture, MARK_ASPECT, drawTracked, drawPath, ellipsize, wrapLines, roundRect } from './SharePrinter';
import { parseRating, parseHorizon, entryTracks } from '../../library/entry_formatter';

// ── Measurements, in column units — the post's own ────────────────────────
const COL = 340;
const ART = 304;                       // min(40dvh, 78vw) on a 390 phone
const ART_RADIUS = 16;
// The statement pages' mark, not the nav's: setup's card sets it 78 wide on
// 380 and the held copy's page 92 on a phone, about a fifth of the width.
// A print is a statement page too (Miyel, 2026-09-12); the nav's 28 read
// as a colophon.
const MARK_H = 46;                     // ≈ 80 wide on the 340 column
const KEEPER = 13;                     // the label face, under the mark — half again the site's line, on Miyel's call
const TITLE = 26, TITLE_LEAD = 26 * 1.22;
const ARTIST = 11;                     // mono caps, as .ln-screen-one-artist
const STAR = 30, STAR_GAP = 4;         // StarRating size={24}, a quarter up for the same reason as the chips
// A third larger than the post's chips (10 on 8×3): a print is looked at
// inside a story, a phone's width scaled into a phone's width, and at the
// screen's size they could not be read (Miyel, 2026-09-12).
const CHIP = 13, CHIP_PAD_X = 10, CHIP_PAD_Y = 4, CHIP_GAP = 8, CHIP_RADIUS = 5;
// The marks as symbols instead of chips — the feed's own three, much larger
// than a chip, so a print can carry the marks as pictures (Miyel's ask).
const SYMBOL = 34, SYMBOL_GAP = 18;
const HORIZON_H = 34, HORIZON_GAP = 2, HEART = 7;
const COLUMN_GAP = 28;                 // opened out: between the cover and the stack
// The screen's gap is 16 between everything; the artist line pulls up by 8.
const GAP = { keeper: 10, art: 16, title: 16, artist: 8, stars: 16, chips: 16, listen: 10, horizon: 20 };

// How much of the paper the column is allowed, and the height it must fit.
const FILL_W = 0.86;
const FILL_H = 0.88;

// ── A Story's furniture ───────────────────────────────────────────────────
// Instagram draws over the top of a story (the progress bars, the name) and
// the bottom (the reply bar), about an eighth each; on 9:16 the print keeps
// out of both. With the Sticker toggle it leaves more at the foot — room for
// the link sticker the poster adds there, which is what carries a reader to
// the entry now that the print has no code. Miyel's ask, 2026-09-12.
const STORY_TOP = 0.13;
const STORY_FOOT = 0.13;
const STICKER_FOOT = 0.24;

// ── Ink ────────────────────────────────────────────────────────────────────
// base.css, stated rather than read: a print is the same colour wherever it
// is made. Paper is the light theme's ink over a light wash, Ink the dark's.
const INKS = {
  day: {
    ink: '#1a1a1a', soft: '#6b6b6b', faint: '#a8a8a8', warm: '#efebe2',
    rule: 'rgba(26,26,26,0.15)', unlit: 'rgba(232,184,75,0.18)',
    bar: 'rgba(26,26,26,0.5)',
    edge: 'rgba(255,255,255,0.6)',                                  // --panel-border
    lift: ['rgba(0,0,0,0.06)', 'rgba(0,0,0,0.06)'],                 // --shadow-lift
    wash: 'rgba(238,240,236,0.62)', paper: '#eef0ec',
  },
  night: {
    ink: '#e8e4dc', soft: '#888888', faint: '#666666', warm: '#161616',
    rule: 'rgba(232,228,220,0.16)', unlit: 'rgba(232,184,75,0.18)',
    bar: 'rgba(232,228,220,0.5)',
    edge: 'rgba(255,255,255,0.08)',
    lift: ['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.3)'],
    wash: 'rgba(14,14,14,0.64)', paper: '#0e0e0e',
  },
};
const GOLD = '#E8B84B';
const FAV = '#f0484f';                 // --fav
// The chips' tones, as Chip.js has them: the word in the colour, the hairline
// the same colour at 40%.
const TONES = {
  fav: { ink: '#f0484f', edge: 'rgba(240,72,79,0.4)' },
  mp: { ink: '#4a9bf0', edge: 'rgba(74,155,240,0.4)' },
  formative: { ink: '#3fa96b', edge: 'rgba(63,169,107,0.4)' },
};
// StarRating's star, in an 18-box; a heart in a 24-box for the favourites.
const STAR_PATH = 'M9 1.5l2.163 4.38 4.837.703-3.5 3.412.826 4.818L9 12.39l-4.326 2.273.826-4.818L2 6.583l4.837-.703z';
const HEART_PATH = 'M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11z';
// The marks' symbols, as Feed.js draws them: Phosphor's Heart (fill),
// SketchLogo (fill) and Fingerprint (bold), each a single path in a 256-box.
const SYMBOLS = {
  fav: 'M240,102c0,70-103.79,126.66-108.21,129a8,8,0,0,1-7.58,0C119.79,228.66,16,172,16,102A62.07,62.07,0,0,1,78,40c20.65,0,38.73,8.88,50,23.89C139.27,48.88,157.35,40,178,40A62.07,62.07,0,0,1,240,102Z',
  mp: 'M246,98.73l-56-64A8,8,0,0,0,184,32H72a8,8,0,0,0-6,2.73l-56,64a8,8,0,0,0,.17,10.73l112,120a8,8,0,0,0,11.7,0l112-120A8,8,0,0,0,246,98.73ZM222.37,96H180L144,48h36.37ZM74.58,112l30.13,75.33L34.41,112Zm106.84,0h40.17l-70.3,75.33ZM75.63,48H112L76,96H33.63Z',
  formative: 'M160,128a224.48,224.48,0,0,1-26.37,105.54,12,12,0,1,1-21.16-11.32A200.33,200.33,0,0,0,136,128a8,8,0,0,0-16,0,12,12,0,0,1-24,0,32,32,0,0,1,64,0ZM128,56a12,12,0,1,0,0,24,48.05,48.05,0,0,1,48,48c0,7.62-.36,15.32-1.07,22.87A12,12,0,0,0,185.74,164c.38,0,.76,0,1.14,0a12,12,0,0,0,11.93-10.87c.79-8.3,1.18-16.76,1.18-25.13A72.08,72.08,0,0,0,128,56ZM96,92.23A12,12,0,0,0,80,74.35,72.1,72.1,0,0,0,56,128a120.11,120.11,0,0,1-15.12,58.37,12,12,0,0,0,21,11.69A144.14,144.14,0,0,0,80,128,48.08,48.08,0,0,1,96,92.23Zm10.1,64.1a12,12,0,0,0-14.46,8.9,158.61,158.61,0,0,1-18.88,45.86,12,12,0,0,0,20.5,12.48A182.86,182.86,0,0,0,115,170.79,12,12,0,0,0,106.1,156.33Zm76.73,24.07A12,12,0,0,0,168.19,189a241.5,241.5,0,0,1-8,24.87,12,12,0,0,0,6.91,15.49,11.76,11.76,0,0,0,4.29.8,12,12,0,0,0,11.21-7.71,260.2,260.2,0,0,0,8.79-27.37A12,12,0,0,0,182.83,180.4ZM128,16A112.12,112.12,0,0,0,16,127.44c0,.19,0,.38,0,.57a79.81,79.81,0,0,1-5,27.82,12,12,0,1,0,22.5,8.35A103.59,103.59,0,0,0,40,128.58c0-.19,0-.38,0-.57a88,88,0,0,1,176-.5c0,.16,0,.33,0,.5a282.12,282.12,0,0,1-6.74,61.38,12,12,0,0,0,9.09,14.33A11.84,11.84,0,0,0,221,204a12,12,0,0,0,11.7-9.38A305.87,305.87,0,0,0,240,128.55c0-.18,0-.36,0-.54A112.13,112.13,0,0,0,128,16Z',
};

// A row of the print: the air above it, its height, and how it draws into
// the box it is given. Measured and drawn by the same numbers so the two
// passes cannot disagree. Everything is centred in its box.
function textRow({ gap, lines, size, lead, colour, font }) {
  return {
    gap,
    h: lines.length * lead,
    draw(c, x, y, w) {
      c.font = font;
      c.fillStyle = colour;
      c.textBaseline = 'top';
      c.textAlign = 'center';
      const drop = (lead - size) / 2;
      lines.forEach((line, i) => c.fillText(line, x + w / 2, y + i * lead + drop));
      c.textAlign = 'left';
    },
  };
}

// How wide a tracked line will be, before it is drawn — for sizing a chip.
function trackedWidth(c, text, spacing) {
  const chars = [...String(text)];
  let total = 0;
  for (const ch of chars) total += c.measureText(ch).width + spacing;
  return Math.max(0, total - spacing);
}

// ── The plate ──────────────────────────────────────────────────────────────

export function entryPlate({ entry, keeper }) {
  const score = parseRating(entry?.rating);
  const isMasterpiece = entry?.masterpiece === true || entry?.rating === 'Masterpiece';
  const stars = isMasterpiece ? 5 : score;
  const isFavorite = entry?.favorite === true || entry?.favorite === 'true';
  const isFormative = entry?.formative === true || entry?.formative === 'true';
  // The chips, in the post's order and the post's words.
  const chips = [];
  if (entry?.listen_total > 1) {
    chips.push({ text: entry.listen_number === 1 ? `First listen · 1 of ${entry.listen_total}` : `Listen ${entry.listen_number} of ${entry.listen_total}` });
  }
  if (isFavorite) chips.push({ text: 'Favorite', tone: 'fav' });
  if (isMasterpiece) chips.push({ text: 'Masterpiece', tone: 'mp' });
  if (isFormative) chips.push({ text: 'Formative', tone: 'formative' });
  const line = [entry?.artist, entry?.year].filter(Boolean).join(' · ');

  // The horizon: the track ratings as bars, read from the column the session
  // derives — or from the tracks themselves, for a record that has ratings
  // and no column.
  const tracks = entryTracks(entry || {});
  let bars = parseHorizon(entry?.horizon);
  if (!bars.length && tracks.some(t => t.stars > 0)) {
    bars = tracks.map(t => Math.max(0, Math.min(1, (Number(t.stars) || 0) / 5)));
  }
  const favs = tracks.map(t => !!t.favorite);
  const anyFav = bars.length > 0 && favs.some(Boolean);

  // What the printer offers to leave off. The cover, the album and the
  // artist are not switches: they are the card.
  const toggles = [];
  if (keeper) toggles.push({ key: 'keeper', label: 'Keeper', on: true });
  if (stars > 0) toggles.push({ key: 'stars', label: 'Stars', on: true });
  // Chips or Symbols: the marks as the post's chips, or as the feed's symbols
  // — one or the other, or neither, which the printer enforces through the
  // group. Chips to begin with: they are the post's. A listen count has no
  // symbol and stays a chip beneath the symbols.
  if (chips.length) toggles.push({ key: 'chips', label: 'Chips', on: true, group: 'marks' });
  const marks = chips.filter(chip => chip.tone);
  if (marks.length) toggles.push({ key: 'symbols', label: 'Symbols', on: false, group: 'marks' });
  if (bars.length) toggles.push({ key: 'horizon', label: 'Horizon', on: true });
  // On by default: a story is the frame that matters and the sticker is how
  // it links, so the first print made should have the room. Only 9:16 has
  // a foot to keep; on the other papers the switch changes nothing.
  toggles.push({ key: 'sticker', label: 'Sticker space', on: true });

  return {
    title: 'The record',
    fileName: entry?.slug || 'record',
    toggles,

    // Two pictures: the mark in the look's ink, and the cover — which is also
    // the ground. Either may come back null and the plate draws on without it.
    async load({ isDark }) {
      const [mark, cover] = await Promise.all([
        loadMark(isDark ? INKS.night.ink : INKS.day.ink),
        loadPicture(entry?.album_art),
      ]);
      return { mark, cover };
    },

    draw(ctx, frame, { art, shown, isDark, families }) {
      const ink = isDark ? INKS.night : INKS.day;
      const { sans, mono } = families;
      const on = key => (shown ? shown[key] !== false : true);
      const spread = frame.w / frame.h > 1.3;
      const story = frame.w / frame.h < 0.6;
      // The band of paper the print may use: all of it, or on a story what
      // is left between Instagram's furniture — and under the sticker.
      const top = story ? frame.h * STORY_TOP : 0;
      const foot = story ? frame.h * (on('sticker') ? STICKER_FOOT : STORY_FOOT) : 0;
      const areaH = frame.h - top - foot;

      // ── the ground ───────────────────────────────────────────────────────
      paintGround(ctx, frame, art?.cover, ink);

      // ── measure, then fit ────────────────────────────────────────────────
      // Width decides the unit. If the result is too tall the unit comes down
      // by exactly the overrun; everything scales with it, so one correction
      // is enough.
      let U = spread
        ? Math.min((frame.h * FILL_H) / ART, (frame.w * FILL_W) / (ART + COL + COLUMN_GAP))
        : (frame.w * FILL_W) / COL;
      const roomH = story ? areaH * 0.96 : frame.h * FILL_H;
      let built = build(U);
      if (built.h > roomH) {
        U *= roomH / built.h;
        built = build(U);
      }

      function build(unit) {
        const px = n => n * unit;
        const colW = px(COL);
        const artW = px(ART);
        const rows = [];
        const showKeeper = Boolean(keeper) && on('keeper');

        // the mark, centred, at the head
        if (art?.mark) {
          rows.push({
            gap: 0,
            h: px(MARK_H),
            draw(c, x, y, w) {
              const mh = px(MARK_H);
              const mw = mh * MARK_ASPECT;
              c.drawImage(art.mark, x + (w - mw) / 2, y, mw, mh);
            },
          });
        }

        // whose journal, under it
        if (showKeeper) {
          rows.push({
            gap: art?.mark ? px(GAP.keeper) : 0,
            h: px(KEEPER) * 1.4,
            draw(c, x, y, w) {
              c.textBaseline = 'top';
              c.font = `400 ${px(KEEPER)}px ${mono}`;
              c.fillStyle = ink.soft;   // the post's faint sinks into a photograph
              drawTracked(c, keeper.toUpperCase(), x + w / 2, y, px(KEEPER) * 0.14, 'center');
            },
          });
        }

        // the cover. Opened out it is beside the stack and not in it.
        if (!spread) {
          rows.push({ gap: px(GAP.art), h: artW, draw: (c, x, y, w) => drawCover(c, x + (w - artW) / 2, y, artW, unit) });
        }

        // the album, two lines at most, as the screen clamps it
        ctx.font = `700 ${px(TITLE)}px ${sans}`;
        rows.push(textRow({
          gap: px(GAP.title),
          lines: wrapLines(ctx, entry?.album || '', colW, 2),
          size: px(TITLE), lead: px(TITLE_LEAD), colour: ink.ink,
          font: `700 ${px(TITLE)}px ${sans}`,
        }));

        // the artist and the year, in the label face
        if (line) {
          rows.push({
            gap: px(GAP.artist),
            h: px(ARTIST) * 1.4,
            draw(c, x, y, w) {
              c.textBaseline = 'top';
              c.font = `400 ${px(ARTIST)}px ${mono}`;
              c.fillStyle = ink.soft;
              drawTracked(c, ellipsize(c, line.toUpperCase(), w * 0.92), x + w / 2, y, px(ARTIST) * 0.14, 'center');
            },
          });
        }

        // the stars
        if (stars > 0 && on('stars')) {
          rows.push({ gap: px(GAP.stars), h: px(STAR), draw: (c, x, y, w) => drawStars(c, x, y, w, unit) });
        }

        // the marks: the feed's symbols, or the post's chips, or neither. A
        // listen count has no symbol, so under the symbols it stays a chip.
        const asSymbols = on('symbols') && marks.length > 0;
        if (asSymbols) {
          rows.push({ gap: px(GAP.chips), h: px(SYMBOL), draw: (c, x, y, w) => drawSymbols(c, x, y, w, unit) });
        }
        const listed = asSymbols ? chips.filter(chip => !chip.tone) : (on('chips') ? chips : []);
        if (listed.length) {
          const laid = layChips(ctx, listed, colW, unit);
          rows.push({ gap: px(asSymbols ? GAP.listen : GAP.chips), h: laid.h, draw: (c, x, y, w) => drawChips(c, x, y, w, laid, unit) });
        }


        // the horizon, with headroom for the hearts when there are any
        if (bars.length && on('horizon')) {
          const head = anyFav ? px(HEART + 4) : 0;
          rows.push({ gap: px(GAP.horizon), h: head + px(HORIZON_H), draw: (c, x, y, w) => drawHorizon(c, x, y + head, w, unit) });
        }

        const stack = rows.reduce((sum, row) => sum + row.gap + row.h, 0);
        return { rows, stack, h: spread ? Math.max(stack, artW) : stack, colW, artW };
      }

      // ── the ground ───────────────────────────────────────────────────────
      // The cover blurred across the whole paper, overscanned so no edge
      // shows, under the look's wash. Without a cover, the page's own colour.
      function paintGround(c, f, img, ink) {
        c.fillStyle = ink.paper;
        c.fillRect(0, 0, f.w, f.h);
        if (img?.naturalWidth) {
          const s = Math.max(f.w / img.naturalWidth, f.h / img.naturalHeight) * 1.3;
          const dw = img.naturalWidth * s;
          const dh = img.naturalHeight * s;
          c.save();
          if (typeof c.filter === 'string') {
            // Six hundredths of the width to begin with; a fifth softer on
            // Miyel's eye, so the cover's shapes show through as shapes.
            c.filter = `blur(${Math.round(f.w * 0.048)}px) saturate(1.3)`;
            c.drawImage(img, (f.w - dw) / 2, (f.h - dh) / 2, dw, dh);
          } else {
            // No filter on this canvas: a picture shrunk to a few pixels and
            // stretched back is a blur by another route.
            const tiny = document.createElement('canvas');
            tiny.width = 12; tiny.height = 12;
            const t = tiny.getContext('2d');
            t.imageSmoothingQuality = 'high';
            t.drawImage(img, 0, 0, 12, 12);
            c.imageSmoothingQuality = 'high';
            c.drawImage(tiny, (f.w - dw) / 2, (f.h - dh) / 2, dw, dh);
          }
          c.restore();
        }
        c.fillStyle = ink.wash;
        c.fillRect(0, 0, f.w, f.h);
      }

      // ── the cover ────────────────────────────────────────────────────────
      // As .ln-screen-one-art has it: the square's radius, a hairline, the
      // lift — two shadows, drawn as two fills, since a canvas casts one at a
      // time.
      function drawCover(c, x, y, size, unit) {
        const radius = ART_RADIUS * unit;
        c.save();
        c.shadowColor = ink.lift[1];
        c.shadowBlur = 48 * unit;
        c.shadowOffsetY = 16 * unit;
        c.fillStyle = ink.warm;
        roundRect(c, x, y, size, size, radius);
        c.fill();
        c.shadowColor = ink.lift[0];
        c.shadowBlur = 20 * unit;
        c.shadowOffsetY = 4 * unit;
        c.fill();
        c.restore();
        const img = art?.cover;
        if (img?.naturalWidth) {
          const scale = Math.max(size / img.naturalWidth, size / img.naturalHeight);
          const drawW = img.naturalWidth * scale;
          const drawH = img.naturalHeight * scale;
          c.save();
          roundRect(c, x, y, size, size, radius);
          c.clip();
          c.drawImage(img, x - (drawW - size) / 2, y - (drawH - size) / 2, drawW, drawH);
          c.restore();
        }
        c.strokeStyle = ink.edge;
        c.lineWidth = Math.max(1, unit * 0.8);
        roundRect(c, x, y, size, size, radius);
        c.stroke();
      }

      // ── the stars ────────────────────────────────────────────────────────
      // StarRating: every star drawn faint in gold, the lit ones over it in
      // full gold, a half as the left half. A masterpiece glows.
      function drawStars(c, x, y, w, unit) {
        const box = STAR * unit;
        const step = (STAR + STAR_GAP) * unit;
        const total = 5 * box + 4 * STAR_GAP * unit;
        const left = x + (w - total) / 2;
        for (let n = 1; n <= 5; n++) {
          const sx = left + (n - 1) * step;
          drawPath(c, STAR_PATH, sx, y, box, 18, ink.unlit);
          const fill = stars >= n ? 'full' : stars >= n - 0.5 ? 'half' : 'empty';
          if (fill === 'empty') continue;
          c.save();
          if (isMasterpiece) {
            c.shadowColor = 'rgba(255,210,60,0.6)';
            c.shadowBlur = 5 * unit;
          }
          if (fill === 'half') {
            c.beginPath();
            c.rect(sx, y, box / 2, box);
            c.clip();
          }
          drawPath(c, STAR_PATH, sx, y, box, 18, GOLD);
          c.restore();
        }
      }

      // ── the chips ────────────────────────────────────────────────────────
      // Chip.js: the label face, tracked a little, a hairline in the tone at
      // 40%, a small radius. Laid out first so the row knows its height —
      // they wrap, centred, as the screen's row does.
      function layChips(c, list, maxW, unit) {
        const font = `400 ${CHIP * unit}px ${mono}`;
        const spacing = CHIP * unit * 0.08;
        const padX = CHIP_PAD_X * unit;
        const h = CHIP * unit * 1.2 + CHIP_PAD_Y * 2 * unit;
        const gap = CHIP_GAP * unit;
        c.font = font;
        const sized = list.map(chip => ({ ...chip, w: trackedWidth(c, chip.text, spacing) + padX * 2 }));
        const lines = [[]];
        let used = 0;
        for (const chip of sized) {
          const need = (lines.at(-1).length ? gap : 0) + chip.w;
          if (lines.at(-1).length && used + need > maxW) { lines.push([chip]); used = chip.w; }
          else { lines.at(-1).push(chip); used += need; }
        }
        return { lines, h: lines.length * h + (lines.length - 1) * gap, rowH: h, gap, font, spacing, padX };
      }
      function drawChips(c, x, y, w, laid, unit) {
        c.font = laid.font;
        c.textBaseline = 'middle';
        laid.lines.forEach((chipsOnLine, i) => {
          const total = chipsOnLine.reduce((sum, chip) => sum + chip.w, 0) + laid.gap * (chipsOnLine.length - 1);
          let cx = x + (w - total) / 2;
          const cy = y + i * (laid.rowH + laid.gap);
          for (const chip of chipsOnLine) {
            const tone = TONES[chip.tone];
            c.strokeStyle = tone ? tone.edge : ink.rule;
            c.lineWidth = Math.max(1, unit * 0.8);
            roundRect(c, cx, cy, chip.w, laid.rowH, CHIP_RADIUS * unit);
            c.stroke();
            c.fillStyle = tone ? tone.ink : ink.soft;
            drawTracked(c, chip.text, cx + laid.padX, cy + laid.rowH / 2 + 0.5 * unit, laid.spacing, 'left');
            cx += chip.w + laid.gap;
          }
        });
        c.textBaseline = 'top';
      }

      // ── the symbols ──────────────────────────────────────────────────────
      // The marks as the feed draws them, large, in their colours, centred.
      function drawSymbols(c, x, y, w, unit) {
        const size = SYMBOL * unit;
        const step = (SYMBOL + SYMBOL_GAP) * unit;
        const total = marks.length * size + (marks.length - 1) * SYMBOL_GAP * unit;
        let sx = x + (w - total) / 2;
        for (const mark of marks) {
          drawPath(c, SYMBOLS[mark.tone], sx, y, size, 256, TONES[mark.tone].ink);
          sx += step;
        }
      }

      // ── the horizon ──────────────────────────────────────────────────────
      // The entry page's bars: one per track, height by rating, a heart over
      // a favourite. In the ink at half strength rather than the page's
      // accent grey, which sank into the washed photograph. No titles — on a
      // print the shape is the point, and a diagonal of track names would be
      // a second print.
      function drawHorizon(c, x, y, w, unit) {
        const n = bars.length;
        const gap = HORIZON_GAP * unit;
        const bw = Math.max(1, (w - gap * (n - 1)) / n);
        const h = HORIZON_H * unit;
        const r = Math.min(2 * unit, bw / 2);
        for (let i = 0; i < n; i++) {
          const bh = Math.max(2 * unit, bars[i] * h);
          const x0 = x + i * (bw + gap), x1 = x0 + bw;
          const y0 = y + h - bh, y1 = y + h;
          c.fillStyle = ink.bar;
          c.beginPath();
          c.moveTo(x0, y1);
          c.lineTo(x0, y0 + r);
          c.arcTo(x0, y0, x0 + r, y0, r);
          c.lineTo(x1 - r, y0);
          c.arcTo(x1, y0, x1, y0 + r, r);
          c.lineTo(x1, y1);
          c.closePath();
          c.fill();
          if (favs[i]) {
            const hs = HEART * unit;
            drawPath(c, HEART_PATH, x0 + (bw - hs) / 2, y0 - hs - 2 * unit, hs, 24, FAV);
          }
        }
      }

      // ── lay it down ──────────────────────────────────────────────────────
      const { rows, stack, h, colW, artW } = built;
      if (spread) {
        const blockW = artW + COLUMN_GAP * U + colW;
        const originX = (frame.w - blockW) / 2;
        const originY = (frame.h - h) / 2;
        drawCover(ctx, originX, originY + (h - artW) / 2, artW, U);
        const textX = originX + artW + COLUMN_GAP * U;
        let y = originY + (h - stack) / 2;
        for (const row of rows) {
          y += row.gap;
          row.draw(ctx, textX, y, colW);
          y += row.h;
        }
      } else {
        const originX = (frame.w - colW) / 2;
        let y = top + (areaH - h) / 2;
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
// record on it; the entry's address goes to the press as the link it copies
// when a print is made. Closing puts the page's address back — the layer it
// rose on closes with it — and, opened cold with nowhere to go back to, lands
// on the record.
export default function EntryPlate({ entry, keeper, address, layered = false }) {
  const router = useRouter();
  const plate = useMemo(() => entryPlate({ entry, keeper }), [entry, keeper]);
  const slug = entry?.slug;
  const close = useCallback(() => {
    if (window.history.length > 1) router.back();
    else router.push(slug ? `/entries/${slug}` : '/');
  }, [router, slug]);
  return <SharePrinter open inline={layered} plate={plate} link={address || null} onClose={close} />;
}
