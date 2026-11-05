// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/crt.js
// CRT: the album on a square television at the head of the page, in its casing,
// with the record's information on the set's base below (Miyel, 2026-11-04). The
// picture opens from a horizontal line, overshoots bright and settles; scanlines,
// a rolling band and an on-screen display belong to the glass and stay on it. The
// stars are phosphor, the marks channel glyphs in brackets, the horizon a VU meter.
//
// The tears are at uneven times on purpose: a glitch on a metronome stops reading
// as a fault and starts reading as animation.
'use client';

import {
  ARRIVES, STAR_PATH, HEART_PATH, SYMBOLS, MARK_ASPECT,
  drawTracked, drawArtist, roundRect, popped, easeOut, clamp01,
  sheet, stamp, drawStarRow, fitTitle, barsFloor,
} from '../SharePrinter';
import { colorOfArt, COLOR_SIDE } from '../../../library/music_data_api';

const BODY = '#121216';
const RED = 'rgba(255,40,80,0.75)';
const BLUE = 'rgba(60,140,255,0.75)';
const GREEN = '#4bf2a0';
const AMBER = '#ffd24a';
const MARKS = { fav: '#ff9aa2', formative: '#7ff0b4', mp: '#9ac8ff' };
const TEARS = [2.3, 5.3, 10.9, 12.6];   // and round again every TEARS_EVERY seconds
const TEARS_EVERY = 17;
const TEAR_LASTS = 0.14;
const ROLL_SECONDS = 5.2;
const OPENS_IN = 1.1;

function coverLight(cover) {
  try {
    const small = sheet(COLOR_SIDE, COLOR_SIDE, c => c.drawImage(cover, 0, 0, COLOR_SIDE, COLOR_SIDE));
    return colorOfArt(small.getContext('2d').getImageData(0, 0, COLOR_SIDE, COLOR_SIDE).data).light;
  } catch {
    return 1;
  }
}

