// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// components/main_components/Issue.js
// Community: the current issue (Miyel, 2026-11-11: it replaces the Board).
// One prompt, and the records keepers sent to it, ringed round it in the
// order they arrived — never ranked (library/the_issue.js).
//
// ── The ring ──────────────────────────────────────────────────────────────
// On a desk; a phone has the globe (below). A cover per record sent, on a circle round the prompt, turning once in two
// and a half minutes. The ring has places for at least thirty-six, so it
// fills over the month and its shape is how far through the issue you are;
// past that it takes as many as there are (SLOTS). That is on a desk; on a
// phone the same records are a globe under the prompt (Globe, below). It
// never becomes a grid: a grid of covers is what every other music app
// already is (the brief).
//
// A finger turns it like a dial. Let go, and the nearest cover comes to the
// top and its card slides up from the foot: the album, and a voice for each
// keeper who sent it — their face and name, their stars and the writing
// they sent, each a door to their journal. A tap on a cover does the same.
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
// One album and everybody who sent it to this issue: the album once at the
// top, then a voice each — their face and name, their stars and marks, the
// writing they sent, and Read more, their post on their own journal. The
// writing is what they sent, nothing more (the brief).
function Voice({ record }) {
  const home = record.journal ? journalUrl(record.journal) : '';
  const post = home && record.slug ? `${home}/entries/${encodeURIComponent(record.slug)}` : home;
  return (
    <div className="is-voice">
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
      {record.note && <p className="is-card-note">{record.note}</p>}
      {post && <a href={post} className="is-card-on" target="_blank" rel="noreferrer">Read more</a>}
    </div>
  );
}

function Card({ album, onClose }) {
  return (
    <div className="is-card" role="dialog" aria-label={album.song || album.album}>
      <button type="button" className="is-card-x" onClick={onClose} aria-label="Put this down">
        <X size={16} weight="bold" />
      </button>
      <h3 className="is-card-title">{album.song || album.album}</h3>
      <p className="is-card-by">{[album.song ? album.album : '', album.artist, album.year].filter(Boolean).join(' · ')}</p>
      <div className="is-voices">
        {album.voices.map(v => <Voice key={v.key} record={v} />)}
      </div>
    </div>
  );
}

