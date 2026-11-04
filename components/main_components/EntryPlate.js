// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/EntryPlate.js
// A record, cut as a printing plate: one album, moving, drawn on a canvas.
//
// What the album print is (her spec, refined in chat, 2026-11-03): the cover
// blurred behind everything, the mark at the head, the album floating as a
// solid thing, and the horizon as the floor it floats over, full bleed, with no
// labels. Under the album the stars, the tags as their own icons, the title and
// the artist, on a soft scrim of the page colour rather than any border: the
// artwork goes quieter where the marks sit, and the marks stay as they are in
// the app. Nothing written about a record travels, and no address is printed.
//
// The album sweeps from side to side rather than spinning. A full turn spends
// half its time showing a backwards cover.
//
// ── What the rating earns ────────────────────────────────────────────────
// Rays and sparks grow with the stars: four and up in plain light, threes a
// faint few, below that it simply arrives. A Masterpiece is a different object,
// not a decorated one: gold on the mark, the bars and the sparks, the word where
// the stars were, the album square and still with a gilded edge, and a gold
// light passing through the title now and then. The words themselves stay the
// paper's ink, so they read (Miyel, 2026-11-03). Rays stay white: gold rays were
// ruled out. Reflect, Day or Night is the ground (the cover blurred, or plain
// paper); a Masterpiece's Reflect is the dark one. The diamond stays blue for
// now: whether to leave it, gild it or drop it is still hers to decide.
//
// A scene is told the time rather than reading it, so a video is made faster
// than real time (library/video_file.js), and the same scene is the preview.
// A canvas has no 3D of its own: the album is drawn in vertical strips, each
// its own height for how near it is.

'use client';

import { loadMark, loadPicture, MARK_ASPECT, drawTracked, drawPath, wrapLines, roundRect } from './SharePrinter';
import { parseRating, parseHorizon, entryTracks } from '../../library/entry_formatter';

