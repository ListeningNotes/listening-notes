// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/JournalPlate.js
// The journal, cut as a printing plate — and the room it is printed in.
//
// The second thing the share printer prints (the record is EntryPlate.js).
// The card and the wall of records are the same plate at different volumes
// (the printer brief, 2026-10-29), so it is one plate with a dial rather
// than two plates:
//
//   Half — a band of records above, the card below on paper. Type never
//     touches the records, and the portrait sits on the seam in a ring of
//     the paper.
//   Most — the records fill the frame and the card is a label stuck onto
//     them, the way a sleeve carries a sticker.
//   All — the records are the whole frame; the only thing over them is a
//     signature at the foot: the face and the name.
//
// The dial turns with a tap on the records (Miyel's pick, 2026-10-30). It
// falls back on its own: a stop that needs more records than the journal has
// to fill it without repeating one is skipped, and a journal that cannot fill
// even Half's band prints on paper alone — framed, nothing moving, which is
// the card somebody who just started will share. Not a fourth stop nobody
// has to choose.
//
// What the card half carries is what the card carries: the name as the card
// prints it, the card's own counts (albums, songs, masterpieces, formative —
// a zero left off, a hidden row left hidden), and one of the keeper's
// prompts, the card's own if they chose it. The portrait is a portrait: no
// code on anything digital (DECISIONS: the printer brief). Nothing written
// about a record travels, and no address is printed — Save puts the
// journal's address on the clipboard for the link sticker.
//
// The preview on screen IS the plate, drawn at the paper's full size and
// shown smaller, so the picture saved is the picture approved. The record's
// print is a mode of its page with a screen twin; a journal has no page that
// shape, and the moving grounds to come draw into a canvas anyway.

'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { FRAMES, FRAME_ORDER, loadMark, loadPicture, MARK_ASPECT, drawTracked, wrapLines, ellipsize, roundRect } from './SharePrinter';
import { INKS } from './EntryPlate';
import PrintBar from './Slug_Page/PrintBar';
import { useBookplate } from './Bookplate';
import { usePress, readFamilies } from '../../hooks/usePress';
import { readBioAnswers, CARD_PROMPT } from '../../library/bioprompt';
import { monthPlate } from './MonthPlate';
import { gatherAlbums } from './Journal';

// ── The dial ───────────────────────────────────────────────────────────────
export const STOPS = [
  { key: 'half', label: 'Half' },
  { key: 'most', label: 'Most' },
  { key: 'all', label: 'All' },
];
const GROUNDS = [
  { key: 'day', label: 'Day' },
  { key: 'night', label: 'Night' },
];
const TAGLINE = 'A listening journal';

// ── Measurements, in units of a 340-wide column — the card's own ──────────
const COL = 340;
const NAME = 26, NAME_LEAD = 26 * 1.18;
const TAG = 9;
const FACT_N = 22, FACT_WORD = 8;
const OPENING = 9, ANSWER = 14, ANSWER_LEAD = 14 * 1.4;
const MARK_H = 26;
const RING = 5;                        // the paper's ring round the face
const PORTRAIT = { half: 104, most: 78, paper: 118, all: 62 };
const WALL = '#141414';                // between the sleeves
const BAND = 0.4;                      // Half: how much of a tall paper is records
const MOST_AT = 0.62;                  // Most: where the label's middle sits

// ── The wall ───────────────────────────────────────────────────────────────
// Columns of sleeves, each column started at its own height so the rows do
// not line up — a wall, not a grid. Laid out before anything is drawn so a
// stop knows how many records it needs.
function wallTiles(x, y, w, h, frameH) {
  const cols = Math.max(3, Math.round(w / (frameH * 0.3)));
  const gap = w * 0.014;
  const s = (w - gap * (cols - 1)) / cols;
  const tiles = [];
  for (let c = 0; c < cols; c++) {
    let top = y - s * ((c * 0.38) % 1);
    while (top < y + h) {
      tiles.push({ x: x + c * (s + gap), y: top, s });
      top += s + gap;
    }
  }
  return tiles;
}

