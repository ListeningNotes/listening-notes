// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// components/main_components/ListenCompare.js
// Your listen of a record and a friend's, side by side, on their post.
//
// ── Two kinds of compare, 2026-10-28 ──────────────────────────────────────
// Miyel: "comparing a listen vs comparing with a full person … this can
// break up compare to two places." Comparing with a person is Compare on
// their page — the two of you as listeners, the facts, and a wall of the
// records you share. Comparing a listen is here, and it lives on the post:
// press a shared record in their page's Compare and their post opens with
// your listen already beside theirs; open the same post any other way —
// their wall, Friends, Headlines — and Compare in its top right shows it
// ("basically like skipping a button, which means that compare kind of
// wins its keep in both screens").
//
// What is drawn is main's versus record (2026-10-24, her vs screen: "one
// person one side one person the other"), moved here from the person page:
// the cover, the title, one line only this journal could write, then the
// two of you in two columns — the face, the stars, the marks, the horizon
// with its hearts, the note — kept level row by row, a colour each and
// nobody's side bigger. **Nobody wins**: no points, no score (AGENTS, Never).
//
// Both listens are read whole: yours from this copy, theirs as their post
// was read (app/dashboard/people/[id]/[slug]), kept nowhere.
//
// It also holds the pieces Compare on a person's page counts with —
// `lineUp`, `countHearts` — so the two compares agree on what "the same
// favorite song" means.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Heart, User } from '@phosphor-icons/react';
import StarRating from './StarRating';
import Chip from './Slug_Page/Chip';
import { parseHorizon, splitNotes } from '../../library/entry_formatter';
import { journalUrl } from '../../library/return_address';
import { cameToCompare } from '../../library/handoff';
import { Bookplate, Visiting } from './Bookplate';

// A record whose every song the keeper gave full marks says so, once it has
// enough songs for that to mean something.
const ALL_TOP_LEAST = 3;
// A note longer than this opens folded, twelve lines of it showing and Read
// all under it. Most notes are shorter and never fold.
const FOLD_AT = 450;
// The words you both used: at most three, each at least four letters.
const WORDS_MOST = 3;
const WORD_LEAST = 4;

const num = v => (v === null || v === undefined || v === '' ? null : Number(v));
const said = v => { const n = num(v); return n === null ? '' : String(Math.round(n * 100) / 100); };
const stars = v => `${said(v)} ${num(v) === 1 ? 'star' : 'stars'}`;
// The hearts of a listen: the feed's string of them, or — for an entry read
// whole, which carries its tracks instead — worked out from the tracks the
// way the feed works it out (library/database_actions.js, HEARTS_FIELD).
const heartsOf = entry => {
  if (entry?.hearts) return String(entry.hearts);
  const tracks = Array.isArray(entry?.tracks) ? entry.tracks : [];
  return tracks.map(t => (t?.favorite === true || t?.favorite === 'true' ? '1' : '0')).join('');
};
export const countHearts = h => [...h].filter(c => c === '1').length;
const some = (n, one, many) => (n === 1 ? one : many.replace('#', n));

function Face({ src }) {
  return (
    <span className="pn-face pn-face--small" aria-hidden="true">
      <User size={12} weight="regular" />
      <img src={src} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} />
    </span>
  );
}

// One listen's horizon: a bar per track and a ♥ over each one hearted. It
// was the feed's (Feed.js, retired 2026-10-23) and came here with the
// compare that draws it.
export function HorizonRow({ bars, hearts, className, label }) {
  if (!bars.length) return null;
  return (
    <div className={className} aria-label={label}>
      {bars.map((v, i) => (
        <span key={i} className={hearts[i] === '1' ? 'fd-cmp-bar fd-cmp-bar--loved' : 'fd-cmp-bar'} style={{ '--tall': `${Math.max(9, v * 100)}%` }}>
          {hearts[i] === '1' && <Heart size={11} weight="fill" aria-hidden="true" />}
        </span>
      ))}
    </div>
  );
}

