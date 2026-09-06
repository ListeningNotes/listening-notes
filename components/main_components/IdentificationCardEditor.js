// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';

// components/main_components/IdentificationCardEditor.js
// What it takes to fill the card in, without the card going anywhere.
//
// The journal's own details have lived in a database column since the settings
// table was built, and the only way to change one was to open a SQL editor —
// fine for the person who wrote the schema, no use at all to anyone handed a
// copy of this software.
//
// This file is behaviour, not a screen. An earlier version was a form that
// took the card's place while you worked, and swapping the thing you are
// editing for a picture of a form is the oldest way to lose someone: you stop
// looking at your card and start filling in a questionnaire about it. So there
// is no editor component. The card renders its own rows either way, and this
// hands it the draft, the handlers and the state to render them as fields.
//
// The gate here is only the visible one. Nothing in this file is trusted:
// /api/settings and /api/portrait both check the wristband on the server, and
// none of this renders for a reader, so the markup a visitor receives does not
// contain it.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BIO_LIMIT, readBioAnswers } from '../../library/bioprompt';

// The counted rows: hideable, never writable. A journal that can be told how
// many records it has is a journal whose numbers mean nothing.
export const HIDEABLE = ['since', 'albums', 'genres'];

// How large a portrait is worth keeping. The card draws it at about 240px on
// the widest screen it has, so 900 is already twice what any display needs and
// leaves room for a dense one. Straight off a camera the same picture is
// several thousand pixels across and a few megabytes; shrinking it here is
// what makes keeping the bytes in the journal's own database reasonable.
const PORTRAIT_MAX = 900;
const PORTRAIT_QUALITY = 0.85;

// Read a chosen file, shrink it, hand back base64 and a type.
//
// createImageBitmap is the direct route and copes with what a modern phone
// hands over, including the HEIC an iPhone camera produces. Where it is
// missing or refuses the format, an <img> and an object URL get there too — a
// browser that can show a picture can draw it into a canvas.
export async function shrink(file) {
  let source;
  try {
    source = await createImageBitmap(file);
  } catch {
    source = await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('unreadable')); };
      img.src = url;
    });
  }

  const w0 = source.width || source.naturalWidth;
  const h0 = source.height || source.naturalHeight;
  const scale = Math.min(1, PORTRAIT_MAX / Math.max(w0, h0));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w0 * scale);
  canvas.height = Math.round(h0 * scale);
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close?.();

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', PORTRAIT_QUALITY));
  if (!blob) throw new Error('unreadable');

  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    // A data URL is "data:image/jpeg;base64,…" and only the tail is wanted.
    reader.onload = () => resolve({ data: String(reader.result).split(',')[1], mime: 'image/jpeg' });
    reader.onerror = () => reject(new Error('unreadable'));
    reader.readAsDataURL(blob);
  });
}

// ── Holding the page still while a field is open ────────────────────────
// iOS Safari zooms the whole page in whenever you focus a field whose text is
// under 16px. globals.css answers that by forcing every field on a phone up to
// 16px, which is the right answer for a form and the wrong one for this card:
// the card's writing is smaller than that, so the fields grew, the name shrank,
// and the whole thing resized itself around whatever you were typing into.
//
// The other way to stop the zoom is to tell the page it may not scale. Done
// site-wide that is an accessibility regression — somebody who needs to pinch
// in can no longer do it anywhere. Done for the length of one edit, by the one
// person who keeps the journal, it costs nothing and buys the card its own type
// sizes back.
//
// Whatever Next rendered into the tag is kept and put back, rather than a
// hardcoded string that would quietly drop viewport-fit and unpad the notch.
let parkedViewport = null;

function holdZoom(hold) {
  const meta = document.querySelector('meta[name="viewport"]');
  if (!meta) return;
  if (hold) {
    if (parkedViewport === null) parkedViewport = meta.getAttribute('content') || '';
    meta.setAttribute('content', `${parkedViewport}, maximum-scale=1`);
  } else if (parkedViewport !== null) {
    meta.setAttribute('content', parkedViewport);
  }
}

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
const CODE_BUILD = 3;

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

// A blank row to type into. Never saved — see save().
const BLANK = '';

