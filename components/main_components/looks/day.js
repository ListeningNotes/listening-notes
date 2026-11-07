// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/day.js
// Day and Night, the default: the card as it reads on the entry page, exported,
// in day mode or night mode (Miyel, 2026-11-04). The page's own colour, the cover,
// the title with the artist under it, and one line of the stars and the marks given
// (2026-11-07), over the keeper's face and
// the mark, signing off together at the foot, with no horizon (trying, 2026-11-06). It is the plain one on purpose.
// Animated, the album and the words are there from the first frame and the stars and marks
// come up slowly and glow gently, breathing, like lights: the stars from the left, each
// one starting as the last is warming, then the marks (Miyel, 2026-11-06). Still is the last
// moment as a picture. Not the posted date: a line nobody needed on a print (2026-09-12).
//
// The numbers are the post's own pixels, on a 340-wide column.
'use client';

import { signatureOf } from './poster';
import {
  INKS, STAR_PATH, SYMBOLS, MARK_ASPECT,
  drawTracked, drawPath, roundRect, wrapLines, clamp01, sheet,
} from '../SharePrinter';

const COL = 340, ART = 290, ART_RADIUS = 16;
const SIGN_H = 30, STORY_TOP = 0.09, STORY_FOOT = 0.11;
const TITLE = 26, TITLE_LEAD = 26 * 1.22;
const ARTIST = 11, ARTIST_LEAD = 11 * 1.4;
const STAR = 44, STAR_GAP = 6, MARK = 38, MARK_GAP = 8, MARKS_APART = 18;
const GAP = 12;
const PAD = 0.07;
const GOLD = '#E8B84B';
const MARKS = [
  { tag: 'mp', ink: '#4a9bf0' },
  { tag: 'fav', ink: '#f0484f' },
  { tag: 'formative', ink: '#3fa96b' },
];
const STARS_AT = 0.4, STAR_EVERY = 0.2;   // each star starting to come up
const MARKS_AT = 1.6, MARK_EVERY = 0.28;  // each mark given
const WARMS_IN = 0.5;                     // a light coming up
const smooth = v => v * v * (3 - 2 * v);

export function paperScene(night, ground = null) {
  return (record, frame, { art, families, still = false }) => {
    const { stars, artistLine, tags, entry } = record;
    const { sans, mono } = families;
    const ink = night ? INKS.night : INKS.day;
    const W = frame.w, H = frame.h;
    const measure = document.createElement('canvas').getContext('2d');

    // Width sets the unit; if the stack overruns the paper, the unit comes down
    // by the overrun, and everything with it.
    // The stars and the marks given share one line, a little smaller if it would be too wide.
    const given = MARKS.filter(({ tag }) => tags.includes(tag));
    const across = (stars > 0 ? 5 * STAR + 4 * STAR_GAP : 0)
      + (given.length ? given.length * MARK + (given.length - 1) * MARK_GAP + (stars > 0 ? MARKS_APART : 0) : 0);
    const fit = Math.min(1, COL / Math.max(1, across));
    const rowH = stars > 0 || given.length ? Math.max(stars > 0 ? STAR : 0, given.length ? MARK : 0) * fit : 0;
    const lay = U => {
      measure.font = `700 ${TITLE * U}px ${sans}`;
      const titleLines = wrapLines(measure, entry?.album || '', COL * U, 3);
      measure.font = `400 ${ARTIST * U}px ${mono}`;
      const artistLines = wrapLines(measure, artistLine, COL * U * 0.86, 2);
      const h = (ART + GAP) * U + titleLines.length * TITLE_LEAD * U
        + (artistLines.length ? GAP * 0.35 * U + artistLines.length * ARTIST_LEAD * U : 0)
        + (rowH ? (GAP * 1.4 + rowH) * U : 0)
        + (GAP * 1.6 + SIGN_H) * U;
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

    // The cover with its lift and hairline, once; a shadow is dear on every frame.
    const size = px(ART), radius = px(ART_RADIUS), margin = px(60);
    const card = sheet(size + margin * 2, size + margin * 2, c => {
      c.save();
      c.shadowColor = ink.lift[1];
      c.shadowBlur = px(48);
      c.shadowOffsetY = px(16);
      c.fillStyle = ink.warm;
      roundRect(c, margin, margin, size, size, radius);
      c.fill();
      c.shadowColor = ink.lift[0];
      c.shadowBlur = px(20);
      c.shadowOffsetY = px(4);
      c.fill();
      c.restore();
      if (art?.cover?.naturalWidth) {
        c.save();
        roundRect(c, margin, margin, size, size, radius);
        c.clip();
        c.drawImage(art.cover, margin, margin, size, size);
        c.restore();
      }
      c.strokeStyle = ink.edge;
      c.lineWidth = Math.max(1, px(0.8));
      roundRect(c, margin, margin, size, size, radius);
      c.stroke();
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
    const strength = since => (still ? 0.9 : warmed(since) * (0.78 + 0.22 * Math.sin(since * 2.4)));

    const signature = signatureOf({ art, record, mono, height: px(SIGN_H), colour: ink.soft, faceOnly: true });

    function paintAt(c, t) {
      if (behind) behind.paint(c, t);
      else {
        c.fillStyle = ink.paper;
        c.fillRect(0, 0, W, H);
      }
      const cx = W / 2;

      // All of it centred in the room there is. The keeper's face and the mark sign off
      // together at the foot.
      const top = story
        ? H * STORY_TOP + Math.max(0, (H * (1 - STORY_TOP - STORY_FOOT) - laid.h) / 2)
        : (H - laid.h) / 2;
      let y = top;

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
          const starY = y + (px(rowH) - starBox) / 2;
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
        given.forEach(({ tag, ink: lit }, turn) => {
          const markY = y + (px(rowH) - markBox) / 2;
          const since = t - (MARKS_AT + turn * MARK_EVERY);
          drawPath(c, SYMBOLS[tag], x, markY, markBox, 256, ink.rule);
          if (since > 0) {
            c.globalAlpha = strength(since);
            c.drawImage(markGlows[tag], x - halo, markY - halo);
            c.globalAlpha = warmed(since);
            drawPath(c, SYMBOLS[tag], x, markY, markBox, 256, lit);
            c.globalAlpha = 1;
          }
          x += markBox + px(MARK_GAP * fit);
        });
        y += px(rowH);
      }

      // The keeper's face right beside the mark's L, signing off together.
      const signY = y + px(GAP * 1.6);
      const markW = art?.mark ? px(SIGN_H * 0.86) * MARK_ASPECT : 0;
      const faceW = signature ? signature.width + px(7) : 0;
      const signX = cx - (faceW + markW) / 2;
      if (signature) c.drawImage(signature, signX, signY);
      if (art?.mark) c.drawImage(art.mark, signX + faceW, signY + px(SIGN_H * 0.07), markW, px(SIGN_H * 0.86));
    }

    const behind = ground ? ground(record, frame, { art, night, still }) : null;

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
