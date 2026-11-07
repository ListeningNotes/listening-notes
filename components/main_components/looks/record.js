// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/record.js
// Record: a disc slides out from behind the real cover, and the tracks stand around it
// like rays, each as long as its rating, in the album's one colour. The words are large
// and low on the page.
'use client';

import { HEART_PATH, INKS, MARK_ASPECT, clamp01, drawPath, sheet } from '../SharePrinter';
import { coverOf, easeOut, factRows, hueOf, inkOf, markIn } from './poster';

const GLIDES_IN = 0.9;
const SLIDES_AT = 0.65, SLIDES_IN = 0.7;
const RAYS_AT = 0.95, RAYS_IN = 0.6;
const RISES_AT = 0.45, RISES_IN = 0.85;
const REACH = (85 * Math.PI) / 180;    // how far round the disc the rays go, each way

export const recordScene = night => (record, frame, { art, families, still = false }) => {
  const { bars, favs } = record;
  const W = frame.w, H = frame.h;
  const u = Math.min(W, (H * 9) / 16) / 100;
  const paper = night ? INKS.night.paper : INKS.day.paper;
  const { ink, faint } = inkOf(hueOf(art), night);

  const ox = (W - 100 * u) / 2;
  const coverY = 14 * u, size = 56 * u;
  const cover = coverOf(art, size);
  const r = 24 * u, cy = coverY + size / 2, cxFrom = ox + size / 2, cxTo = ox + size;
  const disc = sheet(r * 2, r * 2, c => {
    c.fillStyle = night ? '#242424' : '#111111';
    c.beginPath();
    c.arc(r, r, r, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.09)';
    c.lineWidth = Math.max(1, 0.12 * u);
    for (let g = r * 0.46; g < r * 0.97; g += r * 0.06) {
      c.beginPath();
      c.arc(r, r, g, 0, Math.PI * 2);
      c.stroke();
    }
    c.fillStyle = ink;
    c.beginPath();
    c.arc(r, r, r * 0.36, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = paper;
    c.beginPath();
    c.arc(r, r, r * 0.05, 0, Math.PI * 2);
    c.fill();
  });
  const markH = 5 * u, markW = markH * MARK_ASPECT;
  const mark = markIn(art, markW, markH, ink);

  const rayFrom = r + 1.2 * u, rayMost = 11 * u;
  const step = bars.length > 1 ? (REACH * 2) / (bars.length - 1) : 0;
  const rayWide = Math.min(2.4 * u, Math.max(0.5 * u, step * rayFrom * 0.62));
  const heartBox = Math.min(3 * u, Math.max(1.6 * u, step * (rayFrom + rayMost) * 0.8));

  const margin = 5 * u;
  const wide = 100 * u - margin * 2;
  const roomTop = coverY + size + 13 * u, roomEnd = H - 8 * u;
  const rows = factRows({ record, families, u, wide, room: roomEnd - roomTop, size: 20 });
  const rowsTop = roomTop + Math.max(0, (roomEnd - roomTop - rows.height) / 2);

  function paintAt(c, t) {
    c.fillStyle = paper;
    c.fillRect(0, 0, W, H);

    const drop = (1 - easeOut(clamp01(t / GLIDES_IN))) * (coverY + size);
    const cx = cxFrom + (cxTo - cxFrom) * easeOut(clamp01((t - SLIDES_AT) / SLIDES_IN));
    const grow = easeOut(clamp01((t - RAYS_AT) / RAYS_IN));
    bars.forEach((v, i) => {
      if (grow <= 0) return;
      const at = bars.length > 1 ? -REACH + i * step : 0;
      const long = Math.max(rayMost * 0.08, rayMost * v) * grow;
      c.save();
      c.translate(cx, cy - drop);
      c.rotate(at);
      c.fillStyle = ink;
      c.fillRect(rayFrom, -rayWide / 2, long, rayWide);
      c.restore();
      if (favs[i]) {
        const tip = rayFrom + long + heartBox * 0.75;
        drawPath(c, HEART_PATH, cx + Math.cos(at) * tip - heartBox / 2, cy - drop + Math.sin(at) * tip - heartBox / 2, heartBox, 24, ink);
      }
    });
    c.drawImage(disc, cx - r, cy - drop - r);
    c.drawImage(cover, ox, coverY - drop);
    c.drawImage(mark, ox + margin, 5 * u);

    const up = (1 - easeOut(clamp01((t - RISES_AT) / RISES_IN))) * (H - roomTop);
    c.save();
    c.translate(0, up);
    rows.paint(c, ox + margin, rowsTop, ink, faint);
    c.restore();
  }

  let t = still ? 30 : 0;
  return {
    step(dt) { t += dt; },
    paint(c) { paintAt(c, t); },
  };
};
