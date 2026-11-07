// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/game.js
// Game: everything becomes a HUD. The album is a slab with its sides showing,
// turning over a slow fan of rays; the title is a logo, the horizon an XP bar. The
// hairlines and bars borrow the album's one colour; the stars are gold and each mark its
// own colour (Miyel, 2026-11-06). The keeper is the player, in the frame's head.
// Cut, then brought back beside Commercial, with a night of its own (2026-11-06).
//
// Sizes are in `u`, a hundredth of a story's width at this paper's height, so
// the print is the same composition on every paper.
'use client';

import {
  STAR_PATH, HEART_PATH, SYMBOLS, MARK_ASPECT, INKS,
  drawArtist, clamp01, roundRect, sheet, fitTitle,
} from '../SharePrinter';
import { colorOfArt, COLOR_SIDE } from '../../../library/music_data_api';

// ── Its own drawing tools ─────────────────────────────────────────────────
const ALBUM_CORNER = 0.055;     // of the album's width: the post's 16px on its cover

const TONES = { fav: '#f0484f', mp: '#4a9bf0', formative: '#3fa96b' };

// When each thing on a record's print arrives, after the album has landed, and
// the way it arrives.
const ARRIVES = { stars: 1.3, tags: 2.5, title: 1.15, artist: 1.35, floor: 2.9, hearts: 3.8 };

const POP = 0.45;

const easeOut = v => 1 - (1 - v) ** 3;

const easeBack = v => { const k = 1.70158; const u = v - 1; return 1 + (k + 1) * u ** 3 + k * u ** 2; };

function popped(c, at, x, y, drawIt, t) {
  const v = clamp01((t - at) / POP);
  if (v <= 0) return;
  const scale = easeBack(v);
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  c.translate(-x, -y);
  drawIt();
  c.restore();
}

// The album as a picture with round corners, and the two ends of it a turned
// album shows. `shade` darkens those ends; `ring` is a hairline round the face.
function coverPicture(img, size, { shade = 0.16, ring = null } = {}) {
  const s = Math.max(1, Math.round(size));
  const flat = document.createElement('canvas');
  flat.width = flat.height = s;
  const f = flat.getContext('2d');
  if (img?.naturalWidth) {
    const k = Math.max(s / img.naturalWidth, s / img.naturalHeight);
    f.drawImage(img, (s - img.naturalWidth * k) / 2, (s - img.naturalHeight * k) / 2, img.naturalWidth * k, img.naturalHeight * k);
  } else {
    f.fillStyle = '#777';
    f.fillRect(0, 0, s, s);
  }
  const rounded = paint => {
    const c = document.createElement('canvas');
    c.width = c.height = s;
    const x = c.getContext('2d');
    x.beginPath();
    x.roundRect(0, 0, s, s, s * ALBUM_CORNER);
    x.clip();
    paint(x);
    return c;
  };
  const picture = rounded(x => {
    x.drawImage(flat, 0, 0);
    if (ring) {
      x.strokeStyle = ring;
      x.lineWidth = s * 0.016;
      x.beginPath();
      x.roundRect(0, 0, s, s, s * ALBUM_CORNER);
      x.stroke();
    }
  });
  // The album's thickness: its own edge stretched across the same outline and a
  // little shaded, one for each side it can turn to show.
  const sided = col => rounded(x => {
    x.drawImage(flat, col, 0, Math.min(2, s), s, 0, 0, s, s);
    x.fillStyle = `rgba(0,0,0,${shade})`;
    x.fillRect(0, 0, s, s);
  });
  picture.sides = { [-1]: sided(0), [1]: sided(Math.max(0, s - 2)) };
  return picture;
}

