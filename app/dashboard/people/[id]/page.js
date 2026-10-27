// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// app/dashboard/people/[id]/page.js
// Your page about one person in the address book.
//
// Compare is not a destination; it is what this page is. Everything
// cumulative about a person lives here, and it lives on your copy, which is
// why it can hold what their journal never could: what they sent you, how it
// landed, which songs you both picked.
//
// ── You versus them, 2026-10-24 ───────────────────────────────────────────
// Her brief, "compare becomes a shape", opened the page on a picture of who
// agrees; the run of cards after it said the same thing in sentences. Both
// were still a report, and she did not like *argument* and *agree* at all:
// "i was thinking one person one side one person the other you click
// through shared albums… almost like a vs screen in a video game. then other
// fun cool metrics that are exciting that only my app could know." So the
// page is a versus screen: you on the left, them on the right. Under the
// faces, the facts (her word, the same day, for what had been a sentence:
// "more comparative overall metadata as facts"); then the filters — what
// you share, what you sent, what you received — and the records they choose
// as a wall of covers, as your own
// is (her next word, the same day: "a grid of shared albums then opening it
// opens just like a regular wall entry would but compared"). A record opens
// to the two of you on it: both of your stars, marks, horizons and notes,
// and one line only this journal could write — the songs you both hearted
// above all, which no other site can know. That is what this page has and
// their wall does not: their wall is them alone. Between the two faces, the compare mark and not "vs" — her word,
// the same day: friendly, "like an & or something else… i meant the
// compare sign" — the same Shuffle every door that opens this page wears
// (Friends, the inbox, the feed).
//
// **Nobody wins.** A game's versus screen has a score; this one has none —
// no points, no "you beat them". AGENTS' Never keeps counts and rankings off
// people so that a friendship never becomes something to grow, and that
// still holds: the numbers here are about records the two of you share, on
// the one page that is about the two of you.
//
// **Every rating is the stars as each of you gave them.** The offset that
// decided who "agreed" went with agreeing; nothing on the page needs it.
//
// Read in the browser: their public feed from their journal; your records,
// what they sent you and what you sent them from this copy. Nothing is
// stored and nobody learns they were looked at. Their writing stays on their
// journal, where every one of their records here can take you.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { CaretDown, CaretLeft, CaretRight, Heart, Printer, Shuffle, SketchLogo, Sparkle, User } from '@phosphor-icons/react';
import SiteNav from '../../../../components/main_components/SiteNav';
import StarRating from '../../../../components/main_components/StarRating';
import { HorizonRow } from '../../../../components/main_components/Feed';
import Chip from '../../../../components/main_components/Slug_Page/Chip';
import { useBookplate } from '../../../../components/main_components/Bookplate';
import { albumKey } from '../../../../hooks/useListeningBeacon';
import { parseHorizon, splitNotes } from '../../../../library/entry_formatter';
import { foldGenre } from '../../../../library/music_data_api';
import { carrySender, journalUrl, tidyJournal } from '../../../../library/return_address';
import { arrivingBack } from '../../../../library/handoff';

const EACH_MS = 8000;
// A record whose every song the keeper gave full marks says so, once it has
// enough songs for that to mean something.
const ALL_TOP_LEAST = 3;
// How far a finger has to travel across the record to turn to the next one.
const SWIPE_PX = 40;
// How long an opened record takes to grow out of its cover, on the curve
// the entry layer grows on (LayerEntry.js).
const GROW_MS = 420;
const GROW_EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
// A note longer than this opens folded, twelve lines of it showing and Read all
// under it. Most notes are shorter and never fold.
const FOLD_AT = 450;
// The most of somebody else's note this page will draw. Their journal's
// answer is read as text and never as markup, and this is only a ceiling on
// a reply nobody's note would reach.
const NOTE_MOST = 20000;
// The words you both used: at most three, each at least four letters.
const WORDS_MOST = 3;
const WORD_LEAST = 4;
// Masterpieces drawn one mark each up to this many; past it, one mark and
// the number.
const MARKS_DRAWN = 5;