export function crtScene(record, frame, { art, families, still = false }) {
  const { stars, artistLine, tags, bars, favs, entry } = record;
  const { sans, mono } = families;
  const W = frame.w, H = frame.h;
  const u = Math.min(W, (H * 9) / 16) / 100;

  // ── The set ───────────────────────────────────────────────────────────
  const casing = 2.8 * u;
  const size = Math.min(W - 2 * (5 * u + casing), H * 0.56);
  const sx = (W - size) / 2, sy = 3.5 * u + casing;
  const corner = 4.5 * u;

  // The base: everything lines up with the screen above it.
  const left = sx;
  const wide = size;
  const baseTop = sy + size + casing;
  const chin = 7 * u;
  const floorH = bars.length ? Math.min(H * 0.12, (H - baseTop) * 0.34) : 0;
  const rowsBottom = H - floorH - 3.5 * u;
  const room = rowsBottom - baseTop - chin;
  const heightAt = (k, lines) => ((stars > 0 || tags.length ? 13 : 0) + lines * 11.6 + (artistLine ? 5.6 : 0)) * k * u;
  const titleFont = k => `900 ${11 * k * u}px ${sans}`;
  const { k, lines: titleLines } = fitTitle({ album: entry?.album, fontAt: titleFont, wide, room, heightAt });
  const rowsTop = baseTop + chin + Math.max(0, room - heightAt(k, titleLines.length)) / 2;

  // ── What never changes ────────────────────────────────────────────────
  const face = paint => sheet(size, size, c => {
    if (art?.cover?.naturalWidth) c.drawImage(art.cover, 0, 0, size, size);
    else { c.fillStyle = '#222'; c.fillRect(0, 0, size, size); }
    paint?.(c);
  });
  const tint = colour => face(c => {
    c.globalCompositeOperation = 'multiply';
    c.fillStyle = colour;
    c.fillRect(0, 0, size, size);
  });
  const tearRed = tint('#ff2850'), tearBlue = tint('#2864ff');
  const picturePlain = sheet(size, size, c => {
    c.drawImage(face(), 0, 0);
    // A dark cover turned up: a screen is lit from inside, whatever is on it.
    if (coverLight(art?.cover) < 0.32) {
      c.globalCompositeOperation = 'screen';
      c.globalAlpha = 0.65;
      c.drawImage(face(), 0, 0);
    }
  });

  const under = sheet(W, H, c => {
    c.fillStyle = BODY;
    c.fillRect(0, 0, W, H);
    // The casing round the screen, and the cold light it throws on it.
    const x = sx - casing, y = sy - casing, s = size + casing * 2;
    const metal = c.createLinearGradient(0, y, 0, y + s);
    metal.addColorStop(0, '#3a3a42');
    metal.addColorStop(1, '#222228');
    c.fillStyle = metal;
    roundRect(c, x, y, s, s, corner + casing * 0.7);
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.1)';
    c.lineWidth = 0.25 * u;
    c.stroke();
    c.save();
    c.shadowColor = 'rgba(110,190,255,0.3)';
    c.shadowBlur = 3.5 * u;
    c.fillStyle = '#000';
    roundRect(c, sx, sy, size, size, corner);
    c.fill();
    c.restore();
    // The mark on the set, as a maker's badge.
    const markH = 3.4 * u, markW = markH * MARK_ASPECT;
    if (art?.mark) c.drawImage(art.mark, W / 2 - markW / 2, baseTop + (chin - markH) / 2, markW, markH);
  });

  // The glass: scanlines, the tube darkening to its edges, the on-screen display.
  const glass = sheet(size, size, c => {
    c.fillStyle = 'rgba(0,0,0,0.32)';
    const pitch = Math.max(3, 0.82 * u), line = Math.max(1.5, 0.34 * u);
    for (let y = 0; y < size; y += pitch) c.fillRect(0, y, size, line);
    const reach = (size * Math.SQRT2) / 2;
    const tube = c.createRadialGradient(size / 2, size / 2, reach * 0.6, size / 2, size / 2, reach);
    tube.addColorStop(0, 'rgba(0,0,0,0)');
    tube.addColorStop(1, 'rgba(0,0,0,0.7)');
    c.fillStyle = tube;
    c.fillRect(0, 0, size, size);
    c.font = `400 ${2.5 * u}px ${mono}`;
    c.textBaseline = 'top';
    c.shadowBlur = 2 * u;
    c.shadowColor = 'rgba(127,240,180,0.8)';
    c.fillStyle = '#7ff0b4';
    drawTracked(c, 'CH 04', size - 3.5 * u, 3.5 * u, 0.45 * u, 'right');
    c.shadowColor = 'rgba(255,210,74,0.8)';
    c.fillStyle = AMBER;
    drawTracked(c, 'AV-1', size - 3.5 * u, 6.9 * u, 0.45 * u, 'right');
  });

  const starBox = 9 * k * u, starPad = 4 * u;
  const fringe = 0.45 * u;
  const starLit = stamp(STAR_PATH, 18, starBox, starPad, [
    { fill: RED, x: -fringe },
    { fill: BLUE, x: fringe },
    { fill: '#ffe9a8', glow: 2.6 * u, glowColour: 'rgba(255,230,160,0.6)' },
  ]);
  const starCold = stamp(STAR_PATH, 18, starBox, starPad, [{ fill: 'rgba(190,205,255,0.22)' }]);

  const markBox = 9.6 * k * u, markPad = 2 * u;
  const marks = Object.fromEntries(tags.map(tag => [tag, sheet(markBox + markPad * 2, markBox + markPad * 2, c => {
    // Brackets: the four corners of a box, not the box.
    c.strokeStyle = 'rgba(190,215,255,0.55)';
    c.lineWidth = 0.4 * u;
    const a = markPad, b = markPad + markBox, arm = markBox * 0.26;
    [[a, a, 1, 1], [b, a, -1, 1], [a, b, 1, -1], [b, b, -1, -1]].forEach(([x, y, dx, dy]) => {
      c.beginPath();
      c.moveTo(x + dx * arm, y);
      c.lineTo(x, y);
      c.lineTo(x, y + dy * arm);
      c.stroke();
    });
    const glyph = markBox * 0.66;
    c.drawImage(stamp(SYMBOLS[tag], 256, glyph, 0, [
      { fill: 'rgba(255,40,80,0.6)', x: -0.3 * u },
      { fill: 'rgba(60,140,255,0.6)', x: 0.3 * u },
      { fill: MARKS[tag] },
    ]), markPad + (markBox - glyph) / 2, markPad + (markBox - glyph) / 2);
  })]));

  const lead = 11.6 * k * u, titlePad = 5 * u;
  const titleArt = sheet(W, titleLines.length * lead + titlePad * 2, c => {
    c.font = titleFont(k);
    c.textAlign = 'left';
    c.textBaseline = 'top';
    const line = (x, fill) => {
      c.fillStyle = fill;
      titleLines.forEach((text, i) => c.fillText(text, x, titlePad + i * lead));
    };
    line(left - 0.55 * u, 'rgba(255,30,70,0.8)');
    line(left + 0.55 * u, 'rgba(40,130,255,0.8)');
    c.shadowColor = 'rgba(190,215,255,0.55)';
    c.shadowBlur = 4 * u;
    line(left, '#eef2ff');
  });

  // The VU meter: LEDs, green with two amber channels.
  const ambers = bars.length >= 8 ? [3, 7] : [bars.length - 1];
  const isAmber = i => ambers.includes(i);
  const floor = barsFloor({
    W, H: H - 3 * u, floorH, u, bars, favs,
    left, gapMost: 1.1 * u, seg: 1.1 * u, pitch: 1.9 * u,
    colourOf: i => (isAmber(i) ? AMBER : GREEN),
    glowOf: i => (isAmber(i) ? 'rgba(255,210,74,0.5)' : 'rgba(75,242,160,0.5)'),
    glow: 2 * u,
    heart: stamp(HEART_PATH, 24, 3.6 * u, 2.4 * u, [{ fill: '#ff6b74', glow: 1.4 * u, glowColour: 'rgba(255,107,116,0.9)' }]),
  });

  function tearAt(t) {
    if (still) return 0.6;
    const round = t % TEARS_EVERY;
    const hit = TEARS.findIndex(at => round >= at && round < at + TEAR_LASTS);
    return hit < 0 ? 0 : hit % 2 ? 1.3 : 1;
  }

  // Everything on the glass, and only there.
  function drawScreen(c, t) {
    c.save();
    roundRect(c, sx, sy, size, size, corner);
    c.clip();
    c.fillStyle = '#05050a';
    c.fillRect(sx, sy, size, size);
    // Switching on: a bright line opens into the picture.
    const v = clamp01(t / OPENS_IN);
    const opening = !still && v < 1;
    if (opening) {
      const open = Math.max(0.004, easeOut(clamp01(v * 1.6)));
      const mid = sy + size / 2;
      c.translate(sx + size / 2, mid);
      c.scale(1 + 0.1 * (1 - clamp01(v * 2)), open);
      c.translate(-(sx + size / 2), -mid);
    }
    c.drawImage(picturePlain, sx, sy);
    const tear = tearAt(t);
    if (tear) {
      c.save();
      c.globalCompositeOperation = 'screen';
      c.globalAlpha = still ? 0.3 : 0.5;
      c.drawImage(tearRed, sx - 2.4 * u * tear, sy);
      c.drawImage(tearBlue, sx + 2.4 * u * tear, sy);
      c.restore();
    }
    c.drawImage(glass, sx, sy);
    if (!still) {
      const bandH = size * 0.22;
      const top = sy - bandH + ((t % ROLL_SECONDS) / ROLL_SECONDS) * (size + bandH);
      const band = c.createLinearGradient(0, top, 0, top + bandH);
      band.addColorStop(0, 'rgba(190,220,255,0)');
      band.addColorStop(0.45, 'rgba(190,220,255,0.11)');
      band.addColorStop(1, 'rgba(190,220,255,0)');
      c.fillStyle = band;
      c.fillRect(sx, top, size, bandH);
    }
    if (opening) {
      c.globalCompositeOperation = 'lighter';
      c.fillStyle = `rgba(255,255,255,${0.75 * (1 - v)})`;
      c.fillRect(sx, sy, size, size);
    }
    c.restore();
  }

  function paintAt(c, t) {
    c.drawImage(under, 0, 0);
    drawScreen(c, t);
    floor.draw(c, t);
    let y = rowsTop;
    if (stars > 0 || tags.length) {
      const gap = 1.2 * k * u;
      const across = stars > 0 ? starBox * 5 + gap * 4 + 3 * k * u : 0;
      if (stars > 0) drawStarRow(c, t, { stars, x: left, y, box: starBox, gap, pad: starPad, lit: starLit, cold: starCold });
      const markY = y - (markBox - starBox) / 2;
      tags.forEach((tag, i) => {
        const x = left + across + i * (markBox + 2 * k * u);
        popped(c, ARRIVES.tags + i * 0.15, x + markBox / 2, markY + markBox / 2, () => c.drawImage(marks[tag], x - markPad, markY - markPad), t);
      });
      y += 13 * k * u;
    }
    const titleY = y;
    popped(c, ARRIVES.title, left + wide / 4, titleY + lead / 2, () => c.drawImage(titleArt, 0, titleY - titlePad), t);
    y += titleLines.length * lead;
    if (artistLine) {
      const artistY = y + 1.6 * k * u;
      popped(c, ARRIVES.artist, left + wide / 4, artistY + 1.5 * u, () => {
        drawArtist(c, artistLine, left, artistY, { size: 2.9 * k * u, tracking: 0.3, wide, least: W * 0.02, colour: '#c6cfee', mono, align: 'left' });
      }, t);
    }
  }

  let t = still ? 30 : 0;
  return {
    step(dt) { t += dt; },
    paint(c) { paintAt(c, t); },
  };
}