// The records sent, one per album (or song): sent twice, it is one cover
// with two voices, placed where it first arrived.
function byAlbum(records) {
  const albums = [];
  const seen = new Map();
  for (const r of records) {
    const id = [r.album, r.artist, r.song].map(x => String(x || '').trim().toLowerCase()).join('|');
    if (seen.has(id)) { seen.get(id).voices.push(r); continue; }
    const album = { key: r.key, album: r.album, artist: r.artist, year: r.year, art: r.art, song: r.song, voices: [r] };
    seen.set(id, album);
    albums.push(album);
  }
  return albums;
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
            aria-label={r.song || r.album}
          >
            {r.art ? <img src={r.art} alt="" loading="lazy" draggable={false} /> : <span>♪</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── The globe ───────────────────────────────────────────────────────────────
// On a phone (Miyel, 2026-11-13: "an ode to" the first Echo dashboard): the
// records on the surface of a ball under the prompt, turning slowly. A finger
// rolls it any way and lets it coast; a tap turns that cover to face you and
// opens its card. Each cover is placed by hand a frame at a time — a point on
// the ball, turned, then drawn smaller and shaded the further back it is.
const GLOBE_BOX = 120;
const GLOBE_TILT = 0.12;

function globePlace(i, n, R, W) {
  if (n === 1) return { x: 0, y: 0, z: 0, size: W * 0.36 };
  const y = 1 - (2 * (i + 0.5)) / n;
  const across = Math.sqrt(1 - y * y);
  const turn = i * 2.399963; // the golden angle, so no two crowd
  const r = R * (n < 6 ? 0.8 : 1.05);
  return {
    x: r * across * Math.sin(turn), y: r * y, z: r * across * Math.cos(turn),
    size: Math.max(48, Math.min(W * 0.3, (R * 2.6) / Math.sqrt(n))),
  };
}
const wrapPi = a => { const b = (a + Math.PI) % (2 * Math.PI); return (b < 0 ? b + 2 * Math.PI : b) - Math.PI; };

function Globe({ records, picked, onPick }) {
  const floor = useRef(null);
  const covers = useRef([]);
  const view = useRef({ yaw: 0, pitch: GLOBE_TILT, vYaw: 0, vPitch: 0, aim: null, restUntil: 0 });
  const drag = useRef(null);
  const n = records.length;

  // The size of the floor, read once a frame is cheap; R follows it.
  const measure = () => {
    const box = floor.current;
    const W = box?.clientWidth || 360, H = box?.clientHeight || 600;
    return { W, H, R: Math.min(W * 0.36, H * 0.26), cx: W / 2, cy: H * 0.56 };
  };

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tick = now => {
      const dt = Math.min(48, now - last);
      last = now;
      const v = view.current;
      const { W, R, cx, cy } = measure();
      if (v.aim) {
        const k = 1 - Math.exp(-dt / 140);
        v.yaw += (v.aim.yaw - v.yaw) * k;
        v.pitch += (v.aim.pitch - v.pitch) * k;
        if (Math.abs(v.aim.yaw - v.yaw) < 0.002 && Math.abs(v.aim.pitch - v.pitch) < 0.002) v.aim = null;
      } else if (!drag.current?.moved) {
        if (Math.abs(v.vYaw) > 0.00004 || Math.abs(v.vPitch) > 0.00004) {
          v.yaw += v.vYaw * dt; v.vYaw *= Math.pow(0.9955, dt);
          v.pitch = Math.max(-1.1, Math.min(1.1, v.pitch + v.vPitch * dt)); v.vPitch *= Math.pow(0.993, dt);
          v.restUntil = now + 2500;
        } else if (picked === null && !still && !document.hidden && now > v.restUntil) {
          v.yaw -= ((2 * Math.PI) / 70000) * dt;
          v.pitch += (GLOBE_TILT - v.pitch) * (1 - Math.exp(-dt / 1200));
        }
      }
      const D = R * 3.2;
      const cyw = Math.cos(v.yaw), syw = Math.sin(v.yaw), cp = Math.cos(v.pitch), sp = Math.sin(v.pitch);
      for (let i = 0; i < n; i++) {
        const el = covers.current[i];
        if (!el) continue;
        const p = globePlace(i, n, R, W);
        const x1 = p.x * cyw + p.z * syw, z1 = -p.x * syw + p.z * cyw;
        const y2 = p.y * cp + z1 * sp, z2 = -p.y * sp + z1 * cp;
        const s = D / (D - z2);
        el.style.transform = `translate3d(${cx + x1 * s}px, ${cy + y2 * s}px, 0) scale(${((p.size / GLOBE_BOX) * s * (i === picked ? 1.15 : 1)).toFixed(4)})`;
        el.style.zIndex = String(Math.round(1000 + z2));
        el.style.setProperty('--back', Math.max(0, Math.min(1, (R - z2) / (2 * R))).toFixed(3));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [n, picked]);

  // The turn that brings cover i to face you.
  const bring = useCallback(i => {
    const v = view.current;
    const { W, R } = measure();
    const p = globePlace(i, n, R, W);
    v.vYaw = v.vPitch = 0;
    v.aim = { yaw: v.yaw + wrapPi(-Math.atan2(p.x, p.z) - v.yaw), pitch: -Math.atan2(p.y, Math.hypot(p.x, p.z)) };
    onPick(i);
  }, [n, onPick]);

  const down = e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const v = view.current;
    drag.current = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t: performance.now(), vx: 0, vy: 0, yaw: v.yaw, pitch: v.pitch, moved: false };
  };
  const move = e => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 6) return;
    if (!d.moved) { d.moved = true; view.current.aim = null; e.currentTarget.setPointerCapture?.(e.pointerId); }
    const now = performance.now(), dt = Math.max(8, now - d.t);
    // The finger's speed, smoothed, so one jittery sample does not decide a throw.
    d.vx = d.vx * 0.5 + (0.5 * (e.clientX - d.lx)) / dt;
    d.vy = d.vy * 0.5 + (0.5 * (e.clientY - d.ly)) / dt;
    d.lx = e.clientX; d.ly = e.clientY; d.t = now;
    const { R } = measure();
    view.current.yaw = d.yaw + dx / (R * 1.4);
    view.current.pitch = Math.max(-1.1, Math.min(1.1, d.pitch + dy / (R * 1.4)));
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    const { R } = measure();
    const fresh = performance.now() - d.t < 80;
    view.current.vYaw = fresh ? d.vx / (R * 1.4) : 0;
    view.current.vPitch = fresh ? d.vy / (R * 1.4) : 0;
  };

  return (
    <div className="is-globe" ref={floor} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      {records.map((r, i) => (
        <button
          key={r.key}
          ref={el => { covers.current[i] = el; }}
          type="button"
          className={'is-orb' + (picked === i ? ' is-orb--picked' : '')}
          onClick={() => { if (!drag.current?.moved) bring(i); }}
          aria-label={r.song || r.album}
        >
          {r.art ? <img src={r.art} alt="" loading="lazy" draggable={false} /> : <span>♪</span>}
          <i className="is-orb-back" />
        </button>
      ))}
    </div>
  );
}

