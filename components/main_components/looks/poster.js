// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/poster.js
// Poster: always the album's real cover, in a layout of its own: the cover edge to
// edge at the head, the title printed over the bars (Miyel, 2026-11-05: "it's always
// the album art, not any different version of it"). It comes in quickly and smoothly,
// since most people tap through stories, but it does come in: the cover glides down from
// the top of the sheet and everything else comes up from the bottom to meet it. Dots,
// colour layers, sliding sheets and a puzzle of flat shapes were all tried and let go
// (Miyel, 2026-11-06). Nothing bounces.
// The words, stars, marks and bars are all one colour, the album's strongest, deepened
// by day and lifted at night so it reads; a cover with no colour of its own takes LN
// green (Miyel, 2026-11-06). The title sits clear of the bars, since it would vanish on them.
//
// Reading the colours is by the pixel. A cover that will not be read throws here, and
// the print falls back to Day.
'use client';

import {
  INKS, LN_GREEN, STAR_PATH, HEART_PATH, SYMBOLS, MARK_ASPECT,
  drawArtist, drawPath, clamp01, sheet, fitTitle,
} from '../SharePrinter';

const GLIDES_IN = 0.9;                 // the cover
const RISES_AT = 0.45, RISES_IN = 0.85; // everything under the cover
const PLAIN_FLOOR = 0.1;               // how much colour a cover needs to give an ink
const SAMPLE = 360;

