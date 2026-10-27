// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';

// components/main_components/PeopleScreen.js
// People, one screen: Home's anatomy pointed outward.
//
// Miyel's People brief, 2026-10-23. Home is a beacon, a shelf line and a
// wall; People is other people's beacons, a shelf line, and a wall of their
// records. One screen, three bands, no second floor and no tabs. It replaced
// a grid of every face in the book with the feed a floor below it, and the
// Board as a second word in the bar: the grid had nothing to do with you at
// the moment you looked at it, and the feed handed you other people's
// writing to get through.
//
// ── The three bands ───────────────────────────────────────────────────────
// People is your friends and nothing else (Miyel, 2026-10-24: "should this
// page stay strictly for friends"); finding people is the Board's. It
// stands on the address book alone, never on the Board's list.
//
// The top, as home's top is the keeper's beacon (her calls, 2026-10-24):
// Add and See all in small capitals at the right; every face in the book,
// whoever is logging first; and one short line — a small cover, a name,
// what they are logging or logged, and when — for whoever is logging, or
// else whoever logged last. A face pressed dims the rest, the line becomes
// theirs, and their doors open under it, the address book's own (Visit,
// their journal page on this copy, Send, and Keep private and Remove on
// the quiet line; Compare moved into that page and Pin went, 2026-10-26);
// pressed again, it closes. Add turns the line into the way in: one field
// that finds a name on the Board or takes an address, the camera for a
// code, Invite, and the way to the Board itself. See all opens the whole
// book under it, searchable, pushing the wall down (Friends.js, `inPeople`).
// A hairline, then the wall. It replaced, in a day of her calls, a band of
// the live faces (TopBand, which the address book still draws), then a
// friend's beacon drawn large, then on its side with Add and See all as
// bubbles — "it's weird three friends", and the beacon was too much.
//
// ── Your friends, 2026-10-27 ──────────────────────────────────────────────
// Miyel's Friends brief, step two of her build order. The line moved up,
// to where Headlines will stand (step three), and under it *Your friends*
// at the left and three glyphs over their words at the right: Add, Find
// once the book is past twenty ("a small book never shows a search field it
// doesn't need"), and Ticket, which hands out the invitation as Invite did
// until the ticket's own brief. The row is the closed drawer: five faces
// that fit, never scrolling sideways; pulled down, or opened by See all
// under it, the rows under them follow in place, and Close puts them back —
// See all's book under the line went.
// Whoever has something waiting comes first and wears New under the chin,
// then whoever is logging, then everybody else shuffled, never by name.
//
// The shelf line is the wall's own (Journal.js): the views at its left and
// the search, as on home. Whose records — Your friends, Your records,
// Everyone's — stood after the search for a day and went with the Board:
// Your records was the Board's keepers on the keeper's own records, which
// the Board shows itself (Also on your records).
//
// The wall is covers, with the faces of whoever logged each one in the
// corner — the keeper's own first, when it is on their wall too. That was a
// gold dot for an afternoon, and Miyel asked why a record showed only her
// friend and "not me and" them (2026-10-23): one mark, the face, says both.
// A cover opens the entry on the journal of whoever logged it last. Nothing
// is written on anybody's record here and nothing opens a thread.
//
// ── Where the wall comes from ─────────────────────────────────────────────
// Nothing new crosses between copies: each journal in the book's public
// feed, read from this browser the way the feed read it. Add's names are
// the Board's own search.
//
// ── Never ─────────────────────────────────────────────────────────────────
// No count beside a person: the count on the line is of records. Nothing is
// ordered by how much anybody logs: a record is placed by when it was last
// logged, and the faces on it are newest first.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, BookOpen, Camera, CaretDown, MagnifyingGlass, PaperPlaneTilt, Ticket, User, UserPlus } from '@phosphor-icons/react';
import Journal, { foldForSearch } from './Journal';
import { since } from './Friends';
import CodeScanner from './CodeScanner';
import SendSheet from './SendSheet';
import InviteSheet from './InviteSheet';
import WaveSheet from './WaveSheet';
import PullDown from './PullDown';
import { useBookplate } from './Bookplate';
import { useFriendsBeacons, refreshFriends } from '../../hooks/useFriendsBeacons';
import { carrySender, journalUrl, tidyJournal } from '../../library/return_address';
import { DIRECTORY_URL } from '../../library/version';

// The wall's view remembers itself between visits, apart from home's.
const VIEW_KEY = 'ln-people-view';

// How long one journal gets to answer before its records are simply absent
// (the feed's number).
const EACH_MS = 8000;
// How long Add waits for the typing to stop before asking the Board.
const ASK_AFTER_MS = 350;
// The faces in a cover's corner: the newest few of whoever else logged it,
// after the keeper's own.
const FACES_MOST = 3;
// What came back from a send goes to the inbox (below), the newest this many.
const CAME_BACK_MOST = 30;
// Past this many in the book, Find stands beside Add.
const FIND_PAST = 20;
// Faces across the drawer, and so in the closed row.
const ACROSS = 5;
// The drawer's opening and closing: the page's own curve and the doors'
// clock, a beat longer for the distance the faces travel.
const DRAWER_MS = 400;
const DRAWER_EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
// How far a finger drags down the closed row before it opens.
const PULL_OPENS = 28;

