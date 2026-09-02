// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/Journal.js
// The wall of covers, and everything for finding one on it.
//
// This was the whole of app/archive/page.js. It is a component now because two
// places want it: the centre pane of the cross, under the beacon, and /archive
// at its own address — and an archive that existed twice would be two archives
// that drifted, which is the mistake the homepage already made once with its
// desktop and mobile trees.
//
// What stayed behind on the route is the page: the nav, the dot row and the
// offset that clears them. What came here is the search, the filters, the sort,
// the grid and the modal — everything that is about the records rather than
// about being a page.
//
// ── Whose scroll it is ──────────────────────────────────────────────────────
// The one thing that genuinely differs between the two mounts. On the route the
// document scrolls; in the cross the pane does, and the document does not move
// at all. Three things here care: the filter bar sticks to the top of whatever
// is scrolling, the desktop popover closes when that thing scrolls, and the
// phone sheet has to stop it scrolling underneath.
//
// So the scroller is handed in rather than assumed. `scroller` is a ref to the
// element that moves; leave it out and it is the window, which is what a page
// means by scrolling.

'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { parseRating } from '../../library/entry_formatter';
import AlbumTile from './AlbumTile';
import GridDensity, { DEFAULT_DENSITY, readStoredDensity, storeDensity } from './GridDensity';

// Beyonce should find Beyoncé, and Bjork should find Bjork. Accents are a
// spelling most people don't reach for and half the archive's artists have
// one, so they come off both the query and the name before comparing. This
// only started mattering when the search stopped covering the notes, which
// had been quietly catching the unaccented spellings all along.
const foldForSearch = value => String(value || '')
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .toLowerCase()
  .trim();

// Sorting is a field plus a direction rather than one flat list: picking a
// field applies the direction that field is normally wanted in, and picking
// it again turns it around. `desc` is what the arrow points at, so each
// field declares which way its own "descending" reads — newest first for a
// date, highest first for a rating, but Z→A for a title.
const SORTS = [
  { value: 'posted', label: 'Date posted',  defaultDir: 'desc', asc: 'Oldest first', desc: 'Newest first' },
  { value: 'album',  label: 'Album',        defaultDir: 'asc',  asc: 'A–Z',          desc: 'Z–A' },
  { value: 'artist', label: 'Artist',       defaultDir: 'asc',  asc: 'A–Z',          desc: 'Z–A' },
  { value: 'rating', label: 'Rating',       defaultDir: 'desc', asc: 'Lowest first', desc: 'Highest first' },
  { value: 'year',   label: 'Release year', defaultDir: 'desc', asc: 'Oldest first', desc: 'Newest first' },
];

// Type used to be a filter here — Library or Submission. The archive is the
// library, so that split was a filter between "everything" and "everything",
// and the only half worth naming is already written on the entries that are
// submissions. Removed rather than hidden; nothing else read it.
// The year column is free text ("2019", occasionally with more around it).
const releaseYear = entry => {
  const m = String(entry.year || '').match(/\d{4}/);
  return m ? parseInt(m[0], 10) : null;
};

// Below this, a tile turns over to its metadata card instead of opening the
// modal — the modal is a good desktop experience and a bad phone one. Same
// number as the sitewide mobile breakpoint in globals.css.
const FLIP_BELOW = 768;

// How many covers before the wall is broken into pages. Fifty is a wall you can
// still scan and roughly two screens of the widest tiles; past that you are
// scrolling rather than looking, and the sort you chose stops meaning anything
// because you never reach the other end of it.
//
// It is a count of the *filtered* set, not of the archive — searching for one
// artist inside three hundred records should give you their four, on one page.
const PER_PAGE = 50;

