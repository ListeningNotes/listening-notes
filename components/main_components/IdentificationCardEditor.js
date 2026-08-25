'use client';

// components/main_components/IdentificationCardEditor.js
// The card, with its fields open.
//
// There has never been a way to set the journal's own details from inside the
// site. They have lived in a database column since the settings table was
// built, and the only way to change one was to open a SQL editor — which is
// fine for the person who wrote the schema and no use at all to anyone handed a
// copy of this software.
//
// It edits in the card's own place and in the card's own shape rather than in a
// drawer over it: the rows keep their rules, the photo keeps its box, and what
// you are typing into is the thing a visitor will read. Only the mutable half
// appears. Est and Albums logged are counted from the entries and cannot be
// typed over — a journal that can be told how many records it has is a journal
// whose numbers mean nothing.
//
// The gate here is only the visible one. Nothing in this file is trusted:
// PATCH /api/settings checks the wristband on the server, and this never
// renders for a reader in the first place, so the markup a visitor receives
// does not contain it.

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash, UploadSimple, X } from '@phosphor-icons/react';

// A blank row the owner types into. Kept out of the saved value — see save().
const EMPTY_ROW = '';

// The counted rows, which can be hidden but never typed over.
const HIDEABLE = [
  { key: 'since', label: 'Keeping since' },
  { key: 'albums', label: 'Albums logged' },
];

// How large a portrait is worth keeping. A card draws it at about 240px on the
// widest screen it has, so 900 is already twice what any display needs and
// leaves room for a phone with a dense screen. Straight off a camera the same
// picture is several thousand pixels across and a few megabytes; shrinking it
// here rather than accepting it whole is what makes keeping the bytes in the
// journal's own database a reasonable thing to do.
const PORTRAIT_MAX = 900;
const PORTRAIT_QUALITY = 0.85;

// Read a chosen file, shrink it, and hand back base64 and a type.
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

  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    // A data URL is "data:image/jpeg;base64,…" and only the tail is wanted.
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('unreadable'));
    reader.readAsDataURL(blob);
  });

  return { data, mime: 'image/jpeg', bytes: blob.size };
}

