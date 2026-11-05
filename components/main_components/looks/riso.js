// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/riso.js
// Riso: everything becomes two inks. The cover is two plates, red and blue, each
// the cover in grey screened over its ink and the pair multiplied onto the paper.
// They fly in from opposite corners and land almost in register: what is left of
// the misalignment at rest is the entire style. The stars and marks are stamped
// twice, the title has a ghost, and a dot screen lies over all of it.
'use client';

import {
  ALBUM_CORNER, ARRIVES, STAR_PATH, HEART_PATH, SYMBOLS, MARK_ASPECT,
  drawArtist, popped, easeOut, sheet, stamp, drawStarRow, fitTitle, barsFloor,
} from '../SharePrinter';

const PAPER = '#f4f0e5';
const INK = '#1a1a1a';
const RED = '#e8513f';
const BLUE = '#3b5fbd';
const GHOST = 'rgba(59,95,189,0.62)';
const MARKS = { fav: RED, formative: '#2a7a4c', mp: BLUE };
const LANDS_IN = 2.4;

// One plate: the cover in grey, with its darks in this ink and its lights left to
// the paper. By the pixel, because not every browser's canvas has a grey filter.
// A cover that will not be read throws here, and the print falls back to Day.
function inkPlate(cover, size, ink) {
  const grey = sheet(size, size, c => {
    if (cover?.naturalWidth) c.drawImage(cover, 0, 0, size, size);
    else { c.fillStyle = '#888'; c.fillRect(0, 0, size, size); }
    const image = c.getImageData(0, 0, c.canvas.width, c.canvas.height);
    const px = image.data;
    for (let i = 0; i < px.length; i += 4) {
      const v = Math.min(255, (px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11) * 1.22);
      px[i] = px[i + 1] = px[i + 2] = v;
    }
    c.putImageData(image, 0, 0);
  });
  return sheet(size, size, c => {
    c.beginPath();
    c.roundRect(0, 0, size, size, size * ALBUM_CORNER);
    c.clip();
    c.fillStyle = ink;
    c.fillRect(0, 0, size, size);
    c.globalCompositeOperation = 'screen';
    c.drawImage(grey, 0, 0);
  });
}

