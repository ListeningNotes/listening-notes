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

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { parseRating } from '../../library/entry_formatter';
import AlbumTile from './AlbumTile';
import { handOffOrder } from '../../library/handoff';
import GridDensity, { DEFAULT_DENSITY, readStoredDensity, storeDensity } from './GridDensity';
import JournalFilters, { SORTS, SortArrow } from './JournalFilters';

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
// number as the sitewide mobile breakpoint in styles/base.css.
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

  // An artist named in a review links here with ?q=their name — the archive
  // filtered to one artist is the artist page this site doesn't otherwise
  // have. Read off window rather than through useSearchParams, which would
  // want a Suspense boundary and cost this page its prerender. Read through
  // useSyncExternalStore so the server renders no query and the browser
  // renders the real one without the two disagreeing — the same shape as
  // useJournalHost. Derived rather than synced: the field shows what the link
  // asked for until someone types over it, and `typed` staying null is what
  // "untouched" means.
  const linkedQuery = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get('q') || '',
    () => '',
  );
  const [typedSearch, setSearch] = useState(null);
  const search = typedSearch ?? linkedQuery;
  const [searchOpened, setSearchOpen] = useState(null);
  const searchOpen = searchOpened ?? Boolean(linkedQuery);
  const [sortBy, setSortBy] = useState('posted');
  const [sortDir, setSortDir] = useState('desc');
  const [genre, setGenre] = useState('');
  const [genresOpen, setGenresOpen] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [masterpiecesOnly, setMasterpiecesOnly] = useState(false);
  // Highlights had two of the three flags in it. The third was decided at the
  // same time as the other two and never given a way in here.
  const [formativeOnly, setFormativeOnly] = useState(false);
  // What the reader has set the handles to, or null for "every year" — which
  // is the full span once the entries have landed and nothing before that.
  const [yearPicked, setYearPicked] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Stable, because the sheet subscribes to scroll with it and would otherwise
  // re-subscribe on every render of the wall.
  const closeFilters = useCallback(() => setFiltersOpen(false), []);
  // Where the desktop popover hangs. Measured off the button rather than
  // guessed in CSS — its x depends on how wide the search field and the sort
  // select happen to be. Frozen at open time, which holds because the
  // popover closes on scroll (see the effect below).
  const filterBtnRef = useRef(null);

  // Which page of the wall. Reset by anything that changes what the wall holds
  // — landing on page four of a search that only has one page is a blank grid
  // and no explanation.
  const [page, setPage] = useState(0);
  // The remembered density comes out of localStorage, which the server does
  // not have; the default is what it renders and the browser corrects it on
  // hydration. Once the reader picks one, theirs wins for the rest of the
  // visit — null means they have not.
  const storedDensity = useSyncExternalStore(() => () => {}, readStoredDensity, () => DEFAULT_DENSITY);
  const [pickedDensity, setDensity] = useState(null);
  const density = pickedDensity ?? storedDensity;
  // Rendered on the server with no idea which it is; resolved on hydration,
  // which lands well before the entries fetch does, so nothing ever shows
  // the wrong behaviour to a real reader. The media query is the store and
  // its change event is the subscription.
  const isPhone = useSyncExternalStore(
    notify => {
      const mq = window.matchMedia(`(max-width: ${FLIP_BELOW}px)`);
      mq.addEventListener('change', notify);
      return () => mq.removeEventListener('change', notify);
    },
    () => window.matchMedia(`(max-width: ${FLIP_BELOW}px)`).matches,
    () => false,
  );

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

  // Derived rather than seeded: untouched handles sit on the full span, so a
  // reload of the list moves them only if nobody has, and a range somebody
  // set stays exactly where they put it.
  const yearRange = useMemo(
    () => yearPicked ?? (yearBounds ? [yearBounds.min, yearBounds.max] : null),
    [yearPicked, yearBounds],
  );

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
        return dir * (new Date(a.posted_at) - new Date(b.posted_at));
      });
  }, [entries, search, sortBy, sortDir, genre, favoritesOnly, masterpiecesOnly, formativeOnly, yearActive, yearRange]);

  // What is on the wall right now, in this order, left where the layer can
  // read it — so a swipe on an entry goes to the record beside it here, not
  // the next one in the database. See library/handoff.js.
  useEffect(() => { handOffOrder(filtered); }, [filtered]);

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
    setYearPicked(null);
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

  return (
    <>

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
        <JournalFilters
          onClose={closeFilters}
          isPhone={isPhone}
          scroller={scroller}
          anchorRef={filterBtnRef}
          sortBy={sortBy} sortDir={sortDir} chooseSort={chooseSort} activeSort={activeSort}
          genre={genre} setGenre={setGenre} genres={genres} genresShown={genresShown} genresRest={genresRest}
          genresOpen={genresOpen} setGenresOpen={setGenresOpen}
          yearBounds={yearBounds} yearRange={yearRange} setYearPicked={setYearPicked}
          favoritesOnly={favoritesOnly} setFavoritesOnly={setFavoritesOnly}
          masterpiecesOnly={masterpiecesOnly} setMasterpiecesOnly={setMasterpiecesOnly}
          formativeOnly={formativeOnly} setFormativeOnly={setFormativeOnly}
          hasActiveFilters={hasActiveFilters} clearFilters={clearFilters}
          shownCount={filtered.length}
        />
      )}
    </>
  );
}
