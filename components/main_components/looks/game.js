// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/game.js
// Game: everything becomes a HUD. The album is a slab with its sides showing,
// turning over a slow fan of rays; the stars are collectibles, the marks earned
// medallions, the title a logo, the horizon an XP bar. A costume somebody chose,
// so it may be louder than the default: the rays and sparks that came off the
// default stay here, the rays pale rather than gold (Miyel, 2026-11-04).
//
// Sizes are in `u`, a hundredth of a story's width at this paper's height, so
// the print is the same composition on every paper.
'use client';

import {
  ARRIVES, TONES, STAR_PATH, HEART_PATH, SYMBOLS, MARK_ASPECT, INKS,
  drawTracked, drawArtist, roundRect, popped, easeOut, easeBack,
  coverPicture, drawTurned, rayPicture, paintGround,
  sheet, stamp, drawStarRow, fitTitle, barsFloor,
} from '../SharePrinter';
import { colorOfArt, COLOR_SIDE } from '../../../library/music_data_api';

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

// The bars' colour, from the album (Miyel, 2026-11-04), read the way the wall's
// By color reads it, and deep enough to stand on the reflected cover whatever
// that cover is. A cover with hardly any colour, or one that will not be read,
// gets a plain dark.
function barColour(cover) {
  try {
    const small = sheet(COLOR_SIDE, COLOR_SIDE, c => c.drawImage(cover, 0, 0, COLOR_SIDE, COLOR_SIDE));
    const { hue, plain } = colorOfArt(small.getContext('2d').getImageData(0, 0, COLOR_SIDE, COLOR_SIDE).data);
    // Yellows are pale at any lightness the others are deep at.
    if (!plain) return `${Math.round(hue)},72%,${hue > 35 && hue < 80 ? 33 : 42}%`;
  } catch { /* the plain dark, then */ }
  return '0,0%,24%';
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
  const heightAt = (k, lines) => ((stars > 0 ? 13 : 0) + (tags.length ? 15 : 0) + lines * 12.6 + (artistLine ? 5.6 : 0)) * k * u;
  const titleFont = k => `900 ${12 * k * u}px ${sans}`;
  const { k, lines: titleLines } = fitTitle({ album: entry?.album, fontAt: titleFont, wide: W * 0.86, room, heightAt });
  const rowsH = heightAt(k, titleLines.length);
  const rowsTop = roomTop + Math.max(0, room - rowsH) / 2;

  // ── What never changes, kept as pictures ──────────────────────────────
  const under = sheet(W, H, c => {
    // The cover reflected, as on Day: neither the dark the first one wore nor
    // plain white (Miyel, 2026-11-04).
    paintGround(c, frame, art?.cover, INKS.day.paper, INKS.day.wash);
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
  const rays = rayPicture(170 * u, 'rgba(255,255,255,0.22)', 14);

  // A hard shadow under a warm glow.
  const starBox = 9 * k * u, starPad = 3 * u;
  const starLit = stamp(STAR_PATH, 18, starBox, starPad, [
    { fill: '#8a5a00', y: 0.5 * k * u, glow: 2.4 * u, glowColour: 'rgba(255,200,70,0.75)' },
    { fill: YELLOW, stroke: '#4a2d00' },
  ]);
  const starCold = stamp(STAR_PATH, 18, starBox, starPad, [{ fill: '#ece9f2', stroke: '#c9c3d9' }]);

  const medalBox = 11 * k * u, medalPad = 3.4 * u;
  const medals = Object.fromEntries(tags.map(tag => [tag, sheet(medalBox + medalPad * 2, medalBox + medalPad * 2, c => {
    const r = medalBox / 2, mid = medalPad + r;
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.45)';
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
  const logo = sheet(W, titleLines.length * lead + titlePad * 2, c => {
    c.font = titleFont(k);
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

  // The XP bar, in the album's colour, its last chunk earned the bright one; the
  // hearts red (Miyel, 2026-11-04).
  const barHsl = bars.length ? barColour(art?.cover) : null;
  const floor = barsFloor({
    W, H, floorH, u, bars, favs,
    left: 3.4 * u, gapMost: 1.3 * u, seg: 1.5 * u, pitch: 2.2 * u,
    colourOf: () => `hsl(${barHsl})`, glowOf: () => `hsla(${barHsl},0.55)`, glow: 1.6 * u,
    cap: 'rgba(255,255,255,0.4)',
    heart: stamp(HEART_PATH, 24, 3.6 * u, 2.4 * u, [{ fill: TONES.fav, glow: 1.4 * u, glowColour: 'rgba(240,72,79,0.6)' }]),
  });

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
    c.rotate((t * Math.PI * 2) / 40);
    c.drawImage(rays, -rays.width / 2, -rays.height / 2);
    c.restore();
    // The page's colour behind the words, as on Day: a cover can be any colour.
    const scrimH = Math.max(H * 0.3, rowsH * 1.25), scrimMid = rowsTop + rowsH / 2;
    const scrim = c.createLinearGradient(0, scrimMid - scrimH / 2, 0, scrimMid + scrimH / 2);
    scrim.addColorStop(0, 'rgba(238,240,236,0)');
    scrim.addColorStop(0.5, 'rgba(238,240,236,0.86)');
    scrim.addColorStop(1, 'rgba(238,240,236,0)');
    c.fillStyle = scrim;
    c.fillRect(0, scrimMid - scrimH / 2, W, scrimH);
    floor.draw(c, t);
    drawAlbum(c, t);
    drawSparks(c, t);

    let y = rowsTop;
    if (stars > 0) {
      const gap = 1.8 * k * u;
      drawStarRow(c, t, { stars, x: cx - (starBox * 5 + gap * 4) / 2, y, box: starBox, gap, pad: starPad, lit: starLit, cold: starCold });
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
        drawArtist(c, artistLine, cx, artistY, { size: 2.9 * k * u, tracking: 0.3, wide: W * 0.9, least: W * 0.02, colour: '#5a4e7a', mono });
      }, t);
    }
  }

  let t = still ? 30 : 0;
  return {
    step(dt) { t += dt; },
    paint(c) { paintAt(c, t); },
  };
}
