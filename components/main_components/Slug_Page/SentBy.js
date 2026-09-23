// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// components/main_components/Slug_Page/SentBy.js
// One line under the chips: who sent this record. And, where the record
// travelled to reach you, the trail behind them.
//
// ── The principle, 2026-09-15 ─────────────────────────────────────────────
// The entry is your writing about a record. How it reached you is a fact
// about the record; what somebody else made of it is their journal, and
// comparing the two is their page in your address book, where the sends, the
// overlap and the hit rate already live. So the entry says who sent it and
// nothing about what they thought of it.
//
// This replaces the panel of 2026-09-14 (Chain.js, deleted): a bordered,
// shadowed card holding a SENT BY label, a 48px face, a name and a status
// line — the least important fact on a page where nothing else is boxed. Its
// second line, "Not on their journal.", read as an error and answered a
// question nobody had asked. It is gone with the panel: a second opinion
// belongs on their page, not on this one.
//
// ── What is behind a press, and what it costs ─────────────────────────────
// Only the trail. A +2 at the end of the line says two people carried the
// record before the sender did; no trail, no pill, which is most entries, so
// most cards are one quiet line.
//
// Knowing there is no trail means having looked, so the walk runs when the
// entry opens rather than on the press — the reverse of the panel's rule,
// and the price of that quiet line. One fetch of one public feed per hop, in
// the reader's browser, the way the desk's feed and the page about a person
// already read them. The sender's server sees a hit and never learns who;
// nothing is stored. The pill is drawn only once the walk has settled, so no
// number grows under the eye.
//
// ── Where the trail reads from ────────────────────────────────────────────
// The entry carries the sender's name and, where they were picked off the
// address book, their journal. Everything past that is read off journals:
// their public feed says whether they logged this record (the same
// album_key), and their own entry's credit names the hop before them.
//
// Lineage runs backward only and stops where it stops (DECISIONS, The
// network): at somebody with no journal, at a journal that does not answer,
// at one that has not logged the record, or at a record that was somebody's
// own find — which is the only ending the rail names, as *found it*.
//
// ── Nothing at all, rather than a blank ───────────────────────────────────
// A credit the sender asked to keep quiet arrives here as no name, because
// withoutChain strips it before the page is built (migrations/012). So does
// a Submission logged before the inbox began filling the name in. Either way
// this draws nothing and the Submission chip stands in its place. Saying a
// name was withheld would leak the fact of the withholding, which is the
// thing being asked for — and "the name wasn't kept", which the panel said
// here, read as data lost rather than as somebody's choice.

import { useCallback, useEffect, useRef, useState } from 'react';
import { User } from '@phosphor-icons/react';
import StarRating from '../StarRating';
import { journalUrl, tidyJournal } from '../../../library/return_address';

// A journal that has not answered in this long is out, for this open.
const EACH_MS = 8000;
// More hops than any record has really travelled; a guard, not a limit
// anyone should meet.
const MOST_HOPS = 8;

const newestFirst = rows => [...rows].sort((a, b) => new Date(b.posted_at) - new Date(a.posted_at));

// What the entry itself knows about the person who sent it, or nothing.
// Exported because it is also the test for whether the Submission chip has a
// job: the chip stands in wherever this returns nothing, and stands down
// wherever a name is about to be printed (2026-09-15). One reading of the
// credit, so the chip and the line can never both show or both vanish.
//
// A host is printed only where nothing else is known (DECISIONS, Sharing).
export function creditOn(entry) {
  if (entry?.entry_type !== 'Submission') return null;
  const address = tidyJournal(entry.received_from_url);
  const name = String(entry.received_from || '').trim();
  if (!name && !address) return null;
  return { name: name || address, address };
}

// One person on the trail, and what their journal said.
//   state: logged   — they logged it; `entry` is their entry for this record
//          unlogged — their journal answered and does not have it
//          silent   — their journal did not answer
//          nowhere  — no journal to read (a name typed in, nobody in the book)
//          asking   — still being read; only ever seen if MOST_HOPS is hit
//   origin: their entry carries no credit — the record was their own find
function firstHop(entry) {
  const address = tidyJournal(entry.received_from_url);
  return {
    name: String(entry.received_from || '').trim() || address,
    address,
    state: address ? 'asking' : 'nowhere',
    entry: null,
    origin: false,
  };
}

async function readJournal(address) {
  const answer = await fetch(`${journalUrl(address)}/api/public/entries`, { signal: AbortSignal.timeout(EACH_MS) });
  if (!answer.ok) throw new Error(String(answer.status));
  const feed = await answer.json();
  return { name: String(feed.keeper_name || '').trim(), entries: feed.entries || [] };
}