// How light a fully bright hue reads.
export function lightOfHue(h) {
  const f = n => { const k = (n + h / 30) % 12; return 0.5 - 0.5 * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return 0.3 * f(0) + 0.59 * f(8) + 0.11 * f(4);
}

// The album's strongest hue, or null on a cover with none to speak of.
export function hueOf(art) {
  const small = sheet(SAMPLE, SAMPLE, c => {
    if (art?.cover?.naturalWidth) c.drawImage(art.cover, 0, 0, SAMPLE, SAMPLE);
    else { c.fillStyle = '#999'; c.fillRect(0, 0, SAMPLE, SAMPLE); }
  });
  const px = small.getContext('2d').getImageData(0, 0, SAMPLE, SAMPLE).data;
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
  if (vivid / (px.length / 4) < PLAIN_FLOOR) return null;
  let first = 0;
  bins.forEach((v, i) => { if (v > bins[first]) first = i; });
  return first * 10 + 5;
}

// The one colour on a plain page: deepened by day and lifted at night so it reads;
// LN green on a cover with no colour of its own.
export function inkOf(hue, night) {
  if (hue === null) {
    return night
      ? { ink: LN_GREEN, faint: 'rgba(124,255,155,0.2)' }
      : { ink: '#2e9c55', faint: 'rgba(46,156,85,0.2)' };
  }
  // A yellow or a green only reads on a light page once it is quite deep.
  const light = night ? 64 : lightOfHue(hue) > 0.55 ? 32 : 46;
  return { ink: `hsl(${hue},80%,${light}%)`, faint: `hsla(${hue},80%,${light}%,0.2)` };
}

export function coverOf(art, size) {
  return sheet(size, size, c => {
    if (art?.cover?.naturalWidth) c.drawImage(art.cover, 0, 0, size, size);
    else { c.fillStyle = '#999'; c.fillRect(0, 0, size, size); }
  });
}

// The mark, in one colour.
export function markIn(art, w, h, colour) {
  return sheet(w, h, m => {
    if (!art?.mark) return;
    m.drawImage(art.mark, 0, 0, w, h);
    m.globalCompositeOperation = 'source-in';
    m.fillStyle = colour;
    m.fillRect(0, 0, w, h);
  });
}

// The rows of words every look but the card shares: stars and marks, the artist, the
// title. Measured for the room given, then painted wherever the look wants them.
export function factRows({ record, families, u, wide, room, align = 'left', size = 14 }) {
  const { stars, artistLine, tags, entry } = record;
  const { sans, mono } = families;
  const fontAt = k => `900 ${size * k * u}px ${sans}`;
  const leadOf = k => size * 0.93 * k * u;
  const heightAt = (k, lines) => (stars > 0 || tags.length ? 10.5 * k * u : 0) + (artistLine ? 5.4 * k * u : 0) + lines * leadOf(k);
  const { k, lines } = fitTitle({ album: entry?.album, fontAt, wide, room, heightAt });
  const lead = leadOf(k);
  const starBox = 7.6 * k * u, starGap = 1.1 * k * u;
  const markBox = 7.6 * k * u, markGap = 1.8 * k * u;
  const centre = align === 'center';
  return {
    height: heightAt(k, lines.length),
    paint(c, x, top, ink, faint) {
      let y = top;
      if (stars > 0 || tags.length) {
        const across = (stars > 0 ? 5 * starBox + 4 * starGap : 0) + (tags.length ? (stars > 0 ? 3 * markGap : 0) + tags.length * markBox + (tags.length - 1) * markGap : 0);
        const from = centre ? x + (wide - across) / 2 : x;
        for (let i = 0; i < 5 && stars > 0; i++) {
          const sx = from + i * (starBox + starGap);
          drawPath(c, STAR_PATH, sx, y, starBox, 18, faint);
          const part = clamp01(stars - i);
          if (part > 0) {
            c.save();
            c.beginPath();
            c.rect(sx, y, starBox * part, starBox);
            c.clip();
            drawPath(c, STAR_PATH, sx, y, starBox, 18, ink);
            c.restore();
          }
        }
        tags.forEach((tag, i) => {
          const mx = centre
            ? from + across - (tags.length - i) * markBox - (tags.length - i - 1) * markGap
            : x + wide - (tags.length - i) * markBox - (tags.length - i - 1) * markGap;
          drawPath(c, SYMBOLS[tag], mx, y, markBox, 256, ink);
        });
        y += 10.5 * k * u;
      }
      if (artistLine) {
        drawArtist(c, artistLine, centre ? x + wide / 2 : x, y, { size: 2.9 * k * u, tracking: 0.24, wide, least: c.canvas.width * 0.02, colour: ink, mono, align });
        y += 5.4 * k * u;
      }
      c.font = fontAt(k);
      c.textBaseline = 'top';
      c.textAlign = align;
      c.fillStyle = ink;
      lines.forEach((line, i) => c.fillText(line, centre ? x + wide / 2 : x, y + i * lead));
      c.textAlign = 'left';
    },
  };
}

export const easeOut = v => 1 - (1 - v) ** 3;

export const posterScene = night => (record, frame, { art, families, still = false }) => {
  const SHEET = night ? INKS.night.paper : INKS.day.paper;
  const { bars, favs } = record;
  const W = frame.w, H = frame.h;
  const u = Math.min(W, (H * 9) / 16) / 100;

  // The cover takes the head of the sheet, off the edges where it can.
  const size = Math.min(W, H * 0.6);
  const ax = (W - size) / 2;
  const floorH = bars.length ? H * 0.14 : 0;
  const margin = 5 * u;
  const roomTop = size + 3 * u;
  // A favourite's heart stands on its own bar, as on the card (Miyel, 2026-11-06).
  const hasHearts = favs.some(Boolean) && bars.length > 0;
  const heartBox = Math.min(4.2 * u, (bars.length ? W / bars.length : 0) * 0.8);
  const heartLift = 1 * u;
  const clearance = bars.length ? 1.5 * u + (hasHearts ? heartBox + heartLift : 0) : 0;
  const wordsEnd = H - floorH - clearance - margin * (bars.length ? 0 : 1);
  const room = wordsEnd - roomTop;
  const rows = factRows({ record, families, u, wide: W - margin * 2, room });
  const rowsTop = wordsEnd - rows.height;

  // ── The picture ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const { ink: words, faint } = inkOf(hueOf(art), night);
  const solid = coverOf(art, size);

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
    c.drawImage(markIn(art, markW, markH, words), 1.8 * u, 1.2 * u);
  });

  const slot = bars.length ? W / bars.length : 0;
  const barGap = Math.min(0.9 * u, slot * 0.14);

  function paintAt(c, t) {
    c.drawImage(under, 0, 0);

    // Everything under the cover comes up from the bottom, together.
    const up = (1 - easeOut(clamp01((t - RISES_AT) / RISES_IN))) * (H - size);
    c.save();
    c.translate(0, up);
    bars.forEach((v, i) => {
      const h = Math.max(floorH * 0.05, floorH * v);
      c.fillStyle = words;
      c.fillRect(i * slot + barGap / 2, H - h, slot - barGap, h);
    });
    c.restore();

    const coverY = -(1 - easeOut(clamp01(t / GLIDES_IN))) * size;
    c.drawImage(solid, ax, coverY);
    c.drawImage(tab, 0, 0);

    c.save();
    c.beginPath();
    c.rect(0, size, W, H - size);
    c.clip();
    c.translate(0, up);
    rows.paint(c, margin, rowsTop, words, faint);

    // A favourite: a heart standing on its bar, in the same one colour.
    bars.forEach((v, i) => {
      if (!favs[i]) return;
      const h = Math.max(floorH * 0.05, floorH * v);
      drawPath(c, HEART_PATH, i * slot + (slot - heartBox) / 2, H - h - heartBox - heartLift, heartBox, 24, words);
    });
    c.restore();
  }

  let t = still ? 30 : 0;
  return {
    step(dt) { t += dt; },
    paint(c) { paintAt(c, t); },
  };
};
