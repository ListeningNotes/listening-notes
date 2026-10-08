// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';

// app/directory/Directory.js
// The Board: every journal on it, ordered by distance from whoever is looking.
// The second word in the People tab's bar, and the title of this page.
// `Everyone` in the code — what it is, as the beacon is still the needle.
//
// ── From Miyel's Board brief, 2026-10-08 ───────────────────────────────────
// Nearest first: who is logging right now, community-wide, as the same band
// the Friends room draws; then a friend away — people the keeper's friends
// added, each with the path to them; then — still to come — the people on
// your records, and what is being logged everywhere; then everybody else,
// shuffled, a dozen at a time. Search at the top. Being on the Board is the
// default for everyone; the switch is in Settings, and the keeper meets one
// note here until they dismiss it.
//
// It makes one request to DIRECTORY_URL for the first screen and draws what
// comes back; it never asks any journal for its beacon itself — the registry
// keeps the last beacon it saw from each, so a reader never waits on a
// fetch. If the registry cannot be reached it says so in one line, and
// nothing else in the journal is touched.
//
// Drawn on the cross for the keeper and for anybody visiting, and again at
// this page's own address for a stranger who was handed the link. For the
// keeper a press on somebody opens their doors, Visit and Add, the way a face
// in Friends opens its own, and somebody already in the book wears a check. A
// visitor gets the Board and nothing of the keeper's: no note, no checks,
// nothing ordered around the keeper — a row is simply the way to a journal.
//
// The rules, pinned first in the brief (AGENTS, Never): no journal address is
// printed — it lives in the link; no number beside a person — a count may sit
// on a record or on the community, never beside a name; nothing is ordered by
// how much anybody logs — where there is no better order, shuffle; and
// nothing is ever written to another keeper's journal.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ArrowsClockwise, BookOpen, Check, MagnifyingGlass, Plus, User, X } from '@phosphor-icons/react';
import SiteNav from '../../components/main_components/SiteNav';
import WaveSheet from '../../components/main_components/WaveSheet';
import { useBookplate } from '../../components/main_components/Bookplate';
import { DIRECTORY_URL } from '../../library/version';
import { carrySender, journalUrl, tidyJournal } from '../../library/return_address';
import { useFriendsBeacons } from '../../hooks/useFriendsBeacons';

// The mock-up's words for a journal whose keeper has not said their name.
const NO_NAME = 'A journal with no name yet';

const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];

// Where the software is got from: /get on the copy the registry lives on,
// which a stranger without a gift link meets as the handed-out page.
const GET_URL = (() => {
  try { return `${new URL(DIRECTORY_URL).origin}/get`; } catch { return ''; }
})();

// The one note, until the keeper dismisses it. Kept in this browser: a note
// read once on a phone may be met once more on a desk, and that is all.
const NOTE_KEY = 'ln-board-note';

// ── One reading of the Board, shared ───────────────────────────────────────
// The first screen and the count beside the word in the People tab's bar come
// from the same answer (Miyel, 2026-10-07: "can count be next to everyone?"),
// so they are read once into this module and drawn from here: the bar asks
// when People opens, the Board asks again when it is drawn, on a pull, and on
// Shuffle. A failed ask keeps whatever was read before — a Board on the
// screen is not taken away because the registry was slow a second time — and
// says it is down only when there was never anything.
const NOTHING_YET = Object.freeze({ page: null, down: false });
let reading = NOTHING_YET;
let asking = null;
const listening = new Set();
function publish(next) {
  reading = next;
  listening.forEach(fn => fn());
}
function subscribe(fn) {
  listening.add(fn);
  return () => listening.delete(fn);
}

// `shuffle` draws a new dozen: a new address, so a shared cache cannot hand
// back the draw it already has.
export function readEveryone({ shuffle = false } = {}) {
  if (asking && !shuffle) return asking;
  const ask = (async () => {
    try {
      const r = await fetch(`${DIRECTORY_URL}?board=1${shuffle ? `&shuffle=${Date.now()}` : ''}`, { cache: 'no-store' });
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      publish({
        down: false,
        page: {
          listed: Number(d?.listed) || 0,
          logging: Number(d?.logging) || 0,
          live: Array.isArray(d?.live) ? d.live : [],
          further: Array.isArray(d?.further) ? d.further : [],
        },
      });
    } catch {
      if (!reading.page) publish({ page: null, down: true });
    } finally {
      if (asking === ask) asking = null;
    }
  })();
  asking = ask;
  return ask;
}

export function useEveryone() {
  return useSyncExternalStore(subscribe, () => reading, () => NOTHING_YET);
}

