// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/crt.js
// CRT: everything becomes broadcast. The picture opens from a horizontal line,
// overshoots bright and settles; scanlines over everything and a band rolling
// slowly down. The stars are phosphor, the marks channel glyphs in brackets, the
// horizon a VU meter, and an on-screen display sits in the corner.
//
// The tears are at uneven times on purpose: a glitch on a metronome stops reading
// as a fault and starts reading as animation.
'use client';

import {
  ARRIVES, STAR_PATH, HEART_PATH, SYMBOLS, MARK_ASPECT,
  drawTracked, drawArtist, roundRect, popped, easeOut, clamp01, paintGround,
  sheet, stamp, drawStarRow, fitTitle, barsFloor,
} from '../SharePrinter';

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

export function crtScene(record, frame, { art, families, still = false }) {
  const { stars, artistLine, tags, bars, favs, entry } = record;
  const { sans, mono } = families;
  const W = frame.w, H = frame.h;
  const u = Math.min(W, (H * 9) / 16) / 100;
  const cx = W / 2;

  const size = 60 * u;
  const albumTop = H * 0.15;
  const floorH = bars.length ? H * 0.17 : 0;
  const roomTop = albumTop + size + 5 * u;
  const room = H - floorH - 2.5 * u - roomTop;
  const heightAt = (k, lines) => ((stars > 0 ? 12 : 0) + (tags.length ? 13 : 0) + lines * 11.6 + (artistLine ? 5.6 : 0)) * k * u;
  const titleFont = k => `900 ${11 * k * u}px ${sans}`;
  const { k, lines: titleLines } = fitTitle({ album: entry?.album, fontAt: titleFont, wide: W * 0.86, room, heightAt });
  const rowsH = heightAt(k, titleLines.length);
  const rowsTop = roomTop + Math.max(0, room - rowsH) / 2;

  // ── What never changes ────────────────────────────────────────────────
  const corner = size * 0.017;
  const face = (paint) => sheet(size, size, c => {
    c.beginPath();
    c.roundRect(0, 0, size, size, corner);
    c.clip();
    if (art?.cover?.naturalWidth) c.drawImage(art.cover, 0, 0, size, size);
    else { c.fillStyle = '#333'; c.fillRect(0, 0, size, size); }
    paint?.(c);
  });
  const tint = colour => face(c => {
    c.globalCompositeOperation = 'multiply';
    c.fillStyle = colour;
    c.fillRect(0, 0, size, size);
  });
  const tearRed = tint('#ff2850'), tearBlue = tint('#2864ff');

  const under = sheet(W, H, c => {
    paintGround(c, frame, art?.cover, '#05050a', 'rgba(6,6,14,0.74)', { tone: 'saturate(1.7) brightness(0.78)', blur: 0.08 });
    const scrimH = Math.max(H * 0.3, rowsH * 1.25), scrimMid = rowsTop + rowsH / 2;
    const scrim = c.createLinearGradient(0, scrimMid - scrimH / 2, 0, scrimMid + scrimH / 2);
    scrim.addColorStop(0, 'rgba(6,6,14,0)');
    scrim.addColorStop(0.5, 'rgba(6,6,14,0.86)');
    scrim.addColorStop(1, 'rgba(6,6,14,0)');
    c.fillStyle = scrim;
    c.fillRect(0, scrimMid - scrimH / 2, W, scrimH);
    // The album, with its cold bloom.
    c.save();
    c.shadowColor = 'rgba(110,190,255,0.42)';
    c.shadowBlur = 9 * u;
    c.fillStyle = '#000';
    roundRect(c, cx - size / 2, albumTop, size, size, corner);
    c.fill();
    c.restore();
    c.drawImage(face(), cx - size / 2, albumTop);
    // The furniture: the mark, and the on-screen display.
    const markH = 3.6 * u;
    if (art?.mark) c.drawImage(art.mark, 6 * u, H * 0.05, markH * MARK_ASPECT, markH);
    c.font = `400 ${2.5 * u}px ${mono}`;
    c.textBaseline = 'top';
    c.shadowBlur = 2 * u;
    c.shadowColor = 'rgba(127,240,180,0.8)';
    c.fillStyle = '#7ff0b4';
    drawTracked(c, 'CH 04', W - 6 * u, H * 0.05, 0.45 * u, 'right');
    c.shadowColor = 'rgba(255,210,74,0.8)';
    c.fillStyle = AMBER;
    drawTracked(c, 'AV-1', W - 6 * u, H * 0.05 + 3.4 * u, 0.45 * u, 'right');
    c.shadowBlur = 0;
  });

  // The glass: scanlines, and the tube darkening to its edges.
  const glass = sheet(W, H, c => {
    c.fillStyle = 'rgba(0,0,0,0.32)';
    const pitch = Math.max(3, 0.82 * u), line = Math.max(1.5, 0.34 * u);
    for (let y = 0; y < H; y += pitch) c.fillRect(0, y, W, line);
    const reach = Math.hypot(W, H) / 2;
    const tube = c.createRadialGradient(W / 2, H / 2, reach * 0.55, W / 2, H / 2, reach);
    tube.addColorStop(0, 'rgba(0,0,0,0)');
    tube.addColorStop(1, 'rgba(0,0,0,0.6)');
    c.fillStyle = tube;
    c.fillRect(0, 0, W, H);
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
    c.textAlign = 'center';
    c.textBaseline = 'top';
    const line = (x, fill) => {
      c.fillStyle = fill;
      titleLines.forEach((text, i) => c.fillText(text, x, titlePad + i * lead));
    };
    line(cx - 0.55 * u, 'rgba(255,30,70,0.8)');
    line(cx + 0.55 * u, 'rgba(40,130,255,0.8)');
    c.shadowColor = 'rgba(190,215,255,0.55)';
    c.shadowBlur = 4 * u;
    line(cx, '#eef2ff');
  });

  // The VU meter: LEDs, green with two amber channels.
  const ambers = bars.length >= 8 ? [3, 7] : [bars.length - 1];
  const isAmber = i => ambers.includes(i);
  const floor = barsFloor({
    W, H, floorH, u, bars, favs,
    left: 2.6 * u, gapMost: 1.1 * u, seg: 1.1 * u, pitch: 1.9 * u,
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

  const plate = sheet(W, H, () => {});
  const onPlate = plate.getContext('2d');

  function picture(c, t) {
    c.drawImage(under, 0, 0);
    floor.draw(c, t);
    const tear = tearAt(t);
    if (tear) {
      c.save();
      c.globalCompositeOperation = 'screen';
      c.globalAlpha = still ? 0.42 : 0.65;
      c.drawImage(tearRed, cx - size / 2 - 2.4 * u * tear, albumTop);
      c.drawImage(tearBlue, cx - size / 2 + 2.4 * u * tear, albumTop);
      c.restore();
    }
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
      y += 13 * k * u;
    }
    const titleY = y;
    popped(c, ARRIVES.title, cx, titleY + lead / 2, () => c.drawImage(titleArt, 0, titleY - titlePad), t);
    y += titleLines.length * lead;
    if (artistLine) {
      const artistY = y + 1.6 * k * u;
      popped(c, ARRIVES.artist, cx, artistY + 1.5 * u, () => {
        drawArtist(c, artistLine, cx, artistY, { size: 2.9 * k * u, tracking: 0.3, wide: W * 0.9, least: W * 0.02, colour: '#8e9ac4', mono });
      }, t);
    }
    c.drawImage(glass, 0, 0);
    if (!still) {
      const bandH = H * 0.16;
      const top = -bandH + ((t % ROLL_SECONDS) / ROLL_SECONDS) * (H + bandH);
      const band = c.createLinearGradient(0, top, 0, top + bandH);
      band.addColorStop(0, 'rgba(190,220,255,0)');
      band.addColorStop(0.45, 'rgba(190,220,255,0.11)');
      band.addColorStop(1, 'rgba(190,220,255,0)');
      c.fillStyle = band;
      c.fillRect(0, top, W, bandH);
    }
  }

  function paintAt(c, t) {
    if (t >= OPENS_IN) { picture(c, t); return; }
    // Switching on: a bright line opens into the picture.
    onPlate.setTransform(1, 0, 0, 1, 0, 0);
    picture(onPlate, t);
    const v = clamp01(t / OPENS_IN);
    c.fillStyle = '#05050a';
    c.fillRect(0, 0, W, H);
    const open = Math.max(0.004, easeOut(clamp01(v * 1.6)));
    const wide = 1 + 0.1 * (1 - clamp01(v * 2));
    c.save();
    c.translate(W / 2, H / 2);
    c.scale(wide, open);
    c.drawImage(plate, -W / 2, -H / 2);
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = `rgba(255,255,255,${0.75 * (1 - v)})`;
    c.fillRect(-W / 2, -H / 2, W, H);
    c.restore();
  }

  let t = still ? 30 : 0;
  return {
    step(dt) { t += dt; },
    paint(c) { paintAt(c, t); },
  };
}