function drawWall(c, rect, tiles, covers) {
  c.save();
  c.beginPath();
  c.rect(rect.x, rect.y, rect.w, rect.h);
  c.clip();
  c.fillStyle = WALL;
  c.fillRect(rect.x, rect.y, rect.w, rect.h);
  tiles.forEach((t, i) => {
    const img = covers[i];
    if (!img?.naturalWidth) return;
    const k = Math.max(t.s / img.naturalWidth, t.s / img.naturalHeight);
    c.save();
    roundRect(c, t.x, t.y, t.s, t.s, t.s * 0.035);
    c.clip();
    c.drawImage(img, t.x - (img.naturalWidth * k - t.s) / 2, t.y - (img.naturalHeight * k - t.s) / 2, img.naturalWidth * k, img.naturalHeight * k);
    c.restore();
  });
  c.restore();
}

// The face, in a ring of the paper. object-position as the card has it.
export function drawPortrait(c, img, cx, cy, d, ring, paper, position) {
  c.save();
  c.fillStyle = paper;
  c.beginPath();
  c.arc(cx, cy, d / 2 + ring, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(cx, cy, d / 2, 0, Math.PI * 2);
  c.clip();
  c.fillStyle = '#8a7a6a';
  c.fillRect(cx - d / 2, cy - d / 2, d, d);
  if (img?.naturalWidth) {
    const k = Math.max(d / img.naturalWidth, d / img.naturalHeight);
    const dw = img.naturalWidth * k, dh = img.naturalHeight * k;
    const [px, py] = String(position || '50% 50%').split(/\s+/).map(v => (parseFloat(v) || 50) / 100);
    c.drawImage(img, cx - d / 2 + (d - dw) * px, cy - d / 2 + (d - dh) * py, dw, dh);
  }
  c.restore();
}

// ── The plate ──────────────────────────────────────────────────────────────

export function journalPlate({ name, portrait, position, counts, prompt, covers }) {
  const coverList = covers.slice(0, 60);

  // The stops this paper can print with these records: a stop is offered
  // only when its wall fills without a sleeve twice.
  function stopsFor(frame, art) {
    const have = (art?.covers || []).filter(Boolean).length;
    const lay = layout(frame);
    return STOPS.filter(s => wallTiles(...lay[s.key].wallArgs).length <= have).map(s => s.key);
  }
  function stopFor(frame, art, wanted) {
    const can = stopsFor(frame, art);
    if (can.includes(wanted)) return wanted;
    return can.includes('half') ? 'half' : can[0] || 'paper';
  }

  // Where each stop puts its wall and its card, in the paper's pixels.
  function layout(frame) {
    const W = frame.w, H = frame.h;
    const spread = W / H > 1.3;
    const pad = Math.min(W, H) * 0.07;
    const full = [0, 0, W, H, H];
    if (spread) {
      const bandW = W * 0.45;
      return {
        half: { wallArgs: [0, 0, bandW, H, H], wall: { x: 0, y: 0, w: bandW, h: H } },
        most: { wallArgs: full, wall: { x: 0, y: 0, w: W, h: H } },
        all: { wallArgs: full, wall: { x: 0, y: 0, w: W, h: H } },
        spread, pad, bandW,
      };
    }
    const bandH = H * (W / H > 0.9 ? 0.36 : BAND);
    return {
      half: { wallArgs: [0, 0, W, bandH, H], wall: { x: 0, y: 0, w: W, h: bandH } },
      most: { wallArgs: full, wall: { x: 0, y: 0, w: W, h: H } },
      all: { wallArgs: full, wall: { x: 0, y: 0, w: W, h: H } },
      spread, pad, bandH,
    };
  }

  return {
    title: 'Your journal',
    fileName: 'journal',
    stopsFor,
    stopFor,

    async load({ isDark }) {
      const [mark, face, ...sleeves] = await Promise.all([
        loadMark(isDark ? INKS.night.ink : INKS.day.ink),
        loadPicture(portrait),
        ...coverList.map(loadPicture),
      ]);
      return { mark, face, covers: sleeves.filter(Boolean) };
    },

    draw(ctx, frame, { art, shown, isDark, families }) {
      const ink = isDark ? INKS.night : INKS.day;
      const { sans, mono } = families;
      const W = frame.w, H = frame.h;
      const lay = layout(frame);
      const stop = stopFor(frame, art, shown?.stop);
      const sleeves = art?.covers || [];
      const U = Math.min(W, H) / COL;

      ctx.textBaseline = 'top';
      ctx.fillStyle = ink.paper;
      ctx.fillRect(0, 0, W, H);

      // ── the card's rows, measured then laid down in a box ────────────────
      // Every row is centred in the column it is given; the whole stack comes
      // down in size if it would overrun its box, as the record's card does.
      function stack(box, rowsAt) {
        let unit = U * Math.min(1, box.w / (COL * U));
        let built = rowsAt(unit);
        let h = built.reduce((sum, r) => sum + r.gap + r.h, 0);
        if (h > box.h) {
          unit *= box.h / h;
          built = rowsAt(unit);
          h = built.reduce((sum, r) => sum + r.gap + r.h, 0);
        }
        return { rows: built, h, unit };
      }
      function setDown(rows, x, y, w) {
        let at = y;
        for (const row of rows) {
          at += row.gap;
          row.draw(ctx, x, at, w);
          at += row.h;
        }
      }

      const rowsFor = (parts, colour = ink) => unit => {
        const px = n => n * unit;
        const colW = Math.min(px(COL) * 0.92, px(COL));
        const rows = [];
        const add = (gap, row) => rows.push({ ...row, gap: rows.length ? px(gap) : 0 });
        for (const part of parts) {
          if (part === 'mark' && art?.mark) {
            add(14, {
              h: px(MARK_H),
              draw(c, x, y, w) { const mw = px(MARK_H) * MARK_ASPECT; c.drawImage(art.mark, x + (w - mw) / 2, y, mw, px(MARK_H)); },
            });
          } else if (part.portrait) {
            const d = px(part.portrait);
            add(16, { h: d + px(RING) * 2, draw(c, x, y, w) { drawPortrait(c, art?.face, x + w / 2, y + px(RING) + d / 2, d, px(RING), ink.paper, position); } });
          } else if (part === 'name' && name) {
            ctx.font = `700 ${px(NAME)}px ${sans}`;
            const lines = wrapLines(ctx, name, colW, 2);
            add(14, {
              h: lines.length * px(NAME_LEAD),
              draw(c, x, y, w) {
                c.font = `700 ${px(NAME)}px ${sans}`;
                c.fillStyle = colour.ink;
                c.textAlign = 'center';
                lines.forEach((l, i) => c.fillText(l, x + w / 2, y + i * px(NAME_LEAD) + (px(NAME_LEAD) - px(NAME)) / 2));
                c.textAlign = 'left';
              },
            });
          } else if (part === 'tag') {
            add(6, {
              h: px(TAG) * 1.4,
              draw(c, x, y, w) { c.font = `400 ${px(TAG)}px ${mono}`; c.fillStyle = colour.soft; drawTracked(c, TAGLINE.toUpperCase(), x + w / 2, y, px(TAG) * 0.16, 'center'); },
            });
          } else if (part === 'rule') {
            add(16, { h: Math.max(1, unit * 0.8), draw(c, x, y, w) { c.fillStyle = colour.rule; c.fillRect(x + (w - colW) / 2, y, colW, Math.max(1, unit * 0.8)); } });
          } else if (part === 'facts' && counts.length) {
            add(16, {
              h: px(FACT_N) * 1.2 + px(6) + px(FACT_WORD) * 1.4,
              draw(c, x, y, w) {
                const cell = colW / counts.length;
                const left = x + (w - colW) / 2;
                counts.forEach((f, i) => {
                  const mid = left + cell * (i + 0.5);
                  c.font = `700 ${px(FACT_N)}px ${sans}`;
                  c.fillStyle = colour.ink;
                  c.textAlign = 'center';
                  c.fillText(f.n.toLocaleString(), mid, y);
                  c.textAlign = 'left';
                  c.font = `400 ${px(FACT_WORD)}px ${mono}`;
                  c.fillStyle = colour.soft;
                  drawTracked(c, f.word.toUpperCase(), mid, y + px(FACT_N) * 1.2 + px(6), px(FACT_WORD) * 0.14, 'center');
                  if (i > 0) {
                    c.fillStyle = colour.rule;
                    c.fillRect(left + cell * i, y + px(4), Math.max(1, unit * 0.8), px(FACT_N) * 1.2 + px(FACT_WORD));
                  }
                });
              },
            });
          } else if (part === 'prompt' && prompt) {
            ctx.font = `400 ${px(OPENING)}px ${mono}`;
            const opening = wrapLines(ctx, prompt.text.toUpperCase(), colW * 0.86, 2);
            ctx.font = `400 ${px(ANSWER)}px ${sans}`;
            const answer = wrapLines(ctx, prompt.answer, colW, 3);
            const openLead = px(OPENING) * 1.5;
            add(18, {
              h: opening.length * openLead + px(6) + answer.length * px(ANSWER_LEAD),
              draw(c, x, y, w) {
                c.font = `400 ${px(OPENING)}px ${mono}`;
                c.fillStyle = colour.soft;
                opening.forEach((l, i) => drawTracked(c, l, x + w / 2, y + i * openLead, px(OPENING) * 0.14, 'center'));
                const top = y + opening.length * openLead + px(6);
                c.font = `400 ${px(ANSWER)}px ${sans}`;
                c.fillStyle = colour.ink;
                c.textAlign = 'center';
                answer.forEach((l, i) => c.fillText(l, x + w / 2, top + i * px(ANSWER_LEAD) + (px(ANSWER_LEAD) - px(ANSWER)) / 2));
                c.textAlign = 'left';
              },
            });
          }
        }
        return rows;
      };

      const pad = lay.pad;

      if (stop === 'paper') {
        // Paper alone, done properly: a hairline frame inset from the edge,
        // the mark at the head, the face, and the card under it.
        const inset = pad * 0.6;
        ctx.strokeStyle = ink.rule;
        ctx.lineWidth = Math.max(1, U * 0.8);
        roundRect(ctx, inset, inset, W - inset * 2, H - inset * 2, U * 10);
        ctx.stroke();
        const box = { x: pad * 1.4, y: pad * 1.4, w: W - pad * 2.8, h: H - pad * 2.8 };
        const parts = lay.spread
          ? ['mark', { portrait: PORTRAIT.paper * 0.8 }, 'name', 'facts', 'prompt']
          : ['mark', 'tag', { portrait: PORTRAIT.paper }, 'name', 'rule', 'facts', 'rule', 'prompt'];
        const s = stack(box, rowsFor(parts));
        setDown(s.rows, box.x, box.y + (box.h - s.h) / 2, box.w);
        return [];
      }

      drawWall(ctx, lay[stop].wall, wallTiles(...lay[stop].wallArgs), sleeves);

      if (stop === 'half') {
        if (lay.spread) {
          const box = { x: lay.bandW + pad, y: pad, w: W - lay.bandW - pad * 2, h: H - pad * 2 };
          const s = stack(box, rowsFor([{ portrait: PORTRAIT.half * 0.8 }, 'name', 'facts', 'prompt', 'mark']));
          setDown(s.rows, box.x, box.y + (box.h - s.h) / 2, box.w);
          return [];
        }
        // The face on the seam, the card under it on the paper.
        const d = PORTRAIT.half * U;
        drawPortrait(ctx, art?.face, W / 2, lay.bandH, d, RING * U, ink.paper, position);
        // The mark sits at the foot, and the card keeps clear of it: on a
        // square the two met (2026-10-30).
        const mh = MARK_H * U * 0.8;
        const top = lay.bandH + d / 2 + RING * U + 12 * U;
        const box = { x: pad, y: top, w: W - pad * 2, h: H - top - pad - (art?.mark ? mh + 14 * U : 0) };
        const s = stack(box, rowsFor(['name', 'facts', 'prompt']));
        setDown(s.rows, box.x, box.y + Math.max(0, (box.h - s.h) / 2), box.w);
        if (art?.mark) {
          const mw = mh * MARK_ASPECT;
          ctx.drawImage(art.mark, (W - mw) / 2, H - pad - mh, mw, mh);
        }
        return [];
      }

      if (stop === 'most') {
        // The card as a label stuck onto the wall: paper, rounded, lifted,
        // the face on its top edge.
        const labelW = lay.spread ? W * 0.44 : W - pad * 2;
        const inner = labelW * 0.88;
        const d = PORTRAIT.most * U * (lay.spread ? 0.8 : 1);
        const s = stack({ x: 0, y: 0, w: inner, h: H * (lay.spread ? 0.62 : 0.5) }, rowsFor(['name', 'tag', 'rule', 'facts', 'rule', 'prompt']));
        const labelH = d / 2 + 14 * U + s.h + 22 * U;
        const lx = lay.spread ? W - pad - labelW : pad;
        const ly = Math.min(H - pad - labelH, Math.max(pad + d / 2, H * (lay.spread ? 0.55 : MOST_AT) - labelH / 2));
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 40 * U;
        ctx.shadowOffsetY = 12 * U;
        ctx.fillStyle = ink.paper;
        roundRect(ctx, lx, ly, labelW, labelH, 16 * U);
        ctx.fill();
        ctx.restore();
        drawPortrait(ctx, art?.face, lx + labelW / 2, ly, d, RING * U, ink.paper, position);
        setDown(s.rows, lx + (labelW - inner) / 2, ly + d / 2 + 14 * U, inner);
        return [];
      }

      // All: a shade at the foot for the signature, and nothing else over
      // the records.
      const shadeH = H * (lay.spread ? 0.45 : 0.28);
      const g = ctx.createLinearGradient(0, H - shadeH, 0, H);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.72)');
      ctx.fillStyle = g;
      ctx.fillRect(0, H - shadeH, W, shadeH);
      const d = PORTRAIT.all * U;
      const foot = H - pad;
      drawPortrait(ctx, art?.face, W - pad - d / 2 - RING * U, foot - d / 2 - RING * U, d, RING * U * 0.6, 'rgba(255,255,255,0.85)', position);
      const textW = W - pad * 2 - d - RING * U * 2 - 16 * U;
      ctx.font = `400 ${TAG * U}px ${mono}`;
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      drawTracked(ctx, TAGLINE.toUpperCase(), pad, foot - TAG * U * 1.2, TAG * U * 0.16, 'left');
      ctx.font = `700 ${NAME * U}px ${sans}`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(ellipsize(ctx, name || '', textW), pad, foot - TAG * U * 1.2 - 8 * U - NAME * U * 1.1);
      return [];
    },
  };
}