// Backward from the sender, one journal at a time, until something ends it.
// `here` is this journal, seeded into the seen set so a record that came back
// round to where it started stops rather than looping.
async function walkBack(entry, here) {
  let trail = [firstHop(entry)];
  const seen = new Set([here]);
  while (trail.length <= MOST_HOPS) {
    const last = trail[trail.length - 1];
    if (last.state !== 'asking' || !last.address || seen.has(last.address)) break;
    seen.add(last.address);
    let read;
    try {
      read = await readJournal(last.address);
    } catch {
      trail = [...trail.slice(0, -1), { ...last, state: 'silent' }];
      break;
    }
    const theirs = newestFirst(read.entries.filter(e => e.album_key && e.album_key === entry.album_key));
    // The journal's own name fills in only where the entry that pointed here
    // carried none — the name on the entry is the one to print.
    const named = { ...last, name: last.name || read.name };
    if (theirs.length === 0) {
      trail = [...trail.slice(0, -1), { ...named, state: 'unlogged' }];
      break;
    }
    const own = theirs[0];
    const nextAddress = tidyJournal(own.received_from_url);
    const nextName = String(own.received_from || '').trim();
    const goesOn = own.entry_type === 'Submission' && (nextAddress || nextName);
    trail = [...trail.slice(0, -1), { ...named, state: 'logged', entry: own, origin: !goesOn }];
    if (!goesOn) break;
    trail = [...trail, { name: nextName, address: nextAddress, state: nextAddress ? 'asking' : 'nowhere', entry: null, origin: false }];
  }
  return trail;
}

function Face({ src, size = 13 }) {
  return (
    <span className="ln-sent-face" aria-hidden="true">
      <User size={size} weight="regular" />
      {src && <img src={src} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} />}
    </span>
  );
}

// What a hop says under its name. A rating where the journal answered and had
// the record, and otherwise the short reason the trail stops there — two or
// three words, because the cell is 82px wide and the reason is not the point.
// The ratings are why the trail belongs on the entry rather than in the
// address book: it is the record's history, not somebody's opinion of it.
function Said({ hop }) {
  if (hop.state === 'silent') return <span className="ln-sent-said">no answer</span>;
  if (hop.state === 'nowhere') return <span className="ln-sent-said">no journal</span>;
  if (hop.state === 'unlogged') return <span className="ln-sent-said">not logged</span>;
  if (hop.state === 'asking' || !hop.entry) return null;
  const score = hop.entry.rating_value;
  if (score === null || score === undefined || score === '') return <span className="ln-sent-said">logged</span>;
  return <StarRating rating={Number(score)} size={10} glow={false} animate={false} />;
}

function Hop({ hop }) {
  const there = hop.address ? journalUrl(hop.address) : '';
  const name = hop.name || 'Somebody';
  return (
    <div className="ln-sent-hop">
      <Face src={there ? `${there}/api/portrait` : ''} size={18} />
      {there
        ? <a className="ln-sent-who" href={there} target="_blank" rel="noopener noreferrer">{name}</a>
        : <span className="ln-sent-who">{name}</span>}
      <Said hop={hop} />
    </div>
  );
}

const Tick = () => <span className="ln-sent-tick" aria-hidden="true">←</span>;