export default function IdentificationCardEditor({ settings, identify, onClose }) {
  const router = useRouter();
  const [name, setName] = useState(settings.keeper_name || '');
  const [portrait, setPortrait] = useState(settings.portrait_url || '');
  const [bio, setBio] = useState(settings.bio || '');
  // instagram_url predates the list and is folded into it here, so an owner
  // editing their links sees every link they have rather than every link but
  // one. Saving writes the whole list back and clears the old single field, so
  // the same address cannot end up stored in two places disagreeing.
  const [links, setLinks] = useState(() => {
    const stored = Array.isArray(settings.social_links) ? settings.social_links : [];
    const all = [settings.instagram_url, ...stored].filter(u => typeof u === 'string' && u.trim());
    return all.length ? [...new Set(all)] : [EMPTY_ROW];
  });
  const [hidden, setHidden] = useState(() =>
    new Set(Array.isArray(settings.hidden_fields) ? settings.hidden_fields : []));
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [trouble, setTrouble] = useState(null);
  const fileRef = useRef(null);

  function toggleHidden(key) {
    setHidden(current => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  // The picture goes up on its own rather than riding along with Save. It is
  // the one field here that takes a moment and can fail on its own terms, and
  // burying that inside a form submit means a spinner on the whole card and no
  // way to say which part of it went wrong.
  async function choosePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';   // so choosing the same file twice still fires
    if (!file) return;

    setBusy(true);
    setTrouble(null);
    try {
      const { data, mime } = await shrink(file);
      const res = await fetch('/api/portrait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, mime }),
      });
      const answer = await res.json();
      if (!res.ok) throw new Error(answer.error || 'That did not upload.');
      setPortrait(answer.portrait_url);
    } catch (error) {
      setTrouble(error.message === 'unreadable'
        ? 'That file could not be read as a picture.'
        : error.message);
    }
    setBusy(false);
  }

  async function removePhoto() {
    setBusy(true);
    setTrouble(null);
    try {
      await fetch('/api/portrait', { method: 'DELETE' });
      setPortrait('');
    } catch {
      setTrouble('That did not come off.');
    }
    setBusy(false);
  }

  function setLink(index, value) {
    setLinks(rows => rows.map((row, i) => (i === index ? value : row)));
  }
  function addLink() {
    setLinks(rows => [...rows, EMPTY_ROW]);
  }
  function dropLink(index) {
    setLinks(rows => (rows.length === 1 ? [EMPTY_ROW] : rows.filter((_, i) => i !== index)));
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setFailed(false);

    // Blank means blank. An empty field is the owner clearing a detail, not
    // leaving it alone, so it is sent rather than skipped — the settings writer
    // turns an empty string into null on the way in.
    const cleaned = links.map(u => u.trim()).filter(Boolean);
    const body = {
      keeper_name: name.trim(),
      portrait_url: portrait.trim(),
      bio: bio.trim(),
      social_links: cleaned.length ? cleaned : null,
      hidden_fields: hidden.size ? [...hidden] : null,
      // Emptied on purpose. Every link now lives in one list; leaving the old
      // column filled would put Instagram on the card twice the moment someone
      // added it to the list, and the de-duplication that currently hides that
      // is a patch over two sources of truth rather than a reason to keep them.
      instagram_url: '',
    };

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('save failed');
      // The card reads its details from the root layout, which is a server
      // component — so the new values arrive by asking the server to render
      // again, not by pushing them into a context from here.
      router.refresh();
      onClose();
    } catch {
      setFailed(true);
      setSaving(false);
    }
  }

  return (
    <form className="idc-inner idc-inner--editing" onSubmit={save}>
      <style href="ln-identity-card-editor" precedence="default">{`
        /* The fields borrow the card's own rules rather than drawing input
           chrome of their own. What you are typing on is the line the answer
           will sit on when you are done. */
        .idc-input {
          width: 100%;
          border: 0;
          border-radius: 0;
          background: transparent;
          padding: 0 0 4px;
          font-family: var(--font-label);
          font-size: 12.5px;
          letter-spacing: 0.02em;
          color: var(--ink);
          background-image: linear-gradient(to right, var(--idc-rule) 0 2px, transparent 2px 5px);
          background-size: 5px 1px;
          background-position: left bottom;
          background-repeat: repeat-x;
        }
        .idc-input:focus {
          outline: none;
          background-image: linear-gradient(to right, var(--ink-faint) 0 100%);
          background-size: 100% 1px;
        }
        .idc-input::placeholder { color: var(--ink-faint); }

        .idc-edit-block { width: 100%; max-width: 292px; margin: 0 auto; text-align: left; }
        .idc-edit-label {
          display: block;
          font-family: var(--font-label);
          font-size: 9px; letter-spacing: 0.11em; text-transform: uppercase;
          color: var(--ink-faint);
          margin-bottom: 6px;
        }
        .idc-edit-note {
          font-family: var(--font-label);
          font-size: 8.5px; letter-spacing: 0.06em;
          color: var(--ink-faint);
          margin: 5px 0 0;
        }

        .idc-bio-input {
          min-height: 66px;
          resize: vertical;
          line-height: 1.6;
          font-family: var(--font-sans, inherit);
          font-size: 12.5px;
        }

        /* One row per link, the cross sitting outside the rule so it does not
           look like part of what you typed. */
        .idc-link-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: end; }
        .idc-link-row + .idc-link-row { margin-top: 9px; }
        .idc-link-drop, .idc-link-add {
          display: inline-flex; align-items: center; justify-content: center;
          width: 24px; height: 24px; border-radius: 7px;
          color: var(--ink-faint); background: transparent; border: 0;
          cursor: pointer; transition: color 0.15s, background 0.15s;
        }
        .idc-link-drop:hover, .idc-link-add:hover { color: var(--ink); background: var(--bg-warm); }
        .idc-link-add { width: auto; padding: 0 9px; gap: 5px; font-family: var(--font-label); font-size: 9px; letter-spacing: 0.11em; text-transform: uppercase; margin-top: 10px; }
        .idc-link-kind {
          font-family: var(--font-label);
          font-size: 8px; letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--ink-faint);
          display: block; margin-bottom: 3px; min-height: 11px;
        }

        .idc-photo-actions { display: flex; gap: 7px; flex-wrap: wrap; }
        .idc-photo-actions .ln-pill { gap: 6px; padding: 8px 14px; font-size: 9px; letter-spacing: 0.1em; }
        .idc-photo-actions .ln-pill:disabled { opacity: 0.5; cursor: default; }

        /* The typed address is still here, folded away. It is the answer for a
           picture that already lives somewhere, and the wrong first thing to
           show someone holding a phone with the photograph on it. */
        .idc-edit-more { margin-top: 11px; }
        .idc-edit-more summary {
          font-family: var(--font-label);
          font-size: 8.5px; letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--ink-faint); cursor: pointer; list-style: none;
        }
        .idc-edit-more summary::-webkit-details-marker { display: none; }
        .idc-edit-more summary:hover { color: var(--ink-soft); }
        .idc-edit-more[open] summary { margin-bottom: 9px; }

        .idc-check {
          display: flex; align-items: center; gap: 9px;
          font-family: var(--font-label);
          font-size: 10px; letter-spacing: 0.06em;
          color: var(--ink-soft); cursor: pointer;
          padding: 4px 0;
        }
        .idc-check input { accent-color: var(--ink); width: 14px; height: 14px; }

        /* Pinned to the bottom of the form's own scroller. The list of links
           has no fixed length, so there is no arrangement of these fields that
           reliably leaves Save on screen — and a Save you have to go looking
           for is how a card gets edited and then abandoned half-written. */
        .idc-edit-actions {
          position: sticky;
          bottom: 0;
          display: flex; gap: 7px; justify-content: center; flex-wrap: wrap;
          padding: 12px 0 4px;
          margin-top: -2px;
          background: var(--bg);
          /* It floats over the fields it has not reached yet, so it needs an
             edge — without one it reads as a row that belongs between the
             checkboxes rather than as the bottom of the form. */
          border-top: 1px solid var(--idc-rule);
          box-shadow: 0 -10px 14px -10px rgba(0, 0, 0, 0.12);
        }
        .idc-edit-actions .ln-pill:disabled { opacity: 0.5; cursor: default; }
        .idc-edit-fail {
          font-family: var(--font-label); font-size: 9px; letter-spacing: 0.08em;
          color: var(--fav); margin: 9px 0 0;
        }
      `}</style>

      {/* The photo, as it will look, over the line that sets it. A preview is
          the only honest way to check a pasted address: the field cannot tell
          you whether a URL is a picture, but the box can show you. */}
      <div className="idc-portrait">
        {portrait
          ? <img src={portrait} alt="" onError={e => { e.currentTarget.style.visibility = 'hidden'; }} />
          : <span className="idc-portrait-empty" />}
      </div>

      <div className="idc-rule" />

      <div className="idc-edit-block">
        <span className="idc-edit-label">Photo</span>
        {/* accept="image/*" is what makes an iPhone offer the camera and the
            photo library rather than a file browser, which is the whole point
            of this being here — a picture of yourself is on your phone, not at
            an address you can type. */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={choosePhoto}
          hidden
        />
        <div className="idc-photo-actions">
          <button type="button" className="ln-pill" onClick={() => fileRef.current?.click()} disabled={busy}>
            <UploadSimple size={12} weight="bold" aria-hidden="true" />
            {busy ? 'Working…' : portrait ? 'Replace' : 'Choose a photo'}
          </button>
          {portrait && (
            <button type="button" className="ln-pill" onClick={removePhoto} disabled={busy}>
              <Trash size={12} weight="bold" aria-hidden="true" />
              Remove
            </button>
          )}
        </div>
        <p className="idc-edit-note">Shrunk here first, then kept in your own journal&rsquo;s database.</p>
        {trouble && <p className="idc-edit-fail">{trouble}</p>}

        <details className="idc-edit-more">
          <summary>Or point at one already online</summary>
          <input
            className="idc-input"
            type="url"
            inputMode="url"
            value={portrait}
            onChange={e => setPortrait(e.target.value)}
            placeholder="https://…"
            aria-label="Photo address"
          />
        </details>
      </div>

      <div className="idc-rule" />

      <div className="idc-edit-block">
        <label className="idc-edit-label" htmlFor="idc-keeper-name">Name</label>
        <input
          id="idc-keeper-name"
          className="idc-input"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Who keeps this journal"
        />
      </div>

      <div className="idc-rule" />

      <div className="idc-edit-block">
        <label className="idc-edit-label" htmlFor="idc-bio">Bio</label>
        <textarea
          id="idc-bio"
          className="idc-input idc-bio-input"
          value={bio}
          onChange={e => setBio(e.target.value)}
          placeholder="A line or two."
        />
      </div>

      <div className="idc-rule" />

      <div className="idc-edit-block">
        <span className="idc-edit-label">Elsewhere</span>
        {links.map((link, index) => {
          const known = link.trim() ? identify(link.trim()) : null;
          return (
            <div className="idc-link-row" key={index}>
              <span>
                <span className="idc-link-kind">{known ? known.label : ''}</span>
                <input
                  className="idc-input"
                  type="url"
                  inputMode="url"
                  value={link}
                  onChange={e => setLink(index, e.target.value)}
                  placeholder="https://…"
                  aria-label={`Link ${index + 1}`}
                />
              </span>
              <button
                type="button"
                className="idc-link-drop"
                onClick={() => dropLink(index)}
                aria-label={`Remove link ${index + 1}`}
              >
                <X size={13} weight="bold" aria-hidden="true" />
              </button>
            </div>
          );
        })}
        <button type="button" className="idc-link-add" onClick={addLink}>
          <Plus size={11} weight="bold" aria-hidden="true" />
          Add a link
        </button>
      </div>

      <div className="idc-rule" />

      {/* The two counted rows. They can be left off the card but never written
          — the numbers come off the entries, and a journal that can be told how
          many records it has is a journal whose numbers mean nothing. */}
      <div className="idc-edit-block">
        <span className="idc-edit-label">Counted rows</span>
        {HIDEABLE.map(row => (
          <label className="idc-check" key={row.key}>
            <input
              type="checkbox"
              checked={!hidden.has(row.key)}
              onChange={() => toggleHidden(row.key)}
            />
            <span>Show {row.label.toLowerCase()}</span>
          </label>
        ))}
        <p className="idc-edit-note">Counted from your entries. You can leave them off; you can&rsquo;t change them.</p>
      </div>

      <div className="idc-rule" />

      <div className="idc-edit-actions">
        <button type="submit" className="ln-pill" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="ln-pill" onClick={onClose} disabled={saving}>
          Cancel
        </button>
      </div>

      {failed && <p className="idc-edit-fail">That didn&rsquo;t save. Try again.</p>}
    </form>
  );
}
