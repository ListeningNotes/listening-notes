'use client';

// components/main_components/IdentityCardPlate.js
// The identity card, cut as a printing plate.
//
// IdentityCard.js is the card you can press. This is the same card as a thing
// that can be pressed ONTO something — handed to SharePrinter.js, which owns
// the paper sizes, what moves behind the ink, and the two buttons at the
// bottom. The division is worth stating: the printer knows nothing about
// journals, and this file knows nothing about Instagram.
//
// It is a redraw rather than a screenshot, for the same reason /dashboard/share
// redraws the archive tile: type rasterised from the DOM at three times its
// size is type photographed, and this has to survive being looked at on a
// phone at full bleed.
//
// It takes everything it needs as an argument and imports nothing from the
// card. That is not fastidiousness — the card imports this file, so a single
// import pointing back would be a cycle. Anything the card has already worked
// out (the founding month, the address, the code's matrix) arrives worked out.
//
// ── What the print carries, and what it does not ─────────────────────────
//
//   the mark, the name, the counted line, the square, the bio, the two
//   rows, and the address.
//
// The row of buttons at the foot of the real card does not travel. "Send an
// album" is an action and a printed action is a shape; the social marks are
// glyphs with no labels under them, which on screen are links you can press
// and on paper are a row of small pictures of other companies.
//
// The address DOES travel, printed small at the foot, and this is the one
// place a print departs from the card — where no URL appears as text
// anywhere. On the card that rule holds because the reader is already at the
// address. A print is the opposite object: it is the thing that leaves, it
// gets screenshotted out of a Story and forwarded with no link attached, and
// a code alone is only readable by a second phone pointed at the first.

import { loadMark, loadPicture, MARK_ASPECT, drawTracked, ellipsize, wrapLines, roundRect } from './SharePrinter';

// ── The card's own measurements ────────────────────────────────────────────
// Every number below is the number in IdentityCard.js's stylesheet, and the
// whole layout is those numbers multiplied by one unit. That is what keeps a
// print recognisable as the card rather than as a poster about it: change the
// bio's leading on the card and change this, or the two drift apart.
const COL = 340;        // .idc max-width
const MEASURE = 300;    // .idc-bio / .idc-line max-width
const LABEL_COL = 84;   // .idc-line-label width
const LABEL_GAP = 9;    // .idc-line gap
const SLOT = 180;       // .idc-portrait — the beacon's album frame, to the pixel
const SLOT_RADIUS = 18;

const MARK_H = 28;
const NAME = 36, NAME_LEAD = 36 * 1.1;
const META = 12, META_LEAD = 12 * 1.5;
const BIO = 13, BIO_LEAD = 13 * 1.7;
const LINE = 13, LINE_LEAD = 13 * 1.6;
const LABEL = 8.5;
const ADDRESS = 8.5;

// A label and the answer beside it are baseline-aligned on the card
// (align-items: baseline). Canvas draws from the top of a line box, so the
// smaller of the two has to be nudged down by the difference in their ascents.
// Three quarters of the point size is close enough for two faces at 13 and 8.5.
const ASCENT = 0.75;

// ── Ink ────────────────────────────────────────────────────────────────────
// globals.css, stated rather than read. A print is the same colour wherever it
// is made: the choice is Day or Night on the printer's own controls, not
// whatever the machine that opened it thinks the time is.
const INKS = {
  day: {
    ink: '#1a1a1a', soft: '#6b6b6b', faint: '#a8a8a8',
    warm: '#efebe2', rule: 'rgba(26,26,26,0.15)',
    // Over a screensaver. The wash is the paper's own colour rather than a
    // white — a white veil over the site's green-grey turns the print into a
    // different product.
    veil: 'rgba(238,240,236,0.30)',
    panel: 'rgba(238,240,236,0.88)',
    panelEdge: 'rgba(255,255,255,0.70)',
  },
  night: {
    ink: '#e8e4dc', soft: '#888888', faint: '#666666',
    warm: '#161616', rule: 'rgba(232,228,220,0.16)',
    veil: 'rgba(14,14,14,0.34)',
    panel: 'rgba(14,14,14,0.84)',
    panelEdge: 'rgba(255,255,255,0.12)',
  },
};

