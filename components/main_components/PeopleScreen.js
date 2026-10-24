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
// The top band is who is logging right now, or the last thing that happened
// (TopBand, in Friends.js, which the address book draws too). A face here
// opens their journal.
//
// The shelf line is the wall's own (Journal.js), with a scope at its left —
// whose records: Your people's, On your records, Everyone's — and the views,
// the search and the count after it, exactly as on home. The scope and the
// view compose. Who you've added sits under a rule at the foot of the scope's
// menu: the address book is a drawer you open to add or remove somebody, not
// a place you go to look at your friends.
//
// The wall is covers, with the faces of whoever logged each one in the
// corner and a gold dot on a record you have logged too (Miyel: in every
// scope, 2026-10-23). A cover opens the entry on the journal of whoever
// logged it last. Nothing is written on anybody's record here and nothing
// opens a thread.
//
// ── Where each wall comes from ────────────────────────────────────────────
// Nothing new crosses between copies. Your people's is each journal in the
// book's public feed, read from this browser the way the feed read it;
// On your records is the Board's `pull_alike`, through /api/board; Everyone's
// is the Board's last day of records, which /api/board already reads for
// its first screen. The search is the Board's own search.
//
// ── Never ─────────────────────────────────────────────────────────────────
// No count beside a person: the count on the line is of records. Nothing is
// ordered by how much anybody logs: a record is placed by when it was last
// logged, and the faces on it are newest first.

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CaretDown, User } from '@phosphor-icons/react';
import Journal, { foldForSearch } from './Journal';
import { TopBand } from './Friends';
import PullDown from './PullDown';
import { useBookplate } from './Bookplate';
import { useFriendsBeacons, refreshFriends } from '../../hooks/useFriendsBeacons';
import { carrySender, journalUrl, tidyJournal } from '../../library/return_address';
import { DIRECTORY_URL } from '../../library/version';

// ── Whose records ─────────────────────────────────────────────────────────
// In order of how much they are about you (the brief). Everyone's is built
// and left out of the menu for now (Miyel, 2026-10-23: "Off for now"), until
// there are enough keepers on the Board for it to mean anything; turning it
// on is this one line, and nothing else on the screen changes when it does.
const EVERYONES_ON = false;
const SCOPES = [
  { value: 'people', label: 'Your people’s' },
  { value: 'records', label: 'On your records', board: true },
  { value: 'everyone', label: 'Everyone’s', board: true, off: !EVERYONES_ON },
];
const DEFAULT_SCOPE = 'people';
// The scope remembers itself between visits, the way the wall's view does
// (the brief); so does the view, apart from home's.
const SCOPE_KEY = 'ln-people-scope';
const VIEW_KEY = 'ln-people-view';
const offered = () => SCOPES.filter(s => !s.off && (!s.board || DIRECTORY_URL));

function readStoredScope() {
  try {
    const saved = window.localStorage.getItem(SCOPE_KEY);
    return offered().some(s => s.value === saved) ? saved : DEFAULT_SCOPE;
  } catch {
    return DEFAULT_SCOPE;
  }
}
function storeScope(value) {
  try {
    window.localStorage.setItem(SCOPE_KEY, value);
  } catch {
    /* storage refused — the scope still changes, it just is not remembered */
  }
}

// How long one journal gets to answer before its records are simply absent
// (the feed's number).
const EACH_MS = 8000;
// How long the search waits for the typing to stop before asking the Board.
const ASK_AFTER_MS = 350;
// The faces in a cover's corner: the newest few of whoever logged it.
const FACES_MOST = 3;
// What came back from a send goes to the inbox (below), the newest this many.
const CAME_BACK_MOST = 30;
// The scope's menu folds away the way the views menu does (Journal.js).
const MENU_OUT_MS = 160;

const releaseYear = entry => {
  const m = String(entry?.year || '').match(/\d{4}/);
  return m ? m[0] : '';
};
// A record known to the Board only by its title and artist (no key): the
// same fold, so it can be matched to one this journal has.
const byName = (album, artist) => `${foldForSearch(album)}|${foldForSearch(artist)}`;
const newestFirst = (a, b) => new Date(b.posted_at || 0) - new Date(a.posted_at || 0);

// ── Your people's records, as the wall draws records ──────────────────────
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

