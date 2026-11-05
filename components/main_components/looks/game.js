// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/game.js
// Game: everything becomes a HUD. The album is a slab with its sides showing,
// turning over a slow fan of rays; the title is a logo, the horizon an XP bar. It
// is close to monochrome: the stars, sparks, hairlines and bars all borrow the
// album's one colour (Miyel, 2026-11-04). Hearts and the fingerprint keep their own.
//
// Sizes are in `u`, a hundredth of a story's width at this paper's height, so
// the print is the same composition on every paper.
'use client';

import {
  ARRIVES, TONES, STAR_PATH, HEART_PATH, SYMBOLS, MARK_ASPECT, INKS,
  drawArtist, popped, easeOut, easeBack,
  coverPicture, drawTurned, rayPicture, paintGround,
  sheet, stamp, drawStarRow, fitTitle, barsFloor,
} from '../SharePrinter';
import { colorOfArt, COLOR_SIDE } from '../../../library/music_data_api';

const SWEEP_SECONDS = 7;
const SWEEP_ANGLE = (26 * Math.PI) / 180;
const SPARKS = [
  { x: -36, y: -16.6, at: 0.2, rest: 0.9 },
  { x: 32, y: -2.3, at: 1.1, rest: 1.2 },
  { x: -34, y: 24, at: 1.9, rest: 0.7 },
];

// The album's colour, read the way the wall's By color reads it, and deep enough
// to stand on the reflected cover whatever that cover is. A cover with hardly any
// colour, or one that will not be read, gets a plain dark.
function albumColour(cover) {
  try {
    const small = sheet(COLOR_SIDE, COLOR_SIDE, c => c.drawImage(cover, 0, 0, COLOR_SIDE, COLOR_SIDE));
    const { hue, plain } = colorOfArt(small.getContext('2d').getImageData(0, 0, COLOR_SIDE, COLOR_SIDE).data);
    // Yellows are pale at any lightness the others are deep at.
    if (!plain) return { h: Math.round(hue), s: 72, l: hue > 35 && hue < 80 ? 33 : 42 };
  } catch { /* the plain dark, then */ }
  return { h: 0, s: 0, l: 24 };
}

