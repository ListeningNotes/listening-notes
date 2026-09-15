// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// components/main_components/Slug_Page/Chain.js
// What opens under the Submission chip: who sent the record, whether they
// logged it themselves, and the chain behind them.
//
// ── Opened, not displayed, 2026-09-14 ─────────────────────────────────────
// The entry says Submission and nothing more until the chip is pressed. A
// name printed on every sent entry put somebody else's name on the page by
// default, and with three copies nobody was clicking through to it — so it
// read as decoration rather than as the network. Opening it keeps the fact
// visible, puts the detail one tap away, and makes the disclosure a choice.
// This is also the View chain affordance: one thing to press, not two.
//
// ── Where it reads from ───────────────────────────────────────────────────
// The entry carries the sender's name and, when they were picked off the
// address book, their journal. Everything else is read off journals when
// the chip is pressed — never on load: their public feed says whether they
// logged this record (the same album_key), and their entry's own credit
// says who sent it to them, which is the next hop. Each hop is one fetch of
// one public feed, in the reader's browser, the way the desk's feed and the
// page about a person already read them. Nothing is stored and nobody
// learns they were looked up.
//
// Lineage runs backward only, and stops where it stops (DECISIONS, The
// network): at a person with no journal to read, at a journal that does not
// answer, at a journal that has not logged the record, or at a record that
// was somebody's own find. Each of those is said in a sentence rather than
// left as a missing row.

import { useEffect, useState } from 'react';
import { ArrowUpRight, User } from '@phosphor-icons/react';
import StarRating from '../StarRating';
import { journalUrl, tidyJournal } from '../../../library/return_address';

// A journal that has not answered in this long is out, for this press.
const EACH_MS = 8000;
// More hops than any record has really travelled; a guard, not a limit
// anyone should meet.
const MOST_HOPS = 8;

const newestFirst = rows => [...rows].sort((a, b) => new Date(b.posted_at) - new Date(a.posted_at));

// One person on the chain, and what their journal said.
//   state: asking — their feed is being read
//          logged — they logged it; `entry` is their entry for it
//          unlogged — their journal answered and does not have it
//          silent — their journal did not answer
//          nowhere — no journal to read (a name typed in, nobody in the book)
//   origin: their entry carries no credit — the record was their own find
function firstHop(entry) {
  const address = tidyJournal(entry.received_from_url);
  return {
    name: String(entry.received_from || '').trim(),
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

function Face({ address }) {
  return (
    <span className="ln-chain-face" aria-hidden="true">
      <User size={16} weight="regular" />
      {address && <img src={`${journalUrl(address)}/api/portrait`} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} />}
    </span>
  );
}

function Hop({ hop }) {
  const there = hop.address ? journalUrl(hop.address) : '';
  // The name printed is the one the entry carries; the journal's own name
  // fills in only where the entry had none. A host is printed only when
  // nothing else is known (DECISIONS, Sharing).
  const name = hop.name || hop.address || 'Somebody';
  let said;
  if (hop.state === 'asking') said = <span>Reading their journal…</span>;
  else if (hop.state === 'silent') said = <span>Their journal isn&rsquo;t answering.</span>;
  else if (hop.state === 'nowhere') said = <span>{hop.name ? 'No journal to read.' : 'The name wasn’t kept.'}</span>;
  else if (hop.state === 'unlogged') said = <span>Not on their journal.</span>;
  else {
    const rated = hop.entry.rating_value !== null && hop.entry.rating_value !== undefined && hop.entry.rating_value !== '';
    said = (
      <>
        <span>{hop.origin ? 'Their own find' : 'Logged it too'}</span>
        {rated && <StarRating rating={Number(hop.entry.rating_value)} size={11} glow={false} animate={false} />}
        <a href={`${there}/entries/${hop.entry.slug}`} target="_blank" rel="noopener noreferrer">their entry <ArrowUpRight size={9} weight="bold" aria-hidden="true" /></a>
      </>
    );
  }
  return (
    <div className="ln-chain-hop">
      <Face address={hop.address} />
      <div className="ln-chain-who">
        {there
          ? <a className="ln-chain-name" href={there} target="_blank" rel="noopener noreferrer">{name}<ArrowUpRight size={10} weight="bold" aria-hidden="true" /></a>
          : <span className="ln-chain-name">{name}</span>}
        <div className="ln-chain-said">{said}</div>
      </div>
    </div>
  );
}

export default function Chain({ entry }) {
  const [hops, setHops] = useState(() => [firstHop(entry)]);

  useEffect(() => {
    let gone = false;
    const seen = new Set();
    const walk = async () => {
      let chain = [firstHop(entry)];
      seen.add(tidyJournal(window.location.host));
      while (!gone && chain.length <= MOST_HOPS) {
        const last = chain[chain.length - 1];
        if (last.state !== 'asking' || !last.address || seen.has(last.address)) break;
        seen.add(last.address);
        let read;
        try {
          read = await readJournal(last.address);
        } catch {
          chain = [...chain.slice(0, -1), { ...last, state: 'silent' }];
          break;
        }
        const theirs = newestFirst(read.entries.filter(e => e.album_key && e.album_key === entry.album_key));
        const named = { ...last, name: last.name || read.name };
        if (theirs.length === 0) {
          chain = [...chain.slice(0, -1), { ...named, state: 'unlogged' }];
          break;
        }
        const own = theirs[0];
        const nextAddress = tidyJournal(own.received_from_url);
        const nextName = String(own.received_from || '').trim();
        const goesOn = own.entry_type === 'Submission' && (nextAddress || nextName);
        chain = [...chain.slice(0, -1), { ...named, state: 'logged', entry: own, origin: !goesOn }];
        if (!goesOn) break;
        chain = [...chain, { name: nextName, address: nextAddress, state: nextAddress ? 'asking' : 'nowhere', entry: null, origin: false }];
        if (!gone) setHops(chain);
      }
      if (!gone) setHops(chain);
    };
    walk();
    return () => { gone = true; };
  }, [entry]);

  return (
    <div className="ln-chain" role="region" aria-label="Where this record came from">
      <p className="ln-chain-head">Sent by</p>
      <Hop hop={hops[0]} />
      {hops.length > 1 && <p className="ln-chain-head">Before that</p>}
      {hops.slice(1).map((hop, i) => <Hop key={hop.address || `${i}-${hop.name}`} hop={hop} />)}
    </div>
  );
}
