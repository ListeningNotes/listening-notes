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
// added, each with the path to them; then strangers who logged the
// keeper's records, with their stars, marks and a line of what they wrote;
// then a wall of what is being logged everywhere; then everybody else,
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

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ArrowsClockwise, BookOpen, Check, MagnifyingGlass, Plus, User, X } from '@phosphor-icons/react';
import SiteNav from '../../components/main_components/SiteNav';
import WaveSheet from '../../components/main_components/WaveSheet';
import StarRating from '../../components/main_components/StarRating';
import { Marks } from '../../components/main_components/Feed';
import { splitNotes } from '../../library/entry_formatter';
import { useHoldStill } from '../../hooks/useHoldStill';
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
          today: Array.isArray(d?.today) ? d.today : [],
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

// ── Records, piece three, 2026-10-08 ───────────────────────────────────────
// A record is asked about by the first sixteen characters of the sha256 of
// its album_key — the same hash the directory keeps (directory_actions.js,
// boardHash), so a journal's question is short and says nothing but which
// records.
async function hash16(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text || '')));
  return [...new Uint8Array(digest)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// "You logged this last week", "in March", "in March 2025".
function whenWords(iso) {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '';
  const days = (Date.now() - at.getTime()) / 86400000;
  if (days < 7) return 'this week';
  if (days < 14) return 'last week';
  const now = new Date();
  return at.getFullYear() === now.getFullYear() ? `in ${MONTHS[at.getMonth()]}` : `in ${MONTHS[at.getMonth()]} ${at.getFullYear()}`;
}

// ── A line from what they wrote ───────────────────────────────────────────
// The opening of a keeper's own album note, read from their journal by this
// browser when the line is shown (their /api/entries/[slug], which may be
// read across origins) — never from the directory, which keeps no writing.
// Cut at a sentence's end past halfway, or at a word with an ellipsis. A
// journal too old to be read across origins simply has no line.
const LINE_MOST = 150;
const lines = new Map();
function opening(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= LINE_MOST) return clean;
  const cut = clean.slice(0, LINE_MOST);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (stop > LINE_MOST / 2) return cut.slice(0, stop + 1);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : LINE_MOST).replace(/[,;:\u2014-]$/, '')}\u2026`;
}
function readLine(address, slug) {
  const key = `${address}|${slug}`;
  if (!lines.has(key)) {
    lines.set(key, fetch(`${journalUrl(address)}/api/entries/${encodeURIComponent(slug)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => opening(splitNotes(d?.entry?.notes || '').albumNotes) || null)
      .catch(() => null));
  }
  return lines.get(key);
}
function Line({ address, slug }) {
  const [line, setLine] = useState(null);
  useEffect(() => {
    let gone = false;
    readLine(address, slug).then(l => { if (!gone) setLine(l); });
    return () => { gone = true; };
  }, [address, slug]);
  if (!line) return null;
  return <span className="dir-line">&ldquo;{line}&rdquo;</span>;
}