// ── A record the Board knows, as the wall draws records ───────────────────
// The Board keeps a record's title, artist, cover, stars and marks for each
// keeper who logged it, and never the writing. Each keeper's is a listen
// here, newest first. Where it is a record of the keeper's own, its year and
// genre are read off the keeper's own listen of it, so By era and By genre
// can place it; the Board keeps neither.
function fromBoard(record, mine) {
  const ownKey = record.album_key || '';
  const own = (ownKey && mine.byKey.get(ownKey)) || mine.byName.get(byName(record.album, record.artist)) || null;
  const all = (record.keepers || []).map(k => ({
    slug: k.slug,
    album: record.album,
    artist: record.artist,
    album_art: record.art,
    album_key: ownKey,
    year: own?.year || '',
    genre: own?.genre || '',
    rating: k.stars === null || k.stars === undefined ? '' : String(k.stars),
    favorite: k.favorite, masterpiece: k.masterpiece, formative: k.formative,
    horizon: '',
    posted_at: k.posted_at,
    by: { address: k.address, name: k.name },
  })).sort(newestFirst);
  if (all.length === 0) return null;
  const loggers = all.map(e => ({ ...e.by, slug: e.slug }));
  return {
    key: `board:${record.key_hash || byName(record.album, record.artist)}`,
    all, listens: all, notes: [], face: all[0], first: all[0], loggers,
    mine: Boolean(own),
  };
}

