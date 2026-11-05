// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/SharePrinter.js
// The press's toolbox: the paper sizes, the page's two colours, and the
// canvas tools a plate draws with — a tracked line, an ellipsis, a word
// wrap, a rounded box, an SVG path, the mark, a picture.
//
// This file was the press itself for a day — a sheet over the page with a
// scaled-down preview and rows of buttons under it, built 2026-08-25 for
// the card and brought back 2026-09-12 for the record. It was the wrong
// shape for the front door of the site, and on 2026-09-13 the entry page's
// own first screen became the flyer (FullPostPage's printing mode) with
// hooks/usePress.js making the picture. The sheet is in git before that
// date; what every plate still needs is here.

// ── Paper ──────────────────────────────────────────────────────────────────
// Four shapes, because four different places want a picture and they disagree
// about what one is. The plate is handed the frame and lays itself out to fit;
// nothing here assumes a portrait.
export const FRAMES = {
  story:    { key: 'story',    w: 1080, h: 1920, label: '9:16', note: 'Stories' },
  portrait: { key: 'portrait', w: 1080, h: 1350, label: '4:5',  note: 'Feed — grid safe' },
  square:   { key: 'square',   w: 1080, h: 1080, label: '1:1',  note: 'Anywhere square' },
  spread:   { key: 'spread',   w: 1200, h: 630,  label: '1.91:1', note: 'Link previews' },
};
export const FRAME_ORDER = ['story', 'portrait', 'square', 'spread'];

// The page's own two colours, stated rather than read, because a print has to
// be the same colour on a phone set to dark as on a laptop set to light. These
// are --bg from globals.css.
export const PAPER = { day: '#eef0ec', night: '#0e0e0e' };

// ── The looks ──────────────────────────────────────────────────────────────
// A backdrop and an ink, decided together and given a name.
//
// ── On the wallpaper, which is not here yet ───────────────────────────────
//
// The first pass put the dashboard screensavers behind the print, and picked
// them by what canvas could photograph rather than by what anybody likes. That
// got the set exactly wrong: it led with Vinyl, which was not even wired into
// the dashboard any more and has since been deleted, and it left OUT the ones
// somebody would actually reach for — the albums floating up (Fizzy), the rain
// of covers (Rain), the bouncing sleeve (DVD), the two scrolling rows
// (SplitScreen). Those four are built out of DOM elements rather than a
// canvas, which is why a canvas could not photograph them, which is a fact
// about this implementation and not a reason to offer somebody Pong.
//
// So the wallpaper is parked and the card gets to be a card first. The machine
// still takes a backdrop — the stage below still mounts one and the export
// still composites it — so bringing them back is adding rows here and teaching
// the four DOM ones to draw themselves onto a canvas. Nothing else changes.
//
// Day and Night are not backdrops at all: they are the absence of one, the
// page's two colours, and what the thing looks like on the site in each.
// They were Paper and Ink until 2026-09-12; Miyel renamed them for what
// they are, and the file name carries the new word.
export const VARIANTS = [
  { key: 'day',   label: 'Day',   Background: null, dark: false },
  { key: 'night', label: 'Night', Background: null, dark: true  },
];

// ── Canvas tools, for plates to draw with ──────────────────────────────────
// Lifted wholesale from /dashboard/share, which worked all of this out for the
// Instagram slides and then had nowhere to put it. A second copy of a text
// wrapper is a second wrapper to fix.

// Canvas has no letter-spacing worth relying on, and the mono labels on this
// site are nothing without their tracking. So they are drawn a glyph at a time.
export function drawTracked(ctx, text, x, y, spacing, align = 'left') {
  // Positions are computed from a left origin, so the context's own textAlign
  // has to be neutralised — under 'center' every character would re-centre on
  // the point it was handed and the line would drift by half a glyph.
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  const chars = [...String(text)];
  let total = 0;
  for (const c of chars) total += ctx.measureText(c).width + spacing;
  total -= spacing;
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  for (const c of chars) {
    ctx.fillText(c, cx, y);
    cx += ctx.measureText(c).width + spacing;
  }
  ctx.textAlign = prevAlign;
  return total;
}

export function ellipsize(ctx, text, maxWidth) {
  let s = String(text);
  while (s.length > 1 && ctx.measureText(s).width > maxWidth) s = s.slice(0, -2) + '…';
  return s;
}

