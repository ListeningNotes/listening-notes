// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';

// The Instagram slide maker.
//
// One entry becomes a two-slide carousel, both slides drawn on a <canvas> at
// full export resolution and downloaded as JPEGs:
//
//   slide 1 — the album cover, nothing else. Instagram only shows a
//     carousel's FIRST slide on the profile grid, so this is the slide that
//     builds the wall of covers.
//   slide 2 — the back of the archive tile: the cover blurred behind a wash
//     with the metadata on top. The card the archive tile once showed on its back,
//     redrawn here at poster size rather than screenshotted, so the type stays sharp.
//
// Why canvas and not an image route on the server: the card leans on a heavy
// blur and a translucent wash, and Satori (what next/og renders with) supports
// neither. Canvas does, it runs in the browser for free, and Apple's artwork
// host sends access-control-allow-origin: * — so the cover can be drawn and
// the result exported without tainting.
//
// If this ever becomes real auto-posting, the two draw* functions below are
// the part that lifts out into a library module and runs server-side against
// a canvas package. Everything above them is just picking an entry.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { fonts } from '../../../library/sitewide_visuals';
import { sizedAlbumArt } from '../../../library/music_data_api';
import { parseRating, parseTracksFromNotes } from '../../../library/entry_formatter';
import { useBookplate } from '../../../components/main_components/Bookplate';
import backgrounds from '../../../components/session_components/backgrounds';

// The dashboard's shared chrome: one of the album screensavers running behind
// a frosted panel. Same constants as /dashboard/inbox so the two pages read as
// one room. DM Sans is named on that one but was never loaded — the site runs
// on Nunito and DM Mono — so the body face here is Nunito, which is what the
// type system says it should have been.
const WALL = '#eef0ec';
const PANEL_BG = 'rgba(255,255,255,0.8)';
const INK = '#1a1916';
// INK is text and stays near-black for legibility; SOLID is the button fill,
// a softer warm grey, because a button-sized slab of INK reads as harsh.
const SOLID = '#4a4643';
const MONO = "'DM Mono', 'Courier New', monospace";
const HAIR = '1px solid rgba(26,25,22,0.08)';

// Both shapes, because which one is right depends on how Instagram is cropping
// profile grids this month. 4:5 mats the square cover so the grid can't crop
// its edges off; 1:1 is the cover full bleed and trusts the grid to be square.
const SHAPES = {
  portrait: { w: 1080, h: 1350, label: '4:5', note: 'Matted — grid-safe' },
  square:   { w: 1080, h: 1080, label: '1:1', note: 'Full bleed' },
};

// That metadata card was drawn for a tile about 190px across
// at the archive's widest density. Every size on slide 2 is that card's size
// multiplied by this unit, so the proportions arrive intact at 1080.
const CARD_REF_WIDTH = 190;

// What gets printed along the bottom of slide 2, and what the Story link is
// built from. It comes from the journal's own details now — this page used to
// name one address in the source, which meant a copy of this software printed
// somebody else's on every card it made.
//
// A journal with no address set prints nothing there and the copy button says
// so, rather than falling back to an address that is not theirs.

// viewBox 18. Lifted from StarRating.js so one shape serves the site and the
// export — a star that drifts between the two is a star nobody trusts.
const STAR_PATH = 'M9 1.5l2.163 4.38 4.837.703-3.5 3.412.826 4.818L9 12.39l-4.326 2.273.826-4.818L2 6.583l4.837-.703z';
const STAR_GOLD = '#E8B84B';
const STAR_EMPTY = 'rgba(232,184,75,0.18)';

// viewBox 256, Phosphor's fill weight — the same two marks EntryMarks renders.
const HEART_PATH = 'M240,102c0,70-103.79,126.66-108.21,129a8,8,0,0,1-7.58,0C119.79,228.66,16,172,16,102A62.07,62.07,0,0,1,78,40c20.65,0,38.73,8.88,50,23.89C139.27,48.88,157.35,40,178,40A62.07,62.07,0,0,1,240,102Z';
const GEM_PATH = 'M246,98.73l-56-64A8,8,0,0,0,184,32H72a8,8,0,0,0-6,2.73l-56,64a8,8,0,0,0,.17,10.73l112,120a8,8,0,0,0,11.7,0l112-120A8,8,0,0,0,246,98.73ZM222.37,96H180L144,48h36.37ZM74.58,112l30.13,75.33L34.41,112Zm106.84,0h40.17l-70.3,75.33ZM75.63,48H112L76,96H33.63Z';
const FAV_COLOR = '#f0484f';
const MP_COLOR = '#4a9bf0';

