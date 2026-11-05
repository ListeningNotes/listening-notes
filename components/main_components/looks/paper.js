// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/paper.js
// Paper (Miyel, 2026-11-04: as Riso it looked like stickers and stamps). The cover is
// drawn in pencil, stroke by stroke, on a toothy sheet; the stars and marks are
// coloured pencil, hatched, the paper showing between the lines; the horizon runs
// down the side of the page. Nothing bounces: things are drawn on, left to right.
//
// The drawing is worked out by the pixel, the old way of making a photograph look
// like pencil: the grey picture divided by a blurred copy of itself leaves the
// edges. A cover that will not be read throws here, and the print falls back to Day.
'use client';

import {
  ARRIVES, STAR_PATH, HEART_PATH, SYMBOLS, MARK_ASPECT,
  drawArtist, easeOut, clamp01, sheet, fitTitle,
} from '../SharePrinter';

const PAPER = '#f4f0e5';
const GRAPHITE = '#2a2a2e';
const SOFT = '#55555c';
const RED = '#c94a38';
const MARKS = { fav: RED, formative: '#2f7a50', mp: '#3b5fbd' };
const DRAWN_IN = 6.5;

function dice(seed) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
}

// The sheet's tooth: specks where a pencil or an ink skips.
function toothOf(size, rnd, amount) {
  return sheet(size, size, c => {
    const image = c.createImageData(size, size);
    for (let i = 3; i < image.data.length; i += 4) image.data[i] = rnd() < amount ? 70 + rnd() * 150 : 0;
    c.putImageData(image, 0, 0);
  });
}
function punch(c, tooth) {
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'destination-out';
  c.fillStyle = c.createPattern(tooth, 'repeat');
  c.fillRect(0, 0, c.canvas.width, c.canvas.height);
  c.restore();
}

function pencilled(cover, side, rnd) {
  const size = Math.max(1, Math.ceil(side));
  const read = (w, paint) => {
    const part = sheet(w, w, paint);
    return part.getContext('2d').getImageData(0, 0, part.width, part.height).data;
  };
  const plain = c => {
    if (cover?.naturalWidth) c.drawImage(cover, 0, 0, c.canvas.width, c.canvas.height);
    else { c.fillStyle = '#999'; c.fillRect(0, 0, c.canvas.width, c.canvas.height); }
  };
  const sharp = read(size, plain);
  // A blur by shrinking: small, then back up, twice for softness.
  const tiny = sheet(Math.ceil(size / 34), Math.ceil(size / 34), plain);
  const soft = read(size, c => { c.imageSmoothingQuality = 'high'; c.drawImage(tiny, 0, 0, size, size); });
  const grey = (px, i) => px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11;
  return sheet(size, size, c => {
    const image = c.createImageData(size, size);
    const out = image.data;
    for (let i = 0; i < out.length; i += 4) {
      const g = grey(sharp, i), b = Math.max(1, grey(soft, i));
      const edges = Math.min(1, g / b) ** 5;              // the lines
      const tone = 1 - ((255 - g) / 255) * 0.62;          // the shading
      const dark = 1 - edges * tone;
      // Graphite only ever lands on the paper's tooth.
      out[i] = 42; out[i + 1] = 42; out[i + 2] = 46;
      out[i + 3] = 255 * Math.min(1, dark * 1.1) * (0.62 + 0.38 * rnd());
    }
    c.putImageData(image, 0, 0);
  });
}

