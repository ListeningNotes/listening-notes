// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/EntryPlate.js
// (2026-11-03: `albumScene`, at the foot, is the record's print moving: Unlock,
// "this is the look", drawn around the plate's own ground and rows.)
// (2026-11-03: the head is the mark alone, no name passed in, and what a print
// shows is chosen by the words on the bar rather than by tapping lines: the
// keeper and tap branches below are left for what still calls them.)
// A record, cut as a printing plate.
//
// The first thing the share printer prints, and the one that matters: a
// profile is shared once, an entry every time a record is finished. Handed to
// SharePrinter.js, which owns the paper sizes, the looks you turn through and
// the two buttons at the bottom, and which knows nothing about records. This
// file knows nothing about Instagram. Adding a printable thing to the site is
// writing one of these, not touching the press.
//
// ── What a print is, 2026-09-12 ───────────────────────────────────────────
// The entry page's first screen, on the record's own colour. Miyel's call,
// after the first version — a cover on plain cream with the facts under it —
// looked like every other app's share card: the print is the card a reader
// already knows from the journal, centred, the chips the post's chips, and
// the ground is the cover itself blurred across the paper under a wash. Every
// print is the colour of its album; a feed of them is a wall of sleeves.
//
//   the mark, centred at the head, as it is on every page; the keeper's
//   name under it. the cover, large. the album. the artist and year. the
//   stars. the chips. the horizon — the track ratings as bars, the shape of
//   the listen. Not the posted date: it is on the page, and on a print it
//   was a line nobody needed (Miyel, 2026-09-12).
//
// The notes never travel. A card that says everything is a post, and a post
// is terminal; this one is deliberately insufficient so the code has a reason
// to be scanned. Same layout on every look and paper — the look changes the
// wash and the ink, never the information (DECISIONS: fixed layout, swappable
// background).
//
// ── No code ───────────────────────────────────────────────────────────────
// There was one, for an afternoon: plain, level M, centred at the foot on
// its own stock, and it read at every size. It came off the same day
// (Miyel's brief) because a story is viewed on the phone that would have to
// scan it — a code on a print does no work in the case the print is for.
// What carries a reader to the entry is the poster's link sticker, and the
// press copies the address for it the moment the picture is made. In
// person, the art on the entry page already turns into its photo code. A
// physically printed flyer would earn a toggle, not a redesign.
//
// ── The card is the switchboard, 2026-09-13 ──────────────────────────────
// Every line that can be left off is tapped on the preview to leave it off,
// and a ghost of it — the line itself at a fifth of its ink — stays where it
// was, to be tapped back. The marks cycle: chips, then symbols, then gone.
// The sticker's room is an absence, so its ghost is a sticker-shaped pill in
// the band it keeps, and a fainter one in the foot margin when it does not.
// Ghosts are drawn only when `preview` is set; the saved picture is drawn
// again without them, closed up. `draw` hands the press the boxes to hit.
// Six bubbles under the preview were sixty-four arrangements, most of them
// worse than the default, with two labels nobody outside this project knew.
//
// ── Two prints of the horizon ────────────────────────────────────────────
// The shape alone, the one most people post; or the shape with each title on
// the diagonal pointing at its own bar, as HorizonChart draws it with
// `labels`. Every track as a list of rows was a third for a few days, and
// went (Miyel, 2026-11-03: "either horizon with titles or without but no
// list"). A record with no titles has only the shape. The titles are the
// record's, not the keeper's: nothing written about a track travels.
// ── Units ─────────────────────────────────────────────────────────────────
// Every measurement is in units of a 340-wide column — a phone's screen one,
// 390 less its padding — so the numbers here are the post's own pixels, and
// the whole layout is those numbers times one unit: fitted first to the
// paper's width and then, if it overran, to its height. Opened out on wide
// paper (link previews) the cover goes to the left and the stack beside it.

'use client';

import { loadMark, loadPicture, MARK_ASPECT, drawTracked, drawPath, wrapLines, roundRect, ellipsize } from './SharePrinter';
import { parseRating, parseHorizon, entryTracks } from '../../library/entry_formatter';

// The taps (see the note at the top): what each switchable line does when
// tapped, and how faint a ghost is.
const GHOST = 0.18;
const TAPS = {
  keeper: shown => ({ keeper: !shown.keeper }),
  title: shown => ({ title: !shown.title }),
  artist: shown => ({ artist: !shown.artist }),
  stars: shown => ({ stars: !shown.stars }),
  horizon: (shown, hasTitles) => (!shown.horizon ? { horizon: true, bars: 'shape' }
    : !hasTitles || shown.bars === 'named' ? { horizon: false, bars: 'shape' }
      : { bars: 'named' }),
  // chips → symbols → gone → chips; without a mark that has a symbol, the
  // listen count alone goes chips → gone → chips.
  marks: (shown, hasSymbols) => (shown.chips
    ? (hasSymbols ? { chips: false, symbols: true } : { chips: false, symbols: false })
    : shown.symbols ? { chips: false, symbols: false } : { chips: true, symbols: false }),
};

// ── Measurements, in column units — the post's own ────────────────────────
const COL = 340;
const ART = 265;                       // 78% of the card, as the screen has it while printing
const ART_RADIUS = 16;
// The statement pages' mark, not the nav's: setup's card sets it 78 wide on
// 380 and the held copy's page 92 on a phone, about a fifth of the width.
// A print is a statement page too (Miyel, 2026-09-12); the nav's 28 read
// as a colophon.
const MARK_H = 44;                     // .ln-print-mark on screen
const KEEPER = 13;                     // the label face, under the mark — half again the site's line, on Miyel's call
const TITLE = 26, TITLE_LEAD = 26 * 1.22;
const ARTIST = 11;                     // mono caps, as .ln-screen-one-artist
const STAR = 30, STAR_GAP = 4;         // StarRating size={24}, a quarter up for the same reason as the chips
// A third larger than the post's chips (10 on 8×3): a print is looked at
// inside a story, a phone's width scaled into a phone's width, and at the
// screen's size they could not be read (Miyel, 2026-09-12).
const CHIP = 13, CHIP_PAD_X = 10, CHIP_PAD_Y = 4, CHIP_GAP = 8, CHIP_RADIUS = 5;
// The marks as symbols instead of chips — the feed's own three, much larger
// than a chip, so a print can carry the marks as pictures (Miyel's ask).
const SYMBOL = 34, SYMBOL_GAP = 18;
// HorizonChart's own: 52 tall over 13 of headroom, a gap by track count,
// a heart of 10 sitting 4 above its bar, corners of 3.
const HORIZON_H = 52, HORIZON_HEAD = 13, HEART = 10, HEART_LIFT = 4, BAR_RADIUS = 3;
const horizonGap = n => (n > 24 ? 2 : n > 14 ? 3 : 4);
// HorizonChart's labels: 6 under the bars, a band of 76 (62 past twenty
// tracks), the mono at 9.5 on a 52° diagonal, cut at 104 wide (78).
const LABEL_TOP = 6, LABEL = 9.5, LABEL_TURN = (-52 * Math.PI) / 180;
const labelBand = n => (n > 20 ? 62 : 76);
const labelMost = n => (n > 20 ? 78 : 104);
const COLUMN_GAP = 28;                 // opened out: between the cover and the stack
// The screen's gap is 16 between everything; the artist line pulls up by 8.
// The screen's card has one gap between everything.
const GAP = { keeper: 12, art: 12, title: 12, artist: 8, stars: 12, chips: 12, listen: 10, horizon: 12 };

