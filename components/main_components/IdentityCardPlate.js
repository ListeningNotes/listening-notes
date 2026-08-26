'use client';

// components/main_components/IdentityCardPlate.js
// The identity card, cut as a printing plate.
//
// IdentityCard.js is the card you can press. This is the same card as a thing
// that can be pressed ONTO something — handed to SharePrinter.js, which owns
// the paper sizes, the finished looks you turn through, and the two buttons at
// the bottom. The division is worth stating: the printer knows nothing about
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
// ── What a print carries ──────────────────────────────────────────────────
//
//   the mark, large, at the head. the name. how many albums and how long.
//   the square — the photograph, or the code. and at most two rows: what the
//   journal plays, and what its keeper is asking to be sent.
//
// It is shorter than the card on purpose. The card is read; a print is
// glanced at from somebody else's grid, and a paragraph of bio on it is a
// paragraph nobody standing in a Story reads. So the bio does not travel.
//
// Neither does the row of buttons at the foot: "Send an album" is an action,
// and a printed action is a shape. Nor the address, which used to print small
// underneath — the code IS the address, and printing both is saying the same
// thing twice in two alphabets.
//
// Everything except the mark, the name and the square can be switched off from
// the printer, because which of these facts a person wants to publish is
// theirs to decide print by print.

import { loadMark, loadPicture, MARK_ASPECT, drawTracked, ellipsize, wrapLines, roundRect } from './SharePrinter';

// ── The card's own measurements ────────────────────────────────────────────
// Every number below is the number in IdentityCard.js's stylesheet, and the
// whole layout is those numbers multiplied by one unit. That is what keeps a
// print recognisable as the card rather than as a poster about it: change the
// leading on the card and change this, or the two drift apart.
const COL = 340;        // .idc max-width
const MEASURE = 300;    // .idc-line max-width
const LABEL_COL = 84;   // .idc-line-label width
const LABEL_GAP = 9;    // .idc-line gap
const SLOT = 180;       // .idc-portrait — the beacon's album frame, to the pixel
const SLOT_RADIUS = 18;

// The one measurement that is NOT the card's. On the card the mark is 28px in
// a corner, deliberately small: you are already here, and it only has to say
// where "here" is. A print arrives somewhere else with nothing around it, so
// the mark stops being a colophon and becomes the masthead — it is the first
// thing that has to be read, before the name, because the name means nothing
// until you know what kind of thing it is on.
const MARK_H = 56;

const NAME = 36, NAME_LEAD = 36 * 1.1;
const META = 12, META_LEAD = 12 * 1.5;
const LINE = 13, LINE_LEAD = 13 * 1.6;
const LABEL = 8.5;

// A label and the answer beside it are baseline-aligned on the card
// (align-items: baseline). Canvas draws from the top of a line box, so the
// smaller of the two has to be nudged down by the difference in their ascents.
// Three quarters of the point size is close enough for two faces at 13 and 8.5.
const ASCENT = 0.75;

// The code's own file is 41 modules across and only 33 of those are code — the
// rest is the quiet zone, which is empty and has to stay that way. Drawing it
// at this much oversize makes the CODE fill the square rather than the file,
// so it takes the photograph's place exactly, and the quiet zone hangs off the
// edges onto the paper. Which is what the card does, and why the code on a
// print has no plate under it and no frame around it.
const CODE_BLEED = 41 / 33;

