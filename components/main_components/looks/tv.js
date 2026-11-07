// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/looks/tv.js
// TV: a local TV ad from about 2003 (Miyel, 2026-11-06). A loud page in the
// album's colour with CRT lines over all of it, the title in chunky type in its second
// colour, or that colour's opposite, or plain greys on a colourless cover, the rating
// spelled out like a price, the mark in an oval, the marks as starburst stickers and the
// bars as a strip above the fine print, which says whose journal it is. It switches on like an old set, the pieces
// cut in one after another, and keeps fidgeting: the stickers wiggle and a band rolls down
// the screen. Then the channel flickers: every track and its rating fills the screen, like
// the listings in those ads, and flickers back. Still is the finished ad, its band gone.
'use client';

import { HEART_PATH, MARK_ASPECT, STAR_PATH, SYMBOLS, clamp01, drawPath, ellipsize, sheet, wrapLines } from '../SharePrinter';
import { coverOf, easeOut, huesOf, isStory, markIn, signatureOf } from './poster';

const OUTLINE = '#120810';
const NUMBERS = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'];
const STICKERS = {
  mp: { word: 'MASTERPIECE', fill: '#2f7bf0' },
  fav: { word: 'FAVORITE', fill: '#ee2f3f' },
  formative: { word: 'FORMATIVE', fill: '#1f9e58' },
};
const ORDER = ['mp', 'fav', 'formative'];
const ROLL_EVERY = 2.6;
const CHANNEL_AT = 3, CHANNEL_EVERY = 6, LISTED_FOR = 2.3, FLICKERS_FOR = 0.14;

// The rating, spelled out, one or two lines.
function ratingWords(stars) {
  if (!(stars > 0)) return [];
  const whole = Math.floor(stars), half = stars - whole >= 0.5;
  if (!whole) return ['HALF A', 'STAR!'];
  if (half) return [`${NUMBERS[whole]} & A HALF`, 'STARS!'];
  return [NUMBERS[whole], whole === 1 ? 'STAR!' : 'STARS!'];
}

// Words the way those ads set them: extruded, outlined, filled with a gradient.
function chunky(c, text, x, y, px, { top = '#fff59a', bottom = '#ff9d1c', depth = 0.07 } = {}) {
  const deep = Math.max(1, Math.round(px * depth));
  c.lineJoin = 'round';
  c.fillStyle = OUTLINE;
  c.strokeStyle = OUTLINE;
  c.lineWidth = Math.max(2, px * 0.14);
  for (let d = deep; d > 0; d--) {
    c.strokeText(text, x + d, y + d);
    c.fillText(text, x + d, y + d);
  }
  c.strokeText(text, x, y);
  const fill = c.createLinearGradient(0, y, 0, y + px);
  fill.addColorStop(0, top);
  fill.addColorStop(0.55, top);
  fill.addColorStop(0.58, bottom);
  fill.addColorStop(1, bottom);
  c.fillStyle = fill;
  c.fillText(text, x, y);
}