// The paper's padding, as the screen has it: the card fills what is inside.
// The print IS the paper on screen (Miyel, 2026-09-13: a saved picture that
// kept hidden margins for Instagram's furniture and a sticker came out with
// the card smaller than the one she had just approved). If a story ever
// needs room kept, it is drawn on the preview as a band, not here.
const PAD = 0.07;
const PAD_SPREAD = 0.04;

// ── Ink ────────────────────────────────────────────────────────────────────
// base.css, stated rather than read: a print is the same colour wherever it
// is made. Day is the light theme's ink over a light wash, Night the dark's.
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
const GOLD = '#E8B84B';
const LIVE = '#7cff9b';                // --live: the mark's dot, lit
const FAV = '#f0484f';                 // --fav
// The chips' tones, as Chip.js has them: the word in the colour, the hairline
// the same colour at 40%.
const TONES = {
  fav: { ink: '#f0484f', edge: 'rgba(240,72,79,0.4)' },
  mp: { ink: '#4a9bf0', edge: 'rgba(74,155,240,0.4)' },
  formative: { ink: '#3fa96b', edge: 'rgba(63,169,107,0.4)' },
};
// StarRating's star, in an 18-box; a heart in a 24-box for the favourites.
const STAR_PATH = 'M9 1.5l2.163 4.38 4.837.703-3.5 3.412.826 4.818L9 12.39l-4.326 2.273.826-4.818L2 6.583l4.837-.703z';
const HEART_PATH = 'M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11z';
// The marks' symbols, as Feed.js draws them: Phosphor's Heart (fill),
// SketchLogo (fill) and Fingerprint (bold), each a single path in a 256-box.
const SYMBOLS = {
  fav: 'M240,102c0,70-103.79,126.66-108.21,129a8,8,0,0,1-7.58,0C119.79,228.66,16,172,16,102A62.07,62.07,0,0,1,78,40c20.65,0,38.73,8.88,50,23.89C139.27,48.88,157.35,40,178,40A62.07,62.07,0,0,1,240,102Z',
  mp: 'M246,98.73l-56-64A8,8,0,0,0,184,32H72a8,8,0,0,0-6,2.73l-56,64a8,8,0,0,0,.17,10.73l112,120a8,8,0,0,0,11.7,0l112-120A8,8,0,0,0,246,98.73ZM222.37,96H180L144,48h36.37ZM74.58,112l30.13,75.33L34.41,112Zm106.84,0h40.17l-70.3,75.33ZM75.63,48H112L76,96H33.63Z',
  formative: 'M160,128a224.48,224.48,0,0,1-26.37,105.54,12,12,0,1,1-21.16-11.32A200.33,200.33,0,0,0,136,128a8,8,0,0,0-16,0,12,12,0,0,1-24,0,32,32,0,0,1,64,0ZM128,56a12,12,0,1,0,0,24,48.05,48.05,0,0,1,48,48c0,7.62-.36,15.32-1.07,22.87A12,12,0,0,0,185.74,164c.38,0,.76,0,1.14,0a12,12,0,0,0,11.93-10.87c.79-8.3,1.18-16.76,1.18-25.13A72.08,72.08,0,0,0,128,56ZM96,92.23A12,12,0,0,0,80,74.35,72.1,72.1,0,0,0,56,128a120.11,120.11,0,0,1-15.12,58.37,12,12,0,0,0,21,11.69A144.14,144.14,0,0,0,80,128,48.08,48.08,0,0,1,96,92.23Zm10.1,64.1a12,12,0,0,0-14.46,8.9,158.61,158.61,0,0,1-18.88,45.86,12,12,0,0,0,20.5,12.48A182.86,182.86,0,0,0,115,170.79,12,12,0,0,0,106.1,156.33Zm76.73,24.07A12,12,0,0,0,168.19,189a241.5,241.5,0,0,1-8,24.87,12,12,0,0,0,6.91,15.49,11.76,11.76,0,0,0,4.29.8,12,12,0,0,0,11.21-7.71,260.2,260.2,0,0,0,8.79-27.37A12,12,0,0,0,182.83,180.4ZM128,16A112.12,112.12,0,0,0,16,127.44c0,.19,0,.38,0,.57a79.81,79.81,0,0,1-5,27.82,12,12,0,1,0,22.5,8.35A103.59,103.59,0,0,0,40,128.58c0-.19,0-.38,0-.57a88,88,0,0,1,176-.5c0,.16,0,.33,0,.5a282.12,282.12,0,0,1-6.74,61.38,12,12,0,0,0,9.09,14.33A11.84,11.84,0,0,0,221,204a12,12,0,0,0,11.7-9.38A305.87,305.87,0,0,0,240,128.55c0-.18,0-.36,0-.54A112.13,112.13,0,0,0,128,16Z',
};

// A row of the print: the air above it, its height, and how it draws into
// the box it is given. Measured and drawn by the same numbers so the two
// passes cannot disagree. Everything is centred in its box.
function textRow({ gap, lines, size, lead, colour, font }) {
  return {
    gap,
    h: lines.length * lead,
    draw(c, x, y, w) {
      c.font = font;
      c.fillStyle = colour;
      c.textBaseline = 'top';
      c.textAlign = 'center';
      const drop = (lead - size) / 2;
      lines.forEach((line, i) => c.fillText(line, x + w / 2, y + i * lead + drop));
      c.textAlign = 'left';
    },
  };
}

// How wide a tracked line will be, before it is drawn — for sizing a chip.
function trackedWidth(c, text, spacing) {
  const chars = [...String(text)];
  let total = 0;
  for (const ch of chars) total += c.measureText(ch).width + spacing;
  return Math.max(0, total - spacing);
}

