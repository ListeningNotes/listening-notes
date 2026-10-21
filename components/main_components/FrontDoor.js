// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/FrontDoor.js
// The front door's pages (library/front_door.js): at `/`, the mark and two
// doors, Start a journal and Find my journal (Miyel's words, 2026-10-20 —
// Start wears the open book Visit wears, with a plus on its corner); at
// `/get`, Choose your address. Drawn by the root layout in place of a
// journal, because the front door has no journal of its own.
//
// The journals left are said while there are some, and "We're full for now.
// Come back soon." once there are none (her pick: "a mix of both").

'use client';

import { useEffect, useRef, useState } from 'react';
import { BookOpen, MagnifyingGlass, Plus } from '@phosphor-icons/react';
import { LnMark } from './SiteNav';

const FULL = 'We’re full for now. Come back soon.';
// Direct, in Miyel's words (2026-10-20: "lets go more direct").
const SAYS = {
  free: 'Available.',
  taken: 'Taken.',
  unwritable: 'Letters, numbers and dashes.',
};

function placesLine(left) {
  return `${left} ${left === 1 ? 'journal' : 'journals'} left`;
}

// The open book, with a plus on its corner.
function BookWithPlus() {
  return (
    <span className="fd-bookplus" aria-hidden="true">
      <BookOpen size={22} weight="regular" />
      <span className="fd-plus"><Plus size={8} weight="bold" /></span>
    </span>
  );
}

// An address, a name in front of the domain it lives under.
function AddressField({ value, onChange, domain, label, onEnter }) {
  return (
    <label className="fd-field">
      <span className="fd-sr">{label}</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value.toLowerCase().replace(/\s+/g, ''))}
        onKeyDown={e => { if (e.key === 'Enter') onEnter?.(); }}
        placeholder="name"
        inputMode="url"
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        maxLength={30}
      />
      <span className="fd-domain">.{domain}</span>
    </label>
  );
}

// Where a name's journal is, from wherever this page was reached.
function journalUrl(name, domain) {
  const port = window.location.port ? `:${window.location.port}` : '';
  return `${window.location.protocol}//${name}.${domain}${port}`;
}

function Welcome({ domain, left }) {
  const [finding, setFinding] = useState(false);
  const [name, setName] = useState('');
  const [trouble, setTrouble] = useState('');
  const [busy, setBusy] = useState(false);

  async function open() {
    if (!name || busy) return;
    setBusy(true);
    setTrouble('');
    const said = await fetch(`/api/front-door?name=${encodeURIComponent(name)}`).then(r => r.json()).catch(() => null);
    if (said?.state === 'taken') {
      window.location.href = journalUrl(said.name, domain);
      return;
    }
    setTrouble('There’s no journal at that address.');
    setBusy(false);
  }

  return (
    <>
      <p className="fd-said">A listening journal of your own.</p>
      <div className="fr-doors-row fd-doors">
        {left > 0 ? (
          <a className="fr-door" href="/get"><BookWithPlus />Start a journal</a>
        ) : null}
        <button type="button" className="fr-door" onClick={() => setFinding(f => !f)} aria-expanded={finding}>
          <MagnifyingGlass size={22} weight="regular" aria-hidden="true" />
          Find my journal
        </button>
      </div>
      {left > 0 ? <p className="fd-places">{placesLine(left)}</p> : <p className="fd-places">{FULL}</p>}
      {finding && (
        <div className="fd-find">
          <AddressField value={name} onChange={setName} domain={domain} label="Your journal’s address" onEnter={open} />
          <button type="button" className="st-save ln-word ln-word--on" onClick={open} disabled={!name || busy}>
            {busy ? 'Looking…' : 'Open it'}
          </button>
          {trouble && <p className="fd-trouble" role="alert">{trouble}</p>}
        </div>
      )}
    </>
  );
}

function Start({ domain, left: firstLeft }) {
  const [name, setName] = useState('');
  const [state, setState] = useState(null);
  const [left, setLeft] = useState(firstLeft);
  const [making, setMaking] = useState(false);
  const [trouble, setTrouble] = useState('');
  const asked = useRef(0);

  // Whether the address is free, a moment after the typing stops. Only the
  // newest question's answer is shown.
  useEffect(() => {
    if (!name) return undefined;
    const mine = ++asked.current;
    const soon = setTimeout(async () => {
      const said = await fetch(`/api/front-door?name=${encodeURIComponent(name)}`).then(r => r.json()).catch(() => null);
      if (mine !== asked.current || !said) return;
      setState(said.state || null);
      if (Number.isFinite(said.left)) setLeft(said.left);
    }, 300);
    return () => clearTimeout(soon);
  }, [name]);

  async function make() {
    if (state !== 'free' || making) return;
    setMaking(true);
    setTrouble('');
    try {
      const res = await fetch('/api/front-door', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const said = await res.json().catch(() => ({}));
      if (res.ok && said.to) {
        window.location.href = said.to;
        return;
      }
      if (said.full) setLeft(0);
      if (said.state) setState(said.state);
      setTrouble(said.error || 'Your journal could not be made just now. Try again in a minute.');
    } catch {
      setTrouble('Your journal could not be made just now. Try again in a minute.');
    }
    setMaking(false);
  }

  if (left <= 0) return <p className="fd-said">{FULL}</p>;

  return (
    <>
      <h1 className="fd-h">Choose your address</h1>
      <AddressField
        value={name}
        onChange={value => { setName(value); setTrouble(''); if (!value) setState(null); }}
        domain={domain}
        label="Your journal’s address"
        onEnter={make}
      />
      <p className="fd-state" role="status">{name && state ? SAYS[state] : ' '}</p>
      <button type="button" className="st-save ln-word ln-word--on" onClick={make} disabled={state !== 'free' || making}>
        {making ? 'Starting your journal…' : 'Start my journal'}
      </button>
      {trouble && <p className="fd-trouble" role="alert">{trouble}</p>}
      <p className="fd-places">{placesLine(left)}</p>
    </>
  );
}

export default function FrontDoor({ path = '/', domain = '', left = 0 }) {
  return (
    <main className="fd-page">
      {/* Plain anchors, here and on Start, for the holding page's reason
          (ComingSoon.js): the root layout draws this page in place of a
          journal and does not draw again on a client-side navigation, so
          only a full load moves between the front door's two pages. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="fd-mark" aria-label="Listening Notes"><LnMark className="fd-logo" /></a>
      {path === '/get' ? <Start domain={domain} left={left} /> : <Welcome domain={domain} left={left} />}
    </main>
  );
}
