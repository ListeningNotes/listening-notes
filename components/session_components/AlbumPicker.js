// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/session_components/AlbumPicker.js
// Type, see covers, tap one. The screen before a listen.
//
// ── What used to be here ──────────────────────────────────────────────────
// A network of floating nodes that zoomed, spotlit, grew the results out of
// itself and flew the chosen cover to the centre, then asked a question before
// letting you in. Several seconds of ceremony between "I want to log this"
// and logging it — beautiful once, and paid for on every listen after, and on
// a phone not visible at all. The network is still in the building: it is one
// of the dashboard's backgrounds now, where it is ambient rather than in the
// way.
//
// What replaced it is the plainest thing that does the job. The covers are
// the beauty here and need no help. The one moment kept is the landing — the
// cover you tap settles into the header of the session — and that belongs to
// the page, which can see both ends of the journey.
//
// ── What it shares with the send flow ─────────────────────────────────────
// searchAlbums() in library/music_data_api.js, the same lookup AlbumFinder
// wraps: two searches merged, pressings collapsed, editions scored. The two
// components stay separate because they answer different questions. Somebody
// sending an album knows which one they mean, so AlbumFinder shows a dozen on
// a shelf. The owner logging a listen may be browsing a whole catalogue —
// Pet Sounds sat at position 61 once — so this is a grid, and it shows
// everything the search found.
//
// The unfinished listens sit under the field until you start typing. The
// page's job is still to ask what you want to hear; those are only the
// answers you already gave and did not finish.

'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CaretRight, ClockCounterClockwise, MagnifyingGlass, Trash, XCircle } from '@phosphor-icons/react';
import SiteNav from '../main_components/SiteNav';
import { searchAlbums, searchSongs } from '../../library/music_data_api';
import { PENDING_EVENT, SAVED_EVENT, TRACK_NOTE_WRITING } from '../../hooks/useListeningSession';
import { lookup_key } from '../../library/entry_formatter';

// How long the grid takes to shuffle over, and how long the newcomer waits
// before growing into the slot the others are clearing.
const FILE_MS = 420;

// Whether the picker offers a way to type a record in by hand. Off since
// 2026-09-18 and the only thing holding the door: turn it on and the form is
// back, unchanged. See the note beside the button, and MANUAL ENTRY in NOTES.
const BY_HAND_OFFERED = false;

// Long enough that typing an artist's name is one search rather than eight,
// short enough that it never feels like waiting.
const SETTLE_MS = 420;

// ── Pages, on a phone, 2026-09-26 ────────────────────────────────────────
// A search is several screens of covers, and scrolling down through them
// buried the tracks underneath. On a phone the albums come in pages you swipe
// sideways — two rows to a page, three where the screen is tall enough that
// the Tracks heading and a first track still show under them — and the
// tracks come five at a time the same way, each list with its "1 of 3" under
// it in the heading's own face (Miyel). A desk has the room and no swipe, so
// it keeps the long grid and the first eight tracks.
const ALBUM_COLUMNS = 3;
const TRACKS_PER_PAGE = 5;
const DESK_TRACKS = 8;
// ── What you looked for last, 2026-09-26 ─────────────────────────────────
// Miyel: "I find myself needing to retype in the same thing over and over."
// A search you took something from is kept, newest first, in this browser,
// and offered under the field whenever it is empty and in use. Only the ones
// that found what you wanted: what was typed on the way there ("fon",
// "fonta") never counts. Six, because a list you have to scroll through is a
// second search.
const RECENT_KEY = 'ln_recent_searches';
const RECENT_KEPT = 6;
// How long the list takes to open and fold (.ses-recent, session.css).
const RECENT_FOLD_MS = 340;

// What has to fit under three rows before a page may hold three: the room
// kept for the covers' shadows, the "1 of 3", the Tracks heading and one
// whole track — 12, 24, 40, 6 and 67 pixels in session.css. At 150 a page
// holds three rows on a 390 by 844 phone and larger, and two on an SE.
const TRACKS_PEEK = 150;

