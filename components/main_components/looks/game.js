// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/game.js
// Game: everything becomes a HUD. The album is a slab with its sides showing,
// turning over a slow fan of rays; the stars are collectibles, the marks earned
// medallions, the title a logo, the horizon an XP bar. A costume somebody chose,
// so it may be as loud as the default is quiet: the rays, sparks and gold that
// came off the default stay here (Miyel, 2026-11-04).
//
// Sizes are in `u`, a hundredth of a story's width at this paper's height, so
// the print is the same composition on every paper. What shadows and glows cost
// to draw is paid once, on pictures made here, and not sixty times a second.
'use client';

import {
  ARRIVES, STAR_PATH, HEART_PATH, SYMBOLS, MARK_ASPECT,
  drawTracked, wrapLines, roundRect, popped, easeOut, easeBack, clamp01,
  coverPicture, drawTurned, rayPicture,
} from '../SharePrinter';

const OUTLINE = '#1b0f33';
const YELLOW = '#ffd24a';
const MEDALS = {
  fav: ['#ff7a80', '#d0323a'],
  formative: ['#6fd79a', '#28834f'],
  mp: ['#ffe08a', '#c8921f'],
};
const SWEEP_SECONDS = 7;
const SWEEP_ANGLE = (26 * Math.PI) / 180;
const SPARKS = [
  { x: -36, y: -16.6, at: 0.2, rest: 0.9 },
  { x: 32, y: -2.3, at: 1.1, rest: 1.2 },
  { x: -34, y: 24, at: 1.9, rest: 0.7 },
];

function picture(w, h, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(w));
  canvas.height = Math.max(1, Math.ceil(h));
  paint(canvas.getContext('2d'));
  return canvas;
}