// Flagged as a masterpiece, or every track on
// it got five stars.
function isMasterpiece(entry) {
  const tracks = parseTracksFromNotes(entry.track_notes || entry.notes);
  return (tracks.length > 0 && tracks.every(t => t.stars === 5)) || entry.rating === 'Masterpiece';
}

// ── Canvas text helpers ────────────────────────────────────────────────────

// Canvas has no letter-spacing worth relying on (ctx.letterSpacing is recent
// and quietly ignored where it isn't supported), and the mono labels on this
// card are nothing without their tracking. So they're drawn a glyph at a time.
function drawTracked(ctx, text, x, y, spacing, align = 'left') {
  // Positions are computed glyph by glyph from a left origin, so the context's
  // own textAlign has to be neutralised — under textAlign 'center' every
  // character would re-centre on the point it was handed and the line would
  // drift by half a glyph.
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

function ellipsize(ctx, text, maxWidth) {
  let s = String(text);
  while (s.length > 1 && ctx.measureText(s).width > maxWidth) s = s.slice(0, -2) + '…';
  return s;
}

// The album title's two-line clamp, done by hand — this is WebkitLineClamp: 2
// from the card, which canvas has no equivalent for.
function wrapLines(ctx, text, maxWidth, maxLines) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? line + ' ' + word : word;
    if (ctx.measureText(next).width <= maxWidth || !line) { line = next; continue; }
    lines.push(line);
    line = word;
    if (lines.length === maxLines) { line = ''; break; }
  }
  if (line && lines.length < maxLines) lines.push(line);
  const used = lines.join(' ').split(/\s+/).filter(Boolean).length;
  if (used < words.length && lines.length) {
    lines[lines.length - 1] = ellipsize(ctx, lines[lines.length - 1] + '…', maxWidth);
  }
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Draw an SVG path defined in some viewBox at an arbitrary size and position.
function drawPath(ctx, d, x, y, size, viewBox, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / viewBox, size / viewBox);
  ctx.fillStyle = color;
  ctx.fill(new Path2D(d));
  ctx.restore();
}

// The Listening Notes mark, loaded from the real asset rather than re-pasted
// as path data. public/logo.svg is a 375-square with the mark sitting inside
// it and its ink hardcoded, so three string swaps make it usable here: crop
// the viewBox down to the mark the way SiteNav.js does, size it to the box we
// want, and recolour it for whichever card it is landing on. A data URL does
// not taint the canvas, so the export still works.
//
// It goes at the HEAD of the card, small — a signature on a personal journal,
// not a banner over an advert. The card belongs to whoever wrote the note;
// the mark only says where the note lives.
const LOGO_VIEWBOX = '76 96 241 140';
const LOGO_ASPECT = 241 / 140;
const logoCache = new Map();

function loadLogo(color) {
  if (logoCache.has(color)) return logoCache.get(color);
  const p = fetch('/logo.svg')
    .then(r => r.text())
    .then(svg => new Promise((resolve, reject) => {
      const recoloured = svg
        .replace(/viewBox="[^"]*"/, `viewBox="${LOGO_VIEWBOX}"`)
        .replace(/\swidth="\d+"/, ' width="241"')
        .replace(/\sheight="\d+"/, ' height="140"')
        .replace(/fill="#(?:222222|0a0a0a)"/g, `fill="${color}"`);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(recoloured);
    }))
    .catch(() => null);   // a missing mark should cost the slide its logo, not the slide
  logoCache.set(color, p);
  return p;
}

// Not every browser gives canvas a working `filter`. Where it exists the blur
// matches what CSS does; where it doesn't, slide 2 falls back to downscaling
// the cover to a thumbnail and blowing it back up, which is blur by another
// name and has worked everywhere for twenty years.
function canvasFilterWorks() {
  const probe = document.createElement('canvas').getContext('2d');
  probe.filter = 'blur(2px)';
  return probe.filter === 'blur(2px)';
}

