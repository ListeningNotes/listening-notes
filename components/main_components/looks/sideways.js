// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/sideways.js
// Sideways: the horizon runs down the side of the page, the tracks reaching in from the
// left edge, and the words read up the page beside it, under the real cover.
'use client';

import { HEART_PATH, INKS, MARK_ASPECT, clamp01, drawPath, sheet } from '../SharePrinter';
import { coverOf, easeOut, factRows, hueOf, inkOf, markIn } from './poster';

const GLIDES_IN = 0.9;
const REACHES_AT = 0.45, REACHES_IN = 0.85;

export const sidewaysScene = night => (record, frame, { art, families, still = false }) => {
  const { bars, favs } = record;
  const W = frame.w, H = frame.h;
  const u = Math.min(W, (H * 9) / 16) / 100;
  const paper = night ? INKS.night.paper : INKS.day.paper;
  const { ink, faint } = inkOf(hueOf(art), night);

  const column = bars.length ? 22 * u : 0;
  const size = Math.min(W - column - 2 * u, H * 0.46);
  const ax = W - size;
  const cover = coverOf(art, size);
  const markH = 3.8 * u, markW = markH * MARK_ASPECT;
  const tab = sheet(markW + 3.6 * u, markH + 2.4 * u, c => {
    c.fillStyle = paper;
    c.fillRect(0, 0, c.canvas.width, c.canvas.height);
    c.drawImage(markIn(art, markW, markH, ink), 1.8 * u, 1.2 * u);
  });

  const slot = bars.length ? H / bars.length : 0;
  const barGap = Math.min(0.8 * u, slot * 0.16);
  const heartBox = Math.min(3.4 * u, slot * 0.8);
  const hasHearts = favs.some(Boolean);
  const most = column - (hasHearts ? heartBox + 1.2 * u : 0);

  const left = Math.max(column + 3 * u, ax);
  const margin = 5 * u;
  const bottom = H - margin;
  const length = bottom - (size + 4 * u);
  const depth = W - left - margin;
  const rows = factRows({ record, families, u, wide: length, room: depth, size: 30 });

  function paintAt(c, t) {
    c.fillStyle = paper;
    c.fillRect(0, 0, W, H);

    const go = easeOut(clamp01((t - REACHES_AT) / REACHES_IN));
    bars.forEach((v, i) => {
      const long = Math.max(most * 0.06, most * v) * go;
      c.fillStyle = ink;
      c.fillRect(0, i * slot + barGap / 2, long, slot - barGap);
      if (favs[i]) drawPath(c, HEART_PATH, long + u * 0.8, i * slot + (slot - heartBox) / 2, heartBox, 24, ink);
    });

    // The words read up the page, and come up from below it.
    c.save();
    c.beginPath();
    c.rect(column, size, W - column, H - size);
    c.clip();
    c.translate(left + Math.max(0, (depth - rows.height) / 2), bottom + (1 - go) * (H - size));
    c.rotate(-Math.PI / 2);
    rows.paint(c, 0, 0, ink, faint);
    c.restore();

    const drop = (1 - easeOut(clamp01(t / GLIDES_IN))) * size;
    c.drawImage(cover, ax, -drop);
    c.drawImage(tab, ax, 0);
  }

  let t = still ? 30 : 0;
  return {
    step(dt) { t += dt; },
    paint(c) { paintAt(c, t); },
  };
};
