// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// app/dashboard/people/[id]/page.js
// A friend's journal page, on your own copy.
//
// ── Their journal, drawn by yours, 2026-10-26 ─────────────────────────────
// Miyel's Friends answers: "the page is mine, the data is theirs." It was
// your page about them, a report — Compare's numbers and lists — and it is
// now their journal as your journal draws it, laid out as home is (Miyel:
// "just like an owners page"): home's top row with their face and name,
// then their beacon with the three before it, the line and the wall, the
// same components home uses handed their rows, so a web of sites reads as
// one app. Nothing
// is framed and nothing of theirs is drawn by them; the records come from
// their public feed and their beacon, the allow-listed reads every journal
// already answers. A record opens their entry inside this journal since
// 2026-10-28 (app/dashboard/people/[id]/[slug]), read from their journal as
// it opens and kept nowhere.
//
// Their public feed is read in the browser, as Compare and People always
// have read it; their beacon comes through this copy's server, as People's
// does (below); your own records and the sends from them come from this
// copy. Nothing is stored and nobody learns they were looked at.
//
// ── Compare is a view here, not the page ──────────────────────────────────
// Opened in place at the top and rolled up again (her pick, 2026-10-26). It
// is main's versus screen (2026-10-24, brought in 2026-10-28): the two of
// you, a colour each and nobody's side bigger; face to face, your share of
// your records against theirs by genre, decade, artist, stars or how new;
// the facts as cards swiped through (kept above the records, her call
// 2026-10-28); and a wall of the records you share. A shared record opens
// their post with your listen beside theirs (ListenCompare.js) — "comparing
// a listen vs comparing with a full person", her split the same day: this
// is the person, the post is the listen. **Nobody wins**: no points, no
// score, nothing ranked (AGENTS, Never).
//
// By their number in your book, or — main's, for a keeper off the Board's
// Compare — by their address, when the top row says Add instead of Added
// and nothing of theirs opens inside this journal.
//
// The row carries Compare and Added — no Wave for somebody already added,
// her call — and the foot of the wall carries what you have sent them that
// is still out (the inbox's Sent door, for one person), Keep private and
// Remove. Pin went, her call.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { CaretDown, CaretLeft, CaretRight, Heart, Printer, Shuffle, SketchLogo, Sparkle, User, UserCheck, UserPlus, X } from '@phosphor-icons/react';
import StarRating from '../../../../components/main_components/StarRating';
import Journal, { foldForSearch, gatherAlbums } from '../../../../components/main_components/Journal';
import { BeaconCard } from '../../../../components/main_components/ListeningBeacon';
import SentList from '../../../../components/main_components/SentList';
import About from '../../../../components/main_components/About';
import { Bookplate, Visiting } from '../../../../components/main_components/Bookplate';
import { countHearts, lineUp } from '../../../../components/main_components/ListenCompare';
import { albumKey } from '../../../../hooks/useListeningBeacon';
import { fillFriends, useFriendsBeacons } from '../../../../hooks/useFriendsBeacons';
import { journalUrl, tidyJournal } from '../../../../library/return_address';
import { arrivingBack, handOff, handOffCompare, handOffOrder } from '../../../../library/handoff';
import { foldGenre } from '../../../../library/music_data_api';
import { DIRECTORY_URL } from '../../../../library/version';

const EACH_MS = 8000;
// The covers beside their beacon, as home stands its own three.
const RECENTS = 3;
// Where the wall's view is remembered, apart from home's and People's.
const VIEW_KEY = 'ln-person-view';

// ── Their card's counts, from their records, 2026-10-29 ──────────────────
// What /api/public/stamps counts, worked out from the feed this page has
// already read, for a journal too old to let another address read its own
// (app/api/public/card): albums, songs, the two marks a card prints, the
// first listen, and the three genres it leans on.
function stampsFrom(rows = []) {
  const albums = rows.filter(e => !e.song);
  const marked = (e, key) => e[key] === true || e[key] === 'true';
  const genres = new Map();
  for (const e of rows) {
    const g = String(e.genre || '').trim();
    if (!g) continue;
    const had = genres.get(g.toLowerCase()) || { name: g, n: 0 };
    had.n += 1;
    genres.set(g.toLowerCase(), had);
  }
  const first = rows.reduce((at, e) => (e.posted_at && (!at || e.posted_at < at) ? e.posted_at : at), null);
  return {
    records: albums.length,
    songs: rows.length - albums.length,
    masterpieces: albums.filter(e => marked(e, 'masterpiece')).length,
    formative: albums.filter(e => marked(e, 'formative')).length,
    first_listen: first,
    genres: [...genres.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)).slice(0, 3).map(g => g.name),
  };
}

const num = v => (v === null || v === undefined || v === '' ? null : Number(v));
const newestFirst = rows => [...rows].sort((a, b) => new Date(b.posted_at) - new Date(a.posted_at));

// ── Compare's own pieces, from main (2026-10-24) ──────────────────────────
// Masterpieces drawn one mark each up to this many; past it, one mark and
// the number.
const MARKS_DRAWN = 5;

const said = v => { const n = num(v); return n === null ? '' : String(Math.round(n * 100) / 100); };
const some = (n, one, many) => (n === 1 ? one : many.replace('#', n));
const isOn = v => v === true || v === 'true';
// A genre as the wall folds it (foldGenre), and Rap with Hip-Hop/Rap, which
// Apple files records under both ways: two journals are only compared fairly
// when one genre is not two rows. A genre typed by hand as a list is its
// first.
const genreOf = entry => {
  const g = foldGenre(String(entry?.genre || '').split(/[,;]/)[0]);
  return (g.toLowerCase() === 'rap' ? 'Hip-Hop/Rap' : g) || null;
};
const yearOf = entry => String(entry?.year || '').match(/[0-9]{4}/)?.[0] || null;
const decadeOf = entry => { const y = yearOf(entry); return y ? `${y.slice(0, 3)}0s` : null; };
// The answer given most often, the first to reach it on a tie; none when
// nothing was given at least `least` times. Compared folded, so two
// spellings of one artist are one answer.
function mostOf(values, least = 1) {
  const seen = new Map();
  let top = null;
  for (const v of values) {
    if (!v) continue;
    const k = v.toLowerCase();
    const n = (seen.get(k)?.n || 0) + 1;
    seen.set(k, { v: seen.get(k)?.v || v, n });
    if (top === null || n > seen.get(top).n) top = k;
  }
  return top !== null && seen.get(top).n >= least ? seen.get(top).v : null;
}
const monthOf = when => {
  const d = new Date(when);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
};