// The papers, shared with the journal's print (JournalPlate.js).
export const INKS = {
  day: {
    ink: '#1a1a1a', soft: '#6b6b6b', faint: '#a8a8a8', warm: '#efebe2',
    rule: 'rgba(26,26,26,0.15)', unlit: 'rgba(232,184,75,0.18)',
    bar: 'rgba(26,26,26,0.5)',
    edge: 'rgba(255,255,255,0.6)',                                  // --panel-border
    lift: ['rgba(0,0,0,0.06)', 'rgba(0,0,0,0.06)'],                 // --shadow-lift
    wash: 'rgba(238,240,236,0.46)', paper: '#eef0ec',
  },
  night: {
    ink: '#e8e4dc', soft: '#888888', faint: '#666666', warm: '#161616',
    rule: 'rgba(232,228,220,0.16)', unlit: 'rgba(232,184,75,0.18)',
    bar: 'rgba(232,228,220,0.5)',
    edge: 'rgba(255,255,255,0.08)',
    lift: ['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.3)'],
    wash: 'rgba(14,14,14,0.5)', paper: '#0e0e0e',
  },
};
const GOLD = '#e8b84b';
const DEEP_GOLD = '#b98a1e';           // gold that still reads on light paper
const NIGHT_WASH = 'rgba(12,13,16,0.62)';
const NIGHT_SCRIM = [12, 13, 16];
const PAPER_SCRIM = [238, 240, 236];
const FAV = '#f0484f';
const TONES = { fav: '#f0484f', mp: '#4a9bf0', formative: '#3fa96b' };
const STAR_PATH = 'M9 1.5l2.163 4.38 4.837.703-3.5 3.412.826 4.818L9 12.39l-4.326 2.273.826-4.818L2 6.583l4.837-.703z';
const HEART_PATH = 'M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11z';
// The tags, as the feed draws them: Phosphor's Heart (fill), SketchLogo (fill)
// and Fingerprint (bold), each a single path in a 256-box.
const SYMBOLS = {
  fav: 'M240,102c0,70-103.79,126.66-108.21,129a8,8,0,0,1-7.58,0C119.79,228.66,16,172,16,102A62.07,62.07,0,0,1,78,40c20.65,0,38.73,8.88,50,23.89C139.27,48.88,157.35,40,178,40A62.07,62.07,0,0,1,240,102Z',
  mp: 'M246,98.73l-56-64A8,8,0,0,0,184,32H72a8,8,0,0,0-6,2.73l-56,64a8,8,0,0,0,.17,10.73l112,120a8,8,0,0,0,11.7,0l112-120A8,8,0,0,0,246,98.73ZM222.37,96H180L144,48h36.37ZM74.58,112l30.13,75.33L34.41,112Zm106.84,0h40.17l-70.3,75.33ZM75.63,48H112L76,96H33.63Z',
  formative: 'M160,128a224.48,224.48,0,0,1-26.37,105.54,12,12,0,1,1-21.16-11.32A200.33,200.33,0,0,0,136,128a8,8,0,0,0-16,0,12,12,0,0,1-24,0,32,32,0,0,1,64,0ZM128,56a12,12,0,1,0,0,24,48.05,48.05,0,0,1,48,48c0,7.62-.36,15.32-1.07,22.87A12,12,0,0,0,185.74,164c.38,0,.76,0,1.14,0a12,12,0,0,0,11.93-10.87c.79-8.3,1.18-16.76,1.18-25.13A72.08,72.08,0,0,0,128,56ZM96,92.23A12,12,0,0,0,80,74.35,72.1,72.1,0,0,0,56,128a120.11,120.11,0,0,1-15.12,58.37,12,12,0,0,0,21,11.69A144.14,144.14,0,0,0,80,128,48.08,48.08,0,0,1,96,92.23Zm10.1,64.1a12,12,0,0,0-14.46,8.9,158.61,158.61,0,0,1-18.88,45.86,12,12,0,0,0,20.5,12.48A182.86,182.86,0,0,0,115,170.79,12,12,0,0,0,106.1,156.33Zm76.73,24.07A12,12,0,0,0,168.19,189a241.5,241.5,0,0,1-8,24.87,12,12,0,0,0,6.91,15.49,11.76,11.76,0,0,0,4.29.8,12,12,0,0,0,11.21-7.71,260.2,260.2,0,0,0,8.79-27.37A12,12,0,0,0,182.83,180.4ZM128,16A112.12,112.12,0,0,0,16,127.44c0,.19,0,.38,0,.57a79.81,79.81,0,0,1-5,27.82,12,12,0,1,0,22.5,8.35A103.59,103.59,0,0,0,40,128.58c0-.19,0-.38,0-.57a88,88,0,0,1,176-.5c0,.16,0,.33,0,.5a282.12,282.12,0,0,1-6.74,61.38,12,12,0,0,0,9.09,14.33A11.84,11.84,0,0,0,221,204a12,12,0,0,0,11.7-9.38A305.87,305.87,0,0,0,240,128.55c0-.18,0-.36,0-.54A112.13,112.13,0,0,0,128,16Z',
};
const GRADES = {
  masterpiece: { ray: 'rgba(255,255,255,0.3)', wedges: 18, twin: true, sparks: 46, spark: GOLD, ring: true, sheen: true },
  high: { ray: 'rgba(255,255,255,0.3)', wedges: 12, sparks: 18, spark: '#ffffff' },
  middle: { ray: 'rgba(255,255,255,0.16)', wedges: 6, sparks: 6, spark: '#ffffff' },
  low: { sparks: 0 },
};
// When each thing arrives, after the album has landed.
const ARRIVES = { stars: 1.3, tags: 2.5, title: 1.15, artist: 1.35, floor: 2.9, hearts: 3.8 };
const POP = 0.45;
const SWEEP_SECONDS = 7;
const SWEEP_ANGLE = (26 * Math.PI) / 180;
const easeOut = v => 1 - (1 - v) ** 3;
const easeBack = v => { const k = 1.70158; const u = v - 1; return 1 + (k + 1) * u ** 3 + k * u ** 2; };
const clamp01 = v => Math.min(1, Math.max(0, v));

function coverPicture(img, size) {
  const s = Math.max(1, Math.round(size));
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const x = c.getContext('2d');
  if (img?.naturalWidth) {
    const k = Math.max(s / img.naturalWidth, s / img.naturalHeight);
    x.drawImage(img, (s - img.naturalWidth * k) / 2, (s - img.naturalHeight * k) / 2, img.naturalWidth * k, img.naturalHeight * k);
  } else {
    x.fillStyle = '#777';
    x.fillRect(0, 0, s, s);
  }
  return c;
}

