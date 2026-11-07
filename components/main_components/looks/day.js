// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/day.js
// Day and Night, the default: the card as it reads on the entry page, exported,
// in day mode or night mode (Miyel, 2026-11-04). The page's own colour, the cover,
// the title with the artist under it, and one line of the stars and the marks given
// (2026-11-07), under the keeper's face and
// the mark at the head, with the horizon faintly behind it all. It is the plain one on purpose.
// Animated, the album and the words are there from the first frame and the stars and marks
// come up slowly and glow gently, breathing, like lights: the stars from the left, each
// one starting as the last is warming, then the marks (Miyel, 2026-11-06). Still is the last
// moment as a picture. Not the posted date: a line nobody needed on a print (2026-09-12).
//
// The numbers are the post's own pixels, on a 340-wide column.
'use client';

import { signatureOf } from './poster';
import {
  INKS, STAR_PATH, HEART_PATH, SYMBOLS, MARK_ASPECT,
  drawTracked, drawPath, roundRect, wrapLines, clamp01, sheet,
} from '../SharePrinter';

const COL = 340, ART = 290, ART_RADIUS = 16;
const HEAD_H = 34, STORY_TOP = 0.09, STORY_FOOT = 0.11;
const TITLE = 26, TITLE_LEAD = 26 * 1.22;
const ARTIST = 11, ARTIST_LEAD = 11 * 1.4;
// Each mark carries its name small underneath, for whoever does not know Listening Notes
// (Miyel, 2026-11-07), so the marks stand a word's width apart.
const STAR = 44, STAR_GAP = 6, MARK = 38, MARK_SLOT = 66, MARKS_APART = 6, MARK_WORD = 7.5;
const GAP = 12;
const PAD = 0.07;
const GOLD = '#E8B84B';
const MARKS = [
  { tag: 'mp', word: 'Masterpiece', ink: '#4a9bf0' },
  { tag: 'fav', word: 'Favorite', ink: '#f0484f' },
  { tag: 'formative', word: 'Formative', ink: '#3fa96b' },
];
const STARS_AT = 0.4, STAR_EVERY = 0.2;   // each star starting to come up
const MARKS_AT = 1.6, MARK_EVERY = 0.28;  // each mark given
const WARMS_IN = 0.5;                     // a light coming up
const smooth = v => v * v * (3 - 2 * v);
const HORIZON_AT = 0.2, HORIZON_IN = 1.4;

