// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// components/main_components/Issue.js
// Community: the current issue (Miyel, 2026-11-11: it replaces the Board).
// One prompt, and the records keepers sent to it, ringed round it in the
// order they arrived — never ranked (library/the_issue.js).
//
// ── The ring ──────────────────────────────────────────────────────────────
// A cover per record sent, on a circle round the prompt, turning once in two
// and a half minutes. The ring has places for at least thirty-six, so it
// fills over the month and its shape is how far through the issue you are;
// past that it takes as many as there are (SLOTS). On a phone it is drawn
// larger than the screen and runs off both sides, so the covers stay big
// enough to see; on a desk it fits whole. It never becomes a grid: a grid of
// covers is what every other music app already is (the brief).
//
// A finger turns it like a dial. Let go, and the nearest cover comes to the
// top and its card slides up from the foot: their face and name, their
// stars, the record, and the writing they sent — each a door to their
// journal. A tap on a cover does the same.
//
// The one filled control is the verb, Add yours (IssuePicker.js), while the
// prompt is open and this journal has records left to send.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Fingerprint, Heart, SketchLogo, X } from '@phosphor-icons/react';
import StarRating from './StarRating';
import IssuePicker from './IssuePicker';
import { useMonthPrompt, sentRecords } from './MonthPrompt';
import { journalUrl } from '../../library/return_address';

// The least number of places on the ring, so a new issue is a ring filling
// rather than three covers spread round a whole circle.
const SLOTS = 36;
// One turn, in seconds, at rest.
const TURN_SECONDS = 150;

// One copy of the issue for the page, asked once a visit.
let held;
const listeners = new Set();
function tell(next) { held = next; listeners.forEach(fn => fn()); }
export function readIssue() {
  return fetch('/api/issue', { cache: 'no-store' })
    .then(r => (r.ok ? r.json() : { issue: null, stale: true }))
    .catch(() => ({ issue: held?.issue ?? null, stale: true }))
    .then(tell);
}
function useIssue() {
  const [, rerender] = useState(0);
  useEffect(() => {
    const heard = () => rerender(n => n + 1);
    listeners.add(heard);
    if (held === undefined) readIssue();
    return () => listeners.delete(heard);
  }, []);
  return held;
}

const starsOf = record => (record.masterpiece || record.rating === 'Masterpiece' ? 5 : parseFloat(record.rating) || 0);

function Emblems({ record, size = 14 }) {
  return (
    <span className="is-emblems">
      {record.favorite && <Heart size={size} weight="fill" color="var(--fav)" aria-label="Favorite" />}
      {record.masterpiece && <SketchLogo size={size} weight="fill" color="var(--mp)" aria-label="Masterpiece" />}
      {record.formative && <Fingerprint size={size} weight="bold" color="var(--formative)" aria-label="Formative" />}
    </span>
  );
}

// When the prompt closes, the way a person says it.
function closes(endsAt) {
  const at = Date.parse(endsAt || '');
  if (!Number.isFinite(at)) return '';
  return `closes ${new Date(at).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`;
}

// ── The card ────────────────────────────────────────────────────────────────
function Card({ record, onClose }) {
  const home = record.journal ? journalUrl(record.journal) : '';
  const post = home && record.slug ? `${home}/entries/${encodeURIComponent(record.slug)}` : home;
  return (
    <div className="is-card" role="dialog" aria-label={`${record.name || 'A keeper'} sent ${record.song || record.album}`}>
      <button type="button" className="is-card-x" onClick={onClose} aria-label="Put this down">
        <X size={16} weight="bold" />
      </button>
      <div className="is-card-who">
        {home ? (
          <a href={home} className="is-card-face" target="_blank" rel="noreferrer">
            <img src={`${home}/api/portrait`} alt="" loading="lazy" onError={e => { e.currentTarget.style.visibility = 'hidden'; }} />
          </a>
        ) : <span className="is-card-face" />}
        {home
          ? <a href={home} className="is-card-name" target="_blank" rel="noreferrer">{record.name || 'A keeper'}</a>
          : <span className="is-card-name">{record.name || 'A keeper'}</span>}
        <span className="is-card-marks">
          {starsOf(record) > 0 && <StarRating rating={starsOf(record)} size={14} animate={false} />}
          <Emblems record={record} size={14} />
        </span>
      </div>
      <h3 className="is-card-title">{record.song || record.album}</h3>
      <p className="is-card-by">{[record.song ? record.album : '', record.artist, record.year].filter(Boolean).join(' · ')}</p>
      {record.note && <p className="is-card-note">{record.note}</p>}
      {post && <a href={post} className="is-card-on" target="_blank" rel="noreferrer">On their journal</a>}
    </div>
  );
}