export function risoScene(record, frame, { art, families, still = false }) {
  const { stars, artistLine, tags, bars, favs, entry } = record;
  const { sans, mono } = families;
  const W = frame.w, H = frame.h;
  const u = Math.min(W, (H * 9) / 16) / 100;
  const cx = W / 2;

  const size = 62 * u;
  const albumTop = H * 0.145;
  const floorH = bars.length ? H * 0.15 : 0;
  const roomTop = albumTop + size + 5 * u;
  const room = H - floorH - 2.5 * u - roomTop;
  const heightAt = (k, lines) => ((stars > 0 ? 12 : 0) + (tags.length ? 12.5 : 0) + lines * 11.6 + (artistLine ? 5.6 : 0)) * k * u;
  const titleFont = k => `900 ${11 * k * u}px ${sans}`;
  const { k, lines: titleLines } = fitTitle({ album: entry?.album, fontAt: titleFont, wide: W * 0.86, room, heightAt });
  const rowsH = heightAt(k, titleLines.length);
  const rowsTop = roomTop + Math.max(0, room - rowsH) / 2;

  const plateRed = inkPlate(art?.cover, size, RED);
  const plateBlue = inkPlate(art?.cover, size, BLUE);
  const restBlue = [1.7 * u, 1.3 * u];

  const under = sheet(W, H, c => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, W, H);
    const markH = 4.2 * u, markW = markH * MARK_ASPECT;
    if (art?.mark) c.drawImage(art.mark, cx - markW / 2, H * 0.05, markW, markH);
    // The press's own marks: crosshairs in two corners, and a colour bar.
    c.fillStyle = 'rgba(26,26,26,0.6)';
    const reach = 4.4 * u, thin = Math.max(1, 0.3 * u);
    [3.4 * u, W - 3.4 * u - reach].forEach(x => {
      const y = 3.4 * u;
      c.fillRect(x + reach / 2 - thin / 2, y, thin, reach);
      c.fillRect(x, y + reach / 2 - thin / 2, reach, thin);
    });
    const swatchW = 3 * u, swatchH = 2.2 * u;
    [RED, BLUE, INK].forEach((ink, i) => {
      c.fillStyle = ink;
      c.fillRect(W - 3.4 * u - swatchW, H - floorH - 11 * u + i * (swatchH + 0.5 * u), swatchW, swatchH);
    });
  });

  // The dot screen, multiplied over everything.
  const dots = sheet(W, H, c => {
    c.fillStyle = 'rgba(26,26,26,0.13)';
    const pitch = Math.max(4, 1.4 * u), r = pitch * 0.2;
    for (let y = pitch / 2; y < H; y += pitch) {
      for (let x = pitch / 2; x < W; x += pitch) {
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fill();
      }
    }
  });

  const off = [0.6 * u, 0.45 * u];
  const starBox = 9 * k * u, starPad = 2 * u;
  const starLit = stamp(STAR_PATH, 18, starBox, starPad, [{ fill: GHOST, x: off[0], y: off[1] }, { fill: RED }]);
  const starCold = stamp(STAR_PATH, 18, starBox, starPad, [{ fill: 'rgba(26,26,26,0.14)' }]);
  const markBox = 8.6 * k * u, markPad = 2 * u;
  const marks = Object.fromEntries(tags.map(tag => [tag, stamp(SYMBOLS[tag], 256, markBox, markPad, [
    { fill: tag === 'mp' ? 'rgba(232,81,63,0.6)' : GHOST, x: off[0], y: off[1] },
    { fill: MARKS[tag] },
  ])]));

  const lead = 11.6 * k * u, titlePad = 3 * u;
  const titleArt = sheet(W, titleLines.length * lead + titlePad * 2, c => {
    c.font = titleFont(k);
    c.textAlign = 'center';
    c.textBaseline = 'top';
    c.fillStyle = 'rgba(232,81,63,0.75)';
    titleLines.forEach((text, i) => c.fillText(text, cx + 0.7 * u, titlePad + i * lead + 0.5 * u));
    c.fillStyle = INK;
    titleLines.forEach((text, i) => c.fillText(text, cx, titlePad + i * lead));
  });

  const floor = barsFloor({
    W, H, floorH, u, bars, favs,
    left: 2 * u, gapMost: 1.1 * u, seg: 1 * u, pitch: 1 * u,
    colourOf: () => '#6e86c8',
    heart: stamp(HEART_PATH, 24, 3.6 * u, 1 * u, [{ fill: RED }]),
  });

  function paintAt(c, t) {
    c.drawImage(under, 0, 0);
    floor.draw(c, t);

    // The plates land from opposite corners, never quite together.
    const v = easeOut(Math.min(1, t / LANDS_IN));
    const away = 1 - v;
    c.save();
    c.globalCompositeOperation = 'multiply';
    c.drawImage(plateRed, cx - size / 2 - away * W, albumTop - away * H * 0.4);
    c.drawImage(plateBlue, cx - size / 2 + restBlue[0] + away * W, albumTop + restBlue[1] + away * H * 0.4);
    c.restore();

    let y = rowsTop;
    if (stars > 0) {
      const gap = 1.2 * k * u;
      drawStarRow(c, t, { stars, x: cx - (starBox * 5 + gap * 4) / 2, y, box: starBox, gap, pad: starPad, lit: starLit, cold: starCold });
      y += 12 * k * u;
    }
    if (tags.length) {
      const gap = 4 * k * u;
      const left = cx - (tags.length * markBox + (tags.length - 1) * gap) / 2;
      const markY = y;
      tags.forEach((tag, i) => {
        const x = left + i * (markBox + gap);
        popped(c, ARRIVES.tags + i * 0.15, x + markBox / 2, markY + markBox / 2, () => c.drawImage(marks[tag], x - markPad, markY - markPad), t);
      });
      y += 12.5 * k * u;
    }
    const titleY = y;
    popped(c, ARRIVES.title, cx, titleY + lead / 2, () => c.drawImage(titleArt, 0, titleY - titlePad), t);
    y += titleLines.length * lead;
    if (artistLine) {
      const artistY = y + 1.6 * k * u;
      popped(c, ARRIVES.artist, cx, artistY + 1.5 * u, () => {
        drawArtist(c, artistLine, cx, artistY, { size: 2.9 * k * u, tracking: 0.26, wide: W * 0.9, least: W * 0.02, colour: BLUE, mono });
      }, t);
    }

    c.save();
    c.globalCompositeOperation = 'multiply';
    c.drawImage(dots, 0, 0);
    c.restore();
  }

  let t = still ? 30 : 0;
  return {
    step(dt) { t += dt; },
    paint(c) { paintAt(c, t); },
  };
}
