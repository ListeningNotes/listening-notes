// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// components/main_components/Headlines.js
// What your friends did, one sentence at a time, at the top of Friends.
//
// Miyel's Friends brief, step three: a rotating headline, one at a time,
// about every seven seconds, rolling up like a departures board — not a
// ticker, not a stack — between two hairlines, with pips on the right for
// how many are in rotation. Pressing one goes to that record — read inside
// this journal since 2026-10-28 — or to that person while they are logging.
//
// ── Sentences with a verb ─────────────────────────────────────────────────
// "Moonlit sat with Metro Station twice before noon", not "Moonlit · 2
// plays · 1h": the same facts, one a publication and one a dashboard. Only
// facts the public reads carry (her answers, 2026-10-26: "Only write
// headlines from what the public endpoints actually return") — a friend's
// beacon, and their feed's allow-listed fields: the record, the song for a
// note on one, the three marks, the stars, which listen of it this was, and
// when. Nothing about unfinished listens or which side was playing, which
// never leave their copy.
//
// A number inside a sentence about one evening is description, not a score
// (her answers, the same day): "twice before noon", "for the third time".
// Nothing here counts anybody's listens overall or sets one friend beside
// another.
//
// ── One per friend ────────────────────────────────────────────────────────
// Each friend logging now, or who logged in the last fortnight, gives the
// one headline their newest thing makes — newest first, a handful at most,
// so the pips stay a glance. Never ordered by how much anybody logs.
//
// ── The board holds what friends did ──────────────────────────────────────
// Never what they sent you: that waits on their face (Friend_panel.js). The
// brief's rule, and what stops Friends becoming an inbox again.
//
// It turns only while it can be read: Friends on show, the page in front,
// the board on screen, and nobody touching anything for a few seconds. A
// press holds it still.

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { when } from './Friend_panel';

const EACH_MS = 7000;
const ROLL_MS = 560;
// A friend who logged in this long is news; older is their journal's.
const NEWS_DAYS = 14;
// The most in rotation at once.
const MOST = 7;
// How long after a touch, a scroll or a key the board waits to turn again.
const STILL_FOR_MS = 4000;

const TIMES = ['', 'once', 'twice', 'three times', 'four times', 'five times', 'six times'];
const ORDINAL = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];

const yes = v => v === true || v === 'true';
const dayOf = iso => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

// The headline one friend's newest thing makes, or null. `friend` is a face
// in Friends' row: who, their beacon, and their feed's entries.
function headlineFor(friend, there) {
  const name = friend.name;
  if (!name) return null;
  const b = friend.beacon;
  if (friend.live && b?.album) {
    return {
      key: `${friend.address}/live`,
      at: Date.now(),
      label: 'Listening now',
      art: b.art || '',
      said: [{ name }, ' has ', { title: b.album }, ' on'],
      page: `/dashboard/people/${friend.person.id}`,
    };
  }
  const since = Date.now() - NEWS_DAYS * 24 * 60 * 60 * 1000;
  const newest = [...(friend.entries || [])]
    .filter(e => e.posted_at && Date.parse(e.posted_at) >= since)
    .sort((a, b2) => Date.parse(b2.posted_at) - Date.parse(a.posted_at));
  const e = newest[0];
  if (!e) return null;

  let said;
  if (e.song) {
    if (yes(e.favorite)) said = [{ name }, ' marked ', { title: e.song }, ' a ', { mark: 'fav', word: 'favorite' }];
    else if (yes(e.formative)) said = [{ name }, ' marked ', { title: e.song }, ' ', { mark: 'formative', word: 'formative' }];
    else said = [{ name }, ' wrote about ', { title: e.song }];
  } else {
    const album = { title: e.album };
    const sameDay = newest.filter(x => !x.song && x.album_key && x.album_key === e.album_key && dayOf(x.posted_at) === dayOf(e.posted_at));
    const morning = sameDay.every(x => new Date(x.posted_at).getHours() < 12);
    const nth = Number(e.listen_number) || 0;
    if (yes(e.masterpiece)) said = [{ name }, ' called ', album, ' a ', { mark: 'mp', word: 'masterpiece' }];
    else if (yes(e.formative)) said = [{ name }, ' marked ', album, ' ', { mark: 'formative', word: 'formative' }];
    else if (yes(e.favorite)) said = [{ name }, ' marked ', album, ' a ', { mark: 'fav', word: 'favorite' }];
    else if (sameDay.length >= 2 && sameDay.length < TIMES.length) said = [{ name }, ' sat with ', album, ` ${TIMES[sameDay.length]}${morning ? ' before noon' : ''}`];
    else if (nth >= 2 && nth < ORDINAL.length) said = [{ name }, ' went back to ', album, ` for the ${ORDINAL[nth]} time`];
    else if (nth >= ORDINAL.length) said = [{ name }, ' went back to ', album];
    else if (Number(e.rating_value) >= 5) said = [{ name }, ' gave ', album, ' five stars'];
    else said = [{ name }, ' sat with ', album];
  }
  return {
    key: `${friend.address}/${e.slug}`,
    at: Date.parse(e.posted_at),
    label: when(e.posted_at),
    art: e.album_art || '',
    said,
    // Their entry read inside this journal (2026-10-28), or on their site
    // for a row with no slug.
    page: e.slug ? `/dashboard/people/${friend.person.id}/${encodeURIComponent(e.slug)}` : '',
    href: e.slug ? '' : there(friend.address, ''),
  };
}

