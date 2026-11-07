// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/poster.js
// Poster: always the album's real cover, in a layout of its own: the cover edge to
// edge at the head, the title printed over the bars (Miyel, 2026-11-05: "it's always
// the album art, not any different version of it"). It comes in quickly and smoothly,
// since most people tap through stories, but it does come in: the cover glides down from
// the top of the sheet, and the bars rise as the words unroll from under it. Dots, colour
// layers, sliding sheets and a puzzle of flat shapes were all tried and let go (Miyel,
// 2026-11-06). Nothing bounces.
// By day the words, stars and marks take a deep ink from the album's own colours and the
// title overlaps the bars. At night they are solid white and the title sits clear of the
// bars (Miyel, 2026-11-06). The bars are in the album's own bright colour, or LN green on
// a cover with no colour of its own.
//
// Reading the colours is by the pixel. A cover that will not be read throws here, and
// the print falls back to Day.
'use client';

import {
  LN_GREEN, STAR_PATH, HEART_PATH, SYMBOLS, MARK_ASPECT,
  drawArtist, drawPath, clamp01, sheet, fitTitle,
} from '../SharePrinter';

const SHEETS = { day: '#f4f0e5', night: '#0e0e0e' };
const GLIDES_IN = 0.9;                 // the cover
const ROLLS_AT = 0.6, ROLLS_IN = 0.7;  // the words and bars
const FAR_ENOUGH = 60;                 // degrees of hue between the two to choose from
const PLAIN_FLOOR = 0.1;               // how much colour a cover needs to give an ink
const SAMPLE = 360;

// How light a fully bright hue reads, for telling which of two makes the better words.
function lightOfHue(h) {
  const f = n => { const k = (n + h / 30) % 12; return 0.5 - 0.5 * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return 0.3 * f(0) + 0.59 * f(8) + 0.11 * f(4);
}

// The album's two strongest hues: the darker, deepened until it reads, is the words' ink
// by day; the brighter is the bars. A cover with one hue uses it for both. A cover with
// no colour to speak of prints in plain black, with LN green bars.
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
    return { words: 'hsl(240,6%,12%)', faint: 'hsla(240,6%,12%,0.2)', barInk: LN_GREEN };
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
  const h2 = second >= 0 ? second * 10 + 5 : h1;
  const [darkHue, brightHue] = lightOfHue(h1) <= lightOfHue(h2) ? [h1, h2] : [h2, h1];
  // A yellow or a green only reads as words once it is quite deep.
  const light = lightOfHue(darkHue) > 0.55 ? 24 : 34;
  return {
    words: `hsl(${darkHue},78%,${light}%)`,
    faint: `hsla(${darkHue},78%,${light}%,0.2)`,
    barInk: `hsl(${brightHue},86%,58%)`,
  };
}

const smooth = v => v * v * (3 - 2 * v);
const easeOut = v => 1 - (1 - v) ** 3;

function overprint(c, paint) {
  c.save();
  c.globalCompositeOperation = 'multiply';
  paint();
  c.restore();
}

