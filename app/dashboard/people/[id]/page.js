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
// page is a versus screen. You on the left, them on the right, one record at
// a time: the cover, both of your stars and marks, both horizons, and one
// line only this journal could write — the songs you both hearted above all,
// which no other site can know. A row of filters chooses which records you
// flip through, and a sentence over them says the one thing that view adds
// up to. Between the two faces, the compare mark and not "vs" — her word,
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

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { CaretLeft, CaretRight, Printer, Shuffle, User } from '@phosphor-icons/react';
import SiteNav from '../../../../components/main_components/SiteNav';
import StarRating from '../../../../components/main_components/StarRating';
import { HorizonPair, HorizonRow, Marks } from '../../../../components/main_components/Feed';
import Chip from '../../../../components/main_components/Slug_Page/Chip';
import { useBookplate } from '../../../../components/main_components/Bookplate';
import { albumKey } from '../../../../hooks/useListeningBeacon';
import { parseHorizon, splitNotes } from '../../../../library/entry_formatter';
import { carrySender, journalUrl, tidyJournal } from '../../../../library/return_address';
import { arrivingBack } from '../../../../library/handoff';

// Four stars or better is loved: something sent that went on to be logged
// and rated well.
const HIT = 4;
const EACH_MS = 8000;
// A record whose every song the keeper gave full marks says so, once it has
// enough songs for that to mean something.
const ALL_TOP_LEAST = 3;
// How far a finger has to travel across the record to turn to the next one.
const SWIPE_PX = 40;
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

const num = v => (v === null || v === undefined || v === '' ? null : Number(v));
const newestFirst = rows => [...rows].sort((a, b) => new Date(b.posted_at) - new Date(a.posted_at));
const said = v => { const n = num(v); return n === null ? '' : String(Math.round(n * 100) / 100); };
const stars = v => `${said(v)} ${num(v) === 1 ? 'star' : 'stars'}`;
const heartsOf = entry => String(entry?.hearts || '');
const countHearts = h => [...h].filter(c => c === '1').length;
const some = (n, one, many) => (n === 1 ? one : many.replace('#', n));

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

// One person's note, in its column: their face and name over it, their own
// words in full, folded when long. Theirs is the ghost, as their stars and
// their horizon are: the same words, in softer ink.
function Note({ who, face, text, words, ghost = false, cannot = false, home = null }) {
  const [open, setOpen] = useState(false);
  const long = text.length > FOLD_AT;
  return (
    <figure className={'pn-said' + (ghost ? ' pn-said--ghost' : '')}>
      <figcaption className="pn-said-who"><Face src={face} small />{who}</figcaption>
      {text ? (
        <div className={'pn-said-text' + (long && !open ? ' pn-said-text--folded' : '')}>
          <Marked text={text} words={words} />
        </div>
      ) : !cannot && <p className="pn-said-none">Didn&rsquo;t write about it.</p>}
      {(text && long && !open) || home ? (
        <div className="pn-said-foot">
          {text && long && !open && <button type="button" className="pn-said-door" onClick={() => setOpen(true)}>Read all</button>}
          {home}
        </div>
      ) : null}
    </figure>
  );
}