export function gameScene(record, frame, { art, families, still = false }) {
  const { stars, artistLine, tags, bars, favs, entry } = record;
  const { sans, mono } = families;
  const W = frame.w, H = frame.h;
  const u = Math.min(W, (H * 9) / 16) / 100;
  const cx = W / 2;
  const { h: hue, s: sat, l: lit } = albumColour(art?.cover);
  const deep = `hsl(${hue},${sat}%,${lit}%)`;
  const dark = `hsl(${hue},${sat}%,${Math.round(lit * 0.5)}%)`;
  const tone = alpha => `hsla(${hue},${sat}%,${lit}%,${alpha})`;

  // ── Where everything goes ─────────────────────────────────────────────
  const size = 58 * u;
  const albumTop = H * 0.14;
  const cy = albumTop + size / 2;
  const floorH = bars.length ? H * 0.15 : 0;
  const floorTop = H - floorH;
  const roomTop = albumTop + size + 5 * u;
  const room = floorTop - 2.5 * u - roomTop;
  const heightAt = (k, lines) => ((stars > 0 ? 13 : 0) + (tags.length ? 15 : 0) + lines * 9.6 + (artistLine ? 5.6 : 0)) * k * u;
  const titleFont = k => `900 ${9 * k * u}px ${sans}`;
  const { k, lines: titleLines } = fitTitle({ album: entry?.album, fontAt: titleFont, wide: W * 0.86, room, heightAt });
  const rowsH = heightAt(k, titleLines.length);
  const rowsTop = roomTop + Math.max(0, room - rowsH) / 2;

  // ── What never changes, kept as pictures ──────────────────────────────
  const under = sheet(W, H, c => {
    // The cover reflected, as on Day: neither the dark the first one wore nor
    // plain white (Miyel, 2026-11-04).
    paintGround(c, frame, art?.cover, INKS.day.paper, INKS.day.wash);
    // The frame in the album's colour, split at the head for the mark, which sits
    // centred on the line (Miyel, 2026-11-04).
    const inset = 4.4 * u, r = 2 * u;
    const markH = 4.6 * u, markW = markH * MARK_ASPECT;
    const opening = markW / 2 + 2 * u;
    const x0 = inset, x1 = W - inset, y0 = inset, y1 = H - inset;
    c.strokeStyle = tone(0.5);
    c.lineWidth = 0.35 * u;
    c.beginPath();
    c.moveTo(cx + opening, y0);
    c.arcTo(x1, y0, x1, y1, r);
    c.arcTo(x1, y1, x0, y1, r);
    c.arcTo(x0, y1, x0, y0, r);
    c.arcTo(x0, y0, cx - opening, y0, r);
    c.lineTo(cx - opening, y0);
    c.stroke();
    if (art?.mark) {
      c.drawImage(sheet(markW, markH, m => {
        m.drawImage(art.mark, 0, 0, markW, markH);
        m.globalCompositeOperation = 'source-in';
        m.fillStyle = deep;
        m.fillRect(0, 0, markW, markH);
      }), cx - markW / 2, y0 - markH / 2);
    }
  });
  const slab = coverPicture(art?.cover, size, { shade: 0.5, ring: tone(0.45) });
  const rays = rayPicture(170 * u, 'rgba(255,255,255,0.22)', 14);

  // A hard shadow in the darker shade of the same colour.
  const starBox = 9 * k * u, starPad = 3 * u;
  const starLit = stamp(STAR_PATH, 18, starBox, starPad, [
    { fill: dark, y: 0.5 * k * u },
    { fill: deep },
  ]);
  const starCold = stamp(STAR_PATH, 18, starBox, starPad, [{ fill: tone(0.18) }]);

  // The marks: the icons themselves, filled, not on medallions. The heart and the
  // fingerprint keep their own colours; everything else borrows the album's
  // (Miyel, 2026-11-04).
  const medalBox = 11 * k * u, medalPad = 2 * u;
  const medals = Object.fromEntries(tags.map(tag => [tag, stamp(SYMBOLS[tag], 256, medalBox, medalPad, [
    { fill: tag === 'mp' ? dark : 'rgba(0,0,0,0.3)', y: 0.5 * k * u },
    { fill: tag === 'mp' ? deep : TONES[tag] },
  ])]));

  // The logo: a face dropped below the title, the outline round it, the white on
  // top. Stroked, then filled, in that order: a stroke drawn after would eat
  // into the letters.
  const titleSize = 9 * k * u, lead = 9.6 * k * u, titlePad = 4 * u;
  const logo = sheet(W, titleLines.length * lead + titlePad * 2, c => {
    c.font = titleFont(k);
    c.textAlign = 'center';
    c.textBaseline = 'top';
    c.lineJoin = 'round';
    const line = (fn, dy = 0) => titleLines.forEach((text, i) => fn(text, cx, titlePad + i * lead + dy));
    c.fillStyle = dark;
    c.strokeStyle = dark;
    c.lineWidth = titleSize * 0.085;
    c.save();
    c.shadowColor = tone(0.3);
    c.shadowBlur = 3 * u;
    c.shadowOffsetY = 1 * u;
    line((text, x, y) => { c.strokeText(text, x, y); c.fillText(text, x, y); }, titleSize * 0.11);
    c.restore();
    line((text, x, y) => c.strokeText(text, x, y));
    c.fillStyle = '#fff';
    line((text, x, y) => c.fillText(text, x, y));
  });

  // The XP bar, its last chunk earned the bright one; the hearts red.
  const floor = barsFloor({
    W, H, floorH, u, bars, favs,
    left: 4.4 * u, gapMost: 1.3 * u, seg: 1.5 * u, pitch: 2.2 * u,
    colourOf: () => deep, glowOf: () => tone(0.55), glow: 1.6 * u,
    cap: 'rgba(255,255,255,0.4)',
    heart: stamp(HEART_PATH, 24, 3.6 * u, 2.4 * u, [{ fill: TONES.fav, glow: 1.4 * u, glowColour: 'rgba(240,72,79,0.6)' }]),
  });

  function drawSparks(c, t) {
    SPARKS.forEach(spark => {
      const swell = still ? spark.rest : Math.sin((((t + spark.at) % 2.6) / 2.6) * Math.PI) * 1.3;
      if (swell <= 0.02) return;
      const x = cx + spark.x * u, y = cy + spark.y * u, r = 1.3 * u * swell;
      c.fillStyle = deep;
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
        drawArtist(c, artistLine, cx, artistY, { size: 2.9 * k * u, tracking: 0.3, wide: W * 0.9, least: W * 0.02, colour: dark, mono });
      }, t);
    }
  }

  let t = still ? 30 : 0;
  return {
    step(dt) { t += dt; },
    paint(c) { paintAt(c, t); },
  };
}