// Three at most, and the cap is the design rather than a guard. Somewhere to be
// found is not somewhere to list every account anybody has ever opened: a row
// of three marks reads at a glance and a row of nine reads as a footer. The
// About pane slices to the same number, so a list already longer than this —
// written before the cap — still prints three.
export const LINK_LIMIT = 3;

// Three empty openings, unchosen and unanswered.
function blankBio() {
  return Array.from({ length: BIO_LIMIT }, () => ({ key: '', answer: '' }));
}

export function useIdentificationCardEditor(settings) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [trouble, setTrouble] = useState(null);

  const [name, setName] = useState('');
  // Where in the picture to look, as two percentages. Held apart rather than
  // as the CSS string so the drag can do arithmetic on it without parsing.
  const [posX, setPosX] = useState(50);
  const [posY, setPosY] = useState(50);
  const [portrait, setPortrait] = useState('');
  // Each link is an address and the mark it wears. The mark is usually 'auto',
  // which means the hostname decides — see identify() in IdentityCard.
  const [links, setLinks] = useState([{ url: BLANK, icon: 'auto' }]);
  // Three slots, always three, whether or not they are filled. A list that
  // grows as you answer makes "how many am I supposed to write" a question the
  // interface asks instead of answers; three empty lines say it outright.
  const [bio, setBio] = useState(() => blankBio());
  const [rig, setRig] = useState('');
  // The setup, as rows. Blank rows are kept while typing and dropped on save,
  // the same as the links.
  const [gear, setGear] = useState([]);
  // The address the stored code was built for, so a save that changes nothing
  // else does not rebuild it.
  const lastCodeUrl = useRef((settings.site_address || '').replace(/^https?:\/\//, '')
    ? `https://${(settings.site_address || '').replace(/^https?:\/\//, '')}`
    : '');
  const [hidden, setHidden] = useState(() => new Set());
  // Which record the card holds up, as its id. It is a settings column like
  // every other field in this hook, and it is edited here for that reason —
  // it used to be pinned from the entry itself, which put an admin control in
  // the middle of somebody's reading and meant changing your pin started by
  // opening an editor for an album you were not thinking about.
  //
  // null is a real value here: it is the pin cleared.
  const [pin, setPin] = useState(null);

  // Opening takes a copy. Everything typed after this point is a draft, and
  // Cancel is simply never committing it — no undo stack, no diffing, and the
  // card behind the fields is still showing what a visitor currently sees.
  const begin = useCallback(() => {
    // Same rule as the paragraph below: seed from whatever the card is
    // showing, not from whichever column it came out of. The card prints
    // display_name when there is one, so opening the editor on keeper_name
    // would show a name the visitor cannot see, and saving would change a
    // name that is not the one on screen.
    setName(settings.display_name || settings.keeper_name || '');
    const [x, y] = String(settings.portrait_position || '50% 50%').split(/\s+/);
    setPosX(Number.parseFloat(x) || 50);
    setPosY(Number.parseFloat(y) || 50);
    setPortrait(settings.portrait_url || '');
    const stored = Array.isArray(settings.social_links) ? settings.social_links : [];
    const all = stored
      // Plain strings from before marks could be chosen, objects since.
      .map(entry => (typeof entry === 'string' ? { url: entry, icon: 'auto' } : { url: entry?.url || '', icon: entry?.icon || 'auto' }))
      .filter(l => l.url.trim());
    const seen = new Set();
    const unique = all.filter(l => !seen.has(l.url) && seen.add(l.url));
    setLinks(unique.length ? unique : [{ url: BLANK, icon: 'auto' }]);
    // Whatever is stored, padded back out to three. A keeper who answered one
    // opening and comes back to add another should find two empty lines
    // waiting rather than a button to make one.
    const answered = readBioAnswers(settings.bioanswers).map(row => ({ key: row.key, answer: row.answer }));
    setBio([...answered, ...blankBio()].slice(0, BIO_LIMIT));
    setRig(settings.rig_icon || '');
    const rows = Array.isArray(settings.rig) ? settings.rig : [];
    setGear(rows.length
      ? rows.map(r => ({ name: r?.name || '', role: r?.role || '' }))
      : [{ name: '', role: '' }]);
    setHidden(new Set(Array.isArray(settings.hidden_fields) ? settings.hidden_fields : []));
    setPin(settings.pinned_entry_id ?? null);
    setTrouble(null);
    holdZoom(true);
    setEditing(true);
  }, [settings]);

  const cancel = useCallback(() => {
    holdZoom(false);
    setEditing(false);
    setTrouble(null);
  }, []);

  // Whatever happens — a flip away mid-sentence, a navigation, a reload — the
  // page gets its zoom back. A viewport left locked because a component went
  // away is a bug somebody would never trace to this file.
  useEffect(() => () => holdZoom(false), []);

  const setLink = useCallback((index, value) => {
    setLinks(rows => rows.map((row, i) => (i === index ? { ...row, url: value } : row)));
  }, []);
  const setLinkIcon = useCallback((index, icon) => {
    setLinks(rows => rows.map((row, i) => (i === index ? { ...row, icon } : row)));
  }, []);
  // One opening cannot be chosen twice, so picking one that is already in
  // another slot swaps the two rather than refusing. Refusing would mean
  // clearing the other slot first to make a move the keeper has already
  // described.
  const setBioKey = useCallback((index, key) => {
    setBio(rows => rows.map((row, i) => {
      if (i === index) return { ...row, key };
      if (key && row.key === key) return { ...row, key: rows[index].key };
      return row;
    }));
  }, []);
  const setBioAnswer = useCallback((index, answer) => {
    setBio(rows => rows.map((row, i) => (i === index ? { ...row, answer } : row)));
  }, []);

  const addLink = useCallback(
    () => setLinks(rows => (rows.length >= LINK_LIMIT ? rows : [...rows, { url: BLANK, icon: 'auto' }])),
    [],
  );
  const dropLink = useCallback(index => {
    setLinks(rows => (rows.length === 1 ? [{ url: BLANK, icon: 'auto' }] : rows.filter((_, i) => i !== index)));
  }, []);

  const setGearField = useCallback((index, field, value) => {
    setGear(rows => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }, []);
  const addGear = useCallback(() => setGear(rows => [...rows, { name: '', role: '' }]), []);
  const dropGear = useCallback(index => {
    setGear(rows => (rows.length === 1 ? [{ name: '', role: '' }] : rows.filter((_, i) => i !== index)));
  }, []);

  const toggleHidden = useCallback(key => {
    setHidden(current => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  // The picture goes up on its own rather than riding along with Save. It is
  // the one field that takes a moment and can fail on its own terms, and
  // burying that inside a form submit means a spinner over the whole card and
  // no way to say which part of it went wrong.
  const choosePhoto = useCallback(async event => {
    const file = event.target.files?.[0];
    event.target.value = '';   // so choosing the same file twice still fires
    if (!file) return;
    setBusy(true);
    setTrouble(null);
    try {
      const body = await shrink(file);
      const res = await fetch('/api/portrait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const answer = await res.json();
      if (!res.ok) throw new Error(answer.error || 'That did not upload.');
      setPortrait(answer.portrait_url);
      // A new picture starts centred. Carrying the last one's framing over
      // would apply someone's careful crop of a different photograph.
      setPosX(50);
      setPosY(50);
    } catch (error) {
      setTrouble(error.message === 'unreadable'
        ? 'That file could not be read as a picture.'
        : error.message);
    }
    setBusy(false);
  }, []);

  const removePhoto = useCallback(async () => {
    setBusy(true);
    setTrouble(null);
    try {
      await fetch('/api/portrait', { method: 'DELETE' });
      setPortrait('');
    } catch {
      setTrouble('That did not come off.');
    }
    setBusy(false);
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setTrouble(null);

    // The code is made out of the photograph and the address, so it is rebuilt
    // when either moves and left alone otherwise. It is not cheap — a decode
    // per floor until one reads — and neither of those two changes often.
    const address = (settings.site_address || '').replace(/^https?:\/\//, '');
    const url = address ? `https://${address}` : '';
    const framing = `${posX.toFixed(1)}% ${posY.toFixed(1)}%`;
    const portraitMoved = portrait.trim() !== (settings.portrait_url || '')
      || framing !== (settings.portrait_position || '50.0% 50.0%');
    // The stored picture was drawn by an older version of the drawing.
    const staleBuild = !String(settings.portrait_code_url || '').includes(`b=${CODE_BUILD}`);
    const addressMoved = url !== lastCodeUrl.current;
    let codePatch = {};
    if (portrait.trim() && url && (portraitMoved || addressMoved || staleBuild)) {
      const built = await buildPortraitCode(url, portrait.trim(), `${posX}% ${posY}%`);
      codePatch = built
        ? { portrait_code: built.data, portrait_code_url: `/api/portrait?of=code&b=${CODE_BUILD}&v=${Date.now()}` }
        // Nothing in range carried it. Clear rather than keep a stale picture
        // of the last photograph, and the card falls back to the plain code.
        : { portrait_code: '', portrait_code_url: '' };
      lastCodeUrl.current = url;
    } else if (!portrait.trim()) {
      codePatch = { portrait_code: '', portrait_code_url: '' };
    }
    // Blank means blank. An empty field is the owner clearing a detail, not
    // leaving it alone, so it is sent rather than skipped — the settings writer
    // turns an empty string into null on the way in.
    const cleaned = links
      .map(l => ({ url: l.url.trim(), icon: l.icon || 'auto' }))
      .filter(l => l.url);
    // A piece of equipment with no name is a blank row somebody started and
    // left; a name with no role is still worth printing.
    const gearClean = gear
      .map(g => ({ name: g.name.trim(), role: g.role.trim() }))
      .filter(g => g.name);
    const bioClean = bio
      .map(row => ({ key: row.key, answer: (row.answer || '').trim() }))
      .filter(row => row.key && row.answer);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Written back to the column it was read from. keeper_name is the
          // plain name a machine reads — the tab, the home-screen label, the
          // feed — and once somebody has an ornamented display_name, this
          // field is editing that one, so overwriting keeper_name here would
          // quietly put kaomoji into a feed reader's subscription list.
          //
          // Which leaves keeper_name editable only where it is first set. That
          // is the same shape as founded_at and serial, and it wants the same
          // thing the rest of them want: the welcome screen, which does not
          // exist yet.
          ...(settings.display_name
            ? { display_name: name.trim() }
            : { keeper_name: name.trim() }),
          portrait_position: portrait.trim() ? `${posX.toFixed(1)}% ${posY.toFixed(1)}%` : '',
          portrait_url: portrait.trim(),
          social_links: cleaned.length ? cleaned : null,
          rig_icon: rig,
          rig: gearClean.length ? gearClean : null,
          // Only slots that got both halves. An opening chosen and left
          // unanswered is a slot somebody opened and thought better of, and it
          // would print as a question with nothing after the dash.
          bioanswers: bioClean.length ? bioClean : null,
          ...codePatch,
          hidden_fields: hidden.size ? [...hidden] : null,
          // Sent every time, including as null. Unpinning is a thing somebody
          // does on purpose, and a field that is only written when it has a
          // value cannot express it.
          pinned_entry_id: pin ?? null,
        }),
      });
      if (!res.ok) throw new Error('That didn’t save. Try again.');
      // The card reads its details from the root layout, which is a server
      // component — so the new values arrive by asking the server to render
      // again, not by pushing them into a context from here.
      router.refresh();
      holdZoom(false);
      setEditing(false);
    } catch (error) {
      setTrouble(error.message);
    }
    setSaving(false);
  }, [name, bio, posX, posY, portrait, links, hidden, rig, gear, pin, settings, router]);

  return {
    editing, begin, cancel, save, saving, busy, trouble,
    name, setName,
        posX, posY, setPosX, setPosY,
    position: `${posX}% ${posY}%`,
    portrait,
    links, setLink, setLinkIcon, addLink, dropLink, atLinkLimit: links.length >= LINK_LIMIT,
    bio, setBioKey, setBioAnswer,
    rig, setRig,
    gear, setGearField, addGear, dropGear,
    hidden, toggleHidden,
    pin, setPin,
    choosePhoto, removePhoto,
  };
}