// entries and loading are optional. The cross already asks /api/entries for its
// recent row and its counts, so on the homepage the wall is handed what has
// already arrived rather than fetching the same list a second time; at
// /archive nothing has asked yet, so it asks.
export default function Journal({ entries: given, loading: givenLoading, scroller, foot = null }) {
  const [ownEntries, setOwnEntries] = useState([]);
  const [ownLoading, setOwnLoading] = useState(true);
  const supplied = Array.isArray(given);
  const entries = supplied ? given : ownEntries;
  const loading = supplied ? Boolean(givenLoading) : ownLoading;
  // Neither a flipped tile nor an open modal is state this holds any more.
  // A cover is a link to its entry, and the entry arrives as a layer over this
  // grid — see app/@layer. What used to live here was two different answers to
  // one question: on a phone the tile flipped to a metadata card, and on a
  // desktop it opened EntryModal, a second copy of the entry's layout drawn
  // over the top with the URL pushed in by hand.

  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  // An artist named in a review links here with ?q=their name — the archive
  // filtered to one artist is the artist page this site doesn't otherwise
  // have. Read off window rather than through useSearchParams, which would
  // want a Suspense boundary and cost this page its prerender.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) { setSearch(q); setSearchOpen(true); }
  }, []);
  const [sortBy, setSortBy] = useState('posted');
  const [sortDir, setSortDir] = useState('desc');
  const [genre, setGenre] = useState('');
  const [genresOpen, setGenresOpen] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [masterpiecesOnly, setMasterpiecesOnly] = useState(false);
  // Highlights had two of the three flags in it. The third was decided at the
  // same time as the other two and never given a way in here.
  const [formativeOnly, setFormativeOnly] = useState(false);
  // null until the entries land — the range can't be known before the data
  // is, and an unset range means "every year", not "no years".
  const [yearRange, setYearRange] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Where the desktop popover hangs. Measured off the button rather than
  // guessed in CSS — its x depends on how wide the search field and the sort
  // select happen to be. Frozen at open time, which holds because the
  // popover closes on scroll (see the effect below).
  const filterBtnRef = useRef(null);
  const [anchor, setAnchor] = useState(null);

  // Drag-to-dismiss on the phone sheet. `drag` is how far down the finger
  // has pulled it; `settling` marks the moment after release, when the
  // transform is being animated rather than driven by the finger.
  const sheetRef = useRef(null);
  const dragFromRef = useRef(null);
  const [drag, setDrag] = useState(0);
  const [settling, setSettling] = useState(false);

  // Which page of the wall. Reset by anything that changes what the wall holds
  // — landing on page four of a search that only has one page is a blank grid
  // and no explanation.
  const [page, setPage] = useState(0);
  const [density, setDensity] = useState(DEFAULT_DENSITY);
  // Rendered on the server with no idea which it is; resolved on mount,
  // which lands well before the entries fetch does, so nothing ever shows
  // the wrong behaviour to a real reader.
  const [isPhone, setIsPhone] = useState(false);

  useEffect(() => {
    setDensity(readStoredDensity());
    const mq = window.matchMedia(`(max-width: ${FLIP_BELOW}px)`);
    const sync = () => setIsPhone(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (supplied) return;
    fetch('/api/entries')
      .then(r => r.json())
      .then(d => { setOwnEntries(d.entries || []); setOwnLoading(false); })
      .catch(() => setOwnLoading(false));
  }, [supplied]);

  const changeDensity = useCallback(value => {
    setDensity(value);
    storeDensity(value);
  }, []);

  // Measured after the open commits, off the live layout — reading the rect
  // inside the click handler catches whatever the bar looked like before
  // React had re-rendered it, which is a different place on the screen.
  useLayoutEffect(() => {
    if (!filtersOpen) return;
    const r = filterBtnRef.current?.getBoundingClientRect();
    if (r) setAnchor({ left: r.left, top: r.bottom + 8 });
  }, [filtersOpen]);

  useEffect(() => {
    if (!filtersOpen) return;
    const onKey = e => { if (e.key === 'Escape') setFiltersOpen(false); };
    window.addEventListener('keydown', onKey);

    // The phone sheet covers the screen, so the grid scrolling behind it
    // would drop you somewhere you didn't choose — lock it. The desktop
    // popover is small and pinned to its button, so instead of locking the
    // page (which pulls the scrollbar out and shifts the bar sideways
    // underneath the panel it's anchored to) it just closes on scroll.
    let cleanupScroll;
    if (isPhone) {
      // Locking the body does nothing when the body is not what moves — in the
      // cross the pane is its own scroller and would carry on underneath the
      // sheet. Lock the one that scrolls.
      //
      // A class rather than an inline style, because an inline style has to be
      // put back exactly as it was found and this element belongs to somebody
      // else — the pane is HomeNav's, and handing it back with an overflow it
      // did not have is the kind of thing that shows up three screens later.
      const port = scroller?.current || document.body;
      port.classList.add('ln-locked');
      cleanupScroll = () => port.classList.remove('ln-locked');
    } else {
      // Whatever is moving, which on the cross is a pane and not the window.
      // Listening on window there would be listening to something that never
      // scrolls, and the popover would hang over the grid as it went past.
      const port = scroller?.current || window;
      const onScroll = () => setFiltersOpen(false);
      port.addEventListener('scroll', onScroll, { passive: true });
      cleanupScroll = () => port.removeEventListener('scroll', onScroll);
    }

    return () => {
      window.removeEventListener('keydown', onKey);
      cleanupScroll();
    };
  }, [filtersOpen, isPhone, scroller]);

  // The full span the collection covers, which is what the year slider's
  // ends are pinned to. Recomputed from the entries rather than hardcoded so
  // it widens by itself as older or newer records get added.
  const yearBounds = useMemo(() => {
    const years = entries.map(releaseYear).filter(y => y !== null);
    if (!years.length) return null;
    return { min: Math.min(...years), max: Math.max(...years) };
  }, [entries]);

  // Genre is an open vocabulary coming from Apple, so the options are whatever
  // the archive actually contains rather than a list held here that would drift
  // out of date the first time something new gets logged.
  //
  // Ordered by how much of the archive each one accounts for, because that's
  // the order they're worth offering in — and because the tail of one-off
  // genres is what would eventually turn this row into a wall.
  const genres = useMemo(() => {
    const seen = new Map();
    for (const e of entries) {
      const g = (e.genre || '').trim();
      if (!g) continue;
      const key = g.toLowerCase();
      const hit = seen.get(key);
      if (hit) hit.count++;
      else seen.set(key, { name: g, count: 1 });
    }
    return [...seen.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [entries]);

  // The ones carrying more than a single record lead, up to a dozen. Everything
  // else waits behind the toggle — reachable, just not in the way.
  const genresShown = useMemo(() => genres.filter(g => g.count > 1).slice(0, 12), [genres]);
  const genresRest = useMemo(
    () => genres.filter(g => !genresShown.includes(g)),
    [genres, genresShown],
  );

  // Opens sitting on the full span once the entries arrive. Only ever seeds
  // it once, so a reload of the list doesn't yank the handles out from under
  // someone who has already moved them.
  useEffect(() => {
    if (yearBounds && !yearRange) setYearRange([yearBounds.min, yearBounds.max]);
  }, [yearBounds, yearRange]);

  // A range equal to the full span is the same as no range at all — treated
  // as inactive so it doesn't light up the Filters badge or the Clear button
  // just for sitting where it started.
  const yearActive = Boolean(
    yearBounds && yearRange && (yearRange[0] > yearBounds.min || yearRange[1] < yearBounds.max)
  );

  const filtered = useMemo(() => {
    const q = foldForSearch(search);
    const dir = sortDir === 'asc' ? 1 : -1;
    return entries
      .filter(e => {
        // Names only — the album and the artist, nothing else.
        //
        // This used to search the writing as well, on the reasoning that
        // finding a record by something you remember saying about it was what
        // tags had been standing in for. In practice it answered a question
        // nobody asked: searching Bjork returned MAGDALENE, because a review
        // mentions her, and an archive that hands you a record by an artist
        // it doesn't have reads as broken rather than clever. Genre came out
        // with it — there is a genre filter for that, sitting right there.
        if (q && !(
          foldForSearch(e.album).includes(q) ||
          foldForSearch(e.artist).includes(q)
        )) return false;
        if (genre && (e.genre || '') !== genre) return false;
        if (favoritesOnly && !(e.favorite === true || e.favorite === 'true')) return false;
        if (masterpiecesOnly && e.rating !== 'Masterpiece' && e.masterpiece !== true) return false;
        // The flag, which is now the only place this is recorded — the nine
        // rows that said so under the old relationship column were migrated
        // onto it before that column was dropped.
        if (formativeOnly && !(e.formative === true || e.formative === 'true')) return false;
        if (yearActive) {
          const y = releaseYear(e);
          // An entry with no year can't be shown to fall inside a range, so
          // narrowing the years drops it rather than guessing on its behalf.
          if (y === null || y < yearRange[0] || y > yearRange[1]) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'album')  return dir * (a.album  || '').localeCompare(b.album  || '');
        if (sortBy === 'artist') return dir * (a.artist || '').localeCompare(b.artist || '');
        if (sortBy === 'rating') return dir * ((parseRating(a.rating) || 0) - (parseRating(b.rating) || 0));
        // Undated albums sort as year 0, which parks them at the far end
        // rather than scattering them through the middle.
        if (sortBy === 'year')   return dir * ((releaseYear(a) || 0) - (releaseYear(b) || 0));
        return dir * (new Date(a.created_at) - new Date(b.created_at));
      });
  }, [entries, search, sortBy, sortDir, genre, favoritesOnly, masterpiecesOnly, formativeOnly, yearActive, yearRange]);

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  // Clamped rather than reset in an effect: if the filters shrink the results
  // under your feet, the page you are on may no longer exist, and the honest
  // answer is the last one that does.
  const current = Math.min(page, pages - 1);
  const shown = pages > 1 ? filtered.slice(current * PER_PAGE, (current + 1) * PER_PAGE) : filtered;

  const activeSort = SORTS.find(s => s.value === sortBy) ?? SORTS[0];

  // Picking the field you're already on turns it around; picking a new one
  // starts it in whichever direction that field is normally read.
  function chooseSort(value) {
    if (value === sortBy) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(value);
    setSortDir(SORTS.find(s => s.value === value)?.defaultDir ?? 'desc');
  }

  function toPage(next) {
    setPage(next);
    const port = scroller?.current;
    if (port) port.scrollTo({ top: 0, behavior: 'auto' });
    else window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function clearFilters() {
    setPage(0);
    setSearch(''); setGenre(''); setGenresOpen(false);
    setFavoritesOnly(false); setMasterpiecesOnly(false); setFormativeOnly(false);
    setSortBy('posted'); setSortDir('desc');
    setYearRange(yearBounds ? [yearBounds.min, yearBounds.max] : null);
  }

  // Only what's tucked away behind the Filters button counts toward the
  // badge — the search box is in plain sight, so counting it would put a
  // number on the button with nothing behind it to explain the number.
  const tuckedAwayCount =
    (genre ? 1 : 0) +
    (favoritesOnly ? 1 : 0) + (masterpiecesOnly ? 1 : 0) + (formativeOnly ? 1 : 0) +
    (yearActive ? 1 : 0) +
    (sortBy !== 'posted' || sortDir !== 'desc' ? 1 : 0);
  const hasActiveFilters = Boolean(search) || tuckedAwayCount > 0;

  // Pointer events rather than touch events: the same handlers then drive a
  // finger on a phone and a mouse on a trackpad, and pointer capture keeps
  // the drag alive when the finger leaves the grip's 28px band — which it
  // does immediately, since dragging down is the whole gesture.
  function onGripDown(e) {
    dragFromRef.current = e.clientY;
    setSettling(false);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onGripMove(e) {
    if (dragFromRef.current === null) return;
    // Downward only. Letting it track upward would lift the sheet off the
    // bottom of the screen and expose the page behind it.
    setDrag(Math.max(0, e.clientY - dragFromRef.current));
  }

  function onGripUp() {
    if (dragFromRef.current === null) return;
    dragFromRef.current = null;
    const height = sheetRef.current?.offsetHeight ?? 400;
    // A short sheet shouldn't need a 120px pull to dismiss, and a tall one
    // shouldn't dismiss on a twitch — whichever is smaller.
    const closeAt = Math.min(120, height * 0.28);
    setSettling(true);
    if (drag > closeAt) {
      setDrag(height);                       // ride it the rest of the way out
      setTimeout(() => setFiltersOpen(false), 180);
    } else {
      setDrag(0);                            // spring back
    }
  }

  // Reset between openings, so a sheet dismissed by dragging doesn't come
  // back still holding the offset it left on.
  useEffect(() => {
    if (!filtersOpen) { setDrag(0); setSettling(false); dragFromRef.current = null; }
  }, [filtersOpen]);

  return (
    <>
      <style>{`
        /* The fixed nav ends at 80px on every breakpoint — it was 136 while a
           labelled dot row hung under it. The page starts just below, and
           the filter bar parks there once you scroll — there's no separate
           page title anymore, so the grid is the first thing you see. */
        /* 80, not 136. That number covered the nav row and the dot row under
           it; the dots are gone, so the rest was a band of nothing at the top
           of every page. */
        .arc-page {
          --arc-nav-bottom: calc(80px + var(--safe-top));
          padding-top: calc(var(--arc-nav-bottom) + 16px);
          /* A column, so the bar can be ordered back above the wall on a wide
             screen while sitting after it in the markup. See the note by
             .arc-bar-wrap. */
          display: flex;
          flex-direction: column;
        }

        .arc-bar-wrap { position: sticky; top: var(--arc-nav-bottom); z-index: 101; padding: 0 24px 10px; }

        /* ── On a phone the bar goes to the bottom ────────────────────────
           Where the thumb is. At the top it is furthest from the hand and it
           takes the first hundred pixels of the wall, which on a screen this
           size is most of a row of covers — the records should have the top of
           the screen and the controls should be where you can reach them.

           Sticky rather than fixed, and that is not a preference either: this
           wall is mounted inside a pane of the cross, and a fixed bar would
           float over the card and the desk when you swiped away from it. A
           sticky one travels with the pane it belongs to.

           It sticks bottom while being the first child of a very tall column,
           which pins it to the bottom edge for the whole scroll — the natural
           position it can never fall below is off the top, so it never
           unsticks. */
        @media (min-width: 769px) { .arc-bar-wrap { order: -1; } }
        @media (max-width: 768px) {
          .arc-bar-wrap {
            top: auto;
            /* On the bottom edge, not hovering above it. It sat 68px up to
               clear the cross's row of carets — and the carets are hidden for
               as long as a pane is scrolled, which is the only time this bar is
               on screen at all, so there was never anything under it to clear.
               A bar with a strip of page showing beneath reads as a thing
               floating over the wall rather than the edge of the wall. */
            bottom: 0;
          }
        }
        .arc-bar {
          max-width: 1100px; margin: 0 auto;
          display: flex; align-items: center; gap: 8px;
          padding: 8px 10px;
          background: var(--panel);
          backdrop-filter: var(--card-blur); -webkit-backdrop-filter: var(--card-blur);
          border: 1px solid var(--panel-border); border-radius: 14px;
          box-shadow: var(--shadow-soft);
        }

        /* Search: a real field at rest so it reads as searchable, growing to
           take the whole bar while you type. flex-basis rather than width so
           it gives room back to the controls when it collapses. */
        .arc-search { position: relative; display: flex; align-items: center; flex: 0 1 240px; min-width: 0; transition: flex-basis 0.22s ease; }
        .arc-search svg { position: absolute; left: 10px; color: var(--ink-faint); pointer-events: none; }
        /* Translucent, but with no backdrop-filter of their own — the bar
           beneath has already blurred what's behind it, and these paint on
           top of that result. Adding a second filter here would blur an
           already-blurred layer and turn the whole bar to mud. */
        .arc-search input {
          width: 100%; min-width: 0;
          background: var(--panel); color: var(--ink);
          border: 1px solid var(--border); border-radius: 9px;
          padding: 7px 10px 7px 30px;
          font-family: var(--font-label); font-size: 12px; outline: none;
        }
        .arc-search input:focus { border-color: var(--ink-faint); }
        .arc-bar--searching .arc-search { flex-basis: 100%; }

        .arc-ctl {
          display: flex; align-items: center; gap: 6px; flex-shrink: 0;
          background: var(--panel); color: var(--ink-soft);
          border: 1px solid var(--border); border-radius: 9px;
          padding: 7px 11px; cursor: pointer; outline: none;
          font-family: var(--font-label); font-size: 11px; letter-spacing: 0.06em;
          transition: color 0.15s, border-color 0.15s;
        }
        .arc-ctl:hover { color: var(--ink); }
        .arc-ctl--on { color: var(--ink); border-color: var(--ink-faint); }
        /* Square, so the arrow reads as a companion to the sort select
           rather than a second, unrelated button. */
        .arc-dir { padding: 7px 9px; color: var(--ink); }
        .arc-arrow { flex-shrink: 0; }
        .arc-badge {
          min-width: 15px; height: 15px; padding: 0 4px; border-radius: 999px;
          display: inline-flex; align-items: center; justify-content: center;
          background: var(--ink); color: var(--bg);
          font-family: var(--font-label); font-size: 9px; line-height: 1;
        }

        .arc-count {
          margin-left: auto; flex-shrink: 0; white-space: nowrap;
          font-family: var(--font-label); font-size: 10px; letter-spacing: 0.1em;
          color: var(--ink-faint);
        }

        /* ── Filters: a popover panel on desktop, a bottom sheet on a phone ── */
        /* Invisible on desktop — it's only there to catch the click that
           closes the panel. Dimming the whole page behind a small popover
           would be far more than the popover is worth; the phone sheet,
           which does cover the screen, gets the dim back below. */
        .arc-scrim { position: fixed; inset: 0; z-index: 150; }
        @keyframes arcFade { from { opacity: 0; } to { opacity: 1; } }
        .arc-sheet {
          /* left/top are set inline from the button's own position; these
             are the fallback for the first paint before it's measured. */
          position: fixed; z-index: 151;
          top: calc(var(--arc-nav-bottom) + 78px); left: max(24px, calc(50vw - 550px)); width: 290px;
          /* The same frosted glass as the bar it hangs off, but at the
             stronger opacity — this panel is big enough to sit over album
             art rather than flat page, and --panel's 45% can't hold text
             against that. */
          background: var(--panel-strong);
          backdrop-filter: var(--card-blur); -webkit-backdrop-filter: var(--card-blur);
          border: 1px solid var(--panel-border);
          border-radius: 14px; box-shadow: var(--shadow-lift);
          padding: 16px; display: flex; flex-direction: column; gap: 16px;
          animation: arcPop 0.18s ease;
        }
        @keyframes arcPop { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
        .arc-sheet-group { display: flex; flex-direction: column; gap: 7px; }
        .arc-sheet-label {
          display: flex; align-items: baseline; justify-content: space-between; gap: 8px;
          font-family: var(--font-label); font-size: 9px; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--ink-faint);
        }
        /* The live readout of the year handles, sat on the group's own label
           rather than floating over the track where a handle would cover it. */
        .arc-sheet-value { color: var(--ink); letter-spacing: 0.08em; }
        /* Spells out what the arrow means — "Newest first" reads faster than
           working it out from which way the arrowhead points. */
        .arc-sheet-hint {
          font-family: var(--font-label); font-size: 10px;
          color: var(--ink-faint); letter-spacing: 0.04em;
        }
        .arc-sheet-opts { display: flex; flex-wrap: wrap; gap: 6px; }
        .arc-opt {
          display: inline-flex; align-items: center; gap: 5px;
          font-family: var(--font-label); font-size: 11px; letter-spacing: 0.04em;
          padding: 6px 11px; border-radius: 999px; cursor: pointer;
          background: transparent; color: var(--ink-soft);
          border: 1px solid var(--border); transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .arc-opt--on { background: var(--ink); color: var(--bg); border-color: var(--ink); }

        /* ── Year range ──────────────────────────────────────────────────
           Two native range inputs on one track. Both are stretched across
           the full width and made transparent to pointer input, so a press
           lands on whichever HANDLE is nearest rather than on whichever
           input happens to be on top. */
        .yr { position: relative; height: 34px; margin-top: 2px; }
        .yr-track {
          position: absolute; left: 0; right: 0; top: 9px; height: 3px;
          background: var(--border); border-radius: 999px;
        }
        .yr-fill { position: absolute; top: 0; bottom: 0; background: var(--ink); border-radius: 999px; }
        .yr-input {
          position: absolute; left: 0; top: 0; width: 100%; height: 21px;
          margin: 0; background: none; pointer-events: none;
          -webkit-appearance: none; appearance: none;
        }
        .yr-input:focus { outline: none; }
        .yr-input::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          pointer-events: auto; cursor: grab;
          width: 17px; height: 17px; border-radius: 50%;
          background: var(--panel-solid); border: 2px solid var(--ink);
          box-shadow: var(--shadow-soft);
        }
        .yr-input::-moz-range-thumb {
          pointer-events: auto; cursor: grab;
          width: 17px; height: 17px; border-radius: 50%;
          background: var(--panel-solid); border: 2px solid var(--ink);
          box-shadow: var(--shadow-soft);
        }
        .yr-input:focus-visible::-webkit-slider-thumb { border-color: var(--accent); }
        .yr-input::-moz-range-track { background: none; }
        .yr-ends {
          position: absolute; left: 0; right: 0; bottom: 0;
          display: flex; justify-content: space-between;
          font-family: var(--font-label); font-size: 9px; color: var(--ink-faint);
        }
        /* Centred and sized to their own text rather than stretched to the
           panel's full width — two buttons splitting the width edge to edge
           read as a segmented control, which is not what they are. */
        .arc-sheet-foot { display: flex; gap: 8px; justify-content: center; }
        .arc-sheet-foot button { min-width: 108px; justify-content: center; }
        .arc-sheet-done { background: var(--ink); color: var(--bg); border-color: var(--ink); }
        .arc-sheet-grip { display: none; }

        /* ── The grid. Density is set on the container, so every tile's size
           comes from one attribute rather than being threaded through each
           tile's styles. ── */
        /* width and box-sizing are not decoration. Both things that mount this
           wall are flex columns now, and an auto left-and-right margin on a
           flex item turns off the stretch that was giving it the full measure
           — main collapsed to the width of its own content and drew the whole
           archive down a narrow channel in the middle of the page. */
        .arc-main { width: 100%; box-sizing: border-box; padding: 4px 24px 120px; }
        /* 14, not 24. On a phone every pixel down the side is a pixel off the
           covers, and the tiles are the page — the bar below already sits on
           the same 14. */
        @media (max-width: 768px) { .arc-main { padding: 0 14px 132px; } }
        .arc-pages {
          display: flex; align-items: center; justify-content: center; gap: 14px;
          margin-top: 34px;
        }
        .arc-page-step {
          display: inline-flex; align-items: center; justify-content: center;
          width: 34px; height: 34px; border-radius: 10px;
          border: 1px solid var(--border); background: transparent;
          color: var(--ink-soft); cursor: pointer;
          transition: color 0.15s, border-color 0.15s;
        }
        .arc-page-step:hover:not(:disabled) { color: var(--ink); border-color: var(--ink-faint); }
        .arc-page-step:disabled { opacity: 0.3; cursor: default; }
        .arc-page-count {
          font-family: var(--font-label); font-size: 10px;
          letter-spacing: 0.14em; color: var(--ink-faint);
        }
        .arc-grid { display: grid; gap: 14px; }
        .arc-grid[data-density="large"]  { grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); }
        .arc-grid[data-density="medium"] { grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); }
        .arc-grid[data-density="small"]  { grid-template-columns: repeat(auto-fill, minmax(94px,  1fr)); gap: 10px; }

        .arc-skel { aspect-ratio: 1 / 1; border-radius: 10px; background: var(--bg-warm); animation: arcPulse 1.4s ease-in-out infinite; }
        @keyframes arcPulse { 0%,100% { opacity: 0.6; } 50% { opacity: 0.3; } }

        .arc-empty {
          text-align: center; padding: 80px 0; color: var(--ink-faint);
          font-family: var(--font-label); font-size: 12px; letter-spacing: 0.1em;
        }
        .arc-empty--new { display: flex; flex-direction: column; gap: 10px; align-items: center; }
        .arc-empty-said { color: var(--ink-soft); }
        .arc-empty-how { font-size: 10px; letter-spacing: 0.08em; }

        @media (max-width: 768px) {
          .arc-page { padding-top: calc(var(--arc-nav-bottom) + 10px); }
          /* Edge to edge and on the floor. This block is further down the
             sheet than the one that first puts the bar on the bottom, so the
             padding has to be settled here or the 14px side inset above wins
             and the bar goes back to being a pill hovering over the covers. */
          .arc-bar-wrap { padding: 10px 0 0; }
          .arc-bar {
            gap: 6px;
            border-radius: 14px 14px 0 0;
            border-bottom: none;
            padding: 6px 12px calc(6px + env(safe-area-inset-bottom));
          }
          /* 16px keeps iOS from zooming the page when the field takes focus. */
          .arc-search input { font-size: 16px; padding: 6px 10px 6px 28px; }
          .arc-search { flex: 1 1 auto; }
          /* Typing gets the whole bar: the controls are still one tap away
             once the field gives focus back. */
          .arc-bar--searching .arc-ctl,
          .arc-bar--searching .gd,
          .arc-bar--searching .arc-count { display: none; }
          .arc-ctl { padding: 7px 9px; }
          .arc-ctl-text { display: none; }
          .arc-count { display: none; }

          .arc-grid[data-density="large"]  { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
          .arc-grid[data-density="medium"] { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; }
          .arc-grid[data-density="small"]  { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }

          .arc-scrim { background: rgba(0,0,0,0.28); animation: arcFade 0.18s ease; }

          /* The popover becomes a bottom sheet — a panel hanging off a
             button is a desktop idiom, and up near the nav it's out of
             thumb reach on a phone. */
          .arc-sheet {
            top: auto; bottom: 0; left: 0; right: 0; width: auto;
            border-radius: 20px 20px 0 0; border-bottom: none;
            padding: 10px 20px calc(20px + env(safe-area-inset-bottom));
            animation: arcSlide 0.22s ease;
            /* Fits an iPhone with room to spare, but a small phone or a
               large accessibility text size can push it past the top. */
            max-height: 82vh; overflow-y: auto; overscroll-behavior: contain;
          }
          @keyframes arcSlide { from { transform: translateY(100%); } to { transform: none; } }
          /* Springs back when released short of the threshold; the drag
             itself sets the transform inline and turns this off, so the
             sheet tracks the finger 1:1 instead of easing behind it. */
          .arc-sheet--dragging { animation: none; transition: none; }
          .arc-sheet--settling { animation: none; transition: transform 0.2s ease-out; }

          /* The grab area, not the bar itself — the visible handle is 4px
             tall, which is nothing to aim at. This gives it a 28px target
             spanning the sheet's full width. touch-action stops the browser
             claiming the gesture as a scroll before we see it. */
          .arc-sheet-grip {
            display: block; width: 100%; height: 28px; padding: 0; border: none;
            background: none; cursor: grab; touch-action: none;
            margin: -6px 0 0;
          }
          .arc-sheet-grip:active { cursor: grabbing; }
          .arc-sheet-grip::before {
            content: ''; display: block; width: 36px; height: 4px;
            border-radius: 999px; background: var(--border); margin: 8px auto 0;
          }
          .arc-opt { padding: 8px 13px; font-size: 12px; }
        }
      `}</style>

      {/* The floor clears the bar now that the bar is on it. 120px was the
          old bottom margin and happens to be about right for a bar plus a row
          of carets, so on a phone it is left alone and the top comes off
          instead — the wall starts where the pane starts. */}
      <main className="arc-main" style={{ maxWidth: 1100, margin: '0 auto' }}>
        {loading ? (
          <div className="arc-grid" data-density={density}>
            {[...Array(18)].map((_, i) => <div key={i} className="arc-skel" style={{ animationDelay: (i * 0.04) + 's' }} />)}
          </div>
        ) : entries.length === 0 ? (
          /* Zero entries is a different fact from zero matches, and on a new
             copy it is the first thing anybody sees. "No entries match these
             filters" told a new owner their filters were wrong. */
          <div className="arc-empty arc-empty--new">
            <span className="arc-empty-said">Nothing logged yet.</span>
            <span className="arc-empty-how">The first listen goes in from the desk.</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="arc-empty">No entries match these filters.</div>
        ) : (
          <div className="arc-grid" data-density={density}>
            {shown.map(e => (
              <AlbumTile key={e.slug} entry={e} density={density} />
            ))}
          </div>
        )}

        {foot}
        {/* Only when there is more than one. A pager under a single page is a
            control that says the collection is bigger than it is. */}
        {pages > 1 && (
          <nav className="arc-pages" aria-label="Pages">
            <button
              type="button"
              className="arc-page-step"
              onClick={() => toPage(current - 1)}
              disabled={current === 0}
              aria-label="Previous page"
            >
              ←
            </button>
            <span className="arc-page-count">
              {current + 1} / {pages}
            </span>
            <button
              type="button"
              className="arc-page-step"
              onClick={() => toPage(current + 1)}
              disabled={current >= pages - 1}
              aria-label="Next page"
            >
              →
            </button>
          </nav>
        )}
      </main>
      <div className="arc-bar-wrap">
        <div className={'arc-bar' + (searchOpen ? ' arc-bar--searching' : '')}>
          <label className="arc-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="21" y2="21" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => { if (!search) setSearchOpen(false); }}
              placeholder="Search albums, artists, notes"
              aria-label="Search album or artist"
            />
          </label>

          {/* Sort earns its place in the bar on desktop — it's the control
              that gets reached for most, and there's room. On a phone it
              goes in the sheet with everything else. */}
          {!isPhone && (
            <>
              <select
                className="arc-ctl"
                value={sortBy}
                onChange={e => chooseSort(e.target.value)}
                aria-label="Sort by"
              >
                {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              {/* The direction is its own control here rather than a second
                  click on the select, which has no "click the option you're
                  already on" gesture to hang it off. */}
              <button
                type="button"
                className="arc-ctl arc-dir"
                onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
                aria-label={`Sort direction: ${activeSort[sortDir]}`}
                title={activeSort[sortDir]}
              >
                <SortArrow dir={sortDir} />
              </button>
            </>
          )}

          <button
            type="button"
            ref={filterBtnRef}
            className={'arc-ctl' + (tuckedAwayCount ? ' arc-ctl--on' : '')}
            onClick={() => setFiltersOpen(v => !v)}
            aria-label="Filters"
            aria-expanded={filtersOpen}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="7" x2="21" y2="7" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="17" x2="21" y2="17" />
              <circle cx="9" cy="7" r="2.2" fill="var(--panel-solid)" /><circle cx="16" cy="12" r="2.2" fill="var(--panel-solid)" /><circle cx="7" cy="17" r="2.2" fill="var(--panel-solid)" />
            </svg>
            <span className="arc-ctl-text">Filters</span>
            {tuckedAwayCount > 0 && <span className="arc-badge">{tuckedAwayCount}</span>}
          </button>

          <GridDensity value={density} onChange={changeDensity} />

          {/* Keyed off whether anything is actually hidden, not off whether a
              control is non-default — re-sorting changes no totals, and
              "34 of 34" reads like a filter that didn't work. */}
          <span className="arc-count">
            {filtered.length === entries.length
              ? `${entries.length} albums`
              : `${filtered.length} of ${entries.length}`}
          </span>
        </div>
      </div>

      {filtersOpen && (
        <>
          <div className="arc-scrim" onClick={() => setFiltersOpen(false)} />
          <div
            ref={sheetRef}
            className={'arc-sheet'
              + (drag > 0 && !settling ? ' arc-sheet--dragging' : '')
              + (settling ? ' arc-sheet--settling' : '')}
            role="dialog"
            aria-label="Filters"
            style={
              !isPhone && anchor
                ? { left: anchor.left, top: anchor.top, right: 'auto' }
                : (drag > 0 || settling ? { transform: `translateY(${drag}px)` } : undefined)
            }
          >
            {/* Phone only — the desktop popover is dismissed by clicking off
                it, which is what a popover is expected to do. */}
            {isPhone && (
              <button
                type="button"
                className="arc-sheet-grip"
                aria-label="Close filters"
                onPointerDown={onGripDown}
                onPointerMove={onGripMove}
                onPointerUp={onGripUp}
                onPointerCancel={onGripUp}
                onClick={() => { if (drag === 0) setFiltersOpen(false); }}
              />
            )}

            {isPhone && (
              <div className="arc-sheet-group">
                <div className="arc-sheet-label">Sort</div>
                <div className="arc-sheet-opts">
                  {/* The chip you're on carries the arrow, and tapping it
                      again turns it over — so the control shows both which
                      field is sorting and which way, in one place. */}
                  {SORTS.map(s => {
                    const on = sortBy === s.value;
                    return (
                      <button key={s.value} type="button"
                        className={'arc-opt' + (on ? ' arc-opt--on' : '')}
                        aria-pressed={on}
                        title={on ? s[sortDir] : undefined}
                        onClick={() => chooseSort(s.value)}>
                        {s.label}
                        {on && <SortArrow dir={sortDir} />}
                      </button>
                    );
                  })}
                </div>
                <div className="arc-sheet-hint">{activeSort[sortDir]}</div>
              </div>
            )}



            {/* Only worth a group once there's more than one genre to choose
                between — on a young archive it would be a row with a single
                option and nothing to compare it against. */}
            {genres.length > 1 && (
              <div className="arc-sheet-group">
                <div className="arc-sheet-label">Genre</div>
                <div className="arc-sheet-opts">
                  <button type="button" className={'arc-opt' + (!genre ? ' arc-opt--on' : '')} onClick={() => setGenre('')}>All</button>
                  {genresShown.map(g => (
                    <button key={g.name} type="button"
                      className={'arc-opt' + (genre === g.name ? ' arc-opt--on' : '')}
                      onClick={() => setGenre(genre === g.name ? '' : g.name)}>{g.name}</button>
                  ))}
                  {/* A hidden genre that's currently doing the filtering still
                      shows, collapsed or not — otherwise the archive would be
                      filtered by something with nothing on screen saying so. */}
                  {genresRest.map(g => (
                    (genresOpen || genre === g.name) && (
                      <button key={g.name} type="button"
                        className={'arc-opt' + (genre === g.name ? ' arc-opt--on' : '')}
                        onClick={() => setGenre(genre === g.name ? '' : g.name)}>{g.name}</button>
                    )
                  ))}
                  {genresRest.length > 0 && (
                    <button type="button" className="arc-opt" onClick={() => setGenresOpen(v => !v)}>
                      {genresOpen ? 'Less' : `+${genresRest.length} more`}
                    </button>
                  )}
                </div>
              </div>
            )}

            {yearBounds && yearRange && (
              <div className="arc-sheet-group">
                <div className="arc-sheet-label">
                  Release year
                  <span className="arc-sheet-value">
                    {yearRange[0] === yearRange[1] ? yearRange[0] : `${yearRange[0]} – ${yearRange[1]}`}
                  </span>
                </div>
                <YearRange bounds={yearBounds} value={yearRange} onChange={setYearRange} />
              </div>
            )}

            <div className="arc-sheet-group">
              <div className="arc-sheet-label">Highlights</div>
              <div className="arc-sheet-opts">
                <button type="button" className={'arc-opt' + (favoritesOnly ? ' arc-opt--on' : '')} onClick={() => setFavoritesOnly(v => !v)}>Favorites</button>
                <button type="button" className={'arc-opt' + (masterpiecesOnly ? ' arc-opt--on' : '')} onClick={() => setMasterpiecesOnly(v => !v)}>Masterpieces</button>
                <button type="button" className={'arc-opt' + (formativeOnly ? ' arc-opt--on' : '')} onClick={() => setFormativeOnly(v => !v)}>Formative</button>
              </div>
            </div>

            <div className="arc-sheet-foot">
              {hasActiveFilters && <button type="button" className="arc-opt" onClick={clearFilters}>Clear all</button>}
              <button type="button" className="arc-opt arc-sheet-done" onClick={() => setFiltersOpen(false)}>
                Show {filtered.length}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

// Which way the active sort runs. Deliberately not a caret glyph from the
// font — at 9px those render at wildly different weights across platforms,
// and this sits inside a chip next to text that has to stay readable.
function SortArrow({ dir }) {
  return (
    <svg className="arc-arrow" width="9" height="11" viewBox="0 0 9 11" aria-hidden="true" focusable="false">
      <path
        d={dir === 'asc' ? 'M4.5 10.5V1M1 4.5L4.5 1L8 4.5' : 'M4.5 0.5V10M1 6.5L4.5 10L8 6.5'}
        fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

// Two-handle year range, built from two native range inputs stacked on one
// track. Native because it inherits keyboard support, the correct touch
// target sizing and screen-reader semantics for free — a div-and-pointer-
// events version of this gets all three wrong by default.
//
// The trick is that only the handles accept pointer input, not the inputs'
// full-width tracks; otherwise the one stacked on top would swallow every
// press aimed at the other. The visible track is a separate element beneath
// them, which is also what paints the selected span.
function YearRange({ bounds, value, onChange }) {
  const { min, max } = bounds;
  const [lo, hi] = value;
  const span = Math.max(max - min, 1);
  const pct = y => ((y - min) / span) * 100;

  return (
    <div className="yr">
      <div className="yr-track">
        <div className="yr-fill" style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }} />
      </div>
      {/* The handles can meet but not cross — clamping here rather than
          swapping them keeps "start" and "end" meaning the same thing all
          the way through a drag. */}
      <input
        type="range" className="yr-input" min={min} max={max} value={lo}
        aria-label="Earliest release year"
        onChange={e => onChange([Math.min(Number(e.target.value), hi), hi])}
      />
      <input
        type="range" className="yr-input" min={min} max={max} value={hi}
        aria-label="Latest release year"
        onChange={e => onChange([lo, Math.max(Number(e.target.value), lo)])}
      />
      <div className="yr-ends">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