// ── The ring ────────────────────────────────────────────────────────────────
function Ring({ records, picked, onPick }) {
  const ring = useRef(null);
  const turn = useRef(0);
  const drag = useRef(null);
  const places = Math.max(SLOTS, records.length);
  const step = 360 / places;

  // The turn, by hand: a frame at a time while nothing holds it.
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tick = now => {
      const dt = Math.min(64, now - last);
      last = now;
      if (!drag.current && picked === null && !still && !document.hidden) turn.current -= (360 / (TURN_SECONDS * 1000)) * dt;
      if (ring.current) ring.current.style.setProperty('--turn', `${turn.current}deg`);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [picked]);

  // A cover to the top: the shortest way round from where the ring is.
  const bring = useCallback(i => {
    const want = -i * step;
    const now = turn.current;
    const delta = ((((want - now) % 360) + 540) % 360) - 180;
    const from = now;
    const to = now + delta;
    const began = performance.now();
    const go = t => {
      const p = Math.min(1, (t - began) / 420);
      const eased = 1 - (1 - p) ** 3;
      turn.current = from + (to - from) * eased;
      if (p < 1) requestAnimationFrame(go);
    };
    requestAnimationFrame(go);
    onPick(i);
  }, [step, onPick]);

  const down = e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag.current = { x: e.clientX, start: turn.current, moved: false };
  };
  const move = e => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < 6) return;
    if (!d.moved) { d.moved = true; e.currentTarget.setPointerCapture?.(e.pointerId); }
    // A finger's width of travel is a few covers' worth.
    turn.current = d.start + dx * 0.35;
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved || !records.length) return;
    // The nearest cover comes to the top.
    const at = Math.round(-turn.current / step);
    const i = ((at % places) + places) % places;
    if (i < records.length) bring(i);
    else onPick(null);
  };

  return (
    <div
      className="is-ring-floor"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <div className="is-ring" ref={ring} style={{ '--places': places }}>
        {records.map((r, i) => (
          <button
            key={r.key}
            type="button"
            className={'is-cover' + (picked === i ? ' is-cover--picked' : '')}
            style={{ '--at': `${i * step}deg` }}
            onClick={() => { if (!drag.current?.moved) bring(i); }}
            aria-label={`${r.name || 'A keeper'}: ${r.song || r.album}`}
          >
            {r.art ? <img src={r.art} alt="" loading="lazy" draggable={false} /> : <span>♪</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── The issue ───────────────────────────────────────────────────────────────
export default function Issue({ keeper = false }) {
  const read = useIssue();
  const [prompt] = useMonthPrompt(keeper);
  const [picked, setPicked] = useState(null);
  const [adding, setAdding] = useState(false);
  const issue = read?.issue || null;
  const records = issue?.records || [];

  if (read === undefined) return <p className="is-quiet">Asking for this month’s issue…</p>;
  if (!issue) {
    return read?.stale
      ? <p className="is-quiet">Listening Notes couldn’t be reached just now.</p>
      : <p className="is-quiet">No issue yet.</p>;
  }

  // Records left to send: the prompt this journal holds is this issue's and
  // still open, and fewer than three have gone.
  const mine = prompt && prompt.said ? sentRecords(prompt) : [];
  const left = prompt ? Math.max(0, (prompt.most || 1) - mine.length) : 0;
  const count = records.length === 1 ? '1 record' : `${records.length} records`;
  const meta = [`Issue ${String(issue.number).padStart(2, '0')}`, count, closes(issue.prompt.ends_at)].filter(Boolean).join(' · ');

  return (
    <div className={'is' + (picked !== null ? ' is--picked' : '')}>
      {read.stale && <p className="is-stale">Couldn’t refresh the issue; this is it as it was.</p>}
      <div className="is-stage">
        <Ring records={records} picked={picked} onPick={setPicked} />
        <div className="is-centre">
          <h2 className="is-said">{issue.prompt.said}</h2>
          <p className="is-meta">{meta}</p>
        </div>
      </div>
      {keeper && left > 0 && (
        <button type="button" className="is-add" onClick={() => setAdding(true)}>Add yours</button>
      )}
      {picked !== null && records[picked] && <Card record={records[picked]} onClose={() => setPicked(null)} />}
      {adding && (
        <IssuePicker
          prompt={prompt}
          left={left}
          sent={mine}
          onClose={() => setAdding(false)}
          onSent={() => { setAdding(false); readIssue(); }}
        />
      )}
    </div>
  );
}