export const tvScene = night => (record, frame, { art, families, still = false }) => {
  const { stars, tags, bars, favs, year, entry, trackNames = [] } = record;
  const { sans, mono } = families;
  const W = frame.w, H = frame.h;
  const u = Math.min(W, (H * 9) / 16) / 100;
  const ox = (W - 100 * u) / 2;
  const margin = 5 * u, wide = 90 * u;
  const { first: hue, second } = huesOf(art);
  const plain = hue === null;
  const accent = plain ? null : second ?? (hue + 180) % 360;
  const typeInk = plain
    ? { top: '#ffffff', bottom: '#b9b9b9' }
    : { top: `hsl(${accent},100%,84%)`, bottom: `hsl(${accent},100%,56%)` };
  // A story leaves Instagram's top alone and the foot for the Link sticker.
  const story = isStory(frame);
  const head = story ? 9 * u : 0;
  const foot = story ? 10 * u : 0;

  const page = sheet(W, H, c => {
    const wash = c.createLinearGradient(0, 0, 0, H);
    if (plain) {
      wash.addColorStop(0, night ? '#0b0b0b' : '#8d8d8d');
      wash.addColorStop(1, night ? '#2b2b2b' : '#d6d6d6');
    } else {
      wash.addColorStop(0, night ? `hsl(${hue},75%,10%)` : `hsl(${hue},92%,46%)`);
      wash.addColorStop(1, night ? `hsl(${hue},80%,22%)` : `hsl(${hue},95%,68%)`);
    }
    c.fillStyle = wash;
    c.fillRect(0, 0, W, H);
  });

  // The picture tube: fine upright stripes and fainter lines across, over everything.
  const pitch = Math.max(3, Math.round(0.55 * u));
  const tube = sheet(W, H, c => {
    c.fillStyle = 'rgba(0,0,0,0.22)';
    for (let x = 0; x < W; x += pitch * 2) c.fillRect(x, 0, pitch, H);
    c.fillStyle = 'rgba(255,255,255,0.05)';
    for (let x = pitch; x < W; x += pitch * 2) c.fillRect(x, 0, pitch, H);
    c.fillStyle = 'rgba(0,0,0,0.04)';
    for (let y = 0; y < H; y += pitch * 3) c.fillRect(0, y, W, pitch);
  });

  const measure = document.createElement('canvas').getContext('2d');
  const fontAt = px => `900 ${px}px ${sans}`;

  // The title across the top, as large as two lines of it allow.
  let titlePx = 15 * u, titleLines = [];
  for (; titlePx > 4 * u; titlePx *= 0.94) {
    measure.font = fontAt(titlePx);
    titleLines = wrapLines(measure, entry?.album || '', wide, 0);
    if (titleLines.length * titlePx * 0.98 <= 29 * u && titleLines.every(l => measure.measureText(l).width <= wide)) break;
  }
  const titleH = titleLines.length * titlePx * 0.98;
  const title = sheet(W, 36 * u, c => {
    c.font = fontAt(titlePx);
    c.textBaseline = 'top';
    c.textAlign = 'center';
    c.setTransform(1, 0, -0.1, 1, 0.1 * titleH, 0);
    titleLines.forEach((line, i) => chunky(c, line, W / 2, 3.5 * u + (29 * u - titleH) / 2 + i * titlePx * 0.98, titlePx, typeInk));
  });

  // The album in its box, like the clip in the corner of the ad.
  const size = (story ? 46 : 58) * u, coverX = ox + margin, coverY = (story ? 34 : 37) * u + head, rim = 1.1 * u;
  const box = sheet(size + rim * 4, size + rim * 4, c => {
    c.fillStyle = OUTLINE;
    c.fillRect(0, 0, c.canvas.width, c.canvas.height);
    c.fillStyle = '#ffffff';
    c.fillRect(rim, rim, size + rim * 2, size + rim * 2);
    c.drawImage(coverOf(art, size), rim * 2, rim * 2);
  });

  // The mark in an oval, hung off the box's corner.
  const ovalW = 32 * u, ovalH = 18 * u;
  const oval = sheet(ovalW + 2 * u, ovalH + 2 * u, c => {
    const cx = c.canvas.width / 2, cy = c.canvas.height / 2;
    c.fillStyle = '#ffffff';
    c.strokeStyle = OUTLINE;
    c.lineWidth = 0.9 * u;
    [[ovalW / 2, ovalH / 2], [ovalW / 2 - 1.4 * u, ovalH / 2 - 1.4 * u]].forEach(([rx, ry]) => {
      c.beginPath();
      c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    });
    const markH = 9 * u, markW = markH * MARK_ASPECT;
    c.drawImage(markIn(art, markW, markH, OUTLINE), cx - markW / 2, cy - markH / 2);
  });

  // The marks as starbursts.
  const burstR = 13 * u;
  const stickers = ORDER.filter(tag => tags.includes(tag)).map(tag => ({
    tag,
    art: sheet(burstR * 2.3, burstR * 2.3, c => {
      const cx = c.canvas.width / 2, cy = c.canvas.height / 2;
      c.beginPath();
      for (let i = 0; i < 28; i++) {
        const r = i % 2 ? burstR * 0.8 : burstR;
        const a = (i / 28) * Math.PI * 2;
        c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      c.closePath();
      c.fillStyle = STICKERS[tag].fill;
      c.fill();
      c.lineJoin = 'round';
      c.lineWidth = 0.8 * u;
      c.strokeStyle = OUTLINE;
      c.stroke();
      const icon = 9.5 * u;
      drawPath(c, SYMBOLS[tag], cx - icon / 2, cy - icon * 0.82, icon, 256, '#ffffff');
      let wordPx = 3.1 * u;
      c.font = fontAt(wordPx);
      const across = c.measureText(STICKERS[tag].word).width;
      if (across > burstR * 1.45) wordPx *= (burstR * 1.45) / across;
      c.font = fontAt(wordPx);
      c.textAlign = 'center';
      c.textBaseline = 'top';
      c.fillStyle = '#ffffff';
      c.fillText(STICKERS[tag].word, cx, cy + icon * 0.28);
    }),
  }));
  const stickerAt = i => [ox + 83 * u - (i % 2) * 5 * u, coverY + 26 * u + i * 19 * u];

  // The rating, huge, like the price.
  const bottomOfBox = coverY + size + rim * 4;
  const words = ratingWords(stars);
  measure.font = fontAt(100);
  const sizes = words.map((line, i) => Math.min(i === 0 ? (story ? 20 : 27) * u : (story ? 13 : 18) * u, (wide / measure.measureText(line).width) * 100));
  const ratingH = sizes.reduce((n, px) => n + px * 0.98, 0);
  const rating = sheet(W, ratingH + 5 * u, c => {
    c.textBaseline = 'top';
    c.textAlign = 'center';
    let y = 1.5 * u;
    words.forEach((line, i) => {
      c.font = fontAt(sizes[i]);
      chunky(c, line, W / 2, y, sizes[i], { ...typeInk, depth: 0.09 });
      y += sizes[i] * 0.98;
    });
  });
  const ratingY = bottomOfBox + 1 * u;

  // The artist, then the bars, then the fine print.
  const fineH = 4.4 * u;
  const stripH = bars.length ? 13 * u : 0;
  const fineY = H - fineH - 2.5 * u - foot;
  const stripY = fineY - stripH - 1.5 * u;
  const artistSpace = stripY - (ratingY + ratingH + 2 * u) - (favs.some(Boolean) ? 4 * u : 0);
  let artistPx = Math.min(9 * u, Math.max(3 * u, artistSpace * 0.9));
  measure.font = fontAt(artistPx);
  const artistW = measure.measureText(entry?.artist || '').width;
  if (artistW > wide) artistPx *= wide / artistW;
  const artist = sheet(W, artistPx * 1.5, c => {
    c.font = fontAt(artistPx);
    c.textBaseline = 'top';
    c.textAlign = 'center';
    chunky(c, entry?.artist || '', W / 2, artistPx * 0.15, artistPx, { top: '#ffffff', bottom: '#d9dcff', depth: 0.05 });
  });
  const artistY = ratingY + ratingH + 1 * u;

  const signature = signatureOf({ art, record, mono, height: 8 * u, colour: night ? '#ffffff' : OUTLINE });
  const fine = [year, bars.length ? `${bars.length} ${bars.length === 1 ? 'TRACK' : 'TRACKS'}` : null].filter(Boolean).join(' · ');
  const slot = bars.length ? wide / bars.length : 0;
  const gold = sheet(1, Math.max(1, stripH), c => {
    const g = c.createLinearGradient(0, 0, 0, stripH);
    g.addColorStop(0, typeInk.top);
    g.addColorStop(1, typeInk.bottom);
    c.fillStyle = g;
    c.fillRect(0, 0, 1, stripH);
  });
  const heart = Math.min(3.2 * u, slot * 0.85);

  const pop = v => (v >= 1 ? 1 : 1.18 * easeOut(v) - 0.18 * v);

  // The other channel: the title, then every track and its rating, as large as they fit.
  const listing = trackNames.length ? sheet(W, H, c => {
    let headPx = Math.min(titlePx, 11 * u);
    c.font = fontAt(headPx);
    const headLine = entry?.album || '';
    const headAcross = c.measureText(headLine).width;
    if (headAcross > wide) headPx *= wide / headAcross;
    c.font = fontAt(headPx);
    c.textBaseline = 'top';
    c.textAlign = 'center';
    chunky(c, headLine, W / 2, head + 5 * u, headPx, typeInk);
    const top = head + 5 * u + headPx * 1.5, end = fineY - 3 * u;
    const columns = trackNames.length > 16 ? 2 : 1;
    const down = Math.ceil(trackNames.length / columns);
    const rowH = Math.min(11.5 * u, (end - top) / down);
    const px = rowH * 0.5, colW = (wide - (columns - 1) * 3 * u) / columns;
    const rated = bars.length === trackNames.length;
    const star = Math.min(rowH * 0.5, (colW * 0.32) / 5), starsW = rated ? 5 * star : 0;
    trackNames.forEach((name, i) => {
      const col = Math.floor(i / down);
      const x = ox + margin + col * (colW + 3 * u);
      const y = top + (i % down) * rowH + (rowH - px) / 2;
      c.font = fontAt(px);
      c.textAlign = 'left';
      c.textBaseline = 'top';
      const room = colW - starsW - (favs[i] ? star * 1.2 : 0) - px;
      chunky(c, ellipsize(c, `${i + 1}. ${name}`, room), x, y, px, { top: '#ffffff', bottom: '#d9dcff', depth: 0.05 });
      if (!rated) return;
      const lit = bars[i] * 5;
      const midY = top + (i % down) * rowH + (rowH - star) / 2;
      for (let n = 0; n < 5; n++) {
        const sx = x + colW - starsW + n * star;
        drawPath(c, STAR_PATH, sx, midY, star, 18, 'rgba(0,0,0,0.35)');
        const part = clamp01(lit - n);
        if (part > 0) {
          c.save();
          c.beginPath();
          c.rect(sx, midY, star * part, star);
          c.clip();
          drawPath(c, STAR_PATH, sx, midY, star, 18, typeInk.top);
          c.restore();
        }
      }
      if (favs[i]) drawPath(c, HEART_PATH, x + colW - starsW - star * 1.2, midY, star, 24, '#ee2f3f');
    });
  }) : null;

  // The flicker between channels: white and black streaks, the same ones every time.
  let seed = 7;
  const chance = () => { seed = (seed * 16807) % 2147483647; return (seed % 1000) / 1000; };
  const snow = sheet(W, H, c => {
    for (let i = 0; i < 120; i++) {
      c.fillStyle = chance() > 0.5 ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.75)';
      const x = chance() * W;
      c.fillRect(x - W * 0.4, chance() * H, W * (0.2 + chance() * 0.8), Math.max(1, (0.3 + chance() * 1.6) * u));
    }
  });

  function paintAt(c, t) {
    c.drawImage(page, 0, 0);
    const channel = still || !listing || t < CHANNEL_AT ? -1 : (t - CHANNEL_AT) % CHANNEL_EVERY;
    if (channel >= 0 && channel < LISTED_FOR) {
      c.drawImage(listing, 0, 0);
      if (signature) c.drawImage(signature, ox + margin, fineY - 1.8 * u);
      paintGlass(c, t, channel);
      return;
    }
    if (t >= 0.3) c.drawImage(title, 0, head);

    // The box slides in on a quick cut from the left.
    const slide = 1 - easeOut(clamp01((t - 0.55) / 0.28));
    if (t >= 0.55) c.drawImage(box, coverX - slide * (coverX + size + rim * 4), coverY);
    if (t >= 1.05) {
      const s = pop(clamp01((t - 1.05) / 0.22));
      c.save();
      c.translate(ox + 67 * u + ovalW / 2 - 2 * u, coverY - 3 * u + ovalH / 2);
      c.rotate((-7 * Math.PI) / 180);
      c.scale(s, s);
      c.drawImage(oval, -oval.width / 2, -oval.height / 2);
      c.restore();
    }

    // The rating slams down from too big.
    if (words.length && t >= 0.9) {
      const s = 1 + 0.5 * (1 - easeOut(clamp01((t - 0.9) / 0.2)));
      c.save();
      c.translate(W / 2, ratingY + ratingH / 2);
      c.scale(s, s);
      c.drawImage(rating, -W / 2, -ratingH / 2 - 1.5 * u);
      c.restore();
    }
    if (t >= 1.25) c.drawImage(artist, 0, artistY);

    // The strip, each bar rising, the hearts on them.
    const rise = easeOut(clamp01((t - 1.6) / 0.4));
    bars.forEach((v, i) => {
      if (rise <= 0) return;
      const h = Math.max(stripH * 0.08, stripH * v) * rise;
      const x = ox + margin + i * slot, y = stripY + stripH - h;
      c.fillStyle = OUTLINE;
      c.fillRect(x, y - 0.3 * u, slot, h + 0.3 * u);
      c.drawImage(gold, 0, 0, 1, stripH, x + 0.3 * u, y, Math.max(1, slot - 0.6 * u), h);
      if (favs[i]) drawPath(c, HEART_PATH, x + (slot - heart) / 2, y - heart - 0.7 * u, heart, 24, '#ffffff');
    });
    if (t >= 1.8 && fine) {
      c.font = `400 ${3.3 * u}px ${mono}`;
      c.textAlign = signature ? 'right' : 'center';
      c.textBaseline = 'top';
      c.fillStyle = night ? '#ffffff' : OUTLINE;
      c.fillText(fine, signature ? ox + margin + wide : W / 2, fineY);
      c.textAlign = 'left';
    }

    if (t >= 1.8 && signature) c.drawImage(signature, ox + margin, fineY - 1.8 * u);

    // The stickers pop on, and go on wiggling.
    stickers.forEach((sticker, i) => {
      const since = t - (1.35 + i * 0.2);
      if (since < 0) return;
      const [x, y] = stickerAt(i);
      const s = pop(clamp01(since / 0.22));
      const tilt = (i % 2 ? 9 : -9) + (still ? 0 : 3.5 * Math.sin(since * 3.2 + i));
      c.save();
      c.translate(x, y);
      c.rotate((tilt * Math.PI) / 180);
      c.scale(s, s);
      c.drawImage(sticker.art, -sticker.art.width / 2, -sticker.art.height / 2);
      c.restore();
    });

    paintGlass(c, t, channel);
  }

  function paintGlass(c, t, channel) {
    // A band rolling down the screen, as on a set that wants adjusting.
    if (!still) {
      const bandH = 26 * u;
      const y = ((t % ROLL_EVERY) / ROLL_EVERY) * (H + bandH) - bandH;
      c.fillStyle = 'rgba(255,255,255,0.09)';
      c.fillRect(0, y, W, bandH);
    }
    c.drawImage(tube, 0, 0);

    if (channel >= 0 && (channel < FLICKERS_FOR || Math.abs(channel - LISTED_FOR) < FLICKERS_FOR)) {
      const roll = Math.floor(t * 30) * 0.37 * H;
      c.drawImage(snow, 0, roll % H - H);
      c.drawImage(snow, 0, roll % H);
    }

    // Switching on: a bright line opens out into the picture.
    if (t < 0.35) {
      const open = easeOut(clamp01(t / 0.35));
      const seen = Math.max(0.6 * u, H * open);
      c.fillStyle = '#050505';
      c.fillRect(0, 0, W, (H - seen) / 2);
      c.fillRect(0, (H + seen) / 2, W, (H - seen) / 2 + 1);
      if (open < 0.5) {
        c.fillStyle = '#ffffff';
        c.fillRect(0, H / 2 - 0.5 * u, W, u);
      }
    }
  }

  let t = still ? 30 : 0;
  return {
    step(dt) { t += dt; },
    paint(c) { paintAt(c, t); },
  };
};