// ── The two slides ─────────────────────────────────────────────────────────

// Slide 1. Square: the cover, edge to edge. 4:5: the same square cover centred
// on the site's own background, so the profile grid has nothing to crop.
function drawCover(ctx, img, shape, isDark) {
  const { w, h } = shape;
  ctx.clearRect(0, 0, w, h);

  if (w === h) {
    ctx.drawImage(img, 0, 0, w, h);
    return;
  }

  ctx.fillStyle = isDark ? '#0e0e0e' : '#f5f3ee';
  ctx.fillRect(0, 0, w, h);

  const margin = Math.round(w * 0.089);      // ~96px at 1080
  const side = w - margin * 2;
  const x = margin;
  const y = Math.round((h - side) / 2);
  const radius = Math.round(side * 0.023);   // the tile's 10px, to scale

  ctx.save();
  ctx.shadowColor = isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.10)';
  ctx.shadowBlur = Math.round(w * 0.03);
  ctx.shadowOffsetY = Math.round(w * 0.008);
  ctx.fillStyle = isDark ? '#161616' : '#ffffff';
  roundRect(ctx, x, y, side, side, radius);
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, x, y, side, side, radius);
  ctx.clip();
  ctx.drawImage(img, x, y, side, side);
  ctx.restore();
}

// Slide 2. The flipped tile: cover blurred and mirrored behind a wash, with
// album / artist · year / stars + marks / listen type on top, and the site
// address along the bottom where the Read More button used to be. The button
// itself is gone — a button that can't be pressed is just a shape.
function drawCard(ctx, img, entry, shape, isDark, siteUrl, families, logo) {
  const { w, h } = shape;
  const U = w / CARD_REF_WIDTH;
  const px = n => n * U;
  ctx.clearRect(0, 0, w, h);

  // ── the blurred cover behind everything, oversized so no edge can show.
  //
  // The archive tile mirrors this one — .ft-art--blurred is scale(-1.12, 1.12)
  // — and it has to, because the tile physically rotates in 3D. The back face
  // genuinely shows the artwork reversed, and NOT mirroring it there would
  // look like a bug.
  //
  // Nothing rotates on Instagram. You swipe. So the mirror has no cause here,
  // and a reversed cover reads as a mistake rather than as a turn. Left
  // unflipped, slide 2 is simply slide 1 blurred, and the swipe between them
  // lands as a dissolve into the cover instead of a flip that didn't finish.
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(1.12, 1.12);
  const side = Math.max(w, h);
  if (canvasFilterWorks()) {
    ctx.filter = `blur(${Math.round(px(7))}px)`;
    ctx.drawImage(img, -side / 2, -side / 2, side, side);
  } else {
    const small = document.createElement('canvas');
    small.width = small.height = 48;
    small.getContext('2d').drawImage(img, 0, 0, 48, 48);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(small, -side / 2, -side / 2, side, side);
  }
  ctx.restore();

  // ── two washes, not one.
  //
  // The tile got away with a single wash because it is 190px across and the
  // text on it is glanced at, not read. Blown up to 1080 the same wash left
  // the smaller lines fighting whatever the cover happened to be doing behind
  // them. So the fade over the whole image is now the LIGHTER of the two —
  // enough to knock the artwork back, not so much that it stops being the
  // album — and a second, stronger wash is confined to a panel inset from the
  // edges. The panel is what the type sits on, so legibility no longer
  // depends on which record it is.
  const outerWash = isDark ? 'rgba(0,0,0,0.34)' : 'rgba(255,255,255,0.46)';
  const panelWash = isDark ? 'rgba(16,14,12,0.62)' : 'rgba(255,255,255,0.74)';
  const panelEdge = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.6)';

  ctx.fillStyle = outerWash;
  ctx.fillRect(0, 0, w, h);

  const textColor = isDark ? '#ffffff' : '#1c1c1c';
  const textSoft = isDark ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.64)';
  const textFaint = isDark ? 'rgba(255,255,255,0.62)' : 'rgba(0,0,0,0.52)';

  const margin = px(13);        // the panel's inset from the canvas edge
  const panelPad = px(15);      // and its own internal padding
  const maxWidth = w - margin * 2 - panelPad * 2;
  const sans = families.sans;
  const mono = families.mono;

  const masterpiece = isMasterpiece(entry);
  const isFav = entry.favorite === true || entry.favorite === 'true';
  const displayRating = masterpiece ? 5 : parseRating(entry.rating);
  const provenance = [entry.entry_type === 'Submission' ? 'Submission' : '']
    .filter(Boolean).join(' · ').toUpperCase();

  // ── measure the stack before drawing any of it, so the panel can be sized
  // to its contents and then centred rather than guessed at.
  ctx.font = `700 ${px(13)}px ${sans}`;
  const titleLines = wrapLines(ctx, entry.album, maxWidth, 2);
  const titleLead = px(13) * 1.25;
  const starSize = px(15);
  const markSize = px(13);
  const hasStars = displayRating > 0 || masterpiece || isFav;

  const logoH = logo ? px(10.5) : 0;
  const logoW = logoH * LOGO_ASPECT;

  let stackH = logoH ? logoH + px(9) : 0;
  stackH += titleLines.length * titleLead;
  stackH += px(3) + px(10.5) * 1.2;                     // artist · year
  if (hasStars) stackH += px(7) + starSize;             // stars + marks
  if (provenance) stackH += px(5) + px(7.5) * 1.4;      // FIRST LISTEN · …
  if (siteUrl) stackH += px(11) + px(7) * 1.4;          // the address

  const panelW = w - margin * 2;
  const panelH = stackH + panelPad * 2;
  const panelX = margin;
  const panelY = (h - panelH) / 2;
  const radius = px(9);

  // ── the panel
  ctx.save();
  ctx.shadowColor = isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.14)';
  ctx.shadowBlur = px(8);
  ctx.shadowOffsetY = px(2);
  ctx.fillStyle = panelWash;
  roundRect(ctx, panelX, panelY, panelW, panelH, radius);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = panelEdge;
  ctx.lineWidth = Math.max(2, px(0.35));
  roundRect(ctx, panelX, panelY, panelW, panelH, radius);
  ctx.stroke();

  // ── the type, centred. The tile ranges everything left because it is a grid
  // cell with a button pinned to its floor; this is a single slide with one
  // thing on it, and centred reads as composed rather than as a leftover
  // corner of a layout.
  const cx = w / 2;
  let y = panelY + panelPad;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  if (logo) {
    ctx.save();
    // Quieter than the title it sits above — it is a colophon, not a headline.
    ctx.globalAlpha = isDark ? 0.82 : 0.72;
    ctx.drawImage(logo, cx - logoW / 2, y, logoW, logoH);
    ctx.restore();
    y += logoH + px(9);
  }

  ctx.fillStyle = textColor;
  ctx.font = `700 ${px(13)}px ${sans}`;
  for (const line of titleLines) {
    ctx.fillText(line, cx, y);
    y += titleLead;
  }

  y += px(3);
  ctx.fillStyle = textSoft;
  ctx.font = `400 ${px(10.5)}px ${sans}`;
  const byline = entry.artist + (entry.year ? ` · ${entry.year}` : '');
  ctx.fillText(ellipsize(ctx, byline, maxWidth), cx, y);
  y += px(10.5) * 1.2;

  // ── stars and marks as one centred group. On the tile the marks are pushed
  // to the far right, which only works because the row is ranged left; here
  // they ride alongside the stars so the whole row has one centre.
  if (hasStars) {
    y += px(7);
    const starGap = px(3);
    const starsW = displayRating > 0 ? 5 * starSize + 4 * starGap : 0;
    const markCount = (masterpiece ? 1 : 0) + (isFav ? 1 : 0);
    const marksW = markCount ? markCount * markSize + (markCount - 1) * px(5) : 0;
    const groupW = starsW + (starsW && marksW ? px(9) : 0) + marksW;
    let gx = cx - groupW / 2;

    if (displayRating > 0) {
      for (let i = 1; i <= 5; i++) {
        const sx = gx + (i - 1) * (starSize + starGap);
        drawPath(ctx, STAR_PATH, sx, y, starSize, 18, STAR_EMPTY);
        const fill = displayRating >= i ? 1 : displayRating >= i - 0.5 ? 0.5 : 0;
        if (fill > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(sx, y, starSize * fill, starSize);
          ctx.clip();
          drawPath(ctx, STAR_PATH, sx, y, starSize, 18, STAR_GOLD);
          ctx.restore();
        }
      }
      gx += starsW + (marksW ? px(9) : 0);
    }
    const my = y + (starSize - markSize) / 2;
    if (isFav) { drawPath(ctx, HEART_PATH, gx, my, markSize, 256, FAV_COLOR); gx += markSize + px(5); }
    if (masterpiece) { drawPath(ctx, GEM_PATH, gx, my, markSize, 256, MP_COLOR); }
    y += starSize;
  }

  if (provenance) {
    y += px(5);
    ctx.fillStyle = textFaint;
    ctx.font = `400 ${px(7.5)}px ${mono}`;
    drawTracked(ctx, provenance, cx, y, px(7.5) * 0.08, 'center');
    y += px(7.5) * 1.4;
  }

  // ── the address, last line inside the panel. It used to sit on the bottom
  // edge of the canvas, which is exactly where the image is least washed and
  // a 43px mono line has the least chance of being read. Inside the panel it
  // is quiet without being lost.
  if (siteUrl) {
    y += px(11);
    // A step smaller and a shade fainter than the provenance line above it.
    // It was the larger of the two, which put the least important thing on the
    // slide at the top of the type hierarchy.
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.42)';
    ctx.font = `400 ${px(7)}px ${mono}`;
    drawTracked(ctx, siteUrl.toUpperCase(), cx, y, px(7) * 0.14, 'center');
  }
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function SessionShare() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [entries, setEntries] = useState([]);
  const [selected, setSelected] = useState(null);
  // The picker's rows carry no writing — see pull_wall_entries — and the card
  // needs some: isMasterpiece reads track_notes to spot a record where every
  // track got five stars, which is not the same question as the flag. So the
  // chosen record is fetched in full, one at a time, which is also why the
  // wall of them no longer has to be. `fetched` is the last full record to
  // arrive, tagged with its slug; `chosen` is derived from it and is null
  // whenever the selection has moved on and the full record has not caught
  // up yet, so nothing is ever drawn from a stale one.
  const [fetched, setFetched] = useState(null);
  const [query, setQuery] = useState('');
  const [shapeKey, setShapeKey] = useState('portrait');
  const [isDark, setIsDark] = useState(false);
  const { site_address } = useBookplate();

  // Derived rather than synced. The field shows the journal's own address until
  // someone types over it, and `typed` staying null is what "untouched" means —
  // an effect copying the address into state would have to guess when not to,
  // and would fight anyone typing a one-off address for a single card.
  const [typed, setTyped] = useState(null);
  const siteUrl = typed ?? site_address ?? '';
  const [status, setStatus] = useState('');
  const [tainted, setTainted] = useState(false);
  // A screensaver picked once and kept for the visit, exactly as the entries
  // and inbox pages do it — rerolling on every render would strobe.
  const [Background] = useState(() => backgrounds[Math.floor(Math.random() * backgrounds.length)]);
  // The wallpaper wants the covers shuffled; the picker wants them in the
  // order the archive returns them. Two lists rather than one sorted twice.
  const [wallpaper, setWallpaper] = useState([]);
  const [copied, setCopied] = useState(false);

  const coverRef = useRef(null);
  const cardRef = useRef(null);
  const probeRef = useRef(null);

  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.json())
      .then(d => { setAuthed(!!d.authed); setChecking(false); })
      .catch(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (!authed) return;
    fetch('/api/entries')
      .then(r => r.json())
      .then(d => {
        const list = (d.entries || []).filter(e => e.album_art);
        setEntries(list);
        setWallpaper([...list].sort(() => Math.random() - 0.5));
        // ?entry=<slug> means somebody pressed the printer on a record and
        // meant that record. Read off the address rather than through
        // useSearchParams, which would want a Suspense boundary around a page
        // that has no other reason for one. Falls back to the first entry, so
        // arriving here from the desk still opens on something.
        const asked = new URLSearchParams(window.location.search).get('entry');
        setSelected(list.find(e => e.slug === asked) || list[0] || null);
      })
      .catch(() => setStatus('Could not load entries.'));
  }, [authed]);

  // The address used to be remembered in localStorage and otherwise guessed
  // from window.location. Both were wrong. localStorage is scoped per origin
  // AND per browser, so anything typed on the dev server never followed the
  // page to production, and the guess produced nothing at all on localhost —
  // which is where this page actually gets used. It is a constant, so it is a
  // constant. The field still edits it for a one-off; nothing is persisted.

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(e =>
      (e.album || '').toLowerCase().includes(q) || (e.artist || '').toLowerCase().includes(q));
  }, [entries, query]);

  const shape = SHAPES[shapeKey];

  useEffect(() => {
    if (!selected?.slug) return undefined;
    let alive = true;
    // Falls back to the lean row rather than drawing nothing: a card that is
    // right about everything except an unflagged masterpiece beats no card.
    fetch(`/api/entries/${selected.slug}`)
      .then(r => r.json())
      .then(d => { if (alive) setFetched({ slug: selected.slug, entry: d.entry || {} }); })
      .catch(() => { if (alive) setFetched({ slug: selected.slug, entry: {} }); });
    return () => { alive = false; };
  }, [selected]);

  const chosen = useMemo(() => {
    if (!selected?.slug || fetched?.slug !== selected.slug) return null;
    return { ...selected, ...fetched.entry };
  }, [selected, fetched]);

  // Redraw both slides whenever anything they depend on moves.
  useEffect(() => {
    if (!chosen || !coverRef.current || !cardRef.current) return undefined;
    let cancelled = false;
    let done = false;
    // The status line is written from a frame callback rather than the effect
    // body (see NOTES, Gotchas) — and only if the draw has not already
    // finished, which a cached cover and ready fonts can manage inside a
    // frame. Without the guard "Drawing…" would land after "" and stay.
    const frame = requestAnimationFrame(() => {
      if (!cancelled && !done) setStatus('Drawing…');
    });

    const families = {
      sans: getComputedStyle(probeRef.current.querySelector('.probe-sans')).fontFamily,
      mono: getComputedStyle(probeRef.current.querySelector('.probe-mono')).fontFamily,
    };

    // The stored URL is the full-resolution master; album_art has already been
    // sized down to 600 for the grid, which is not enough for a 1080 export.
    const src = sizedAlbumArt(chosen.album_art_source || chosen.album_art, 1080);

    const load = crossOrigin => new Promise((resolve, reject) => {
      const img = new Image();
      if (crossOrigin) img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

    (async () => {
      let img;
      try {
        img = await load(true);
        setTainted(false);
      } catch {
        // A cover pasted in by hand may be on a host that sends no CORS
        // headers. It can still be shown, but drawing it poisons the canvas
        // and the export will throw — so say so instead of failing at the
        // download button.
        try { img = await load(false); setTainted(true); }
        catch { if (!cancelled) setStatus('Could not load this cover.'); return; }
      }
      // The mark is recoloured per theme, so day and night are two different
      // images; both are cached after their first load.
      const logo = await loadLogo(isDark ? '#ffffff' : '#1c1c1c');
      await document.fonts.ready;
      if (cancelled) return;

      for (const [ref, draw] of [[coverRef, drawCover], [cardRef, drawCard]]) {
        const canvas = ref.current;
        canvas.width = shape.w;
        canvas.height = shape.h;
        const ctx = canvas.getContext('2d');
        if (draw === drawCover) drawCover(ctx, img, shape, isDark);
        else drawCard(ctx, img, chosen, shape, isDark, siteUrl, families, logo);
      }
      setStatus('');
      done = true;
    })();

    return () => { cancelled = true; cancelAnimationFrame(frame); };
  }, [chosen, shape, isDark, siteUrl]);

  // The link a Story sticker wants. Built from the journal's stored address
  // rather than window.location on purpose: this page is used on the dev
  // server, and a localhost URL pasted into Instagram is worse than useless.
  // With no address set there is no link worth copying, so it says that
  // instead of handing over something broken.
  const copyLink = useCallback(async () => {
    if (!selected) return;
    if (!site_address) {
      setStatus('Set your journal’s address in settings first.');
      return;
    }
    const url = `https://${site_address}/entries/${selected.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard refused (it needs a secure context and a real gesture).
      // Showing the URL is still better than swallowing it.
      setStatus(url);
    }
  }, [selected, site_address]);

  const download = useCallback((ref, suffix) => {
    const canvas = ref.current;
    if (!canvas) return;
    try {
      canvas.toBlob(blob => {
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${selected.slug}-${suffix}.jpg`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }, 'image/jpeg', 0.94);
    } catch {
      setStatus('This cover is not CORS-enabled, so it cannot be exported.');
    }
  }, [selected]);

  if (checking) return null;
  if (!authed) { if (typeof window !== 'undefined') window.location.replace('/login'); return null; }

  const btn = (on = false) => ({
    fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
    padding: '7px 13px', borderRadius: 999, cursor: 'pointer',
    border: on ? '1px solid ' + SOLID : '1px solid rgba(26,25,22,0.14)',
    background: on ? SOLID : 'rgba(255,255,255,0.6)',
    color: on ? '#fff' : 'rgba(26,25,22,0.6)',
    transition: 'background 0.15s, color 0.15s, border-color 0.15s',
  });

  const label = { fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(26,25,22,0.45)' };

  return (
    <>
      <style>{`
        html, body { background: ${WALL}; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.14); border-radius: 99px; }

        /* The panel splits into a picker rail and the slides. Both scroll on
           their own — the shell is a fixed 100vh like the sibling pages, so
           the document itself never scrolls. */
        .sh-cols { display: grid; grid-template-columns: 268px 1fr; flex: 1; min-height: 0; }
        .sh-rail { border-right: ${HAIR}; min-height: 0; overflow-y: auto; padding: 16px; }
        .sh-main { min-height: 0; overflow-y: auto; padding: 18px 22px 26px; }
        @media (max-width: 880px) {
          .sh-cols { grid-template-columns: 1fr; }
          .sh-rail { border-right: none; border-bottom: ${HAIR}; max-height: 180px; }
        }

        .sh-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(58px, 1fr)); gap: 7px; }
        .sh-tile { aspect-ratio: 1/1; border-radius: 7px; overflow: hidden; cursor: pointer;
          border: 2px solid transparent; padding: 0; background: none; transition: border-color 0.12s, transform 0.12s; }
        .sh-tile:hover { transform: translateY(-1px); }
        .sh-tile--on { border-color: ${INK}; }
        .sh-tile img { width: 100%; height: 100%; object-fit: cover; display: block; }

        .sh-slides { display: flex; gap: 20px; flex-wrap: wrap; }
        .sh-slide canvas { width: 236px; height: auto; display: block; border-radius: 10px;
          border: 1px solid rgba(26,25,22,0.10); box-shadow: 0 6px 22px rgba(0,0,0,0.10); background: #fff; }

        .sh-field { font-family: ${MONO}; font-size: 11px; color: ${INK};
          padding: 7px 11px; border-radius: 9px; border: 1px solid rgba(26,25,22,0.12);
          background: rgba(255,255,255,0.65); outline: none; }
        .sh-field:focus { border-color: rgba(26,25,22,0.35); }
      `}</style>

      {/* Canvas cannot read CSS variables, and the font families arrive from
          next/font — so the resolved names are read off these two probes and
          handed to ctx.font rather than guessed at. */}
      <div ref={probeRef} aria-hidden style={{ position: 'fixed', visibility: 'hidden', pointerEvents: 'none' }}>
        <span className="probe-sans" style={{ fontFamily: 'var(--font-nunito)' }}>x</span>
        <span className="probe-mono" style={{ fontFamily: 'var(--font-dm-mono)' }}>x</span>
      </div>

      {/* Album screensaver + frosted overlay, same as entries and inbox */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: WALL, overflow: 'hidden' }}>
        <Background albums={wallpaper} />
        <div style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', background: 'rgba(224,224,220,0.5)' }} />
      </div>

      <div style={{ height: '100vh', position: 'relative', zIndex: 1, fontFamily: fonts.sans, color: INK, display: 'flex', flexDirection: 'column' }}>

        {/* Top bar — the back button the inbox uses too */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 28px', flexShrink: 0 }}>
          <Link href="/" style={{ fontFamily: fonts.mono, fontWeight: 600, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(26,21,32,0.5)', textDecoration: 'none', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(26,21,32,0.12)', background: 'rgba(245,242,236,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', flexShrink: 0 }}>← Home</Link>
          <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(26,25,22,0.35)', letterSpacing: '0.08em' }}>
            Instagram slides{selected ? ' · ' + selected.album : ''}
          </span>
        </div>

        <div style={{ flex: 1, minHeight: 0, width: '100%', maxWidth: 1000, alignSelf: 'center', padding: '4px 24px 24px', display: 'flex', flexDirection: 'column' }}>

          {/* Centered search, above the panel — entries does the same */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14, flexShrink: 0 }}>
            <input
              className="sh-field"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search album or artist…"
              style={{ width: 'min(420px, 100%)', textAlign: 'center', fontFamily: fonts.sans, fontSize: 13 }}
            />
          </div>

          {/* The frosted panel */}
          <div style={{
            flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
            background: PANEL_BG, backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
            border: '1px solid rgba(255,255,255,0.55)', borderRadius: 24,
            boxShadow: '0 12px 44px rgba(0,0,0,0.10)', overflow: 'hidden', position: 'relative',
          }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(255,255,255,0.5) 0%, transparent 45%)', pointerEvents: 'none' }} />

            <div className="sh-cols" style={{ position: 'relative', zIndex: 1 }}>

              {/* ── the picker rail ── */}
              <div className="sh-rail">
                <div style={{ ...label, marginBottom: 10 }}>Album · {filtered.length}</div>
                <div className="sh-grid">
                  {filtered.map(e => (
                    <button
                      key={e.slug}
                      type="button"
                      className={'sh-tile' + (selected?.slug === e.slug ? ' sh-tile--on' : '')}
                      onClick={() => setSelected(e)}
                      title={`${e.album} — ${e.artist}`}
                    >
                      <img src={e.album_art} alt="" />
                    </button>
                  ))}
                </div>
              </div>

              {/* ── the slides ── */}
              <div className="sh-main">
                <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={label}>Size</span>
                    {Object.entries(SHAPES).map(([key, sh]) => (
                      <button key={key} type="button" style={btn(shapeKey === key)} onClick={() => setShapeKey(key)} title={sh.note}>
                        {sh.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={label}>Card</span>
                    <button type="button" style={btn(!isDark)} onClick={() => setIsDark(false)}>Day</button>
                    <button type="button" style={btn(isDark)} onClick={() => setIsDark(true)}>Night</button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={label}>Address</span>
                    <input className="sh-field" value={siteUrl} placeholder="blank for none"
                      onChange={e => setTyped(e.target.value)} style={{ width: 178 }} />
                  </div>
                </div>

                {selected && (
                  <>
                    <div className="sh-slides">
                      <div className="sh-slide">
                        <canvas ref={coverRef} />
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
                          <span style={label}>1 · the grid</span>
                          <button type="button" style={btn()} onClick={() => download(coverRef, '1')}>Save</button>
                        </div>
                      </div>
                      <div className="sh-slide">
                        <canvas ref={cardRef} />
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
                          <span style={label}>2 · the back</span>
                          <button type="button" style={btn()} onClick={() => download(cardRef, '2')}>Save</button>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        style={btn(true)}
                        onClick={() => { download(coverRef, '1'); setTimeout(() => download(cardRef, '2'), 400); }}
                      >
                        Save both
                      </button>
                      <button type="button" style={btn(copied)} onClick={copyLink}>
                        {copied ? 'Copied ✓' : 'Copy link'}
                      </button>
                      {status && <span style={label}>{status}</span>}
                      {tainted && <span style={{ ...label, color: FAV_COLOR }}>Cover host sends no CORS headers — saving will fail</span>}
                    </div>
                  </>
                )}

                <div style={{ marginTop: 40, paddingTop: 22, borderTop: HAIR }}>
                  <div style={{ ...label, marginBottom: 10 }}>Still to do — actual auto-posting</div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7, color: 'rgba(26,25,22,0.7)' }}>
                    <li>Instagram: convert to a Business or Creator account, then a Meta Developer app</li>
                    <li>Long-lived token plus something that refreshes it every 60 days</li>
                    <li>Serve these two slides from a public URL so the Graph API can fetch them</li>
                    <li>Reddit: create app at reddit.com/prefs/apps, store credentials</li>
                    <li>Track which entries were posted where (DB column or new table)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
