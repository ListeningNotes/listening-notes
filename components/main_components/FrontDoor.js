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
import { BookOpen, CheckCircle, Circle, MagnifyingGlass, Plus, XCircle } from '@phosphor-icons/react';
import { LnMark } from './SiteNav';

const FULL = 'We’re full for now. Come back soon.';
// Direct, in Miyel's words (2026-10-20: "lets go more direct"), with a mark
// each: a green circled check, and its match in red (her ask, the same day).
function Says({ state }) {
  if (state === 'free') {
    return <span className="fd-yes"><CheckCircle size={18} weight="regular" aria-hidden="true" />Available</span>;
  }
  if (state === 'taken') {
    return <span className="fd-no"><XCircle size={18} weight="regular" aria-hidden="true" />Not available</span>;
  }
  if (state === 'unwritable') return 'Letters, numbers and dashes.';
  return '\u00a0';
}

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
function AddressField({ value, onChange, domain, label, onEnter, disabled = false }) {
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
        disabled={disabled}
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

// The steps a journal is made in, ticked off as the front door finishes each
// (Miyel's pick, 2026-10-20: "steps that tick off, as each really
// finishes"). The last is the page going to the journal's own address.
const STEPS = [
  { key: 'database', said: 'Making your database' },
  { key: 'pages', said: 'Setting up your pages' },
  { key: 'address', said: 'Writing your address' },
  { key: 'open', said: 'Opening your journal' },
];

function Steps({ done }) {
  const now = STEPS.findIndex(step => !done.includes(step.key));
  return (
    <ol className="fd-steps" aria-live="polite">
      {STEPS.map((step, i) => (
        <li key={step.key} className={'fd-step' + (i < now || now === -1 ? ' fd-step--done' : i === now ? ' fd-step--now' : '')}>
          {i < now || now === -1
            ? <CheckCircle size={18} weight="regular" aria-hidden="true" />
            : i === now
              ? <span className="fd-spin" aria-hidden="true" />
              : <Circle size={18} weight="regular" aria-hidden="true" />}
          {step.said}
        </li>
      ))}
    </ol>
  );
}

// Reads the front door's answer a line at a time: each step as it finishes,
// then where to go, or what went wrong.
async function eachLine(res, heard) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let held = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    held += decoder.decode(value, { stream: true });
    let end;
    while ((end = held.indexOf('\n')) >= 0) {
      const line = held.slice(0, end).trim();
      held = held.slice(end + 1);
      if (line) heard(JSON.parse(line));
    }
  }
}

function Start({ domain, left: firstLeft }) {
  const [name, setName] = useState('');
  const [state, setState] = useState(null);
  const [left, setLeft] = useState(firstLeft);
  const [making, setMaking] = useState(false);
  const [done, setDone] = useState([]);
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
    setDone([]);
    setTrouble('');
    const failed = said => {
      if (said?.full) setLeft(0);
      if (said?.state) setState(said.state);
      setTrouble(said?.error || 'Your journal could not be made just now. Try again in a minute.');
      setMaking(false);
    };
    try {
      const res = await fetch('/api/front-door', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      // Refused before anything was made: one answer, said at once.
      if (!res.ok) return failed(await res.json().catch(() => ({})));
      let to = '';
      let wrong = null;
      await eachLine(res, line => {
        if (line.step) setDone(steps => [...steps, line.step]);
        if (line.to) to = line.to;
        if (line.error) wrong = line;
      });
      if (!to) return failed(wrong);
      setDone(STEPS.map(step => step.key).filter(key => key !== 'open'));
      window.location.href = to;
    } catch {
      failed(null);
    }
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
        disabled={making}
      />
      {making ? (
        <Steps done={done} />
      ) : (
        <>
          <p className="fd-state" role="status">{name && state ? <Says state={state} /> : '\u00a0'}</p>
          {/* Setup's own black button, full width (Miyel's pick): the next
              screen they meet is setup, and its button looks like this. */}
          <button type="button" className="su-go fd-go" onClick={make} disabled={state !== 'free'}>
            Create my journal
          </button>
        </>
      )}
      {trouble && <p className="fd-trouble" role="alert">{trouble}</p>}
      {!making && <p className="fd-places">{placesLine(left)}</p>}
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