// ── Ink ────────────────────────────────────────────────────────────────────
// globals.css, stated rather than read. A print is the same colour wherever it
// is made: the choice is which of the printer's looks you turned to, not
// whatever the machine that opened it thinks the time is.
const INKS = {
  day: {
    ink: '#1a1a1a', soft: '#6b6b6b', faint: '#a8a8a8',
    warm: '#efebe2', rule: 'rgba(26,26,26,0.15)',
    // Over a screensaver. The wash is the paper's own colour rather than a
    // white — a white veil over the site's green-grey turns the print into a
    // different product.
    veil: 'rgba(238,240,236,0.30)',
    // Nearly solid, and it has to be. The card's own stock is what the code
    // is transparent ONTO — light modules are simply holes, and whatever is
    // behind them is what a camera reads as "light". At 0.88 the record
    // spines came through at about eight percent, which on a shelf running
    // from near-black to near-white is enough to drop a light module under
    // the threshold in patches, and the code stopped decoding at every size.
    // Verified rather than reasoned: 0.96 leaves a whisper of the wallpaper
    // in the stock and reads at a fifth scale.
    panel: 'rgba(238,240,236,0.96)',
    panelEdge: 'rgba(255,255,255,0.70)',
  },
  night: {
    ink: '#e8e4dc', soft: '#888888', faint: '#666666',
    warm: '#161616', rule: 'rgba(232,228,220,0.16)',
    veil: 'rgba(14,14,14,0.34)',
    panel: 'rgba(14,14,14,0.96)',
    panelEdge: 'rgba(255,255,255,0.12)',
  },
};

// The one colour that is not theme-aware, and must not be. A camera looks for
// dark on light; inverting a code for a dark print asks every scanner in the
// world to be one of the ones that cope. On a light print the code needs no
// stock at all — the page is already the paper. On a dark one it brings its
// own, and that is the whole of the difference.
const CODE_STOCK = '#f5f4ef';

