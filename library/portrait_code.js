// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/portrait_code.js
// The portrait, made into the journal's code — the QR on the card whose dark
// modules are the photograph — pressed on the server and proved by decoding
// before anything is kept. Server only: it reads pixels with sharp and never
// touches a canvas.
//
// ── The picture, 2026-09-11 ───────────────────────────────────────────────
// The photograph fills the dark modules and the page shows through the light
// ones, as it always has. Three things carry the scan now, so the picture no
// longer has to:
//
//   1. A dot in the middle of every photo module, in the code's own ink.
//      A scanner samples the centre of each module, and the centre is now
//      always the right colour whatever the photograph is doing around it.
//   2. The three finder squares and the small alignment target, solid.
//      Every reader locates those before it reads anything. The target was
//      the surprise: with it solid the strictest reader passed at full
//      size, and with it photographic it failed every time.
//   3. Ink that flips with the page. A dot has to be the ink of the page it
//      sits on — black on the light page, white on the dark — so the light
//      page's file is what is stored and the dark page's is made from it on
//      request by flipping the pure ink pixels (flipInk, below). The photo
//      is banded so it never contains one.
//
// Measured before it was built, on both portraits this software has and
// every album cover on this journal: the strictest reader read all 41 at the
// smallest dot, on both pages, at three sizes, with the photograph's tones
// nearly untouched. The picture that carried the code on its own — no dots,
// finders made of face — read on a phone's own scanner and on almost nothing
// else, and half the covers on nothing at all (NOTES, Gotchas).
//
// ── Proved by decoding, always ────────────────────────────────────────────
// The picture that ships is decoded here, over both page colours, at the
// size it ships at and at two shrunken copies, by jsQR — the strictest
// reader there is, which is the point of using it as the judge: what passes
// it scans anywhere. If the smallest dot does not read, the dot grows and it
// is tried again; at a dot the size of the module there is no photograph
// left and it is the plain code, which always reads. So a build never ends
// in nothing: the picture gives ground one step at a time.

import sharp from 'sharp';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
// Where the alignment targets sit for each version — the encoder's own table,
// so the press and the code it draws over can never disagree about it.
import alignment from 'qrcode/lib/core/alignment-pattern.js';
import database from './database_connection.js';
import { save_settings } from './settings_actions.js';
import { CODE_QUIET, LEAST_VERSION } from './code_shape.js';

// Bumped whenever the way this picture is drawn or judged changes. Stamped
// on the stored path; the card re-presses a code that carries an older stamp
// the next time its owner opens the journal, so every card ends up the same.
export const CODE_BUILD = 5;