// Word wrapping with a line limit — WebkitLineClamp, which canvas has no
// equivalent for. maxLines of 0 or less means no limit.
export function wrapLines(ctx, text, maxWidth, maxLines = 0) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? line + ' ' + word : word;
    if (ctx.measureText(next).width <= maxWidth || !line) { line = next; continue; }
    lines.push(line);
    line = word;
    if (maxLines > 0 && lines.length === maxLines) { line = ''; break; }
  }
  if (line && (maxLines <= 0 || lines.length < maxLines)) lines.push(line);
  const used = lines.join(' ').split(/\s+/).filter(Boolean).length;
  if (used < words.length && lines.length) {
    lines[lines.length - 1] = ellipsize(ctx, lines[lines.length - 1] + '…', maxWidth);
  }
  return lines;
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Draw an SVG path defined in some viewBox at an arbitrary size and position.
export function drawPath(ctx, d, x, y, size, viewBox, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / viewBox, size / viewBox);
  ctx.fillStyle = color;
  ctx.fill(new Path2D(d));
  ctx.restore();
}

// ── The Ln. mark ───────────────────────────────────────────────────────────
// Loaded from the real asset rather than re-pasted as path data, so the mark
// on a print is the same object as the mark on every page. public/logo.svg is
// a 375-square with the mark sitting inside it and its ink hardcoded, so three
// string swaps make it usable: crop the viewBox down to the mark the way
// SiteNav does, size it to the box we want, recolour it. A data URL does not
// taint a canvas.
//
// The period is part of the artwork here, and on a print it is never lit. A
// still picture of a beacon that happened to be playing is a lie by the time
// anybody sees it.
export const MARK_ASPECT = 241 / 140;
const MARK_VIEWBOX = '76 96 241 140';
const markCache = new Map();

export function loadMark(color) {
  if (markCache.has(color)) return markCache.get(color);
  const p = fetch('/logo.svg')
    .then(r => r.text())
    .then(svg => new Promise((resolve, reject) => {
      const recoloured = svg
        .replace(/viewBox="[^"]*"/, `viewBox="${MARK_VIEWBOX}"`)
        .replace(/\swidth="\d+"/, ' width="241"')
        .replace(/\sheight="\d+"/, ' height="140"')
        .replace(/fill="#(?:222222|0a0a0a)"/g, `fill="${color}"`);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(recoloured);
    }))
    .catch(() => null);   // a missing mark costs the print its mark, not the print
  markCache.set(color, p);
  return p;
}

