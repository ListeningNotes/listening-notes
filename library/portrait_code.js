// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/portrait_code.js
// The portrait, made into the journal's code — the QR on the card whose dark
// modules are the photograph — built on the server and proved by decoding
// before anything is kept. Server only: it reads pixels with sharp and asks
// OpenCV whether the result scans; nothing here touches a canvas.
//
// ── The picture ───────────────────────────────────────────────────────────
// The photograph fills the dark modules and everything else is transparent,
// so the page shows through and the ragged silhouette of the code is the
// picture. No plate, no frame, no dots, no solid corners. Polarity is the
// whole thing: dark modules are scattered and isolated, so they read as
// pixels of photograph; the light ones form regions and read as holes. One
// file serves both pages — right way round on the light one, inverted on
// the dark one, which every scanner handles.
//
// ── The search, 2026-09-11 ────────────────────────────────────────────────
// A floor first: every channel raised to at least the floor, so no part of
// the picture is ever as dark as the dark page. Swept from nothing upward,
// so the first floor that reads is the least the photograph has to give up.
// Only if no floor reads is the picture squeezed into a band, widest first:
// a floor lifts the shadows and leaves the highlights alone; a band flattens
// both ends. Seven hard photographs in the brief passed — six on a floor
// alone, one on a band — and June's and Miyel's pass here at floor 70 and
// band 60–210. Album covers are harder: 21 of the 39 on this journal pass,
// 18 fail every setting, so the plain code is not rare for covers.
//
// ── The judge ─────────────────────────────────────────────────────────────
// OpenCV's decoder, on both pages, at the size the picture ships at and at
// two shrunken copies, trying the inverted image as well because a dark page
// is an inverted code. jsQR — what the browser build used — refuses this
// style on the light page at every setting; the phone's own reader accepts
// far more than either. So "fails" means "could not be proved here", not
// "does not scan", and the reason it is judged on the server is that the
// answer is then the same whatever phone the owner holds. The old build ran
// in the owner's browser, and a copy edited from an iPhone had only jsQR to
// ask (NOTES, Gotchas).

import sharp from 'sharp';
import QRCode from 'qrcode';
import database from './database_connection.js';
import { save_settings } from './settings_actions.js';

// Bumped whenever the way this picture is drawn or judged changes. Stamped
// on the stored path, and read by nothing yet: a code that exists is left
// alone, whoever drew it, so an owner who likes theirs keeps it.
export const CODE_BUILD = 4;

