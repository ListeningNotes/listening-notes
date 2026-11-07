// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/trading.js
// Trading: the record as a collectible card (Miyel, 2026-11-06). The title in the name
// bar, the real cover in the window, the artist on the type line, the stars and marks as
// its stats, the horizon with each track's title running down under its bar, the mark
// as the set symbol. It starts face down, showing its LN back, flips over once, then
// a shine runs across it once, silver, or gold on a gold card for a Masterpiece.
// Still is the card with its shine caught at the corner.
'use client';

import { HEART_PATH, INKS, MARK_ASPECT, STAR_PATH, SYMBOLS, clamp01, drawPath, ellipsize, roundRect, sheet } from '../SharePrinter';
import { coverOf, hueOf, markIn } from './poster';

const FACE_DOWN = 0.6, TURNS_IN = 0.8; // resting on its back, then the one flip
const SETTLED = FACE_DOWN + TURNS_IN;
const smooth = v => v * v * (3 - 2 * v);
const SHINE_AFTER = 0.25, SWEEPS_IN = 1.3; // the shine's one pass, once it is face up
const TONES = { mp: '#2f7bf0', fav: '#ee2f3f', formative: '#1f9e58' };
const ORDER = ['mp', 'fav', 'formative'];

export const tradingScene = night => (record, frame, { art, families, still = false }) => {
  const { stars, artistLine, tags, bars, favs, trackNames, entry } = record;
  const { sans, mono } = families;
  const W = frame.w, H = frame.h;
  const u = Math.min(W, (H * 9) / 16) / 100;
  const paper = night ? INKS.night.paper : INKS.day.paper;
  const hue = hueOf(art);
  // A Masterpiece is the rare one in the pack: a gold card with a gold shine.
  const gilded = record.isMasterpiece;
  const frameTop = gilded ? '#ffe9a3' : hue === null ? '#d9dbe0' : `hsl(${hue},72%,62%)`;
  const frameEnd = gilded ? '#b8862b' : hue === null ? '#8f939c' : `hsl(${(hue + 30) % 360},78%,40%)`;
  const inkDark = '#14110f';

  // The card is the whole picture, edge to edge (Miyel, 2026-11-06).
  const cardW = W, cardH = H, radius = 0;
  const cx = W / 2;

  const front = sheet(cardW, cardH, c => {
    roundRect(c, 0, 0, cardW, cardH, radius);
    c.clip();
    c.fillStyle = '#17120e';
    c.fillRect(0, 0, cardW, cardH);
    const rim = 0;
    const face = c.createLinearGradient(0, 0, cardW, cardH);
    face.addColorStop(0, frameTop);
    face.addColorStop(1, frameEnd);
    c.fillStyle = face;
    roundRect(c, rim, rim, cardW - rim * 2, cardH - rim * 2, radius * 0.6);
    c.fill();

    const pad = 5 * u, inner = cardW - pad * 2;
    const window_ = Math.min(inner, cardH * 0.56), artX = (cardW - window_) / 2;

    // The name bar.
    const barH = 10 * u;
    c.fillStyle = 'rgba(255,255,255,0.86)';
    roundRect(c, pad, pad, inner, barH, 1.4 * u);
    c.fill();
    let titlePx = 6.2 * u;
    c.font = `900 ${titlePx}px ${sans}`;
    const titleRoom = inner - 4 * u;
    const across = c.measureText(entry?.album || '').width;
    if (across > titleRoom) titlePx *= titleRoom / across;
    c.font = `900 ${titlePx}px ${sans}`;
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    c.fillStyle = inkDark;
    c.fillText(entry?.album || '', pad + 2 * u, pad + barH / 2 + 0.2 * u);

    // The window.
    const artY = pad + barH + 1.6 * u;
    c.fillStyle = inkDark;
    c.fillRect(artX - 0.4 * u, artY - 0.4 * u, window_ + 0.8 * u, window_ + 0.8 * u);
    c.drawImage(coverOf(art, window_), artX, artY);

    // The type line.
    const lineY = artY + window_ + 1.2 * u, lineH = 5.2 * u;
    c.fillStyle = 'rgba(255,255,255,0.86)';
    roundRect(c, pad, lineY, inner, lineH, 1 * u);
    c.fill();
    let artistPx = 2.5 * u;
    c.font = `400 ${artistPx}px ${mono}`;
    const artistAcross = c.measureText(artistLine).width;
    if (artistAcross > inner - 3 * u) artistPx *= (inner - 3 * u) / artistAcross;
    c.font = `400 ${artistPx}px ${mono}`;
    c.fillStyle = inkDark;
    c.fillText(artistLine, pad + 1.5 * u, lineY + lineH / 2 + 0.1 * u);

    // The stats: stars at the left, the marks at the right.
    const statY = lineY + lineH + 1.4 * u, box = 6.4 * u, gap = 0.8 * u;
    for (let i = 0; i < 5 && stars > 0; i++) {
      const x = pad + i * (box + gap);
      drawPath(c, STAR_PATH, x, statY, box, 18, 'rgba(0,0,0,0.22)');
      const part = clamp01(stars - i);
      if (part > 0) {
        c.save();
        c.beginPath();
        c.rect(x, statY, box * part, box);
        c.clip();
        drawPath(c, STAR_PATH, x, statY, box, 18, '#ffe45c');
        c.restore();
      }
    }
    ORDER.filter(tag => tags.includes(tag)).reverse().forEach((tag, i) => {
      const r = box * 0.62, mx = pad + inner - r - i * (r * 2 + gap), my = statY + box / 2;
      c.fillStyle = TONES[tag];
      c.beginPath();
      c.arc(mx, my, r, 0, Math.PI * 2);
      c.fill();
      c.lineWidth = 0.35 * u;
      c.strokeStyle = 'rgba(255,255,255,0.9)';
      c.stroke();
      const icon = r * 1.25;
      drawPath(c, SYMBOLS[tag], mx - icon / 2, my - icon / 2, icon, 256, '#ffffff');
    });

    // The tracks: the horizon standing upright in the card's text box, each bar with its
    // heart. With no titles on record, the horizon alone fills the box.
    const stripY = statY + box + 1.4 * u, stripH = cardH - stripY - rim - 6.4 * u;
    c.fillStyle = 'rgba(255,255,255,0.86)';
    roundRect(c, pad, stripY, inner, stripH, 1 * u);
    c.fill();
    const boxPad = 1.2 * u;
    const heart = 2 * u;
    const horizonH = trackNames.length ? 10 * u : stripH - boxPad * 2;
    if (bars.length) {
      const slot = (inner - boxPad * 2) / bars.length;
      const size = Math.min(heart, slot * 0.9);
      const tall = horizonH - size - 0.4 * u;
      bars.forEach((v, i) => {
        const h = Math.max(tall * 0.08, tall * v);
        const x = pad + boxPad + i * slot;
        const foot = stripY + boxPad + horizonH;
        c.fillStyle = frameEnd;
        c.fillRect(x + slot * 0.1, foot - h, slot * 0.8, h);
        if (favs[i]) drawPath(c, HEART_PATH, x + (slot - size) / 2, foot - h - size - 0.2 * u, size, 24, TONES.fav);
      });
    }
    // Each title runs down under its bar, as on the album page.
    if (trackNames.length) {
      const slot = (inner - boxPad * 2) / trackNames.length;
      const listY = stripY + boxPad + (bars.length ? horizonH + 0.8 * u : 0);
      const long = stripY + stripH - boxPad * 0.6 - listY;
      const px = Math.min(2.2 * u, slot * 0.72);
      c.font = `400 ${px}px ${mono}`;
      c.textBaseline = 'middle';
      c.textAlign = 'left';
      c.fillStyle = inkDark;
      trackNames.forEach((name, i) => {
        c.save();
        c.translate(pad + boxPad + i * slot + slot / 2, listY);
        c.rotate(Math.PI / 2);
        c.fillText(ellipsize(c, name, long), 0, 0);
        c.restore();
      });
    }

    // The foot: the set symbol, and how many in the set.
    const footY = cardH - rim - 5.4 * u;
    const markH = 3.2 * u, markW = markH * MARK_ASPECT;
    c.drawImage(markIn(art, markW, markH, inkDark), pad, footY);
    if (bars.length) {
      c.font = `400 ${2.1 * u}px ${mono}`;
      c.textAlign = 'right';
      c.fillStyle = inkDark;
      c.fillText(`${bars.length} ${bars.length === 1 ? 'TRACK' : 'TRACKS'}`, pad + inner, footY + markH / 2);
    }
  });

  // The back is the same on every card: black, and the logo.
  const back = sheet(cardW, cardH, c => {
    roundRect(c, 0, 0, cardW, cardH, radius);
    c.clip();
    c.fillStyle = '#111111';
    c.fillRect(0, 0, cardW, cardH);
    const markH = 20 * u, markW = markH * MARK_ASPECT;
    c.drawImage(markIn(art, markW, markH, '#ffffff'), (cardW - markW) / 2, (cardH - markH) / 2);
  });

  // The shine: a band of silver on the slant, or gold, kept to the card's own shape.
  const foilW = cardW * 2.2;
  const foil = sheet(foilW, cardH, c => {
    c.setTransform(1, 0, -0.45, 1, cardH * 0.45, 0);
    const g = c.createLinearGradient(0, 0, foilW * 0.7, 0);
    const shine = gilded ? '255,215,102' : '255,255,255';
    g.addColorStop(0.32, `rgba(${shine},0)`);
    g.addColorStop(0.45, `rgba(${shine},1)`);
    g.addColorStop(0.5, `rgba(${shine},0.5)`);
    g.addColorStop(0.53, `rgba(${shine},0.85)`);
    g.addColorStop(0.66, `rgba(${shine},0)`);
    c.fillStyle = g;
    c.fillRect(-cardH, 0, foilW + cardH * 2, cardH);
  });
  const shade = sheet(cardW, cardH, () => {});
  const onShade = shade.getContext('2d');
  function foiled(t) {
    onShade.globalCompositeOperation = 'source-over';
    onShade.clearRect(0, 0, cardW, cardH);
    onShade.drawImage(front, 0, 0);
    onShade.globalCompositeOperation = 'source-atop';
    onShade.globalAlpha = still ? 0.3 : 0.6;
    const pass = still ? 0.3 : (t - SETTLED - SHINE_AFTER) / SWEEPS_IN;
    if (pass >= 0 && pass <= 1) onShade.drawImage(foil, cardW - pass * (foilW + cardW), 0);
    onShade.globalAlpha = 1;
    return shade;
  }

  function paintAt(c, t) {
    c.fillStyle = paper;
    c.fillRect(0, 0, W, H);

    const turn = (1 - smooth(clamp01((t - FACE_DOWN) / TURNS_IN))) * Math.PI;
    const facing = Math.cos(turn);
    const across = cardW * Math.max(0.02, Math.abs(facing));
    if (facing >= 0) c.drawImage(foiled(t), cx - across / 2, 0, across, cardH);
    else c.drawImage(back, cx - across / 2, 0, across, cardH);
  }

  let t = still ? 30 : 0;
  return {
    step(dt) { t += dt; },
    paint(c) { paintAt(c, t); },
  };
};