const releaseYear = entry => {
  const m = String(entry?.year || '').match(/\d{4}/);
  return m ? m[0] : '';
};
// A record by its title and artist, folded, so a beacon's record can be
// matched to the entry in that journal's feed.
const byName = (album, artist) => `${foldForSearch(album)}|${foldForSearch(artist)}`;
const newestFirst = (a, b) => new Date(b.posted_at || 0) - new Date(a.posted_at || 0);

// ── Your friends' records, as the wall draws records ──────────────────────
// gatherAlbums' shape (Journal.js), with who logged each: one tile per
// record — its key and its year, as on home — across everybody in the book.
// `first` is its newest entry, not its oldest: home's wall is a shelf in the
// order records arrived, and this one is news, so In order is the most
// recently logged first.
function gatherTheirs(rows, mine) {
  const byKey = new Map();
  for (const { entry, who } of rows) {
    const key = entry.album_key ? `${entry.album_key}|${releaseYear(entry)}` : `${who.address}/${entry.slug}`;
    let record = byKey.get(key);
    if (!record) { record = { key, all: [] }; byKey.set(key, record); }
    record.all.push({ ...entry, by: who });
  }
  return [...byKey.values()].map(record => {
    const all = record.all.sort(newestFirst);
    const listens = all.filter(e => !e.song);
    const notes = all.filter(e => e.song);
    const loggers = [];
    for (const e of all) if (!loggers.some(l => l.address === e.by.address)) loggers.push({ ...e.by, slug: e.slug });
    const face = listens[0] || notes[0];
    return {
      key: record.key, all, listens, notes, face, first: all[0], loggers,
      mine: Boolean(face.album_key && mine.keys.has(face.album_key)),
    };
  });
}

// ── What a friend is logging, or logged ──────────────────────────────────
// What their own beacon says, as their home draws it, with the entry it
// names where their feed holds it, so the line opens on what they wrote; a
// journal whose beacon has not answered yet stands on the newest entry in
// its feed. Null for somebody with nothing logged.
function recordOf(friend) {
  const b = friend.beacon;
  if (b && b.album && (b.state === 'logging' || b.state === 'logged')) {
    const named = friend.live ? null : friend.entries.find(e => byName(e.album, e.artist) === byName(b.album, b.artist));
    return {
      live: friend.live,
      title: b.track || b.album,
      artist: b.artist || '',
      art: b.art || named?.album_art || '',
      path: named?.slug ? `/entries/${encodeURIComponent(named.slug)}` : '',
      at: friend.live ? '' : (b.at || named?.posted_at || ''),
    };
  }
  if (friend.newest) {
    return {
      live: false,
      title: friend.newest.song || friend.newest.album,
      artist: friend.newest.artist || '',
      art: friend.newest.album_art || '',
      path: `/entries/${encodeURIComponent(friend.newest.slug)}`,
      at: friend.newest.posted_at || '',
    };
  }
  return null;
}