// Whether the stage is wide enough for the ring (a desk) rather than the
// globe (a phone): measured on the stage itself, never the window.
function useWide(box) {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    if (!box) return;
    const watch = new ResizeObserver(() => setWide(box.clientWidth >= 700));
    watch.observe(box);
    return () => watch.disconnect();
  }, [box]);
  return wide;
}

// ── The issue ───────────────────────────────────────────────────────────────
export default function Issue({ keeper = false }) {
  const read = useIssue();
  const [prompt] = useMonthPrompt(keeper);
  const [picked, setPicked] = useState(null);
  const [adding, setAdding] = useState(false);
  const [stage, setStage] = useState(null);
  const wide = useWide(stage);
  const issue = read?.issue || null;
  const records = issue?.records || [];
  const albums = byAlbum(records);

  if (read === undefined) return <p className="is-quiet">Fetching this month’s question…</p>;
  if (!issue) {
    return read?.stale
      ? <p className="is-quiet">Listening Notes couldn’t be reached just now.</p>
      : <p className="is-quiet">No question yet.</p>;
  }

  // Records left to send: the prompt this journal holds is this issue's and
  // still open, and fewer than three have gone.
  const mine = prompt && prompt.said ? sentRecords(prompt) : [];
  const left = prompt ? Math.max(0, (prompt.most || 1) - mine.length) : 0;
  const count = albums.length === 1 ? '1 album' : `${albums.length} albums`;
  // The month, not "Issue 01": the word waits for the magazine and its back
  // issues (Miyel, 2026-11-13). The number is still worked out for then.
  const month = issue.prompt.month || (Date.parse(issue.prompt.ends_at || '') ? new Date(issue.prompt.ends_at).toLocaleDateString('en-US', { month: 'long' }) : '');
  const meta = [month, count, closes(issue.prompt.ends_at)].filter(Boolean).join(' · ');

  return (
    <div className={'is' + (picked !== null ? ' is--picked' : '')}>
      {read.stale && <p className="is-stale">Couldn’t refresh this month’s question; this is how it was.</p>}
      {issue.standIn && <p className="is-stale">A stand-in issue of your own records, for trying the globe.</p>}
      <div className={'is-stage' + (wide ? '' : ' is-stage--globe')} ref={setStage}>
        {wide
          ? <Ring records={albums} picked={picked} onPick={setPicked} />
          : <Globe records={albums} picked={picked} onPick={setPicked} />}
        <div className="is-centre">
          <h2 className="is-said">{issue.prompt.said}</h2>
          <p className="is-meta">{meta}</p>
        </div>
      </div>
      {keeper && left > 0 && (
        <button type="button" className="is-add" onClick={() => setAdding(true)}>Add yours</button>
      )}
      {picked !== null && albums[picked] && <Card album={albums[picked]} onClose={() => setPicked(null)} />}
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