// One journal as a listener, from its entries: album listens only, one per
// record where a record is meant, every listen where listens are counted.
// A record is { entry, says }, `says` the small line under its title.
function tasteOf(entries) {
  const records = [...latestPerKey(entries).values()];
  const listens = newestFirst(entries.filter(e => e.album_key && !e.song));
  let oldest = null;
  for (const e of records) if (yearOf(e) && (!oldest || yearOf(e) < yearOf(oldest))) oldest = e;
  // How many times a record was listened to is the journal's own count, on
  // every listen, and not a count of entries by title and artist: two albums
  // by one artist can share a name (Miyel, 2026-10-24, two of them, years
  // apart), and the journal tells them apart where a title cannot.
  let returned = null;
  for (const e of listens) if ((num(e.listen_total) || 0) > 1 && (!returned || num(e.listen_total) > num(returned.listen_total))) returned = e;
  const masterpiece = listens.find(e => isOn(e.masterpiece)) || null;
  const first = listens[listens.length - 1] || null;
  return {
    genre: mostOf(records.map(genreOf)),
    decade: mostOf(records.map(decadeOf)),
    // An artist is only "top" with two records or more; with one each, the
    // pick would be a coin toss.
    artist: mostOf(records.map(e => String(e.artist || '').trim()), 2),
    oldest: oldest && { entry: oldest, says: yearOf(oldest) },
    masterpiece: masterpiece && { entry: masterpiece, says: masterpiece.artist },
    returned: returned && { entry: returned, says: `${num(returned.listen_total)} listens` },
    first: first && { entry: first, says: monthOf(first.posted_at) },
  };
}

// ── Face to face ──────────────────────────────────────────────────────────
// How each of you spreads over one question's answers — which genres, which
// decades — as the share of your own records, so a journal of three hundred
// and one of thirty are set side by side fairly. Records are album listens,
// one per record, as everywhere on this page.
function spread(mine, theirs, answerOf) {
  const tally = records => {
    const m = new Map();
    let total = 0;
    for (const e of records) {
      const a = answerOf(e);
      if (!a) continue;
      total += 1;
      const id = a.toLowerCase();
      m.set(id, { label: m.get(id)?.label || a, n: (m.get(id)?.n || 0) + 1 });
    }
    return { m, total };
  };
  const a = tally(mine);
  const b = tally(theirs);
  if (!a.total && !b.total) return [];
  return [...new Set([...a.m.keys(), ...b.m.keys()])].map(id => ({
    id,
    label: (a.m.get(id) || b.m.get(id)).label,
    you: a.total ? (a.m.get(id)?.n || 0) / a.total : 0,
    them: b.total ? (b.m.get(id)?.n || 0) / b.total : 0,
  }));
}

const starsOf = e => {
  const v = num(e.rating_value);
  if (v === null) return null;
  const half = Math.round(v * 2) / 2;
  if (half < 3) return 'Under 3';
  return `${String(Math.floor(half))}${half % 1 ? '½' : ''} ${half === 1 ? 'star' : 'stars'}`;
};
const STAR_ORDER = ['5 stars', '4½ stars', '4 stars', '3½ stars', '3 stars', 'Under 3'];
// How old a record was when it was logged: the year it was logged less the
// year it came out.
const AGES = ['That year', '1–2 years old', '3–9 years old', '10–29 years old', '30+ years old'];
const ageOf = e => {
  const made = Number(yearOf(e));
  const heard = new Date(e.posted_at).getFullYear();
  if (!made || !heard) return null;
  const gap = heard - made;
  return gap <= 0 ? AGES[0] : gap <= 2 ? AGES[1] : gap <= 9 ? AGES[2] : gap <= 29 ? AGES[3] : AGES[4];
};
const both = r => r.you + r.them;
const inOrder = order => (x, y) => order.indexOf(x.label) - order.indexOf(y.label);
// The views, in the menu's order. `most` keeps the longest lists to the
// answers that say the most; `together` is when a row counts as one you
// share, and is lit.
const LENSES = [
  { key: 'genres', label: 'Genres', answerOf: genreOf, sort: (x, y) => both(y) - both(x), most: 8 },
  { key: 'decades', label: 'Decades', answerOf: decadeOf, sort: (x, y) => x.label.localeCompare(y.label) },
  {
    key: 'artists', label: 'Artists', answerOf: e => String(e.artist || '').trim() || null, most: 8,
    // The artists you both logged first, then each of yours and theirs.
    sort: (x, y) => (Math.min(y.you, y.them) > 0) - (Math.min(x.you, x.them) > 0) || both(y) - both(x),
    together: r => r.you > 0 && r.them > 0,
  },
  { key: 'stars', label: 'Stars', answerOf: starsOf, sort: inOrder(STAR_ORDER) },
  { key: 'age', label: 'How new', answerOf: ageOf, sort: inOrder(AGES) },
];
const TOGETHER_LEAST = 0.1;

// One entry per record, the most recent (DECISIONS: never average across
// listens). Album listens only, 2026-09-24: a track note rates one song, and
// set against somebody's whole-record score it would be a comparison of two
// different things. An older copy sends no `song`, and its notes cannot be
// told apart — which only happens once they have one.
function latestPerKey(entries) {
  const latest = new Map();
  for (const e of newestFirst(entries)) if (e.album_key && !e.song && !latest.has(e.album_key)) latest.set(e.album_key, e);
  return latest;
}

// The nearest box that scrolls: the layer's sheet when this arrives over the
// journal, nothing (the page itself) when it is opened on its own.
function scrollingBox(el) {
  for (let at = el?.parentElement; at; at = at.parentElement) {
    const y = getComputedStyle(at).overflowY;
    if (y === 'auto' || y === 'scroll') return at;
  }
  return null;
}