// The album at an angle, `depth` thick, its near side the art's own edge
// stretched round and a little shaded.
function drawTurned(c, picture, cx, cy, size, angle, depth) {
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
  // with it. A square here stayed square and its corners showed.
  const quad = (p, q) => {
    c.beginPath();
    c.moveTo(p.x, cy - p.half);
    c.lineTo(q.x, cy - q.half);
    c.lineTo(q.x, cy + q.half);
    c.lineTo(p.x, cy + p.half);
    c.closePath();
  };
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.32)';
  c.shadowBlur = size * 0.09;
  c.shadowOffsetY = size * 0.035;
  c.fillStyle = 'rgba(0,0,0,0.9)';
  quad(point(-1, 1), point(1, 1));
  c.fill();
  c.restore();
  if (Math.abs(b.x - a.x) > 0.5) {
    const edge = u > 0 ? w - 2 : 0;
    const STEPS = 12;
    for (let i = 0; i < STEPS; i++) {
      const k0 = i / STEPS, k1 = (i + 1) / STEPS;
      const x0 = a.x + (b.x - a.x) * k0, x1 = a.x + (b.x - a.x) * k1;
      const half = a.half + (b.half - a.half) * ((k0 + k1) / 2);
      c.drawImage(picture, edge, 0, 2, h, Math.min(x0, x1), cy - half, Math.abs(x1 - x0) + 0.4, half * 2);
    }
    c.fillStyle = 'rgba(0,0,0,0.16)';
    quad(a, b);
    c.fill();
  }
  const STRIPS = 48;
  for (let i = 0; i < STRIPS; i++) {
    const u0 = -1 + (2 * i) / STRIPS, u1 = -1 + (2 * (i + 1)) / STRIPS;
    const p0 = point(u0, 1), p1 = point(u1, 1);
    const wide = Math.abs(p1.x - p0.x);
    if (wide < 0.01) continue;
    const mid = (p0.half + p1.half) / 2;
    c.drawImage(picture, ((u0 + 1) / 2) * w, 0, w / STRIPS, h, Math.min(p0.x, p1.x), cy - mid, wide + 0.8, mid * 2);
  }
}

function rayPicture(size, colour, wedges) {
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
    x.arc(0, 0, r, a, a + (Math.PI * 2) / wedges / 3);
    x.closePath();
    x.fill();
  }
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalCompositeOperation = 'destination-in';
  const g = x.createRadialGradient(r, r, r * 0.15, r, r, r);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

function spark(c, x, y, r) {
  const w = r * 0.28;
  c.beginPath();
  c.moveTo(x, y - r);
  c.lineTo(x + w, y - w);
  c.lineTo(x + r, y);
  c.lineTo(x + w, y + w);
  c.lineTo(x, y + r);
  c.lineTo(x - w, y + w);
  c.lineTo(x - r, y);
  c.lineTo(x - w, y - w);
  c.closePath();
  c.fill();
}

