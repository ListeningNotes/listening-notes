// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/FrontDoor.js
// The front door's page (library/front_door.js): the mark and two doors,
// Start a journal and Find my journal (Miyel's words, 2026-10-20 — Start
// wears the open book Visit wears, with a plus on its corner), each opening
// where it is, over a wall of records. `/get` is the same page with Start
// open. Drawn by the root layout in place of a journal, because the front
// door has no journal of its own.
//
// The journals left are said while there are some, and "We're full for now.
// Come back soon." once there are none (her pick: "a mix of both").
//
// Somebody an invite link brought (InviteSheet.js) is told who invited them,
// over Choose your address — "[Name] invited you", by their face (Miyel's
// words, 2026-10-21) — and the inviter goes with the new journal to its
// setup, which offers to add them and wave. An invite takes no place past
// the last: full is full for everybody.

'use client';

import { useEffect, useRef, useState } from 'react';
import { BookOpen, CheckCircle, Circle, MagnifyingGlass, Plus, User, X, XCircle } from '@phosphor-icons/react';
import { LnMark } from './SiteNav';
import { journalUrl } from '../../library/return_address';

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

// An address, a name in front of the domain it lives under, read as one
// line in the middle of its box (Miyel, 2026-10-20: "I need it to be
// centered"). The name's own slot is as wide as what is in it — the
// address font is monospaced, so a character is a `ch` — so the two halves
// stay together as it is typed, and a long name scrolls inside its slot
// rather than pushing the domain out of the box.
//
// The faint word in the slot is "sitename" (Miyel's pick, 2026-10-20):
// "name" read as a first name, and what is chosen here is the journal's web
// address.
const NAME_SAYS = 'sitename';

function AddressField({ value, onChange, domain, label, onEnter, disabled = false }) {
  return (
    <label className="fd-field">
      <span className="fd-sr">{label}</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value.toLowerCase().replace(/\s+/g, ''))}
        onKeyDown={e => { if (e.key === 'Enter') onEnter?.(); }}
        placeholder={NAME_SAYS}
        style={{ width: `calc(${Math.max((value || NAME_SAYS).length, 1)}ch + 2px)` }}
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
function addressUrl(name, domain) {
  const port = window.location.port ? `:${window.location.port}` : '';
  return `${window.location.protocol}//${name}.${domain}${port}`;
}

// Who invited them: their face, in a circle as every face on the site is,
// over the plain one, which shows when theirs does not load.
function InvitedBy({ invite }) {
  if (!invite) return null;
  return (
    <p className="fd-invite">
      <span className="fd-invite-face" aria-hidden="true">
        <User size={18} weight="regular" />
        <img src={`${journalUrl(invite.address)}/api/portrait`} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} />
      </span>
      {invite.name} invited you
    </p>
  );
}

// ── The doors open where they are, 2026-10-22 ─────────────────────────────
// Miyel: Start a journal should not "go to a whole nother page" but open on
// this one, "in one animation, not just appearing", pushing Find my journal
// out, and Find my journal "the reverse". A door pressed pushes the other out
// of the row and comes to the middle, its glyph turning to a cross that
// closes it; what it opens unfolds under it the way the site's other folds do
// (a grid row from 0fr to 1fr on the site's curve, About.js), coming in from
// the door's own side, and the record wall gives way below. Shut, a fold is
// inert. The address bar follows the door, so a reload opens the same one:
// `/get`, where every invite link points (InviteSheet.js), is Start open.
function Door({ which, open, onPress, glyph, children }) {
  const mine = open === which;
  const gone = Boolean(open) && !mine;
  return (
    <button
      type="button"
      className={`fr-door fd-door fd-door--${which}` + (mine ? ' fd-door--open' : '') + (gone ? ' fd-door--gone' : '')}
      onClick={onPress}
      aria-expanded={mine}
      tabIndex={gone ? -1 : undefined}
      aria-hidden={gone || undefined}
    >
      <span className="fd-door-glyph" aria-hidden="true">
        <span className="fd-door-is">{glyph}</span>
        <span className="fd-door-shut"><X size={20} weight="regular" /></span>
      </span>
      {children}
    </button>
  );
}

function Fold({ open, from, children }) {
  return (
    <div className={`fd-fold fd-fold--${from}` + (open ? ' fd-fold--open' : '')} inert={!open}>
      <div className="fd-fold-in">{children}</div>
    </div>
  );
}

function Doors({ domain, left: firstLeft, invite, opening }) {
  // No Start door at all once the journals are gone; a place taken while
  // somebody is choosing an address is said inside Start instead.
  const closed = firstLeft <= 0;
  const [open, setOpen] = useState(closed && opening === 'start' ? null : opening);
  const [left, setLeft] = useState(firstLeft);
  const [making, setMaking] = useState(false);

  function press(which) {
    if (making) return;
    const next = open === which ? null : which;
    setOpen(next);
    const url = new URL(window.location.href);
    url.pathname = next === 'start' ? '/get' : '/';
    window.history.replaceState(null, '', url);
  }

  return (
    <div className="fd-doors-all">
      {closed && <InvitedBy invite={invite} />}
      <div className={'fr-doors-row fd-doors' + (open ? ' fd-doors--one' : '')}>
        {!closed && (
          <Door which="start" open={open} onPress={() => press('start')} glyph={<BookWithPlus />}>
            Start a journal
          </Door>
        )}
        <Door which="find" open={open} onPress={() => press('find')}
          glyph={<MagnifyingGlass size={22} weight="regular" />}>
          Find my journal
        </Door>
      </div>
      {!closed && (
        <Fold open={open === 'start'} from="start">
          <StartFold domain={domain} invite={invite} left={left} setLeft={setLeft}
            making={making} setMaking={setMaking} />
        </Fold>
      )}
      <Fold open={open === 'find'} from="find">
        <FindFold domain={domain} />
      </Fold>
      {!making && <p className="fd-places">{left > 0 ? placesLine(left) : FULL}</p>}
    </div>
  );
}