// How long a draft has been sitting there. Rounded hard on purpose — the point
// is 'this morning' or 'last week', not a timestamp.
function sinceLabel(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

// `inline` is the picker inside something that is already a screen — the
// beacon pane, where choosing a record happens on the page you are already on
// rather than on a page of its own (Miyel's beacon brief, 2026-09-17). It
// changes three things and nothing else: no nav row, because the cross
// already has one; the wrapper loses the padding it needed to clear a fixed
// header; and the field is a hairline with a magnifier rather than a box.
//
// It is a shape and not a fork. The search, the debounce, the stale-answer
// guard, the grid, the by-hand fallback and the drafts are the same code
// running in a different box — a second search on this site would be two
// places for one bug to live, and the brief said so outright.
//
// NAME: `inline` is a placeholder for Miyel (AGENTS.md).
//
// `onPickSong` is the second way out of a search, 2026-09-24: a song pressed
// in the Songs section, which starts a track note rather than a listen (the
// track-notes brief). Without it there is no Songs section, and the picker is
// exactly what it was.
//
// `noDrafts` is the picker inside the send sheet, 2026-09-26: the same search,
// recent, albums and tracks, and none of the unfinished listens — a draft is
// a listen you walked away from, and it has nothing to do with handing a
// record to somebody. The list is neither asked for nor drawn.
export default function AlbumPicker({ onPick, onResume, onPickSong = null, inline = false, noDrafts = false }) {
  const [typed, setTyped]       = useState('');
  const [results, setResults]   = useState([]);
  // The songs the same search found. Albums above songs, always, so the
  // default reading stays "an album journal that also lets you mark a song".
  const [songs, setSongs]       = useState([]);
  const [looking, setLooking]   = useState(false);
  const [asked, setAsked]       = useState(false);   // a search has come back
  // Paged on a phone (the note over TRACKS_PER_PAGE): whether this screen
  // pages at all, how many rows of albums a page holds, and which page of each
  // list is showing. The rows are decided the first time covers land, from
  // where they land.
  const [paged, setPaged] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches);
  const [rows, setRows] = useState(2);
  const rowsDecided = useRef(false);
  const [albumPage, setAlbumPage] = useState(0);
  const [trackPage, setTrackPage] = useState(0);
  const albumPager = useRef(null);
  const trackPager = useRef(null);
  const field = useRef(null);
  // The searches kept (RECENT_KEY), and whether the field is in use — the
  // list shows only while it is, and the field is empty.
  const [recent, setRecent] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').filter(t => typeof t === 'string').slice(0, RECENT_KEPT);
    } catch { return []; }
  });
  const [fieldOn, setFieldOn] = useState(false);
  // Clear folds the list away first and forgets it after, so it goes the way
  // it came rather than vanishing (RECENT_FOLD_MS).
  const [emptying, setEmptying] = useState(false);
  const [byHand, setByHand]     = useState(false);
  const [hand, setHand]         = useState({ album: '', artist: '', year: '', art: '' });

  // Listens saved and walked away from, newest first.
  const [drafts, setDrafts]                 = useState([]);
  const [confirmDiscard, setConfirmDiscard] = useState(null);   // draft id

  // ── Press and hold to throw a draft away ────────────────────────────────
  // There was an × in the corner of every tile. Miyel, 2026-09-18: "make the
  // albums not have an x on them, but instead long press to delete them, with
  // an option to make sure you want to delete — maybe they turn red."
  //
  // She is right that the × had to go: a grid of album art is a wall of
  // somebody's record covers, and a row of little crosses over them is the
  // software asking, on every single one, whether you meant to keep it. A
  // long press asks nothing until you ask it.
  //
  // Held for 480ms. Long enough that a scroll or a decisive tap never trips
  // it, short enough that you are not waiting — and the press that ends the
  // hold is swallowed, or letting go would open the record you were about to
  // throw away.
  const held = useRef(false);
  const holding = useRef(null);
  function hold(id) {
    held.current = false;
    clearTimeout(holding.current);
    holding.current = setTimeout(() => {
      held.current = true;
      setConfirmDiscard(id);
    }, 480);
  }
  function letGo() { clearTimeout(holding.current); }
  useEffect(() => () => clearTimeout(holding.current), []);

  // Which search the results on screen belong to. A slow answer to "rad"
  // arriving after a fast one to "radiohead" would otherwise replace the good
  // results with the stale ones.
  const askedFor = useRef('');

  // ── The drafts, and when to ask again ────────────────────────────────────
  // Once on mount was enough while the picker was a page you arrived at. It is
  // not a page any more: it is what floor one *is* while a record is being
  // chosen, and it stays mounted underneath the listen for the whole of that
  // listen. So the draft a listen leaves behind on its way out would never
  // have reached this grid — the component that draws it never re-ran.
  //
  // PENDING_EVENT is already shouted whenever a listen is picked up or put
  // down (see saidSoAboutTheDesk); the desk has listened to it since
  // 2026-09-16 for the same reason, that the listen and the thing underneath
  // it are one route and nothing else would tell it.
  useEffect(() => {
    if (noDrafts) return undefined;
    let alive = true;
    const ask = () => {
      fetch('/api/drafts')
        .then(r => r.json())
        .then(d => { if (alive) setDrafts(d.drafts || []); })
        .catch(() => {});
    };
    ask();
    window.addEventListener(PENDING_EVENT, ask);
    // And when a listen becomes an entry. Publishing deletes the draft — both
    // copies, see finish() in useSessionDraft — but it shouts SAVED_EVENT and
    // not PENDING_EVENT, so this list never heard about it and the record you
    // had just posted was still sitting here under Unfinished when the cutaway
    // put you back (Miyel, 2026-09-18: "make sure the draft deletes since it's
    // posted"). It was gone from the server the whole time; it was this that
    // had not been told. Since 2026-09-24 a save folds the picker and drops you
    // on the journal instead, and the next one opened asks afresh — this stays
    // for anywhere the picker outlives a save.
    window.addEventListener(SAVED_EVENT, ask);
    return () => {
      alive = false;
      window.removeEventListener(PENDING_EVENT, ask);
      window.removeEventListener(SAVED_EVENT, ask);
    };
  }, [noDrafts]);

  // ── Anywhere else is the no ──────────────────────────────────────────────
  // Miyel, 2026-09-18: "clicking away anywhere on the screen should cancel
  // it." Pressing another tile already did — the tile's own handler treats a
  // press while something else is armed as the answer no — but that left the
  // rest of the screen dead, and a question you can only answer by finding one
  // of two right places to press is a question that has taken the screen
  // hostage.
  //
  // In the capture phase, so the state is already clear by the time the press
  // reaches whatever it landed on. The armed tile itself is the exception: a
  // press there is the yes, and it has to reach its own handler intact.
  useEffect(() => {
    if (confirmDiscard === null) return undefined;
    const away = event => {
      if (event.target?.closest?.('.ses-tile--armed')) return;
      setConfirmDiscard(null);
    };
    document.addEventListener('pointerdown', away, true);
    return () => document.removeEventListener('pointerdown', away, true);
  }, [confirmDiscard]);

  // ── The grid files across ────────────────────────────────────────────────
  // Miyel, 2026-09-18: "a new draft files all drafts across the screen and the
  // new draft appears." A CSS grid cannot be transitioned — reflowing it moves
  // every tile in one frame, with nothing in between to animate — so the tiles
  // are measured before and after and put back where they were, then let go.
  // FLIP, the same machinery the wall uses when an entry is deleted out of it.
  //
  // The newcomer is the one tile with no previous box. It grows in after the
  // others have finished moving, because the slot it grows into is the slot
  // they are still clearing.
  const gridRef = useRef(null);
  const placedRef = useRef(new Map());
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) { placedRef.current = new Map(); return undefined; }
    const before = placedRef.current;
    const after = new Map();
    const moved = [];
    const arrived = [];
    for (const tile of grid.children) {
      const id = tile.dataset.draft;
      const box = tile.getBoundingClientRect();
      after.set(id, { left: box.left, top: box.top });
      const was = before.get(id);
      if (!was) { if (before.size) arrived.push(tile); continue; }
      if (was.left !== box.left || was.top !== box.top) {
        moved.push([tile, was.left - box.left, was.top - box.top]);
      }
    }
    placedRef.current = after;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    for (const tile of arrived) tile.classList.add('ses-tile--new');
    if (!moved.length) return undefined;
    for (const [tile, dx, dy] of moved) {
      tile.style.transition = 'none';
      tile.style.transform = `translate(${dx}px, ${dy}px)`;
    }
    // Let go on the next frame — or on a timer if no frame comes. A tab that
    // is not being painted runs no rAF callback at all, and the cost of that
    // here is not a missing animation but tiles left sitting where they used
    // to be, holding a transform nothing will ever clear. The same pair guards
    // the beacon's words in HomeNav, for the same reason.
    let gone = false;
    const release = () => {
      if (gone) return;
      gone = true;
      for (const [tile] of moved) {
        tile.style.transition = `transform ${FILE_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)`;
        tile.style.transform = '';
      }
    };
    const frame = requestAnimationFrame(release);
    const late = setTimeout(release, 120);
    return () => { cancelAnimationFrame(frame); clearTimeout(late); };
  }, [drafts]);

  // Typing is an event, not something to react to after the fact — clearing
  // the grid and showing "Looking…" happen here. The effect below owns only
  // the timer.
  function type(value) {
    setTyped(value);
    if (!value.trim()) { setResults([]); setSongs([]); setLooking(false); setAsked(false); }
    else setLooking(true);
  }

  useEffect(() => {
    const query = typed.trim();
    if (!query) return undefined;
    const id = setTimeout(async () => {
      askedFor.current = query;
      // Both at once, and both land together: a Songs section arriving a beat
      // after the covers would shove nothing — it is underneath them — but a
      // "Nothing found" said before the songs had answered would be a lie.
      const [found, heard] = await Promise.all([
        searchAlbums(query),
        onPickSong ? searchSongs(query) : Promise.resolve([]),
      ]);
      if (askedFor.current !== query) return;
      // A new search starts on its first page.
      albumPager.current?.scrollTo({ left: 0 });
      trackPager.current?.scrollTo({ left: 0 });
      setAlbumPage(0);
      setTrackPage(0);
      setResults(found);
      setSongs(heard);
      setLooking(false);
      setAsked(true);
    }, SETTLE_MS);
    return () => clearTimeout(id);
  // onPickSong is a prop that says whether to ask at all; it does not change
  // while a search is being typed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed]);

  // A phone turned into a desk, or back: the pages come and go with it. Either
  // that or a turned screen means the rows are decided again, next search.
  useEffect(() => {
    const phone = window.matchMedia('(max-width: 768px)');
    const quit = new AbortController();
    phone.addEventListener('change', () => { rowsDecided.current = false; setPaged(phone.matches); }, { signal: quit.signal });
    window.addEventListener('resize', () => { rowsDecided.current = false; }, { signal: quit.signal });
    return () => quit.abort();
  }, []);

  // Three rows only where three still leave the tracks in sight: measured off
  // the first cover to land and the room under the top of the grid, before
  // the page is painted, so a page never shows two rows and then grows.
  useLayoutEffect(() => {
    if (!paged || rowsDecided.current || !results.length) return;
    const pager = albumPager.current;
    const tile = pager?.querySelector('.ses-tile');
    if (!tile) return;
    rowsDecided.current = true;
    const gap = parseFloat(getComputedStyle(tile.parentElement).rowGap) || 0;
    const row = tile.getBoundingClientRect().height + gap;
    const top = pager.getBoundingClientRect().top + (parseFloat(getComputedStyle(pager).paddingTop) || 0);
    setRows(window.innerHeight - top >= row * 3 - gap + TRACKS_PEEK ? 3 : 2);
  }, [paged, results]);

  // The tile's cover is where the landing starts from, so its box goes along
  // with the record.
  // ── Taking a record is the end of choosing one ───────────────────────────
  // The search that found it goes with it. Miyel, 2026-09-18: "coming back
  // should act as a new choice — draft gone and ready for new, or search gone
  // ready for new… it could even be cleared when a listen is selected, not
  // just on post."
  //
  // On selection rather than on the way back, and it covers both: by the time
  // you return — posted, or pulled out of the listen — this screen is already
  // the blank one it should be. It has to be said out loud because pulling a
  // listen down never takes this screen down: the session is a sheet over it,
  // so the picker you come back to is the same picker, with everything you
  // left on it. (A save does fold it, since 2026-09-24 — see the drop in
  // HomeNav.)
  //
  // The armed discard goes too. A question asked before a listen and still
  // asked after it is a question about a screen that has been away.
  function chosen() {
    // The search that found it is worth keeping (RECENT_KEY). A draft is
    // resumed from an empty field, so there is nothing to keep then.
    const term = typed.trim();
    if (term) {
      const next = [term, ...recent.filter(t => t.toLowerCase() !== term.toLowerCase())].slice(0, RECENT_KEPT);
      setRecent(next);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* kept for this visit only */ }
    }
    setTyped('');
    setResults([]);
    setSongs([]);
    setLooking(false);
    setAsked(false);
    setConfirmDiscard(null);
    setByHand(false);
  }

  function take(album, e) {
    const img = e.currentTarget.querySelector('img');
    const from = img ? img.getBoundingClientRect() : null;
    chosen();
    onPick({
      album: album.name,
      artist: album.artist,
      year: album.year || '',
      // The picker draws 600px covers; the session header and any print of
      // the entry want the biggest Apple has.
      artUrl: album.artLarge || album.art || '',
      collectionId: album.collectionId || null,
      genre: album.genre || '',
      entryType: '',
    }, from);
  }

  function takeByHand() {
    if (!hand.album.trim() || !hand.artist.trim()) return;
    chosen();
    onPick({
      album: hand.album.trim(),
      artist: hand.artist.trim(),
      year: hand.year.trim(),
      artUrl: hand.art.trim(),
      collectionId: null,
      genre: '',
      entryType: '',
    }, null);
  }

  // Two taps, because there's no undo on the other side of this one.
  async function discardDraft(id) {
    if (confirmDiscard !== id) { setConfirmDiscard(id); return; }
    // A track note's draft has a second copy, in this browser, which would
    // bring the words straight back the next time the song was pressed. It
    // goes too — the same key names both (lookup_key).
    const gone = drafts.find(d => d.id === id);
    if (gone?.song) {
      try {
        const all = JSON.parse(localStorage.getItem(TRACK_NOTE_WRITING) || '{}');
        delete all[lookup_key(gone.album, gone.artist || '', gone.song)];
        localStorage.setItem(TRACK_NOTE_WRITING, JSON.stringify(all));
      } catch { /* no browser copy to clear */ }
    }
    setDrafts(prev => prev.filter(d => d.id !== id));
    setConfirmDiscard(null);
    try { await fetch(`/api/drafts/${id}`, { method: 'DELETE' }); } catch { /* already gone */ }
  }

  const nothing = asked && !looking && results.length === 0 && songs.length === 0 && typed.trim();
  // Albums are named only when there are songs under them to be told apart
  // from — a search that found only albums is the picker it always was. The
  // songs are always named: rows in a picker of covers need saying. The
  // heading said Records until 2026-09-26; everywhere the session writes the
  // word it says album (Miyel).
  const twoKinds = results.length > 0 && songs.length > 0;
  // The pages, cut from the lists as they stand. Not paged, each list is one
  // page: the long grid and the first eight tracks, as a desk has them.
  const perPage = rows * ALBUM_COLUMNS;
  const albumPages = [];
  if (paged) for (let i = 0; i < results.length; i += perPage) albumPages.push(results.slice(i, i + perPage));
  else if (results.length) albumPages.push(results);
  const trackPages = [];
  if (paged) for (let i = 0; i < songs.length; i += TRACKS_PER_PAGE) trackPages.push(songs.slice(i, i + TRACKS_PER_PAGE));
  else if (songs.length) trackPages.push(songs.slice(0, DESK_TRACKS));
  // While a search is out, the old answer stays up and says nothing; the
  // word is only for a screen that has nothing on it yet.
  const lookingOnEmpty = looking && results.length === 0 && songs.length === 0;

  return (
    <div className={'ses-picker' + (inline ? ' ses-picker--inline' : '')}>
      {/* The same row every other page carries — the mark in the middle, the
          day-and-night switch top right. It goes home; there is no dashboard
          door here, because the desk is where this opened from and the way
          back to it is the layer's own swipe.

          Not inline: the cross has its own bar and its own mark, and a second
          logo under the first is the one thing a pane must not do. */}
      {!inline && <SiteNav />}

      {byHand ? (
        <div className="ses-hand">
          <label className="ses-field">
            <span className="ses-label">Album</span>
            <input className="ses-input" value={hand.album} onChange={e => setHand(h => ({ ...h, album: e.target.value }))} autoFocus />
          </label>
          <label className="ses-field">
            <span className="ses-label">Artist</span>
            <input className="ses-input" value={hand.artist} onChange={e => setHand(h => ({ ...h, artist: e.target.value }))} />
          </label>
          <label className="ses-field ses-field--year">
            <span className="ses-label">Year</span>
            <input className="ses-input" value={hand.year} onChange={e => setHand(h => ({ ...h, year: e.target.value }))} />
          </label>
          {/* ── The cover, since nowhere is going to hand us one ─────────────
              A record typed in by hand is a record Apple Music does not have —
              a small press, a Bandcamp release, a tape (Miyel, 2026-09-18:
              "this is for smaller indie projects, or maybe albums not on
              iTunes"). Every other record on this site arrives with its cover
              attached; this is the one that has to be told where to find one.

              Not required. A listen has had no requirements since this morning
              and this is not the place to bring one back — a beacon with no
              cover draws its own quiet square, and it can be filled in later
              from the entry. But it is asked for here rather than left to be
              discovered, because the blank square is the first thing you see
              and the link is easiest to fetch while you are already looking at
              the record's page. */}
          <label className="ses-field">
            <span className="ses-label">Album art</span>
            <input
              className="ses-input"
              type="url"
              inputMode="url"
              placeholder="Link to a cover image"
              value={hand.art}
              onChange={e => setHand(h => ({ ...h, art: e.target.value }))}
            />
          </label>
          {/* What is different about this way in, said before you take it
              rather than found out on the next screen. */}
          <p className="ses-hand-note">
            Nowhere has this record, so nothing can be looked up for it. You
            will be asked to type the tracklist in yourself, one title a line,
            on the screen after this.
          </p>
          <div className="ses-actions">
            <button type="button" className="ses-btn ses-btn--primary" onClick={takeByHand} disabled={!hand.album.trim() || !hand.artist.trim()}>
              Start listening →
            </button>
            <button type="button" className="ses-quiet" onClick={() => setByHand(false)}>← Back to search</button>
          </div>
        </div>
      ) : (
        <>
          {/* A hairline and a magnifier when it is inline — no border but the
              underline (the mockup). The glyph is inside the label so the
              whole line is the tap target, which is what a rule with no box
              round it otherwise loses. */}
          {/* Boxed on the pane too, from 2026-09-18. It was a hairline and a
              magnifier there on the reasoning that the floor had just become
              the picker and said so already — and Miyel, comparing the two:
              "bring back the boxed search, I did like that from the last
              version. The search bar being an actual box that was white."
              The floor says less than it did now that the drafts are squares
              rather than a list: a grid of album art looks the same whether
              or not you may type at it, and the box is what says you may. */}
          <label className="ses-search">
            <MagnifyingGlass size={18} weight="regular" aria-hidden="true" />
            <input
              ref={field}
              className="ses-input"
              onFocus={() => setFieldOn(true)}
              /* A beat late, so a tap on a recent search lands before the list
                 it is in goes: on a phone the tap takes the focus first. */
              onBlur={() => setTimeout(() => setFieldOn(false), 200)}
              value={typed}
              onChange={e => type(e.target.value)}
              placeholder="Search an artist, album, or track"
              autoComplete="off"
              /* Not inline, and this is the whole of Miyel's "it goes off the
                 screen and everything goes way too high" on a real phone,
                 2026-09-17. On a page of its own the picker IS the screen, so
                 opening the keyboard the moment it arrives is right: there is
                 nothing else to look at and the field is the one thing to do.

                 On the pane there is: a cover that has just shrunk into place
                 and a caption saying what is happening. iOS answers a focused
                 field by scrolling it up the visual viewport, which took the
                 cover off the top of the screen and the fixed bar with it —
                 fixed elements do not stay fixed against the visual viewport
                 while the keyboard is up. Nothing was broken; everything had
                 simply been shoved up by half a screen before she could look
                 at it.

                 So inline it waits to be tapped. One tap, and the arrangement
                 she just watched assemble is still there underneath it. */
              autoFocus={!inline}
            />
            {/* A way back to an empty field without holding delete, 2026-09-26
                (Miyel). It keeps the keyboard up: clearing is the start of
                another search, not the end of this one. */}
            {typed && (
              <button
                type="button"
                className="ses-clear"
                onClick={() => { type(''); field.current?.focus(); }}
                aria-label="Clear the search"
              >
                <XCircle size={18} weight="fill" aria-hidden="true" />
              </button>
            )}
          </label>

          {/* Recent searches, under an empty field in use (RECENT_KEY). A tap
              runs one again; Clear forgets them all. The mouse press is kept
              from taking the focus, so on a desk the list stays put under the
              pointer. */}
          {/* It opens and folds rather than appearing, 2026-09-26: always
              drawn while there is anything kept, grown from nothing as the
              field is used and folded back when it is not, pushing what is
              under it down and letting it back up (Miyel: "right now it
              kind of disappears"). Folded, it cannot be pressed (inert). */}
          {recent.length > 0 && (
            <div
              className={'ses-recent' + (fieldOn && !typed.trim() && !emptying ? ' ses-recent--open' : '')}
              inert={!(fieldOn && !typed.trim() && !emptying)}
              onMouseDown={e => e.preventDefault()}
            >
              <div className="ses-recent-in">
                <div className="ses-recent-head">
                  <span className="ses-label">Recent</span>
                  <button
                    type="button"
                    className="ses-label ses-recent-clear"
                    onClick={() => {
                      setEmptying(true);
                      setTimeout(() => {
                        setRecent([]);
                        setEmptying(false);
                        try { localStorage.removeItem(RECENT_KEY); } catch { /* nothing kept */ }
                      }, RECENT_FOLD_MS);
                    }}
                  >
                    Clear
                  </button>
                </div>
                {recent.map(term => (
                  <button key={term} type="button" className="ses-recent-row" onClick={() => type(term)}>
                    <ClockCounterClockwise size={16} weight="regular" aria-hidden="true" />
                    <span>{term}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Only when there is something to say. It held a line open under the
              field the whole time, which was the gap between the search and
              the albums Miyel called too much (2026-09-26). */}
          {(lookingOnEmpty || nothing || BY_HAND_OFFERED) && (
          <div className="ses-under">
            {lookingOnEmpty && <span className="ses-label">Looking…</span>}
            {nothing && <span className="ses-label">Nothing found for that.</span>}
            {/* The door to it is shut. Miyel, 2026-09-18: "let's remove the
                manual entry button from the session, juuuust until I build it
                correctly — I don't want people using it messed up. We'll keep
                it to what currently works."

                Everything behind this still stands — the form, `byHand`, the
                hand-typed tracklist it hands on to — and it is a word away
                from being offered again. It is held rather than deleted
                because what is wrong with it is the shape, not the code, and
                nobody has said yet what the right shape is (MANUAL ENTRY in
                NOTES).

                What this costs, plainly: there is no way to log a record Apple
                Music does not have. That is the trade she made, knowingly, for
                not shipping a way in that does the wrong thing. */}
            {BY_HAND_OFFERED && (
              <button type="button" className="ses-quiet" onClick={() => setByHand(true)}>
                Manual entry
              </button>
            )}
          </div>
          )}

          {results.length > 0 && twoKinds && <p className="ses-label ses-kind">Albums</p>}
          {results.length > 0 && (
            <>
              <div
                ref={albumPager}
                className={'ses-pages' + (paged ? ' ses-pages--paged' : '') + (twoKinds ? ' ses-pages--named' : '')}
                onScroll={paged ? e => {
                  const at = Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth);
                  if (at !== albumPage) setAlbumPage(at);
                } : undefined}
              >
                {albumPages.map((page, i) => (
                  <div key={i} className="ses-grid ses-page">
                    {page.map(album => (
                      <button
                        type="button"
                        key={album.collectionId}
                        className="ses-tile"
                        onClick={e => take(album, e)}
                      >
                        <span className="ses-tile-art">
                          <img src={album.art} alt="" loading="lazy" />
                        </span>
                        <span className="ses-tile-name">{album.name}</span>
                        {/* The name gives way before the year does
                            (ses-split, session.css). */}
                        <span className="ses-tile-year ses-split">
                          <span className="ses-split-by">{album.artist}</span>
                          {album.year && <span className="ses-split-end">{'\u00a0·\u00a0'}{album.year}</span>}
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              {albumPages.length > 1 && (
                <p className="ses-label ses-page-at" aria-live="polite">{albumPage + 1} of {albumPages.length}</p>
              )}
            </>
          )}

          {/* ── Tracks, under the albums, 2026-09-24 ──────────────────────
              A song pressed here is a track note: an entry about that one
              song, never a listen and never part of one (the track-notes
              brief). Rows rather than covers, because a row can say which
              album the song is on, and a cover alone would read as the
              album — two songs off Shrines are two copies of one picture.
              Nothing new on the beacon and no second way to start: search is
              where anybody already looks for a song.

              Headed Tracks, not Songs, from 2026-09-26, and each cover wears
              the folded corner a track note wears on the wall, so the row
              already looks like what pressing it makes (Miyel). */}
          {onPickSong && songs.length > 0 && (
            <>
              <p className="ses-label ses-kind ses-kind--tracks">Tracks</p>
              <div
                ref={trackPager}
                className={'ses-pages ses-pages--tracks' + (paged ? ' ses-pages--paged' : '')}
                onScroll={paged ? e => {
                  const at = Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth);
                  if (at !== trackPage) setTrackPage(at);
                } : undefined}
              >
                {trackPages.map((page, i) => (
                  <div key={i} className="ses-songs ses-page">
                    {page.map(song => (
                      <button
                        type="button"
                        key={`${song.collectionId}-${song.title}`}
                        className="ses-song"
                        onClick={e => {
                          const img = e.currentTarget.querySelector('img');
                          const from = img ? img.getBoundingClientRect() : null;
                          // A draft of this song, if there is one, comes along:
                          // found again in the search, it opens where it was left.
                          const kept = drafts.find(d => d.song && d.lookup_key === lookup_key(song.name, song.artist, song.title));
                          chosen();
                          onPickSong({
                            song: song.title,
                            album: song.name,
                            artist: song.artist,
                            year: song.year || '',
                            artUrl: song.artLarge || song.art || '',
                            collectionId: song.collectionId || null,
                            genre: song.genre || '',
                            written: kept ? { rating: kept.rating, note: kept.notes || '' } : null,
                          }, from);
                        }}
                      >
                        <span className="ses-song-art ln-fold">
                          <img src={song.art} alt="" loading="lazy" />
                          <span className="ln-fold-flap" aria-hidden="true"><img src={song.art} alt="" loading="lazy" /></span>
                        </span>
                        <span className="ses-song-said">
                          <span className="ses-song-title">{song.title}</span>
                          <span className="ses-song-record ses-split">
                            <span className="ses-split-by">{song.name}</span>
                            {song.year && <span className="ses-split-end">{'\u00a0·\u00a0'}{song.year}</span>}
                          </span>
                        </span>
                        <CaretRight className="ses-song-go" size={16} weight="regular" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              {trackPages.length > 1 && (
                <p className="ses-label ses-page-at" aria-live="polite">{trackPage + 1} of {trackPages.length}</p>
              )}
            </>
          )}

          {!noDrafts && drafts.length > 0 && !typed.trim() && (
            /* ── Drafts, as the same squares a search gives ────────────────
               They were rows — a small cover, a name, and the step they were
               left on — under a heading, beside a grid of album art. Two
               shapes for one act. Miyel, 2026-09-18: "making the drafts and
               the album search look the same. Instead of a list and a grid,
               they should all be a grid… so that when I search something, it
               doesn't really change the motion that needs to happen between a
               draft and choosing a fresh album."

               So a draft is a tile, and it is the same tile: the same art, the
               same name, the same second line. Where a search result says the
               year, a draft says how long ago it was — "I do like them saying
               when the last time you worked on them is" — which is the one
               thing a draft has that a record has not, put where the record's
               own extra already goes rather than in a row of its own.

               The step it was left on is gone. "We don't need overview,
               tracks, we don't need where it left off." It was what made a
               draft need a wider row than a square, and it answers a question
               nobody was asking: opening it puts you where you were.

               Only the discard is extra, and it sits on the art, so the tile's
               footprint is a search result's to the pixel. */
            <div className="ses-grid" ref={gridRef}>
              {/* A track note's draft, 2026-09-26, is one of these too: in
                  the same list, newest first, the same as everything else
                  (Miyel — a view that sorts them apart is for later). It wears
                  the folded corner a track note wears on the wall, is named
                  by its song, and opens the track note rather than a listen.
                  A picker that offers no songs shows none. */}
              {drafts.filter(draft => onPickSong || !draft.song).map(draft => {
                const armed = confirmDiscard === draft.id;
                return (
                  <div key={draft.id} data-draft={draft.id} className={'ses-tile ses-tile--draft' + (armed ? ' ses-tile--armed' : '')}>
                    <button
                      type="button"
                      className="ses-tile-open"
                      onPointerDown={() => hold(draft.id)}
                      onPointerUp={letGo}
                      onPointerLeave={letGo}
                      onPointerCancel={letGo}
                      /* iOS offers its own menu on a long press and Safari
                         starts selecting text; both are the gesture being
                         taken away from us. */
                      onContextMenu={e => e.preventDefault()}
                      onClick={e => {
                        // The press that ends a long press is not a tap.
                        if (held.current) { held.current = false; e.preventDefault(); return; }
                        // Armed, this one is the yes. Armed elsewhere, this
                        // one is the no, and nothing else happens — pressing
                        // past a question should answer it, not act on it.
                        if (armed) { discardDraft(draft.id); return; }
                        if (confirmDiscard !== null) { setConfirmDiscard(null); return; }
                        const img = e.currentTarget.querySelector('img');
                        chosen();
                        if (draft.song) {
                          onPickSong({
                            song: draft.song,
                            album: draft.album,
                            artist: draft.artist || '',
                            year: draft.year || '',
                            artUrl: draft.album_art || '',
                            collectionId: draft.collection_id || null,
                            genre: draft.genre || '',
                            written: { rating: draft.rating, note: draft.notes || '' },
                          }, img ? img.getBoundingClientRect() : null);
                          return;
                        }
                        onResume(draft, img ? img.getBoundingClientRect() : null);
                      }}
                      aria-label={armed
                        ? `Delete the draft of ${draft.song || draft.album}`
                        : `${draft.song || draft.album}. Press and hold to delete.`}
                    >
                      <span className={'ses-tile-art' + (draft.song ? ' ln-fold' : '')}>
                        {draft.album_art ? <img src={draft.album_art} alt="" loading="lazy" /> : null}
                        {draft.song && draft.album_art && (
                          <span className="ln-fold-flap" aria-hidden="true"><img src={draft.album_art} alt="" /></span>
                        )}
                        {armed && (
                          <span className="ses-tile-sure">
                            <Trash size={20} weight="fill" aria-hidden="true" />
                            Delete
                          </span>
                        )}
                      </span>
                      {/* The words underneath do not change and do not turn
                          red. Miyel, 2026-09-18: "a red field over just the
                          art, not the text." The question is a thing that has
                          come down over the record, and the record's name is
                          still its name while it is being asked. It said
                          "press again" here and the name went red with it,
                          which made the whole tile the question. */}
                      <span className="ses-tile-name">{draft.song || draft.album}</span>
                      <span className="ses-tile-year ses-split">
                        {draft.artist && <span className="ses-split-by">{draft.artist}</span>}
                        <span className="ses-split-end">{draft.artist ? '\u00a0·\u00a0' : ''}{sinceLabel(draft.updated_at)}</span>
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