// How much of the paper the card is allowed. Wider than this and a story print
// reads as a screenshot of a website; narrower and it reads as a stamp.
//
// Set at four fifths to begin with, which was too much the moment anything was
// put behind it: the scrim is the card plus its padding, and a card at four
// fifths leaves a scrim covering nine tenths of the paper. The wallpaper was
// then a two-centimetre border round the outside of a white box, which is not
// what anybody picked a wallpaper for.
const FILL_W = 0.72;
const FILL_H = 0.78;

// The scrim, when there is something moving behind. Padding and radius in card
// units like everything else.
const PANEL_PAD = 22;
const PANEL_RADIUS = 22;

// A month and a year, never a day. The card says how long the journal has been
// kept and a precise date invites arithmetic that is not the point. UTC,
// because created_at is a naive column read through a driver that shifts it by
// the reader's own offset — a month is coarse enough that no plausible offset
// can move it, which is the whole reason to print one.
//
// It lives here rather than in IdentityCard.js only because the card imports
// this file and not the other way round. One definition either way.
export function monthAndYear(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' });
}

// ── Rows ───────────────────────────────────────────────────────────────────
// Each piece of the card measures itself and then draws itself, so the two
// passes cannot disagree about how tall anything is. A row is
//   { gap, h, draw(x, y, w) }
// where gap is the air above it, h its own height, and x/y/w the box it has
// been given. Everything is already multiplied by the unit.

function textRow({ gap, lines, size, lead, colour, font, align, inset = 0 }) {
  return {
    gap,
    h: lines.length * lead,
    draw(ctx, x, y, w) {
      ctx.font = font;
      ctx.fillStyle = colour;
      ctx.textBaseline = 'top';
      ctx.textAlign = align;
      // Sat at the top of its own leading, a line reads as if it has fallen
      // upwards out of the space it was given. Half the difference puts it
      // back in the middle of it.
      const drop = (lead - size) / 2;
      const at = align === 'center' ? x + w / 2 : x + inset;
      lines.forEach((line, i) => ctx.fillText(line, at, y + i * lead + drop));
      ctx.textAlign = 'left';
    },
  };
}

// ── The plate ──────────────────────────────────────────────────────────────