// Their journal's own portrait, read straight off it and never kept here,
// in a circle; the plain mark when there is none. Lit as the book lights a
// face whose beacon says logging (forms.css, .fr-one--live).
function Face({ journal }) {
  const live = journal.state === 'logging';
  return (
    <span className={'dir-face' + (live ? ' dir-face--live' : '')} aria-hidden="true">
      <span className="dir-face-in">
        <User size={20} weight="regular" />
        <img
          src={`${journalUrl(journal.address)}/api/portrait`}
          alt=""
          loading="lazy"
          onError={e => { e.currentTarget.style.display = 'none'; }}
        />
      </span>
    </span>
  );
}

function Cover({ art }) {
  return (
    <span className="dir-cover" aria-hidden="true">
      {art
        ? <img src={art} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} />
        : <span>&#9834;</span>}
    </span>
  );
}

// The path to somebody a friend away: "Through Dez and Wren" — the friends
// they came through, never a score, never more than two names.
function throughWords(names) {
  if (!names || names.length === 0) return 'Through a friend';
  return `Through ${names.slice(0, 2).join(' and ')}`;
}

// What every row says, whoever is reading: the face, the name, the beacon,
// the cover — and, for the keeper, a check at the very end for somebody
// already in the book; for somebody a friend away, the path to them.
function Inside({ journal, inBook = false, through = null }) {
  const live = journal.state === 'logging';
  const said = journal.state === 'logging' || journal.state === 'logged';
  return (
    <>
      <Face journal={journal} />
      <span className="dir-who">
        <span className={'dir-name' + (journal.name ? '' : ' dir-name--none')}>{journal.name || NO_NAME}</span>
        {through && <span className="dir-through">{throughWords(through)}</span>}
        {said ? (
          <>
            <span className={'dir-state' + (live ? ' dir-state--live' : '')}>{live ? 'Now logging' : 'Last logged'}</span>
            <span className="dir-rec-title">{journal.album}</span>
            {journal.artist && <span className="dir-rec-by">{journal.artist}</span>}
          </>
        ) : (
          <span className="dir-state">Nothing logged yet</span>
        )}
      </span>
      <span className="dir-end">
        {said && <Cover art={journal.art} />}
        {inBook && (
          <span className="dir-mark" title="In your address book">
            <Check size={17} weight="bold" aria-label="In your address book" />
          </span>
        )}
      </span>
    </>
  );
}

// ── The note ───────────────────────────────────────────────────────────────
// What being on the Board means, said once to the keeper on the Board itself
// (the brief: "say so plainly"), with the way off — which is the switch in
// Settings — and a cross that puts it away for good in this browser. Only
// while they are on the Board.
function BoardNote() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    let gone = false;
    let dismissed = false;
    try { dismissed = localStorage.getItem(NOTE_KEY) === 'dismissed'; } catch { /* no storage: show it */ }
    if (dismissed) return undefined;
    fetch('/api/listing')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!gone && d?.findable) setShown(true); })
      .catch(() => {});
    return () => { gone = true; };
  }, []);
  if (!shown) return null;
  function dismiss() {
    try { localStorage.setItem(NOTE_KEY, 'dismissed'); } catch { /* it goes for now either way */ }
    setShown(false);
  }
  return (
    <div className="dir-note">
      <div className="dir-note-words">
        <p className="dir-note-head">You&rsquo;re on the board</p>
        <p className="dir-note-said">
          Your name and what you&rsquo;re playing, nothing else &mdash; the same things your journal already
          serves to anyone who visits. Keep someone private in Friends and they stay off everyone&rsquo;s
          board but yours.
        </p>
        <Link href="/settings" className="dir-note-off">Take me off &rarr;</Link>
      </div>
      <button type="button" className="dir-note-x" onClick={dismiss} aria-label="Put this note away">
        <X size={16} weight="regular" aria-hidden="true" />
      </button>
    </div>
  );
}

