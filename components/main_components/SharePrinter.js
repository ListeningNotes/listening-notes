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