// ── The room ───────────────────────────────────────────────────────────────
// /printer, for the keeper: the paper in the middle, the print bar under it,
// and over the paper a line of words choosing what is printed — the journal,
// or one of its months (MonthPlate.js), newest first, only months a record
// came in (Miyel's pick, 2026-11-02).

// The journal's months, the way the wall's By month draws them: a record
// belongs to the month it came into the journal, its covers in the wall's
// order, and its marks the ones given that month to the record itself — a
// favourite track is not a favourite record.
function monthsOf(entries) {
  const thisYear = new Date().getFullYear();
  const keyOf = when => `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}`;
  const byKey = new Map();
  const albums = gatherAlbums(entries)
    .sort((a, b) => new Date(b.first.posted_at) - new Date(a.first.posted_at));
  for (const album of albums) {
    const when = new Date(album.first.posted_at);
    if (Number.isNaN(when.getTime())) continue;
    const key = keyOf(when);
    if (!byKey.has(key)) {
      byKey.set(key, {
        key,
        label: when.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        short: when.getFullYear() === thisYear
          ? when.toLocaleDateString('en-US', { month: 'long' })
          : when.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        records: [],
      });
    }
    const given = album.all.filter(e => !e.song && keyOf(new Date(e.posted_at)) === key);
    byKey.get(key).records.push({
      art: album.face.album_art,
      marks: {
        masterpieces: given.some(e => e.masterpiece === true || e.rating === 'Masterpiece'),
        favorites: given.some(e => e.favorite === true || e.favorite === 'true'),
        formative: given.some(e => e.formative === true || e.formative === 'true'),
      },
    });
  }
  return [...byKey.values()];
}

