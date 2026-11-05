// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/poster.js
// Poster: always the album's real cover, in a layout of its own: the cover edge to
// edge at the head, the title printed over the bars (Miyel, 2026-11-05: "it's always
// the album art, not any different version of it"). It comes in quickly and smoothly,
// since most people tap through stories, but it does come in: the four inks of a
// printed sleeve glide in from the corners as dots, the dots grow until they close into
// the cover itself, and the bars rise as the words unroll from under it. Nothing bounces.
// The words and bars are overprinted in two inks from the album's own colours: its
// strongest and the next one far enough away, or, on a cover with only one, that
// colour's opposite.
//
// Reading the colours is by the pixel. A cover that will not be read throws here, and
// the print falls back to Day.
'use client';

import {
  STAR_PATH, HEART_PATH, SYMBOLS, MARK_ASPECT,
  drawArtist, drawPath, clamp01, sheet, fitTitle,
} from '../SharePrinter';

const SHEET = '#f4f0e5';
const FAV = '#f0484f';
const LANDS_IN = 0.9;                  // each ink gliding in
const INK_GAP = 0.12;                  // between one ink setting off and the next
const PLATES_DONE = LANDS_IN + INK_GAP * 3;
const CLOSES_IN = 0.45;                // the dots growing into the cover
const COVER_DONE = PLATES_DONE + CLOSES_IN;
const ROLLS_AT = 1.15, ROLLS_IN = 0.7; // the words and bars
const FAR_ENOUGH = 60;                 // degrees of hue between the two inks
const PLAIN_FLOOR = 0.1;               // how much colour a cover needs to give an ink
const SAMPLE = 360;

// How light a fully bright hue reads, for telling the dark ink from the bright one.
function lightOfHue(h) {
  const f = n => { const k = (n + h / 30) % 12; return 0.5 - 0.5 * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return 0.3 * f(0) + 0.59 * f(8) + 0.11 * f(4);
}

// The album's two hues, as inks: the darker one prints the picture's darks and the
// words, the brighter one its colour and the bars. A cover with no colour to speak
// of prints in black and one warm ink.
function inksOf(px) {
  const bins = new Array(36).fill(0);
  let vivid = 0;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i] / 255, g = px[i + 1] / 255, b = px[i + 2] / 255;
    const max = Math.max(r, g, b), chroma = max - Math.min(r, g, b);
    if (chroma < 0.12) continue;
    let hue = max === r ? ((g - b) / chroma) % 6 : max === g ? (b - r) / chroma + 2 : (r - g) / chroma + 4;
    hue = (hue * 60 + 360) % 360;
    bins[Math.floor(hue / 10)] += chroma;
    vivid += chroma;
  }
  if (vivid / (px.length / 4) < PLAIN_FLOOR) {
    return { dark: 'hsl(240,6%,12%)', darkFaint: 'hsla(240,6%,12%,0.2)', bright: 'hsl(4,84%,62%)', brightReads: true };
  }
  const apart = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };
  let first = 0;
  bins.forEach((v, i) => { if (v > bins[first]) first = i; });
  const h1 = first * 10 + 5;
  let second = -1;
  bins.forEach((v, i) => {
    if (apart(i * 10 + 5, h1) < FAR_ENOUGH || v < bins[first] * 0.12) return;
    if (second < 0 || v > bins[second]) second = i;
  });
  const h2 = second >= 0 ? second * 10 + 5 : (h1 + 180) % 360;
  const [darkHue, brightHue] = lightOfHue(h1) <= lightOfHue(h2) ? [h1, h2] : [h2, h1];
  // A yellow or a green only reads as words once it is quite deep.
  const darkL = lightOfHue(darkHue) > 0.55 ? 24 : 34;
  return {
    dark: `hsl(${darkHue},78%,${darkL}%)`,
    darkFaint: `hsla(${darkHue},78%,${darkL}%,0.2)`,
    bright: `hsl(${brightHue},86%,58%)`,
    brightReads: lightOfHue(brightHue) < 0.6,
  };
}

const smooth = v => v * v * (3 - 2 * v);
const easeOut = v => 1 - (1 - v) ** 3;

// One ink's plate: `density` says how much of it a pixel wants, and each dot on a grid
// turned to `angle` is as large as the ink under it.
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
        c.arc(x, y, cell * 0.6 * Math.sqrt(amount), 0, Math.PI * 2);
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