// The album at an angle, `depth` thick, its corners round like every cover in
// the app.
function drawTurned(c, picture, cx, cy, size, angle, depth, layersMost = 14) {
  const hs = size / 2;
  const eye = size * 3.2;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const point = (u, side) => {
    const x = u * hs * cos + side * (depth / 2) * sin;
    const z = -u * hs * sin + side * (depth / 2) * cos;
    const p = eye / (eye - z);
    return { x: cx + x * p, half: hs * p };
  };
  const w = picture.width, h = picture.height;
  const u = sin < 0 ? 1 : -1;
  const a = point(u, 1), b = point(u, -1);
  // The shadow is cast by the album's own outline at this angle, so it turns
  // with it. A square here stayed square and its corners showed. A pixel inside
  // the album, so the dark under it never shows round a corner.
  const outline = (p, q) => {
    const [l, r] = p.x < q.x ? [p, q] : [q, p];
    const x0 = l.x + 1, x1 = r.x - 1, h0 = l.half - 1, h1 = r.half - 1;
    const wide = Math.max(1, x1 - x0);
    const corner = size * ALBUM_CORNER;
    const rx = corner * wide / size, ry0 = corner * h0 / hs, ry1 = corner * h1 / hs;
    const edge = x => h0 + (h1 - h0) * (x - x0) / wide;
    const K = 0.4477;                  // how far short of a corner a round one's handles stop
    c.beginPath();
    c.moveTo(x0 + rx, cy - edge(x0 + rx));
    c.lineTo(x1 - rx, cy - edge(x1 - rx));
    c.bezierCurveTo(x1 - rx * K, cy - h1, x1, cy - h1 + ry1 * K, x1, cy - h1 + ry1);
    c.lineTo(x1, cy + h1 - ry1);
    c.bezierCurveTo(x1, cy + h1 - ry1 * K, x1 - rx * K, cy + h1, x1 - rx, cy + edge(x1 - rx));
    c.lineTo(x0 + rx, cy + edge(x0 + rx));
    c.bezierCurveTo(x0 + rx * K, cy + h0, x0, cy + h0 - ry0 * K, x0, cy + h0 - ry0);
    c.lineTo(x0, cy - h0 + ry0);
    c.bezierCurveTo(x0, cy - h0 + ry0 * K, x0 + rx * K, cy - h0, x0 + rx, cy - edge(x0 + rx));
    c.closePath();
  };
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.32)';
  c.shadowBlur = size * 0.09;
  c.shadowOffsetY = size * 0.035;
  c.fillStyle = 'rgba(0,0,0,0.9)';
  outline(point(-1, 1), point(1, 1));
  c.fill();
  c.restore();
  // Vertical strips, each the height the album is at that point.
  const strips = (art, side, from, to, count) => {
    for (let i = 0; i < count; i++) {
      const u0 = from + ((to - from) * i) / count, u1 = from + ((to - from) * (i + 1)) / count;
      const p0 = point(u0, side), p1 = point(u1, side);
      const wide = Math.abs(p1.x - p0.x);
      if (wide < 0.01) continue;
      const mid = (p0.half + p1.half) / 2;
      c.drawImage(art, ((u0 + 1) / 2) * w, 0, ((u1 - u0) / 2) * w, h, Math.min(p0.x, p1.x), cy - mid, wide + 0.8, mid * 2);
    }
  };
  // The thickness, back to front: the outline's end, again and again, so the
  // corners stay round round the side too.
  const across = Math.abs(b.x - a.x);
  if (across > 0.5 && picture.sides) {
    const layers = Math.min(layersMost, Math.ceil(across / 1.5));
    const reach = ALBUM_CORNER * 4;
    for (let i = 0; i < layers; i++) {
      const side = -1 + (2 * i) / layers;
      if (u > 0) strips(picture.sides[1], side, 1 - reach, 1, 6);
      else strips(picture.sides[-1], side, -1, -1 + reach, 6);
    }
  }
  strips(picture, 1, -1, 1, 48);
}