// How much of the paper the card is allowed — and it depends on whether
// anything is behind it, which is the one place this layout is not fixed.
//
// On plain paper there is no scrim, so the card can run wide and the blank
// margin is just margin. Put a screensaver behind it and the scrim is the card
// PLUS its padding: at four fifths that covers nine tenths of the sheet, and
// the wallpaper becomes a border round the outside of a white box, which is
// not what anybody picked a wallpaper for. So it pulls in to make room for the
// thing it is standing on.
const FILL_BARE = 0.82;
const FILL_OVER = 0.72;
const FILL_H = 0.80;

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
//   { gap, h, draw(ctx, x, y, w) }
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
    keeper_name, portrait_url, portrait_position, portrait_code_url, send_me, hidden_fields,
  } = settings || {};

  const hidden = Array.isArray(hidden_fields) ? hidden_fields : [];
  const records = stamps?.records ?? null;
  const genres = Array.isArray(stamps?.genres) ? stamps.genres : [];

  // A code is only possible if the journal has an address to encode.
  const hasCode = Boolean(address && (portrait_code_url || code));
  // …and the photograph is only a choice if there is one. With no portrait the
  // square holds the code and the toggle would be a switch with one position.
  const canTurn = hasCode && Boolean(portrait_url);

  // What the printer offers, and what each one starts as. The counted rows
  // start wherever the card has them: somebody who took "39 albums logged" off
  // their card did not mean "except on posters".
  const toggles = [];
  if (canTurn) {
    // The code leads when it was built out of the photograph, because then it
    // is both at once — a face you can point a camera at — which is the whole
    // reason that object exists. A plain code is a worse picture of a person
    // than a picture of them, so where that is the choice, the face leads.
    toggles.push({ key: 'code', label: 'Code', on: Boolean(portrait_code_url) });
  }
  if (records != null) toggles.push({ key: 'albums', label: 'Albums', on: !hidden.includes('albums') });
  if (since)           toggles.push({ key: 'since',  label: 'Since',  on: !hidden.includes('since') });
  if (genres.length)   toggles.push({ key: 'genres', label: 'Genres', on: !hidden.includes('genres') });
  if (send_me)         toggles.push({ key: 'ask',    label: 'Looking for', on: true });

  const wantsCode = shown => (canTurn ? Boolean(shown?.code) : hasCode);

  const nameForFile = (keeper_name || address || 'card')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  return {
    title: 'The card',
    fileName: nameForFile || 'card',
    toggles,

    // Two pictures at most: the mark, and whichever face the square is
    // wearing. Both may come back null and the plate draws on without them.
    async load({ isDark, shown }) {
      const showingCode = wantsCode(shown);
      const face = showingCode
        ? (portrait_code_url || null)     // the plain code is drawn, not fetched
        : (portrait_url || null);
      const [mark, slot] = await Promise.all([
        loadMark(isDark ? INKS.night.ink : INKS.day.ink),
        loadPicture(face),
      ]);
      return { mark, slot, showingCode };
    },

    draw(ctx, frame, { art, shown, isDark, families, backdrop }) {
      const ink = isDark ? INKS.night : INKS.day;
      const sans = families.sans;
      const mono = families.mono;
      // Which face is in hand, not which face has been asked for. Between a
      // press on Code and the picture arriving the two disagree — and drawing
      // to the request would put the photograph where the code goes.
      const showingCode = art ? art.showingCode : wantsCode(shown);
      const on = key => (shown ? shown[key] !== false : true);

      // Wide paper cannot hold a tall column without the column becoming a
      // strip down the middle of an empty field, so the card opens out: the
      // square to one side, everything written to the other. Same lines, same
      // order, the fold moved — which is as far as a fixed layout bends.
      const spread = frame.w / frame.h > 1.3;

      // ── measure, then fit ────────────────────────────────────────────────
      // Width decides the unit; if the result is too tall for the paper the
      // unit comes down by exactly the overrun. Line counts cannot change when
      // it does — the type and the measure it wraps to are both this unit — so
      // one correction is always enough.
      // The code is wider than the square it stands in by its quiet zone, and
      // opened out that overhang is the left edge of the whole print — it hung
      // off the side of the card entirely until the column was widened to hold
      // it. In a column it has three quarters of an inch of card either side
      // and nothing to fall off.
      const bleed = showingCode ? CODE_BLEED : 1;
      const slotCol = SLOT * bleed;
      const refW = spread ? slotCol + 28 + MEASURE : COL;
      const fillW = backdrop ? FILL_OVER : FILL_BARE;
      let U = (frame.w * fillW) / refW;
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
        // In a column the writing keeps its own measure inside a wider card, so
        // it is inset by half the difference; opened out, the text column IS
        // the measure and there is nothing to inset by.
        const inset = spread ? 0 : (px(COL) - px(MEASURE)) / 2;

        // the mark, as the masthead
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
            gap: px(22),
            lines: wrapLines(ctx, keeper_name, textW, 3),
            size: px(NAME), lead: px(NAME_LEAD), colour: ink.ink,
            font: `700 ${px(NAME)}px ${sans}`, align, inset: 0,
          }));
        }

        // how many, and how long
        const counted = [];
        if (records != null && on('albums')) counted.push(`${records} albums logged`);
        if (since && on('since')) counted.push(`Logging since ${since}`);
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
        //
        // Showing the code, the box is bigger than the square by the quiet
        // zone bleeding off it — and that has to be MEASURED, not just drawn,
        // or the margin a scanner needs eats the air above and below and the
        // code sits jammed against the line either side of it. The air is then
        // taken back out of the gap, so what you see between the writing and
        // the first dark module is the same 22 either way.
        if (!spread) {
          const box = px(SLOT) * (showingCode ? CODE_BLEED : 1);
          rows.push({
            gap: Math.max(px(4), px(22) - (box - px(SLOT)) / 2),
            h: box,
            draw: (c, x, y, w) => drawSlot(
              c, x + (w - px(SLOT)) / 2, y + (box - px(SLOT)) / 2, px(SLOT), unit),
          });
        }

        // the two rows — a label in a fixed column and the answer beside it,
        // so the pair reads as one small table rather than two stray lines.
        const table = [];
        if (genres.length && on('genres')) table.push(['Top genres', genres.join(' · ')]);
        if (send_me && on('ask')) table.push(['Looking for', send_me]);
        table.forEach(([label, value], index) => {
          ctx.font = `400 ${px(LINE)}px ${sans}`;
          const valueW = measureW - px(LABEL_COL) - px(LABEL_GAP);
          const lines = wrapLines(ctx, value, valueW, 0);
          rows.push({
            // The first of them clears the square — less the quiet zone, for
            // the reason above. The second only clears the first, and giving
            // both the same air left the pair floating.
            gap: index === 0
              ? Math.max(px(4), px(22) - (px(SLOT) * ((showingCode ? CODE_BLEED : 1) - 1)) / 2)
              : px(14),
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
        });

        // Opened out, the square is beside the writing rather than in it, so
        // the block is as tall as the taller of the two — measuring only the
        // writing would let a short card overrun the paper by a square.
        const stack = rows.reduce((sum, row) => sum + row.gap + row.h, 0);
        const h = spread ? Math.max(stack, px(slotCol)) : stack;
        return { rows, h, unit, cardW: spread ? px(refW) : px(COL) };
      }

      // ── the square ───────────────────────────────────────────────────────
      function drawSlot(c, x, y, size, unit) {
        const radius = SLOT_RADIUS * unit;

        if (showingCode) {
          // No stock, no frame, no rounded clip — the same object the card
          // shows. The photograph fills the dark modules and the paper shows
          // through everything else, so the ragged silhouette IS the picture,
          // and a radius here would take a bite out of the quiet zone.
          //
          // The one exception is a dark print, where "the paper shows through"
          // means dark modules on a dark page and no camera can find the
          // polarity. There the code brings its own light stock — see
          // CODE_STOCK — and it is the only thing on a night print that does
          // not turn dark with the rest of it.
          const bled = size * CODE_BLEED;
          const bx = x - (bled - size) / 2;
          const by = y - (bled - size) / 2;

          if (isDark) {
            // Exactly the bled box and not a pixel more. It overhung by three
            // per cent to begin with, which put the bottom edge of a bright
            // white square through the first line of the table underneath it.
            // No extra is needed: the quiet zone is already a tenth of this
            // box on every side, and a radius this small bites less than half
            // of that at the corner.
            c.fillStyle = CODE_STOCK;
            roundRect(c, bx, by, bled, bled, 8 * unit);
            c.fill();
          }

          if (art?.slot) {
            // The portrait made into the code. Drawn with hard pixels, because
            // the modules have to stay square at any size — resampled, the
            // edges soften and a scanner starts guessing.
            c.imageSmoothingEnabled = false;
            c.drawImage(art.slot, bx, by, bled, bled);
            c.imageSmoothingEnabled = true;
          } else if (code) {
            // The plain one, drawn from the matrix the card already built.
            // Whole cells with no inset and no radius: neighbouring modules
            // meet and read as one block, which is what a scanner looks at.
            const cell = size / code.size;
            c.save();
            c.translate(x, y);
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
      const blockW = spread ? cardW : Math.min(cardW, frame.w * (backdrop ? FILL_OVER : FILL_BARE));
      const slotSize = SLOT * U;
      const blockH = h;
      const originX = (frame.w - blockW) / 2;
      const originY = (frame.h - blockH) / 2;

      // The scrim. Only when something is moving: on plain paper the card sits
      // on the page exactly as it does on the site, and a panel drawn there
      // would be a box around a thing that has never had one.
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
        const col = slotCol * U;
        drawSlot(ctx, originX + (col - slotSize) / 2, originY + (blockH - slotSize) / 2, slotSize, U);
        let y = originY;
        const textX = originX + col + 28 * U;
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
// inside its frame. Anything unreadable is centred, which is the browser's own
// answer and the one the card falls back to.
function readPosition(value) {
  const found = String(value || '').match(/-?[\d.]+/g);
  if (!found || found.length < 2) return [50, 50];
  const clamp = n => Math.min(100, Math.max(0, Number(n)));
  return [clamp(found[0]), clamp(found[1])];
}