function Face({ address = '', src = '' }) {
  return (
    <span className="pn-face" aria-hidden="true">
      <User size={22} weight="regular" />
      <img src={src || `${journalUrl(address)}/api/portrait`} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} />
    </span>
  );
}


// The two of you face to face over one question (Miyel, 2026-10-24: "i
// like the bars with different views"): the answers down the middle, your
// share of your records growing to the left in your colour and theirs to the
// right in theirs. An even shape is taste that matches; a lopsided one sways,
// and shows which way. An answer you both give a tenth of your records or
// more is lit. The menu over it changes the question, as the wall's views
// menu changes its order, and is drawn the same.
function FaceToFace({ lenses, name }) {
  const [key, setKey] = useState(lenses[0]?.key);
  const [open, setOpen] = useState(false);
  const lens = lenses.find(l => l.key === key) || lenses[0];
  useEffect(() => {
    if (!open) return undefined;
    const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open]);
  if (!lens) return null;
  const top = Math.max(...lens.rows.map(r => Math.max(r.you, r.them)), 0.0001);
  const pct = v => `${Math.round(v * 100)}%`;
  return (
    <section className="pn-ftf" aria-label={`${lens.label}: you and ${name}`}>
      <div className="pn-ftf-head">
        <span className="pn-ftf-who pn-ftf-who--you">You</span>
        <span className="pn-ftf-lens">
          {open && <div className="arc-views-scrim" onClick={() => setOpen(false)} />}
          <button type="button" className="arc-ctl pn-ftf-now" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="menu">
            {lens.label}<CaretDown size={11} weight="bold" aria-hidden="true" />
          </button>
          {open && (
            <span className="arc-views pn-ftf-menu" role="menu" aria-label="Compare by">
              {lenses.map(l => (
                <button
                  key={l.key}
                  type="button"
                  role="menuitemradio"
                  aria-checked={l.key === lens.key}
                  className={'ln-word arc-views-word' + (l.key === lens.key ? ' ln-word--on' : '')}
                  onClick={() => { setKey(l.key); setOpen(false); }}
                >
                  {l.label}
                </button>
              ))}
            </span>
          )}
        </span>
        <span className="pn-ftf-who pn-ftf-who--them">{name}</span>
      </div>
      <div className="pn-ftf-rows" key={lens.key}>
        {lens.rows.map((r, i) => (
          <div
            key={r.id}
            className={'pn-ftf-row' + (r.together ? ' pn-ftf-row--both' : '')}
            style={{ '--i': i }}
            aria-label={`${r.label}: you ${pct(r.you)}, ${name} ${pct(r.them)}`}
          >
            <span className="pn-ftf-side pn-ftf-side--you" aria-hidden="true">
              {r.you > 0 && <span className="pn-ftf-pct">{pct(r.you)}</span>}
              <i style={{ width: `${(r.you / top) * 100}%` }} />
            </span>
            <span className="pn-ftf-label" aria-hidden="true">{r.label}</span>
            <span className="pn-ftf-side pn-ftf-side--them" aria-hidden="true">
              <i style={{ width: `${(r.them / top) * 100}%` }} />
              {r.them > 0 && <span className="pn-ftf-pct">{pct(r.them)}</span>}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── The facts ─────────────────────────────────────────────────────────────
// A card each, swiped through sideways (Miyel, 2026-10-24: "maybe they are
// a big screen swiped through" — a list of them ran too long down the
// page). On a card, the question, then your answer on your side and theirs
// on theirs, each in its owner's colour, as the faces above stand. When the two of you give the
// same answer it is said once, in the middle, with a sparkle either side —
// the fun of it is finding out ("this is fun to do. it should feel that
// way"). The marks wear their own emblems, as the entry wears them: stars
// as stars, Masterpieces as the Masterpiece mark, favourite songs as hearts;
// the questions wear none ("we went overboard with icons"). Nothing adds up
// to a score: no card has a winner drawn on it.
function sameAnswer(f) {
  const { you, them } = f;
  if (you === null || you === undefined || them === null || them === undefined) return false;
  if (f.kind === 'record') return you.entry.album_key === them.entry.album_key;
  if (f.kind === 'word') return you.toLowerCase() === them.toLowerCase();
  if (f.kind === 'stars') return you.toFixed(1) === them.toFixed(1);
  return you > 0 && you === them;
}

// One side's answer, in the shape the question asks for.
function Answer({ f, side }) {
  const v = f[side];
  if (v === null || v === undefined) return <span className="pn-fact-none">—</span>;
  if (f.kind === 'word') return <span className="pn-fact-word">{v}</span>;
  if (f.kind === 'record') {
    return (
      <span className="pn-fact-record">
        <span className="pn-fact-cover">{v.entry.album_art ? <img src={v.entry.album_art} alt="" loading="lazy" /> : null}</span>
        <span className="pn-fact-album">{v.entry.album}</span>
        {v.says && <span className="pn-fact-says">{v.says}</span>}
      </span>
    );
  }
  if (f.kind === 'stars') {
    return (
      <span className="pn-fact-stars">
        <StarRating rating={Math.round(v * 2) / 2} size={22} />
        <span className="pn-fact-says">{v.toFixed(1)}</span>
      </span>
    );
  }
  if (f.kind === 'marks') {
    if (!v) return <span className="pn-fact-none">—</span>;
    return (
      <span className="pn-fact-marks">
        {v <= MARKS_DRAWN
          ? Array.from({ length: v }, (_, i) => <SketchLogo key={i} size={24} weight="fill" />)
          : <><SketchLogo size={24} weight="fill" /><span className="pn-fact-word">×{v}</span></>}
      </span>
    );
  }
  return <span className="pn-fact-hearts"><Heart size={22} weight="fill" /><span className="pn-fact-word">{v}</span></span>;
}

function FactCard({ f, name }) {
  const same = sameAnswer(f);
  const said = v => (v === null || v === undefined ? 'none' : typeof v === 'object' ? v.entry.album : f.kind === 'stars' ? v.toFixed(1) : v);
  return (
    <article
      className={'pn-card' + (same ? ' pn-card--same' : '')}
      aria-label={same ? `${f.label}: both of you, ${said(f.you)}` : `${f.label}: you, ${said(f.you)}; ${name}, ${said(f.them)}`}
    >
      <div className="pn-card-face" aria-hidden="true">
        <div className="pn-card-q">{f.label}</div>
        {f.sub && <div className="pn-card-sub">{f.sub}</div>}
        {same ? (
          <div className="pn-card-both">
            <Sparkle size={14} weight="fill" className="pn-sparkle" />
            <Answer f={f} side="you" />
            <Sparkle size={14} weight="fill" className="pn-sparkle" />
          </div>
        ) : (
          <div className="pn-card-vs">
            <div className="pn-card-side"><Answer f={f} side="you" /></div>
            <div className="pn-card-side pn-card-side--them"><Answer f={f} side="them" /></div>
          </div>
        )}
      </div>
    </article>
  );
}

function Facts({ facts, name }) {
  const strip = useRef(null);
  const [on, setOn] = useState(0);
  const cards = [...facts.taste, ...facts.each];
  const go = i => {
    const el = strip.current;
    if (!el) return;
    const to = Math.max(0, Math.min(cards.length - 1, i));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: to * el.clientWidth, behavior: reduced ? 'auto' : 'smooth' });
  };
  const onScroll = () => {
    const el = strip.current;
    if (el && el.clientWidth) setOn(Math.round(el.scrollLeft / el.clientWidth));
  };
  return (
    <section className="pn-facts">
      {cards.length > 0 && (
        <>
          {/* data-slide: a drag across the cards is theirs, never the sheet's
              (LayerEntry). */}
          <div className="pn-cards" ref={strip} onScroll={onScroll} data-slide>
            {cards.map(f => <FactCard key={f.label} f={f} name={name} />)}
          </div>
          {cards.length > 1 && (
            <div className="pn-dots">
              <button type="button" className="pn-dots-step" onClick={() => go(on - 1)} disabled={on === 0} aria-label="The fact before">
                <CaretLeft size={14} weight="regular" aria-hidden="true" />
              </button>
              {cards.map((f, i) => (
                <button key={f.label} type="button" className={'pn-dot' + (i === on ? ' pn-dot--on' : '')} onClick={() => go(i)} aria-label={f.label} aria-current={i === on} />
              ))}
              <button type="button" className="pn-dots-step" onClick={() => go(on + 1)} disabled={on === cards.length - 1} aria-label="The next fact">
                <CaretRight size={14} weight="regular" aria-hidden="true" />
              </button>
            </div>
          )}
        </>
      )}
      <div className="pn-facts-together">
        {facts.together.map(f => (
          <div key={f.label} className="pn-fact">
            <span className="pn-fact-n">{f.value}</span>
            <span className="pn-fact-label">{f.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// Who the page is about: somebody in the address book, by their number in
// it, or any journal at all, by its address — a keeper off the Board you
// have never added (Miyel, 2026-10-24: "i want to look here at a glance and
// know how our taste compares even if its a stranger"). A journal that is in
// the book after all is read as the book has them. Nobody is told they were
// looked at: everything about them is read from their public feed.
async function whoIs(id) {
  const said = decodeURIComponent(String(id || ''));
  if (/^[0-9]+$/.test(said)) {
    const r = await fetch(`/api/people/${said}`);
    const d = r.ok ? await r.json() : {};
    return d.person || false;
  }
  const address = tidyJournal(said);
  if (!address || !address.includes('.')) return false;
  const r = await fetch('/api/people');
  const d = r.ok ? await r.json() : {};
  return (d.people || []).find(p => tidyJournal(p.address) === address) || { address, name: '' };
}

export default function PersonPage({ layered = false }) {
  const { id } = useParams();
  const router = useRouter();
  // The way back, in the header's left slot: to the book or the feed this
  // opened from, or to the book when there is nothing behind it. The pull
  // down and Escape still work; this is the one that can be seen.
  const goBack = () => {
    // The book this closes onto is returned to, not arrived at: it draws
    // at rest rather than rising again (handoff.js, arrivingBack).
    arrivingBack();
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/dashboard/people');
  };
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  // null until asked; false when nobody has that id.
  const [person, setPerson] = useState(null);
  // Their feed: null until asked, { entries, name } when it answered,
  // { failed: true } when it did not.
  const [theirs, setTheirs] = useState(null);
  // Your own records: null until they have been read, so Compare does not
  // say there is nothing in common while they are on their way.
  const [mine, setMine] = useState(null);
  const [sent, setSent] = useState([]);
  // What you put them onto: what came back and what is still out, so a
  // shared record can say who put whom onto it.
  const [cameBack, setCameBack] = useState([]);
  const [out, setOut] = useState([]);
  const [adding, setAdding] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [sure, setSure] = useState(false);
  const [removing, setRemoving] = useState(false);

  const rootRef = useRef(null);
  // Handed to the wall, which draws more as its foot nears the edge of this.
  // Set in a layout effect so it is in place before the wall's own effects
  // first look at it.
  const scroller = useRef(null);
  useLayoutEffect(() => { scroller.current = scrollingBox(rootRef.current); });

  useEffect(() => {
    fetch('/api/auth/check').then(r => r.json()).then(d => setAuthed(!!d.authed)).catch(() => {}).finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (!authed || !id) return undefined;
    let gone = false;
    whoIs(id)
      .then(p => {
        if (gone) return;
        setPerson(p);
        if (!p) return;
        const theirAddress = tidyJournal(p.address);
        fetch(`${journalUrl(p.address)}/api/public/entries`, { signal: AbortSignal.timeout(EACH_MS) })
          .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
          .then(j => { if (!gone) setTheirs({ entries: j.entries || [], name: String(j.keeper_name || '').trim() || p.name || '' }); })
          .catch(() => { if (!gone) setTheirs({ failed: true, entries: [], name: p.name || '' }); });
        fetch('/api/entries').then(r => r.json()).then(d2 => { if (!gone) setMine(d2.entries || []); }).catch(() => { if (!gone) setMine([]); });
        // Every send this copy has, narrowed to theirs by the address the
        // send carried — the same spelling the book keeps.
        fetch('/api/submissions').then(r => r.json()).then(d3 => {
          if (gone) return;
          const theirsOnly = (d3.submissions || []).filter(s => tidyJournal(s.sender_url) === theirAddress);
          setSent(theirsOnly);
        }).catch(() => {});
        fetch('/api/came-back').then(r => (r.ok ? r.json() : { cameBack: [] })).then(d4 => {
          if (!gone) setCameBack((d4.cameBack || []).filter(c => tidyJournal(c.journal) === theirAddress));
        }).catch(() => {});
        fetch('/api/sent').then(r => (r.ok ? r.json() : { sent: [] })).then(d5 => {
          if (!gone) setOut((d5.sent || []).filter(x => tidyJournal(x.journal) === theirAddress));
        }).catch(() => {});
      })
      .catch(() => { if (!gone) setPerson(false); });
    return () => { gone = true; };
  }, [authed, id]);

  // ── Their beacon, through this copy, 2026-10-26 ─────────────────────────
  // People's own round (useFriendsBeacons): this copy's server asks their
  // journal and hands the answer over. A browser cannot read another
  // journal's beacon itself — the route sends no leave to be read from
  // another address, and an older copy never will — which is why the first
  // version of this page showed none on the sandbox. A friend past the
  // timer's first thirty is asked once when the page opens.
  const address = person ? person.address : '';
  const { friends } = useFriendsBeacons();
  const theirRow = address ? friends.find(f => tidyJournal(f.address) === tidyJournal(address)) : null;
  const unheard = Boolean(address) && (!theirRow || theirRow.state === 'unknown');
  useEffect(() => { if (unheard) fillFriends(); }, [unheard]);
  const beacon = theirRow && (theirRow.state === 'logging' || theirRow.state === 'logged')
    ? { state: theirRow.state, album: theirRow.album, artist: theirRow.artist, art: theirRow.art, track: theirRow.track, isLive: theirRow.state === 'logging' }
    : theirRow?.state === 'nothing' ? { state: 'nothing', isLive: false } : null;

  const name = theirs?.name || person?.name || 'them';
  const records = useMemo(() => gatherAlbums(theirs?.entries || []), [theirs]);

  // ── Their card, from their face, 2026-10-29 ────────────────────────────
  // Miyel: "on a friends page clicking their pfp needs to also open their
  // card" — the whole card, her pick, opened the way home's is (nav.css,
  // Grown from the face): full bleed, a circle growing out of the face, the
  // face its X, their name staying in the middle of the row. Read from their
  // journal the first time it opens (app/api/public/card) and kept nowhere;
  // drawn by this copy's own card inside their Bookplate, with Visiting
  // saying whose it is so its records open as their posts here (About.js).
  // A journal older than that address gets a card of what this page already
  // knows — their face, their name, and counts from their records.
  const [cardOpen, setCardOpen] = useState(false);
  const [cardMade, setCardMade] = useState(false);
  const [card, setCard] = useState(null);
  const [cardStamps, setCardStamps] = useState(null);
  const cardRef = useRef(null);
  const faceRef = useRef(null);
  const openCard = () => {
    const sheet = cardRef.current;
    const face = faceRef.current?.getBoundingClientRect();
    if (sheet && face) {
      const box = sheet.getBoundingClientRect();
      sheet.style.setProperty('--from', `${face.left + face.width / 2 - box.left}px ${face.top + face.height / 2 - box.top}px`);
    }
    setCardMade(true);
    setCardOpen(true);
    if (card !== null || !person) return;
    const there = journalUrl(person.address);
    fetch(`${there}/api/public/card`, { signal: AbortSignal.timeout(EACH_MS) })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setCard)
      .catch(() => setCard(false));
    fetch(`${there}/api/public/stamps`, { signal: AbortSignal.timeout(EACH_MS) })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setCardStamps)
      .catch(() => setCardStamps(false));
  };
  useEffect(() => {
    if (!cardOpen) return undefined;
    const shut = event => { if (event.key === 'Escape') setCardOpen(false); };
    window.addEventListener('keydown', shut);
    return () => window.removeEventListener('keydown', shut);
  }, [cardOpen]);
  const theirSettings = useMemo(() => {
    if (!person) return null;
    const there = journalUrl(person.address);
    const at = path => (typeof path === 'string' && path.startsWith('/') ? `${there}${path}` : path || '');
    const got = card || {};
    return {
      keeper_name: got.keeper_name || name,
      display_name: got.display_name || null,
      cover_name: got.cover_name || name,
      portrait_url: card ? at(got.portrait_url) : `${there}/api/portrait`,
      portrait_code_url: card ? at(got.portrait_code_url) : '',
      portrait_position: got.portrait_position || null,
      site_address: person.address,
      founded_at: got.founded_at || null,
      social_links: got.social_links || null,
      hidden_fields: got.hidden_fields || null,
      bioanswers: got.bioanswers || null,
      rig_icon: got.rig_icon || null,
      rig: got.rig || null,
    };
  }, [person, card, name]);
  const theirStamps = useMemo(
    () => (cardStamps || (theirs ? stampsFrom(theirs.entries) : null)),
    [cardStamps, theirs],
  );
  const live = Boolean(beacon?.isLive);
  const whose = useMemo(() => (person ? {
    person_id: person.id || null,
    name,
    address: person.address,
    page: person.id ? `/dashboard/people/${person.id}` : `${journalUrl(person.address)}/entries`,
    live,
  } : null), [person, name, live]);
  // The three beside the beacon, as home has its own: their newest records
  // but the one the beacon is showing, each opening on their journal.
  const recents = useMemo(() => {
    const showing = albumKey(beacon?.album || '', beacon?.artist || '');
    const seen = new Set([showing]);
    const out = [];
    for (const e of newestFirst(theirs?.entries || [])) {
      const key = albumKey(e.album, e.artist);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(e);
      if (out.length === RECENTS) break;
    }
    return out;
  }, [theirs, beacon?.album, beacon?.artist]);

  const decks = useMemo(() => {
    const mineLatest = latestPerKey(mine || []);
    const theirEntries = theirs?.entries || [];
    const theirLatest = latestPerKey(theirEntries);
    const later = item => Math.max(new Date(item.mine?.posted_at || 0), new Date(item.theirs?.posted_at || 0));

    // Which of the records one of you put the other onto, so an opened record
    // can say so: their sends and the records credited to them by hand, which
    // have no send row, only the name and journal on the entry (2026-09-14);
    // yours, what came back and what is still out. The lists themselves are
    // the inbox's (Miyel, 2026-10-24: "isn't that accessible in inbox?").
    const address = tidyJournal(person?.address);
    const keyOf = r => albumKey(r.album, r.artist);
    const fromThem = new Set([
      ...sent.filter(s => !s.song).map(keyOf),
      ...(address ? (mine || []).filter(e => !e.song && tidyJournal(e.received_from_url) === address).map(e => e.album_key) : []),
    ]);
    const fromYou = new Set([...cameBack, ...out].filter(r => !r.song).map(keyOf));

    // Every record you have both logged, newest first by whichever of you
    // logged it last.
    const shared = [];
    for (const [key, m] of mineLatest) {
      const t = theirLatest.get(key);
      if (t) shared.push({ key, mine: m, theirs: t, from: fromThem.has(key) ? 'them' : fromYou.has(key) ? 'you' : null });
    }
    shared.sort((a, b) => later(b) - later(a));

    // ── The facts (Miyel, 2026-10-24) ──
    // First the two of you as listeners, across everything each of you has
    // logged ("the best things are fun comparing our favorite genre, decade,
    // i want more like that"); then the records you share, counted for the
    // two of you, and the same three questions asked of each.
    const you = tasteOf(mine || []);
    const them = tasteOf(theirEntries);
    const taste = [
      { kind: 'word', label: 'Top genre', you: you.genre, them: them.genre },
      { kind: 'word', label: 'Top decade', you: you.decade, them: them.decade },
      { kind: 'word', label: 'Top artist', you: you.artist, them: them.artist },
      { kind: 'record', label: 'Oldest record', you: you.oldest, them: them.oldest },
      { kind: 'record', label: 'Latest Masterpiece', you: you.masterpiece, them: them.masterpiece },
      { kind: 'record', label: 'Most returned to', you: you.returned, them: them.returned },
      { kind: 'record', label: 'First logged', you: you.first, them: them.first },
    ].filter(f => f.you || f.them);

    const both = shared.map(x => lineUp(x.mine, x.theirs));
    const rated = side => shared.map(x => num(x[side].rating_value)).filter(v => v !== null);
    const average = list => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : null);
    const hearts = side => both.reduce((n, shape) => n + countHearts(side === 'mine' ? shape.yourHearts : shape.theirHearts), 0);
    const together = [
      { label: shared.length === 1 ? 'Record' : 'Records', value: shared.length },
      { label: 'Same stars', value: shared.filter(x => num(x.mine.rating_value) !== null && num(x.mine.rating_value) === num(x.theirs.rating_value)).length },
      { label: 'Same favorite song', value: both.filter(shape => shape.both.length > 0).length },
    ];
    const onShared = shared.length === 1 ? 'On the record you share' : `On the ${shared.length} records you share`;
    const each = shared.length ? [
      { kind: 'stars', label: 'Average stars', sub: onShared, you: average(rated('mine')), them: average(rated('theirs')) },
      { kind: 'marks', label: 'Masterpieces', sub: onShared, you: shared.filter(x => isOn(x.mine.masterpiece)).length, them: shared.filter(x => isOn(x.theirs.masterpiece)).length },
      { kind: 'hearts', label: 'Favorite songs', sub: onShared, you: hearts('mine'), them: hearts('theirs') },
    ] : [];

    const mineRecords = [...mineLatest.values()];
    const theirRecords = [...theirLatest.values()];
    const lenses = LENSES.map(l => {
      const rows = spread(mineRecords, theirRecords, l.answerOf).sort(l.sort).slice(0, l.most || undefined)
        .map(r => ({ ...r, together: l.together ? l.together(r) : Math.min(r.you, r.them) >= TOGETHER_LEAST }));
      return { key: l.key, label: l.label, rows };
    }).filter(l => l.rows.length > 0);

    return { shared, lenses, facts: { taste, together, each } };
  }, [mine, theirs, sent, cameBack, out, person]);

  const compareReady = Boolean(theirs) && mine !== null;
  const there = address ? journalUrl(address) : '';
  // Their entry, read inside this journal (2026-10-28, Miyel: "the actual
  // entries open in app the same way as profile") — app/dashboard/people/
  // [id]/[slug] reads it from their journal as it opens.
  // Only somebody in your book has their entries opened here; a keeper off
  // the Board, opened by address, still opens on their own journal.
  const personId = person?.id || '';
  const theirEntry = useCallback(e => (personId
    ? `/dashboard/people/${personId}/${encodeURIComponent(e.slug)}`
    : `${journalUrl(address)}/entries/${encodeURIComponent(e.slug)}`), [personId, address]);

  // Their wall's order as it stands, handed over when a record is pressed,
  // so a swipe on their post goes to the record beside it (2026-10-28).
  const order = useRef([]);
  const onOrder = useCallback(albums => {
    order.current = personId ? albums.map(a => ({ ...a.face, path: theirEntry(a.face) })) : [];
  }, [personId, theirEntry]);

  // Their record, drawn the way People draws a friend's: the cover, opening
  // their entry over this page out of the cover pressed, its first screen
  // handed over as home's records do (2026-10-28).
  const tile = useCallback(album => {
    const face = album.face;
    const folded = album.listens.length === 0;
    return (
      <Link
        href={theirEntry(face)}
        data-grows={personId ? theirEntry(face) : undefined}
        onClick={personId ? () => { handOffOrder(order.current); handOff(face); } : undefined}
        target={personId ? undefined : '_blank'}
        className={'ft' + (folded ? ' ft--page' : '')}
        data-tile-key={album.key}
        aria-label={face.album + (face.artist ? ` by ${face.artist}` : '')}
      >
        <div className="ft-inner">
          <div className={'ft-face ft-face--front' + (folded ? ' ln-fold' : '')}>
            {face.album_art
              ? <img src={face.album_art} alt="" className="ft-art" loading="lazy" draggable={false} />
              : <div className="ft-placeholder">{(face.album || '?')[0]}</div>}
            {folded && (
              <span className="ln-fold-flap" aria-hidden="true">
                {face.album_art && <img src={face.album_art} alt="" loading="lazy" draggable={false} />}
              </span>
            )}
            <div className="ft-hover">
              <div className="ft-hover-album">{face.album}</div>
              <div className="ft-hover-artist">{face.artist}</div>
            </div>
          </div>
        </div>
      </Link>
    );
  }, [theirEntry, personId]);

  const seek = useMemo(() => ({
    placeholder: 'Albums, artists or songs',
    label: `Search ${name}’s records`,
    matches: (album, q) => (foldForSearch(album.face.album).includes(q)
      || foldForSearch(album.face.artist).includes(q)
      || album.notes.some(n => foldForSearch(n.song).includes(q))),
  }), [name]);

  // Add, for a keeper opened by address: filed as Friends files one, and
  // the page is theirs as a friend's from then on.
  async function add() {
    if (adding || !person?.address) return;
    setAdding(true);
    const r = await fetch('/api/people', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: person.address }),
    }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setAdding(false);
    if (r?.ok && d?.person) setPerson(d.person);
  }

  async function keepPrivate() {
    const to = !person.private;
    setPerson(p => ({ ...p, private: to }));
    const r = await fetch(`/api/people/${person.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ private: to }),
    }).catch(() => null);
    if (!r?.ok) setPerson(p => ({ ...p, private: !to }));
  }

  async function remove() {
    if (!sure) { setSure(true); return; }
    setRemoving(true);
    const r = await fetch(`/api/people/${person.id}`, { method: 'DELETE' }).catch(() => null);
    if (r?.ok) { arrivingBack(); router.push('/dashboard/people'); return; }
    setRemoving(false);
    setSure(false);
  }

  if (checking) return <div style={{ minHeight: '100vh', background: 'var(--bg)' }} />;
  if (!authed) { if (typeof window !== 'undefined') window.location.replace('/login'); return null; }

  const loading = person === null || (person && theirs === null);
  const wall = person && (
    <Journal
      records={records}
      loading={loading}
      scroller={scroller}
      tile={tile}
      filters={false}
      viewKey={VIEW_KEY}
      seek={seek}
      onOrder={onOrder}
      empty={(
        <div className="arc-empty">
          {theirs?.failed
            ? <span className="arc-empty-said">{name}&rsquo;s journal isn&rsquo;t answering just now.</span>
            : <span className="arc-empty-said">Nothing logged yet.</span>}
        </div>
      )}
      foot={person.id ? (
        <div className="pn-foot">
          <SentList journal={person.address} title={`Still out with ${name}`} />
          <p className="pn-quiet">
            {/* All the words between you, record by record (Words.js) —
                the brief's quiet line under their wall. */}
            <Link className="pn-quiet-act" href={`/dashboard/people/${person.id}/words`}>All words with {name}</Link>
            {/* Keep private moved here from under their face, 2026-10-27:
                the face is for what they sent, this page for them. */}
            {DIRECTORY_URL && (
              <button
                type="button"
                className={'pn-quiet-act' + (person.private ? ' pn-quiet-act--on' : '')}
                onClick={keepPrivate}
                aria-pressed={Boolean(person.private)}
                title={person.private
                  ? `${name} stays off everyone's board but yours. Press to share them again.`
                  : `Keep ${name} off everyone's board but yours`}
              >
                {person.private ? 'Kept private' : 'Keep private'}
              </button>
            )}
            <button
              type="button"
              className={'pn-quiet-act' + (sure ? ' pn-quiet-act--sure' : '')}
              onClick={remove}
              onBlur={() => setSure(false)}
              disabled={removing}
              aria-label={sure ? `Press again to take ${name} out of your book` : undefined}
            >
              {sure ? 'Remove?' : 'Remove'}
            </button>
          </p>
        </div>
      ) : null}
    />
  );

  return (
    <div ref={rootRef} className={'own-screen pn-screen' + (layered ? ' own-screen--layered' : '') + (cardOpen ? ' pn-screen--card' : '')}>
      {/* ── The top row, as home's ─────────────────────────────────────
          Miyel, 2026-10-26: "page should look just like an owners page just
          with the three buttons instead of the home people and community".
          Home's row is the keeper's face, the mark and the three rooms; this
          is the way back, their face, their name where the mark stands, and
          Compare and Added where the rooms are — a glyph each, its word
          shown and underlined while it is lit, as a room's is. Added is
          always lit: it is a state, not a press. No Wave: a friend already
          added is not waved at from here (her call, the same day). */}
      <header className="pn-hdr">
        <button type="button" className="pn-hdr-back" onClick={goBack} aria-label="Back" title="Back">
          <CaretLeft size={20} weight="regular" aria-hidden="true" />
        </button>
        {person && (
          <button
            type="button"
            ref={faceRef}
            className={'pn-face-press' + (cardOpen ? ' pn-face-press--open' : '')}
            onClick={() => (cardOpen ? setCardOpen(false) : openCard())}
            aria-expanded={cardOpen}
            aria-label={cardOpen ? 'Close' : `${name}’s card`}
            title={cardOpen ? 'Close' : name}
          >
            <Face address={person.address} />
            <span className="hdr-face-x" aria-hidden="true"><X size={16} weight="bold" /></span>
          </button>
        )}
        {/* Their name where home's mark stands, and the mark's dot beside
            it while they are logging — home's one signal for live. */}
        {person && (
          <h1 className="pn-hdr-name">
            <span className="pn-hdr-called">{name}</span>
            {beacon?.isLive && <span className="pn-hdr-live" role="img" aria-label="logging" />}
          </h1>
        )}
        {person && (
          <nav className="pn-hdr-stops" aria-label={`You and ${name}`}>
            <button
              type="button"
              className={'pn-hdr-stop' + (comparing ? ' pn-hdr-stop--lit' : '')}
              onClick={() => setComparing(c => !c)}
              aria-expanded={comparing}
              aria-label="Compare"
            >
              <Shuffle size={19} weight="regular" aria-hidden="true" />
              {comparing && <span className="pn-hdr-word" aria-hidden="true">Compare</span>}
            </button>
            {person.id ? (
              <span className="pn-hdr-stop pn-hdr-stop--lit pn-hdr-stop--still" role="img" aria-label={`${name} is in your friends`}>
                <UserCheck size={19} weight="regular" aria-hidden="true" />
                <span className="pn-hdr-word" aria-hidden="true">Added</span>
              </span>
            ) : (
              <button type="button" className="pn-hdr-stop" onClick={add} disabled={adding} aria-label={`Add ${name} to your friends`}>
                <UserPlus size={19} weight="regular" aria-hidden="true" />
                <span className="pn-hdr-word" aria-hidden="true">Add</span>
              </button>
            )}
          </nav>
        )}
      </header>

      {person && (
        <div
          ref={cardRef}
          className={'pn-idcard' + (cardOpen ? ' pn-idcard--open' : '')}
          aria-hidden={!cardOpen}
          inert={cardOpen ? undefined : true}
        >
          {cardMade && (
            <Bookplate settings={theirSettings}>
              <Visiting value={whose}>
                <About stamps={theirStamps} pinned={card?.pinned || null} entries={theirs?.entries || []} />
              </Visiting>
            </Bookplate>
          )}
        </div>
      )}

      <div className="own-body pn-body">
        {person === false ? (
          <div className="own-empty">Nobody by that page. <Link href="/dashboard/people" className="own-link">Your friends</Link></div>
        ) : person === null ? null : (
          <>
            {/* ── Compare, opened in place ─────────────────────────────── */}
            <div className={'pn-compare' + (comparing ? ' pn-compare--open' : '')} aria-hidden={!comparing} inert={!comparing}>
              <div className="pn-compare-in">
                {/* The two of you, face to face, a colour each. */}
                <header className="pn-head">
                  <div className="pn-who">
                    <Face src="/api/portrait" />
                    <span className="pn-who-name">You</span>
                  </div>
                  <span className="pn-between" aria-hidden="true"><Shuffle size={26} weight="regular" /></span>
                  <div className="pn-who">
                    <Face address={person.address} />
                    <span className="pn-who-name">{name}</span>
                  </div>
                </header>
                {theirs?.failed && (
                  <p className="pn-note">{name}&rsquo;s journal isn&rsquo;t answering just now.</p>
                )}
                {!compareReady ? <div className="own-skeleton pn-waiting" /> : (
                  <>
                    <FaceToFace lenses={decks.lenses} name={name} />
                    <Facts facts={decks.facts} name={name} />
                    {decks.shared.length === 0 && <p className="pn-note">You and {name} haven&rsquo;t logged any of the same records yet.</p>}
                    {/* The records you share, covers alone. One opens their
                        post with your listen beside theirs (ListenCompare.js)
                        — straight into it, "basically like skipping a
                        button" (2026-10-28). */}
                    <div className="arc-grid pn-grid" data-density="medium">
                      {decks.shared.map(x => {
                        const f = x.theirs || x.mine;
                        const at = personId ? theirEntry(x.theirs) : '';
                        const art = (
                          <div className="ft-inner">
                            <div className="ft-face ft-face--front">
                              {f.album_art
                                ? <img src={f.album_art} alt="" className="ft-art" loading="lazy" draggable={false} />
                                : <div className="ft-placeholder">{(f.album || '?')[0]}</div>}
                              <div className="ft-hover">
                                <div className="ft-hover-album">{f.album}</div>
                                <div className="ft-hover-artist">{f.artist}</div>
                              </div>
                            </div>
                          </div>
                        );
                        return at ? (
                          <Link
                            key={x.key}
                            href={at}
                            data-grows={at}
                            onClick={() => { handOff(x.theirs); handOffCompare(x.theirs.slug); }}
                            className="ft pn-tile"
                            aria-label={`${f.album}${f.artist ? ` by ${f.artist}` : ''}, you and ${name}`}
                          >
                            {art}
                          </Link>
                        ) : (
                          <a key={x.key} href={theirEntry(x.theirs)} target="_blank" rel="noopener noreferrer" className="ft pn-tile" aria-label={f.album}>{art}</a>
                        );
                      })}
                    </div>
                  </>
                )}
                {/* The printer's door: the press that prints the shape of the
                    agreement and withholds the writing, naming both people
                    (DECISIONS, The network). At the foot of the comparison,
                    since the header became home's row. */}
                {person.id && (
                  <Link href={`/printer?person=${encodeURIComponent(person.id)}`} className="kt-tool pn-print" aria-label="Print the shape of the agreement" title="Print the shape of the agreement">
                    <Printer size={18} weight="regular" aria-hidden="true" />
                  </Link>
                )}
              </div>
            </div>

            {/* ── Their beacon, as home draws the keeper's ──────────────────
                The record, the three before it in a column beside it, and the
                name under both — home's own pieces and home's measures. */}
            {beacon && (
              <section className="pn-beacon" aria-label={`What ${name} is logging`}>
                <BeaconCard beacon={beacon} />
                {beacon.state !== 'nothing' && recents.length > 0 && (
                  <div className="hp-recent-set">
                    <div className="hp-recent">
                      {recents.map(e => {
                        const label = `${e.album} — ${e.artist}`;
                        return (
                          <Link key={e.slug} href={theirEntry(e)} data-grows={theirEntry(e)} onClick={() => handOff(e)} className="hp-recent-tile" title={label} aria-label={label}>
                            {e.album_art
                              ? <img src={e.album_art} alt="" onError={ev => { ev.currentTarget.style.display = 'none'; }} />
                              : <span className="hp-recent-none" aria-hidden="true">♪</span>}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>

      {/* ── Their wall ─────────────────────────────────────────────────
          Outside the narrow column, at the width home's wall is drawn. */}
      {wall && <div className="pn-wall hn-under">{wall}</div>}
    </div>
  );
}