// Any other picture a plate needs. Asked for anonymously first, exactly as the
// screensaver covers are and for the same reason — see backgrounds/cover.js.
// Resolves to null rather than rejecting: a plate should be able to carry on
// and leave a hole where a picture was, rather than failing to draw at all.
export function loadPicture(src) {
  if (!src) return Promise.resolve(null);
  const attempt = anonymous => new Promise((resolve, reject) => {
    const img = new Image();
    if (anonymous) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
  return attempt(true).catch(() => attempt(false)).catch(() => null);
}

// ── A record's print ───────────────────────────────────────────────────────
// What every look (looks/) draws a record with.

// The papers, for a record's print and the journal's (JournalPlate.js).
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
export const STAR_PATH = 'M9 1.5l2.163 4.38 4.837.703-3.5 3.412.826 4.818L9 12.39l-4.326 2.273.826-4.818L2 6.583l4.837-.703z';
export const HEART_PATH = 'M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11z';
// The tags, as the feed draws them: Phosphor's Heart (fill), SketchLogo (fill)
// and Fingerprint (bold), each a single path in a 256-box.
export const SYMBOLS = {
  fav: 'M240,102c0,70-103.79,126.66-108.21,129a8,8,0,0,1-7.58,0C119.79,228.66,16,172,16,102A62.07,62.07,0,0,1,78,40c20.65,0,38.73,8.88,50,23.89C139.27,48.88,157.35,40,178,40A62.07,62.07,0,0,1,240,102Z',
  mp: 'M246,98.73l-56-64A8,8,0,0,0,184,32H72a8,8,0,0,0-6,2.73l-56,64a8,8,0,0,0,.17,10.73l112,120a8,8,0,0,0,11.7,0l112-120A8,8,0,0,0,246,98.73ZM222.37,96H180L144,48h36.37ZM74.58,112l30.13,75.33L34.41,112Zm106.84,0h40.17l-70.3,75.33ZM75.63,48H112L76,96H33.63Z',
  formative: 'M160,128a224.48,224.48,0,0,1-26.37,105.54,12,12,0,1,1-21.16-11.32A200.33,200.33,0,0,0,136,128a8,8,0,0,0-16,0,12,12,0,0,1-24,0,32,32,0,0,1,64,0ZM128,56a12,12,0,1,0,0,24,48.05,48.05,0,0,1,48,48c0,7.62-.36,15.32-1.07,22.87A12,12,0,0,0,185.74,164c.38,0,.76,0,1.14,0a12,12,0,0,0,11.93-10.87c.79-8.3,1.18-16.76,1.18-25.13A72.08,72.08,0,0,0,128,56ZM96,92.23A12,12,0,0,0,80,74.35,72.1,72.1,0,0,0,56,128a120.11,120.11,0,0,1-15.12,58.37,12,12,0,0,0,21,11.69A144.14,144.14,0,0,0,80,128,48.08,48.08,0,0,1,96,92.23Zm10.1,64.1a12,12,0,0,0-14.46,8.9,158.61,158.61,0,0,1-18.88,45.86,12,12,0,0,0,20.5,12.48A182.86,182.86,0,0,0,115,170.79,12,12,0,0,0,106.1,156.33Zm76.73,24.07A12,12,0,0,0,168.19,189a241.5,241.5,0,0,1-8,24.87,12,12,0,0,0,6.91,15.49,11.76,11.76,0,0,0,4.29.8,12,12,0,0,0,11.21-7.71,260.2,260.2,0,0,0,8.79-27.37A12,12,0,0,0,182.83,180.4ZM128,16A112.12,112.12,0,0,0,16,127.44c0,.19,0,.38,0,.57a79.81,79.81,0,0,1-5,27.82,12,12,0,1,0,22.5,8.35A103.59,103.59,0,0,0,40,128.58c0-.19,0-.38,0-.57a88,88,0,0,1,176-.5c0,.16,0,.33,0,.5a282.12,282.12,0,0,1-6.74,61.38,12,12,0,0,0,9.09,14.33A11.84,11.84,0,0,0,221,204a12,12,0,0,0,11.7-9.38A305.87,305.87,0,0,0,240,128.55c0-.18,0-.36,0-.54A112.13,112.13,0,0,0,128,16Z',
};

export const clamp01 = v => Math.min(1, Math.max(0, v));
// Whatever costs to draw (a shadow, a glow) is paid once on a picture like this,
// not on every frame of a video.
export function sheet(w, h, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(w));
  canvas.height = Math.max(1, Math.ceil(h));
  paint(canvas.getContext('2d'));
  return canvas;
}

// The title wrapped to fit `wide`. A word wider than the paper, or more lines
// than there is `room` for, and the whole block comes down together: `heightAt`
// is the block's height at that size with that many lines.
export function fitTitle({ album, fontAt, wide, room, heightAt }) {
  const measure = document.createElement('canvas').getContext('2d');
  let k = 1, lines = [];
  const lay = () => {
    measure.font = fontAt(k);
    lines = wrapLines(measure, album || '', wide, 0);
  };
  lay();
  k = Math.min(1, wide / Math.max(1, ...lines.map(line => measure.measureText(line).width)));
  lay();
  if (heightAt(k, lines.length) > room) {
    k *= room / heightAt(k, lines.length);
    lay();
  }
  return { k, lines };
}

// The artist line, in the label face and tracked, large enough to read on a
// smaller paper and never wider than `wide`.
export function drawArtist(c, line, x, y, { size, tracking, wide, least, colour, mono, align = 'center' }) {
  let px = Math.max(size, least);
  c.font = `400 ${px}px ${mono}`;
  const across = [...line].reduce((n, ch) => n + c.measureText(ch).width + px * tracking, 0);
  if (across > wide) {
    px *= wide / across;
    c.font = `400 ${px}px ${mono}`;
  }
  c.textBaseline = 'top';
  c.fillStyle = colour;
  drawTracked(c, line, x, y, px * tracking, align);
}