// A glyph in coloured pencil: hatched inside its outline. `lit` false is the
// outline alone, in faint graphite.
function hatched(path, viewBox, box, pad, colour, lit, rnd, tooth) {
  return sheet(box + pad * 2, box + pad * 2, c => {
    const shape = new Path2D(path);
    const scale = box / viewBox;
    const place = (dx = 0, dy = 0) => c.setTransform(scale, 0, 0, scale, pad + dx, pad + dy);
    if (lit) {
      c.save();
      place();
      c.clip(shape);
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.strokeStyle = colour;
      c.lineCap = 'round';
      const pitch = Math.max(2, box / 13);
      c.lineWidth = pitch * 0.82;
      for (let x = -box; x < box * 2 + pad * 2; x += pitch) {
        c.beginPath();
        c.moveTo(x + rnd() * pitch * 0.5, pad - 4);
        c.lineTo(x + box * 0.55 + rnd() * pitch * 0.5, pad + box + 4);
        c.stroke();
      }
      c.restore();
    }
    // The outline, gone over twice, not quite in the same place.
    c.strokeStyle = lit ? colour : 'rgba(42,42,46,0.42)';
    c.lineJoin = 'round';
    [[0, 0], [box * 0.012, -box * 0.01]].forEach(([dx, dy]) => {
      place(dx, dy);
      c.lineWidth = (box * 0.018) / scale;
      c.stroke(shape);
    });
    punch(c, tooth);
  });
}

// Drawn on, left to right, rather than popping up.
function drawnOn(c, t, at, lasts, x, y, w, h, paint) {
  const v = clamp01((t - at) / lasts);
  if (v <= 0) return;
  c.save();
  c.beginPath();
  c.rect(x, y, w * v, h);
  c.clip();
  paint();
  c.restore();
}