const STORE = 'ln-printing-journal';
const noSubscription = () => () => {};

export default function JournalPrinter({ layered = false }) {
  const router = useRouter();
  const settings = useBookplate();
  const [choices, setChoices] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(STORE) || '{}') || {}; } catch { return {}; }
  });
  useEffect(() => {
    try { sessionStorage.setItem(STORE, JSON.stringify(choices)); } catch { /* private mode */ }
  }, [choices]);
  const wanted = STOPS.some(s => s.key === choices.stop) ? choices.stop : 'half';
  const ground = GROUNDS.some(g => g.key === choices.ground) ? choices.ground : 'day';
  const size = FRAME_ORDER.includes(choices.size) ? choices.size : 'story';
  const frame = FRAMES[size];
  const isDark = ground === 'night';

  // What the card prints, read the way the card reads it.
  const [stamps, setStamps] = useState(null);
  const [entries, setEntries] = useState(null);
  // The journal's address, for the clipboard on Save: where this page is.
  const address = useSyncExternalStore(noSubscription, () => window.location.origin, () => '');
  const inBrowser = useSyncExternalStore(noSubscription, () => true, () => false);
  useEffect(() => {
    let live = true;
    fetch('/api/public/stamps').then(r => r.json()).then(s => { if (live) setStamps(s); }).catch(() => { if (live) setStamps({}); });
    fetch('/api/entries').then(r => r.json()).then(d => {
      if (live) setEntries(Array.isArray(d?.entries) ? d.entries : []);
    }).catch(() => { if (live) setEntries([]); });
    return () => { live = false; };
  }, []);

  const name = (settings?.display_name || settings?.keeper_name || '').trim();
  const counts = useMemo(() => {
    if (!stamps) return [];
    const hidden = Array.isArray(settings?.hidden_fields) ? settings.hidden_fields : [];
    if (hidden.includes('albums')) return [];
    return [
      { word: 'albums', n: stamps.records ?? 0, always: true },
      { word: 'songs', n: stamps.songs ?? 0 },
      { word: 'masterpieces', n: stamps.masterpieces ?? 0 },
      { word: 'formative', n: stamps.formative ?? 0 },
    ].filter(f => f.always || f.n > 0);
  }, [stamps, settings?.hidden_fields]);
  const prompt = useMemo(() => {
    const answers = readBioAnswers(settings?.bioanswers);
    return answers.find(a => a.key === CARD_PROMPT) || answers[0] || null;
  }, [settings?.bioanswers]);

  const covers = useMemo(() => {
    if (!entries) return null;
    const seen = new Set();
    return entries.map(e => e.album_art).filter(src => src && !seen.has(src) && seen.add(src));
  }, [entries]);
  const months = useMemo(() => (entries ? monthsOf(entries) : []), [entries]);
  const month = months.find(m => m.key === choices.subject) || null;

  const plate = useMemo(() => {
    if (!covers) return null;
    const keeper = { name, portrait: settings?.portrait_url, position: settings?.portrait_position };
    if (month) return monthPlate({ ...keeper, month, records: month.records });
    return journalPlate({ ...keeper, counts, prompt, covers });
  }, [covers, month, name, settings?.portrait_url, settings?.portrait_position, counts, prompt]);

  const [art, setArt] = useState(null);
  useEffect(() => {
    if (!plate) return undefined;
    let live = true;
    plate.load({ isDark }).then(a => { if (live) setArt(a); });
    return () => { live = false; };
  }, [plate, isDark]);

  // A month has no dial yet; its moving look comes with the grounds.
  const stop = month ? null : plate?.stopFor && art ? plate.stopFor(frame, art, wanted) : wanted;
  const shown = useMemo(() => ({ stop }), [stop]);
  const fonts = useMemo(() => ({ sans: '.jp-face-sans', mono: '.jp-face-mono' }), []);
  const press = usePress({ plate: plate || { load: async () => null, draw() {} }, shown, ground, isDark, link: address, fonts });

  // The preview: the plate itself at the paper's size, shown smaller.
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !plate || !art) return;
    canvas.width = frame.w;
    canvas.height = frame.h;
    plate.draw(canvas.getContext('2d'), frame, { art, shown, isDark, families: readFamilies(fonts), ground });
  }, [plate, art, frame, shown, isDark, ground, fonts]);

  const [learned, setLearned] = useState(false);
  const turnDial = useCallback(() => {
    if (!plate?.stopsFor || !art) return;
    const can = plate.stopsFor(frame, art);
    if (can.length < 2) return;
    setLearned(true);
    const next = can[(can.indexOf(stop) + 1) % can.length];
    setChoices(c => ({ ...c, stop: next }));
  }, [plate, art, frame, stop]);

  const done = () => { if (layered) router.back(); else router.push('/'); };
  const stopLabel = STOPS.find(s => s.key === stop)?.label;
  const groundLabel = GROUNDS.find(g => g.key === ground)?.label;
  const canTurn = Boolean(plate?.stopsFor && art && plate.stopsFor(frame, art).length > 1);
  const hint = canTurn && !learned ? 'Tap the records to turn the dial.' : '';

  // Drawn in the browser only: the choices live in this tab's storage and
  // the bar is portalled onto the body, neither of which the server has.
  if (!inBrowser) return <div className="jp-room" />;
  return (
    <div className={'jp-room' + (isDark ? ' jp-room--night' : '')}>
      {/* The faces the canvas draws in, worn by something so they can be read. */}
      <span className="jp-face-sans" aria-hidden="true" />
      <span className="jp-face-mono" aria-hidden="true" />
      {months.length > 0 && (
        <nav className="jp-subjects" aria-label="What to print">
          {[{ key: 'journal', short: 'Journal' }, ...months].map(m => {
            const on = (month?.key || 'journal') === m.key;
            return (
              <button
                key={m.key}
                type="button"
                className={'jp-subject' + (on ? ' jp-subject--on' : '')}
                aria-pressed={on}
                onClick={() => setChoices(c => ({ ...c, subject: m.key }))}
              >
                {m.short}
              </button>
            );
          })}
        </nav>
      )}
      <div className="jp-paper">
        {press.picture ? (
          <img className="jp-out" src={press.picture} alt="Your print" onClick={press.dismissPicture} />
        ) : (
          <canvas
            ref={canvasRef}
            className={'jp-canvas' + (art ? '' : ' jp-canvas--waiting')}
            width={frame.w}
            height={frame.h}
            onClick={turnDial}
            role="img"
            aria-label={month ? month.label : `Your journal, ${stop === 'paper' ? 'on paper' : stopLabel}`}
          />
        )}
      </div>
      {press.picture ? (
        <PrintBar final status={press.status} onBack={press.dismissPicture} onDeliver={press.deliver} canDeliver={press.canDeliver} />
      ) : (
        <PrintBar
          grounds={GROUNDS}
          ground={ground}
          onGround={key => setChoices(c => ({ ...c, ground: key }))}
          look={month || stop === 'paper' ? groundLabel : `${stopLabel} · ${groundLabel}`}
          size={size}
          onSize={key => setChoices(c => ({ ...c, size: key }))}
          onSave={() => press.save(size)}
          onDone={done}
          status={press.status || hint}
        />
      )}
    </div>
  );
}