// ── The plate ──────────────────────────────────────────────────────────────

export function entryPlate({ entry, keeper }) {
  const score = parseRating(entry?.rating);
  const isMasterpiece = entry?.masterpiece === true || entry?.rating === 'Masterpiece';
  const stars = isMasterpiece ? 5 : score;
  const isFavorite = entry?.favorite === true || entry?.favorite === 'true';
  const isFormative = entry?.formative === true || entry?.formative === 'true';
  // The chips, in the post's order and the post's words.
  const chips = [];
  if (entry?.listen_total > 1) {
    chips.push({ text: entry.listen_number === 1 ? `First listen · 1 of ${entry.listen_total}` : `Listen ${entry.listen_number} of ${entry.listen_total}` });
  }
  if (isFavorite) chips.push({ text: 'Favorite', tone: 'fav' });
  if (isMasterpiece) chips.push({ text: 'Masterpiece', tone: 'mp' });
  if (isFormative) chips.push({ text: 'Formative', tone: 'formative' });
  const line = [entry?.artist, entry?.year].filter(Boolean).join(' · ');

  // The horizon: the track ratings as bars, read from the column the session
  // derives — or from the tracks themselves, for a record that has ratings
  // and no column.
  const tracks = entryTracks(entry || {});
  let bars = parseHorizon(entry?.horizon);
  if (!bars.length && tracks.some(t => t.stars > 0)) {
    bars = tracks.map(t => Math.max(0, Math.min(1, (Number(t.stars) || 0) / 5)));
  }
  const favs = tracks.map(t => !!t.favorite);
  // The named print and the rows read the tracks themselves, so a title and
  // its bar can never belong to different lists.
  const named = tracks.filter(t => t.name);
  const hasTitles = named.length > 0 && named.length === tracks.length;
  const ratings = tracks.map(t => Math.max(0, Math.min(1, (Number(t.stars) || 0) / 5)));

  // What the printer offers to leave off. The cover, the album and the
  // artist are not switches: they are the card.
  const toggles = [];
  if (keeper) toggles.push({ key: 'keeper', label: 'Keeper', on: true });
  toggles.push({ key: 'title', label: 'Title', on: true });
  if (line) toggles.push({ key: 'artist', label: 'Artist', on: true });
  if (stars > 0) toggles.push({ key: 'stars', label: 'Stars', on: true });
  // Chips or symbols: the marks as the post's chips, or as the feed's
  // symbols — one or the other, or neither, cycled by tapping them. Chips to
  // begin with: they are the post's. A listen count has no symbol and stays
  // a chip beneath the symbols.
  if (chips.length) toggles.push({ key: 'chips', label: 'Chips', on: true });
  const marks = chips.filter(chip => chip.tone);
  if (marks.length) toggles.push({ key: 'symbols', label: 'Symbols', on: false });
  if (bars.length) toggles.push({ key: 'horizon', label: 'Horizon', on: true });

  return {
    // What the moving print is earned by (albumScene).
    masterpiece: isMasterpiece,
    stars,
    title: 'The record',
    fileName: entry?.slug || 'record',
    toggles,

    // Two pictures: the mark in the look's ink, and the cover — which is also
    // the ground. Either may come back null and the plate draws on without it.
    async load({ isDark }) {
      const [mark, cover] = await Promise.all([
        loadMark(isDark ? INKS.night.ink : INKS.day.ink),
        loadPicture(entry?.album_art),
      ]);
      return { mark, cover };
    },

    draw(ctx, frame, { art, shown, isDark, families, preview = false, ground = 'record', layer = null, onCover = null, onRow = null }) {
      const ink = isDark ? INKS.night : INKS.day;
      const { sans, mono } = families;
      const on = key => (shown ? shown[key] !== false : true);
      // The boxes the press hit-tests a tap against, in the paper's pixels.
      const targets = [];
      const spread = frame.w / frame.h > 1.3;
      // The room inside the paper's padding, as on screen.
      const pad = frame.w * (spread ? PAD_SPREAD : PAD);
      const roomW = frame.w - pad * 2;
      const roomH = frame.h - pad * 2;

      // ── the ground ───────────────────────────────────────────────────────
      // A moving print asks for its still parts apart (albumScene): the ground
      // alone, then each row on its own, told where the cover goes instead.
      if (layer !== 'rows') paintGround(ctx, frame, art?.cover, ink, ground);
      if (layer === 'ground') return targets;

      // ── measure, then fit ────────────────────────────────────────────────
      // Width decides the unit. If the result is too tall the unit comes down
      // by exactly the overrun; everything scales with it, so one correction
      // is enough.
      let U = spread
        ? Math.min(roomH / ART, roomW / (ART + COL + COLUMN_GAP))
        : roomW / COL;
      let built = build(U);
      if (built.h > roomH) {
        U *= roomH / built.h;
        built = build(U);
      }

      function build(unit) {
        const px = n => n * unit;
        const colW = px(COL);
        const artW = px(ART);
        const rows = [];
        const showKeeper = Boolean(keeper) && on('keeper');

        // the mark, centred, at the head — its dot lit when the page's is
        if (art?.mark) {
          rows.push({
            gap: 0,
            h: px(MARK_H),
            draw(c, x, y, w) {
              const mh = px(MARK_H);
              const mw = mh * MARK_ASPECT;
              const mx = x + (w - mw) / 2;
              c.drawImage(art.mark, mx, y, mw, mh);
              if (shown?.liveDot) {
                // The dot's place in the mark's box (76 96 241 140): centre
                // 297.05, 216.72, radius 14.13 — as SiteNav draws it.
                c.fillStyle = LIVE;
                c.beginPath();
                c.arc(mx + ((297.0547 - 76) / 241) * mw, y + ((216.71875 - 96) / 140) * mh, (14.1328 / 241) * mw, 0, Math.PI * 2);
                c.fill();
              }
            },
          });
        }

        // whose journal, under it
        if (keeper && (showKeeper || preview)) {
          // .ln-print-keeper: the line plus 4 of padding above and below
          rows.push({
            key: 'keeper', ghost: !showKeeper,
            gap: art?.mark ? px(GAP.keeper) : 0,
            h: px(KEEPER) * 1.4 + px(8),
            draw(c, x, y, w) {
              c.textBaseline = 'top';
              c.font = `400 ${px(KEEPER)}px ${mono}`;
              c.fillStyle = ink.soft;   // the post's faint sinks into a photograph
              drawTracked(c, keeper.toUpperCase(), x + w / 2, y + px(4), px(KEEPER) * 0.14, 'center');
            },
          });
        }

        // the cover. Opened out it is beside the stack and not in it.
        if (!spread) {
          rows.push({ isCover: true, gap: px(GAP.art), h: artW, draw: (c, x, y, w) => drawCover(c, x + (w - artW) / 2, y, artW, unit) });
        }

        // the album, two lines at most, as the screen clamps it
        if (on('title') || preview) {
          ctx.font = `700 ${px(TITLE)}px ${sans}`;
          rows.push({
            key: 'title', ghost: !on('title'),
            ...textRow({
              gap: px(GAP.title),
              lines: wrapLines(ctx, entry?.album || '', colW, 2),
              size: px(TITLE), lead: px(TITLE_LEAD), colour: ink.ink,
              font: `700 ${px(TITLE)}px ${sans}`,
            }),
          });
        }

        // the artist and the year, in the label face — two lines at most,
        // wrapped as the screen wraps it (Miyel, 2026-09-13), against a
        // measure narrowed for the tracking the wrapper cannot see
        if (line && (on('artist') || preview)) {
          ctx.font = `400 ${px(ARTIST)}px ${mono}`;
          const artistLines = wrapLines(ctx, line.toUpperCase(), colW * 0.86, 2);
          const lead = px(ARTIST) * 1.4;
          rows.push({
            key: 'artist', ghost: !on('artist'),
            gap: px(GAP.artist),
            h: artistLines.length * lead,
            draw(c, x, y, w) {
              c.textBaseline = 'top';
              c.font = `400 ${px(ARTIST)}px ${mono}`;
              c.fillStyle = ink.soft;
              artistLines.forEach((l, i) => drawTracked(c, l, x + w / 2, y + i * lead, px(ARTIST) * 0.14, 'center'));
            },
          });
        }

        // the stars
        if (stars > 0 && (on('stars') || preview)) {
          rows.push({ key: 'stars', ghost: !on('stars'), gap: px(GAP.stars), h: px(STAR), draw: (c, x, y, w) => drawStars(c, x, y, w, unit) });
        }

        // the marks: the feed's symbols, or the post's chips, or neither — and
        // in the preview, a ghost of the chips when neither. A listen count
        // has no symbol, so under the symbols it stays a chip.
        const asSymbols = on('symbols') && marks.length > 0;
        const asChips = !asSymbols && on('chips');
        if (asSymbols) {
          rows.push({ key: 'marks', gap: px(GAP.chips), h: px(SYMBOL), draw: (c, x, y, w) => drawSymbols(c, x, y, w, unit) });
        }
        const listed = asSymbols ? chips.filter(chip => !chip.tone) : chips;
        if (listed.length && (asSymbols || asChips || preview)) {
          const laid = layChips(ctx, listed, colW, unit);
          rows.push({
            key: 'marks', ghost: !asSymbols && !asChips,
            gap: px(asSymbols ? GAP.listen : GAP.chips), h: laid.h,
            draw: (c, x, y, w) => drawChips(c, x, y, w, laid, unit),
          });
        }


        // the horizon, with HorizonChart's headroom for the hearts — as the
        // shape, or the shape named
        if (bars.length && (on('horizon') || preview)) {
          const as = on('horizon') && hasTitles ? (shown?.bars || 'shape') : 'shape';
          const head = px(HORIZON_HEAD);
          if (as === 'named') {
            const band = px(HORIZON_H + LABEL_TOP + labelBand(tracks.length));
            rows.push({ key: 'horizon', gap: px(GAP.horizon), h: head + band, draw: (c, x, y, w) => drawHorizon(c, x, y + head, w, unit, true) });
          } else {
            rows.push({ key: 'horizon', ghost: !on('horizon'), gap: px(GAP.horizon), h: head + px(HORIZON_H), draw: (c, x, y, w) => drawHorizon(c, x, y + head, w, unit) });
          }
        }

        const stack = rows.reduce((sum, row) => sum + row.gap + row.h, 0);
        return { rows, stack, h: spread ? Math.max(stack, artW) : stack, colW, artW };
      }

      // ── the ground ───────────────────────────────────────────────────────
      // Three grounds (Miyel, 2026-09-13): the record — the cover blurred
      // across the whole paper, overscanned so no edge shows, under the
      // look's wash — or plain day, or plain night: the page's own colour.
      function paintGround(c, f, img, ink, ground) {
        c.fillStyle = ink.paper;
        c.fillRect(0, 0, f.w, f.h);
        if (ground === 'record' && img?.naturalWidth) {
          const s = Math.max(f.w / img.naturalWidth, f.h / img.naturalHeight) * 1.3;
          const dw = img.naturalWidth * s;
          const dh = img.naturalHeight * s;
          c.save();
          if (typeof c.filter === 'string') {
            // Six hundredths of the width to begin with, then a fifth softer,
            // then softer again with a lighter wash (2026-09-13): the art has
            // to come through as art. The same numbers the screen uses
            // (entry.css .ln-print-ground: 11px on a 375 screen, 46%).
            c.filter = `blur(${Math.round(f.w * 0.03)}px) saturate(1.25)`;
            c.drawImage(img, (f.w - dw) / 2, (f.h - dh) / 2, dw, dh);
          } else {
            // No filter on this canvas: a picture shrunk to a few pixels and
            // stretched back is a blur by another route.
            const tiny = document.createElement('canvas');
            tiny.width = 12; tiny.height = 12;
            const t = tiny.getContext('2d');
            t.imageSmoothingQuality = 'high';
            t.drawImage(img, 0, 0, 12, 12);
            c.imageSmoothingQuality = 'high';
            c.drawImage(tiny, (f.w - dw) / 2, (f.h - dh) / 2, dw, dh);
          }
          c.restore();
          c.fillStyle = ink.wash;
          c.fillRect(0, 0, f.w, f.h);
        }
      }

      // ── the cover ────────────────────────────────────────────────────────
      // As .ln-screen-one-art has it: the square's radius, a hairline, the
      // lift — two shadows, drawn as two fills, since a canvas casts one at a
      // time.
      function drawCover(c, x, y, size, unit) {
        const radius = ART_RADIUS * unit;
        if (layer === 'rows') { onCover?.({ x, y, size, radius, unit }); return; }
        c.save();
        c.shadowColor = ink.lift[1];
        c.shadowBlur = 48 * unit;
        c.shadowOffsetY = 16 * unit;
        c.fillStyle = ink.warm;
        roundRect(c, x, y, size, size, radius);
        c.fill();
        c.shadowColor = ink.lift[0];
        c.shadowBlur = 20 * unit;
        c.shadowOffsetY = 4 * unit;
        c.fill();
        c.restore();
        const img = art?.cover;
        if (img?.naturalWidth) {
          const scale = Math.max(size / img.naturalWidth, size / img.naturalHeight);
          const drawW = img.naturalWidth * scale;
          const drawH = img.naturalHeight * scale;
          c.save();
          roundRect(c, x, y, size, size, radius);
          c.clip();
          c.drawImage(img, x - (drawW - size) / 2, y - (drawH - size) / 2, drawW, drawH);
          c.restore();
        }
        c.strokeStyle = ink.edge;
        c.lineWidth = Math.max(1, unit * 0.8);
        roundRect(c, x, y, size, size, radius);
        c.stroke();
      }

      // ── the stars ────────────────────────────────────────────────────────
      // StarRating: every star drawn faint in gold, the lit ones over it in
      // full gold, a half as the left half. A masterpiece glows.
      function drawStars(c, x, y, w, unit) {
        const box = STAR * unit;
        const step = (STAR + STAR_GAP) * unit;
        const total = 5 * box + 4 * STAR_GAP * unit;
        const left = x + (w - total) / 2;
        for (let n = 1; n <= 5; n++) {
          const sx = left + (n - 1) * step;
          drawPath(c, STAR_PATH, sx, y, box, 18, ink.unlit);
          const fill = stars >= n ? 'full' : stars >= n - 0.5 ? 'half' : 'empty';
          if (fill === 'empty') continue;
          c.save();
          if (isMasterpiece) {
            c.shadowColor = 'rgba(255,210,60,0.6)';
            c.shadowBlur = 5 * unit;
          }
          if (fill === 'half') {
            c.beginPath();
            c.rect(sx, y, box / 2, box);
            c.clip();
          }
          drawPath(c, STAR_PATH, sx, y, box, 18, GOLD);
          c.restore();
        }
      }

      // ── the chips ────────────────────────────────────────────────────────
      // Chip.js: the label face, tracked a little, a hairline in the tone at
      // 40%, a small radius. Laid out first so the row knows its height —
      // they wrap, centred, as the screen's row does.
      function layChips(c, list, maxW, unit) {
        const font = `400 ${CHIP * unit}px ${mono}`;
        const spacing = CHIP * unit * 0.08;
        const padX = CHIP_PAD_X * unit;
        const h = CHIP * unit * 1.2 + CHIP_PAD_Y * 2 * unit;
        const gap = CHIP_GAP * unit;
        c.font = font;
        const sized = list.map(chip => ({ ...chip, w: trackedWidth(c, chip.text, spacing) + padX * 2 }));
        const lines = [[]];
        let used = 0;
        for (const chip of sized) {
          const need = (lines.at(-1).length ? gap : 0) + chip.w;
          if (lines.at(-1).length && used + need > maxW) { lines.push([chip]); used = chip.w; }
          else { lines.at(-1).push(chip); used += need; }
        }
        return { lines, h: lines.length * h + (lines.length - 1) * gap, rowH: h, gap, font, spacing, padX };
      }
      function drawChips(c, x, y, w, laid, unit) {
        c.font = laid.font;
        c.textBaseline = 'middle';
        laid.lines.forEach((chipsOnLine, i) => {
          const total = chipsOnLine.reduce((sum, chip) => sum + chip.w, 0) + laid.gap * (chipsOnLine.length - 1);
          let cx = x + (w - total) / 2;
          const cy = y + i * (laid.rowH + laid.gap);
          for (const chip of chipsOnLine) {
            const tone = TONES[chip.tone];
            c.strokeStyle = tone ? tone.edge : ink.rule;
            c.lineWidth = Math.max(1, unit * 0.8);
            roundRect(c, cx, cy, chip.w, laid.rowH, CHIP_RADIUS * unit);
            c.stroke();
            c.fillStyle = tone ? tone.ink : ink.soft;
            drawTracked(c, chip.text, cx + laid.padX, cy + laid.rowH / 2 + 0.5 * unit, laid.spacing, 'left');
            cx += chip.w + laid.gap;
          }
        });
        c.textBaseline = 'top';
      }

      // ── the symbols ──────────────────────────────────────────────────────
      // The marks as the feed draws them, large, in their colours, centred.
      function drawSymbols(c, x, y, w, unit) {
        const size = SYMBOL * unit;
        const step = (SYMBOL + SYMBOL_GAP) * unit;
        const total = marks.length * size + (marks.length - 1) * SYMBOL_GAP * unit;
        let sx = x + (w - total) / 2;
        for (const mark of marks) {
          drawPath(c, SYMBOLS[mark.tone], sx, y, size, 256, TONES[mark.tone].ink);
          sx += step;
        }
      }

      // ── the horizon ──────────────────────────────────────────────────────
      // The entry page's bars: one per track, height by rating, a heart over
      // a favourite. In the ink at half strength rather than the page's
      // accent grey, which sank into the washed photograph. Named, it reads
      // the tracks' own ratings and writes each title under its bar.
      function drawHorizon(c, x, y, w, unit, withTitles = false) {
        const heights = withTitles ? ratings : bars;
        const hearts = withTitles ? tracks.map(t => t.favorite) : favs;
        const n = heights.length;
        const gap = horizonGap(n) * unit;
        const bw = Math.max(1, (w - gap * (n - 1)) / n);
        const h = HORIZON_H * unit;
        const r = Math.min(BAR_RADIUS * unit, bw / 2);
        for (let i = 0; i < n; i++) {
          const bh = Math.max(0.03 * h, heights[i] * h);
          const x0 = x + i * (bw + gap), x1 = x0 + bw;
          const y0 = y + h - bh, y1 = y + h;
          c.fillStyle = ink.bar;
          c.beginPath();
          c.moveTo(x0, y1);
          c.lineTo(x0, y0 + r);
          c.arcTo(x0, y0, x0 + r, y0, r);
          c.lineTo(x1 - r, y0);
          c.arcTo(x1, y0, x1, y0 + r, r);
          c.lineTo(x1, y1);
          c.closePath();
          c.fill();
          if (hearts[i]) {
            const hs = HEART * unit;
            drawPath(c, HEART_PATH, x0 + (bw - hs) / 2, y0 - hs - HEART_LIFT * unit, hs, 24, FAV);
          }
          if (withTitles) {
            // Anchored at the bar's centre and turned down-left, so the end of
            // each title points at the bar it belongs to.
            c.save();
            c.translate(x0 + bw / 2, y1 + LABEL_TOP * unit);
            c.rotate(LABEL_TURN);
            c.font = `400 ${LABEL * unit}px ${mono}`;
            c.fillStyle = ink.soft;
            c.textAlign = 'right';
            c.textBaseline = 'top';
            c.fillText(ellipsize(c, tracks[i].name, labelMost(n) * unit), 0, 0);
            c.restore();
          }
        }
      }

      // ── lay it down ──────────────────────────────────────────────────────
      // A ghost row is drawn at a fifth of its ink, and every switchable row
      // leaves a box — its own height plus the air above it, the column's
      // full width — for the press to hit-test against.
      const { rows, stack, h, colW, artW } = built;
      function lay(x, y0) {
        let y = y0;
        for (const row of rows) {
          y += row.gap;
          if (layer === 'rows') {
            if (row.isCover) { row.draw(ctx, x, y, colW); y += row.h; continue; }
            const air = Math.round(U * 24);
            const alone = document.createElement('canvas');
            alone.width = Math.ceil(colW + air * 2);
            alone.height = Math.ceil(row.h + air * 2);
            const pen = alone.getContext('2d');
            pen.textBaseline = 'top';
            row.draw(pen, air, air, colW);
            onRow?.({ key: row.key || 'head', canvas: alone, x: x - air, y: y - air, air, unit: U, h: row.h });
            y += row.h;
            continue;
          }
          if (row.ghost) { ctx.save(); ctx.globalAlpha = GHOST; }
          row.draw(ctx, x, y, colW);
          if (row.ghost) ctx.restore();
          if (row.key) targets.push({ x, y: y - row.gap, w: colW, h: row.h + row.gap, tap: taps(row.key) });
          y += row.h;
        }
      }
      if (spread) {
        // The cover to the left, the writing beside it (Miyel's call,
        // 2026-09-13, after an hour the other way round).
        const blockW = artW + COLUMN_GAP * U + colW;
        const originX = (frame.w - blockW) / 2;
        const originY = (frame.h - h) / 2;
        drawCover(ctx, originX, originY + (h - artW) / 2, artW, U);
        lay(originX + artW + COLUMN_GAP * U, originY + (h - stack) / 2);
      } else {
        lay((frame.w - colW) / 2, (frame.h - h) / 2);
      }
      return targets;

      function taps(key) {
        if (key === 'marks') return shown => TAPS.marks(shown, marks.length > 0);
        if (key === 'horizon') return shown => TAPS.horizon(shown, hasTitles);
        return TAPS[key];
      }
    },
  };
}