// `share` is how much of each wedge's turn it fills; `hollow` leaves the middle
// clear, for rays that start behind an album rather than under it.
function rayPicture(size, colour, wedges, { share = 1 / 3, hollow = false } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = Math.max(1, Math.round(size));
  const x = c.getContext('2d');
  const r = c.width / 2;
  x.translate(r, r);
  x.fillStyle = colour;
  for (let i = 0; i < wedges; i++) {
    const a = (i * Math.PI * 2) / wedges;
    x.beginPath();
    x.moveTo(0, 0);
    x.arc(0, 0, r, a, a + (Math.PI * 2) / wedges * share);
    x.closePath();
    x.fill();
  }
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalCompositeOperation = 'destination-in';
  const g = x.createRadialGradient(r, r, r * 0.15, r, r, r);
  g.addColorStop(0, hollow ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,1)');
  if (hollow) g.addColorStop(0.25, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

// The cover blurred across the paper, overscanned so no edge shows.
function paintGround(c, f, img, paper, wash, { tone = 'saturate(1.25)', blur = 0.03 } = {}) {
  c.fillStyle = paper;
  c.fillRect(0, 0, f.w, f.h);
  if (img?.naturalWidth) {
    const s = Math.max(f.w / img.naturalWidth, f.h / img.naturalHeight) * 1.3;
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    c.save();
    if (typeof c.filter === 'string') {
      c.filter = `blur(${Math.round(f.w * blur)}px) ${tone}`;
      c.drawImage(img, (f.w - dw) / 2, (f.h - dh) / 2, dw, dh);
    } else {
      // No filter on this canvas (Safari): a picture shrunk to a few pixels and
      // stretched back is a blur by another route.
      const tiny = document.createElement('canvas');
      tiny.width = 12; tiny.height = 12;
      const t = tiny.getContext('2d');
      t.imageSmoothingQuality = 'high';
      t.drawImage(img, 0, 0, 12, 12);
      c.imageSmoothingQuality = 'high';
      c.drawImage(tiny, (f.w - dw) / 2, (f.h - dh) / 2, dw, dh);
    }
    c.restore();
  }
  c.fillStyle = wash;
  c.fillRect(0, 0, f.w, f.h);
}

// A glyph as a picture, `pad` of room round it for its glow, drawn in layers,
// back to front: { fill, stroke, lineWidth, x, y, glow, glowColour }.
function stamp(path, viewBox, box, pad, layers) {
  return sheet(box + pad * 2, box + pad * 2, c => {
    const shape = new Path2D(path);
    const scale = box / viewBox;
    layers.forEach(({ fill, stroke, lineWidth = 1, x = 0, y = 0, glow = 0, glowColour = 'transparent' }) => {
      c.save();
      c.shadowColor = glowColour;
      c.shadowBlur = glow;
      c.setTransform(scale, 0, 0, scale, pad + x, pad + y);
      if (stroke) {
        c.lineJoin = 'round';
        c.strokeStyle = stroke;
        c.lineWidth = lineWidth;
        c.stroke(shape);
      }
      if (fill) {
        c.fillStyle = fill;
        c.fill(shape);
      }
      c.restore();
    });
  });
}

// Five stars from two stamps, the lit one over the cold one as far as the rating.
function drawStarRow(c, t, { stars, x, y, box, gap, pad, lit, cold }) {
  for (let i = 0; i < 5; i++) {
    const at = x + i * (box + gap);
    popped(c, ARRIVES.stars + i * 0.2, at + box / 2, y + box / 2, () => {
      c.drawImage(cold, at - pad, y - pad);
      const part = clamp01(stars - i);
      if (part > 0) {
        c.save();
        c.beginPath();
        c.rect(at - pad, y - pad, pad + box * part + (part === 1 ? pad : 0), lit.height);
        c.clip();
        c.drawImage(lit, at - pad, y - pad);
        c.restore();
      }
    }, t);
  }
}

// The horizon as bars of stacked segments, whole, with their glow: each bar
// shows as much of it as it has earned, and a heart lands on a favourite.
function barsFloor({ W, H, floorH, left, gapMost, seg, pitch, u, colourOf, glow = 0, glowOf = null, cap = null, bars, favs, heart }) {
  if (!bars.length) return { draw() {} };
  const pad = 3 * u;
  const slot = (W - left * 2) / bars.length;
  const gap = Math.min(gapMost, slot * 0.22);
  const countOf = v => Math.max(1, Math.round((floorH * v) / pitch));
  const whole = sheet(W, floorH + pad, c => {
    const bottom = floorH + pad;
    bars.forEach((v, i) => {
      const x = left + i * slot + gap / 2;
      const count = countOf(v);
      c.shadowColor = glowOf ? glowOf(i) : 'transparent';
      c.shadowBlur = glow;
      c.fillStyle = colourOf(i);
      for (let n = 0; n < count; n++) c.fillRect(x, bottom - (n + 1) * pitch + (pitch - seg), slot - gap, seg);
      c.shadowBlur = 0;
      if (cap) {
        c.fillStyle = cap;
        c.fillRect(x, bottom - count * pitch + (pitch - seg), slot - gap, 0.6 * u);
      }
    });
  });
  const heartBox = 3.6 * u;
  return {
    draw(c, t) {
      bars.forEach((v, i) => {
        const x = left + i * slot;
        const earned = Math.ceil(countOf(v) * easeOut(clamp01((t - ARRIVES.floor - i * 0.02) / 0.9)));
        if (earned < 1) return;
        const h = Math.min(whole.height, earned * pitch + 0.8 * u);
        c.drawImage(whole, x, whole.height - h, slot, h, x, H - h, slot, h);
      });
      bars.forEach((v, i) => {
        if (!favs[i] || !heart) return;
        const x = left + i * slot + slot / 2;
        const tip = H - countOf(v) * pitch - 0.6 * u;
        popped(c, ARRIVES.hearts + i * 0.02, x, tip - heartBox / 2, () => {
          c.drawImage(heart, x - heart.width / 2, tip - heartBox - (heart.height - heartBox) / 2);
        }, t);
      });
    },
  };
}

// ── The look ──────────────────────────────────────────────────────────────
const SWEEP_SECONDS = 7;
const SWEEP_ANGLE = (26 * Math.PI) / 180;
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

export const gameScene = night => (record, frame, { art, families, still = false }) => {
  const { stars, artistLine, tags, bars, favs, entry } = record;
  const { sans, mono } = families;
  const W = frame.w, H = frame.h;
  const u = Math.min(W, (H * 9) / 16) / 100;
  const cx = W / 2;
  const { h: hue, s: sat, l: colourLit } = albumColour(art?.cover);
  // Lifted at night, to stand on the dark reflection. A colourless cover goes pale.
  const lit = night ? (sat ? 62 : 78) : colourLit;
  const deep = `hsl(${hue},${sat}%,${lit}%)`;
  const dark = `hsl(${hue},${sat}%,${Math.round((night ? colourLit : lit) * 0.5)}%)`;
  const tone = alpha => `hsla(${hue},${sat}%,${lit}%,${alpha})`;

  // ── Where everything goes ─────────────────────────────────────────────
  const size = 58 * u;
  const albumTop = H * 0.14;
  const cy = albumTop + size / 2;
  // A story leaves Instagram's top alone and the foot for the Link sticker.
  const story = W / H < 0.6;
  const base = H - (story ? 12 * u : 0);
  const floorH = bars.length ? H * 0.11 : 0;
  const floorTop = base - floorH;
  const roomTop = albumTop + size + 5 * u;
  const room = floorTop - 2.5 * u - roomTop;
  const heightAt = (k, lines) => ((stars > 0 ? 13 : 0) + (tags.length ? 15 : 0) + lines * 7 + (artistLine ? 5.6 : 0)) * k * u;
  const titleFont = k => `900 ${6.6 * k * u}px ${sans}`;
  const { k, lines: titleLines } = fitTitle({ album: entry?.album, fontAt: titleFont, wide: W * 0.86, room, heightAt });
  const rowsH = heightAt(k, titleLines.length);
  const rowsTop = roomTop + Math.max(0, room - rowsH) / 2;

  // ── What never changes, kept as pictures ──────────────────────────────
  const under = sheet(W, H, c => {
    // The cover reflected, as on Day: neither the dark the first one wore nor
    // plain white (Miyel, 2026-11-04).
    const ink = night ? INKS.night : INKS.day;
    paintGround(c, frame, art?.cover, ink.paper, night ? 'rgba(14,14,14,0.62)' : ink.wash);
    // The frame in the album's colour, split at the head for the mark, which sits
    // centred on the line (Miyel, 2026-11-04).
    const inset = 4.4 * u, r = 2 * u;
    const markH = 4.6 * u, markW = markH * MARK_ASPECT;
    const opening = markW / 2 + 2 * u;
    const x0 = inset, x1 = W - inset, y0 = story ? 13 * u : inset, y1 = H - inset;
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
    if (record.keeper) {
      c.font = `400 ${2.3 * u}px ${mono}`;
      c.textAlign = 'center';
      c.textBaseline = 'top';
      c.fillStyle = night ? '#ffffff' : dark;
      c.fillText(`PLAYER · ${record.keeper.toUpperCase()}`, cx, y0 + 3.2 * u);
      c.textAlign = 'left';
    }
  });
  const slab = coverPicture(art?.cover, size, { shade: 0.5, ring: tone(0.45) });
  const rays = rayPicture(170 * u, 'rgba(255,255,255,0.22)', 14);

  // A hard shadow in the darker shade of the same colour.
  const starBox = 9 * k * u, starPad = 3 * u;
  const starLit = stamp(STAR_PATH, 18, starBox, starPad, [
    { fill: '#9c7420', y: 0.5 * k * u },
    { fill: '#e8b84b' },
  ]);
  const starCold = stamp(STAR_PATH, 18, starBox, starPad, [{ fill: 'rgba(232,184,75,0.2)' }]);

  // The marks: the icons themselves, filled, not on medallions. The heart and the
  // fingerprint keep their own colours; everything else borrows the album's
  // (Miyel, 2026-11-04).
  const medalBox = 11 * k * u, medalPad = 2 * u;
  const medals = Object.fromEntries(tags.map(tag => [tag, stamp(SYMBOLS[tag], 256, medalBox, medalPad, [
    { fill: 'rgba(0,0,0,0.3)', y: 0.5 * k * u },
    { fill: TONES[tag] },
  ])]));

  // The logo: a face dropped below the title, the outline round it, the white on
  // top. Stroked, then filled, in that order: a stroke drawn after would eat
  // into the letters.
  const titleSize = 6.6 * k * u, lead = 7 * k * u, titlePad = 4 * u;
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
    W, H: base, floorH, u, bars, favs,
    left: 4.4 * u, gapMost: 1.3 * u, seg: 1.5 * u, pitch: 2.2 * u,
    colourOf: () => deep, glowOf: () => tone(0.55), glow: 1.6 * u,
    cap: 'rgba(255,255,255,0.4)',
    heart: stamp(HEART_PATH, 24, 3.6 * u, 2.4 * u, [{ fill: TONES.fav, glow: 1.4 * u, glowColour: 'rgba(240,72,79,0.6)' }]),
  });

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
    const veil = night ? '14,14,14' : '238,240,236';
    scrim.addColorStop(0, `rgba(${veil},0)`);
    scrim.addColorStop(0.5, `rgba(${veil},0.86)`);
    scrim.addColorStop(1, `rgba(${veil},0)`);
    c.fillStyle = scrim;
    c.fillRect(0, scrimMid - scrimH / 2, W, scrimH);
    floor.draw(c, t);
    drawAlbum(c, t);

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
        drawArtist(c, artistLine, cx, artistY, { size: 2.9 * k * u, tracking: 0.3, wide: W * 0.9, least: W * 0.02, colour: night ? '#ffffff' : dark, mono });
      }, t);
    }
  }

  let t = still ? 30 : 0;
  return {
    step(dt) { t += dt; },
    paint(c) { paintAt(c, t); },
  };
};