export function gameScene(record, frame, { art, families, still = false }) {
  const { stars, artistLine, year, tags, bars, favs, entry } = record;
  const { sans, mono } = families;
  const W = frame.w, H = frame.h;
  const u = Math.min(W, (H * 9) / 16) / 100;
  const cx = W / 2;

  // ── Where everything goes ─────────────────────────────────────────────
  const size = 58 * u;
  const albumTop = H * 0.14;
  const cy = albumTop + size / 2;
  const floorH = bars.length ? H * 0.15 : 0;
  const floorTop = H - floorH;
  const roomTop = albumTop + size + 5 * u;
  const room = floorTop - 2.5 * u - roomTop;
  const titleWide = W * 0.86;

  const measure = document.createElement('canvas').getContext('2d');
  let k = 1, titleLines = [], rowsH = 0;
  const titleFont = () => `900 ${12 * k * u}px ${sans}`;
  const lay = () => {
    measure.font = titleFont();
    titleLines = wrapLines(measure, entry?.album || '', titleWide, 0);
    rowsH = (stars > 0 ? 13 : 0) * k * u + (tags.length ? 15 : 0) * k * u
      + titleLines.length * 12.6 * k * u + (artistLine ? 5.6 : 0) * k * u;
  };
  lay();
  // One word wider than the paper, or more lines than there is room for: the
  // whole block comes down together, title with stars and marks.
  const widest = Math.max(1, ...titleLines.map(line => measure.measureText(line).width));
  k = Math.min(1, titleWide / widest);
  lay();
  if (rowsH > room) { k *= room / rowsH; lay(); }
  const rowsTop = roomTop + Math.max(0, room - rowsH) / 2;

  // ── What never changes, kept as pictures ──────────────────────────────
  const under = picture(W, H, c => {
    // White, not the dark the first one wore (Miyel, 2026-11-04).
    c.fillStyle = '#fff';
    c.fillRect(0, 0, W, H);
    // The frame, and the two pieces of furniture: the mark on its plate, the year.
    const inset = 3.4 * u;
    c.strokeStyle = 'rgba(27,15,51,0.16)';
    c.lineWidth = 0.35 * u;
    roundRect(c, inset, inset, W - inset * 2, H - inset * 2, 2 * u);
    c.stroke();
    const markH = 3.8 * u, markW = markH * MARK_ASPECT;
    const plateX = 6 * u, plateY = 6 * u, plateW = markW + 4.8 * u, plateH = markH + 2.4 * u;
    roundRect(c, plateX, plateY, plateW, plateH, 1.4 * u);
    c.strokeStyle = 'rgba(27,15,51,0.55)';
    c.lineWidth = 0.4 * u;
    c.stroke();
    if (art?.mark) c.drawImage(art.mark, plateX + 2.4 * u, plateY + 1.2 * u, markW, markH);
    if (year) {
      c.font = `400 ${2.6 * u}px ${mono}`;
      c.textBaseline = 'middle';
      c.fillStyle = OUTLINE;
      drawTracked(c, String(year), W - 6 * u, plateY + plateH / 2, 0.52 * u, 'right');
    }
  });
  const slab = coverPicture(art?.cover, size, { shade: 0.5, ring: 'rgba(27,15,51,0.2)' });
  const rays = rayPicture(126 * u, 'rgba(240,170,40,0.34)', 28, { share: 1.6 / 13, hollow: true });

  const starBox = 9 * k * u, starPad = 3 * u;
  const starPicture = lit => picture(starBox + starPad * 2, starBox + starPad * 2, c => {
    const scale = starBox / 18;
    const path = new Path2D(STAR_PATH);
    const place = (dy = 0) => c.setTransform(scale, 0, 0, scale, starPad, starPad + dy);
    c.lineJoin = 'round';
    c.lineWidth = 1;
    if (lit) {
      // A hard shadow under a warm glow.
      c.shadowColor = 'rgba(255,200,70,0.75)';
      c.shadowBlur = 2.4 * u;
      place(0.5 * k * u);
      c.fillStyle = '#8a5a00';
      c.fill(path);
      c.shadowBlur = 0;
    }
    place();
    c.strokeStyle = lit ? '#4a2d00' : '#c9c3d9';
    c.stroke(path);
    c.fillStyle = lit ? YELLOW : '#ece9f2';
    c.fill(path);
  });
  const starLit = starPicture(true), starCold = starPicture(false);

  const medalBox = 11 * k * u, medalPad = 3.4 * u;
  const medals = Object.fromEntries(tags.map(tag => [tag, picture(medalBox + medalPad * 2, medalBox + medalPad * 2, c => {
    const r = medalBox / 2, mid = medalPad + r;
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.45)';
    c.shadowBlur = 0;
    c.shadowOffsetY = 0.7 * k * u;
    const face = c.createRadialGradient(mid - r * 0.32, mid - r * 0.44, 0, mid, mid, r * 1.1);
    face.addColorStop(0, MEDALS[tag][0]);
    face.addColorStop(1, MEDALS[tag][1]);
    c.fillStyle = face;
    c.beginPath();
    c.arc(mid, mid, r, 0, Math.PI * 2);
    c.fill();
    c.restore();
    c.strokeStyle = 'rgba(255,255,255,0.55)';
    c.lineWidth = 0.5 * k * u;
    c.beginPath();
    c.arc(mid, mid, r - 0.25 * k * u, 0, Math.PI * 2);
    c.stroke();
    const glyph = medalBox * 0.58;
    c.translate(mid - glyph / 2, mid - glyph / 2);
    c.scale(glyph / 256, glyph / 256);
    c.fillStyle = '#fff';
    c.fill(new Path2D(SYMBOLS[tag]));
  })]));

  // The logo: a face dropped below the title, the outline round it, the white on
  // top. Stroked, then filled, in that order: a stroke drawn after would eat
  // into the letters.
  const titleSize = 12 * k * u, lead = 12.6 * k * u, titlePad = 4 * u;
  const logo = picture(W, titleLines.length * lead + titlePad * 2, c => {
    c.font = titleFont();
    c.textAlign = 'center';
    c.textBaseline = 'top';
    c.lineJoin = 'round';
    const line = (fn, dy = 0) => titleLines.forEach((text, i) => fn(text, cx, titlePad + i * lead + dy));
    c.fillStyle = OUTLINE;
    c.strokeStyle = OUTLINE;
    c.lineWidth = titleSize * 0.085;
    c.save();
    c.shadowColor = 'rgba(27,15,51,0.28)';
    c.shadowBlur = 3 * u;
    c.shadowOffsetY = 1 * u;
    line((text, x, y) => { c.strokeText(text, x, y); c.fillText(text, x, y); }, titleSize * 0.11);
    c.restore();
    line((text, x, y) => c.strokeText(text, x, y));
    c.fillStyle = '#fff';
    line((text, x, y) => c.fillText(text, x, y));
  });

  // The XP bar, whole, with its glow: each bar shows as much of it as it has earned.
  const floorPad = 3 * u;
  const barsLeft = 3.4 * u;
  const slot = bars.length ? (W - barsLeft * 2) / bars.length : 0;
  const barGap = Math.min(1.3 * u, slot * 0.22);
  const barW = slot - barGap;
  const chunk = 1.5 * u, pitch = 2.2 * u;
  const chunksOf = v => Math.max(1, Math.round((floorH * v) / pitch));
  const floor = bars.length ? picture(W, floorH + floorPad, c => {
    const bottom = floorH + floorPad;
    bars.forEach((v, i) => {
      const x = barsLeft + i * slot + barGap / 2;
      const count = chunksOf(v);
      c.shadowColor = 'rgba(143,107,255,0.7)';
      c.shadowBlur = 1.6 * u;
      c.fillStyle = '#8f6bff';
      for (let n = 0; n < count; n++) {
        const y = bottom - (n + 1) * pitch + (pitch - chunk);
        c.fillRect(x, y, barW, chunk);
      }
      c.shadowBlur = 0;
      // The cap: the last one earned is the bright one.
      c.fillStyle = 'rgba(255,255,255,0.4)';
      c.fillRect(x, bottom - count * pitch + (pitch - chunk), barW, 0.6 * u);
    });
  }) : null;
  const heartBox = 3.6 * u, heartPad = 2.4 * u;
  const heart = picture(heartBox + heartPad * 2, heartBox + heartPad * 2, c => {
    c.shadowColor = 'rgba(255,210,74,0.9)';
    c.shadowBlur = 1.4 * u;
    c.translate(heartPad, heartPad);
    c.scale(heartBox / 24, heartBox / 24);
    c.fillStyle = '#f0a800';
    c.fill(new Path2D(HEART_PATH));
  });

  function drawFloor(c, t) {
    if (!floor) return;
    const sliceH = floor.height;
    bars.forEach((v, i) => {
      const x = barsLeft + i * slot;
      const earned = Math.ceil(chunksOf(v) * easeOut(clamp01((t - ARRIVES.floor - i * 0.02) / 0.9)));
      if (earned < 1) return;
      const h = Math.min(sliceH, earned * pitch + 0.8 * u);
      c.drawImage(floor, x, sliceH - h, slot, h, x, H - h, slot, h);
    });
    bars.forEach((v, i) => {
      if (!favs[i]) return;
      const x = barsLeft + i * slot + slot / 2;
      const tip = H - chunksOf(v) * pitch - 0.6 * u;
      popped(c, ARRIVES.hearts + i * 0.02, x, tip - heartBox / 2, () => {
        c.drawImage(heart, x - heart.width / 2, tip - heartBox - heartPad);
      }, t);
    });
  }

  function drawSparks(c, t) {
    SPARKS.forEach(spark => {
      const swell = still ? spark.rest : Math.sin((((t + spark.at) % 2.6) / 2.6) * Math.PI) * 1.3;
      if (swell <= 0.02) return;
      const x = cx + spark.x * u, y = cy + spark.y * u, r = 1.3 * u * swell;
      c.fillStyle = '#f0a800';
      c.beginPath();
      [[0, -1], [0.24, -0.24], [1, 0], [0.24, 0.24], [0, 1], [-0.24, 0.24], [-1, 0], [-0.24, -0.24]]
        .forEach(([dx, dy], i) => (i ? c.lineTo(x + dx * r, y + dy * r) : c.moveTo(x + dx * r, y + dy * r)));
      c.closePath();
      c.fill();
    });
  }

  function drawAlbum(c, t) {
    const rise = Math.min(1, t / 1.4);
    const scale = 0.25 + 0.75 * easeBack(rise);
    const lift = (1 - easeBack(rise)) * size * 0.46
      + (still ? 0 : Math.sin((t * Math.PI * 2) / 4.4) * size * 0.03);
    const angle = still ? -SWEEP_ANGLE * 0.7 : -SWEEP_ANGLE * Math.cos((t * Math.PI * 2) / SWEEP_SECONDS);
    drawTurned(c, slab, cx, cy + lift, size * scale, angle, size * 0.138 * scale, 40);
  }

  function paintAt(c, t) {
    c.drawImage(under, 0, 0);
    const grow = easeOut(Math.min(1, t / 0.9));
    c.save();
    c.translate(cx, cy);
    c.scale(grow, grow);
    c.rotate((t * Math.PI * 2) / 30);
    c.drawImage(rays, -rays.width / 2, -rays.height / 2);
    c.restore();
    drawFloor(c, t);
    drawAlbum(c, t);
    drawSparks(c, t);

    let y = rowsTop;
    if (stars > 0) {
      const gap = 1.8 * k * u;
      const left = cx - (starBox * 5 + gap * 4) / 2;
      for (let i = 0; i < 5; i++) {
        const x = left + i * (starBox + gap);
        popped(c, ARRIVES.stars + i * 0.2, x + starBox / 2, y + starBox / 2, () => {
          c.drawImage(starCold, x - starPad, y - starPad);
          const part = clamp01(stars - i);
          if (part > 0) {
            c.save();
            c.beginPath();
            c.rect(x - starPad, y - starPad, starPad + starBox * part + (part === 1 ? starPad : 0), starLit.height);
            c.clip();
            c.drawImage(starLit, x - starPad, y - starPad);
            c.restore();
          }
        }, t);
      }
      y += 13 * k * u;
    }
    if (tags.length) {
      const gap = 4.4 * k * u;
      const left = cx - (tags.length * medalBox + (tags.length - 1) * gap) / 2;
      const medalY = y;
      tags.forEach((tag, i) => {
        const x = left + i * (medalBox + gap);
        popped(c, ARRIVES.tags + i * 0.15, x + medalBox / 2, medalY + medalBox / 2, () => {
          c.drawImage(medals[tag], x - medalPad, medalY - medalPad);
        }, t);
      });
      y += 15 * k * u;
    }
    const titleY = y;
    popped(c, ARRIVES.title, cx, titleY + lead / 2, () => c.drawImage(logo, 0, titleY - titlePad), t);
    y += titleLines.length * lead;
    if (artistLine) {
      const artistY = y + 1.6 * k * u;
      popped(c, ARRIVES.artist, cx, artistY + 1.5 * u, () => {
        c.font = `400 ${2.9 * k * u}px ${mono}`;
        c.textBaseline = 'top';
        c.fillStyle = '#5a4e7a';
        drawTracked(c, artistLine, cx, artistY, 0.87 * k * u, 'center');
      }, t);
    }
  }

  let t = still ? 30 : 0;
  return {
    step(dt) { t += dt; },
    paint(c) { paintAt(c, t); },
  };
}