// ── What the two listens share ────────────────────────────────────────────
// The two horizons can be laid track against track only when they are the
// same length — the same edition of the record. Otherwise each is drawn on
// its own and nothing is said about songs, because the fifth song on one
// tracklist is not the fifth on the other.
export function lineUp(mine, theirs) {
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

// ── The record, the two of you on it ──────────────────────────────────────
// `mine` and `theirs` are the two listens read whole — their tracks and
// their writing — `name` and `address` theirs, and `from` who put whom
// onto it ('them', 'you' or null). Your cover goes to your own entry.
export default function ListenCompare({ mine, theirs, name, address, from = null }) {
  const shape = lineUp(mine, theirs);
  const face = theirs || mine || {};
  const year = String(face.year || '').match(/[0-9]{4}/)?.[0] || '';
  const myRating = num(mine?.rating_value);
  const theirRating = num(theirs?.rating_value);
  const theirFace = `${journalUrl(address)}/api/portrait`;
  const titles = Array.isArray(mine?.tracks) ? mine.tracks.map(t => String(t?.title || '').trim()) : [];
  const songs = shape.both.length && titles.length === shape.yours.length
    ? shape.both.map(i => titles[i]).filter(Boolean)
    : null;
  const yours = plainNote(splitNotes(mine?.notes).albumNotes);
  const hers = plainNote(splitNotes(theirs?.notes).albumNotes);
  const words = yours && hers ? sharedWords(yours, hers, [face.album, face.artist, ...titles, name]) : [];
  const anyChips = [mine, theirs].some(e => e && ['favorite', 'masterpiece', 'formative'].some(k => e[k] === true || e[k] === 'true'));
  const anyBars = shape.yours.length > 0 || shape.hers.length > 0;
  const cover = face.album_art
    ? <img src={face.album_art} alt="" />
    : <span className="pn-vs-none" aria-hidden="true">♪</span>;

  // A row is two cells, yours and theirs, so the grid keeps them level.
  const row = (what, left, right) => [
    <div key={`${what}-you`} className={`pn-cell pn-cell--you pn-cell--${what}`}><div className="pn-side">{left}</div></div>,
    <div key={`${what}-them`} className={`pn-cell pn-cell--them pn-cell--${what}`}><div className="pn-side">{right}</div></div>,
  ];
  const unlogged = <p className="pn-unlogged">Not logged yet.</p>;
  const noNote = <p className="pn-said-none">Didn&rsquo;t write about it.</p>;

  return (
    <div className="pn-vs lc">
      <div className="pn-vs-top">
        <span />
        {mine
          ? <Link href={`/entries/${mine.slug}`} className="pn-vs-art" aria-label={`${face.album}, your entry`}>{cover}</Link>
          : <span className="pn-vs-art">{cover}</span>}
        <span />
      </div>
      <h2 className="pn-vs-album">{face.album}</h2>
      <div className="pn-vs-artist">{face.artist}{year ? ` · ${year}` : ''}</div>

      <p className="pn-vs-line">{oneLine({ mine, theirs, from, shape, songs, name })}</p>

      <div className="pn-sides">
        {row('who',
          <><Face src="/api/portrait" />You</>,
          <><Face src={theirFace} />{name}</>)}
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
        {mine && theirs && !yours && !hers
          ? <p className="pn-cell--wide pn-notes-none">Neither of you wrote about it.</p>
          : row('note',
            mine && (yours ? <Note text={yours} words={words} /> : noNote),
            theirs && (hers ? <Note text={hers} words={words} /> : noNote))}
      </div>
    </div>
  );
}

// ── A friend's post, read inside this journal ─────────────────────────────
// What app/dashboard/people/[id]/[slug] draws its post inside: their
// Bookplate, so the page says whose it is, and who they are to this one
// (Visiting) — the header's face on the left and Compare on the right, the
// message way in. Where you have the record too, Compare sets your listen
// beside theirs in the post's place, and the post comes back as it was;
// pressed from Compare on their page, it opens that way (cameToCompare).
// A note on one song has no side by side: it is not a listen of the record.
export function FriendsPost({ settings, person, entry, mine = null, from = null, children }) {
  const can = Boolean(mine) && !entry.song;
  const [on, setOn] = useState(() => can && cameToCompare(entry.slug));
  const value = useMemo(() => ({
    person_id: person.id,
    name: person.name,
    address: person.address,
    page: `/dashboard/people/${person.id}`,
    about: { slug: entry.slug, album: entry.album, artist: entry.artist, art: entry.album_art || '', song: entry.song || '' },
    compare: can ? { on, toggle: () => setOn(v => !v) } : null,
  }), [person.id, person.name, person.address, entry.slug, entry.album, entry.artist, entry.album_art, entry.song, can, on]);
  return (
    <Bookplate settings={settings}>
      <Visiting value={value}>
        {/* `pn-post` sends the Listen bar away, as a friend's page does
            (ListenBar.js): their post is not a listen on their journal. */}
        <div className="pn-post" hidden={on}>{children}</div>
        {on && (
          <div className="lc-page">
            <ListenCompare mine={mine} theirs={entry} name={person.name || 'them'} address={person.address} from={from} />
          </div>
        )}
      </Visiting>
    </Bookplate>
  );
}