// ── One record, moving: Unlock ─────────────────────────────────────────────
// The album rises as a solid thing you have just won and turns slowly, with
// rays and sparks behind it; then the rest of the print arrives with the same
// attention, each star landing with its own shine (Miyel, 2026-11-03: "this is
// the look"). Fizz, Vinyl, Foil and Pieces were tried beside it and went.
//
// How much of it you get is earned by the rating (Miyel, the same day:
// "masterpiece and things below should have different effects"), the way a rare
// thing arrives bigger than a common one: a Masterpiece with doubled rays, rays
// off each star, gold sparks, a ring as it lands and light crossing the album
// itself; four stars and up in plain light with stars that are only stars
// (Miyel: no gold rays, and the stars' rays are the Masterpiece's); threes a
// faint few rays; below that it simply arrives and turns. The album, the rotation and the order of arrival are the same for all.
//
// A scene is told the time rather than reading it, so a video is made faster
// than real time (library/video_file.js), and the same scene is the preview.
// The ground and the rows are the plate's own, kept as pictures.
//
// The turning is drawn in vertical strips, each its own height for how near it
// is: a canvas has no 3D of its own. It is a true rotation: the back is the
// front seen from behind, so mirrored, and the sides are the art's own edge
// carried round.
const GRADES = {
  masterpiece: { ray: 'rgba(255,255,255,0.3)', wedges: 18, twin: true, sparks: 46, spark: '#e8b84b', ring: true, sheen: true, starFan: 2.8, sweep: 3.2 },
  high: { ray: 'rgba(255,255,255,0.3)', wedges: 12, sparks: 18, spark: '#ffffff', sweep: 5 },
  middle: { ray: 'rgba(255,255,255,0.16)', wedges: 6, sparks: 6, spark: '#ffffff' },
  low: {},
};
const gradeOf = plate => (plate.masterpiece ? GRADES.masterpiece
  : plate.stars >= 4 ? GRADES.high
    : plate.stars >= 3 ? GRADES.middle : GRADES.low);