// ── Both notes, side by side ──────────────────────────────────────────────
// Yours on the left, because it is your page; theirs on the right with their
// face on it and the way to the entry it lives on (Miyel, 2026-10-24: "then
// the notes side by side"). Their note is read from their journal when the
// record is on screen and kept only while this page is open (AGENTS, Never).
// Most entries have no writing, so the plain case is said plainly, and a
// journal that cannot give a note — an older copy, a quiet entry — shows only
// the way there, with nothing said about why.
function Notes({ mine, theirs, myNote, theirNote, name, theirFace, home }) {
  if (mine && myNote === undefined) return null;
  if (theirs && theirNote === undefined) return null;
  const yours = mine ? plainNote(myNote) : '';
  const hers = typeof theirNote === 'string' ? plainNote(theirNote) : '';
  const cannot = theirs && theirNote === false;
  if (!yours && !theirs) return null;
  const way = theirs ? <a href={home} className="pn-said-door">On their journal</a> : null;
  if (!yours && !hers) {
    return (
      <div className="pn-notes">
        <p className="pn-notes-none">{!cannot && (mine ? 'Neither of you wrote about it.' : `${name} didn’t write about it.`)}{way}</p>
      </div>
    );
  }
  const words = yours && hers ? sharedWords(yours, hers, [mine?.album, mine?.artist, ...(mine?.titles || []), name]) : [];
  const both = Boolean(mine && theirs);
  return (
    <div className="pn-notes">
      {words.length > 0 && (
        <p className="pn-words">
          You both used the {words.length === 1 ? 'word' : 'words'}{' '}
          {words.map((w, i) => <span key={w}>{i > 0 && (i === words.length - 1 ? ' and ' : ', ')}<mark className="pn-word">{w}</mark></span>)}.
        </p>
      )}
      <div className={'pn-notes-pair' + (both ? '' : ' pn-notes-pair--one')}>
        {mine && <Note who="You" face="/api/portrait" text={yours} words={words} />}
        {theirs && <Note who={name} face={theirFace} text={hers} words={words} ghost cannot={cannot} home={way} />}
      </div>
    </div>
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
// the year, the stars, the marks, the horizon and the notes — yours solid,
// and theirs as a ghost of the same thing beside or behind it. Their stars
// are a faint row under yours, each row with its own small face; their
// marks are faint chips after yours; their horizon stands behind yours, song
// by song, with their hearts faint.
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

      {(myRating !== null || theirRating !== null) && (
        <div className="pn-stars">
          {myRating !== null && (
            <div className="pn-star-row"><Face src="/api/portrait" small /><StarRating rating={myRating} size={22} /></div>
          )}
          {theirRating !== null && (
            <div className="pn-star-row pn-ghost" aria-label={`${name}: ${stars(theirRating)}`}><Face src={theirFace} small /><StarRating rating={theirRating} size={22} /></div>
          )}
        </div>
      )}
      <div className="pn-chips">
        <Chips entry={mine} />
        <span className="pn-ghost pn-chips-theirs"><Chips entry={theirs} /></span>
      </div>

      <p className="pn-vs-line">{oneLine({ ...item, shape, songs, name })}</p>

      {/* Theirs behind yours, song by song, when the two tracklists line up,
          with a key under it; two rows, yours over theirs, when they do not. */}
      {shape.comparable && (
        <div className="pn-rows">
          <HorizonPair yours={shape.yours} hers={shape.hers} yourHearts={shape.yourHearts} theirHearts={shape.theirHearts} label={`How you and ${name} heard it, track by track`} />
          <div className="pn-key" aria-hidden="true">
            <span><i className="pn-key-you" />You</span>
            <span><i className="pn-key-them" />{name}</span>
          </div>
        </div>
      )}
      {!shape.comparable && (shape.yours.length > 0 || shape.hers.length > 0) && (
        <div className="pn-rows">
          <HorizonRow bars={shape.yours} hearts={shape.yourHearts} className="fd-cmp-bars pn-bars pn-bars--you" label="How you heard it, track by track" />
          <HorizonRow bars={shape.hers} hearts={shape.theirHearts} className="fd-cmp-bars pn-bars pn-bars--theirs" label={`How ${name} heard it, track by track`} />
          <div className="pn-key" aria-hidden="true">
            {shape.yours.length > 0 && <span><i className="pn-key-you" />You</span>}
            {shape.hers.length > 0 && <span><i className="pn-key-them" />{name}</span>}
          </div>
        </div>
      )}

      <Notes
        mine={mine && { album: mine.album, artist: mine.artist, titles }}
        theirs={theirs}
        myNote={myNote}
        theirNote={theirNote}
        name={name}
        theirFace={theirFace}
        home={theirHome}
      />
    </div>
  );
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
  const [view, setView] = useState(null);
  const [at, setAt] = useState(0);
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
    fetch(`/api/people/${id}`)
      .then(r => (r.ok ? r.json() : { person: false }))
      .then(d => {
        if (gone) return;
        const p = d.person || false;
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
    const theirBySlug = new Map(theirEntries.map(e => [e.slug, e]));
    const later = item => Math.max(new Date(item.mine?.posted_at || 0), new Date(item.theirs?.posted_at || 0));

    // Every record you have both logged, newest first by whichever of you
    // logged it last.
    const shared = [];
    for (const [key, m] of mineLatest) {
      const t = theirLatest.get(key);
      if (t) shared.push({ key, mine: m, theirs: t, from: null });
    }
    shared.sort((a, b) => later(b) - later(a));
    const songs = shared.filter(item => lineUp(item.mine, item.theirs).both.length > 0);

    // What they put you onto. One per record — the same record sent twice is
    // one thing they put you onto, the newest send of it kept — and the
    // records credited to them by hand, which have no send row, only the
    // name and journal on the entry (2026-09-14).
    const seen = new Set();
    const fromThem = [];
    for (const s of [...sent].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))) {
      if (s.song) continue;
      const key = albumKey(s.album, s.artist);
      if (seen.has(key)) continue;
      seen.add(key);
      fromThem.push({ key, mine: mineLatest.get(key) || null, theirs: theirLatest.get(key) || null, from: 'them', album: s.album, artist: s.artist, album_art: s.album_art });
    }
    const address = tidyJournal(person?.address);
    if (address) {
      for (const e of newestFirst(mine || [])) {
        if (tidyJournal(e.received_from_url) !== address || seen.has(e.album_key) || e.song) continue;
        seen.add(e.album_key);
        fromThem.push({ key: e.album_key, mine: mineLatest.get(e.album_key) || e, theirs: theirLatest.get(e.album_key) || null, from: 'them' });
      }
    }

    // What you put them onto: what came back first, then what is still out.
    const yours = new Set();
    const fromYou = [];
    for (const c of cameBack) {
      if (c.song) continue;
      const key = albumKey(c.album, c.artist);
      if (yours.has(key)) continue;
      yours.add(key);
      const t = theirBySlug.get(c.slug) || theirLatest.get(key) || null;
      fromYou.push({ key, mine: mineLatest.get(key) || null, theirs: t, from: 'you', album: c.album, artist: c.artist, album_art: c.album_art });
    }
    for (const s of out) {
      if (s.song) continue;
      const key = albumKey(s.album, s.artist);
      if (yours.has(key)) continue;
      yours.add(key);
      fromYou.push({ key, mine: mineLatest.get(key) || null, theirs: theirLatest.get(key) || null, from: 'you', album: s.album, artist: s.artist, album_art: s.album_art });
    }

    // Their five-star records you have not logged: a list to go and hear,
    // not a versus — there is nobody on your side of it yet.
    const unheard = newestFirst([...theirLatest.values()].filter(t => num(t.rating_value) === 5 && !mineLatest.has(t.album_key)));
    const sentKeys = new Set(fromThem.map(x => x.key));

    const loved = list => list.filter(x => num(x.mine?.rating_value) !== null && num(x.mine.rating_value) >= HIT).length;
    return { shared, songs, fromThem, fromYou, unheard, sentKeys, lovedOfThem: loved(fromThem) };
  }, [mine, theirs, sent, cameBack, out, person]);

  // The filters, in their order, and only the ones with something in them:
  // a view with nothing to flip through is a door to an empty room.
  const views = useMemo(() => [
    { key: 'shared', label: 'Shared', list: decks.shared },
    { key: 'songs', label: 'Same songs', list: decks.songs },
    { key: 'them', label: `From ${name}`, list: decks.fromThem },
    { key: 'you', label: 'From you', list: decks.fromYou },
    { key: 'unheard', label: `${name}'s 5 stars`, list: decks.unheard },
  ].filter(v => v.list.length > 0), [decks, name]);
  const current = views.find(v => v.key === view) || views[0] || null;
  const deck = current && current.key !== 'unheard' ? current.list : [];
  const item = deck.length ? deck[Math.min(at, deck.length - 1)] : null;
  const turn = step => setAt(i => (deck.length ? (Math.min(i, deck.length - 1) + step + deck.length) % deck.length : 0));
  const choose = key => { setView(key); setAt(0); };

  // Your entry for the record on screen, once.
  const slug = item?.mine?.slug;
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
  // Their note for the record on screen, once, from their journal.
  const theirSlug = item?.theirs?.slug;
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

  // ← and → turn the record on a keyboard; a swipe across it does on a phone.
  useEffect(() => {
    if (deck.length < 2) return undefined;
    const onKey = e => {
      if (e.target?.closest?.('input, textarea, [contenteditable="true"]')) return;
      if (e.key === 'ArrowLeft') turn(-1);
      if (e.key === 'ArrowRight') turn(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  const touch = useRef(null);
  const onTouchStart = e => { touch.current = e.touches[0]?.clientX ?? null; };
  const onTouchEnd = e => {
    const from = touch.current;
    touch.current = null;
    const to = e.changedTouches[0]?.clientX;
    if (from === null || to === undefined || deck.length < 2) return;
    if (to - from > SWIPE_PX) turn(-1);
    else if (from - to > SWIPE_PX) turn(1);
  };

  if (checking) return <div style={{ minHeight: '100vh', background: 'var(--bg)' }} />;
  if (!authed) { if (typeof window !== 'undefined') window.location.replace('/login'); return null; }

  const ready = !!theirs && mine !== null;
  const me = { name: keeper_name, address: site_address };

  // The sentence over the filters: the one thing the view on screen adds up
  // to, with its numbers inside it.
  const sentence = () => {
    if (!current) return <>You and {name} haven&rsquo;t logged any of the same records yet.</>;
    const n = current.list.length;
    if (current.key === 'shared') return <>You&rsquo;ve both logged {n === 1 ? 'one record' : <><b>{n}</b> of the same records</>}.</>;
    if (current.key === 'songs') return <>You picked the same favorite songs on <b>{n}</b> of your <b>{decks.shared.length}</b> {decks.shared.length === 1 ? 'record' : 'records'}.</>;
    if (current.key === 'them') {
      const logged = decks.fromThem.filter(x => x.mine).length;
      const lead = <>{name} put you onto {n === 1 ? 'one record' : <><b>{n}</b> records</>}.</>;
      if (!logged) return <>{lead} You haven&rsquo;t logged {n === 1 ? 'it' : 'any'} yet.</>;
      if (logged === 1) return <>{lead} {decks.lovedOfThem ? <>You loved the one you&rsquo;ve logged.</> : <>You&rsquo;ve logged one.</>}</>;
      return <>{lead} You loved <b>{decks.lovedOfThem}</b> of the <b>{logged}</b> you&rsquo;ve logged.</>;
    }
    if (current.key === 'you') {
      const logged = decks.fromYou.filter(x => x.theirs).length;
      const lead = <>You put {name} onto {n === 1 ? 'one record' : <><b>{n}</b> records</>}.</>;
      if (!logged) return <>{lead} {name} hasn&rsquo;t logged {n === 1 ? 'it' : 'any'} yet.</>;
      if (n === 1) return <>{lead} {name} has logged it.</>;
      return <>{lead} {name} has logged <b>{logged}</b>.</>;
    }
    return n === 1
      ? <>{name} gave this 5 stars. You haven&rsquo;t logged it.</>
      : <>{name} gave these 5 stars. You haven&rsquo;t logged them.</>;
  };

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
          {person && (
            <Link href={`/printer?person=${encodeURIComponent(id)}`} className="kt-tool" aria-label="Print the shape of the agreement" title="Print the shape of the agreement">
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
                <p className="pn-say">{sentence()}</p>

                {views.length > 1 && (
                  <nav className="pn-views" aria-label="Which records">
                    {views.map(v => (
                      <button key={v.key} type="button" className={'pn-view' + (v.key === current.key ? ' pn-view--on' : '')} aria-pressed={v.key === current.key} onClick={() => choose(v.key)}>
                        {v.label}
                      </button>
                    ))}
                  </nav>
                )}

                {item && (
                  <section className="pn-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
                    <Versus
                      key={`${current.key}:${item.key}`}
                      item={item}
                      name={name}
                      songs={songs}
                      titles={item.mine ? full[item.mine.slug]?.titles : null}
                      myNote={item.mine ? full[item.mine.slug]?.note : null}
                      theirNote={item.theirs ? (theirNotes[item.theirs.slug] === false ? false : theirNotes[item.theirs.slug]?.note) : null}
                      address={{ theirs: person.address, me }}
                      turn={turn}
                      at={Math.min(at, deck.length - 1)}
                      count={deck.length}
                    />
                  </section>
                )}

                {current?.key === 'unheard' && (
                  <ul className="pn-unheard">
                    {current.list.map(t => (
                      <li key={t.slug}>
                        <a href={carrySender(`${journalUrl(person.address)}/entries/${t.slug}`, me, { known: true })} className="pn-unheard-row">
                          <span className="pn-unheard-art">{t.album_art && <img src={t.album_art} alt="" loading="lazy" />}</span>
                          <span className="pn-unheard-said">
                            <span className="pn-unheard-album">{t.album}</span>
                            <span className="pn-unheard-artist">{t.artist}</span>
                          </span>
                          {decks.sentKeys.has(t.album_key)
                            ? <span className="pn-unheard-tag">Sent to you</span>
                            : <Marks entry={t} size={12} />}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