const CODE_VERSION = 4;
const CODE_QUIET = 4;
// Twelve device pixels a module: past what any screen shows it at, so the
// edges of every module stay hard rather than resampled.
const MODULE_PX = 12;
// Floors 0 to 220 in steps of 10, then the bands, widest first.
const FLOORS = Array.from({ length: 23 }, (_, i) => i * 10);
const BANDS = [[60, 210], [80, 200], [90, 200], [100, 190], [110, 180], [120, 170]];
const SETTINGS = [...FLOORS.map(floor => [floor, 255]), ...BANDS];
// The sizes the picture is asked to survive: a phone photographs a screen
// showing the file at some scale nobody chose. Shrunk by averaging, the way
// a lens and a screen both do it.
const STRESS = [1, 0.62, 0.45];
const PAGES = { light: [238, 240, 236], dark: [14, 14, 14] };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function dayOf(ms) {
  const d = new Date(ms);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// OpenCV, loaded once per server and kept. The module is fourteen megabytes
// of WebAssembly and takes a moment to come up; a cold start pays that once.
//
// Required, not imported. The package hands back a promise of itself, and
// Next's loader wrapped that promise in a module namespace whose `then` was
// no longer a promise's — "Promise.prototype.then called on incompatible
// receiver" — which is how the first press through the site failed after
// passing every test in plain Node. A require from the project root gets
// the promise itself; next.config.mjs makes sure the files ship with the
// function, since a require built at run time is nothing a bundler can
// follow.
let opencv = null;
async function judge() {
  if (!opencv) {
    opencv = (async () => {
      const { createRequire } = await import('node:module');
      const need = createRequire(`${process.cwd()}/`);
      let cv = need('@techstark/opencv-js');
      if (cv instanceof Promise) cv = await cv;
      if (cv?.default) cv = cv.default;
      for (let i = 0; i < 400 && !cv.Mat; i++) await new Promise(r => setTimeout(r, 25));
      if (!cv.Mat) throw new Error('OpenCV did not initialise');
      return cv;
    })().catch(error => { opencv = null; throw error; });
  }
  return opencv;
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

// The code cut out of the photograph at one setting. RGBA; the quiet zone
// and the light modules are transparent.
function compose(photo, modules, floor, cap) {
  const size = modules.size;
  const span = size + CODE_QUIET * 2;
  const W = span * MODULE_PX;
  const codePx = size * MODULE_PX;
  const out = Buffer.alloc(W * W * 4, 0);
  for (let y = 0; y < codePx; y++) {
    for (let x = 0; x < codePx; x++) {
      const col = Math.floor(x / MODULE_PX);
      const row = Math.floor(y / MODULE_PX);
      if (!modules.data[row * size + col]) continue;
      const i = ((y + CODE_QUIET * MODULE_PX) * W + (x + CODE_QUIET * MODULE_PX)) * 4;
      const p = (y * codePx + x) * 3;
      out[i] = Math.min(Math.max(photo[p], floor), cap);
      out[i + 1] = Math.min(Math.max(photo[p + 1], floor), cap);
      out[i + 2] = Math.min(Math.max(photo[p + 2], floor), cap);
      out[i + 3] = 255;
    }
  }
  return { data: out, width: W };
}

// Lay the picture over one page and ask OpenCV at every stress size, both
// ways up. Alpha is all or nothing per pixel, so flattening is a straight
// choice.
async function reads(cv, picture, page, url) {
  const W = picture.width;
  const flat = Buffer.from(picture.data);
  for (let i = 0; i < flat.length; i += 4) {
    if (flat[i + 3] !== 0) continue;
    flat[i] = page[0]; flat[i + 1] = page[1]; flat[i + 2] = page[2]; flat[i + 3] = 255;
  }
  const detector = new cv.QRCodeDetector();
  try {
    for (const scale of STRESS) {
      const w = Math.round(W * scale);
      const buf = scale === 1
        ? flat
        : await sharp(flat, { raw: { width: W, height: W, channels: 4 } }).resize(w, w).raw().toBuffer();
      const src = cv.matFromArray(w, w, cv.CV_8UC4, buf);
      const gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      const points = new cv.Mat();
      let said = '';
      try { said = detector.detectAndDecode(gray, points); } catch { said = ''; }
      if (said !== url) {
        const inverted = new cv.Mat();
        cv.bitwise_not(gray, inverted);
        try { said = detector.detectAndDecode(inverted, points); } catch { said = ''; }
        inverted.delete();
      }
      src.delete(); gray.delete(); points.delete();
      if (said !== url) return false;
    }
    return true;
  } finally {
    detector.delete();
  }
}

async function toPng(picture) {
  const png = await sharp(picture.data, { raw: { width: picture.width, height: picture.width, channels: 4 } })
    .png()
    .toBuffer();
  return png.toString('base64');
}

// Build the code from a picture and an address, prove it, and hand back the
// PNG with the setting that carried it — or nothing, and a sentence saying
// why, in plain words for the person whose card it is.
export async function buildPortraitCode({ url, portrait, position }) {
  const began = Date.now();
  const day = dayOf(began);
  const took = () => `${((Date.now() - began) / 1000).toFixed(1)}s`;
  // `kind` says which of three things a miss was: nothing to make from,
  // a picture that could not be proved, or a fault in the press itself.
  const nothing = (kind, why) => ({ data: null, kind, report: `Not made, ${day}: ${why}` });
  if (!url) return nothing('empty', 'the journal has no address yet, so there is nothing to put in a code.');
  if (!portrait) return nothing('empty', 'there is no photo to make it from.');
  try {
    const cv = await judge();
    const { modules } = QRCode.create(url, { errorCorrectionLevel: 'H', version: CODE_VERSION });
    let photo;
    try {
      photo = await pictureSquare(portrait, position, modules.size * MODULE_PX);
    } catch {
      return nothing('unproved', 'the photo could not be opened as a picture.');
    }
    let lightRefused = 0;
    let darkRefused = 0;
    for (const [floor, cap] of SETTINGS) {
      const picture = compose(photo, modules, floor, cap);
      if (!(await reads(cv, picture, PAGES.light, url))) { lightRefused++; continue; }
      if (!(await reads(cv, picture, PAGES.dark, url))) { darkRefused++; continue; }
      const treatment = cap === 255
        ? (floor === 0 ? 'with nothing done to it' : `with its shadows lifted to ${floor}`)
        : `squeezed into the ${floor}–${cap} band`;
      return {
        data: await toPng(picture),
        kind: 'made',
        floor,
        cap,
        report: `Made, ${day}: the photo carries the code ${treatment}, and it scans on both a light and a dark `
          + `screen. (OpenCV, both ways, three sizes; ${SETTINGS.indexOf(SETTINGS.find(s => s[0] === floor && s[1] === cap)) + 1} `
          + `of ${SETTINGS.length} settings tried; ${took()})`,
      };
    }
    return nothing(
      'unproved',
      'none of the ways of lifting or squeezing the photo made a code that could be proved to scan on both '
      + 'a light and a dark screen, so the card shows the plain code instead. A photo with more contrast, or a '
      + `different crop, may work; a phone may well read what could not be proved here. (OpenCV, both ways, `
      + `three sizes; ${SETTINGS.length} settings tried, ${lightRefused} failed the light screen and `
      + `${darkRefused} the dark; ${took()})`,
    );
  } catch (error) {
    return nothing('fault', `something went wrong in the press: ${error?.message || error}.`);
  }
}

// Build from what the settings row holds and write the result back to it.
// The one way a code gets made, whoever asks: the card's editor after a
// save, setup after the photo, the card itself when the owner opens a
// journal that has a portrait and no code yet.
//
// The picture and the stamped path are written together, or cleared
// together when the photograph could not be proved or there is nothing to
// make from — the pointer and the bytes are one fact. A fault in the press
// itself writes nothing: the first press through the site failed on a
// loader error and took a good picture with it, and a code that exists is
// not the press's to lose. The setting that carried it rides on the path
// (f and c), so it can be read off any copy; nothing else is stored.
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
        portrait_code_url: `/api/portrait?of=code&b=${CODE_BUILD}&f=${built.floor}&c=${built.cap}&v=${Date.now()}`,
      }
    : { portrait_code: '', portrait_code_url: '' };
  await save_settings(patch);
  return { portrait_code_url: patch.portrait_code_url, report: built.report };
}
