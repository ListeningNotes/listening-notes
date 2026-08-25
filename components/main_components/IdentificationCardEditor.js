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
async function shrink(file) {
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
// The floor is what makes one file work on both themes. Every channel is lifted
// to at least FLOOR, so no part of the picture is ever as dark as the page it
// sits on: on a light page the code reads with the right polarity, on a dark one
// it reads inverted, which phone cameras handle. Nothing else is touched — no
// gamma, no brightness, no curve — so highlights stay exactly as shot.
const CODE_VERSION = 4;
const CODE_QUIET = 4;
const FLOOR_START = 100;
const FLOOR_STEP = 20;
const FLOOR_LIMIT = 200;
// Drawn at 12 device pixels per module, which is past what any screen shows it
// at and keeps the edges of each module hard rather than resampled.
const MODULE_PX = 12;

// The page colours the code is checked against. A picture that only decodes on
// one of them is a picture that is broken for half the people who open it.
const PAGE_LIGHT = [238, 240, 236];
const PAGE_DARK = [14, 14, 14];

// Build the picture once at a given floor, as raw pixels.
//
// Every module is one pixel of the photograph, sampled from a square crop the
// size of the module grid — so the picture is not drawn behind the code and
// masked, it is drawn *as* the code, one square per module.
function paintCode(modules, sample, floor) {
  const span = modules.size + CODE_QUIET * 2;
  const out = new Uint8ClampedArray(span * span * 4);
  for (let row = 0; row < modules.size; row++) {
    for (let col = 0; col < modules.size; col++) {
      if (!modules.data[row * modules.size + col]) continue;   // light: stays clear
      const from = (row * modules.size + col) * 3;
      const to = ((row + CODE_QUIET) * span + col + CODE_QUIET) * 4;
      out[to]     = Math.max(sample[from], floor);
      out[to + 1] = Math.max(sample[from + 1], floor);
      out[to + 2] = Math.max(sample[from + 2], floor);
      out[to + 3] = 255;
    }
  }
  return { pixels: out, span };
}

// Lay the picture over a page colour, at one pixel per module, for decoding.
// Alpha is all-or-nothing, so this is a straight choice rather than a blend.
function overPage(picture, page) {
  const { pixels, span } = picture;
  const flat = new Uint8ClampedArray(span * span * 4);
  for (let i = 0; i < span * span; i++) {
    const opaque = pixels[i * 4 + 3] === 255;
    flat[i * 4]     = opaque ? pixels[i * 4]     : page[0];
    flat[i * 4 + 1] = opaque ? pixels[i * 4 + 1] : page[1];
    flat[i * 4 + 2] = opaque ? pixels[i * 4 + 2] : page[2];
    flat[i * 4 + 3] = 255;
  }
  return new ImageData(flat, span, span);
}

// Sample a loaded image down to one pixel per module, square-cropped the same
// way the card crops it — cover, at the focal point its owner dragged to. The
// centre was easier and wrong: the card shows one part of a photograph and the
// code would have been built out of another, so the two would have been
// pictures of different things. It also decides which tones the code has to
// work with, and a portrait framed on a face is a different set of tones from
// the middle of the same frame.
function sampleToGrid(image, size, posX = 50, posY = 50) {
  const w = image.naturalWidth || image.width;
  const h = image.naturalHeight || image.height;
  const side = Math.min(w, h);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  // The arithmetic object-fit: cover does — the overflow times the position.
  const left = (w - side) * (posX / 100);
  const top = (h - side) * (posY / 100);
  ctx.drawImage(image, left, top, side, side, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;
  const rgb = new Uint8ClampedArray(size * size * 3);
  for (let i = 0; i < size * size; i++) {
    rgb[i * 3] = data[i * 4];
    rgb[i * 3 + 1] = data[i * 4 + 1];
    rgb[i * 3 + 2] = data[i * 4 + 2];
  }
  return rgb;
}

// Build the code, prove it reads, and hand back a PNG.
//
// The proving is not optional and not by eye. Every photograph has its own
// tonal range and some of them will not carry a code at the starting floor —
// so it is generated, rasterised and decoded here, and the floor comes up
// twenty at a time until it reads or until there is no more room to give. If
// it never reads, this returns null and the card falls back to the plain code,
// which is a worse picture and a working one.
export async function buildPortraitCode(url, portraitSrc, position = '50% 50%') {
  if (!url || !portraitSrc) return null;
  try {
    const [{ default: jsQR }, QRCode] = await Promise.all([
      import('jsqr'),
      import('qrcode'),
    ]);

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
    const sample = sampleToGrid(
      image,
      modules.size,
      Number.parseFloat(px) || 50,
      Number.parseFloat(py) || 50,
    );

    for (let floor = FLOOR_START; floor <= FLOOR_LIMIT; floor += FLOOR_STEP) {
      const picture = paintCode(modules, sample, floor);
      const reads = page => {
        const found = jsQR(overPage(picture, page).data, picture.span, picture.span, {
          inversionAttempts: 'attemptBoth',
        });
        return found?.data === url;
      };
      // Both pages, not one. The claim is that a single file works on either,
      // and the only way that claim stays true is to check it against either.
      if (!reads(PAGE_LIGHT) || !reads(PAGE_DARK)) continue;

      // It reads. Draw it at size with hard edges and hand back the file.
      const canvas = document.createElement('canvas');
      canvas.width = picture.span * MODULE_PX;
      canvas.height = picture.span * MODULE_PX;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      const small = document.createElement('canvas');
      small.width = picture.span;
      small.height = picture.span;
      small.getContext('2d').putImageData(new ImageData(picture.pixels, picture.span, picture.span), 0, 0);
      ctx.drawImage(small, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise(done => canvas.toBlob(done, 'image/png'));
      if (!blob) return null;
      const data = await new Promise((done, fail) => {
        const reader = new FileReader();
        reader.onload = () => done(String(reader.result).split(',')[1]);
        reader.onerror = () => fail(new Error('unreadable'));
        reader.readAsDataURL(blob);
      });
      return { data, floor };
    }
    // Nothing in range carried it. The plain code stands in — a worse picture
    // and a working one — which is the point of doing this in the code rather
    // than by eye.
    return null;
  } catch {
    return null;
  }
}

// A blank row to type into. Never saved — see save().
const BLANK = '';

export function useIdentificationCardEditor(settings) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [trouble, setTrouble] = useState(null);

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [sendMe, setSendMe] = useState('');
  // Where in the picture to look, as two percentages. Held apart rather than
  // as the CSS string so the drag can do arithmetic on it without parsing.
  const [posX, setPosX] = useState(50);
  const [posY, setPosY] = useState(50);
  const [portrait, setPortrait] = useState('');
  // Each link is an address and the mark it wears. The mark is usually 'auto',
  // which means the hostname decides — see identify() in IdentityCard.
  const [links, setLinks] = useState([{ url: BLANK, icon: 'auto' }]);
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

  // Opening takes a copy. Everything typed after this point is a draft, and
  // Cancel is simply never committing it — no undo stack, no diffing, and the
  // card behind the fields is still showing what a visitor currently sees.
  const begin = useCallback(() => {
    setName(settings.keeper_name || '');
    // Whatever the card is showing, not whatever column it came out of. The
    // paragraph falls back to about_intro when bio is empty, so seeding from
    // bio alone opened the editor on a blank field under a card that plainly
    // had writing on it — and saving would then have wiped the writing.
    //
    // It settles the two columns as a side effect: about_intro was the lede of
    // an about page that no longer exists, this card is the only thing left
    // reading it, and the first save moves it into the field the card is
    // actually for.
    setBio(settings.bio || settings.about_intro || '');
    setSendMe(settings.send_me || '');
    const [x, y] = String(settings.portrait_position || '50% 50%').split(/\s+/);
    setPosX(Number.parseFloat(x) || 50);
    setPosY(Number.parseFloat(y) || 50);
    setPortrait(settings.portrait_url || '');
    // instagram_url predates the list and is folded in here, so an owner sees
    // every link they have rather than every link but one. Saving writes the
    // whole list back and clears the old column, so the same address cannot
    // end up stored in two places disagreeing.
    const stored = Array.isArray(settings.social_links) ? settings.social_links : [];
    const all = [settings.instagram_url, ...stored]
      // Plain strings from before marks could be chosen, objects since.
      .map(entry => (typeof entry === 'string' ? { url: entry, icon: 'auto' } : { url: entry?.url || '', icon: entry?.icon || 'auto' }))
      .filter(l => l.url.trim());
    const seen = new Set();
    const unique = all.filter(l => !seen.has(l.url) && seen.add(l.url));
    setLinks(unique.length ? unique : [{ url: BLANK, icon: 'auto' }]);
    setRig(settings.rig_icon || '');
    const rows = Array.isArray(settings.rig) ? settings.rig : [];
    setGear(rows.length
      ? rows.map(r => ({ name: r?.name || '', role: r?.role || '' }))
      : [{ name: '', role: '' }]);
    setHidden(new Set(Array.isArray(settings.hidden_fields) ? settings.hidden_fields : []));
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
  const addLink = useCallback(() => setLinks(rows => [...rows, { url: BLANK, icon: 'auto' }]), []);
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
    const addressMoved = url !== lastCodeUrl.current;
    let codePatch = {};
    if (portrait.trim() && url && (portraitMoved || addressMoved || !settings.portrait_code_url)) {
      const built = await buildPortraitCode(url, portrait.trim(), `${posX}% ${posY}%`);
      codePatch = built
        ? { portrait_code: built.data, portrait_code_url: `/api/portrait?of=code&v=${Date.now()}` }
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
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keeper_name: name.trim(),
          bio: bio.trim(),
          send_me: sendMe.trim(),
          portrait_position: portrait.trim() ? `${posX.toFixed(1)}% ${posY.toFixed(1)}%` : '',
          portrait_url: portrait.trim(),
          social_links: cleaned.length ? cleaned : null,
          rig_icon: rig,
          rig: gearClean.length ? gearClean : null,
          ...codePatch,
          hidden_fields: hidden.size ? [...hidden] : null,
          // Emptied on purpose. Every link lives in one list now; leaving this
          // filled would put Instagram on the card twice the moment someone
          // added it to the list, and the de-duplication that hides that is a
          // patch over two sources of truth rather than a reason to keep them.
          instagram_url: '',
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
  }, [name, bio, sendMe, posX, posY, portrait, links, hidden, rig, gear, settings, router]);

  return {
    editing, begin, cancel, save, saving, busy, trouble,
    name, setName,
    bio, setBio,
    sendMe, setSendMe,
    posX, posY, setPosX, setPosY,
    position: `${posX}% ${posY}%`,
    portrait,
    links, setLink, setLinkIcon, addLink, dropLink,
    rig, setRig,
    gear, setGearField, addGear, dropGear,
    hidden, toggleHidden,
    choosePhoto, removePhoto,
  };
}
