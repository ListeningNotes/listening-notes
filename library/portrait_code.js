// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/portrait_code.js
// The portrait, made into the journal's code — the QR on the card whose dark
// modules are the photograph. Lifted out of IdentificationCardEditor.js, which
// only needs to ask for one and keep the answer; everything about how the
// picture is cut, floored, capped and checked against both page colours is
// here. Browser only: it draws on a canvas and reads the result back.


// ── The portrait, made into the code ────────────────────────────────────
// The photograph fills the dark modules and everything else is transparent, so
// the page shows through and the ragged silhouette of the code is the picture.
// No plate, no frame, no rounded clip.
//
// Polarity is the whole thing and it is the dark modules that must carry the
// photograph. Dark modules are scattered and isolated, which gives discrete
// pixels of photo; the light ones form large connected regions and read as a
// photograph with holes punched through it.
//
// The picture is squeezed into a band rather than only lifted off the bottom.
//
// The floor is what the brief called for: every channel raised to at least
// FLOOR so no part of the picture is ever as dark as the page it sits on. That
// makes one file work on both themes — right way round on a light page,
// inverted on a dark one, which phone cameras handle.
//
// The ceiling was not in the brief and this is why it is here. A floor lifts
// the shadows and does nothing to the highlights, so a photograph shot against
// a bright sky has "dark" modules at 250 sitting on a page at 238 — brighter
// than the background they are supposed to read against. Polarity breaks in
// patches and no floor fixes it, because the floor is at the wrong end. The
// first portrait this was tried on failed the light page at every floor from
// 100 to 200 and passed the dark page at all of them, which is that fault
// exactly.
//
// So the search looks for the widest band that still decodes, rather than
// clamping everybody to one. A photograph that needs nothing keeps everything;
// a bright one gives up only as much of its highlights as it must. Ordered so
// that the gentlest option wins: caps descend from no cap at all, and the
// widest surviving band across all the floors is the one that ships.
const CODE_VERSION = 4;
const CODE_QUIET = 4;
const FLOORS = [100, 115, 130, 145, 160, 175, 190];
const CAPS = [255, 240, 225, 210, 195, 180, 165, 150, 135];
// Below this there is not enough range left to be a photograph.
const MIN_RANGE = 40;
// Drawn at 12 device pixels per module, which is past what any screen shows it
// at and keeps the edges of each module hard rather than resampled. The search
// runs at six, where a decode is quick and the answer is the same.
const MODULE_PX = 12;
const SEARCH_PX = 6;
// A little off the corners of every module but the three finders, which stay
// square because a scanner finds those before it reads anything.
const MODULE_RADIUS = 0;

// Bumped whenever the way this picture is drawn changes. A stored code is kept
// until the photograph or the address moves, which is right — and meant that
// rewriting the renderer changed nothing, because every journal already had a
// code and none of them had a reason to rebuild. Copies of this software get
// the better picture when they update, rather than when their owner happens to
// change their face.
export const CODE_BUILD = 3;

// The page colours the code is checked against. A picture that only decodes on
// one of them is a picture that is broken for half the people who open it.
const PAGE_LIGHT = [238, 240, 236];
const PAGE_DARK = [14, 14, 14];

// Draw the photograph at full size and cut the modules out of it.
//
// The first version sampled the picture down to one pixel per module and filled
// each module with that flat colour, which is what "resized to the module grid"
// sounds like — and a face at thirty-three pixels across is not a face. The
// reference gives it away: there is a gradient running across its finder rings,
// so the photograph in it is at full resolution and the modules are a stencil
// over it, not a mosaic of it. Every module is a whole square of real
// photograph now, and you can see who it is.
//
// The mask is drawn rather than computed, so corners can be rounded on the
// modules that may be rounded. The three finders may not: a scanner locks onto
// those before it decodes anything.
function renderCode(image, modules, mpx, floor, cap, pos, radius) {
  const size = modules.size;
  const span = size + CODE_QUIET * 2;
  const canvas = document.createElement('canvas');
  canvas.width = span * mpx;
  canvas.height = span * mpx;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  // The photograph, cover-cropped the way the card crops it, over the code's
  // own area — the quiet zone stays empty because it has to.
  const w = image.naturalWidth || image.width;
  const h = image.naturalHeight || image.height;
  const side = Math.min(w, h);
  ctx.drawImage(
    image,
    (w - side) * (pos.x / 100), (h - side) * (pos.y / 100), side, side,
    CODE_QUIET * mpx, CODE_QUIET * mpx, size * mpx, size * mpx,
  );

  // Squeezed into the band. Per pixel, not per module, and nothing between the
  // two ends is touched.
  const field = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < field.data.length; i += 4) {
    field.data[i]     = Math.min(Math.max(field.data[i], floor), cap);
    field.data[i + 1] = Math.min(Math.max(field.data[i + 1], floor), cap);
    field.data[i + 2] = Math.min(Math.max(field.data[i + 2], floor), cap);
  }
  ctx.putImageData(field, 0, 0);

  // Keep only what sits under a dark module.
  //
  // The whole stencil is drawn on its own canvas first and applied in one go.
  // destination-in composites against the entire destination, not against the
  // shape being drawn — so filling the modules one at a time straight onto the
  // picture erased everything the previous fill had kept, and what came out was
  // a single module. It decoded on neither page at any band, which is the only
  // reason it was caught.
  const inFinder = (col, row) => (
    (col < 7 && row < 7) || (col >= size - 7 && row < 7) || (col < 7 && row >= size - 7)
  );
  const stencil = document.createElement('canvas');
  stencil.width = canvas.width;
  stencil.height = canvas.height;
  const cut = stencil.getContext('2d');
  cut.fillStyle = '#000';
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!modules.data[row * size + col]) continue;
      const x = (col + CODE_QUIET) * mpx;
      const y = (row + CODE_QUIET) * mpx;
      if (radius > 0 && !inFinder(col, row)) {
        cut.beginPath();
        cut.roundRect(x, y, mpx, mpx, radius * mpx);
        cut.fill();
      } else {
        cut.fillRect(x, y, mpx, mpx);
      }
    }
  }
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(stencil, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  return canvas;
}