export function identityCardPlate({ settings, stamps, since, address, code }) {
  const {
    keeper_name, bio, about_intro, portrait_url, portrait_position,
    portrait_code_url, send_me, hidden_fields,
  } = settings || {};

  const hiding = Array.isArray(hidden_fields) ? hidden_fields : [];
  const showing = key => !hiding.includes(key);
  const records = stamps?.records ?? null;
  const genres = Array.isArray(stamps?.genres) ? stamps.genres : [];
  const blurb = bio || about_intro;

  // The square has two faces on the card and you tap to swap them, so the
  // printer gets the same choice rather than a rule about which one travels.
  // The code leads, because a print is a thing that has left: the face is
  // lovely and the code is the only part of it a stranger can act on. Where
  // the code was built out of the photograph it is both at once, which is the
  // whole reason that object exists.
  const hasCode = Boolean(address && (portrait_code_url || code));
  const choices = (hasCode && portrait_url)
    ? [{
        key: 'slot',
        label: 'Square',
        options: [{ value: 'code', label: 'Code' }, { value: 'photo', label: 'Photo' }],
      }]
    : [];

  const nameForFile = (keeper_name || address || 'card')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  return {
    title: 'The card',
    fileName: nameForFile || 'card',
    choices,

    // Two pictures at most: the mark, and whichever face the square is
    // wearing. Both may come back null and the plate draws on without them.
    async load({ isDark, picks }) {
      const wantsCode = hasCode && (picks?.slot ?? 'code') === 'code';
      const face = wantsCode
        ? (portrait_code_url || null)     // the plain code is drawn, not fetched
        : (portrait_url || null);
      const [mark, slot] = await Promise.all([
        loadMark(isDark ? INKS.night.ink : INKS.day.ink),
        loadPicture(face),
      ]);
      return { mark, slot, showingCode: wantsCode };
    },

    draw(ctx, frame, { art, picks, isDark, families, backdrop }) {
      const ink = isDark ? INKS.night : INKS.day;
      const sans = families.sans;
      const mono = families.mono;
      // Which face is in hand, not which face has been asked for. Between a
      // press on Code and the picture arriving, the two disagree — and drawing
      // to the request would put the photograph inside the code's stock.
      const showingCode = art
        ? art.showingCode
        : hasCode && (picks?.slot ?? 'code') === 'code';

      // Wide paper cannot hold a tall column without the column becoming a
      // strip down the middle of an empty field, so the card opens out: the
      // square to one side, everything written to the other. It is the same
      // card with the same lines in the same order — the fold moved, nothing
      // added — which is as far as "fixed layout, swappable backdrop" bends.
      const spread = frame.w / frame.h > 1.3;

      // ── measure, then fit ────────────────────────────────────────────────
      // Width decides the unit; if the result is too tall for the paper the
      // unit comes down by exactly the overrun. Line counts cannot change
      // when it does — the type and the measure it wraps to are both this
      // unit — so one correction is always enough.
      const refW = spread ? SLOT + 28 + MEASURE : COL;
      let U = (frame.w * FILL_W) / refW;
      let built = build(U);
      const roomH = frame.h * FILL_H;
      if (built.h > roomH) {
        U *= roomH / built.h;
        built = build(U);
      }

      function build(unit) {
        const px = n => n * unit;
        const rows = [];
        const align = spread ? 'left' : 'center';
        const textW = spread ? px(MEASURE) : px(COL);
        const measureW = px(MEASURE);
        // In a column the writing keeps its own measure inside a wider card,
        // so it is inset by half the difference; opened out, the text column
        // IS the measure and there is nothing to inset by.
        const inset = spread ? 0 : (px(COL) - px(MEASURE)) / 2;

        // the mark
        if (art?.mark) {
          rows.push({
            gap: 0,
            h: px(MARK_H),
            draw(c, x, y, w) {
              const mw = px(MARK_H) * MARK_ASPECT;
              c.drawImage(art.mark, align === 'center' ? x + (w - mw) / 2 : x, y, mw, px(MARK_H));
            },
          });
        }

        // the name
        if (keeper_name) {
          ctx.font = `700 ${px(NAME)}px ${sans}`;
          rows.push(textRow({
            gap: px(14),
            lines: wrapLines(ctx, keeper_name, textW, 3),
            size: px(NAME), lead: px(NAME_LEAD), colour: ink.ink,
            font: `700 ${px(NAME)}px ${sans}`, align, inset: 0,
          }));
        }

        // how many, and how long
        const counted = [];
        if (records != null && showing('albums')) counted.push(`${records} albums logged`);
        if (since && showing('since')) counted.push(`Logging since ${since}`);
        if (counted.length) {
          ctx.font = `400 ${px(META)}px ${sans}`;
          rows.push(textRow({
            gap: px(7),
            lines: [ellipsize(ctx, counted.join(' · '), textW)],
            size: px(META), lead: px(META_LEAD), colour: ink.faint,
            font: `400 ${px(META)}px ${sans}`, align, inset: 0,
          }));
        }

        // the square, when the card is a column. Opened out it is the other
        // half of the spread and is not in this stack at all.
        if (!spread) {
          rows.push({
            gap: px(20),
            h: px(SLOT),
            draw: (c, x, y, w) => drawSlot(c, x + (w - px(SLOT)) / 2, y, px(SLOT), unit),
          });
        }

        // the bio
        if (blurb) {
          ctx.font = `400 ${px(BIO)}px ${sans}`;
          rows.push(textRow({
            gap: px(20),
            lines: wrapLines(ctx, blurb, measureW, 0),
            size: px(BIO), lead: px(BIO_LEAD), colour: ink.soft,
            font: `400 ${px(BIO)}px ${sans}`, align: 'left', inset,
          }));
        }

        // the two rows — a label in a fixed column and the answer beside it,
        // so the pair reads as one small table rather than two stray lines.
        const table = [];
        if (genres.length && showing('genres')) table.push(['Top genres', genres.join(' · ')]);
        if (send_me) table.push(['Looking for', send_me]);
        for (const [label, value] of table) {
          ctx.font = `400 ${px(LINE)}px ${sans}`;
          const valueW = measureW - px(LABEL_COL) - px(LABEL_GAP);
          const lines = wrapLines(ctx, value, valueW, 0);
          rows.push({
            gap: px(16),
            h: lines.length * px(LINE_LEAD),
            draw(c, x, y) {
              const left = x + inset;
              const drop = (px(LINE_LEAD) - px(LINE)) / 2;
              c.textBaseline = 'top';
              c.textAlign = 'left';
              c.font = `400 ${px(LABEL)}px ${mono}`;
              c.fillStyle = ink.faint;
              drawTracked(c, label.toUpperCase(), left,
                y + drop + (px(LINE) - px(LABEL)) * ASCENT, px(LABEL) * 0.1);
              c.font = `400 ${px(LINE)}px ${sans}`;
              c.fillStyle = ink.ink;
              lines.forEach((line, i) =>
                c.fillText(line, left + px(LABEL_COL) + px(LABEL_GAP), y + i * px(LINE_LEAD) + drop));
            },
          });
        }

        // where this is
        if (address) {
          rows.push({
            gap: px(22),
            h: px(ADDRESS) * 1.4,
            draw(c, x, y, w) {
              c.textBaseline = 'top';
              c.font = `400 ${px(ADDRESS)}px ${mono}`;
              c.fillStyle = ink.faint;
              drawTracked(c, address.toUpperCase(),
                align === 'center' ? x + w / 2 : x, y, px(ADDRESS) * 0.14, align);
            },
          });
        }

        // Opened out, the square is beside the writing rather than in it, so
        // the block is as tall as the taller of the two — measuring only the
        // writing would let a short card overrun the paper by a square.
        const stack = rows.reduce((sum, row) => sum + row.gap + row.h, 0);
        const h = spread ? Math.max(stack, px(SLOT)) : stack;
        return { rows, h, unit, cardW: spread ? px(refW) : px(COL) };
      }

      // ── the square ───────────────────────────────────────────────────────
      function drawSlot(c, x, y, size, unit) {
        const radius = SLOT_RADIUS * unit;

        if (showingCode) {
          // Paper under the code, always, and always this colour. On the site
          // the code made out of a photograph is transparent and lets the page
          // through, which is the whole point of it — but a print may have a
          // record shelf moving behind it, and a code over a photograph has no
          // polarity for a camera to find. Fixed light stock, both inks: a
          // scanner looks for dark on light and inverting it for a dark print
          // asks every scanner in the world to be one of the ones that cope.
          c.save();
          c.shadowColor = 'rgba(0,0,0,0.16)';
          c.shadowBlur = 44 * unit;
          c.shadowOffsetY = 18 * unit;
          c.fillStyle = '#f5f4ef';
          roundRect(c, x, y, size, size, radius);
          c.fill();
          c.restore();

          if (art?.slot) {
            // The portrait made into the code. The card draws this file 41/33
            // oversize so the code itself fills the square and the quiet zone
            // hangs off the edges into page — which is fine on a page and
            // fatal on stock, where "off the edge" is whatever is moving
            // behind. Here the whole file goes on the paper, and then some:
            // inset far enough that the corner radius cannot take a bite out
            // of the margin a scanner needs to find the edges.
            const pad = size * 0.06;
            c.drawImage(art.slot, x + pad, y + pad, size - pad * 2, size - pad * 2);
          } else if (code) {
            // The plain one, drawn from the matrix the card already built.
            // Whole cells with no inset and no radius: neighbouring modules
            // meet and read as one block, which is what a scanner is looking
            // at. The quiet zone is part of the code, not padding around it.
            const span = code.size + code.quiet * 2;
            const cell = (size * 0.88) / span;
            const originX = x + (size - cell * span) / 2 + cell * code.quiet;
            const originY = y + (size - cell * span) / 2 + cell * code.quiet;
            c.save();
            c.translate(originX, originY);
            c.scale(cell, cell);
            c.fillStyle = code.ink;
            c.fill(new Path2D(code.d));
            c.restore();
          }
          return;
        }

        // the photograph
        c.save();
        c.shadowColor = 'rgba(0,0,0,0.16)';
        c.shadowBlur = 44 * unit;
        c.shadowOffsetY = 18 * unit;
        c.fillStyle = ink.warm;
        roundRect(c, x, y, size, size, radius);
        c.fill();
        c.restore();

        if (art?.slot?.naturalWidth) {
          const img = art.slot;
          // object-fit: cover with object-position, by hand. The picture is
          // scaled until its shorter side fills the box and the position runs
          // 0% to 100% across exactly the overflow that leaves — the same
          // arithmetic the card drags the photograph around with, so a face
          // framed there arrives framed here.
          const [posX, posY] = readPosition(portrait_position);
          const cover = Math.max(size / img.naturalWidth, size / img.naturalHeight);
          const drawW = img.naturalWidth * cover;
          const drawH = img.naturalHeight * cover;
          c.save();
          roundRect(c, x, y, size, size, radius);
          c.clip();
          c.drawImage(img, x - (drawW - size) * (posX / 100), y - (drawH - size) * (posY / 100), drawW, drawH);
          c.restore();
        } else {
          // No picture. Registration corners rather than a grey box — a frame
          // waiting for a photograph should look like one.
          const arm = 13 * unit, off = 10 * unit;
          c.save();
          c.strokeStyle = ink.rule;
          c.lineWidth = Math.max(1, unit);
          c.beginPath();
          c.moveTo(x + off, y + off + arm); c.lineTo(x + off, y + off); c.lineTo(x + off + arm, y + off);
          c.moveTo(x + size - off, y + size - off - arm); c.lineTo(x + size - off, y + size - off); c.lineTo(x + size - off - arm, y + size - off);
          c.stroke();
          c.restore();
        }
      }

      // ── lay it down ──────────────────────────────────────────────────────
      const { rows, h, cardW } = built;
      const blockW = spread ? cardW : Math.min(cardW, frame.w * FILL_W);
      const slotSize = SLOT * U;
      const blockH = h;
      const originX = (frame.w - blockW) / 2;
      const originY = (frame.h - blockH) / 2;

      // The scrim. Only when something is moving: on paper the card sits on
      // the page exactly as it does on the site, and a panel drawn there would
      // be a box around a thing that has never had one.
      if (backdrop) {
        ctx.fillStyle = ink.veil;
        ctx.fillRect(0, 0, frame.w, frame.h);

        const pad = PANEL_PAD * U;
        const px1 = originX - pad;
        const py1 = originY - pad;
        const pw = blockW + pad * 2;
        const ph = blockH + pad * 2;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.28)';
        ctx.shadowBlur = 30 * U;
        ctx.shadowOffsetY = 8 * U;
        ctx.fillStyle = ink.panel;
        roundRect(ctx, px1, py1, pw, ph, PANEL_RADIUS * U);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = ink.panelEdge;
        ctx.lineWidth = Math.max(1, 0.5 * U);
        roundRect(ctx, px1, py1, pw, ph, PANEL_RADIUS * U);
        ctx.stroke();
      }

      if (spread) {
        drawSlot(ctx, originX, originY + (blockH - slotSize) / 2, slotSize, U);
        let y = originY;
        const textX = originX + slotSize + 28 * U;
        for (const row of rows) {
          y += row.gap;
          row.draw(ctx, textX, y, MEASURE * U);
          y += row.h;
        }
      } else {
        let y = originY;
        for (const row of rows) {
          y += row.gap;
          row.draw(ctx, originX, y, blockW);
          y += row.h;
        }
      }
    },
  };
}

// '50% 50%' — the CSS the card stores when somebody drags the photograph
// inside its frame. Anything unreadable is centred, which is the browser's
// own answer and the one the card falls back to.
function readPosition(value) {
  const found = String(value || '').match(/-?[\d.]+/g);
  if (!found || found.length < 2) return [50, 50];
  const clamp = n => Math.min(100, Math.max(0, Number(n)));
  return [clamp(found[0]), clamp(found[1])];
}