function FindFold({ domain }) {
  const [name, setName] = useState('');
  const [trouble, setTrouble] = useState('');
  const [busy, setBusy] = useState(false);

  async function open() {
    if (!name || busy) return;
    setBusy(true);
    setTrouble('');
    const said = await fetch(`/api/front-door?name=${encodeURIComponent(name)}`).then(r => r.json()).catch(() => null);
    // A kept word is never a door, even with a journal behind it: the
    // studio is kept at one (2026-10-22).
    if (said?.state === 'taken' && !said?.kept) {
      window.location.href = addressUrl(said.name, domain);
      return;
    }
    setTrouble('There’s no journal at that address.');
    setBusy(false);
  }

  return (
    <div className="fd-fold-body">
      <AddressField value={name} onChange={setName} domain={domain} label="Your journal’s address" onEnter={open} />
      <button type="button" className="st-save ln-word ln-word--on" onClick={open} disabled={!name || busy}>
        {busy ? 'Looking…' : 'Open it'}
      </button>
      {trouble && <p className="fd-trouble" role="alert">{trouble}</p>}
    </div>
  );
}

// The steps a journal is made in, ticked off as the front door finishes each
// (Miyel's pick, 2026-10-20: "steps that tick off, as each really
// finishes"). The last is the page going to the journal's own address.
const STEPS = [
  { key: 'database', said: 'Making room for your journal' },
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

function StartFold({ domain, invite, left, setLeft, making, setMaking }) {
  const [name, setName] = useState('');
  const [state, setState] = useState(null);
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
  }, [name, setLeft]);

  async function make() {
    if (state !== 'free' || making) return;
    setMaking(true);
    setDone([]);
    setTrouble('');
    const failed = said => {
      if (said?.full) setLeft(0);
      if (said?.state) setState(said.state);
      setTrouble(said?.error || 'Your journal couldn’t be made just now. Try again in a minute.');
      setMaking(false);
    };
    try {
      const res = await fetch('/api/front-door', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, invite: invite?.address || '' }),
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

  // Full while they were choosing: who invited them stays, and the line
  // under the doors says the rest.
  if (left <= 0) return <div className="fd-fold-body"><InvitedBy invite={invite} />{trouble && <p className="fd-trouble" role="alert">{trouble}</p>}</div>;

  return (
    <div className="fd-fold-body">
      <InvitedBy invite={invite} />
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
    </div>
  );
}

// ── The record wall, 2026-10-22 ───────────────────────────────────────────
// Miyel's pick of three looks: the mark and the doors at the top like a
// masthead, and under them a wall of the covers keepers on the Board logged
// lately — covers only, never who (library/front_door.js, frontDoorCovers) —
// running edge to edge and off the bottom of the screen, fading in under the
// doors. Each column drifts up at its own pace and every other one sits half
// a cover higher, so it reads as a slow wall rather than a grid (her pick of
// the refinements). The stylesheet shows three columns on a phone and more
// on a wider screen; each column's covers are drawn three times over and it
// moves by one of the three, so it never jumps. Still for anyone who asks
// for less motion; with no covers the mark and the doors stand alone in the
// middle, as before.
const WALL_COLUMNS = 10;
const WALL_EACH = 8;
function Wall({ covers }) {
  return (
    <div className="fd-wall" aria-hidden="true">
      {Array.from({ length: WALL_COLUMNS }, (_, c) => {
        const column = Array.from({ length: WALL_EACH }, (_, i) => covers[(c * WALL_EACH + i) % covers.length]);
        return (
          <div key={c} className="fd-wall-col">
            {[...column, ...column, ...column].map((src, i) => (
              <img key={i} className="fd-wall-cover" src={src} alt="" loading="lazy" decoding="async" />
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default function FrontDoor({ path = '/', domain = '', left = 0, invite = null, covers = [] }) {
  // Only an inviter whose journal answered with a name: the old gift went to
  // the deploy only then, and setup is spared asking after an address that
  // was never a journal.
  const known = invite?.name ? invite : null;
  const wall = covers.length > 0;
  return (
    <main className={'fd-page fd-mast' + (wall ? '' : ' fd-mast--bare')}>
      <div className="fd-mast-head">
        {/* A plain anchor, for the holding page's reason (ComingSoon.js):
            the root layout draws this page in place of a journal and does
            not draw again on a client-side navigation, so only a full load
            goes home. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="fd-mark" aria-label="Listening Notes"><LnMark className="fd-logo" /></a>
        <Doors domain={domain} left={left} invite={known} opening={path === '/get' ? 'start' : null} />
      </div>
      {wall && <Wall covers={covers} />}
    </main>
  );
}