// Lay the picture over a page colour so it can be decoded, exactly as a screen
// would show it. Alpha is all or nothing per pixel, so this is a straight
// choice rather than a blend.
function flatten(canvas, page, scale = 1) {
  const flat = document.createElement('canvas');
  flat.width = Math.round(canvas.width * scale);
  flat.height = Math.round(canvas.height * scale);
  const ctx = flat.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = `rgb(${page[0]},${page[1]},${page[2]})`;
  ctx.fillRect(0, 0, flat.width, flat.height);
  // Nearest neighbour, because that is what image-rendering: pixelated does on
  // the page — smoothing here would flatter the code in a way a screen will not.
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(canvas, 0, 0, flat.width, flat.height);
  return flat;
}

// Build the code, prove it reads, and hand back a PNG.
//
// The proving is not optional and not by eye. Every photograph has its own
// tonal range, and some will not carry a code inside any band — so it is
// generated, composited over both page colours and decoded, here, and the one
// that ships is proved at the size it ships at rather than at the size it was
// auditioned at. If nothing carries it this returns null and the card falls
// back to the plain code, which is a worse picture and a working one.
export async function buildPortraitCode(url, portraitSrc, position = '50% 50%') {
  if (!url || !portraitSrc) return null;
  try {
    const [{ default: jsQR }, QRCode] = await Promise.all([
      import('jsqr'),
      import('qrcode'),
    ]);

    // Two decoders, and either one is enough.
    //
    // jsQR alone was the reason this feature did not work. It read the flat
    // version and refused every full-resolution one — the same pictures the
    // platform's own BarcodeDetector reads on a light page, a dark page and
    // plain white. A verifier stricter than every real scanner is not a
    // safeguard, it is a second bug: it was throwing away good codes and
    // leaving the plain one in their place.
    //
    // BarcodeDetector is what the phone itself uses, so where it exists it is
    // the closer question to ask. jsQR is carried for where it does not —
    // Safari — so an owner editing on an iPhone still gets a real check rather
    // than none.
    const detector = typeof BarcodeDetector !== 'undefined'
      ? new BarcodeDetector({ formats: ['qr_code'] })
      : null;

    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('unreadable'));
      img.src = portraitSrc;
    });

    const { modules } = QRCode.create(url, {
      errorCorrectionLevel: 'H',
      version: CODE_VERSION,
    });
    const [px, py] = String(position).split(/\s+/);
    const pos = { x: Number.parseFloat(px) || 50, y: Number.parseFloat(py) || 50 };

    // The sizes a code is asked to survive. A phone does not photograph the
    // file, it photographs a screen showing the file at some scale nobody
    // chose, and the module edges rarely land on whole pixels when it does. So
    // the band that wins has to decode at its own size and at two awkward
    // resamplings of it — otherwise the search happily picks the widest band
    // that scrapes through once, which is the one with the least margin left.
    const STRESS = [1, 0.62, 0.45];

    const readsOnce = async (canvas, page, scale) => {
      const flat = flatten(canvas, page, scale);
      if (detector) {
        try {
          const found = await detector.detect(flat);
          if (found.some(hit => hit.rawValue === url)) return true;
        } catch { /* fall through to the other one */ }
      }
      const field = flat.getContext('2d').getImageData(0, 0, flat.width, flat.height);
      const found = jsQR(field.data, field.width, field.height, {
        inversionAttempts: 'attemptBoth',
      });
      return found?.data === url;
    };

    const reads = async (canvas, page) => {
      for (const scale of STRESS) {
        if (!(await readsOnce(canvas, page, scale))) return false;
      }
      return true;
    };

    // The band is searched at a coarse size and the winner is drawn at full
    // size. Decoding a 500px picture eighty times over is a couple of seconds
    // of somebody's afternoon; at a sixth of that it is a moment, and the band
    // that works at six pixels a module works at twelve.
    let best = null;
    for (const floor of FLOORS) {
      for (const cap of CAPS) {
        if (cap - floor < MIN_RANGE) continue;
        const trial = renderCode(image, modules, SEARCH_PX, floor, cap, pos, MODULE_RADIUS);
        // Both pages, not one. The claim is that a single file works on either,
        // and the only way that claim stays true is to check it against either.
        if (!(await reads(trial, PAGE_LIGHT)) || !(await reads(trial, PAGE_DARK))) continue;
        // Caps descend, so the first that survives at this floor is the least
        // this floor can be made to give up.
        if (!best || cap - floor > best.range) best = { floor, cap, range: cap - floor };
        break;
      }
    }
    if (!best) return null;

    // Draw it properly, and prove the thing that actually ships rather than the
    // rehearsal of it.
    const canvas = renderCode(image, modules, MODULE_PX, best.floor, best.cap, pos, MODULE_RADIUS);
    if (!(await reads(canvas, PAGE_LIGHT)) || !(await reads(canvas, PAGE_DARK))) return null;

    const blob = await new Promise(done => canvas.toBlob(done, 'image/png'));
    if (!blob) return null;
    const data = await new Promise((done, fail) => {
      const reader = new FileReader();
      reader.onload = () => done(String(reader.result).split(',')[1]);
      reader.onerror = () => fail(new Error('unreadable'));
      reader.readAsDataURL(blob);
    });
    return { data, floor: best.floor, cap: best.cap };
  } catch {
    return null;
  }
}