// `scroller` is the pane that scrolls; `pullMark` is the mark the pull down
// draws in the gap it opens (PullDown.js).
export default function PeopleScreen({ scroller, onScreen = true, entries = [], pullMark = null }) {
  const { keeper_name, site_address } = useBookplate();
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
  const asked = useRef(new Set());
  const readBook = useCallback(() => {
    fetch('/api/people')
      .then(r => (r.ok ? r.json() : { people: [] }))
      .then(d => {
        const had = d.people || [];
        setOwn(Array.isArray(d.own) ? d.own : []);
        setPeople(had);
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
  const again = useCallback(() => {
    asked.current.clear();
    readBook();
    return refreshFriends();
  }, [readBook]);

  // Their beacons, through the one shared poll (useFriendsBeacons): only
  // while this screen is the one on show.
  const { friends: beacons } = useFriendsBeacons(onScreen);

  // ── The keeper's own records, for the gold dot ──────────────────────────
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

  // ── The scope ───────────────────────────────────────────────────────────
  const storedScope = useSyncExternalStore(() => () => {}, readStoredScope, () => DEFAULT_SCOPE);
  const [pickedScope, setScope] = useState(null);
  const scope = pickedScope ?? storedScope;
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuLeaving, setMenuLeaving] = useState(false);
  const menuClock = useRef(null);
  const closeMenu = useCallback(() => {
    setMenuLeaving(true);
    clearTimeout(menuClock.current);
    menuClock.current = setTimeout(() => { setMenuOpen(false); setMenuLeaving(false); }, MENU_OUT_MS);
  }, []);
  useEffect(() => () => clearTimeout(menuClock.current), []);
  // A press anywhere else, or Escape, puts it away. Not a scrim: the line
  // has a backdrop filter, which holds anything fixed inside it to the line.
  useEffect(() => {
    if (!menuOpen || menuLeaving) return undefined;
    const away = e => { if (!e.target.closest?.('.ps-scope')) closeMenu(); };
    const onKey = e => { if (e.key === 'Escape') closeMenu(); };
    document.addEventListener('pointerdown', away, true);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', away, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen, menuLeaving, closeMenu]);
  const chooseScope = value => {
    setScope(value);
    storeScope(value);
    closeMenu();
  };

  // ── On your records, and Everyone's ─────────────────────────────────────
  // Asked the first time each is chosen in a visit, and kept.
  const [alike, setAlike] = useState(null);
  const [today, setToday] = useState(null);
  useEffect(() => {
    if (!DIRECTORY_URL) return;
    if (scope === 'records' && alike === null) {
      fetch('/api/board?alike=1', { cache: 'no-store' })
        .then(r => (r.ok ? r.json() : { records: [] }))
        .then(d => setAlike(Array.isArray(d.records) ? d.records : []))
        .catch(() => setAlike([]));
    }
    if (scope === 'everyone' && today === null) {
      fetch('/api/board')
        .then(r => (r.ok ? r.json() : {}))
        .then(d => setToday(Array.isArray(d.today) ? d.today : []))
        .catch(() => setToday([]));
    }
  }, [scope, alike, today]);

  // ── The search is the Board ─────────────────────────────────────────────
  // The line's search narrows this wall as home's does, by a record's name,
  // its artist and who logged it — and, past two letters, asks the Board:
  // its keepers whose name matches stand as faces over the wall, with the
  // people in the book whose name matches, and its records that match join
  // the wall (Miyel, 2026-10-23: faces above the wall).
  const [term, setTerm] = useState('');
  const [found, setFound] = useState({ term: '', journals: [], records: [] });
  const seekClock = useRef(null);
  const onSeek = useCallback(said => {
    const words = String(said || '').trim();
    setTerm(words);
    clearTimeout(seekClock.current);
    if (!DIRECTORY_URL || words.length < 2) { setFound({ term: '', journals: [], records: [] }); return; }
    seekClock.current = setTimeout(() => {
      fetch(`/api/board?q=${encodeURIComponent(words)}`)
        .then(r => (r.ok ? r.json() : null))
        .then(d => {
          if (!d) return;
          setFound({
            term: words,
            journals: Array.isArray(d.journals) ? d.journals : [],
            records: Array.isArray(d.records) ? d.records : [],
          });
        })
        .catch(() => {});
    }, ASK_AFTER_MS);
  }, []);
  useEffect(() => () => clearTimeout(seekClock.current), []);
  const seek = useMemo(() => ({
    placeholder: 'Names, albums or artists',
    label: 'Search names, albums and artists, and the Board',
    onChange: onSeek,
    matches: (album, q) => (
      foldForSearch(album.face.album).includes(q)
      || foldForSearch(album.face.artist).includes(q)
      || album.notes.some(n => foldForSearch(n.song).includes(q))
      || album.loggers.some(l => foldForSearch(l.name).includes(q))
      || album.key.startsWith('found:')
    ),
  }), [onSeek]);

  // ── The wall for this scope ─────────────────────────────────────────────
  const scoped = useMemo(() => {
    if (scope === 'records') return (alike || []).map(r => fromBoard(r, mine)).filter(Boolean);
    if (scope === 'everyone') return (today || []).map(r => fromBoard(r, mine)).filter(Boolean);
    return ours;
  }, [scope, alike, today, ours, mine]);
  const records = useMemo(() => {
    if (!found.term || found.term !== term) return scoped;
    const here = new Set(scoped.map(a => byName(a.face.album, a.face.artist)));
    const extra = found.records
      .filter(r => !here.has(byName(r.album, r.artist)))
      .map(r => fromBoard(r, mine))
      .filter(Boolean)
      .map(a => ({ ...a, key: `found:${a.key}` }));
    return [...scoped, ...extra];
  }, [scoped, found, term, mine]);
  const loading = scope === 'records' ? alike === null
    : scope === 'everyone' ? today === null
      : people === null || (stillAsking && ours.length === 0);

  // The faces a search found: the book's first, then the Board's.
  const faces = useMemo(() => {
    const q = foldForSearch(term);
    if (q.length < 2) return [];
    const out = [];
    for (const p of people || []) {
      if (p.name && foldForSearch(p.name).includes(q)) out.push({ address: p.address, name: p.name });
    }
    if (found.term === term) {
      for (const j of found.journals) {
        if (j.name && !out.some(o => tidyJournal(o.address) === tidyJournal(j.address))) out.push({ address: j.address, name: j.name });
      }
    }
    return out;
  }, [term, people, found]);

  // ── A record on the wall ────────────────────────────────────────────────
  // The cover, the faces of whoever logged it in its corner, newest first,
  // and the gold dot when it is on the keeper's wall too. It opens the entry
  // on the journal of whoever logged it last, carrying who this copy
  // belongs to (carrySender), and that it is somebody already in the book.
  const there = useCallback((address, path = '') => carrySender(
    `${journalUrl(address)}${path}`, me, { known: inBook.has(tidyJournal(address)) },
  ), [me, inBook]);
  const tile = useCallback(album => {
    const face = album.face;
    const last = album.loggers[0];
    const folded = album.listens.length === 0;
    const names = album.loggers.map(l => l.name).filter(Boolean);
    const said = face.album + (face.artist ? ` by ${face.artist}` : '')
      + (names.length ? `, logged by ${names.join(', ')}` : '')
      + (album.mine ? ', on your wall too' : '');
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
        {album.mine && <span className="ps-mine" aria-hidden="true" />}
        <span className="ps-who" aria-hidden="true">
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
  }, [there]);

  // ── The line's left end: whose records, and the drawer ──────────────────
  const scopes = offered();
  const current = scopes.find(s => s.value === scope) || scopes[0];
  const lead = (
    <span className="arc-view ps-scope">
      <button
        type="button"
        className="arc-ctl arc-view-now ps-scope-now"
        onClick={() => { if (menuOpen) closeMenu(); else { setMenuLeaving(false); setMenuOpen(true); } }}
        aria-expanded={menuOpen && !menuLeaving}
        aria-haspopup="menu"
        aria-label={`${current.label} records. Change whose`}
      >
        <span>{current.label}</span>
        <CaretDown size={9} weight="bold" aria-hidden="true" />
      </button>
      {menuOpen && (
        <span className={'arc-views ps-scopes' + (menuLeaving ? ' arc-views--leaving' : '')} role="menu" aria-label="Whose records">
          {scopes.map(s => (
            <button
              key={s.value}
              type="button"
              role="menuitemradio"
              aria-checked={s.value === current.value}
              className={'ln-word arc-views-word' + (s.value === current.value ? ' ln-word--on' : '')}
              onClick={() => chooseScope(s.value)}
            >
              {s.label}
            </button>
          ))}
          <span className="arc-views-rule" aria-hidden="true" />
          <Link href="/dashboard/people" role="menuitem" className="ln-word arc-views-word" onClick={closeMenu}>
            Who you&rsquo;ve added
          </Link>
        </span>
      )}
    </span>
  );

  // What stands where there are no records: the feed's own words for an
  // empty book and a quiet one.
  let empty;
  if (term) {
    // Nothing is said while the Board is still being asked.
    const asking = Boolean(DIRECTORY_URL) && term.length >= 2 && found.term !== term;
    empty = faces.length || asking ? null : <div className="arc-empty">Nothing by that name.</div>;
  } else if (scope === 'people' && people && people.length === 0) {
    empty = (
      <div className="arc-empty ps-empty">
        Nobody in your address book yet.<br />
        <Link href="/dashboard/people">Add someone</Link> and what they log shows up here.
      </div>
    );
  } else if (scope === 'people') {
    empty = <div className="arc-empty ps-empty">Nobody in your address book has logged anything yet.</div>;
  } else if (scope === 'records') {
    empty = <div className="arc-empty ps-empty">Nobody on the Board has logged one of your records yet.</div>;
  } else {
    empty = <div className="arc-empty ps-empty">Nobody on the Board has logged anything today.</div>;
  }

  // The faces a search found, over the wall: pressing one opens their
  // journal.
  const before = faces.length > 0 ? (
    <div className="ps-found">
      {faces.map(f => (
        <a
          key={f.address}
          className="fr-live-one ps-found-one"
          href={there(f.address)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${f.name}’s journal`}
          title={f.name}
        >
          <span className="fr-ring" aria-hidden="true">
            <span className="fr-face">
              <User size={20} weight="regular" />
              <img
                src={`${journalUrl(f.address)}/api/portrait`}
                alt=""
                loading="lazy"
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
            </span>
          </span>
          <span className="fr-live-name">{f.name}</span>
        </a>
      ))}
    </div>
  ) : null;

  return (
    <div className="ps">
      <PullDown scroller={scroller} onPull={again} asking={'Asking your friends\u2026'} mark={pullMark} />
      {people && people.length > 0 && (
        <TopBand
          people={people}
          beacons={beacons}
          open={(person, b, className, label, inside) => (
            <a
              key={b.address}
              className={className}
              href={there(b.address)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              title={label}
            >
              {inside}
            </a>
          )}
        />
      )}
      <div className="hn-under ps-wall">
        <Journal
          records={records}
          loading={loading}
          scroller={scroller}
          tile={tile}
          lead={lead}
          filters={false}
          viewKey={VIEW_KEY}
          empty={empty}
          seek={seek}
          before={before}
        />
      </div>
    </div>
  );
}