const easeOut = v => 1 - (1 - v) ** 3;
const easeBack = v => { const k = 1.70158; const u = v - 1; return 1 + (k + 1) * u ** 3 + k * u ** 2; };
const clamp01 = v => Math.min(1, Math.max(0, v));

function coverPicture(img, size) {
  const s = Math.max(1, Math.round(size));
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const x = c.getContext('2d');
  if (img?.naturalWidth) {
    const k = Math.max(s / img.naturalWidth, s / img.naturalHeight);
    x.drawImage(img, (s - img.naturalWidth * k) / 2, (s - img.naturalHeight * k) / 2, img.naturalWidth * k, img.naturalHeight * k);
  } else {
    x.fillStyle = '#777';
    x.fillRect(0, 0, s, s);
  }
  return c;
}

function drawTurned(c, picture, mirrored, cx, cy, size, angle, depth) {
  const hs = size / 2;
  const eye = size * 3.2;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const facing = cos >= 0 ? 1 : -1;
  const point = (u, side) => {
    const x = u * hs * cos + side * (depth / 2) * sin;
    const z = -u * hs * sin + side * (depth / 2) * cos;
    const p = eye / (eye - z);
    return { x: cx + x * p, half: hs * p };
  };
  const w = picture.width, h = picture.height;
  // The side nearer the eye: the art's own edge, stretched round and a little
  // shaded, as light falls off a turning thing.
  const u = sin < 0 ? 1 : -1;
  const a = point(u, 1), b = point(u, -1);
  const edge = u > 0 ? w - 2 : 0;
  const STEPS = 6;
  for (let i = 0; i < STEPS; i++) {
    const k0 = i / STEPS, k1 = (i + 1) / STEPS;
    const x0 = a.x + (b.x - a.x) * k0, x1 = a.x + (b.x - a.x) * k1;
    const half = a.half + (b.half - a.half) * ((k0 + k1) / 2);
    const left = Math.min(x0, x1), wide = Math.abs(x1 - x0);
    if (wide < 0.01) continue;
    c.drawImage(picture, edge, 0, 2, h, left, cy - half, wide + 0.8, half * 2);
  }
  const shade = Math.min(a.x, b.x), shadeW = Math.abs(b.x - a.x);
  c.fillStyle = 'rgba(0,0,0,0.16)';
  c.fillRect(shade, cy - Math.max(a.half, b.half), shadeW, Math.max(a.half, b.half) * 2);

  const STRIPS = 48;
  for (let i = 0; i < STRIPS; i++) {
    const u0 = -1 + (2 * i) / STRIPS, u1 = -1 + (2 * (i + 1)) / STRIPS;
    const p0 = point(u0, facing), p1 = point(u1, facing);
    const left = Math.min(p0.x, p1.x);
    const wide = Math.abs(p1.x - p0.x);
    if (wide < 0.01) continue;
    const mid = (p0.half + p1.half) / 2;
    // Seen from behind, the art runs the other way across the screen, so it is
    // read off a mirrored copy, left to right as the strips go.
    if (facing > 0) c.drawImage(picture, ((u0 + 1) / 2) * w, 0, w / STRIPS, h, left, cy - mid, wide + 0.8, mid * 2);
    else c.drawImage(mirrored, (1 - (u1 + 1) / 2) * w, 0, w / STRIPS, h, left, cy - mid, wide + 0.8, mid * 2);
  }
}