// `scroller` is the pane that scrolls; `pullMark` is the mark the pull down
// draws in the gap it opens (PullDown.js).
export default function PeopleScreen({ scroller, onScreen = true, entries = [], pullMark = null }) {
  const { keeper_name, site_address, portrait_url: myFace } = useBookplate();
  const me = useMemo(() => ({ name: keeper_name, address: site_address }), [keeper_name, site_address]);

  // ── The book, and what each journal in it has logged ────────────────────
  // null until the book has answered, so an empty book and a book not yet
  // read draw differently.
  const [people, setPeople] = useState(null);
  // Every address this journal answers to (where it lives and where it
  // lived), for what came back, below.
  const [own, setOwn] = useState([]);
  // address → { entries, name, failed }, filled as each journal answers.
  const [journals, setJournals] = useState({});
  // Where each face falls among the ones with nothing to say for themselves:
  // drawn once a visit for each address, so the row is shuffled and then
  // holds still while it is read.
  const [shuffle, setShuffle] = useState({});
  const asked = useRef(new Set());
  const readBook = useCallback(() => {
    fetch('/api/people')
      .then(r => (r.ok ? r.json() : { people: [] }))
      .then(d => {
        const had = d.people || [];
        setOwn(Array.isArray(d.own) ? d.own : []);
        setPeople(had);
        setShuffle(prev => {
          const next = { ...prev };
          for (const p of had) if (!(p.address in next)) next[p.address] = Math.random();
          return next;
        });
        for (const p of had) {
          if (asked.current.has(p.address)) continue;
          asked.current.add(p.address);
          fetch(`${journalUrl(p.address)}/api/public/entries`, { signal: AbortSignal.timeout(EACH_MS) })
            .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
            .then(j => {
              const name = String(j.keeper_name || '').trim() || p.name || '';
              setJournals(prev => ({ ...prev, [p.address]: { entries: j.entries || [], name } }));
            })
            .catch(() => {
              // Asked again the next time the book is read, rather than never.
              asked.current.delete(p.address);
              setJournals(prev => ({ ...prev, [p.address]: { entries: [], name: p.name || '', failed: true } }));
            });
        }
      })
      .catch(() => setPeople(prev => prev ?? []));
  }, []);
  useEffect(() => { readBook(); }, [readBook]);
  // The book is read again whenever its drawer closes — somebody may have
  // been added or crossed out in it — and on a pull down, which also asks
  // for everybody's beacon past the route's minute.
  const path = usePathname();
  const wasPath = useRef(path);
  useEffect(() => {
    if (wasPath.current === '/dashboard/people' && path !== '/dashboard/people') readBook();
    wasPath.current = path;
  }, [path, readBook]);
  // ── What waits on a face, 2026-10-27 ────────────────────────────────────
  // Miyel's Friends brief: anything from a person waits on that person's
  // face, and the face says New, never how many. Read from the inbox's own
  // routes, which the inbox goes on reading until it retires (the last step
  // of her build order). New is what this journal has not opened yet —
  // each row's seen_at, kept here and never sent anywhere ("New means I
  // haven't seen it") — and a friend's journal that moved, until Update.
  // Asked again each time the screen comes on show, since the inbox may
  // have opened something meanwhile.
  const [arrivals, setArrivals] = useState(null);
  const readArrivals = useCallback(() => {
    const list = (url, key) => fetch(url, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : {}))
      .then(d => (Array.isArray(d[key]) ? d[key] : []))
      .catch(() => []);
    return Promise.all([
      list('/api/submissions', 'submissions'),
      list('/api/messages', 'messages'),
      list('/api/waves', 'waves'),
      list('/api/came-back', 'cameBack'),
    ]).then(([sends, messages, waves, back]) => setArrivals({ sends, messages, waves, back }));
  }, []);
  useEffect(() => { if (onScreen) readArrivals(); }, [onScreen, readArrivals]);
  const fresh = useMemo(() => {
    const out = new Set();
    const note = (address, unseen) => {
      const at = tidyJournal(address || '');
      if (at && unseen) out.add(at);
    };
    for (const s of arrivals?.sends || []) note(s.sender_url, s.status === 'pending' && !s.seen_at);
    for (const m of arrivals?.messages || []) if (!m.admin) note(m.from_journal, !m.seen_at);
    for (const w of arrivals?.waves || []) note(w.address, !w.seen_at);
    for (const c of arrivals?.back || []) note(c.journal, !c.seen_at);
    for (const p of people || []) note(p.address, Boolean(p.moved_to));
    return out;
  }, [arrivals, people]);

  const again = useCallback(() => {
    asked.current.clear();
    readBook();
    readArrivals();
    return refreshFriends();
  }, [readBook, readArrivals]);

  // Their beacons, through the one shared poll (useFriendsBeacons): only
  // while this screen is the one on show.
  const { friends: beacons } = useFriendsBeacons(onScreen);

  // ── The keeper's own records, for their face on a cover ─────────────────
  const mine = useMemo(() => {
    const keys = new Set();
    const byKey = new Map();
    const byNameMap = new Map();
    for (const e of entries) {
      if (e.album_key) { keys.add(e.album_key); if (!byKey.has(e.album_key)) byKey.set(e.album_key, e); }
      const n = byName(e.album, e.artist);
      if (!byNameMap.has(n)) byNameMap.set(n, e);
    }
    return { keys, byKey, byName: byNameMap };
  }, [entries]);

  const inBook = useMemo(() => new Set((people || []).map(p => tidyJournal(p.address))), [people]);
  const rows = useMemo(() => {
    const out = [];
    for (const p of people || []) {
      const j = journals[p.address];
      if (!j) continue;
      for (const entry of j.entries) out.push({ entry, who: { address: p.address, name: j.name || p.name || '' } });
    }
    return out;
  }, [people, journals]);
  const ours = useMemo(() => gatherTheirs(rows, mine), [rows, mine]);
  const stillAsking = Boolean(people?.some(p => !journals[p.address]));

  // ── What came back, 2026-09-22, from the feed ───────────────────────────
  // Their Submission entries whose credit names this journal — by address
  // when the credit carries one, by the name the send carried when it does
  // not (an entry from before the address travelled). Once every journal in
  // the book has answered, the match goes to this copy's own server, which
  // writes down what it has not seen before as an arrival in the inbox
  // (library/came_back_actions.js). The feed did this until People became
  // one screen; it reads the same journals, so it is done here now. Once per
  // set — a screen that draws again does not post the same rows again.
  const myAddresses = useMemo(
    () => new Set([tidyJournal(site_address), ...own.map(tidyJournal)].filter(Boolean)),
    [site_address, own],
  );
  const told = useRef('');
  useEffect(() => {
    if (!people || stillAsking) return;
    const myName = String(keeper_name || '').trim().toLowerCase();
    const back = [...rows].sort((a, b) => newestFirst(a.entry, b.entry)).filter(({ entry }) => {
      if (entry.entry_type !== 'Submission') return false;
      const url = tidyJournal(entry.received_from_url);
      if (url) return myAddresses.has(url);
      const name = String(entry.received_from || '').trim().toLowerCase();
      return Boolean(name) && name === myName;
    }).slice(0, CAME_BACK_MOST);
    if (back.length === 0) return;
    const said = back.map(({ who, entry }) => `${who.address}/${entry.slug}`).join(' ');
    if (said === told.current) return;
    told.current = said;
    fetch('/api/came-back', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rows: back.map(({ who, entry }) => ({
          journal: who.address,
          name: who.name,
          slug: entry.slug,
          album: entry.album,
          artist: entry.artist,
          album_art: entry.album_art,
          song: entry.song || '',
          rating: entry.rating_value,
          masterpiece: entry.masterpiece === true || entry.masterpiece === 'true',
          by_hand: entry.credit_by_hand === true,
          posted_at: entry.posted_at,
        })),
      }),
    }).catch(() => {});
  }, [people, stillAsking, rows, myAddresses, keeper_name]);

  // ── The search ──────────────────────────────────────────────────────────
  // The line's search narrows the wall as home's does, by a record's name,
  // its artist, a song in it and who logged it. Only the book: the Board's
  // search is Add's.
  const [term, setTerm] = useState('');
  const seek = useMemo(() => ({
    placeholder: 'Names, albums or artists',
    label: 'Search your friends’ records by album, artist or name',
    onChange: said => setTerm(String(said || '').trim()),
    matches: (album, q) => (
      foldForSearch(album.face.album).includes(q)
      || foldForSearch(album.face.artist).includes(q)
      || album.notes.some(n => foldForSearch(n.song).includes(q))
      || album.loggers.some(l => foldForSearch(l.name).includes(q))
    ),
  }), []);
  const loading = people === null || (stillAsking && ours.length === 0);

  // ── A record on the wall ────────────────────────────────────────────────
  // The cover, and in its corner the keeper's own face when it is on their
  // wall too, then the faces of whoever else logged it, newest first. It
  // opens the entry on the journal of whoever logged it last, carrying who
  // this copy belongs to (carrySender), and that it is somebody already in
  // the book.
  const there = useCallback((address, path = '') => carrySender(
    `${journalUrl(address)}${path}`, me, { known: inBook.has(tidyJournal(address)) },
  ), [me, inBook]);
  const tile = useCallback(album => {
    const face = album.face;
    const last = album.loggers[0];
    const folded = album.listens.length === 0;
    const names = [...(album.mine ? ['you'] : []), ...album.loggers.map(l => l.name).filter(Boolean)];
    const said = face.album + (face.artist ? ` by ${face.artist}` : '')
      + (names.length ? `, logged by ${names.join(', ')}` : '');
    return (
      <a
        href={there(last.address, `/entries/${encodeURIComponent(last.slug)}`)}
        target="_blank"
        rel="noopener noreferrer"
        className={'ft ps-tile' + (folded ? ' ft--page' : '')}
        data-tile-key={album.key}
        aria-label={said}
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
        <span className="ps-who" aria-hidden="true">
          {album.mine && (
            <span className="ps-who-face">
              <User size={10} weight="regular" />
              {myFace && <img src={myFace} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} />}
            </span>
          )}
          {album.loggers.slice(0, FACES_MOST).map(l => (
            <span key={l.address} className="ps-who-face">
              <User size={10} weight="regular" />
              <img
                src={`${journalUrl(l.address)}/api/portrait`}
                alt=""
                loading="lazy"
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
            </span>
          ))}
        </span>
      </a>
    );
  }, [there, myFace]);

  // ── The top: the faces, one line, and their doors ───────────────────────
  // The row is the book: whoever has something waiting first, then whoever
  // is logging, then everybody else shuffled (her brief, 2026-10-27: "Never
  // alphabetical") — never by how much anybody logs.
  const lineup = useMemo(() => {
    const byBeacon = new Map((beacons || []).map(b => [b.address, b]));
    const all = (people || []).map(p => {
      const b = byBeacon.get(p.address);
      const j = journals[p.address];
      const newest = (j?.entries || []).reduce((n, e) => (!n || newestFirst(e, n) < 0 ? e : n), null);
      return {
        person: p,
        address: p.address,
        name: j?.name || p.name || b?.name || '',
        beacon: b,
        live: b?.state === 'logging' && Boolean(b.album),
        waiting: fresh.has(tidyJournal(p.address)),
        newest,
        entries: j?.entries || [],
        at: Date.parse(b?.at || '') || Date.parse(newest?.posted_at || '') || 0,
      };
    });
    const group = f => (f.waiting ? 0 : f.live ? 1 : 2);
    return all.sort((a, b) => group(a) - group(b) || (shuffle[a.address] ?? 1) - (shuffle[b.address] ?? 1));
  }, [people, beacons, journals, fresh, shuffle]);
  // Nobody pressed: the line is whoever is logging, or else whoever logged
  // last. A face pressed: the line is theirs, the rest of the row dims, and
  // their doors open under it; pressed again, it all closes.
  const [open, setOpen] = useState(null);
  const latest = lineup.find(f => f.live)
    || lineup.reduce((best, f) => (f.at && (!best || f.at > best.at) ? f : best), null);
  const opened = open ? lineup.find(f => f.address === open) || null : null;
  const lead = opened || latest;
  const record = useMemo(() => (lead ? recordOf(lead) : null), [lead]);
  // A cover that fails is remembered, as home's beacon does, so the browser's
  // broken picture is never drawn.
  const [badArt, setBadArt] = useState('');
  const art = record?.art && record.art !== badArt ? record.art : '';
  // "2 hours ago" is read off the clock as the line draws, so while it says
  // one it is drawn again once a minute.
  const [, tick] = useState(0);
  const saysWhen = Boolean(record && !record.live && record.at);
  useEffect(() => {
    if (!saysWhen) return undefined;
    const clock = setInterval(() => tick(n => n + 1), 60 * 1000);
    return () => clearInterval(clock);
  }, [saysWhen]);
  const when = saysWhen ? since(record.at) : '';
  // The doors keep whoever they were for while they fold shut, so they
  // close rather than empty first.
  const [doorsFor, setDoorsFor] = useState(null);
  if (open && open !== doorsFor) setDoorsFor(open);
  const doorsWho = doorsFor ? lineup.find(f => f.address === doorsFor) || null : null;

  // New, when something of theirs waits: the app's one mark (the brief, "the
  // word New on a pill"), tucked under the chin and never across the face.
  const faceOf = (address, size, waiting = false) => (
    <span className="fr-ring" aria-hidden="true">
      <span className="fr-face">
        <User size={size} weight="regular" />
        <img
          src={`${journalUrl(address)}/api/portrait`}
          alt=""
          loading="lazy"
          onError={e => { e.currentTarget.style.display = 'none'; }}
        />
      </span>
      {waiting && <span className="ln-new ln-new--face">New</span>}
    </span>
  );

  // ── Their doors, the address book's ─────────────────────────────────────
  // The same four and the same quiet line as a face pressed in the book
  // (Friends.js): Miyel, "where did our actual buttons go". The writes are
  // the book's own routes; the row reads the book again after each.
  const [sendingTo, setSendingTo] = useState(null);
  const [sure, setSure] = useState(false);
  useEffect(() => { setSure(false); }, [open]);
  const change = useCallback(async (id, body) => {
    await fetch(`/api/people/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => null);
    readBook();
  }, [readBook]);
  const cross = useCallback(async id => {
    setSure(false);
    await fetch(`/api/people/${id}`, { method: 'DELETE' }).catch(() => null);
    setOpen(null);
    readBook();
  }, [readBook]);
  // A press anywhere else puts Remove back, as it does in the book.
  const binRef = useRef(null);
  useEffect(() => {
    if (!sure) return undefined;
    const away = e => { if (!binRef.current?.contains(e.target)) setSure(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [sure]);

  // ── Adding, in place ────────────────────────────────────────────────────
  // Add turns the line into the way in (Miyel, 2026-10-24): a name found on
  // the Board, an address typed, or a code to the camera, and the Board
  // itself. It does not open the keyboard — most people scan (the book's own
  // rule, 2026-09-19).
  const [adding, setAdding] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [wavingTo, setWavingTo] = useState(null);
  const [typed, setTyped] = useState('');
  const [filing, setFiling] = useState(false);
  const [said, setSaid] = useState('');
  const [named, setNamed] = useState({ term: '', journals: [] });
  const looksLikeAddress = /\./.test(typed) && !/\s/.test(typed.trim());
  useEffect(() => {
    const q = typed.trim();
    if (!adding || !DIRECTORY_URL || q.length < 2 || looksLikeAddress) return undefined;
    let gone = false;
    const wait = setTimeout(() => {
      fetch(`/api/board?q=${encodeURIComponent(q)}`, { cache: 'no-store' })
        .then(r => (r.ok ? r.json() : null))
        .then(d => {
          if (gone) return;
          const found = (Array.isArray(d?.journals) ? d.journals : [])
            .filter(j => j?.address && j.name && !myAddresses.has(tidyJournal(j.address)));
          setNamed({ term: q, journals: found });
        })
        .catch(() => { if (!gone) setNamed({ term: q, journals: [] }); });
    }, ASK_AFTER_MS);
    return () => { gone = true; clearTimeout(wait); };
  }, [typed, adding, looksLikeAddress, myAddresses]);
  const stopAdding = () => { setAdding(false); setTyped(''); setSaid(''); setNamed({ term: '', journals: [] }); };
  // Files an address however it came — found, typed or scanned — as the
  // book does, opens them, and offers the wave to somebody new.
  const file = useCallback(async value => {
    const address = tidyJournal(value);
    if (!address) { setSaid("That doesn't look like a web address."); return; }
    setFiling(true);
    setSaid('');
    try {
      const r = await fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setSaid(d.error || 'That could not be added.'); return; }
      setAdding(false);
      setTyped('');
      setNamed({ term: '', journals: [] });
      setSaid(d.reached ? '' : "Added, but that journal isn't answering just now, so there's no name yet.");
      setOpen(d.person.address);
      readBook();
      if (d.fresh) setWavingTo(d.person);
    } catch {
      setSaid('That could not be added.');
    } finally {
      setFiling(false);
    }
  }, [readBook]);
  const typedNow = typed.trim();
  const namedNow = named.term === typedNow ? named.journals : [];
  const stillNaming = Boolean(DIRECTORY_URL) && typedNow.length >= 2 && !looksLikeAddress && named.term !== typedNow;

  // ── The drawer, 2026-10-27 ──────────────────────────────────────────────
  // The row is the drawer, closed (Miyel's Friends brief): one row of five,
  // the first five of the book's order, and never scrolling on to the right
  // (her pick the same day: "I don't like that it ... infinitely scrolls to
  // the right"). See all under it, or a finger dragged down it, lets the
  // rows under the first down in place and pushes the wall with them; Close
  // folds them back up. The faces stand where they stand: only the drawer's
  // height moves, so nothing appears or vanishes. Find opens it with a name
  // field, and closing it puts the field away.
  const [drawer, setDrawer] = useState(false);
  const [finding, setFinding] = useState(false);
  const [sought, setSought] = useState('');
  const rowRef = useRef(null);
  const wasHeight = useRef(null);
  const setDrawerTo = next => {
    if (next === drawer) return;
    wasHeight.current = rowRef.current ? rowRef.current.offsetHeight : null;
    setDrawer(next);
    if (!next) { setFinding(false); setSought(''); }
  };
  // How tall the closed drawer is: its first face and the drawer's own
  // padding, measured, so a longer name or a larger type cannot cut it.
  useLayoutEffect(() => {
    const row = rowRef.current;
    const first = row?.firstElementChild;
    if (!first) return;
    const pad = getComputedStyle(row);
    row.style.setProperty('--ps-shut', `${first.offsetHeight + parseFloat(pad.paddingTop) + parseFloat(pad.paddingBottom)}px`);
  });
  useLayoutEffect(() => {
    const row = rowRef.current;
    const was = wasHeight.current;
    wasHeight.current = null;
    if (!row || was == null || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    row.animate([{ height: `${was}px` }, { height: `${row.offsetHeight}px` }], { duration: DRAWER_MS, easing: DRAWER_EASE });
  }, [drawer]);
  // A finger dragged down the closed row opens it, as the brief's pull does.
  const pull = useRef(null);
  const onRowTouchStart = e => {
    pull.current = !drawer && e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  };
  const onRowTouchMove = e => {
    const from = pull.current;
    if (!from) return;
    const dx = e.touches[0].clientX - from.x;
    const dy = e.touches[0].clientY - from.y;
    if (Math.abs(dx) > PULL_OPENS) { pull.current = null; return; }
    if (dy > PULL_OPENS && dy > Math.abs(dx) * 1.5) { pull.current = null; setDrawerTo(true); }
  };

  const pressFace = address => {
    if (adding) stopAdding();
    setOpen(o => (o === address ? null : address));
  };

  // ── Your friends, and three glyphs ──────────────────────────────────────
  // Each a glyph over its word, as the top row's stops are; underlined while
  // what it opens is open. Find only past FIND_PAST, and Ticket hands out
  // the invitation until the ticket's own brief says what it unrolls.
  const canFind = (people?.length || 0) > FIND_PAST;
  const head = (
    <div className="ps-head">
      <h2 className="ps-head-said">Your friends</h2>
      <div className="ps-glyphs">
        <button
          type="button"
          className={'ps-glyph' + (adding ? ' ps-glyph--on' : '')}
          onClick={() => { if (adding) stopAdding(); else { setAdding(true); setSaid(''); } }}
          aria-expanded={adding}
          aria-label={adding ? 'Never mind' : 'Add a journal'}
        >
          <UserPlus size={20} weight="regular" aria-hidden="true" />
          <span className="ps-glyph-word">Add</span>
        </button>
        {canFind && (
          <button
            type="button"
            className={'ps-glyph' + (finding ? ' ps-glyph--on' : '')}
            onClick={() => {
              if (finding) { setFinding(false); setSought(''); return; }
              setFinding(true);
              setDrawerTo(true);
            }}
            aria-expanded={finding}
            aria-label="Find one of your friends"
          >
            <MagnifyingGlass size={20} weight="regular" aria-hidden="true" />
            <span className="ps-glyph-word">Find</span>
          </button>
        )}
        <button
          type="button"
          className="ps-glyph"
          onClick={() => setInviting(true)}
          aria-label="Invite someone"
        >
          <Ticket size={20} weight="regular" aria-hidden="true" />
          <span className="ps-glyph-word">Ticket</span>
        </button>
      </div>
    </div>
  );

  const soughtNow = foldForSearch(sought.trim());
  const shown = finding && soughtNow ? lineup.filter(f => foldForSearch(f.name).includes(soughtNow)) : lineup;
  const row = lineup.length > 0 ? (
    <div
      ref={rowRef}
      className={'ps-row' + (drawer ? ' ps-row--drawer' : '') + (opened && !adding ? ' ps-row--open' : '')}
      onTouchStart={onRowTouchStart}
      onTouchMove={onRowTouchMove}
    >
      {shown.map((f, i) => {
        const isOpen = Boolean(!adding && opened && f.address === opened.address);
        return (
          <button
            key={f.address}
            type="button"
            inert={!drawer && i >= ACROSS ? true : undefined}
            className={'fr-live-one ps-row-one' + (f.live ? ' ps-row-one--live' : '') + (f.waiting ? ' ps-row-one--new' : '') + (isOpen ? ' ps-row-one--open' : '')}
            onClick={() => pressFace(f.address)}
            aria-expanded={isOpen}
            aria-label={[f.name, f.live && 'logging', f.waiting && 'something new'].filter(Boolean).join(', ')}
          >
            {faceOf(f.address, 20, f.waiting)}
            <span className="fr-live-name">{f.name}</span>
          </button>
        );
      })}
    </div>
  ) : null;
  // Find's field, at the head of the open drawer.
  const findHere = finding ? (
    <label className="dir-search ps-find">
      <MagnifyingGlass size={14} weight="regular" aria-hidden="true" />
      <input
        value={sought}
        onChange={e => setSought(e.target.value)}
        placeholder="Start typing a name"
        aria-label="Find one of your friends by name"
        autoComplete="off"
        spellCheck={false}
      />
    </label>
  ) : null;
  // See all under the closed row, the caret under the words (her ask,
  // 2026-10-27); Close under the open one. Not drawn while everybody fits.
  const drawerDoor = lineup.length > ACROSS ? (
    <button
      type="button"
      className={'ps-pull' + (drawer ? ' ps-pull--open' : '')}
      onClick={() => setDrawerTo(!drawer)}
      aria-expanded={drawer}
      aria-label={drawer ? 'Close your friends' : 'See all your friends'}
    >
      {drawer ? 'Close' : 'See all'}
      <CaretDown size={10} weight="bold" aria-hidden="true" />
    </button>
  ) : null;
  const nobodyFound = finding && soughtNow && shown.length === 0;

  // The one line: a small cover, the name, what, and when. It opens the
  // entry their beacon names, or their journal.
  const strip = lead ? (
    <a
      key={lead.address}
      className="ps-strip"
      href={there(lead.address, record?.path || '')}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={record
        ? `${lead.name} ${record.live ? 'is logging' : 'logged'} ${record.title}${record.artist ? ` by ${record.artist}` : ''}${when ? `, ${when}` : ''}`
        : `${lead.name}’s journal`}
    >
      <span className="ps-strip-art" aria-hidden="true">
        {art ? <img src={art} alt="" loading="lazy" onError={() => setBadArt(art)} /> : <span>&#9834;</span>}
      </span>
      <span className="ps-strip-name">{lead.name}</span>
      <span className="ps-strip-what">
        {record ? (
          <>
            {record.live && <span className="ps-strip-dot" aria-hidden="true" />}
            {record.live ? 'logging' : 'logged'} {record.title}
          </>
        ) : 'Nothing logged yet.'}
      </span>
      {when && <span className="ps-strip-when">&middot; {when}</span>}
    </a>
  ) : null;

  const doors = (
    <div className={'ps-doors' + (opened && !adding ? ' ps-doors--open' : '')} inert={opened && !adding ? undefined : true}>
      <div className="ps-doors-in">
        {doorsWho && (
          <>
            <div className="fr-doors-row">
              {/* Visit is their journal page on this copy, 2026-10-26, where
                  Compare now opens (Miyel's Friends answers); Pin went the
                  same day, her call. */}
              <Link className="fr-door" href={`/dashboard/people/${doorsWho.person.id}`}>
                <BookOpen size={22} weight="regular" aria-hidden="true" />
                Visit
              </Link>
              <button type="button" className="fr-door" onClick={() => setSendingTo(doorsWho.person)}>
                <PaperPlaneTilt size={22} weight="regular" aria-hidden="true" />
                Send
              </button>
            </div>
            <div className="fr-quiets ps-quiets">
              {DIRECTORY_URL && (
                <button
                  type="button"
                  className={'fr-cut fr-keep' + (doorsWho.person.private ? ' fr-keep--on' : '')}
                  onClick={() => change(doorsWho.person.id, { private: !doorsWho.person.private })}
                  aria-pressed={Boolean(doorsWho.person.private)}
                  title={doorsWho.person.private
                    ? `${doorsWho.name || 'They'} stay off everyone's board but yours. Press to share them again.`
                    : `Keep ${doorsWho.name || 'them'} off everyone's board but yours`}
                >
                  {doorsWho.person.private ? 'Kept private' : 'Keep private'}
                </button>
              )}
              <button
                ref={binRef}
                type="button"
                className={'fr-cut' + (sure ? ' fr-cut--sure' : '')}
                onClick={() => { if (!sure) { setSure(true); return; } cross(doorsWho.person.id); }}
                title={sure
                  ? `Press again to take ${doorsWho.name || 'them'} out of your book`
                  : `Take ${doorsWho.name || 'them'} out of your book`}
              >
                {sure ? 'Remove from journal?' : 'Remove from journal'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const addHere = adding ? (
    <div className="ps-add">
      <div className="ps-add-line">
        <button
          type="button"
          className="fr-scan"
          onClick={() => setScanning(true)}
          aria-label="Point the camera at a code"
          title="Scan a code"
        >
          <Camera size={18} weight="regular" aria-hidden="true" />
        </button>
        <label className="dir-search ps-add-field">
          <input
            value={typed}
            onChange={e => { setTyped(e.target.value); setSaid(''); }}
            onKeyDown={e => { if (e.key === 'Enter' && looksLikeAddress) { e.preventDefault(); file(typed); } }}
            placeholder="Name or address"
            aria-label="A name on the Board, or the address of a journal to add"
            autoComplete="off"
            spellCheck={false}
          />
          {looksLikeAddress && (
            <button
              type="button"
              className="fr-go"
              onClick={() => file(typed)}
              disabled={filing}
              aria-label="Add this journal"
              title="Add"
            >
              <ArrowRight size={18} weight="bold" aria-hidden="true" />
            </button>
          )}
        </label>
      </div>
      {namedNow.length > 0 && (
        <div className="ps-found ps-add-found">
          {namedNow.map(j => {
            const known = inBook.has(tidyJournal(j.address));
            return (
              <button
                key={j.address}
                type="button"
                className={'fr-live-one ps-found-one ps-add-one' + (known ? ' ps-add-one--known' : '')}
                onClick={() => { if (known) pressFace(j.address); else file(j.address); }}
                disabled={filing}
                aria-label={known ? `${j.name}, already in your book` : `Add ${j.name}`}
                title={j.name}
              >
                {faceOf(j.address, 20)}
                <span className="ps-add-mark" aria-hidden="true">{known ? '✓' : '+'}</span>
                <span className="fr-live-name">{j.name}</span>
              </button>
            );
          })}
        </div>
      )}
      {!looksLikeAddress && typedNow.length >= 2 && !stillNaming && namedNow.length === 0 && (
        <p className="ps-add-said">Nothing by that name.</p>
      )}
      {DIRECTORY_URL && (
        <Link href="/directory" className="ps-add-board">
          Find people on the Board
          <ArrowRight size={11} weight="bold" aria-hidden="true" />
        </Link>
      )}
    </div>
  ) : null;

  // The line, where Headlines will stand; Your friends and its glyphs; what
  // Add unrolls under them; the drawer, with Find's field at its head; All or
  // Close; and the doors of whoever is open.
  const top = people ? (
    <div className="ps-top">
      {strip}
      {head}
      <div className={'ps-unroll' + (adding ? ' ps-unroll--open' : '')} inert={adding ? undefined : true}>
        <div className="ps-unroll-in">{addHere}</div>
      </div>
      {findHere}
      {nobodyFound && <p className="ps-said">Nobody by that name.</p>}
      {row}
      {drawerDoor}
      {said && <p className="ps-said" role="status">{said}</p>}
      {doors}
      {scanning && <CodeScanner onRead={text => { setScanning(false); file(text); }} onClose={() => setScanning(false)} />}
      <SendSheet open={Boolean(sendingTo)} person={sendingTo} onClose={() => setSendingTo(null)} />
      <InviteSheet open={inviting} onClose={() => setInviting(false)} />
      <WaveSheet person={wavingTo} onClose={() => setWavingTo(null)} />
    </div>
  ) : null;

  // What stands where there are no records: the feed's own words for an
  // empty book and a quiet one.
  let empty;
  if (term) {
    empty = <div className="arc-empty">Nothing by that name.</div>;
  } else if (people && people.length === 0) {
    empty = (
      <div className="arc-empty ps-empty">
        Nobody in your address book yet.<br />
        <button type="button" className="ps-empty-add" onClick={() => { setAdding(true); scroller?.current?.scrollTo({ top: 0, behavior: 'smooth' }); }}>Add someone</button> and what they log shows up here.
      </div>
    );
  } else {
    empty = <div className="arc-empty ps-empty">Nobody in your address book has logged anything yet.</div>;
  }

  return (
    <div className="ps">
      <PullDown scroller={scroller} onPull={again} asking={'Asking your friends…'} mark={pullMark} />
      {top}
      <div className="hn-under ps-wall">
        <Journal
          records={ours}
          loading={loading}
          scroller={scroller}
          tile={tile}
          filters={false}
          viewKey={VIEW_KEY}
          empty={empty}
          seek={seek}
        />
      </div>
    </div>
  );
}