// The trail as one horizontal band, however long it is. Vertical would grow
// the card by a row per hop and push the record off the screen.
//
// Right to left, newest first, with this journal at the left because it is
// where the record ended up. It bleeds off the right edge under a fade, which
// is what says there is more.
//
// The fade is measured rather than always drawn, and it is a mask on the
// band rather than a wash of the background colour over it. Both for the
// same reason: on a desk this sits in the hero, whose floor is the page
// colour fading up into the blurred cover, so a painted gradient there would
// be a solid band lying across a photograph — and a fade drawn over a trail
// short enough to fit would be dimming the last name for no reason. One
// check answers both ends of it: is there anything to the right of what is
// on screen, now, at this width, at this scroll position.
function Trail({ trail, keeper, mine, loggedOn }) {
  const ended = trail[trail.length - 1];
  const railRef = useRef(null);
  const [more, setMore] = useState(false);
  const check = useCallback(() => {
    const el = railRef.current;
    if (el) setMore(el.scrollWidth - el.scrollLeft - el.clientWidth > 1);
  }, []);
  useEffect(() => {
    check();
    // Again on the next frame: the band opens into a layout that has not
    // settled, and a trail that fits by two pixels reads as overflowing until
    // it has.
    const soon = requestAnimationFrame(check);
    window.addEventListener('resize', check);
    return () => { cancelAnimationFrame(soon); window.removeEventListener('resize', check); };
  }, [check, trail]);
  return (
    <div className="ln-sent-trail">
      <div
        className={'ln-sent-rail' + (more ? ' ln-sent-rail--more' : '')}
        ref={railRef}
        onScroll={check}
        tabIndex={0}
        role="region"
        aria-label="Where this record came from"
      >
        <div className="ln-sent-hop ln-sent-hop--here">
          <Face src="/api/portrait" size={18} />
          <span className="ln-sent-who">{mine ? 'You' : keeper || 'Here'}</span>
          {loggedOn && <span className="ln-sent-said">logged {loggedOn}</span>}
        </div>
        {trail.map((hop, i) => (
          <div className="ln-sent-step" key={hop.address || `${i}-${hop.name}`}>
            <Tick />
            <Hop hop={hop} />
          </div>
        ))}
        {/* The last stop reads *found it* rather than naming nobody. Only an
            own find earns it: a journal that did not answer has not said
            there was nothing before it, so the trail simply stops. */}
        {ended?.origin && (
          <div className="ln-sent-step">
            <Tick />
            <div className="ln-sent-hop ln-sent-hop--end">
              <span className="ln-sent-face ln-sent-face--bare" aria-hidden="true" />
              <span className="ln-sent-who">found it</span>
              <span className="ln-sent-said">the origin</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// The walk, held by the page rather than by the line.
//
// The entry draws its card twice — once as the phone's first screen, once in
// the desk's hero — and hides one of them at each width, the way the chips
// and the posted date have always been drawn. Two copies of a line is free;
// two copies of a walk is the sender's journal fetched twice for one reading,
// and every journal behind them too. So the page calls this once and hands
// the answer to both, which is already how the open-or-closed state is kept.
//
// Returns null while the walk is out and an array once it has settled. Pass a
// null entry to not walk at all — the session's preview, where the record
// does not exist yet and there is nobody to ask.
export function useTrail(entry) {
  const [trail, setTrail] = useState(null);
  const slug = entry?.slug;
  const albumKey = entry?.album_key;
  const type = entry?.entry_type;
  const from = entry?.received_from;
  const fromUrl = entry?.received_from_url;
  // Deps are the five fields the walk actually reads rather than `entry`
  // itself, which is a fresh object on most of this page's renders. On the
  // layer a swipe brings the next record through the same component, and the
  // slug changing is what starts its walk.
  useEffect(() => {
    if (type !== 'Submission' || (!from && !fromUrl)) { setTrail(null); return undefined; }
    let gone = false;
    setTrail(null);
    walkBack({ album_key: albumKey, received_from: from, received_from_url: fromUrl }, tidyJournal(window.location.host))
      .then(found => { if (!gone) setTrail(found); })
      .catch(() => { if (!gone) setTrail(null); });
    return () => { gone = true; };
  }, [slug, albumKey, type, from, fromUrl]);
  return trail;
}

export default function SentBy({ entry, trail = null, keeper = '', mine = false, open = false, onOpen }) {
  const credit = creditOn(entry);
  if (!credit) return null;

  const there = credit.address ? journalUrl(credit.address) : '';
  // How many people carried the record before the sender did. The sender is
  // trail[0], so everything past them is what the pill counts. Nothing until
  // the walk has settled, so the number arrives once rather than counting
  // upward beside somebody's reading.
  const behind = trail ? trail.length - 1 : 0;
  const loggedOn = entry.posted_at
    ? new Date(entry.posted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : '';

  return (
    <div className="ln-sent">
      <p className="ln-sent-line">
        {/* Put on by, 2026-09-22. Miyel's brief: credit was never really about
            the send — a tester found a record on another keeper's journal,
            logged it and wanted to credit him with nothing sent. "Put on" is
            what people say for both, and it is the only public phrase; the
            machinery still says send and credit (DECISIONS, The network). */}
        <span className="ln-sent-lbl">Put on by</span>
        <Face src={there ? `${there}/api/portrait` : ''} />
        {there
          ? <a className="ln-sent-name" href={there} target="_blank" rel="noopener noreferrer">{credit.name}</a>
          : <span className="ln-sent-name">{credit.name}</span>}
        {behind > 0 && (
          <button
            type="button"
            className={'ln-sent-more' + (open ? ' ln-sent-more--open' : '')}
            onClick={() => onOpen?.(!open)}
            aria-expanded={open}
            aria-label={open ? 'Close where this record came from' : `${behind} more before ${credit.name}`}
          >
            +{behind}
            <span className="ln-sent-caret" aria-hidden="true" />
          </button>
        )}
      </p>
      {open && behind > 0 && <Trail trail={trail} keeper={keeper} mine={mine} loggedOn={loggedOn} />}
    </div>
  );
}