// ── The Board ──────────────────────────────────────────────────────────────
// `keeper` is whether the person looking keeps this journal (the cross's lock
// has said so). `refreshRef`, when given, is handed the way to ask again, for
// the pull at the top of the pane.
export function Everyone({ keeper = false, refreshRef = null }) {
  const { keeper_name: myName, site_address: myAddress } = useBookplate();
  const me = { name: myName, address: myAddress };
  const mine = tidyJournal(myAddress);

  const { page, down } = useEveryone();
  const [drawing, setDrawing] = useState(false);
  // A friend away: the friends' round carries it (app/api/friends/beacons),
  // asked while the keeper's Board is on screen and never for a visitor,
  // who has no friends here to be a friend away from.
  const { away } = useFriendsBeacons(keeper);

  // The keeper's book, by address, for the checks; the row whose doors are
  // open; the one being filed; what filing it said; the wave it offers.
  const [book, setBook] = useState(() => new Map());
  const [open, setOpen] = useState('');
  const [adding, setAdding] = useState('');
  const [said, setSaid] = useState('');
  const [wavingTo, setWavingTo] = useState(null);

  // A name being looked up, and what came back: null while nothing is typed.
  const [query, setQuery] = useState('');
  const [found, setFound] = useState(null);
  const typed = useRef(0);

  const readBook = useCallback(async () => {
    if (!keeper) return;
    try {
      const r = await fetch('/api/people');
      const d = r.ok ? await r.json() : null;
      if (Array.isArray(d?.people)) setBook(new Map(d.people.map(p => [p.address, p])));
    } catch { /* no checks is the honest fallback */ }
  }, [keeper]);

  // Read again whenever the Board is drawn, so coming back to it is fresh.
  useEffect(() => { readEveryone(); }, []);
  useEffect(() => { readBook(); }, [readBook]);

  // The pull asks for both again.
  useEffect(() => {
    if (!refreshRef) return undefined;
    refreshRef.current = () => Promise.all([readEveryone(), readBook()]);
    return () => { refreshRef.current = null; };
  }, [refreshRef, readBook]);

  // A name, looked up a beat after the typing stops; the last ask wins.
  useEffect(() => {
    const term = query.trim();
    if (!term) { setFound(null); return undefined; }
    const ask = ++typed.current;
    const wait = setTimeout(async () => {
      try {
        const r = await fetch(`${DIRECTORY_URL}?q=${encodeURIComponent(term)}`, { cache: 'no-store' });
        const d = r.ok ? await r.json() : null;
        if (ask === typed.current) setFound(Array.isArray(d?.journals) ? d.journals : []);
      } catch {
        if (ask === typed.current) setFound([]);
      }
    }, 300);
    return () => clearTimeout(wait);
  }, [query]);

  async function shuffle() {
    if (drawing) return;
    setDrawing(true);
    setOpen('');
    await readEveryone({ shuffle: true });
    setDrawing(false);
  }

  // Files somebody in the book, the same write the + in Friends makes. The
  // book on the Friends side hears of it (Friends.js listens for
  // `ln-book-filed`), and somebody new is offered a wave, as adding anybody
  // anywhere offers one (2026-09-23).
  async function add(journal) {
    setAdding(journal.address);
    setSaid('');
    try {
      const r = await fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: journal.address }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.person) { setSaid(d.error || 'That could not be added.'); return; }
      setBook(was => new Map(was).set(d.person.address, d.person));
      window.dispatchEvent(new CustomEvent('ln-book-filed', { detail: d.person }));
      if (d.fresh) setWavingTo(d.person);
    } catch {
      setSaid('That could not be added.');
    } finally {
      setAdding('');
    }
  }

  function row(journal, through = null) {
    // A visitor's row is the way to that journal and nothing else.
    if (!keeper) {
      return (
        <a key={journal.address} className="dir-row" href={journalUrl(journal.address)} target="_blank" rel="noopener noreferrer">
          <Inside journal={journal} />
        </a>
      );
    }
    const inBook = book.has(journal.address);
    const isOpen = open === journal.address;
    return (
      <div key={journal.address} className={'dir-item' + (isOpen ? ' dir-item--open' : '')}>
        <button
          type="button"
          className="dir-row"
          onClick={() => { setSaid(''); setOpen(isOpen ? '' : journal.address); }}
          aria-expanded={isOpen}
        >
          <Inside journal={journal} inBook={inBook} through={through} />
        </button>
        {isOpen && (
          <div className="dir-doors">
            <div className="fr-doors-row">
              <a
                className="fr-door"
                href={carrySender(journalUrl(journal.address), me, { known: inBook })}
                target="_blank"
                rel="noopener noreferrer"
              >
                <BookOpen size={22} weight="regular" aria-hidden="true" />
                Visit
              </a>
              {!inBook && (
                <button type="button" className="fr-door" onClick={() => add(journal)} disabled={adding === journal.address}>
                  <Plus size={22} weight="regular" aria-hidden="true" />
                  {adding === journal.address ? 'Adding…' : 'Add'}
                </button>
              )}
            </div>
            {said && <p className="dir-said" role="status">{said}</p>}
          </div>
        )}
      </div>
    );
  }

  // The band's card: the record, the keeper with a live dot, the record's
  // name and the artist — the Friends room's card (forms.css, .fr-on).
  function card(journal) {
    const href = keeper
      ? carrySender(journalUrl(journal.address), me, { known: book.has(journal.address) })
      : journalUrl(journal.address);
    const name = journal.name || NO_NAME;
    return (
      <a
        key={journal.address}
        className="fr-on"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${name} is logging ${journal.album}${journal.artist ? ` · ${journal.artist}` : ''}`}
      >
        <span className="fr-on-art" aria-hidden="true">
          {journal.art
            ? <img src={journal.art} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} />
            : <span>&#9834;</span>}
        </span>
        <span className="fr-on-who">
          <span className="fr-on-dot" aria-hidden="true" />
          {name}
        </span>
        <span className="fr-on-rec">{journal.album}</span>
        {journal.artist && <span className="fr-on-by">{journal.artist}</span>}
      </a>
    );
  }

  // Never the keeper on their own Board, and — further out — nobody already in
  // their book: the Friends half is where those are.
  const notMe = j => !(mine && j.address === mine);
  const live = page ? page.live.filter(notMe) : [];
  const friendsAway = keeper ? away.filter(j => notMe(j) && !book.has(j.address)) : [];
  const nearer = new Set(friendsAway.map(j => j.address));
  const further = page
    ? page.further.filter(j => notMe(j) && !(keeper && book.has(j.address)) && !nearer.has(j.address))
    : [];

  return (
    <div className="dir-everyone">
      {keeper && <BoardNote />}

      <label className="dir-search">
        <MagnifyingGlass size={16} weight="regular" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Find someone by name"
          aria-label="Find someone on the board by name"
          spellCheck={false}
          autoComplete="off"
        />
      </label>

      {query.trim() ? (
        <section className="dir-section" aria-label="Names on the board">
          {found === null ? (
            <p className="dir-quiet">Looking&hellip;</p>
          ) : found.filter(notMe).length === 0 ? (
            <p className="dir-quiet">Nobody on the board by that name.</p>
          ) : (
            found.filter(notMe).map(row)
          )}
        </section>
      ) : down ? (
        <p className="dir-quiet">The board can&rsquo;t be reached right now.</p>
      ) : page === null ? (
        <p className="dir-quiet">Asking who&rsquo;s on the board&hellip;</p>
      ) : (
        <>
          {live.length > 0 ? (
            <div className="fr-now dir-band">
              <p className="fr-now-head">
                <span className="fr-now-pulse" aria-hidden="true" />
                Logging right now
              </p>
              <div className="fr-now-row">{live.map(card)}</div>
            </div>
          ) : (
            <p className="dir-band-quiet">Nobody on the board is logging right now.</p>
          )}

          {friendsAway.length > 0 && (
            <section className="dir-section" aria-label="A friend away">
              <h2 className="dir-label">A friend away</h2>
              <p className="dir-sub">
                People your friends have added. Two doors down rather than across town &mdash; most of the names
                you actually want are here.
              </p>
              {friendsAway.map(j => row(j, j.through))}
            </section>
          )}

          <section className="dir-section" aria-label="Further out">
            <h2 className="dir-label">Further out</h2>
            <p className="dir-sub">
              Everyone else on the board. Shuffled, never ranked &mdash; the person who logs one record a month
              is as findable as the one who logs four a day.
            </p>
            {further.length === 0 ? (
              <p className="dir-quiet">Nobody else yet.</p>
            ) : (
              further.map(row)
            )}
            <div className="dir-shuffle">
              <span className="dir-shuffle-of">
                {NUMBER_WORDS[further.length] || further.length} of {page.listed}
              </span>
              <button type="button" className="dir-shuffle-go" onClick={shuffle} disabled={drawing}>
                <ArrowsClockwise size={14} weight="regular" aria-hidden="true" />
                {drawing ? 'Shuffling…' : 'Shuffle'}
              </button>
            </div>
          </section>
        </>
      )}

      {!keeper && (
        <>
          <p className="dir-keeps">
            <b>What this page keeps:</b> an address, the day it was listed, a code for taking it off again,
            and what each journal was last seen logging. No entries, no accounts. Coming off the board is one
            switch in a journal&rsquo;s Settings, and leaves nothing behind.
          </p>
          {GET_URL && (
            <a className="dir-get" href={GET_URL}>Get your copy &rarr;</a>
          )}
        </>
      )}
      {keeper && <WaveSheet person={wavingTo} onClose={() => setWavingTo(null)} />}
    </div>
  );
}

// ── The Board at its own address ───────────────────────────────────────────
// For a stranger who was handed the link: the Board as a visitor sees it,
// under the mark and a line saying what it is.
export default function Directory() {
  return (
    <div className="dir-screen">
      <SiteNav />
      <main className="dir-wrap">
        <h1 className="dir-title">Board</h1>
        <p className="dir-lede">
          Journals on the board. Press one to read it &mdash; it lives at its own address, not here.
        </p>
        <Everyone />
      </main>
    </div>
  );
}