// One keeper of a record: their name — lit when they are logging — a line of
// what they wrote, their stars and their marks. For the keeper a press opens
// the doors: Visit, which goes to their entry for this record, and Add; for
// anybody else the row is the way to that entry.
function KeeperRow({ keeper, viewer }) {
  const [open, setOpen] = useState(false);
  const href = `${journalUrl(keeper.address)}/entries/${encodeURIComponent(keeper.slug)}`;
  const inner = (
    <>
      <span className="dir-keeper-name">
        {keeper.live && <span className="fr-on-dot" aria-hidden="true" />}
        {keeper.name || NO_NAME}
        {viewer?.inBook(keeper.address) && (
          <Check size={13} weight="bold" className="dir-keeper-check" aria-label="In your address book" />
        )}
      </span>
      <Line address={keeper.address} slug={keeper.slug} />
      <span className="dir-keeper-marks">
        {keeper.stars ? <StarRating rating={keeper.stars} size={12} /> : null}
        <Marks entry={keeper} size={12} />
      </span>
    </>
  );
  if (!viewer) {
    return <a className="dir-keeper" href={href} target="_blank" rel="noopener noreferrer">{inner}</a>;
  }
  const inBook = viewer.inBook(keeper.address);
  return (
    <div className={'dir-keeper-item' + (open ? ' dir-keeper-item--open' : '')}>
      <button type="button" className="dir-keeper" onClick={() => setOpen(o => !o)} aria-expanded={open}>{inner}</button>
      {open && (
        <div className="dir-doors">
          <div className="fr-doors-row">
            <a className="fr-door" href={viewer.carry(href, inBook)} target="_blank" rel="noopener noreferrer">
              <BookOpen size={22} weight="regular" aria-hidden="true" />
              Visit
            </a>
            {!inBook && (
              <button type="button" className="fr-door" onClick={() => viewer.add(keeper)} disabled={viewer.adding === keeper.address}>
                <Plus size={22} weight="regular" aria-hidden="true" />
                {viewer.adding === keeper.address ? 'Adding\u2026' : 'Add'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// A tile on the wall: the cover, how many keepers logged it in the last day
// — a count on a record, never beside a person (AGENTS, Never) — and a check
// when the viewer logged it too.
function Tile({ record, yours, onOpen }) {
  const n = record.keepers.length;
  return (
    <button
      type="button"
      className="dir-tile"
      onClick={() => onOpen(record)}
      aria-label={`${record.album}${record.artist ? ` by ${record.artist}` : ''}, logged by ${n} ${n === 1 ? 'keeper' : 'keepers'}${yours ? ' — you logged it too' : ''}`}
    >
      <span className="dir-tile-art" aria-hidden="true">
        {record.art ? <img src={record.art} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} /> : <span>&#9834;</span>}
      </span>
      <span className="dir-tile-pin" aria-hidden="true">
        <span className="fr-on-dot" />
        {n} {n === 1 ? 'keeper' : 'keepers'}
      </span>
      {yours && <span className="dir-tile-yours" aria-hidden="true"><Check size={10} weight="bold" /></span>}
    </button>
  );
}

// The sheet a pressed record opens: who logged it and what they said.
function RecordSheet({ record, yours, viewer, onClose }) {
  const sheetRef = useRef(null);
  useHoldStill(sheetRef, Boolean(record));
  useEffect(() => {
    if (!record) return undefined;
    const key = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [record, onClose]);
  if (!record) return null;
  return (
    <>
      <div className="sn-scrim" onClick={onClose} aria-hidden="true" />
      <section ref={sheetRef} className="sn-sheet dir-sheet" role="dialog" aria-modal="true" aria-label={`Who logged ${record.album}`}>
        <div className="sn-pull" onClick={onClose} aria-hidden="true" />
        <div className="dir-sheet-head">
          <span className="dir-cover dir-sheet-art" aria-hidden="true">
            {record.art ? <img src={record.art} alt="" /> : <span>&#9834;</span>}
          </span>
          <span className="dir-sheet-words">
            <span className="dir-sheet-title">{record.album}</span>
            {record.artist && <span className="dir-sheet-by">{record.artist}</span>}
          </span>
        </div>
        <div className="dir-sheet-list">
          {record.keepers.map(k => <KeeperRow key={`${k.address}|${k.slug}`} keeper={k} viewer={viewer} />)}
        </div>
        <p className="dir-sheet-foot">
          <span className="dir-label">Where this came from</span>
          {yours
            ? 'You logged this too. Everybody here logged it in a journal that is on the board.'
            : 'Nobody you\u2019ve added, necessarily. It\u2019s here because it was logged in a journal that is on the board.'}
        </p>
      </section>
    </>
  );
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
// the pull at the top of the pane. `myEntries` is the keeper's own journal,
// as the wall reads it, for "also on your records" and the checks on the wall
// of what is being logged everywhere.
export function Everyone({ keeper = false, refreshRef = null, myEntries = null }) {
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

  // A name or a record being looked up, and what came back: null while
  // nothing is typed.
  const [query, setQuery] = useState('');
  const [found, setFound] = useState(null);
  const typed = useRef(0);

  // The keeper's own records, newest listen of each, hashed; who else logged
  // them; and the record whose sheet is open.
  const [mineHashed, setMineHashed] = useState(() => new Map());
  const [alike, setAlike] = useState([]);
  const [sheet, setSheet] = useState(null);
  const myRecords = useMemo(() => {
    const newest = new Map();
    for (const e of Array.isArray(myEntries) ? myEntries : []) {
      if (e?.song || !e?.album_key) continue;
      const was = newest.get(e.album_key);
      if (!was || new Date(e.posted_at) > new Date(was)) newest.set(e.album_key, e.posted_at);
    }
    return [...newest.entries()]
      .sort((a, b) => new Date(b[1]) - new Date(a[1]))
      .slice(0, 100);
  }, [myEntries]);
  useEffect(() => {
    if (!keeper || myRecords.length === 0) return undefined;
    let gone = false;
    (async () => {
      try {
        const hashed = new Map();
        for (const [key, at] of myRecords) hashed.set(await hash16(key), at);
        if (gone) return;
        setMineHashed(hashed);
        const r = await fetch(`${DIRECTORY_URL}?alike=${[...hashed.keys()].join(',')}`, { cache: 'no-store' });
        const d = r.ok ? await r.json() : null;
        if (!gone && Array.isArray(d?.records)) setAlike(d.records);
      } catch { /* the section simply stays away */ }
    })();
    return () => { gone = true; };
  }, [keeper, myRecords]);

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
        if (ask === typed.current) {
          setFound({
            journals: Array.isArray(d?.journals) ? d.journals : [],
            records: Array.isArray(d?.records) ? d.records : [],
          });
        }
      } catch {
        if (ask === typed.current) setFound({ journals: [], records: [] });
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

  // What the record parts need to know about the viewer: who is in the book,
  // how to carry the keeper's name on a link out, and how to add somebody.
  // Null for a visitor, whose rows are simply the way to an entry.
  const viewer = keeper ? {
    inBook: address => book.has(address),
    carry: (href, known) => carrySender(href, me, { known }),
    add: journal => add(journal),
    adding,
  } : null;
  const yours = record => keeper && mineHashed.has(record.key_hash);

  // Also on your records: strangers — nobody in the book, never the keeper —
  // who logged something the keeper logged. Six records, three keepers each.
  const onYours = keeper ? alike
    .map(r => ({ ...r, keepers: r.keepers.filter(k => !(mine && k.address === mine) && !book.has(k.address)).slice(0, 3) }))
    .filter(r => r.keepers.length > 0)
    .slice(0, 6) : [];
  const today = page ? page.today || [] : [];

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
          placeholder="A name, or a record"
          aria-label="Find someone or a record on the board"
          spellCheck={false}
          autoComplete="off"
        />
      </label>

      {query.trim() ? (
        <section className="dir-section" aria-label="Found on the board">
          {found === null ? (
            <p className="dir-quiet">Looking&hellip;</p>
          ) : found.journals.filter(notMe).length === 0 && found.records.length === 0 ? (
            <p className="dir-quiet">Nobody and nothing on the board by that name.</p>
          ) : (
            <>
              {found.journals.filter(notMe).map(j => row(j))}
              {found.records.length > 0 && (
                <div className="dir-wall dir-wall--found">
                  {found.records.map(r => <Tile key={r.key_hash} record={r} yours={yours(r)} onOpen={setSheet} />)}
                </div>
              )}
            </>
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

          {onYours.length > 0 && (
            <section className="dir-section" aria-label="Also on your records">
              <h2 className="dir-label">Also on your records</h2>
              <p className="dir-sub">
                Strangers who logged something you&rsquo;ve logged. Nobody you know yet, but they sat with the same
                record.
              </p>
              {onYours.map(r => (
                <div key={r.key_hash} className="dir-shared">
                  <div className="dir-shared-top">
                    <span className="dir-cover" aria-hidden="true">
                      {r.art ? <img src={r.art} alt="" loading="lazy" /> : <span>&#9834;</span>}
                    </span>
                    <span className="dir-shared-words">
                      <span className="dir-shared-title">{r.album}</span>
                      {r.artist && <span className="dir-shared-by">{r.artist}</span>}
                      {mineHashed.get(r.key_hash) && (
                        <span className="dir-shared-mine">You logged this {whenWords(mineHashed.get(r.key_hash))}</span>
                      )}
                    </span>
                  </div>
                  <div className="dir-shared-list">
                    {r.keepers.map(k => <KeeperRow key={`${k.address}|${k.slug}`} keeper={k} viewer={viewer} />)}
                  </div>
                </div>
              ))}
            </section>
          )}

          {today.length > 0 && (
            <section className="dir-section" aria-label="Being logged everywhere">
              <h2 className="dir-label">Being logged everywhere</h2>
              <p className="dir-sub">
                The last day across every journal on the board. Press a record to see who sat with it and what
                they said.
              </p>
              <div className="dir-wall">
                {today.map(r => <Tile key={r.key_hash} record={r} yours={yours(r)} onOpen={setSheet} />)}
              </div>
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
              further.map(j => row(j))
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
      <RecordSheet record={sheet} yours={sheet ? yours(sheet) : false} viewer={viewer} onClose={() => setSheet(null)} />
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