export function paperScene(night, ground = null) {
  return (record, frame, { art, families, still = false }) => {
    const { stars, artistLine, tags, bars, favs, entry } = record;
    const { sans, mono } = families;
    const ink = night ? INKS.night : INKS.day;
    const W = frame.w, H = frame.h;
    const measure = document.createElement('canvas').getContext('2d');

    // Width sets the unit; if the stack overruns the paper, the unit comes down
    // by the overrun, and everything with it.
    // The stars and the marks given share one line, a little smaller if it would be too wide.
    const given = MARKS.filter(({ tag }) => tags.includes(tag));
    const across = (stars > 0 ? 5 * STAR + 4 * STAR_GAP : 0)
      + (given.length ? given.length * MARK_SLOT + (stars > 0 ? MARKS_APART : 0) : 0);
    const fit = Math.min(1, COL / Math.max(1, across));
    const rowH = stars > 0 || given.length ? Math.max(stars > 0 ? STAR : 0, given.length ? MARK + 4 + MARK_WORD * 1.3 : 0) * fit : 0;
    const lay = U => {
      measure.font = `700 ${TITLE * U}px ${sans}`;
      const titleLines = wrapLines(measure, entry?.album || '', COL * U, 3);
      measure.font = `400 ${ARTIST * U}px ${mono}`;
      const artistLines = wrapLines(measure, artistLine, COL * U * 0.86, 2);
      const h = (HEAD_H + GAP + ART + GAP) * U + titleLines.length * TITLE_LEAD * U
        + (artistLines.length ? GAP * 0.35 * U + artistLines.length * ARTIST_LEAD * U : 0)
        + (rowH ? (GAP * 1.4 + rowH) * U : 0);
      return { titleLines, artistLines, h };
    };
    // A story leaves Instagram's top alone and the foot for the Link sticker.
    const story = W / H < 0.6;
    const roomW = W * (1 - PAD * 2);
    const roomH = story ? H * (1 - STORY_TOP - STORY_FOOT) : H * (1 - PAD * 2);
    let U = roomW / COL;
    let laid = lay(U);
    if (laid.h > roomH) { U *= roomH / laid.h; laid = lay(U); }
    const px = n => n * U;

    // The cover, flat: no shadow or hairline round it. Instagram's compression turns the
    // faint steps of a soft shadow on a dark page into visible rings (Miyel, 2026-11-07).
    const size = px(ART), radius = px(ART_RADIUS);
    const card = sheet(size, size, c => {
      if (!art?.cover?.naturalWidth) return;
      roundRect(c, 0, 0, size, size, radius);
      c.clip();
      c.drawImage(art.cover, 0, 0, size, size);
    });

    // A light's glow in its own shape, baked once: a shadow is dear on every frame. The
    // shape itself is drawn off the sheet, so only its shadow lands. The strength is how
    // long the light has been on, breathing slowly; on Still it just glows.
    const halo = px(24);
    const glowOf = (path, viewBox, box, colour) => sheet(box + halo * 2, box + halo * 2, g => {
      const away = (box + halo * 2) * 2;
      g.shadowColor = colour;
      g.shadowBlur = halo * 0.7;
      g.shadowOffsetX = away;
      drawPath(g, path, halo - away, halo, box, viewBox, colour);
      drawPath(g, path, halo - away, halo, box, viewBox, colour);
    });
    const starGlow = glowOf(STAR_PATH, 18, px(STAR * fit), GOLD);
    const markGlows = Object.fromEntries(MARKS.map(({ tag, ink: lit }) => [tag, tags.includes(tag) ? glowOf(SYMBOLS[tag], 256, px(MARK * fit), lit) : null]));
    const warmed = since => smooth(clamp01(since / WARMS_IN));
    // Held still, a glow is a shape rather than a light, so it is a good deal fainter.
    const strength = since => (still ? 0.38 : warmed(since) * (0.78 + 0.22 * Math.sin(since * 2.4)));

    const signature = signatureOf({ art, record, mono, height: px(HEAD_H), colour: ink.soft, faceOnly: true });

    // The horizon, faintly, rising from the foot of the page, its tallest bar and its hearts
    // stopping under the stars and marks (Miyel, 2026-11-07).
    function paintHorizon(c, t) {
      if (!bars.length) return;
      const rise = smooth(clamp01((t - HORIZON_AT) / HORIZON_IN));
      if (rise <= 0) return;
      const tallest = Math.max(px(10), H - horizonTop() - px(GAP + 17));
      const slot = W / bars.length, gap = Math.min(px(4), slot * 0.14);
      const heart = Math.min(px(13), slot * 0.7);
      bars.forEach((v, i) => {
        const h = Math.max(tallest * 0.05, tallest * v) * rise;
        c.fillStyle = night ? 'rgba(232,228,220,0.075)' : 'rgba(26,26,26,0.06)';
        c.fillRect(i * slot + gap / 2, H - h, slot - gap, h);
        if (favs[i]) {
          c.globalAlpha = 0.35;
          drawPath(c, HEART_PATH, i * slot + (slot - heart) / 2, H - h - heart - px(4), heart, 24, '#f0484f');
          c.globalAlpha = 1;
        }
      });
    }

    function paintAt(c, t) {
      if (behind) behind.paint(c, t);
      else {
        c.fillStyle = ink.paper;
        c.fillRect(0, 0, W, H);
      }
      if (fog) c.drawImage(fog, 0, fogY);
      if (!behind || behind.horizon) paintHorizon(c, t);
      const cx = W / 2;

      // The keeper's face and the mark side by side, centred over the cover (Miyel, 2026-11-07).
      const mw = art?.mark ? px(HEAD_H * 0.8) * MARK_ASPECT : 0;
      const faceW = signature ? signature.width + (mw ? px(9) : 0) : 0;
      const headX = cx - (faceW + mw) / 2;
      if (signature) c.drawImage(signature, headX, top + (px(HEAD_H) - signature.height) / 2);
      if (art?.mark) c.drawImage(art.mark, headX + faceW, top + px(HEAD_H * 0.1), mw, px(HEAD_H * 0.8));
      let y = top + px(HEAD_H + GAP);

      c.drawImage(card, cx - card.width / 2, y + size / 2 - card.height / 2);
      y += size + px(GAP);

      c.textBaseline = 'top';
      c.textAlign = 'center';
      c.font = `700 ${px(TITLE)}px ${sans}`;
      c.fillStyle = ink.ink;
      laid.titleLines.forEach((line, i) => c.fillText(line, cx, y + i * px(TITLE_LEAD)));
      c.textAlign = 'left';
      y += laid.titleLines.length * px(TITLE_LEAD);

      if (laid.artistLines.length) {
        y += px(GAP * 0.35);
        c.font = `400 ${px(ARTIST)}px ${mono}`;
        c.fillStyle = ink.soft;
        laid.artistLines.forEach((line, i) => drawTracked(c, line, cx, y + i * px(ARTIST_LEAD), px(ARTIST) * 0.14, 'center'));
        y += laid.artistLines.length * px(ARTIST_LEAD);
      }

      // One line: the stars, then the marks given, turning on in turn.
      if (rowH) {
        y += px(GAP * 1.4);
        const starBox = px(STAR * fit), markBox = px(MARK * fit);
        let x = cx - px(across * fit) / 2;
        for (let i = 0; i < 5 && stars > 0; i++) {
          const sx = x;
          const starY = y + (px(MARK * fit) - starBox) / 2;
          drawPath(c, STAR_PATH, sx, starY, starBox, 18, ink.unlit);
          const part = clamp01(stars - i);
          const since = t - (STARS_AT + i * STAR_EVERY);
          if (part > 0 && since > 0) {
            // The whole star's glow, however much of it is lit, a half star's at half.
            c.globalAlpha = strength(since) * part;
            c.drawImage(starGlow, sx - halo, starY - halo);
            c.globalAlpha = warmed(since);
            c.save();
            c.beginPath();
            c.rect(sx, starY, starBox * part, starBox);
            c.clip();
            drawPath(c, STAR_PATH, sx, starY, starBox, 18, GOLD);
            c.restore();
            c.globalAlpha = 1;
          }
          x += px((STAR + STAR_GAP) * fit);
        }
        if (stars > 0 && given.length) x += px((MARKS_APART - STAR_GAP) * fit);
        const slot = px(MARK_SLOT * fit);
        given.forEach(({ tag, word, ink: lit }, turn) => {
          const markY = y;
          const mx = x + (slot - markBox) / 2;
          const since = t - (MARKS_AT + turn * MARK_EVERY);
          const wordAt = () => {
            c.font = `400 ${px(MARK_WORD * fit)}px ${mono}`;
            c.textBaseline = 'top';
            drawTracked(c, word.toUpperCase(), x + slot / 2, markY + markBox + px(4 * fit), px(MARK_WORD * fit) * 0.08, 'center');
          };
          drawPath(c, SYMBOLS[tag], mx, markY, markBox, 256, ink.rule);
          c.fillStyle = ink.faint;
          wordAt();
          if (since > 0) {
            c.globalAlpha = strength(since);
            c.drawImage(markGlows[tag], mx - halo, markY - halo);
            c.globalAlpha = warmed(since);
            drawPath(c, SYMBOLS[tag], mx, markY, markBox, 256, lit);
            c.fillStyle = lit;
            wordAt();
            c.globalAlpha = 1;
          }
          x += slot;
        });
        y += px(rowH);
      }

    }

    // A soft bank of the page's colour behind the words, so the background can stay clear.
    const top = story
      ? H * STORY_TOP + Math.max(0, (H * (1 - STORY_TOP - STORY_FOOT) - laid.h) / 2)
      : (H - laid.h) / 2;
    const behind = ground ? ground(record, frame, { art, night, still, place: { y: top + size / 2, size } }) : null;
    const horizonTop = () => top + laid.h;
    const feather = px(56);
    const fogY = top + px(HEAD_H + GAP) + size - feather * 0.6;
    const fog = behind?.fog ? sheet(W, Math.max(1, top + laid.h + feather * 1.2 - fogY), f => {
      const shade = night ? '14,14,14' : '238,240,236';
      const tall = f.canvas.height;
      const soft = f.createLinearGradient(0, 0, 0, tall);
      soft.addColorStop(0, `rgba(${shade},0)`);
      soft.addColorStop(Math.min(0.45, feather / tall), `rgba(${shade},0.9)`);
      soft.addColorStop(Math.max(0.55, 1 - feather / tall), `rgba(${shade},0.9)`);
      soft.addColorStop(1, `rgba(${shade},0)`);
      f.fillStyle = soft;
      f.fillRect(0, 0, W, tall);
    }) : null;

    let t = still ? 30 : 0;
    return {
      step(dt) { t += dt; },
      paint(c) {
        paintAt(c, t);
        behind?.over?.(c, t);
      },
    };
  };
}
