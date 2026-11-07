// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/trading.js
// Trading: the record as a collectible card (Miyel, 2026-11-06). The title in the name
// bar, the real cover in the window, the artist on the type line, the stars and marks as
// its stats, the tracks as a strip, the mark as the set symbol. It flips over into place
// from its back, then foil keeps sweeping across it. Still is the card with its sheen.
'use client';

import { HEART_PATH, INKS, MARK_ASPECT, STAR_PATH, SYMBOLS, clamp01, drawPath, roundRect, sheet } from '../SharePrinter';
import { coverOf, easeOut, hueOf, markIn } from './poster';

const FLIPS_IN = 1.2, TURNS = 3;       // half-turns on the way in
const SWEEP_EVERY = 2.4;
const TONES = { mp: '#2f7bf0', fav: '#ee2f3f', formative: '#1f9e58' };
const ORDER = ['mp', 'fav', 'formative'];

export const tradingScene = night => (record, frame, { art, families, still = false }) => {
  const { stars, artistLine, tags, bars, favs, entry } = record;
  const { sans, mono } = families;
  const W = frame.w, H = frame.h;
  const u = Math.min(W, (H * 9) / 16) / 100;
  const paper = night ? INKS.night.paper : INKS.day.paper;
  const hue = hueOf(art);
  const frameTop = hue === null ? '#d9dbe0' : `hsl(${hue},72%,62%)`;
  const frameEnd = hue === null ? '#8f939c' : `hsl(${(hue + 30) % 360},78%,40%)`;
  const inkDark = '#14110f';

  const cardW = 88 * u, cardH = 126 * u, radius = 4.5 * u;
  const cx = W / 2, cy = H / 2;
  const y0 = (H - cardH) / 2;

  const front = sheet(cardW, cardH, c => {
    roundRect(c, 0, 0, cardW, cardH, radius);
    c.clip();
    c.fillStyle = '#17120e';
    c.fillRect(0, 0, cardW, cardH);
    const rim = 2.2 * u;
    const face = c.createLinearGradient(0, 0, cardW, cardH);
    face.addColorStop(0, frameTop);
    face.addColorStop(1, frameEnd);
    c.fillStyle = face;
    roundRect(c, rim, rim, cardW - rim * 2, cardH - rim * 2, radius * 0.6);
    c.fill();

    const pad = rim + 2.4 * u, inner = cardW - pad * 2;

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
    c.fillRect(pad - 0.4 * u, artY - 0.4 * u, inner + 0.8 * u, inner + 0.8 * u);
    c.drawImage(coverOf(art, inner), pad, artY);

    // The type line.
    const lineY = artY + inner + 1.2 * u, lineH = 5.2 * u;
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

    // The tracks.
    const stripY = statY + box + 1.4 * u, stripH = cardH - stripY - rim - 7 * u;
    const heart = 2.2 * u;
    const slot = bars.length ? inner / bars.length : 0;
    bars.forEach((v, i) => {
      const room = stripH - heart - 0.4 * u;
      const h = Math.max(room * 0.08, room * v);
      c.fillStyle = 'rgba(255,255,255,0.92)';
      c.fillRect(pad + i * slot + slot * 0.1, stripY + stripH - h, slot * 0.8, h);
      if (favs[i]) drawPath(c, HEART_PATH, pad + i * slot + (slot - Math.min(heart, slot)) / 2, stripY + stripH - h - Math.min(heart, slot) - 0.2 * u, Math.min(heart, slot), 24, '#ffffff');
    });

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

  const back = sheet(cardW, cardH, c => {
    roundRect(c, 0, 0, cardW, cardH, radius);
    c.clip();
    c.fillStyle = '#17120e';
    c.fillRect(0, 0, cardW, cardH);
    c.strokeStyle = frameTop;
    c.lineWidth = 1.4 * u;
    roundRect(c, 3.4 * u, 3.4 * u, cardW - 6.8 * u, cardH - 6.8 * u, radius * 0.6);
    c.stroke();
    c.beginPath();
    c.ellipse(cardW / 2, cardH / 2, 26 * u, 36 * u, 0, 0, Math.PI * 2);
    c.stroke();
    const markH = 13 * u, markW = markH * MARK_ASPECT;
    c.drawImage(markIn(art, markW, markH, frameTop), (cardW - markW) / 2, (cardH - markH) / 2);
  });

  // The foil: a rainbow on the slant, kept to the card's own shape.
  const foilW = cardW * 2.2;
  const foil = sheet(foilW, cardH, c => {
    c.setTransform(1, 0, -0.45, 1, cardH * 0.45, 0);
    const g = c.createLinearGradient(0, 0, foilW * 0.7, 0);
    [['#ff5e87', 0.2], ['#ffe45c', 0.32], ['#5effa8', 0.44], ['#5ec8ff', 0.56], ['#c77dff', 0.68]].forEach(([colour, at]) => g.addColorStop(at, colour));
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.9, 'rgba(255,255,255,0)');
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
    onShade.globalAlpha = still ? 0.22 : 0.34;
    const pass = still ? 0.42 : ((t - FLIPS_IN) % SWEEP_EVERY + SWEEP_EVERY) % SWEEP_EVERY / SWEEP_EVERY;
    onShade.drawImage(foil, cardW - pass * (foilW + cardW), 0);
    onShade.globalAlpha = 1;
    return shade;
  }

  function paintAt(c, t) {
    c.fillStyle = paper;
    c.fillRect(0, 0, W, H);

    const settled = t >= FLIPS_IN;
    const turn = (1 - easeOut(clamp01(t / FLIPS_IN))) * TURNS * Math.PI;
    const facing = Math.cos(turn);
    const across = cardW * Math.max(0.02, Math.abs(facing));
    const bob = still || !settled ? 0 : Math.sin((t - FLIPS_IN) * 1.4) * 0.8 * u;
    const y = y0 + bob;

    c.save();
    c.shadowColor = night ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.3)';
    c.shadowBlur = 6 * u;
    c.shadowOffsetY = 2 * u;
    c.fillStyle = '#000';
    roundRect(c, cx - across / 2, y, across, cardH, radius * (across / cardW));
    c.fill();
    c.restore();
    if (facing >= 0) c.drawImage(foiled(t), cx - across / 2, y, across, cardH);
    else c.drawImage(back, cx - across / 2, y, across, cardH);
  }

  let t = still ? 30 : 0;
  return {
    step(dt) { t += dt; },
    paint(c) { paintAt(c, t); },
  };
};