export function paperLookScene(record, frame, { art, families, still = false }) {
  const { stars, artistLine, tags, bars, favs, entry } = record;
  const { sans, mono } = families;
  const W = frame.w, H = frame.h;
  const u = Math.min(W, (H * 9) / 16) / 100;
  const rnd = dice(11);
  const tooth = toothOf(256, rnd, 0.22);

  // The horizon has the side of the page; everything else, the rest.
  const sideW = bars.length ? 16 * u : 0;
  const pageW = W - sideW;
  const cx = pageW / 2 + (bars.length ? 1.5 * u : 0);
  const size = Math.min(66 * u, pageW * 0.8);
  const albumTop = H * 0.13;
  const ax = cx - size / 2;
  const roomTop = albumTop + size + 5 * u;
  const room = H - 5 * u - roomTop;
  const heightAt = (k, lines) => ((stars > 0 ? 11.5 : 0) + (tags.length ? 12 : 0) + lines * 10.6 + (artistLine ? 5.6 : 0)) * k * u;
  const titleFont = k => `800 ${10 * k * u}px ${sans}`;
  const { k, lines: titleLines } = fitTitle({ album: entry?.album, fontAt: titleFont, wide: pageW * 0.88, room, heightAt });
  const rowsTop = roomTop + Math.max(0, room - heightAt(k, titleLines.length)) / 2;

  // ── The sheet ─────────────────────────────────────────────────────────
  const under = sheet(W, H, c => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, W, H);
    // Its grain, and a few fibres.
    const grain = sheet(256, 256, g => {
      const image = g.createImageData(256, 256);
      for (let i = 0; i < image.data.length; i += 4) {
        image.data[i] = 90; image.data[i + 1] = 80; image.data[i + 2] = 60;
        image.data[i + 3] = rnd() * 16;
      }
      g.putImageData(image, 0, 0);
    });
    c.fillStyle = c.createPattern(grain, 'repeat');
    c.fillRect(0, 0, W, H);
    c.lineWidth = Math.max(0.6, u * 0.06);
    for (let i = 0; i < 220; i++) {
      const x = rnd() * W, y = rnd() * H, a = rnd() * Math.PI * 2, l = u * (1 + rnd() * 3);
      c.strokeStyle = `rgba(110,95,70,${0.04 + rnd() * 0.07})`;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      c.stroke();
    }
    const markH = 4.2 * u, markW = markH * MARK_ASPECT;
    if (art?.mark) c.drawImage(art.mark, cx - markW / 2, H * 0.05, markW, markH);
  });

  // ── The drawing ───────────────────────────────────────────────────────
  const drawing = pencilled(art?.cover, size, rnd);
  // Thin slanted strokes in no order, the way shading builds up, each one
  // uncovering a line of the drawing, until they have gone over all of it.
  const STROKES = 110;
  const strokes = Array.from({ length: STROKES }, (_, i) => {
    const x = (i / (STROKES - 1)) * size * 2;
    return { x, wobble: rnd() * size * 0.02, width: ((size * 2) / STROKES) * (1.05 + rnd() * 0.5), order: rnd() };
  }).sort((a, b) => a.order - b.order);
  const uncovered = sheet(size, size, () => {});
  const mask = uncovered.getContext('2d');
  mask.lineCap = 'round';
  const shown = sheet(size, size, () => {});
  const onShown = shown.getContext('2d');
  let burned = 0;
  const pass = (c, stroke, part) => {
    c.lineWidth = stroke.width;
    c.beginPath();
    c.moveTo(stroke.x + stroke.wobble, -size * 0.02);
    c.lineTo(stroke.x + stroke.wobble - size * part * 1.02, size * part * 1.02);
    c.stroke();
  };
  function drawDrawing(c, t) {
    if (still || t >= DRAWN_IN) {
      c.drawImage(drawing, ax, albumTop);
      return;
    }
    const at = clamp01(t / DRAWN_IN) * STROKES;
    while (burned < Math.floor(at)) pass(mask, strokes[burned++], 1);
    onShown.globalCompositeOperation = 'source-over';
    onShown.clearRect(0, 0, shown.width, shown.height);
    onShown.drawImage(uncovered, 0, 0);
    onShown.lineCap = 'round';
    if (burned < STROKES) pass(onShown, strokes[burned], at - Math.floor(at));
    onShown.globalCompositeOperation = 'source-in';
    onShown.drawImage(drawing, 0, 0);
    c.drawImage(shown, ax, albumTop);
  }
  // Its edge, gone round by hand once the drawing is under way.
  const edge = new Path2D(`M${ax - 2} ${albumTop + 1}L${ax + size + 2} ${albumTop - 2}L${ax + size} ${albumTop + size + 2}L${ax + 1} ${albumTop + size - 1}Z`);
  const edgeLong = size * 4.1;

  // ── The rest ──────────────────────────────────────────────────────────
  const starBox = 8.6 * k * u, starPad = 1.2 * u, starGap = 1.6 * k * u;
  const starLit = hatched(STAR_PATH, 18, starBox, starPad, RED, true, rnd, tooth);
  const starCold = hatched(STAR_PATH, 18, starBox, starPad, RED, false, rnd, tooth);
  const markBox = 8.6 * k * u, markPad = 1.2 * u;
  const marks = Object.fromEntries(tags.map(tag => [tag, hatched(SYMBOLS[tag], 256, markBox, markPad, MARKS[tag], true, rnd, tooth)]));
  const heart = hatched(HEART_PATH, 24, 3.2 * u, 0.6 * u, RED, true, rnd, tooth);

  const lead = 10.6 * k * u, titlePad = 2 * u;
  const titleArt = sheet(W, titleLines.length * lead + titlePad * 2, c => {
    c.font = titleFont(k);
    c.textAlign = 'center';
    c.textBaseline = 'top';
    c.fillStyle = GRAPHITE;
    titleLines.forEach((text, i) => c.fillText(text, cx, titlePad + i * lead));
    punch(c, tooth);
  });

  // The horizon, down the side: a line for each track, reaching in from the edge
  // as far as it was rated, in hatching that runs past its own ends a little.
  const sideTop = H * 0.05, sideH = H * 0.9;
  const pitch = bars.length ? sideH / bars.length : 0;
  const bar = Math.min(pitch * 0.66, 5 * u);
  const reach = 13.5 * u;
  const rowY = i => sideTop + i * pitch + (pitch - bar) / 2;
  const lengthOf = v => Math.max(0.8 * u, v * reach);
  const side = bars.length ? sheet(sideW, H, c => {
    c.strokeStyle = SOFT;
    c.lineCap = 'round';
    const step = Math.max(2, u * 0.34);
    c.lineWidth = step * 0.72;
    bars.forEach((v, i) => {
      const y = rowY(i), right = sideW - 0.8 * u, from = right - lengthOf(v);
      for (let x = from; x < right; x += step) {
        c.beginPath();
        c.moveTo(x + (rnd() - 0.5) * step, y - rnd() * bar * 0.14);
        c.lineTo(x + bar * 0.5 + (rnd() - 0.5) * step, y + bar + rnd() * bar * 0.14);
        c.stroke();
      }
    });
    punch(c, tooth);
  }) : null;

  function paintAt(c, t) {
    c.drawImage(under, 0, 0);

    drawDrawing(c, t);
    const round = still ? 1 : easeOut(clamp01((t - 1.5) / (DRAWN_IN - 1.5)));
    c.save();
    c.strokeStyle = 'rgba(42,42,46,0.6)';
    c.lineWidth = Math.max(1, 0.22 * u);
    c.setLineDash([edgeLong * round, edgeLong]);
    c.stroke(edge);
    c.restore();

    if (side) {
      const x0 = pageW;
      bars.forEach((v, i) => {
        const on = easeOut(clamp01((t - ARRIVES.floor - i * 0.05) / 0.8));
        if (on <= 0) return;
        // From the edge of the page inward.
        const across = sideW * on, y = rowY(i) - bar * 0.2, h = bar * 1.4;
        c.drawImage(side, sideW - across, y, across, h, x0 + sideW - across, y, across, h);
      });
      bars.forEach((v, i) => {
        if (!favs[i]) return;
        const x = x0 + sideW - 0.8 * u - lengthOf(v) - heart.width + 0.3 * u;
        const y = rowY(i) + bar / 2 - heart.height / 2;
        drawnOn(c, t, ARRIVES.hearts + i * 0.03, 0.3, x, y, heart.width, heart.height, () => c.drawImage(heart, x, y));
      });
    }

    let y = rowsTop;
    if (stars > 0) {
      const from = cx - (starBox * 5 + starGap * 4) / 2;
      const rowY0 = y;
      for (let i = 0; i < 5; i++) {
        const x = from + i * (starBox + starGap);
        drawnOn(c, t, ARRIVES.stars + i * 0.25, 0.3, x - starPad, rowY0 - starPad, starCold.width, starCold.height, () => {
          c.drawImage(starCold, x - starPad, rowY0 - starPad);
          const part = clamp01(stars - i);
          if (part > 0) {
            c.save();
            c.beginPath();
            c.rect(x - starPad, rowY0 - starPad, starPad + starBox * part + (part === 1 ? starPad : 0), starLit.height);
            c.clip();
            c.drawImage(starLit, x - starPad, rowY0 - starPad);
            c.restore();
          }
        });
      }
      y += 11.5 * k * u;
    }
    if (tags.length) {
      const gap = 3.4 * k * u;
      const from = cx - (tags.length * markBox + (tags.length - 1) * gap) / 2;
      const markY = y;
      tags.forEach((tag, i) => {
        const x = from + i * (markBox + gap);
        drawnOn(c, t, ARRIVES.tags + i * 0.3, 0.4, x - markPad, markY - markPad, marks[tag].width, marks[tag].height, () => c.drawImage(marks[tag], x - markPad, markY - markPad));
      });
      y += 12 * k * u;
    }
    const titleY = y;
    drawnOn(c, t, ARRIVES.title, 1.3, 0, titleY - titlePad, W, titleArt.height, () => c.drawImage(titleArt, 0, titleY - titlePad));
    y += titleLines.length * lead;
    if (artistLine) {
      const artistY = y + 1.6 * k * u;
      drawnOn(c, t, ARRIVES.artist + 0.6, 1, 0, artistY - u, W, 6 * u, () => {
        drawArtist(c, artistLine, cx, artistY, { size: 2.9 * k * u, tracking: 0.26, wide: pageW * 0.9, least: W * 0.02, colour: SOFT, mono });
      });
    }
  }

  let t = still ? 30 : 0;
  return {
    step(dt) { t += dt; },
    paint(c) { paintAt(c, t); },
  };
}