const num = v => (v === null || v === undefined || v === '' ? null : Number(v));
const newestFirst = rows => [...rows].sort((a, b) => new Date(b.posted_at) - new Date(a.posted_at));
const said = v => { const n = num(v); return n === null ? '' : String(Math.round(n * 100) / 100); };
const stars = v => `${said(v)} ${num(v) === 1 ? 'star' : 'stars'}`;
const heartsOf = entry => String(entry?.hearts || '');
const countHearts = h => [...h].filter(c => c === '1').length;
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
// different things.
function latestPerKey(entries) {
  const latest = new Map();
  for (const e of newestFirst(entries)) if (e.album_key && !e.song && !latest.has(e.album_key)) latest.set(e.album_key, e);
  return latest;
}

function Face({ src, small = false }) {
  return (
    <span className={'pn-face' + (small ? ' pn-face--small' : '')} aria-hidden="true">
      <User size={small ? 12 : 26} weight="regular" />
      <img src={src} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} />
    </span>
  );
}

// ── What the two listens share ────────────────────────────────────────────
// The two horizons can be laid track against track only when they are the
// same length — the same edition of the record. Otherwise each is drawn on
// its own and nothing is said about songs, because the fifth song on one
// tracklist is not the fifth on the other.
function lineUp(mine, theirs) {
  const yours = parseHorizon(mine?.horizon);
  const hers = parseHorizon(theirs?.horizon);
  const yourHearts = heartsOf(mine);
  const theirHearts = heartsOf(theirs);
  const comparable = yours.length > 0 && yours.length === hers.length
    && yourHearts.length === yours.length && theirHearts.length === hers.length;
  const both = [];
  if (comparable) for (let i = 0; i < yours.length; i++) if (yourHearts[i] === '1' && theirHearts[i] === '1') both.push(i);
  return { yours, hers, yourHearts, theirHearts, comparable, both };
}

const allTop = bars => bars.length >= ALL_TOP_LEAST && bars.every(v => v >= 1);

// ── The one line ──────────────────────────────────────────────────────────
// What only this journal knows about a record the two of you have, said the
// way a person would say it, the most surprising thing first: the songs you
// both picked, then a Masterpiece you share, then every song given full
// marks, then favourites that never meet. The stars come last, since they
// are drawn right above it. A record one of them put the other onto says so
// first, as its own short sentence.
function oneLine({ mine, theirs, from, shape, songs, name }) {
  const lead = from === 'them' ? `${name} put you onto this.` : from === 'you' ? `You put ${name} onto this.` : null;
  const say = rest => (lead ? <>{lead} {rest}</> : rest);
  if (!mine) return say(<>You haven&rsquo;t logged it yet.</>);
  if (!theirs) return say(<>{name} hasn&rsquo;t logged it yet.</>);

  const m = num(mine.rating_value);
  const t = num(theirs.rating_value);
  const n = shape.both.length;
  if (n > 0) {
    const named = songs && n <= 2 && songs.length === n;
    const what = named
      ? <>{songs.map((s, i) => <span key={i}>{i > 0 && ' and '}<b>{s}</b></span>)}</>
      : <>the same <b>{n}</b> {n === 1 ? 'song' : 'songs'}</>;
    if (t === m && m !== null) return say(<>You both gave it {stars(m)} and picked {what}.</>);
    // Half a star is the same opinion typed slightly differently; a "but"
    // over it makes an argument out of nothing.
    if (lead || m === null || t === null || Math.abs(t - m) <= 0.5) return say(<>You both picked {what}.</>);
    if (t < m) return <>{name} gave it {stars(t)}, but you both picked {what}.</>;
    return <>{name} liked it more than you did, but you both picked {what}.</>;
  }
  const mp = e => e.masterpiece === true || e.masterpiece === 'true';
  if (mp(mine) && mp(theirs)) return say(<>You both called it a Masterpiece.</>);
  if (allTop(shape.hers) && !allTop(shape.yours)) return say(<>{name} gave every song full marks.</>);
  if (allTop(shape.yours) && !allTop(shape.hers)) return say(<>You gave every song full marks.</>);
  if (shape.comparable) {
    const yh = countHearts(shape.yourHearts);
    const th = countHearts(shape.theirHearts);
    if (yh && th) return say(<>You each picked different favorite songs.</>);
    if (yh && !th) return say(<>You picked {some(yh, 'one favorite song', '# favorite songs')}. {name} picked none.</>);
    if (th && !yh) return say(<>{name} picked {some(th, 'one favorite song', '# favorite songs')}. You picked none.</>);
  }
  if (m !== null && t !== null) return say(m === t ? <>You both gave it {stars(m)}.</> : <>You gave it {stars(m)}. {name} gave it {stars(t)}.</>);
  return lead || <>You&rsquo;ve both logged it.</>;
}