function rayPicture(size, colour, wedges) {
  const c = document.createElement('canvas');
  c.width = c.height = Math.max(1, Math.round(size));
  const x = c.getContext('2d');
  const r = c.width / 2;
  x.translate(r, r);
  x.fillStyle = colour;
  for (let i = 0; i < wedges; i++) {
    const a = (i * Math.PI * 2) / wedges;
    x.beginPath();
    x.moveTo(0, 0);
    x.arc(0, 0, r, a, a + (Math.PI * 2) / wedges / 3);
    x.closePath();
    x.fill();
  }
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalCompositeOperation = 'destination-in';
  const g = x.createRadialGradient(r, r, r * 0.15, r, r, r);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

function spark(c, x, y, r) {
  const w = r * 0.28;
  c.beginPath();
  c.moveTo(x, y - r);
  c.lineTo(x + w, y - w);
  c.lineTo(x + r, y);
  c.lineTo(x + w, y + w);
  c.lineTo(x, y + r);
  c.lineTo(x - w, y + w);
  c.lineTo(x - r, y);
  c.lineTo(x - w, y - w);
  c.closePath();
  c.fill();
}

export function albumScene(plate, frame, { art, shown, isDark, families, ground }) {
  const under = document.createElement('canvas');
  under.width = frame.w;
  under.height = frame.h;
  plate.draw(under.getContext('2d'), frame, { art, shown, isDark, families, ground, layer: 'ground' });
  let spot = null;
  const rows = [];
  plate.draw(document.createElement('canvas').getContext('2d'), frame, {
    art, shown, isDark, families, ground, layer: 'rows',
    onCover: got => { spot = got; },
    onRow: row => rows.push(row),
  });
  const size = spot?.size || frame.w * 0.7;
  const x = spot?.x ?? (frame.w - size) / 2, y = spot?.y ?? frame.h * 0.15;
  const cx = x + size / 2, cy = y + size / 2;
  const square = coverPicture(art?.cover, size);
  const mirrored = document.createElement('canvas');
  mirrored.width = square.width;
  mirrored.height = square.height;
  const flip = mirrored.getContext('2d');
  flip.translate(square.width, 0);
  flip.scale(-1, 1);
  flip.drawImage(square, 0, 0);
  const unit = spot?.unit || size / 265;

  const grade = gradeOf(plate);
  const rays = grade.ray ? rayPicture(frame.w * 1.7, grade.ray, grade.wedges) : null;
  const smallRays = grade.starFan ? rayPicture(unit * 90, grade.ray, 12) : null;
  let seed = 7;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const lowest = rows.length ? Math.max(...rows.map(r => r.y + r.canvas.height)) : frame.h;
  const sparks = Array.from({ length: grade.sparks || 0 }, () => ({ x: random() * frame.w, y: random() * lowest, at: random() * 2.4, s: frame.w * (0.008 + random() * 0.012) }));

  // When each row arrives, after the album has landed.
  const ARRIVES = { title: 1.15, artist: 1.35, stars: 1.6, marks: 2.75, horizon: 3.05 };
  const POP = 0.45;
  const STAR_EVERY = 0.2;
  // The star row's boxes, as the plate lays them: 30 wide, 4 apart, centred.
  const STAR_W = 30, STAR_SPACE = 4, STARS = 5;

  // A band of light crossing a picture's ink, for what has landed.
  const scratch = document.createElement('canvas');
  const sweep = (c, row, t, at) => {
    if (!grade.sweep) return;
    const local = (t - at) % grade.sweep;
    if (t < at || local > 1) return;
    const w = row.canvas.width, h = row.canvas.height;
    if (scratch.width !== w) scratch.width = w;
    if (scratch.height !== h) scratch.height = h;
    const s = scratch.getContext('2d');
    s.globalCompositeOperation = 'source-over';
    s.clearRect(0, 0, w, h);
    s.drawImage(row.canvas, 0, 0);
    // The light alone, on the shape of the ink: drawing the ink twice darkened
    // anything see-through, as the bars are.
    s.globalCompositeOperation = 'source-in';
    const mid = -w * 0.3 + local * w * 1.6;
    const g = s.createLinearGradient(mid - w * 0.14, 0, mid + w * 0.14, 0);
    g.addColorStop(0, 'rgba(255,240,190,0)');
    g.addColorStop(0.5, 'rgba(255,240,190,0.95)');
    g.addColorStop(1, 'rgba(255,240,190,0)');
    s.fillStyle = g;
    s.fillRect(0, 0, w, h);
    c.drawImage(scratch, row.x, row.y);
  };
  const popped = (c, row, k, centreX, centreY, drawIt) => {
    const scale = easeBack(k);
    c.save();
    c.translate(centreX, centreY);
    c.scale(scale, scale);
    c.translate(-centreX, -centreY);
    drawIt();
    c.restore();
  };

  function drawStars(c, row, t) {
    const air = row.air, u = row.unit;
    const total = (STAR_W * STARS + STAR_SPACE * (STARS - 1)) * u;
    const left = (row.canvas.width - total) / 2;
    const midY = row.y + air + row.h / 2;
    for (let i = 0; i < STARS; i++) {
      const at = ARRIVES.stars + i * STAR_EVERY;
      const k = clamp01((t - at) / POP);
      if (k <= 0) continue;
      const sx = left + i * (STAR_W + STAR_SPACE) * u;
      const box = STAR_W * u;
      const midX = row.x + sx + box / 2;
      // Its own shine, turning behind it, a little larger as it lands.
      const flare = 1 + 0.8 * (1 - clamp01((t - at) / 0.9));
      if (smallRays) {
        const fan = box * grade.starFan * easeOut(k) * flare;
        c.save();
        c.translate(midX, midY);
        c.rotate((t * Math.PI * 2) / (9 + i) * (i % 2 ? -1 : 1));
        c.drawImage(smallRays, -fan / 2, -fan / 2, fan, fan);
        c.restore();
      }
      popped(c, row, k, midX, midY, () => {
        c.drawImage(row.canvas, sx, 0, box, row.canvas.height, row.x + sx, row.y, box, row.canvas.height);
      });
    }
    sweep(c, row, t, ARRIVES.stars + STARS * STAR_EVERY + 0.5);
    // A glint on one star, then the next.
    const cycle = Math.floor(t / 1.1) % STARS;
    const phase = (t % 1.1) / 1.1;
    if (grade.starFan && t > ARRIVES.stars + STARS * STAR_EVERY) {
      c.fillStyle = '#fff6d8';
      const gx = row.x + left + cycle * (STAR_W + STAR_SPACE) * u + STAR_W * u * 0.72;
      spark(c, gx, midY - STAR_W * u * 0.28, STAR_W * u * 0.32 * Math.sin(phase * Math.PI));
    }
  }

  function drawRows(c, t) {
    for (const row of rows) {
      const w = row.canvas.width, h = row.canvas.height;
      if (row.key === 'head') { c.drawImage(row.canvas, row.x, row.y); continue; }
      const at = ARRIVES[row.key] ?? 1.2;
      if (row.key === 'stars') { drawStars(c, row, t); continue; }
      const k = clamp01((t - at) / POP);
      if (k <= 0) continue;
      if (row.key === 'horizon') {
        // The bars stand up together; the hearts over them come last, being
        // the top of what rises.
        const reveal = easeOut(clamp01((t - at) / 0.9));
        c.save();
        c.beginPath();
        c.rect(row.x, row.y + h * (1 - reveal), w, h * reveal);
        c.clip();
        c.drawImage(row.canvas, row.x, row.y);
        c.restore();
        sweep(c, row, t, at + 1.3);
        continue;
      }
      const midX = row.x + w / 2, midY = row.y + h / 2;
      if (row.key === 'marks' && smallRays) {
        const fan = row.unit * 150 * easeOut(k);
        c.save();
        c.translate(midX, midY);
        c.rotate((t * Math.PI * 2) / 14);
        c.drawImage(smallRays, -fan / 2, -fan / 2, fan, fan);
        c.restore();
      }
      popped(c, row, k, midX, midY, () => c.drawImage(row.canvas, row.x, row.y));
      if (row.key === 'title') sweep(c, row, t, at + 2.6);
      if (row.key === 'marks') sweep(c, row, t, at + 1.4);
    }
  }

  const lit = document.createElement('canvas');
  let t = 0;
  return {
    step(dt) { t += dt; },
    paint(c) {
      c.drawImage(under, 0, 0);
      const grow = easeOut(Math.min(1, t / 0.9));
      if (rays) {
        c.save();
        c.translate(cx, cy);
        c.scale(grow, grow);
        c.save();
        c.rotate((t * Math.PI * 2) / 26);
        c.drawImage(rays, -rays.width / 2, -rays.height / 2);
        c.restore();
        if (grade.twin) {
          c.rotate((-t * Math.PI * 2) / 40);
          c.drawImage(rays, -rays.width / 2, -rays.height / 2);
        }
        c.restore();
      }
      // A Masterpiece's ring, thrown out as it lands.
      if (grade.ring && t > 1.1 && t < 2.1) {
        const k = (t - 1.1) / 1;
        c.strokeStyle = '#ffffff';
        c.lineWidth = size * 0.03 * (1 - k);
        c.beginPath();
        c.arc(cx, cy, size * (0.45 + easeOut(k) * 0.9), 0, Math.PI * 2);
        c.stroke();
      }
      c.fillStyle = grade.spark || '#fff';
      for (const s of sparks) {
        const r = s.s * Math.sin((((t + s.at) % 2.4) / 2.4) * Math.PI) * 1.5;
        if (r > 0.2) spark(c, s.x, s.y, r);
      }
      const rise = Math.min(1, t / 1.4);
      const scale = (0.25 + 0.75 * easeBack(rise)) * 0.92;
      const lift = (1 - easeBack(rise)) * size * 0.46 + (t > 1.4 ? Math.sin((t - 1.4) * (Math.PI / 2)) * size * 0.022 : 0);
      c.fillStyle = 'rgba(0,0,0,0.2)';
      c.beginPath();
      c.ellipse(cx, cy + lift + (size * scale) / 2 + size * 0.01, size * scale * (0.3 + 0.2 * Math.abs(Math.cos((t * Math.PI * 2) / 12))), size * 0.012, 0, 0, Math.PI * 2);
      c.fill();
      const angle = (t * Math.PI * 2) / 12;
      let face = square, back = mirrored;
      if (grade.sheen && t > 1.6) {
        // Light crossing the album itself, on whichever face is showing.
        const local = ((t - 1.6) % 3.2) / 1.1;
        if (local < 1) {
          const showing = Math.cos(angle) >= 0 ? square : mirrored;
          const w = showing.width;
          if (lit.width !== w) { lit.width = w; lit.height = w; }
          const l = lit.getContext('2d');
          l.globalCompositeOperation = 'source-over';
          l.drawImage(showing, 0, 0);
          const mid = -w * 0.3 + local * w * 1.6;
          const g = l.createLinearGradient(mid - w * 0.2, 0, mid + w * 0.2, w * 0.25);
          g.addColorStop(0, 'rgba(255,240,190,0)');
          g.addColorStop(0.5, 'rgba(255,240,190,0.7)');
          g.addColorStop(1, 'rgba(255,240,190,0)');
          l.fillStyle = g;
          l.fillRect(0, 0, w, w);
          face = lit; back = lit;
        }
      }
      drawTurned(c, face, back, cx, cy + lift, size * scale, angle, size * 0.06 * scale);
      drawRows(c, t);
    },
  };
}