// The quiet zone and the least version are in library/code_shape.js, which
// the browser reads too.
// Twelve device pixels a module: past what any screen shows it at, so the
// edges of every module and every dot stay hard rather than resampled.
const MODULE_PX = 12;
// The photograph is kept off the two pure values the ink uses, and off the
// pages' own tones, so a module never vanishes into either page and a photo
// pixel is never mistaken for a dot when the dark page's file is made.
const PHOTO_FLOOR = 20;
const PHOTO_CAP = 235;
// The dot, as a fraction of the module's side. Tried smallest first; the
// last is the whole module, which is the plain code.
const DOTS = [
  { size: 0.3, said: 'the smallest dots' },
  { size: 0.34, said: 'small dots' },
  { size: 0.4, said: 'medium dots' },
  { size: 0.5, said: 'large dots' },
  { size: 0.6, said: 'larger dots' },
  { size: 0.75, said: 'very large dots' },
  { size: 1, said: 'no photograph left — the plain code' },
];
// The sizes a code is asked to survive. A phone photographs a screen showing
// the file at some scale nobody chose, so the picture has to read at its own
// size and shrunk. Shrunk by averaging, the way a screen and a lens both do
// it: dropping pixels would drop dots, and no camera does that.
const STRESS = [1, 0.62, 0.45];
const PAGES = { light: [238, 240, 236], dark: [14, 14, 14] };
const INK = 0;
const PAPER = 255;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function dayOf(ms) {
  const d = new Date(ms);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// The photograph, cover-cropped the way the card crops it, at the code's
// size. `position` is the card's object-position — two percentages of the
// overflow. EXIF orientation is honoured first, because the card's <img>
// honours it and the code must show the same face the right way up.
async function pictureSquare(bytes, position, px) {
  const [sx, sy] = String(position || '50% 50%').split(/\s+/);
  const pos = { x: Number.parseFloat(sx) || 50, y: Number.parseFloat(sy) || 50 };
  const oriented = await sharp(bytes).rotate().toBuffer();
  const { width, height } = await sharp(oriented).metadata();
  const side = Math.min(width, height);
  const left = Math.round((width - side) * (pos.x / 100));
  const top = Math.round((height - side) * (pos.y / 100));
  return sharp(oriented)
    .extract({ left, top, width: side, height: side })
    .resize(px, px)
    .removeAlpha()
    .raw()
    .toBuffer();
}

// The code for an address: the smallest version that holds it at level H,
// and never smaller than the least drawn.
function codeFor(url) {
  const least = QRCode.create(url, { errorCorrectionLevel: 'H' });
  if (least.version >= LEAST_VERSION) return least;
  return QRCode.create(url, { errorCorrectionLevel: 'H', version: LEAST_VERSION });
}

// The light page's picture at one dot size. RGBA; the quiet zone and the
// light modules are transparent, so the page shows through.
function compose(photo, modules, dot) {
  const size = modules.size;
  const span = size + CODE_QUIET * 2;
  const W = span * MODULE_PX;
  const codePx = size * MODULE_PX;
  const out = Buffer.alloc(W * W * 4, 0);
  const inFinder = (c, r) => (c < 7 && r < 7) || (c >= size - 7 && r < 7) || (c < 7 && r >= size - 7);
  // The alignment targets: one at version 4, centred on module 26; six from
  // version 7. Each is five modules square around its centre.
  const centres = alignment.getPositions((size - 17) / 4);
  const inAlign = (c, r) => centres.some(([a, b]) => Math.abs(c - a) <= 2 && Math.abs(r - b) <= 2);
  for (let y = 0; y < codePx; y++) {
    for (let x = 0; x < codePx; x++) {
      const col = Math.floor(x / MODULE_PX);
      const row = Math.floor(y / MODULE_PX);
      const dark = modules.data[row * size + col] === 1;
      const solid = inFinder(col, row) || inAlign(col, row);
      // A light module is a hole, unless it is part of a finder or the
      // target, where its paper is drawn so the pattern is whole.
      if (!dark && !solid) continue;
      const i = ((y + CODE_QUIET * MODULE_PX) * W + (x + CODE_QUIET * MODULE_PX)) * 4;
      const fx = ((x % MODULE_PX) + 0.5) / MODULE_PX;
      const fy = ((y % MODULE_PX) + 0.5) / MODULE_PX;
      const inDot = Math.abs(fx - 0.5) <= dot / 2 && Math.abs(fy - 0.5) <= dot / 2;
      if (solid || inDot) {
        const v = dark ? INK : PAPER;
        out[i] = v; out[i + 1] = v; out[i + 2] = v;
      } else {
        const p = (y * codePx + x) * 3;
        out[i] = Math.min(Math.max(photo[p], PHOTO_FLOOR), PHOTO_CAP);
        out[i + 1] = Math.min(Math.max(photo[p + 1], PHOTO_FLOOR), PHOTO_CAP);
        out[i + 2] = Math.min(Math.max(photo[p + 2], PHOTO_FLOOR), PHOTO_CAP);
      }
      out[i + 3] = 255;
    }
  }
  return { data: out, width: W };
}

// The dark page's picture, from the light page's: every pure ink pixel
// becomes paper and every pure paper pixel becomes ink, and nothing else
// moves. Only opaque pixels are looked at, and the photograph is banded so
// it never holds either value — which is what makes this safe to do to a
// file rather than to the buffer it was drawn in. Used at build time, so the
// dark page is proved on exactly what /api/portrait will serve.
export function flipInk(rgba) {
  const out = Buffer.from(rgba);
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] !== 255) continue;
    if (out[i] === INK && out[i + 1] === INK && out[i + 2] === INK) {
      out[i] = PAPER; out[i + 1] = PAPER; out[i + 2] = PAPER;
    } else if (out[i] === PAPER && out[i + 1] === PAPER && out[i + 2] === PAPER) {
      out[i] = INK; out[i + 1] = INK; out[i + 2] = INK;
    }
  }
  return out;
}

