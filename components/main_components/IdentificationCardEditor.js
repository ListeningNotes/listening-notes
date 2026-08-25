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

import { useCallback, useState } from 'react';
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
    setHidden(new Set(Array.isArray(settings.hidden_fields) ? settings.hidden_fields : []));
    setTrouble(null);
    setEditing(true);
  }, [settings]);

  const cancel = useCallback(() => { setEditing(false); setTrouble(null); }, []);

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
    // Blank means blank. An empty field is the owner clearing a detail, not
    // leaving it alone, so it is sent rather than skipped — the settings writer
    // turns an empty string into null on the way in.
    const cleaned = links
      .map(l => ({ url: l.url.trim(), icon: l.icon || 'auto' }))
      .filter(l => l.url);
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
      setEditing(false);
    } catch (error) {
      setTrouble(error.message);
    }
    setSaving(false);
  }, [name, bio, sendMe, posX, posY, portrait, links, hidden, rig, router]);

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
    hidden, toggleHidden,
    choosePhoto, removePhoto,
  };
}
