// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/halftone.js
// Halftone: the album still looks like itself (Miyel, 2026-11-04; it was Riso, two
// inks, until the cover stopped being the cover). The four inks of a printed sleeve,
// each a real plate of dots at its own angle, land from the four corners and build
// up into the picture, a hair out of register at rest. The words and the bars are
// overprinted on the same sheet in two inks from the album's own colours: its
// strongest and the next one far enough away, or, on a cover with only one, that
// colour's opposite. The title runs over the bars and the inks make a third.
//
// The separation is by the pixel. A cover that will not be read throws here, and
// the print falls back to Day.
'use client';

import {
  ARRIVES, STAR_PATH, HEART_PATH, SYMBOLS, MARK_ASPECT,
  drawArtist, drawPath, easeOut, clamp01, sheet, fitTitle,
} from '../SharePrinter';

const SHEET = '#f4f0e5';
const LANDS_IN = 2.4;
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

export function halftoneScene(record, frame, { art, families, still = false }) {
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
  const side = SAMPLE;
  const small = sheet(side, side, c => {
    if (art?.cover?.naturalWidth) c.drawImage(art.cover, 0, 0, side, side);
    else { c.fillStyle = '#999'; c.fillRect(0, 0, side, side); }
  });
  const px = small.getContext('2d').getImageData(0, 0, side, side).data;
  const cell = Math.max(4, 0.72 * u);
  const { dark, darkFaint, bright, brightReads } = inksOf(px);
  // Black takes most of what the three colours share, as on a press.
  const black = (r, g, b) => (1 - Math.max(r, g, b)) * 0.85;
  const part = channel => (r, g, b) => {
    const k = black(r, g, b);
    return clamp01((1 - channel(r, g, b) - k) / Math.max(0.01, 1 - k));
  };
  const deg = Math.PI / 180;
  const plates = [
    { art: halftone(px, side, size, '#00aeef', 15 * deg, cell, part(r => r)), from: [-1, -1], rest: [0, 0] },
    { art: halftone(px, side, size, '#ec008c', 75 * deg, cell, part((r, g) => g)), from: [1, -1], rest: [0.28 * u, 0.2 * u] },
    { art: halftone(px, side, size, '#fff200', 0, cell, part((r, g, b) => b)), from: [-1, 1], rest: [-0.2 * u, 0.24 * u] },
    { art: halftone(px, side, size, '#231f20', 45 * deg, cell, black), from: [1, 1], rest: [0.14 * u, -0.16 * u] },
  ];

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
    bars.forEach((v, i) => {
      const on = easeOut(clamp01((t - ARRIVES.floor - i * 0.03) / 0.8));
      if (on <= 0) return;
      const h = Math.max(floorH * 0.05, floorH * v) * on;
      overprint(c, () => {
        c.fillStyle = bright;
        c.fillRect(i * slot + barGap / 2, H - h, slot - barGap, h);
      });
    });

    // One plate after another, so the picture builds rather than arrives.
    overprint(c, () => {
      plates.forEach((plate, i) => {
        const away = 1 - easeOut(clamp01((t - i * 0.35) / LANDS_IN));
        c.drawImage(plate.art, ax + plate.rest[0] + plate.from[0] * away * W, plate.rest[1] + plate.from[1] * away * H * 0.5);
      });
    });
    if (t >= LANDS_IN + 1.05) c.drawImage(tab, 0, 0);

    let y = rowsTop;
    if (stars > 0 || tags.length) {
      const rowY = y;
      overprint(c, () => {
        for (let i = 0; i < 5 && stars > 0; i++) {
          const x = margin + i * (starBox + starGap);
          if (t < ARRIVES.stars + i * 0.15) continue;
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
          if (t < ARRIVES.tags + i * 0.2) return;
          const x = W - margin - (tags.length - i) * markBox - (tags.length - i - 1) * markGap;
          drawPath(c, SYMBOLS[tag], x, rowY, markBox, 256, brightReads ? bright : dark);
        });
      });
      y += 10.5 * k * u;
    }
    if (artistLine) {
      const artistY = y;
      if (t >= ARRIVES.artist) {
        overprint(c, () => drawArtist(c, artistLine, margin, artistY, { size: 2.9 * k * u, tracking: 0.24, wide: W - margin * 2, least: W * 0.02, colour: dark, mono, align: 'left' }));
      }
      y += 5.4 * k * u;
    }
    if (t >= ARRIVES.title) {
      const titleY = y;
      overprint(c, () => {
        c.font = titleFont(k);
        c.textBaseline = 'top';
        c.textAlign = 'left';
        c.fillStyle = dark;
        titleLines.forEach((line, i) => c.fillText(line, margin, titleY + i * lead));
      });
    }

    // A favourite: a heart in the dark ink on the top of its bar.
    bars.forEach((v, i) => {
      if (!favs[i] || t < ARRIVES.hearts + i * 0.03) return;
      const box = Math.min(3.4 * u, slot * 0.7);
      const h = Math.max(floorH * 0.05, floorH * v);
      overprint(c, () => drawPath(c, HEART_PATH, i * slot + (slot - box) / 2, H - h + 0.6 * u, box, 24, dark));
    });
  }

  let t = still ? 30 : 0;
  return {
    step(dt) { t += dt; },
    paint(c) { paintAt(c, t); },
  };
}
