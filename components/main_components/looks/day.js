// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/day.js
// Day and Night, the default: one record's print as the journal itself would
// draw it. Nobody chooses this one. It is what you get by never opening the
// row, which is why it has to be the plain one, and Night is the same print
// after dark.
//
// What it is (her spec, refined in chat, 2026-11-03): the cover blurred behind
// everything, the mark at the head, the album floating as a solid thing, and
// the horizon as the floor it floats over, full bleed, with no labels. Under
// the album the stars, the tags as their own icons, the title and the artist,
// on a soft scrim of the page colour rather than any border: the artwork goes
// quieter where the marks sit, and the marks stay as they are in the app.
//
// The album sweeps from side to side rather than spinning. A full turn spends
// half its time showing a backwards cover.
//
// ── What the rating earns ────────────────────────────────────────────────
// No rays and no sparkles here, for now (Miyel, 2026-11-03): a grade with a
// `ray` and `wedges` would bring its rays back.
// A Masterpiece is a different object, not a decorated one, and it wears no gold:
// gold looked tacky (Miyel, 2026-11-03). One slow silver glisten across the
// album, the word where the stars were, and the album square and still. The
// diamond stays blue for now: whether to leave it or drop it is still hers to
// decide.
'use client';

import {
  INKS, ARRIVES, TONES, STAR_PATH, HEART_PATH, SYMBOLS, MARK_ASPECT,
  drawTracked, drawPath, wrapLines, roundRect, popped, easeOut, easeBack, clamp01,
  coverPicture, drawTurned, rayPicture, paintGround,
} from '../SharePrinter';

const GOLD = '#e8b84b';                // the stars, as the app draws them
const NIGHT_WASH = 'rgba(14,14,17,0.8)';
const NIGHT_SCRIM = [12, 13, 16];
const PAPER_SCRIM = [238, 240, 236];
const GRADES = {
  masterpiece: { sheen: true },
  high: {},
  middle: {},
  low: {},
};
const SWEEP_SECONDS = 7;
const SWEEP_ANGLE = (18 * Math.PI) / 180;  // how far it turns each way

export function paperScene(night) {
  return (record, frame, { art, families, still = false }) => {
    const { isMasterpiece, stars, artistLine, tags, bars, favs, entry } = record;
    const grade = isMasterpiece ? GRADES.masterpiece : stars >= 4 ? GRADES.high : stars >= 3 ? GRADES.middle : GRADES.low;
    const { sans, mono } = families;
    const W = frame.w, H = frame.h;
    const base = Math.min(W, H * 0.72);
    const px = n => (n * base) / 340;
    const paper = night ? INKS.night : INKS.day;
    const ink = paper.ink;
    const soft = night ? '#c9c5bd' : paper.soft;
    const barColour = night ? 'rgba(255,255,255,0.26)' : paper.bar;

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
    const u = under.getContext('2d');
    if (night) {
      paintGround(u, frame, art?.cover, paper.paper, NIGHT_WASH, { tone: 'saturate(1.2) brightness(0.72)' });
      // The one thing Night adds: a soft beam from above, so the album reads as
      // lit rather than merely dark.
      u.save();
      u.translate(W / 2, -H * 0.06);
      u.scale(W * 0.75, H * 0.52);
      const beam = u.createRadialGradient(0, 0, 0, 0, 0, 1);
      beam.addColorStop(0, 'rgba(255,255,255,0.17)');
      beam.addColorStop(0.68, 'rgba(255,255,255,0)');
      u.fillStyle = beam;
      u.fillRect(-1, 0, 2, 1);
      u.restore();
    } else {
      paintGround(u, frame, art?.cover, paper.paper, INKS.day.wash);
    }
    const picture = coverPicture(art?.cover, size);
    const rays = grade.ray ? rayPicture(W * 1.7, grade.ray, grade.wedges) : null;
    const lit = document.createElement('canvas');

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
          drawPath(c, HEART_PATH, x - heart / 2, tip - heart, heart, 24, TONES.fav);
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
        const local = (t - 1.6) / 2.8;
        if (local < 1) {
          const w = picture.width;
          if (lit.width !== w) { lit.width = w; lit.height = w; }
          const l = lit.getContext('2d');
          l.clearRect(0, 0, w, w);
          l.drawImage(picture, 0, 0);
          l.globalCompositeOperation = 'source-atop';
          const mid = -w * 0.3 + local * w * 1.6;
          const g = l.createLinearGradient(mid - w * 0.2, 0, mid + w * 0.2, w * 0.25);
          g.addColorStop(0, 'rgba(226,231,238,0)');
          g.addColorStop(0.5, 'rgba(226,231,238,0.42)');
          g.addColorStop(1, 'rgba(226,231,238,0)');
          l.fillStyle = g;
          l.fillRect(0, 0, w, w);
          l.globalCompositeOperation = 'source-over';
          face = lit;
        }
      }
      drawTurned(c, face, cx, cy + lift, size * scale, angle, angle === 0 ? 0 : size * 0.06 * scale);
    }

    function paintAt(c, t) {
      c.drawImage(under, 0, 0);
      const grow = easeOut(Math.min(1, t / 0.9));
      if (rays) {
        c.save();
        c.translate(cx, cy);
        c.scale(grow, grow);
        c.rotate((t * Math.PI * 2) / 40);
        c.drawImage(rays, -rays.width / 2, -rays.height / 2);
        c.restore();
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
  };
}