export const posterScene = night => (record, frame, { art, families, still = false }) => {
  const SHEET = night ? SHEETS.night : SHEETS.day;
  const { stars, artistLine, tags, bars, favs, entry } = record;
  const { sans, mono } = families;
  const W = frame.w, H = frame.h;
  const u = Math.min(W, (H * 9) / 16) / 100;

  // The cover takes the head of the sheet, off the edges where it can.
  const size = Math.min(W, H * 0.6);
  const ax = (W - size) / 2;
  const floorH = bars.length ? H * 0.14 : 0;
  const margin = 5 * u;
  const roomTop = size + 3 * u;
  // A favourite's heart stands on its own bar, as on the card (Miyel, 2026-11-06), so the
  // title keeps clear of them. Only by day, with no hearts to cover, does it come down
  // into the bars.
  const hasHearts = favs.some(Boolean) && bars.length > 0;
  const overlap = bars.length && !night && !hasHearts ? floorH * 0.45 : 0;
  const heartBox = Math.min(4.2 * u, (bars.length ? W / bars.length : 0) * 0.8);
  const heartLift = 1 * u;
  const clearance = bars.length && !overlap ? 1.5 * u + (hasHearts ? heartBox + heartLift : 0) : 0;
  const wordsEnd = H - floorH + overlap - clearance - margin * (bars.length ? 0 : 1);
  const room = wordsEnd - roomTop;
  const heightAt = (k, lines) => ((stars > 0 || tags.length ? 10.5 : 0) + (artistLine ? 5.4 : 0) + lines * 13) * k * u;
  const titleFont = k => `900 ${14 * k * u}px ${sans}`;
  const { k, lines: titleLines } = fitTitle({ album: entry?.album, fontAt: titleFont, wide: W - margin * 2, room, heightAt });
  const rowsTop = wordsEnd - heightAt(k, titleLines.length);

  // ── The picture ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const side = SAMPLE;
  const small = sheet(side, side, c => {
    if (art?.cover?.naturalWidth) c.drawImage(art.cover, 0, 0, side, side);
    else { c.fillStyle = '#999'; c.fillRect(0, 0, side, side); }
  });
  const px = small.getContext('2d').getImageData(0, 0, side, side).data;
  const inks = inksOf(px);
  const { words, faint } = night ? { words: '#ffffff', faint: 'rgba(255,255,255,0.2)' } : inks;

  // The real cover.
  const solid = sheet(size, size, c => {
    if (art?.cover?.naturalWidth) c.drawImage(art.cover, 0, 0, size, size);
    else { c.fillStyle = '#999'; c.fillRect(0, 0, size, size); }
  });

  // The words overprint by day, and simply lie on the black at night.
  const lay = (c, paint) => (night ? paint() : overprint(c, paint));

  // ── The sheet ─────────────────────────────────────────────────────────
  const under = sheet(W, H, c => {
    c.fillStyle = SHEET;
    c.fillRect(0, 0, W, H);
  });
  // The mark on a tab of the sheet at the corner, in the words' ink.
  const markH = 3.8 * u, markW = markH * MARK_ASPECT;
  const tab = sheet(markW + 3.6 * u, markH + 2.4 * u, c => {
    c.fillStyle = SHEET;
    c.fillRect(0, 0, c.canvas.width, c.canvas.height);
    if (art?.mark) {
      c.drawImage(sheet(markW, markH, m => {
        m.drawImage(art.mark, 0, 0, markW, markH);
        m.globalCompositeOperation = 'source-in';
        m.fillStyle = words;
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
      c.fillStyle = inks.barInk;
      c.fillRect(i * slot + barGap / 2, H - h, slot - barGap, h);
    });

    c.drawImage(solid, ax, -(1 - easeOut(clamp01(t / GLIDES_IN))) * size);
    c.drawImage(tab, 0, 0);

    // The words unroll downward from under the cover, all together.
    const unroll = smooth(clamp01((t - ROLLS_AT) / ROLLS_IN));
    if (unroll <= 0) return;
    c.save();
    c.beginPath();
    c.rect(0, size, W, (H - size) * unroll);
    c.clip();

    paintWords(c, words, faint);

    // A favourite: a heart standing on its bar, black by day and white at night (Miyel,
    // 2026-11-06), rising with it.
    bars.forEach((v, i) => {
      if (!favs[i] || rise <= 0) return;
      const h = Math.max(floorH * 0.05, floorH * v) * rise;
      drawPath(c, HEART_PATH, i * slot + (slot - heartBox) / 2, H - h - heartBox - heartLift, heartBox, 24, night ? '#ffffff' : '#000000');
    });
    c.restore();
  }

  function paintWords(c, ink, inkFaint) {
    let y = rowsTop;
    if (stars > 0 || tags.length) {
      const rowY = y;
      lay(c, () => {
        for (let i = 0; i < 5 && stars > 0; i++) {
          const x = margin + i * (starBox + starGap);
          drawPath(c, STAR_PATH, x, rowY, starBox, 18, inkFaint);
          const part = clamp01(stars - i);
          if (part > 0) {
            c.save();
            c.beginPath();
            c.rect(x, rowY, starBox * part, starBox);
            c.clip();
            drawPath(c, STAR_PATH, x, rowY, starBox, 18, ink);
            c.restore();
          }
        }
        tags.forEach((tag, i) => {
          const x = W - margin - (tags.length - i) * markBox - (tags.length - i - 1) * markGap;
          drawPath(c, SYMBOLS[tag], x, rowY, markBox, 256, ink);
        });
      });
      y += 10.5 * k * u;
    }
    if (artistLine) {
      const artistY = y;
      lay(c, () => drawArtist(c, artistLine, margin, artistY, { size: 2.9 * k * u, tracking: 0.24, wide: W - margin * 2, least: W * 0.02, colour: ink, mono, align: 'left' }));
      y += 5.4 * k * u;
    }
    const titleY = y;
    lay(c, () => {
      c.font = titleFont(k);
      c.textBaseline = 'top';
      c.textAlign = 'left';
      c.fillStyle = ink;
      titleLines.forEach((line, i) => c.fillText(line, margin, titleY + i * lead));
    });
  }

  let t = still ? 30 : 0;
  return {
    step(dt) { t += dt; },
    paint(c) { paintAt(c, t); },
  };
};