// The cover blurred across the paper, overscanned so no edge shows.
function paintGround(c, f, img, paper, wash) {
  c.fillStyle = paper;
  c.fillRect(0, 0, f.w, f.h);
  if (img?.naturalWidth) {
    const s = Math.max(f.w / img.naturalWidth, f.h / img.naturalHeight) * 1.3;
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    c.save();
    if (typeof c.filter === 'string') {
      c.filter = `blur(${Math.round(f.w * 0.03)}px) saturate(1.25)`;
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

export function entryPlate({ entry }) {
  const isMasterpiece = entry?.masterpiece === true || entry?.rating === 'Masterpiece';
  const stars = isMasterpiece ? 5 : parseRating(entry?.rating);
  const isFavorite = entry?.favorite === true || entry?.favorite === 'true';
  const isFormative = entry?.formative === true || entry?.formative === 'true';
  const artistLine = [entry?.artist, entry?.year].filter(Boolean).join(' · ').toUpperCase();
  const tags = [isFavorite && 'fav', isMasterpiece && 'mp', isFormative && 'formative'].filter(Boolean);
  const tracks = entryTracks(entry || {});
  const rated = tracks.some(t => Number(t.stars) > 0);
  const bars = rated
    ? tracks.map(t => clamp01((Number(t.stars) || 0) / 5))
    : parseHorizon(entry?.horizon);
  const favs = rated ? tracks.map(t => Boolean(t.favorite)) : [];
  const grade = isMasterpiece ? GRADES.masterpiece : stars >= 4 ? GRADES.high : stars >= 3 ? GRADES.middle : GRADES.low;

  function scene(frame, { art, families, ground = 'record', still = false }) {
    const { sans, mono } = families;
    const W = frame.w, H = frame.h;
    const base = Math.min(W, H * 0.72);
    const px = n => (n * base) / 340;
    const reflecting = ground === 'record';
    const night = ground === 'night' || (isMasterpiece && reflecting);
    const paper = night ? INKS.night : INKS.day;
    const ink = paper.ink;
    const soft = night ? '#c9c5bd' : paper.soft;
    const accent = night ? GOLD : DEEP_GOLD;
    const barColour = isMasterpiece ? accent : paper.bar;

    // ── Where everything goes ───────────────────────────────────────────
    const floorH = bars.length ? H * 0.16 : 0;
    const floorTop = H - floorH;
    const markH = px(30), markY = H * 0.035;
    const size = Math.min(W * 0.68, H * 0.36);
    const cx = W / 2;
    const albumY = markY + markH + H * 0.05;
    const cy = albumY + size / 2;
    const top = albumY + size + H * 0.03;

    const measure = document.createElement('canvas').getContext('2d');
    let k = 1, titleLines = [], rowsH = 0;
    const lay = () => {
      measure.font = `800 ${px(27) * k}px ${sans}`;
      titleLines = wrapLines(measure, entry?.album || '', W * 0.86, 2);
      rowsH = px(38) * k + (tags.length ? px(32) * k : 0) + titleLines.length * px(31) * k + px(18) * k;
    };
    lay();
    const room = floorTop - H * 0.015 - top;
    if (rowsH > room) { k = room / rowsH; lay(); }
    const scrimH = Math.max(H * 0.3, rowsH * 1.25);
    const scrimMid = top + rowsH / 2;

    // ── What never changes, kept as pictures ────────────────────────────
    const under = document.createElement('canvas');
    under.width = W;
    under.height = H;
    paintGround(under.getContext('2d'), frame, reflecting ? art?.cover : null, paper.paper, !reflecting ? 'rgba(0,0,0,0)' : isMasterpiece ? NIGHT_WASH : INKS.day.wash);
    const picture = coverPicture(art?.cover, size);
    // White rays and sparks vanish on plain light paper, so there they are ink.
    const onDay = ground === 'day';
    const rays = grade.ray ? rayPicture(W * 1.7, onDay ? 'rgba(26,26,26,0.07)' : grade.ray, grade.wedges) : null;
    let seed = 7;
    const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const sparks = Array.from({ length: grade.sparks }, () => ({ x: random() * W, y: random() * floorTop, at: random() * 2.4, s: W * (0.008 + random() * 0.012) }));
    const lit = document.createElement('canvas');

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

    function drawStars(c, y, t) {
      const box = px(30) * k, gap = px(4) * k;
      const left = cx - (box * 5 + gap * 4) / 2;
      for (let i = 0; i < 5; i++) {
        const x = left + i * (box + gap);
        popped(c, ARRIVES.stars + i * 0.2, x + box / 2, y + box / 2, () => {
          drawPath(c, STAR_PATH, x, y, box, 18, paper.unlit);
          const part = clamp01(stars - i);
          if (part > 0) {
            c.save();
            c.beginPath();
            c.rect(x, y, box * part, box);
            c.clip();
            drawPath(c, STAR_PATH, x, y, box, 18, GOLD);
            c.restore();
          }
        }, t);
      }
    }

    // Where the stars were on any other print: the word, and a short rule.
    function drawWord(c, y, t) {
      const size2 = px(13) * k;
      popped(c, ARRIVES.stars, cx, y + size2, () => {
        c.font = `400 ${size2}px ${mono}`;
        c.fillStyle = ink;
        drawTracked(c, 'MASTERPIECE', cx, y + px(4) * k, size2 * 0.42, 'center');
        const ruleW = px(64) * k;
        c.fillStyle = accent;
        c.fillRect(cx - ruleW / 2, y + px(4) * k + size2 * 1.5, ruleW, Math.max(1, px(0.8)));
      }, t);
    }

    function drawTags(c, y, t) {
      const box = px(24) * k, gap = px(12) * k;
      const left = cx - (tags.length * box + (tags.length - 1) * gap) / 2;
      tags.forEach((tag, i) => {
        const x = left + i * (box + gap);
        popped(c, ARRIVES.tags + i * 0.15, x + box / 2, y + box / 2, () => {
          drawPath(c, SYMBOLS[tag], x, y, box, 256, TONES[tag]);
        }, t);
      });
    }

    function drawFloor(c, t) {
      if (!bars.length) return;
      const gap = Math.max(1, W * 0.004);
      const barW = (W - gap * (bars.length - 1)) / bars.length;
      const stand = easeOut(clamp01((t - ARRIVES.floor) / 0.9));
      bars.forEach((v, i) => {
        const h = Math.max(W * 0.006, floorH * v) * stand;
        const x = i * (barW + gap);
        c.fillStyle = barColour;
        roundRect(c, x, H - h, barW, h + barW * 0.2, Math.min(barW / 3, W * 0.006));
        c.fill();
      });
      // The hearts land after the bars: a heart is a pick, so it means nothing
      // until there is something to pick from.
      const heart = base * 0.032;
      bars.forEach((v, i) => {
        if (!favs[i]) return;
        const x = i * (barW + gap) + barW / 2;
        const tip = H - Math.max(W * 0.006, floorH * v) - heart * 0.2;
        popped(c, ARRIVES.hearts + i * 0.02, x, tip - heart / 2, () => {
          drawPath(c, HEART_PATH, x - heart / 2, tip - heart, heart, 24, FAV);
        }, t);
      });
    }

    function drawAlbum(c, t) {
      const rise = Math.min(1, t / 1.4);
      const scale = 0.25 + 0.75 * easeBack(rise);
      const bob = t > 1.4 ? Math.sin((t - 1.4) * (Math.PI / 2)) * size * 0.015 : 0;
      const lift = (1 - easeBack(rise)) * size * 0.46 + (still ? 0 : bob);
      // A Masterpiece holds square; it is the only print never at an angle.
      const angle = isMasterpiece ? 0 : still ? -SWEEP_ANGLE * 0.7 : -SWEEP_ANGLE * Math.cos((t * Math.PI * 2) / SWEEP_SECONDS);
      let face = picture;
      if (grade.sheen && !still && t > 1.6) {
        const local = ((t - 1.6) % 3.2) / 1.1;
        if (local < 1) {
          const w = picture.width;
          if (lit.width !== w) { lit.width = w; lit.height = w; }
          const l = lit.getContext('2d');
          l.drawImage(picture, 0, 0);
          const mid = -w * 0.3 + local * w * 1.6;
          const g = l.createLinearGradient(mid - w * 0.2, 0, mid + w * 0.2, w * 0.25);
          g.addColorStop(0, 'rgba(255,240,190,0)');
          g.addColorStop(0.5, 'rgba(255,240,190,0.7)');
          g.addColorStop(1, 'rgba(255,240,190,0)');
          l.fillStyle = g;
          l.fillRect(0, 0, w, w);
          face = lit;
        }
      }
      if (isMasterpiece) {
        // Gilded: a soft gold glow behind it, a thin gold edge on it.
        const s = size * scale;
        c.save();
        c.shadowColor = accent;
        c.shadowBlur = size * 0.1;
        c.fillStyle = accent;
        c.fillRect(cx - s / 2, cy + lift - s / 2, s, s);
        c.restore();
      }
      drawTurned(c, face, cx, cy + lift, size * scale, angle, angle === 0 ? 0 : size * 0.06 * scale);
      if (isMasterpiece) {
        const s = size * scale;
        const line = size * 0.012;
        c.strokeStyle = accent;
        c.lineWidth = line;
        c.strokeRect(cx - s / 2 + line / 2, cy + lift - s / 2 + line / 2, s - line, s - line);
      }
    }

    function paintAt(c, t) {
      c.drawImage(under, 0, 0);
      const grow = easeOut(Math.min(1, t / 0.9));
      if (rays) {
        c.save();
        c.translate(cx, cy);
        c.scale(grow, grow);
        c.save();
        c.rotate((t * Math.PI * 2) / 26);
        c.drawImage(rays, -rays.width / 2, -rays.height / 2);
        c.restore();
        if (grade.twin) {
          // Slower, fainter, the other way.
          c.globalAlpha = 0.5;
          c.rotate((-t * Math.PI * 2) / 48);
          c.drawImage(rays, -rays.width / 2, -rays.height / 2);
          c.globalAlpha = 1;
        }
        c.restore();
      }
      if (grade.ring && !still && t > 1.1 && t < 2.1) {
        const v = t - 1.1;
        c.strokeStyle = '#ffffff';
        c.lineWidth = size * 0.03 * (1 - v);
        c.beginPath();
        c.arc(cx, cy, size * (0.45 + easeOut(v) * 0.9), 0, Math.PI * 2);
        c.stroke();
      }
      c.fillStyle = isMasterpiece ? accent : onDay ? 'rgba(26,26,26,0.32)' : grade.spark || '#fff';
      for (const s of sparks) {
        const r = s.s * Math.sin((((t + s.at) % 2.4) / 2.4) * Math.PI) * 1.5;
        if (r > 0.2) spark(c, s.x, s.y, r);
      }
      drawFloor(c, t);
      // The scrim: the page colour, none at either end, most of it in the
      // middle. It sits over the floor and under the words.
      const [r0, g0, b0] = night ? NIGHT_SCRIM : PAPER_SCRIM;
      const scrim = c.createLinearGradient(0, scrimMid - scrimH / 2, 0, scrimMid + scrimH / 2);
      scrim.addColorStop(0, `rgba(${r0},${g0},${b0},0)`);
      scrim.addColorStop(0.5, `rgba(${r0},${g0},${b0},0.86)`);
      scrim.addColorStop(1, `rgba(${r0},${g0},${b0},0)`);
      c.fillStyle = scrim;
      c.fillRect(0, scrimMid - scrimH / 2, W, scrimH);

      if (art?.mark) {
        const mw = markH * MARK_ASPECT;
        c.drawImage(art.mark, cx - mw / 2, markY, mw, markH);
      }
      drawAlbum(c, t);

      c.textBaseline = 'top';
      c.textAlign = 'left';
      let y = top;
      if (isMasterpiece) drawWord(c, y, t); else if (stars > 0) drawStars(c, y, t);
      y += px(38) * k;
      if (tags.length) { drawTags(c, y, t); y += px(32) * k; }
      const titleSize = px(27) * k, lead = px(31) * k;
      const titleY = y;
      popped(c, ARRIVES.title, cx, titleY + lead / 2, () => {
        c.font = `800 ${titleSize}px ${sans}`;
        c.fillStyle = ink;
        if (isMasterpiece && !still) {
          // A gold light passing through the title, every few seconds.
          const pass = ((t - 2) % 4.5) / 1.3;
          if (t > 2 && pass < 1) {
            const mid = -W * 0.2 + pass * W * 1.4, reach = W * 0.16;
            const shine = c.createLinearGradient(mid - reach, 0, mid + reach, 0);
            shine.addColorStop(0, ink);
            shine.addColorStop(0.5, accent);
            shine.addColorStop(1, ink);
            c.fillStyle = shine;
          }
        }
        c.textAlign = 'center';
        titleLines.forEach((line, i) => c.fillText(line, cx, titleY + i * lead));
        c.textAlign = 'left';
      }, t);
      y += titleLines.length * lead;
      if (artistLine) {
        const artistY = y;
        popped(c, ARRIVES.artist, cx, artistY + px(5), () => {
          c.font = `400 ${px(10) * k}px ${mono}`;
          c.fillStyle = soft;
          drawTracked(c, artistLine, cx, artistY + px(3) * k, px(10) * k * 0.14, 'center');
        }, t);
      }
    }

    let t = still ? 30 : 0;
    return {
      step(dt) { t += dt; },
      paint(c) { paintAt(c, t); },
    };
  }

  return {
    title: 'The record',
    fileName: entry?.slug || 'record',
    masterpiece: isMasterpiece,
    scene,

    // The mark in the print's ink, and the cover, which is also the ground.
    // Either may come back null and the print draws on without it.
    async load({ ground = 'record' } = {}) {
      const [mark, cover] = await Promise.all([
        loadMark(isMasterpiece ? (ground === 'day' ? DEEP_GOLD : GOLD) : ground === 'night' ? INKS.night.ink : INKS.day.ink),
        loadPicture(entry?.album_art),
      ]);
      return { mark, cover };
    },

    // The picture, for Save with nothing moving.
    draw(ctx, frame, { art, families, ground }) {
      scene(frame, { art, families, ground, still: true }).paint(ctx);
      return [];
    },
  };
}