// ── The words you both used ───────────────────────────────────────────────
// Her idea, 2026-10-23: "You both used the word ____ to describe this." The
// two notes are folded to their words; the ones in both, minus the words
// everybody uses and the record's own names — its title, its artist, its
// songs and your two names would match every time and say nothing — are
// what you both reached for. The longest first, since a long shared word is
// rarer than a short one, then in the order they come in your note.
const PLAIN_WORDS = new Set(`
  about above after again album albums almost also always another anything around away back
  because been before being best better between both bring came come comes could didn does
  doing done down each even ever every everything feel feels felt first from gets give going
  gonna good great have having here into just keep kind know last like little listen listened
  listening long look lots made make many maybe more most much music must never next nothing
  only other over part pretty quite really record records right said same says should since
  some something song songs sound sounds still such sure take than that their them then there
  these they thing things think this those though thought through time track tracks very want
  well went were what when where which while whole will with would year years your actually
  definitely probably especially without yeah also
`.split(/\s+/).filter(Boolean));

const fold = text => String(text || '').toLowerCase().replace(/[‘’]/g, "'");
function wordsOf(text) {
  return (fold(text).match(/\p{L}[\p{L}']*/gu) || [])
    .map(w => w.replace(/'s$/, '').replace(/'+$/, ''))
    .filter(w => w.length >= WORD_LEAST && !w.includes("'") && !PLAIN_WORDS.has(w));
}

// A note as it reads, not as it was typed: a [[link]] is its words, and a
// written link is its text.
const plainNote = text => String(text || '')
  .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2')
  .replace(/\[\[([^\]]*)\]\]/g, '$1')
  .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  .trim();

function sharedWords(yours, theirs, names) {
  const skip = new Set(names.flatMap(n => wordsOf(n)));
  const order = [...new Set(wordsOf(yours))].filter(w => !skip.has(w));
  const theirSet = new Set(wordsOf(theirs));
  const both = order.filter(w => theirSet.has(w));
  const kept = new Set([...both].sort((a, b) => b.length - a.length).slice(0, WORDS_MOST));
  return both.filter(w => kept.has(w));
}

// The note's words, the shared ones marked wherever they stand.
function Marked({ text, words }) {
  const find = words.length
    ? new RegExp(`(?<![\\p{L}\\p{N}])(${words.join('|')})(?![\\p{L}\\p{N}])`, 'giu')
    : null;
  return text.split(/\n\s*\n/).map((para, i) => (
    <p key={i}>
      {find ? para.split(find).map((piece, j) => (j % 2 ? <mark key={j} className="pn-word">{piece}</mark> : piece)) : para}
    </p>
  ));
}

// One person's note, in their column: their own words in full, folded when
// long, with Read all under it.
function Note({ text, words }) {
  const [open, setOpen] = useState(false);
  const long = text.length > FOLD_AT;
  return (
    <>
      <div className={'pn-said-text' + (long && !open ? ' pn-said-text--folded' : '')}>
        <Marked text={text} words={words} />
      </div>
      {long && !open && <button type="button" className="pn-said-door" onClick={() => setOpen(true)}>Read all</button>}
    </>
  );
}

// The marks an entry wears, as the entry page wears them: a chip each.
function Chips({ entry }) {
  if (!entry) return null;
  const on = v => v === true || v === 'true';
  return (
    <>
      {on(entry.favorite) && <Chip tone="fav">Favorite</Chip>}
      {on(entry.masterpiece) && <Chip tone="mp">Masterpiece</Chip>}
      {on(entry.formative) && <Chip tone="formative">Formative</Chip>}
    </>
  );
}

// ── The record on screen ──────────────────────────────────────────────────
// Drawn as an entry is drawn (Miyel, 2026-10-24: "more like you're looking at
// an actual entry, but one ghosted"): the cover, the title, the artist and
// the year, then the two of you in two columns, the way the faces stand at
// the top of the page — "left me right ghost", her word the same day. Each
// column is one listen: the face, the stars, the marks, the horizon with its
// hearts, the note. Each column wears its owner's colour, as the faces at
// the top of the page do; theirs was a ghost of yours until the same day
// ("we don't need the other person to be a ghost anymore"). The
// columns keep row with each other, so the two sets of stars, the two
// horizons and the two notes each start level.
//
// Their note is read from their journal when the record is on screen and
// kept only while this page is open (AGENTS, Never). Most entries have no
// writing, so the plain case is said plainly, and a journal that cannot give
// a note — an older copy, a quiet entry — shows only the way there, with
// nothing said about why.
function Versus({ item, name, address, songs, myNote, theirNote, titles, turn, at, count }) {
  const { mine, theirs } = item;
  const theirHome = theirs ? carrySender(`${journalUrl(address.theirs)}/entries/${theirs.slug}`, address.me, { known: true }) : null;
  const theirFace = `${journalUrl(address.theirs)}/api/portrait`;
  const shape = lineUp(mine, theirs);
  const face = mine || theirs || item;
  const year = String(face.year || '').match(/[0-9]{4}/)?.[0] || '';
  const myRating = num(mine?.rating_value);
  const theirRating = num(theirs?.rating_value);
  // The cover goes to your own entry, as every record on this page always
  // has; to theirs, on their journal, when you have not logged it.
  const cover = face.album_art
    ? <img src={face.album_art} alt="" />
    : <span className="pn-vs-none" aria-hidden="true">♪</span>;

  // The notes: undefined while they are being read, false where their
  // journal cannot give one.
  const yours = mine && typeof myNote === 'string' ? plainNote(myNote) : '';
  const hers = theirs && typeof theirNote === 'string' ? plainNote(theirNote) : '';
  const cannot = Boolean(theirs) && theirNote === false;
  const heard = (!mine || myNote !== undefined) && (!theirs || theirNote !== undefined);
  const words = yours && hers ? sharedWords(yours, hers, [face.album, face.artist, ...(titles || []), name]) : [];
  const neither = heard && mine && theirs && !yours && !hers && !cannot;
  const way = theirs ? <a href={theirHome} className="pn-said-door">On their journal</a> : null;
  const anyChips = [mine, theirs].some(e => e && ['favorite', 'masterpiece', 'formative'].some(k => e[k] === true || e[k] === 'true'));
  const anyBars = shape.yours.length > 0 || shape.hers.length > 0;

  // A row is two cells, yours and theirs, so the grid keeps them level.
  const row = (what, left, right) => [
    <div key={`${what}-you`} className={`pn-cell pn-cell--you pn-cell--${what}`}><div className="pn-side">{left}</div></div>,
    <div key={`${what}-them`} className={`pn-cell pn-cell--them pn-cell--${what}`}><div className="pn-side">{right}</div></div>,
  ];
  const unlogged = <p className="pn-unlogged">Not logged yet.</p>;
  const noNote = <p className="pn-said-none">Didn&rsquo;t write about it.</p>;

  return (
    <div className="pn-vs">
      <div className="pn-vs-top">
        {count > 1
          ? <button type="button" className="pn-turn-btn" onClick={() => turn(-1)} aria-label="The record before"><CaretLeft size={20} weight="regular" aria-hidden="true" /></button>
          : <span />}
        {mine
          ? <Link href={`/entries/${mine.slug}`} className="pn-vs-art" aria-label={`${face.album}, your entry`}>{cover}</Link>
          : theirs
            ? <a href={theirHome} className="pn-vs-art" aria-label={`${face.album}, on ${name}'s journal`}>{cover}</a>
            : <span className="pn-vs-art">{cover}</span>}
        {count > 1
          ? <button type="button" className="pn-turn-btn" onClick={() => turn(1)} aria-label="The next record"><CaretRight size={20} weight="regular" aria-hidden="true" /></button>
          : <span />}
      </div>
      {count > 1 && <div className="pn-turn-at">{at + 1} of {count}</div>}
      <h2 className="pn-vs-album">{face.album}</h2>
      <div className="pn-vs-artist">{face.artist}{year ? ` · ${year}` : ''}</div>

      <p className="pn-vs-line">{oneLine({ ...item, shape, songs, name })}</p>

      <div className="pn-sides">
        {row('who',
          <><Face src="/api/portrait" small />You</>,
          <><Face src={theirFace} small />{name}</>)}
        {row('stars',
          mine ? (myRating !== null && <div className="pn-stars-of"><StarRating rating={myRating} size={20} /></div>) : unlogged,
          theirs ? (theirRating !== null && <div className="pn-stars-of" aria-label={`${name}: ${stars(theirRating)}`}><StarRating rating={theirRating} size={20} /></div>) : unlogged)}
        {anyChips && row('chips', <Chips entry={mine} />, <Chips entry={theirs} />)}
        {anyBars && row('bars',
          <HorizonRow bars={shape.yours} hearts={shape.yourHearts} className="fd-cmp-bars pn-bars" label="How you heard it, track by track" />,
          <HorizonRow bars={shape.hers} hearts={shape.theirHearts} className="fd-cmp-bars pn-bars" label={`How ${name} heard it, track by track`} />)}

        {words.length > 0 && (
          <p className="pn-cell--wide pn-words">
            You both used the {words.length === 1 ? 'word' : 'words'}{' '}
            {words.map((w, i) => <span key={w}>{i > 0 && (i === words.length - 1 ? ' and ' : ', ')}<mark className="pn-word">{w}</mark></span>)}.
          </p>
        )}
        {heard && (neither
          ? <p className="pn-cell--wide pn-notes-none">Neither of you wrote about it.{way}</p>
          : row('note',
            mine && (yours ? <Note text={yours} words={words} /> : noNote),
            theirs && (
              <>
                {hers ? <Note text={hers} words={words} /> : !cannot && noNote}
                {way}
              </>
            )))}
      </div>
    </div>
  );
}

// ── A record, opened ──────────────────────────────────────────────────────
// The page is a wall of the records the two of you share, and a record
// opens off it the way an entry opens off your own wall (Miyel, 2026-10-24:
// "a grid of shared albums then opening it opens just like a regular wall
// entry would but compared"): it grows out of the cover that was pressed to
// fill the screen, and goes back into it — a copy of the cover flying home
// while the rest fades — on a pull down from the top, Escape, or the caret.
// Sideways is the neighbours on the wall, in its order, by swipe, by the
// arrows either side of the cover, or by ← and →. It is the entry layer's
// way of opening (LayerEntry.js) without its route: this page may already
// be on a sheet of its own, and a record here is not an address.
//
// Drawn over everything, outside the page, so the sheet this page may sit on
// never sees its touches; and its keys are taken before the sheet's, so
// Escape puts the record down rather than the whole page.
function Opened({ from, tile, turn, count, onGone, children }) {
  const sheet = useRef(null);
  const going = useRef(false);

  useLayoutEffect(() => {
    const el = sheet.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!el || !from || reduced) {
      const run = el?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: 'ease-out' });
      return () => run?.cancel();
    }
    const W = el.offsetWidth || window.innerWidth;
    const H = el.offsetHeight || window.innerHeight;
    const run = el.animate([
      { transformOrigin: '0 0', transform: `translate(${from.x}px, ${from.y}px) scale(${from.w / W}, ${from.h / H})`, borderRadius: '14px' },
      { transformOrigin: '0 0', transform: 'none', borderRadius: '0px' },
    ], { duration: GROW_MS, easing: GROW_EASE });
    return () => run.cancel();
  }, [from]);

  // The page under it holds still while it is open. Only a lock this put on
  // comes off with it: on a sheet, the sheet's own is left where it was.
  useEffect(() => {
    const root = document.documentElement;
    if (root.classList.contains('ln-locked')) return undefined;
    root.classList.add('ln-locked');
    return () => root.classList.remove('ln-locked');
  }, []);

  const leave = useCallback((pulled = 0) => {
    if (going.current) return;
    going.current = true;
    const el = sheet.current;
    let gone = false;
    const done = () => { if (gone) return; gone = true; onGone(); };
    window.setTimeout(done, GROW_MS + 100);
    if (!el) { done(); return; }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fade = el.animate([
      { opacity: 1, transform: `translateY(${pulled}px)` },
      { opacity: 0, transform: `translateY(${pulled}px)` },
    ], { duration: 200, easing: 'ease-out', fill: 'forwards' });
    const box = reduced ? null : tile()?.getBoundingClientRect();
    const cover = el.querySelector('.pn-vs-art img');
    if (!box || !cover || box.bottom < 0 || box.top > window.innerHeight) {
      fade.onfinish = done;
      return;
    }
    const at = cover.getBoundingClientRect();
    cover.style.visibility = 'hidden';
    const flyer = document.createElement('img');
    flyer.src = cover.currentSrc || cover.src;
    flyer.alt = '';
    Object.assign(flyer.style, {
      position: 'fixed', zIndex: 341, left: `${at.left}px`, top: `${at.top}px`,
      width: `${at.width}px`, height: `${at.height}px`, objectFit: 'cover',
      borderRadius: '16px', transformOrigin: '0 0', pointerEvents: 'none',
    });
    document.body.appendChild(flyer);
    const run = flyer.animate([
      { transform: 'none' },
      { transform: `translate(${box.left - at.left}px, ${box.top - at.top}px) scale(${box.width / at.width}, ${box.height / at.height})`, borderRadius: '10px' },
    ], { duration: GROW_MS * 0.75, easing: GROW_EASE, fill: 'forwards' });
    const land = () => { flyer.remove(); done(); };
    run.onfinish = land;
    run.oncancel = land;
    window.setTimeout(() => flyer.remove(), GROW_MS + 100);
  }, [tile, onGone]);

  // Before the sheet's keys, and instead of them.
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') { e.stopPropagation(); leave(); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.stopPropagation();
        if (count > 1) turn(e.key === 'ArrowLeft' ? -1 : 1);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [leave, turn, count]);

  // The finger, decided on its first move as the entry layer decides it:
  // mostly down from the top is the pull, which the sheet follows and which
  // puts the record down past a fifth of the screen or on a flick; mostly
  // sideways is the neighbour. Native listeners, so the first move can be
  // kept from the browser.
  useEffect(() => {
    const el = sheet.current;
    if (!el) return undefined;
    let pull = null;
    const begin = e => {
      if (e.touches.length !== 1) { pull = null; return; }
      const t = e.touches[0];
      pull = { x: t.clientX, y: t.clientY, at: e.timeStamp, dx: 0, dy: 0, axis: null, top: el.scrollTop <= 0 };
    };
    const move = e => {
      if (!pull || e.touches.length !== 1) return;
      const t = e.touches[0];
      pull.dx = t.clientX - pull.x;
      pull.dy = t.clientY - pull.y;
      pull.last = e.timeStamp;
      if (!pull.axis) {
        if (Math.abs(pull.dx) < 6 && Math.abs(pull.dy) < 6) return;
        if (Math.abs(pull.dx) > Math.abs(pull.dy)) pull.axis = 'x';
        else if (pull.top && pull.dy > 0) pull.axis = 'y';
        else { pull = null; return; }
      }
      if (e.cancelable) e.preventDefault();
      if (pull.axis === 'y') {
        el.style.transition = 'none';
        el.style.transform = `translateY(${Math.max(0, pull.dy)}px)`;
      }
    };
    const end = () => {
      const done = pull;
      pull = null;
      if (!done || !done.axis) return;
      if (done.axis === 'x') {
        if (count > 1 && Math.abs(done.dx) > SWIPE_PX) turn(done.dx < 0 ? 1 : -1);
        return;
      }
      const dy = Math.max(0, done.dy);
      const fast = dy / Math.max(1, (done.last || done.at) - done.at) > 0.3;
      if (dy > el.offsetHeight * 0.2 || fast) { el.style.transform = ''; leave(dy); return; }
      el.style.transition = `transform 0.28s ${GROW_EASE}`;
      el.style.transform = '';
    };
    el.addEventListener('touchstart', begin, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
    return () => {
      el.removeEventListener('touchstart', begin);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end);
    };
  }, [leave, turn, count]);

  return createPortal(
    <div ref={sheet} className="pn-open" role="dialog" aria-modal="true">
      <button type="button" className="pn-open-back" onClick={() => leave()} aria-label="Close" title="Close">
        <CaretLeft size={18} weight="regular" aria-hidden="true" />
      </button>
      <div className="pn-open-page">{children}</div>
    </div>,
    document.body,
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
  const { keeper_name, site_address } = useBookplate();
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
  // Your own records: null until they have been read, so the page does not
  // say there is nothing in common while they are on their way.
  const [mine, setMine] = useState(null);
  const [sent, setSent] = useState([]);
  // What you put them onto: what came back (they logged it, and their
  // journal credits yours) and what is still out (the inbox's Sent list,
  // library/sent_actions.js — no age and no reminder on it, as there is
  // none there).
  const [cameBack, setCameBack] = useState([]);
  const [out, setOut] = useState([]);
  const [at, setAt] = useState(0);
  // The record open over the wall, if one is: where its cover was when it
  // was pressed, for it to grow out of.
  const [opened, setOpened] = useState(null);
  // Your own entry for each record, read the first time the record is on
  // screen: the names of its songs (the list carries the hearts but not the
  // titles) and your note. slug → { titles, note }.
  const [full, setFull] = useState({});
  const asked = useRef(new Set());
  // Their note on each record, read from their journal the first time the
  // record is on screen and held only while this page is open: slug →
  // { note }, or false when their journal could not give one.
  const [theirNotes, setTheirNotes] = useState({});
  const heard = useRef(new Set());

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
          if (!gone) setSent((d3.submissions || []).filter(s => tidyJournal(s.sender_url) === theirAddress));
        }).catch(() => {});
        fetch('/api/came-back').then(r => (r.ok ? r.json() : { cameBack: [] })).then(d4 => {
          if (!gone) setCameBack((d4.cameBack || []).filter(c => tidyJournal(c.journal) === theirAddress));
        }).catch(() => {});
        fetch('/api/sent').then(r => (r.ok ? r.json() : { sent: [] })).then(d5 => {
          if (!gone) setOut((d5.sent || []).filter(s => tidyJournal(s.journal) === theirAddress));
        }).catch(() => {});
      })
      .catch(() => { if (!gone) setPerson(false); });
    return () => { gone = true; };
  }, [authed, id]);

  const name = theirs?.name || person?.name || 'them';

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

  const deck = decks.shared;
  const item = deck.length ? deck[Math.min(at, deck.length - 1)] : null;
  // Only an opened record is read for: the wall is covers alone.
  const shown = opened ? item : null;
  const count = deck.length;
  const turn = useCallback(step => setAt(i => (count ? (Math.min(i, count - 1) + step + count) % count : 0)), [count]);
  const open = (i, tile) => {
    const box = tile.getBoundingClientRect();
    setAt(i);
    setOpened({ from: { x: box.left, y: box.top, w: box.width, h: box.height } });
  };
  // The cover on the wall for the record open now, which it goes back into.
  const tileOfOpen = useCallback(() => document.querySelector(`[data-pn-tile="${Math.min(at, count - 1)}"]`), [at, count]);
  const putDown = useCallback(() => setOpened(null), []);

  // Your entry for the record open, once.
  const slug = shown?.mine?.slug;
  useEffect(() => {
    if (!slug || asked.current.has(slug)) return;
    asked.current.add(slug);
    fetch(`/api/entries/${encodeURIComponent(slug)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        const tracks = Array.isArray(d?.entry?.tracks) ? d.entry.tracks : [];
        setFull(was => ({ ...was, [slug]: { titles: tracks.map(t => String(t?.title || '').trim()), note: splitNotes(d?.entry?.notes).albumNotes } }));
      })
      .catch(() => setFull(was => ({ ...was, [slug]: { titles: [], note: '' } })));
  }, [slug]);
  // Their note for the record open, once, from their journal.
  const theirSlug = shown?.theirs?.slug;
  const theirJournal = person?.address;
  useEffect(() => {
    if (!theirSlug || !theirJournal || heard.current.has(theirSlug)) return;
    heard.current.add(theirSlug);
    fetch(`${journalUrl(theirJournal)}/api/public/notes/${encodeURIComponent(theirSlug)}`, { signal: AbortSignal.timeout(EACH_MS), cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        const note = typeof d?.note === 'string' ? d.note.slice(0, NOTE_MOST) : null;
        setTheirNotes(was => ({ ...was, [theirSlug]: note === null ? false : { note } }));
      })
      .catch(() => setTheirNotes(was => ({ ...was, [theirSlug]: false })));
  }, [theirSlug, theirJournal]);
  const songsOf = shown => {
    if (!shown?.mine || !shown?.theirs) return null;
    const list = full[shown.mine.slug]?.titles;
    const shape = lineUp(shown.mine, shown.theirs);
    if (!list || list.length !== shape.yours.length) return null;
    const named = shape.both.map(i => list[i]).filter(Boolean);
    return named.length === shape.both.length ? named : null;
  };
  const songs = songsOf(item);

  if (checking) return <div style={{ minHeight: '100vh', background: 'var(--bg)' }} />;
  if (!authed) { if (typeof window !== 'undefined') window.location.replace('/login'); return null; }

  const ready = !!theirs && mine !== null;
  const me = { name: keeper_name, address: site_address };

  return (
    <div className={'own-screen' + (layered ? ' own-screen--layered' : '')}>
      {/* The header's left slot, where the owner's tools live on every page:
          the way back, and the printer's door — the press that prints the
          two of you and withholds the writing, naming both people
          (DECISIONS, The network) — the same glyph at the same size the
          entry and the card wear it. */}
      <SiteNav tools={(
        <>
          <button type="button" className="kt-tool" onClick={goBack} aria-label="Back" title="Back">
            <CaretLeft size={18} weight="regular" aria-hidden="true" />
          </button>
          {person?.id && (
            <Link href={`/printer?person=${encodeURIComponent(person.id)}`} className="kt-tool" aria-label="Print the shape of the agreement" title="Print the shape of the agreement">
              <Printer size={18} weight="regular" aria-hidden="true" />
            </Link>
          )}
        </>
      )} />

      <div className="own-body pn-body">
        {person === false ? (
          <div className="own-empty">Nobody by that page. <Link href="/dashboard/people" className="own-link">The address book</Link></div>
        ) : person === null ? (
          <div className="pn-head"><div className="own-skeleton" style={{ width: 56, height: 56, borderRadius: '50%' }} /></div>
        ) : (
          <>
            {/* The two of you, face to face. "Visit their journal" stood here
                until 2026-09-22 (Miyel: you can go to their journal from the
                friends page); every record of theirs below still links to
                it. */}
            <header className="pn-head">
              <div className="pn-who">
                <Face src="/api/portrait" />
                <span className="pn-who-name">You</span>
              </div>
              <span className="pn-between" aria-hidden="true"><Shuffle size={26} weight="regular" /></span>
              <div className="pn-who">
                <Face src={`${journalUrl(person.address)}/api/portrait`} />
                <h1 className="pn-who-name">{name}</h1>
              </div>
            </header>

            {theirs?.failed && (
              <p className="pn-note">{name}&rsquo;s journal isn&rsquo;t answering just now, so only what you&rsquo;ve sent each other is here.</p>
            )}

            {!ready ? <div className="own-skeleton pn-waiting" /> : (
              <>
                <FaceToFace lenses={decks.lenses} name={name} />
                <Facts facts={decks.facts} name={name} />
                {deck.length === 0 && <p className="pn-note">You and {name} haven&rsquo;t logged any of the same records yet.</p>}

                {/* The records, as your wall draws them: covers alone. */}
                <div className="arc-grid pn-grid" data-density="medium">
                  {deck.map((x, i) => {
                    const f = x.mine || x.theirs || x;
                    return (
                      <button key={x.key} type="button" className="ft pn-tile" data-pn-tile={i} onClick={e => open(i, e.currentTarget)} aria-label={f.album + (f.artist ? ` by ${f.artist}` : '')}>
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
                      </button>
                    );
                  })}
                </div>

                {opened && item && (
                  <Opened from={opened.from} tile={tileOfOpen} turn={turn} count={count} onGone={putDown}>
                    <Versus
                      key={item.key}
                      item={item}
                      name={name}
                      songs={songs}
                      titles={item.mine ? full[item.mine.slug]?.titles : null}
                      myNote={item.mine ? full[item.mine.slug]?.note : null}
                      theirNote={item.theirs ? (theirNotes[item.theirs.slug] === false ? false : theirNotes[item.theirs.slug]?.note) : null}
                      address={{ theirs: person.address, me }}
                      turn={turn}
                      at={Math.min(at, count - 1)}
                      count={count}
                    />
                  </Opened>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