function Sentence({ said }) {
  return said.map((part, i) => {
    if (typeof part === 'string') return <span key={i}>{part}</span>;
    if (part.name) return <span key={i} className="hl-name">{part.name}</span>;
    if (part.title) return <em key={i} className="hl-title">{part.title}</em>;
    return <span key={i} className={`hl-mark hl-mark--${part.mark}`}>{part.word}</span>;
  });
}

// `friends` is Friends' row, in its order; `there(address, path)` a link
// onto a friend's journal; `onScreen` whether Friends is the pane on show.
export default function Headlines({ friends, there, onScreen = true }) {
  const items = useMemo(() => (friends || [])
    .map(f => headlineFor(f, there))
    .filter(Boolean)
    .sort((a, b) => b.at - a.at)
    .slice(0, MOST), [friends, there]);

  // The one showing, by its key, so a list that changes under it keeps it;
  // and the one rolling out above it for a moment.
  const [shown, setShown] = useState('');
  const [going, setGoing] = useState(null);
  const at = Math.max(0, items.findIndex(h => h.key === shown));
  const current = items[at] || null;

  // Whether it may turn: on show, in front, on screen, and left alone.
  const boardRef = useRef(null);
  const [inView, setInView] = useState(true);
  const [held, setHeld] = useState(false);
  const hasOne = Boolean(current);
  const touched = useRef(0);
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return undefined;
    const look = new IntersectionObserver(([f]) => setInView(f.isIntersecting));
    look.observe(el);
    return () => look.disconnect();
  }, [hasOne]);
  useEffect(() => {
    const now = () => { touched.current = Date.now(); };
    const opts = { passive: true, capture: true };
    window.addEventListener('pointerdown', now, opts);
    window.addEventListener('wheel', now, opts);
    window.addEventListener('touchmove', now, opts);
    window.addEventListener('keydown', now, opts);
    return () => {
      window.removeEventListener('pointerdown', now, opts);
      window.removeEventListener('wheel', now, opts);
      window.removeEventListener('touchmove', now, opts);
      window.removeEventListener('keydown', now, opts);
    };
  }, []);

  const many = items.length > 1;
  useEffect(() => {
    if (!many || !onScreen || !inView || held) return undefined;
    const turn = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - touched.current < STILL_FOR_MS) return;
      const from = items[at];
      const next = items[(at + 1) % items.length];
      setGoing(from);
      setShown(next.key);
    }, EACH_MS);
    return () => clearInterval(turn);
  }, [many, onScreen, inView, held, items, at]);
  useEffect(() => {
    if (!going) return undefined;
    const done = setTimeout(() => setGoing(null), ROLL_MS);
    return () => clearTimeout(done);
  }, [going]);

  if (!current) return null;

  const one = (h, how) => {
    const inner = (
      <>
        <span className="hl-art" aria-hidden="true">
          {h.art ? <img src={h.art} alt="" loading="lazy" onError={e => { e.currentTarget.style.visibility = 'hidden'; }} /> : null}
        </span>
        <span className="hl-words">
          {h.label && <span className="hl-when">{h.label}</span>}
          <span className="hl-said"><Sentence said={h.said} /></span>
        </span>
      </>
    );
    const cls = `hl-one hl-one--${how}`;
    if (how === 'out') return <span key={`out-${h.key}`} className={cls} aria-hidden="true">{inner}</span>;
    if (h.page) return <Link key={h.key} className={cls} href={h.page}>{inner}</Link>;
    if (h.href) return <a key={h.key} className={cls} href={h.href} target="_blank" rel="noopener noreferrer">{inner}</a>;
    return <span key={h.key} className={cls}>{inner}</span>;
  };

  return (
    <section
      ref={boardRef}
      className="hl"
      aria-label="Headlines"
      onPointerDown={() => setHeld(true)}
      onPointerUp={() => setHeld(false)}
      onPointerCancel={() => setHeld(false)}
      onPointerLeave={() => setHeld(false)}
    >
      <div className="hl-stack">
        {going && going.key !== current.key && one(going, 'out')}
        {one(current, going ? 'in' : 'still')}
      </div>
      {many && (
        <span className="hl-pips" aria-hidden="true">
          {items.map((h, i) => <span key={h.key} className={'hl-pip' + (i === at ? ' hl-pip--on' : '')} />)}
        </span>
      )}
    </section>
  );
}
