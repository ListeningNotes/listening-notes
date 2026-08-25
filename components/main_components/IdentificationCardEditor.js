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

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from '@phosphor-icons/react';

// A blank row the owner types into. Kept out of the saved value — see save().
const EMPTY_ROW = '';

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
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

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
          min-height: 78px;
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

        .idc-edit-actions { display: flex; gap: 7px; justify-content: center; flex-wrap: wrap; }
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
        <label className="idc-edit-label" htmlFor="idc-portrait-url">Photo address</label>
        <input
          id="idc-portrait-url"
          className="idc-input"
          type="url"
          inputMode="url"
          value={portrait}
          onChange={e => setPortrait(e.target.value)}
          placeholder="https://…"
        />
        <p className="idc-edit-note">A link to an image. Nothing is uploaded — the picture stays wherever it already lives.</p>
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
