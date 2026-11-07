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
// by day and lifted at night so it reads; a black-and-white cover prints in black or
// white (Miyel, 2026-11-06). The title sits clear of the bars, since it would vanish on them.
//
// Reading the colours is by the pixel. A cover that will not be read throws here, and
// the print falls back to Day.
'use client';

import {
  INKS, STAR_PATH, HEART_PATH, SYMBOLS, MARK_ASPECT,
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

// The album's two strongest hues, far enough apart to tell: `first` is null on a cover with
// no colour to speak of, `second` null on a cover with only the one.
export function huesOf(art) {
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
  if (vivid / (px.length / 4) < PLAIN_FLOOR) return { first: null, second: null };
  let first = 0;
  bins.forEach((v, i) => { if (v > bins[first]) first = i; });
  const apart = i => { const d = Math.abs(i - first) * 10; return Math.min(d, 360 - d); };
  let second = -1;
  bins.forEach((v, i) => {
    if (apart(i) < 60 || v < bins[first] * 0.12) return;
    if (second < 0 || v > bins[second]) second = i;
  });
  return { first: first * 10 + 5, second: second < 0 ? null : second * 10 + 5 };
}

export const hueOf = art => huesOf(art).first;

// A story's frame: Instagram lays its own name and buttons over the top of it, and the
// poster's Link sticker needs somewhere to sit near the foot, so a look leaves both clear.
export const isStory = frame => frame.w / frame.h < 0.6;

// The one colour on a plain page: deepened by day and lifted at night so it reads. A
// black-and-white cover prints in black by day and white at night (Miyel, 2026-11-06).
export function inkOf(hue, night) {
  if (hue === null) {
    return night
      ? { ink: '#ffffff', faint: 'rgba(255,255,255,0.2)' }
      : { ink: '#000000', faint: 'rgba(0,0,0,0.18)' };
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

// Whose journal it is: the keeper's face in a circle and their name, and no other words,
// to be set wherever suits the look (Miyel, 2026-11-06). Null with no name.
export function signatureOf({ art, record, mono, height, colour, faceOnly = false }) {
  const name = (record.keeper || '').toUpperCase();
  if (!name) return null;
  const px = height * 0.52, gap = height * 0.28;
  const hasFace = art?.face?.naturalWidth;
  // A face alone, where the look asks for it; a keeper with no picture still gets their name.
  const showName = !(faceOnly && hasFace);
  const font = `400 ${px}px ${mono}`;
  const measure = document.createElement('canvas').getContext('2d');
  measure.font = font;
  const across = showName ? (hasFace ? height + gap : 0) + measure.measureText(name).width : height;
  return sheet(across, height, c => {
    if (hasFace) {
      const { naturalWidth: w, naturalHeight: h } = art.face;
      const side = Math.min(w, h);
      c.save();
      c.beginPath();
      c.arc(height / 2, height / 2, height / 2, 0, Math.PI * 2);
      c.clip();
      c.drawImage(art.face, (w - side) / 2, (h - side) / 2, side, side, 0, 0, height, height);
      c.restore();
    }
    if (!showName) return;
    c.font = font;
    c.textBaseline = 'middle';
    c.fillStyle = colour;
    c.fillText(name, hasFace ? height + gap : 0, height / 2 + px * 0.04);
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

// The cover blurred across a whole page, under a wash of the page's colour. Safari's canvas
// has no blur filter, so where it is missing a cover shrunk and stretched back does the job.
export function reflectionOf(art, W, H, night, wash = 0) {
  return sheet(W, H, c => {
    c.fillStyle = (night ? INKS.night : INKS.day).paper;
    c.fillRect(0, 0, W, H);
    const cover = art?.cover;
    if (cover?.naturalWidth) {
      const side = Math.max(W, H) * 1.3;
      const x = (W - side) / 2, y = (H - side) / 2;
      if (typeof c.filter === 'string') {
        c.filter = `blur(${Math.round(W * 0.06)}px) saturate(1.25)`;
        c.drawImage(cover, x, y, side, side);
        c.filter = 'none';
      } else {
        // In steps, so the stretching itself leaves no grid behind.
        const tiny = sheet(16, 16, t => t.drawImage(cover, 0, 0, 16, 16));
        const soft = sheet(96, 96, t => { t.imageSmoothingQuality = 'high'; t.drawImage(tiny, 0, 0, 96, 96); });
        c.imageSmoothingQuality = 'high';
        c.drawImage(soft, x, y, side, side);
      }
    }
    if (wash) {
      c.fillStyle = night ? `rgba(14,14,14,${wash})` : `rgba(238,240,236,${wash})`;
      c.fillRect(0, 0, W, H);
    }
  });
}

// A light's glow in its own shape, the shape itself drawn off the sheet so only its shadow lands.
export function glowOf(path, viewBox, box, colour, halo) {
  return sheet(box + halo * 2, box + halo * 2, g => {
    const away = (box + halo * 2) * 2;
    g.shadowColor = colour;
    g.shadowBlur = halo * 0.7;
    g.shadowOffsetX = away;
    drawPath(g, path, halo - away, halo, box, viewBox, colour);
    drawPath(g, path, halo - away, halo, box, viewBox, colour);
  });
}

const warmed = since => { const v = clamp01(since / 0.5); return v * v * (3 - 2 * v); };
const breathing = since => warmed(since) * (0.78 + 0.22 * Math.sin(since * 2.4));

// The rows of words every look but the card shares: stars and marks, the artist, the
// title. Measured for the room given, then painted wherever the look wants them.
export function factRows({ record, families, u, wide, room, align = 'left', size = 14, lights = null }) {
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
  // With `lights`, the stars and marks come on one by one and glow, as on the card, all in
  // the one colour.
  const halo = 3.6 * k * u;
  const starGlow = lights ? glowOf(STAR_PATH, 18, starBox, lights.colour, halo) : null;
  const markGlows = lights ? Object.fromEntries(tags.map(tag => [tag, glowOf(SYMBOLS[tag], 256, markBox, lights.colour, halo)])) : {};
  return {
    height: heightAt(k, lines.length),
    paint(c, x, top, ink, faint, t = 30) {
      let y = top;
      if (stars > 0 || tags.length) {
        const across = (stars > 0 ? 5 * starBox + 4 * starGap : 0) + (tags.length ? (stars > 0 ? 3 * markGap : 0) + tags.length * markBox + (tags.length - 1) * markGap : 0);
        const from = centre ? x + (wide - across) / 2 : x;
        for (let i = 0; i < 5 && stars > 0; i++) {
          const sx = from + i * (starBox + starGap);
          drawPath(c, STAR_PATH, sx, y, starBox, 18, faint);
          const part = clamp01(stars - i);
          const since = lights ? t - (lights.starsAt + i * 0.2) : 1;
          if (part > 0 && since > 0) {
            if (lights) {
              c.globalAlpha = (lights.still ? 0.9 : breathing(since)) * part;
              c.drawImage(starGlow, sx - halo, y - halo);
              c.globalAlpha = lights.still ? 1 : warmed(since);
            }
            c.save();
            c.beginPath();
            c.rect(sx, y, starBox * part, starBox);
            c.clip();
            drawPath(c, STAR_PATH, sx, y, starBox, 18, lights ? lights.colour : ink);
            c.restore();
            c.globalAlpha = 1;
          }
        }
        tags.forEach((tag, i) => {
          const mx = centre
            ? from + across - (tags.length - i) * markBox - (tags.length - i - 1) * markGap
            : x + wide - (tags.length - i) * markBox - (tags.length - i - 1) * markGap;
          if (!lights) { drawPath(c, SYMBOLS[tag], mx, y, markBox, 256, ink); return; }
          const since = t - (lights.starsAt + 1 + i * 0.28);
          drawPath(c, SYMBOLS[tag], mx, y, markBox, 256, faint);
          if (since > 0) {
            c.globalAlpha = lights.still ? 0.9 : breathing(since);
            c.drawImage(markGlows[tag], mx - halo, y - halo);
            c.globalAlpha = lights.still ? 1 : warmed(since);
            drawPath(c, SYMBOLS[tag], mx, y, markBox, 256, lights.colour);
            c.globalAlpha = 1;
          }
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
  const story = isStory(frame);
  const base = H - (story ? 14 * u : 0);  // the band under the bars is the sticker's
  const floorH = bars.length ? H * (story ? 0.11 : 0.14) : 0;
  const margin = 5 * u;
  const roomTop = size + 3 * u;
  // A favourite's heart stands on its own bar, as on the card (Miyel, 2026-11-06).
  const hasHearts = favs.some(Boolean) && bars.length > 0;
  const heartBox = Math.min(4.2 * u, (bars.length ? W / bars.length : 0) * 0.8);
  const heartLift = 1 * u;
  const clearance = bars.length ? 1.5 * u + (hasHearts ? heartBox + heartLift : 0) : 0;
  const wordsEnd = base - floorH - clearance - margin * (bars.length ? 0 : 1);
  const room = wordsEnd - roomTop;

  // ── The picture ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const { ink: words, faint } = inkOf(hueOf(art), night);
  const solid = coverOf(art, size);
  const rows = factRows({
    record, families, u, wide: W - margin * 2, room,
    lights: { colour: words, starsAt: RISES_AT + 0.5, still },
  });
  const rowsTop = wordsEnd - rows.height;

  // ── The sheet ─────────────────────────────────────────────────────────
  const under = sheet(W, H, c => {
    c.fillStyle = SHEET;
    c.fillRect(0, 0, W, H);
  });
  // The mark and whose journal it is, on a tab of the sheet at the cover's foot, clear of
  // what Instagram lays over the top.
  const markH = 3.8 * u, markW = markH * MARK_ASPECT;
  const signature = signatureOf({ art, record, mono: families.mono, height: 6.6 * u, colour: words });
  const tab = sheet(markW + 3.6 * u + (signature ? signature.width + 1.6 * u : 0), Math.max(markH, 6.6 * u) + 2.4 * u, c => {
    c.fillStyle = SHEET;
    c.fillRect(0, 0, c.canvas.width, c.canvas.height);
    c.drawImage(markIn(art, markW, markH, words), 1.8 * u, (c.canvas.height - markH) / 2);
    if (signature) c.drawImage(signature, markW + 3.4 * u, (c.canvas.height - signature.height) / 2);
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
      c.fillRect(i * slot + barGap / 2, base - h, slot - barGap, h);
    });
    c.restore();

    const coverY = -(1 - easeOut(clamp01(t / GLIDES_IN))) * size;
    c.drawImage(solid, ax, coverY);
    c.drawImage(tab, ax, coverY + size - tab.height);

    c.save();
    c.beginPath();
    c.rect(0, size, W, H - size);
    c.clip();
    c.translate(0, up);
    rows.paint(c, margin, rowsTop, words, faint, t);

    // A favourite: a heart standing on its bar, in the same one colour.
    bars.forEach((v, i) => {
      if (!favs[i]) return;
      const h = Math.max(floorH * 0.05, floorH * v);
      drawPath(c, HEART_PATH, i * slot + (slot - heartBox) / 2, base - h - heartBox - heartLift, heartBox, 24, words);
    });
    c.restore();
  }

  let t = still ? 30 : 0;
  return {
    step(dt) { t += dt; },
    paint(c) { paintAt(c, t); },
  };
};