export function posterScene(record, frame, { art, families, still = false }) {
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
  // The title comes well down into the bars. The hearts have a row of their own
  // above them, each over its bar, where nothing covers them (Miyel, 2026-11-04).
  const overlap = bars.length ? floorH * 0.45 : 0;
  const hasHearts = favs.some(Boolean) && bars.length > 0;
  const heartBox = 4.2 * u;
  const room = H - floorH + overlap - margin * (bars.length ? 0 : 1) - roomTop;
  const heightAt = (k, lines) => ((stars > 0 || tags.length ? 10.5 : 0) + (artistLine ? 5.4 : 0) + lines * 13) * k * u + (hasHearts ? heartBox + 2 * u : 0);
  const titleFont = k => `900 ${14 * k * u}px ${sans}`;
  const { k, lines: titleLines } = fitTitle({ album: entry?.album, fontAt: titleFont, wide: W - margin * 2, room, heightAt });
  const rowsTop = H - floorH + overlap - margin * (bars.length ? 0 : 1) - heightAt(k, titleLines.length);

  // ── The picture ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const side = SAMPLE;
  const small = sheet(side, side, c => {
    if (art?.cover?.naturalWidth) c.drawImage(art.cover, 0, 0, side, side);
    else { c.fillStyle = '#999'; c.fillRect(0, 0, side, side); }
  });
  const px = small.getContext('2d').getImageData(0, 0, side, side).data;
  const cell = Math.max(4, 0.72 * u);
  const { dark, darkFaint, bright, brightReads } = inksOf(px);
  // Black takes most of what the three colours share, as on a press. Still never
  // shows these, so they are only made for a print that moves.
  const black = (r, g, b) => (1 - Math.max(r, g, b)) * 0.85;
  const part = channel => (r, g, b) => {
    const k = black(r, g, b);
    return clamp01((1 - channel(r, g, b) - k) / Math.max(0.01, 1 - k));
  };
  const deg = Math.PI / 180;
  const plates = still ? [] : [
    { art: halftone(px, side, size, '#00aeef', 15 * deg, cell, part(r => r)), from: [-1, -1] },
    { art: halftone(px, side, size, '#ec008c', 75 * deg, cell, part((r, g) => g)), from: [1, -1] },
    { art: halftone(px, side, size, '#fff200', 0, cell, part((r, g, b) => b)), from: [-1, 1] },
    { art: halftone(px, side, size, '#231f20', 45 * deg, cell, black), from: [1, 1] },
  ];

  // The real cover, and its opening: it shows through dots on
  // one grid that grow until there is nothing between them.
  const solid = sheet(size, size, c => {
    if (art?.cover?.naturalWidth) c.drawImage(art.cover, 0, 0, size, size);
    else { c.fillStyle = '#999'; c.fillRect(0, 0, size, size); }
  });
  const closing = sheet(size, size, () => {});
  const onClosing = closing.getContext('2d');
  const grid = [];
  const pitch = cell * 1.25;
  for (let y = 0; y < size + pitch; y += pitch) {
    for (let x = 0; x < size + pitch; x += pitch) grid.push(x, y);
  }
  function drawClosing(c, v) {
    onClosing.globalCompositeOperation = 'source-over';
    onClosing.clearRect(0, 0, size, size);
    const r = pitch * 0.75 * v;
    onClosing.beginPath();
    for (let i = 0; i < grid.length; i += 2) {
      onClosing.moveTo(grid[i] + r, grid[i + 1]);
      onClosing.arc(grid[i], grid[i + 1], r, 0, Math.PI * 2);
    }
    onClosing.fillStyle = '#000';
    onClosing.fill();
    onClosing.globalCompositeOperation = 'source-in';
    onClosing.drawImage(solid, 0, 0);
    c.drawImage(closing, ax, 0);
  }

  // ── The sheet ─────────────────────────────────────────────────────────
  const under = sheet(W, H, c => {
    c.fillStyle = SHEET;
    c.fillRect(0, 0, W, H);
  });
  // The mark on a tab of the sheet at the corner, in the dark ink.
  const markH = 3.8 * u, markW = markH * MARK_ASPECT;
  const tab = sheet(markW + 3.6 * u, markH + 2.4 * u, c => {
    c.fillStyle = SHEET;
    c.fillRect(0, 0, c.canvas.width, c.canvas.height);
    if (art?.mark) {
      c.drawImage(sheet(markW, markH, m => {
        m.drawImage(art.mark, 0, 0, markW, markH);
        m.globalCompositeOperation = 'source-in';
        m.fillStyle = dark;
        m.fillRect(0, 0, markW, markH);
      }), 1.8 * u, 1.2 * u);
    }
  });

  const starBox = 7.6 * k * u, starGap = 1.1 * k * u;
  const markBox = 7.6 * k * u, markGap = 1.8 * k * u;
  const lead = 13 * k * u;
  const slot = bars.length ? W / bars.length : 0;
  const barGap = Math.min(0.9 * u, slot * 0.14);

  function paintAt(c, t) {
    c.drawImage(under, 0, 0);

    // The bars first: the title goes over them.
    const rise = smooth(clamp01((t - ROLLS_AT) / ROLLS_IN));
    bars.forEach((v, i) => {
      if (rise <= 0) return;
      const h = Math.max(floorH * 0.05, floorH * v) * rise;
      overprint(c, () => {
        c.fillStyle = bright;
        c.fillRect(i * slot + barGap / 2, H - h, slot - barGap, h);
      });
    });

    // The inks glide in, one after another, and their dots close into the cover.
    if (t >= COVER_DONE) c.drawImage(solid, ax, 0);
    else {
      overprint(c, () => {
        plates.forEach((plate, i) => {
          const away = 1 - easeOut(clamp01((t - i * INK_GAP) / LANDS_IN));
          c.drawImage(plate.art, ax + plate.from[0] * away * W, plate.from[1] * away * H * 0.5);
        });
      });
      if (t > PLATES_DONE) drawClosing(c, smooth(clamp01((t - PLATES_DONE) / CLOSES_IN)));
    }
    c.drawImage(tab, 0, 0);

    // The words unroll downward from under the cover, all together.
    const unroll = smooth(clamp01((t - ROLLS_AT) / ROLLS_IN));
    if (unroll <= 0) return;
    c.save();
    c.beginPath();
    c.rect(0, size, W, (H - size) * unroll);
    c.clip();

    let y = rowsTop;
    if (stars > 0 || tags.length) {
      const rowY = y;
      overprint(c, () => {
        for (let i = 0; i < 5 && stars > 0; i++) {
          const x = margin + i * (starBox + starGap);
          drawPath(c, STAR_PATH, x, rowY, starBox, 18, darkFaint);
          const part = clamp01(stars - i);
          if (part > 0) {
            c.save();
            c.beginPath();
            c.rect(x, rowY, starBox * part, starBox);
            c.clip();
            drawPath(c, STAR_PATH, x, rowY, starBox, 18, dark);
            c.restore();
          }
        }
        tags.forEach((tag, i) => {
          const x = W - margin - (tags.length - i) * markBox - (tags.length - i - 1) * markGap;
          drawPath(c, SYMBOLS[tag], x, rowY, markBox, 256, brightReads ? bright : dark);
        });
      });
      y += 10.5 * k * u;
    }
    if (artistLine) {
      const artistY = y;
      overprint(c, () => drawArtist(c, artistLine, margin, artistY, { size: 2.9 * k * u, tracking: 0.24, wide: W - margin * 2, least: W * 0.02, colour: dark, mono, align: 'left' }));
      y += 5.4 * k * u;
    }
    if (hasHearts) y += heartBox + 2 * u;
    const titleY = y;
    overprint(c, () => {
      c.font = titleFont(k);
      c.textBaseline = 'top';
      c.textAlign = 'left';
      c.fillStyle = dark;
      titleLines.forEach((line, i) => c.fillText(line, margin, titleY + i * lead));
    });

    // A favourite: a red heart over its bar, printed last so it stays whole.
    if (hasHearts) {
      const titleTop = H - floorH + overlap - titleLines.length * lead;
      const box = Math.min(heartBox, slot * 0.8);
      const heartY = Math.min(H - floorH - box - 1.2 * u, titleTop - box - 1 * u);
      bars.forEach((v, i) => {
        if (!favs[i]) return;
        drawPath(c, HEART_PATH, i * slot + (slot - box) / 2, heartY, box, 24, FAV);
      });
    }
    c.restore();
  }

  let t = still ? 30 : 0;
  return {
    step(dt) { t += dt; },
    paint(c) { paintAt(c, t); },
  };
}
