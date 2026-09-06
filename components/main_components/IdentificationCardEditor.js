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
import { CODE_BUILD, buildPortraitCode } from '../../library/portrait_code';

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
// under 16px. styles/base.css answers that by forcing every field on a phone up to
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