// The stored PNG, flipped for the dark page, as a PNG again. What
// /api/portrait?of=code&theme=dark serves.
export async function darkPageCode(pngBase64) {
  const { data, info } = await sharp(Buffer.from(pngBase64, 'base64'))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return sharp(flipInk(data), { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

// Lay a picture over its page and decode it at every stress size.
async function reads(rgba, W, page, url) {
  const flat = Buffer.from(rgba);
  for (let i = 0; i < flat.length; i += 4) {
    if (flat[i + 3] !== 0) continue;
    flat[i] = page[0]; flat[i + 1] = page[1]; flat[i + 2] = page[2]; flat[i + 3] = 255;
  }
  for (const scale of STRESS) {
    const w = Math.round(W * scale);
    const buf = scale === 1
      ? flat
      : await sharp(flat, { raw: { width: W, height: W, channels: 4 } }).resize(w, w).raw().toBuffer();
    const found = jsQR(new Uint8ClampedArray(buf.buffer, buf.byteOffset, buf.byteLength), w, w, {
      inversionAttempts: 'attemptBoth',
    });
    if (found?.data !== url) return false;
  }
  return true;
}

async function toPng(rgba, W) {
  const png = await sharp(rgba, { raw: { width: W, height: W, channels: 4 } }).png().toBuffer();
  return png.toString('base64');
}

// Build the code from a picture and an address, prove it on both pages, and
// hand back the light page's PNG with the dot that carried it — or nothing,
// and a sentence saying why, in plain words for the person whose card it is.
// `kind` says which of three things a miss was: nothing to make from, a
// picture that could not be proved, or a fault in the press itself.
//
// `dot` is a dot already proved for this picture and this address — the
// entry's cover keeps the one that carried it (library/cover_code.js) — and
// with one given the press composes at it and skips the judging, which is
// most of the cost. A stored dot is trusted only where the caller has checked
// it was proved by this build on this picture; that is the caller's job.
export async function buildPortraitCode({ url, portrait, position, dot = null }) {
  const began = Date.now();
  const day = dayOf(began);
  const took = () => `${((Date.now() - began) / 1000).toFixed(1)}s`;
  const nothing = (kind, why) => ({ data: null, kind, report: `Not made, ${day}: ${why}` });
  if (!url) return nothing('empty', 'the journal has no address yet, so there is nothing to put in a code.');
  if (!portrait) return nothing('empty', 'there is no photo to make it from.');
  try {
    const { modules } = codeFor(url);
    let photo;
    try {
      photo = await pictureSquare(portrait, position, modules.size * MODULE_PX);
    } catch {
      return nothing('unproved', 'the photo could not be opened as a picture.');
    }
    if (dot) {
      const light = compose(photo, modules, dot);
      return {
        data: await toPng(light.data, light.width),
        kind: 'made',
        dot,
        report: `Redrawn, ${day}: at the dot already proved for this picture. (${took()})`,
      };
    }
    for (const [step, dot] of DOTS.entries()) {
      const light = compose(photo, modules, dot.size);
      const dark = flipInk(light.data);
      if (!(await reads(light.data, light.width, PAGES.light, url))) continue;
      if (!(await reads(dark, light.width, PAGES.dark, url))) continue;
      const gaveGround = step === 0
        ? ''
        : ' Smaller dots did not read on this photo; more contrast, or a different crop, may keep more of it.';
      return {
        data: await toPng(light.data, light.width),
        kind: 'made',
        dot: dot.size,
        report: `Made, ${day}: the photo is in the code, with ${dot.said} carrying the scan, and it reads on both `
          + `a light and a dark screen.${gaveGround} (jsQR, three sizes; ${took()})`,
      };
    }
    // Unreachable in practice — the last step is the plain code — but a
    // build that cannot say what happened is the thing this file exists to
    // stop.
    return nothing('unproved', `nothing read, not even the plain code, which should be impossible. (${took()})`);
  } catch (error) {
    return nothing('fault', `something went wrong in the press: ${error?.message || error}.`);
  }
}

// Build from what the settings row holds and write the result back to it.
// The one way a code gets made, whoever asks: the card's editor after a
// save, setup after the photo, Settings after the address, the card itself
// when the owner opens a journal whose code is missing or was drawn by an
// older build.
//
// The picture and the stamped path are written together, or cleared
// together when the photograph could not be proved or there is nothing to
// make from — the pointer and the bytes are one fact. A fault in the press
// itself writes nothing: a code that exists is not the press's to lose. The
// dot that carried it rides on the path (d), so it can be read off any copy.
export async function pressStoredPortraitCode() {
  const [row] = await database`
    SELECT portrait_data, portrait_position, site_address FROM settings WHERE id = 1`;
  const address = (row?.site_address || '').replace(/^https?:\/\//, '');
  const built = await buildPortraitCode({
    url: address ? `https://${address}` : '',
    portrait: row?.portrait_data ? Buffer.from(row.portrait_data, 'base64') : null,
    position: row?.portrait_position,
  });
  console.info('[portrait code]', built.report);
  if (built.kind === 'fault') return { portrait_code_url: null, report: built.report };
  const patch = built.data
    ? {
        portrait_code: built.data,
        portrait_code_url: `/api/portrait?of=code&b=${CODE_BUILD}&d=${built.dot}&v=${Date.now()}`,
      }
    : { portrait_code: '', portrait_code_url: '' };
  await save_settings(patch);
  return { portrait_code_url: patch.portrait_code_url, report: built.report };
}

// Whether a stored path was stamped by this build. The layout hands the
// answer to the card, which asks for a press when it is no.
export function isCurrentCode(portraitCodeUrl) {
  return String(portraitCodeUrl || '').includes(`b=${CODE_BUILD}&`);
}
