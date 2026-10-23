// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/Journal.js
// The wall of covers, and everything for finding one on it.
//
// This was the whole of app/archive/page.js. It is a component now because two
// places want it: home, under the beacon, and /archive
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

import { Fragment, memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowsDownUp, Moon, MoonStars, Sun, SunHorizon } from '@phosphor-icons/react';
import { parseHorizon, parseRating } from '../../library/entry_formatter';
import { COLOR_SIDE, colorOfArt, sizedAlbumArt } from '../../library/music_data_api';
import AlbumTile from './AlbumTile';
import StarRating from './StarRating';
import { handOffOrder } from '../../library/handoff';
import GridDensity, { DEFAULT_DENSITY, readStoredDensity, storeDensity } from './GridDensity';
import JournalFilters from './JournalFilters';
import { DELETE_ENTRY } from '../../hooks/useEntryEditor';
import { SAVED_EVENT } from '../../hooks/useListeningSession';

// ── A record coming off the wall ───────────────────────────────────────────
// Miyel, 2026-09-18: "I think it should do an animation to show it deletes.
// Like take you back to the journal and the post goes away, the others file to
// fill its spot."
//
// Three beats, and the order is the whole thing:
//
//   1. Wait. The entry was open as a sheet over this wall and it is still
//      sliding off. Closing the gap underneath it would be closing a gap
//      nobody can see — the same reason the falling cover waits for the layer
//      on the way in (LAYER_OUT_MS in HomeNav, the same 420).
//   2. The tile goes. It shrinks into itself and fades where it stands, so
//      the record is seen to leave rather than found to be missing.
//   3. The others file across, and this is the part that has to be measured
//      rather than described. A CSS grid reflows instantly and cannot be
//      transitioned, so left alone every tile after the gap simply appears in
//      its new place. So: measure where they all are, take the tile out, let
//      the grid reflow, then put every tile back where it just was with a
//      transform and let that transform go. They travel from the old position
//      to the new one on the site's own curve. It is the standard trick and it
//      is the only way this looks like anything.
const SHEET_OUT_MS = 420;   // the sheet getting out of the way
const TILE_OUT_MS  = 520;   // the tile shrinking where it stands
// The wall rearranging itself, whichever direction it is going: closing over a
// record that has gone, or making room for one that has arrived. One number,
// because they are one movement — Miyel, 2026-09-18: "match the file-in speed
// of deleting." Slowed from 420 with the rest of the cutaway, which means the
// delete slowed with it, which is the point of it being one number.
const FILE_MS      = 700;
// The views menu folding away; the length of .arc-views--leaving.
const VIEWS_OUT_MS = 160;

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

// Type used to be a filter here — Library or Submission. The archive is the
// library, so that split was a filter between "everything" and "everything",
// and the only half worth naming is already written on the entries that are
// submissions. Removed rather than hidden; nothing else read it.
// The year column is free text ("2019", occasionally with more around it).
const releaseYear = entry => {
  const m = String(entry.year || '').match(/\d{4}/);
  return m ? parseInt(m[0], 10) : null;
};

// ── Views, not sorting, 2026-10-22 ─────────────────────────────────────────
// Miyel's call, from the home brief: a filter takes records away and a view
// rearranges all of them, so the wall says what order it is in and that label
// is how you change it. The views replaced Sort, which was a field and a
// direction in the filter sheet; nothing leaves the wall when the view
// changes, so a view is never something to clear. A–Z is hers, added to the
// brief's list so a record can still be found by its name; so is By color,
// which the brief had parked (below, Read off the covers).
//
// Under a rule at the foot of the menu, the ones that are for fun rather than
// for finding (Miyel, 2026-10-22: "maybe Shuffle and color need to go under
// that line as fun things"): By time of day and By horizon joined them the same
// evening, from the list of what the journal already knows.
//
// A grouped view draws a heading over each band. Inside a band the records
// keep the wall's own order, newest arrival first — but for A–Z, which is
// alphabetical all the way down.
//
// Remembered per browser, the way the album size is: a visitor opens in the
// default and may rearrange for themselves, and nothing is written to anybody's
// journal.
export const VIEWS = [
  { value: 'order',   label: 'In order' },
  { value: 'az',      label: 'A–Z' },
  { value: 'month',   label: 'By month' },
  { value: 'era',     label: 'By era' },
  { value: 'genre',   label: 'By genre' },
  { value: 'rating',  label: 'By rating' },
  { value: 'time',    label: 'By time of day', fun: true },
  // Stored as 'shape', its first name, so a browser that remembered it still
  // opens on it; named By horizon, after the row of bars it is read from
  // (Miyel, 2026-10-22: "instead of by shape lets do by horizon").
  { value: 'shape',   label: 'By horizon',     fun: true },
  { value: 'color',   label: 'By color',       fun: true },
  { value: 'shuffle', label: 'Shuffle',        fun: true },
];
const VIEW_KEY = 'ln-wall-view';
const DEFAULT_VIEW = 'order';

function readStoredView() {
  try {
    const saved = window.localStorage.getItem(VIEW_KEY);
    return VIEWS.some(v => v.value === saved) ? saved : DEFAULT_VIEW;
  } catch {
    return DEFAULT_VIEW;
  }
}

function storeView(value) {
  try {
    window.localStorage.setItem(VIEW_KEY, value);
  } catch {
    /* storage refused — the view still changes, it just is not remembered */
  }
}

// By rating's headings are the stars themselves (Miyel, 2026-10-22: "don't do
// words but show stars"), the row an entry draws; these words are what a
// screen reader says for them.
const STARS = {
  5: 'Five stars', 4.5: 'Four and a half', 4: 'Four stars', 3.5: 'Three and a half',
  3: 'Three stars', 2.5: 'Two and a half', 2: 'Two stars', 1.5: 'One and a half',
  1: 'One star', 0.5: 'Half a star',
};

const arrived = album => new Date(album.first.posted_at).getTime();
const newestArrival = (a, b) => arrived(b) - arrived(a);
// The record's own score, its newest listen's, to the half star the stars are
// given in. An old row may say Masterpiece where a number goes. A record known
// only by its songs is placed by the stars its newest song was given — its
// face — rather than as not rated (Miyel, 2026-10-22: "tracks show as not
// rated"); a song note carries its track's stars.
const scoreOf = album => {
  const said = album.face.rating === 'Masterpiece' ? 5 : parseRating(album.face.rating);
  return Math.round(said * 2) / 2;
};

// Which band a record falls in under each grouped view: its key, the heading
// it is drawn under, and the band's place on the wall (lowest first). A record
// with nothing to place it by goes in a last band of its own.
const BANDS = {
  az: album => {
    const letter = foldForSearch(album.face.album).charAt(0).toUpperCase();
    return /[A-Z]/.test(letter)
      ? { key: letter, label: letter, rank: letter.charCodeAt(0) }
      : { key: '#', label: '#', rank: Infinity };
  },
  month: album => {
    const when = new Date(album.first.posted_at);
    const n = when.getFullYear() * 12 + when.getMonth();
    return { key: String(n), label: when.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), rank: -n };
  },
  era: album => {
    const year = releaseYear(album.face);
    if (year === null) return { key: 'none', label: 'No year', rank: Infinity };
    const decade = Math.floor(year / 10) * 10;
    return { key: String(decade), label: `${decade}s`, rank: -decade };
  },
  rating: album => {
    const score = scoreOf(album);
    return STARS[score]
      ? { key: String(score), label: STARS[score], stars: score, rank: -score }
      : { key: 'none', label: 'Not rated', rank: Infinity };
  },
  // The hour the record came into the journal, on this reader's clock, in the
  // order a day runs; inside a band, by the minute, so each reads as a clock.
  time: album => {
    const when = new Date(album.first.posted_at);
    const minute = when.getHours() * 60 + when.getMinutes();
    const part = DAY_PARTS.find(p => p.until > minute) || DAY_PARTS[DAY_PARTS.length - 1];
    return { key: part.label, label: part.label, glyph: part.glyph, rank: part.rank, at: (minute - 5 * 60 + 1440) % 1440 };
  },
  shape: album => {
    const kind = SHAPES[album.listens.length ? shapeOf(album.face.horizon) : 'song'];
    return { key: kind.key, label: kind.label, bars: kind.bars, rank: kind.rank };
  },
};

// ── By time of day, 2026-10-22 ─────────────────────────────────────────────
// When the record was logged, which is when it was listened to for every
// listen written here — but not for the records brought over from Tumblr,
// which all carry the minute they were brought over. The day starts at five
// in the morning, so late night is one band, nine at night round to five.
const DAY_PARTS = [
  { key: 'night-early', label: 'Late night', glyph: MoonStars, rank: 3, until: 5 * 60 },
  { key: 'morning',     label: 'Morning',    glyph: SunHorizon, rank: 0, until: 12 * 60 },
  { key: 'afternoon',   label: 'Afternoon',  glyph: Sun,        rank: 1, until: 17 * 60 },
  { key: 'evening',     label: 'Evening',    glyph: Moon,       rank: 2, until: 21 * 60 },
  { key: 'night',       label: 'Late night', glyph: MoonStars,  rank: 3, until: 24 * 60 },
];

// ── By horizon (first called By shape), 2026-10-22 ─────────────────────────
// The shape a record's track stars make, read off its horizon — the same row
// of bars an entry draws. Its first third, middle and last third compared:
// even when no two tracks are more than a star apart; otherwise best where
// it is highest by half a star or more; up and down when no third stands out.
// A record with fewer than three tracks starred has no shape to read. A record
// known only by its songs is a song, not a record without a shape, and has
// its band of its own, under one bar (Miyel, 2026-10-22: "songs are filed
// under no shape" — No horizon now). Each heading draws its shape as bars, the
// horizon's idea.
const SHAPES = {
  even:   { key: 'even',   label: 'Even all the way',   bars: [4, 4, 4, 4, 4], rank: 0 },
  first:  { key: 'first',  label: 'Best first',         bars: [5, 4, 3, 2, 1], rank: 1 },
  middle: { key: 'middle', label: 'Best in the middle', bars: [2, 3, 5, 3, 2], rank: 2 },
  last:   { key: 'last',   label: 'Best last',          bars: [1, 2, 3, 4, 5], rank: 3 },
  wild:   { key: 'wild',   label: 'Up and down',        bars: [3, 5, 1, 5, 2], rank: 4 },
  song:   { key: 'song',   label: 'Tracks',             bars: [4],             rank: 5 },
  none:   { key: 'none',   label: 'No horizon',         bars: null,            rank: Infinity },
};
const mean = list => list.reduce((sum, v) => sum + v, 0) / list.length;
function shapeOf(horizon) {
  const stars = parseHorizon(horizon).map(v => v * 5);
  if (stars.length < 3) return 'none';
  if (Math.max(...stars) - Math.min(...stars) <= 1) return 'even';
  const third = Math.ceil(stars.length / 3);
  const start = mean(stars.slice(0, third));
  const end = mean(stars.slice(-third));
  const middle = stars.length > 2 * third ? mean(stars.slice(third, -third)) : (start + end) / 2;
  const STANDS_OUT = 0.5;
  if (middle - Math.max(start, end) >= STANDS_OUT) return 'middle';
  if (start - end >= STANDS_OUT && start >= middle) return 'first';
  if (end - start >= STANDS_OUT && end >= middle) return 'last';
  return 'wild';
}

// ── Read off the covers, 2026-10-22 ────────────────────────────────────────
// By color, Miyel's ask: the wall as one gradient of hue, red round through
// orange, yellow, green and blue to violet, and then the covers with hardly
// any color, dark to light. It was seven named bands for an hour, and she
// found the names guessing — "the orange section, I only consider two of
// these orange" — so nothing is named now: a cover between orange and yellow
// simply sits between them.
//
// The brief parked it because it seemed to need a hue stored for every cover
// and a pass over every record. It needs neither: Apple's covers let a page
// read their pixels, so each one is read here, in the browser, from a 60px
// copy, the first time By color is asked for in a visit — nothing stored,
// nothing written. A cover kept somewhere else (Bandcamp, Discogs) refuses
// to be read by a page, and is read by this journal's server instead (below,
// askServerForColor); one that cannot be read at all goes with a record that
// has none, at the very end.
//
// A cover's color is the hue it has most of, each pixel counted by how vivid
// it is. Counting by the square of that, so a little bright color would win
// over a lot of skin and brown, was tried the same hour and moved a green
// cover with red figures on it in among the reds. Hues from 345 round to 15
// are one red, so the gradient starts at 345.
const fromRed = hue => (hue + 15) % 360;

// What has been read this visit, by the cover's address: { hue, light, plain },
// plain for a cover with hardly any color, or one that could not be read.
const coverColors = new Map();
const UNREAD = { hue: 0, light: 0, plain: true, unread: true };
// How light a plain cover has to be to open the wall as white rather than
// close it as gray. Set against the test copy: eight covers at 0.6 or more.
const WHITE_FROM = 0.6;

function readCoverColor(address) {
  return new Promise(resolve => {
    const art = new Image();
    art.crossOrigin = 'anonymous';
    art.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = COLOR_SIDE; canvas.height = COLOR_SIDE;
        const pen = canvas.getContext('2d', { willReadFrequently: true });
        pen.drawImage(art, 0, 0, COLOR_SIDE, COLOR_SIDE);
        resolve(colorOfArt(pen.getImageData(0, 0, COLOR_SIDE, COLOR_SIDE).data));
      } catch {
        resolve(null);
      }
    };
    art.onerror = () => resolve(null);
    art.src = sizedAlbumArt(address, 60);
  });
}

// A cover kept somewhere that will not let a page read it (Bandcamp, Discogs)
// is read by this journal's own server instead, which fetches the cover the
// entry has saved and reads it the same way (app/api/entries/[slug]/color).
// Asked only for those, and only once a visit. The address rides along so a
// corrected cover is a new question rather than yesterday's cached answer.
async function askServerForColor(slug, address) {
  try {
    const res = await fetch(`/api/entries/${encodeURIComponent(slug)}/color?v=${encodeURIComponent(address.slice(-24))}`);
    if (!res.ok) return null;
    const c = await res.json();
    return typeof c?.hue === 'number' ? c : null;
  } catch {
    return null;
  }
}

const colorKnown = album => !album.face.album_art || coverColors.has(album.face.album_art);
const colorOf = album => coverColors.get(album.face.album_art) || UNREAD;

// The same shuffle for as long as the reader stays on it, and a new one each
// time Shuffle is pressed: a wall that reshuffled on every render would move
// under a thumb.
const freshSeed = () => Math.floor(Math.random() * 2 ** 31);
function shuffled(albums, seed) {
  let a = seed >>> 0;
  const random = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...albums].sort((x, y) => (x.key < y.key ? -1 : 1));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// The wall in the view's order, each record with the band it is drawn under
// (null in a view without bands).
function arrange(albums, view, seed) {
  if (view === 'shuffle') return shuffled(albums, seed).map(album => ({ album, band: null }));
  // One gradient: white first, then the colored covers by hue from red, then
  // the plain ones from gray to black, and any that could not be read last
  // (Miyel, 2026-10-22: "have color start with white, into roy g biv then
  // grey to black"). No bands, so no names. Until every cover on the wall has
  // been read the wall stays as it is rather than rearranging once per cover.
  if (view === 'color') {
    if (!albums.every(colorKnown)) return [...albums].sort(newestArrival).map(album => ({ album, band: null }));
    const place = c => (c.unread ? 1000
      : c.plain ? (c.light >= WHITE_FROM ? -c.light : 360 + (1 - c.light) * 100)
      : fromRed(c.hue));
    return albums
      .map(album => ({ album, at: place(colorOf(album)) }))
      .sort((x, y) => x.at - y.at)
      .map(({ album }) => ({ album, band: null }));
  }
  // Genres in the order the filter sheet lists them: the most records first.
  let bandOf = BANDS[view];
  if (view === 'genre') {
    const counts = new Map();
    for (const album of albums) {
      const g = album.face.genre || '';
      counts.set(g, (counts.get(g) || 0) + 1);
    }
    const order = [...counts.keys()].filter(Boolean)
      .sort((x, y) => counts.get(y) - counts.get(x) || x.localeCompare(y));
    bandOf = album => {
      const g = album.face.genre || '';
      return g ? { key: g, label: g, rank: order.indexOf(g) } : { key: '', label: 'No genre', rank: Infinity };
    };
  }
  if (!bandOf) return [...albums].sort(newestArrival).map(album => ({ album, band: null }));
  const within = view === 'az'
    ? (x, y) => foldForSearch(x.album.face.album).localeCompare(foldForSearch(y.album.face.album))
    : view === 'time'
      ? (x, y) => x.band.at - y.band.at
      : (x, y) => newestArrival(x.album, y.album);
  return albums
    .map(album => ({ album, band: bandOf(album) }))
    // The last band's rank is Infinity, and Infinity less itself is not a
    // number, which reads as a tie and falls through to the order within.
    .sort((x, y) => (x.band.rank - y.band.rank) || within(x, y));
}

// ── One tile per record, 2026-09-24 ────────────────────────────────────────
// The wall never shows a separate tile for a track note, and the tile says
// what kind of thing is inside it (the track-notes brief): plain for a record
// with a listen, dog-eared for a record known only by its songs (the folder,
// fanned for more than one entry, went on 2026-10-13). So the wall draws
// records, not entries, gathered on album_key and the year — the key two
// journals already recognise one record by, with the year beside it since
// 2026-10-13, and the pair the listens are numbered on.
//
// Each record carries its listens and its notes newest first; `face`, the
// entry the tile draws and hands over, which is its newest listen, or its
// newest note when it has no listen yet; and `first`, the entry it came into
// the journal with, which is where it sits on the wall.
//
// ── And it stays there ────────────────────────────────────────────────────
// A second listen or a song marked on it does not move a record (Miyel's
// brief, the same day, reversing an afternoon of the opposite): the wall is a
// shelf, not a feed, and its worth is scrolling to the bottom and finding the
// first listen where you left it. Recency lives where recency belongs — the
// beacon's last logged, the recents under it, and friends' feeds, all of
// which treat the new entry as new.
//
// A record whose name is written wholly in a script the key folds away has
// an empty key, and two of those are not the same record — so an entry with
// no key is a record of its own.
function gatherAlbums(entries) {
  const byKey = new Map();
  for (const e of entries) {
    // The record's year beside its key, 2026-10-13: two records with one name
    // from different years are two tiles (DECISIONS, A record is its title,
    // its artist and its year). The same pair numbers the listens and fills
    // the tabs at the foot (database_actions.js, RECORD_YEAR).
    const key = e.album_key ? `${e.album_key}|${releaseYear(e) ?? ''}` : `entry:${e.slug}`;
    let album = byKey.get(key);
    if (!album) { album = { key, listens: [], notes: [], all: [] }; byKey.set(key, album); }
    album.all.push(e);
    (e.song ? album.notes : album.listens).push(e);
  }
  const newestFirst = (a, b) => new Date(b.posted_at) - new Date(a.posted_at);
  return [...byKey.values()].map(album => {
    album.all.sort(newestFirst);
    album.listens.sort(newestFirst);
    album.notes.sort(newestFirst);
    return { ...album, face: album.listens[0] || album.notes[0], first: album.all[album.all.length - 1] };
  });
}

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
function Journal({ entries: given, loading: givenLoading, scroller, foot = null }) {
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
  // The field is a magnifier until it is pressed (Miyel, 2026-10-22: "an icon
  // by the filter that then opens the search bar but not a constant field").
  // The field is always there, folded to nothing behind the magnifier, so it
  // can be focused inside the press itself — a phone only raises its keyboard
  // for a field focused by the finger, not for one drawn a moment later — and
  // so it can grow out of the magnifier and fold back into it.
  const searchField = useRef(null);
  const openSearch = () => {
    setSearchOpen(true);
    searchField.current?.focus();
  };
  // The ×: closing is clearing, or the wall would stay narrowed by words
  // nothing on the line shows any more.
  const closeSearch = () => {
    setSearch('');
    setSearchOpen(false);
  };

  // ?mark= — one of the three marks a record can carry, read the same way and
  // for the same reason as ?q= above: a link asks for a filter and the filter
  // holds until somebody changes it in the sheet, at which point what they
  // set wins. One parameter and not three, because the three are one question
  // — "which mark" — and a link that asked for two of them would be a link
  // nothing on this site can produce.
  //
  // The counts on the ID card are what send people here (2026-09-15): 4
  // masterpieces is a number you want to be able to press.
  const [genre, setGenre] = useState('');
  // Albums, tracks, or both: '' | 'albums' | 'tracks' (JournalFilters).
  const [kind, setKind] = useState('');
  const [genresOpen, setGenresOpen] = useState(false);
  const linkedMark = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get('mark') || '',
    () => '',
  );
  const [favoritesTyped, setFavoritesOnly] = useState(null);
  const favoritesOnly = favoritesTyped ?? (linkedMark === 'favorite');
  const [masterpiecesTyped, setMasterpiecesOnly] = useState(null);
  const masterpiecesOnly = masterpiecesTyped ?? (linkedMark === 'masterpiece');
  // Highlights had two of the three flags in it. The third was decided at the
  // same time as the other two and never given a way in here.
  const [formativeTyped, setFormativeOnly] = useState(null);
  const formativeOnly = formativeTyped ?? (linkedMark === 'formative');
  // A record somebody sent: the envelope the wall's tiles wear (Feed.js,
  // Marks) — a Submission, not a credit written in by hand.
  const [sentOnly, setSentOnly] = useState(false);
  // What the reader has set the handles to, or null for "every year" — which
  // is the full span once the entries have landed and nothing before that.
  const [yearPicked, setYearPicked] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Stable, because the sheet subscribes to scroll with it and would otherwise
  // re-subscribe on every render of the wall.
  // Folds away rather than vanishing, the way the views menu does: marked
  // leaving, then taken off once it has (VIEWS_OUT_MS, the same length).
  const [filtersLeaving, setFiltersLeaving] = useState(false);
  const closeFilters = useCallback(() => {
    setFiltersLeaving(true);
    clocks.current.push(setTimeout(() => { setFiltersOpen(false); setFiltersLeaving(false); }, VIEWS_OUT_MS));
  }, []);
  // Where the desktop popover hangs. Measured off the button rather than
  // guessed in CSS — its x depends on how wide the search field and the sort
  // select happen to be. Frozen at open time, which holds because the
  // popover closes on scroll (see the effect below).
  const filterBtnRef = useRef(null);

  // Which page of the wall. Reset by anything that changes what the wall holds
  // — landing on page four of a search that only has one page is a blank grid
  // and no explanation.
  const [page, setPage] = useState(0);
  // The view: remembered in this browser, read the way the density is below,
  // and the reader's pick wins for the rest of the visit. The shuffle's seed
  // is made when Shuffle is pressed, so a remembered Shuffle opens shuffled.
  const storedView = useSyncExternalStore(() => () => {}, readStoredView, () => DEFAULT_VIEW);
  const [pickedView, setView] = useState(null);
  const view = pickedView ?? storedView;
  const [seed, setSeed] = useState(freshSeed);
  const [viewsOpen, setViewsOpen] = useState(false);
  // The menu folds away rather than vanishing: marked leaving, and taken off
  // once it has (VIEWS_OUT_MS, the length of .arc-views--leaving).
  const [viewsLeaving, setViewsLeaving] = useState(false);
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

  // ── Records that have been taken down ──────────────────────────────────
  // Held here rather than asked back from the server, because the whole
  // animation happens between the delete landing and anybody refetching. The
  // grid is what needs to know, and this is the grid.
  //
  // `going` is the one on its way out and is still drawn — shrinking in place.
  // `gone` is every one that has finished leaving; a set rather than a single
  // slug because two records can be deleted in a session and the first must
  // not come back when the second goes.
  const [going, setGoing] = useState(null);
  const [gone, setGone] = useState(() => new Set());
  const grid = useRef(null);
  const clocks = useRef([]);
  useEffect(() => () => {
    clocks.current.forEach(id => { clearTimeout(id); cancelAnimationFrame(id); });
  }, []);

  // Where every tile is, right now, by slug.
  //
  // Offsets and not getBoundingClientRect, which is what this used until
  // 2026-09-18. A rect is measured from the viewport, so anything that scrolls
  // between the two measurements shows up as every tile having moved by the
  // scroll — and a save puts the pane on the wall between the record being
  // saved and the record arriving. Offsets do not care about a scroll. The
  // delete path was always within one frame and is unaffected either way.
  //
  // And from the grid's own corner, 2026-09-24. They were not, whatever this
  // note said: a tile's offsets are counted from the first positioned thing
  // above it, which on the cross is the whole cross (measured), so they
  // carried the height of everything over the wall — the beacon's floor among
  // it, which is still settling for most of a second after a listen is saved.
  // Two readings either side of that are the whole wall sliding by the
  // difference. The tiles and the grid are counted from the same thing, so
  // taking the grid's own offsets off leaves only where a tile is in the grid.
  //
  // By record, 2026-09-24: a tile is a record now, and the entry it draws can
  // change under it — a new listen becomes its face — while it is still the
  // same tile. Its key cannot.
  const positions = () => {
    const found = new Map();
    const box = grid.current;
    if (box) for (const tile of box.querySelectorAll('[data-tile-key]')) {
      found.set(tile.dataset.tileKey, { left: tile.offsetLeft - box.offsetLeft, top: tile.offsetTop - box.offsetTop });
    }
    return found;
  };

  // Beat three: the rest close over the space. Called with where everything
  // was before React took the tile out, immediately after it has.
  const closeTheGap = useCallback(was => {
    const box = grid.current;
    if (!box) return;
    const moved = [];
    for (const tile of box.querySelectorAll('[data-tile-key]')) {
      const then = was.get(tile.dataset.tileKey);
      if (!then) continue;
      // From the grid's corner, the way positions() took them.
      const dx = then.left - (tile.offsetLeft - box.offsetLeft);
      const dy = then.top - (tile.offsetTop - box.offsetTop);
      // A tile that has not moved is left entirely alone: everything before
      // the gap in the grid, which is most of the wall.
      if (!dx && !dy) continue;
      tile.style.transition = 'none';
      tile.style.transform = `translate(${dx}px, ${dy}px)`;
      moved.push(tile);
    }
    if (!moved.length) return;
    // One frame with them held in the old place, then let go. Without the
    // wait the browser coalesces both styles into one paint and nothing
    // moves — the transform is set and unset before anything is drawn.
    // On the next frame — or on a timer if no frame comes. A tab the browser
    // is not painting runs no rAF callback at all, and the cost here is not a
    // missing animation but a wall of tiles left holding a transform that
    // nothing will ever clear. The same pair guards the drafts grid.
    let gone = false;
    const release = () => {
      if (gone) return;
      gone = true;
      for (const tile of moved) {
        tile.style.transition = `transform ${FILE_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)`;
        tile.style.transform = '';
      }
      // And the inline styles come off once they have arrived, so nothing
      // here is still sitting on a tile the next time the grid reflows for
      // an ordinary reason — a filter, a sort, the density.
      clocks.current.push(setTimeout(() => {
        for (const tile of moved) { tile.style.transition = ''; tile.style.transform = ''; }
      }, FILE_MS + 40));
    };
    clocks.current.push(requestAnimationFrame(release));
    clocks.current.push(setTimeout(release, 120));
  }, []);

  useEffect(() => {
    const onDeleted = event => {
      const slug = event.detail?.slug;
      if (!slug || !entries.some(e => e.slug === slug)) return;

      // Nothing to watch, so nothing to wait for: the record is simply off
      // the wall. The same answer reduced motion gets everywhere else here.
      const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (still) { setGone(g => new Set(g).add(slug)); return; }

      clocks.current.push(setTimeout(() => {
        setGoing(slug);
        clocks.current.push(setTimeout(() => {
          const was = positions();
          setGoing(null);
          setGone(g => new Set(g).add(slug));
          // After React has drawn the wall without it.
          clocks.current.push(requestAnimationFrame(() => closeTheGap(was)));
        }, TILE_OUT_MS));
      }, SHEET_OUT_MS));
    };
    window.addEventListener(DELETE_ENTRY, onDeleted);
    return () => window.removeEventListener(DELETE_ENTRY, onDeleted);
  }, [entries, closeTheGap]);

  // ── And a record arriving ────────────────────────────────────────────────
  // The same three beats run backwards. A listen becomes an entry, the wall is
  // asked again, and the tile that was first is no longer first — so every
  // tile is measured before the new list lands, put back where it was, and let
  // go. What you watch is the wall making room.
  //
  // Miyel, 2026-09-18: "have the screen show the journal during the save
  // process and just show the album file into the grid." The screen is
  // HomeNav's half of it — since 2026-09-24 the sheet drops onto the wall and
  // you stay. This half is what there is to see when the record arrives.
  //
  // Keyed on the slug and not on a count, because the wall re-sorts, filters
  // and pages: "the list is one longer" is true of a page turn as well.
  const arriving = useRef(null);
  const wasRef = useRef(null);
  useEffect(() => {
    const onSaved = event => {
      const slug = event.detail?.slug;
      if (!slug) return;
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      arriving.current = slug;
      wasRef.current = null;
      // Measured while the wall is still the wall it was — the entries arrive
      // from a fetch a moment later — and only once the wall is on the page.
      // A listen saved from the picker is saved over a wall that is
      // display: none, because the picker is standing on its floor, and a
      // tile that is not laid out measures 0, 0. Every cover was written down
      // as sitting in the grid's top-left corner, and when the record landed
      // the whole wall sprang out of that corner rather than stepping over by
      // one (2026-09-24). The picker folds a frame or two after this, so the
      // wall is asked again until it is there — and never once the new list
      // has landed, which is what `arriving` going back to null says.
      const measure = tries => {
        if (arriving.current !== slug) return;
        if (grid.current?.getClientRects().length) { wasRef.current = positions(); return; }
        if (tries < 40) clocks.current.push(setTimeout(() => measure(tries + 1), 25));
      };
      measure(0);
    };
    window.addEventListener(SAVED_EVENT, onSaved);
    return () => window.removeEventListener(SAVED_EVENT, onSaved);
  });

  useLayoutEffect(() => {
    const slug = arriving.current;
    if (!slug || !entries.some(e => e.slug === slug)) return;
    arriving.current = null;
    const was = wasRef.current;
    wasRef.current = null;
    if (was) closeTheGap(was);
    // And the newcomer grows into the space the others have just left. The
    // class goes on by hand rather than through a render: React has already
    // drawn this tile and putting it in state would draw it a second time to
    // say something the stylesheet can say on its own.
    // Found by any entry it holds — and only a record new to the wall grows
    // in. A second listen or a song on a record already here lands on its
    // tile, which stays exactly where it was and simply gains its fan.
    const tile = grid.current?.querySelector(`[data-tile-slugs~="${CSS.escape(slug)}"]`);
    if (!tile || was?.has(tile.dataset.tileKey)) return;
    tile.classList.add('ft--landing');
    clocks.current.push(setTimeout(() => tile.classList.remove('ft--landing'), FILE_MS + 400));
  }, [entries, closeTheGap]);

  // Every record on the wall, before a filter is asked anything. Gathered
  // after the deleted are taken out, so a record that loses its last entry
  // goes with it and one that loses a listen simply changes its face.
  const albums = useMemo(() => gatherAlbums(entries.filter(e => !gone.has(e.slug))), [entries, gone]);

  const filtered = useMemo(() => {
    const q = foldForSearch(search);
    // The heart is anybody's, a song's included — Favorite applies to tracks
    // as well, so a record is a Favorite when any entry of it says so. The
    // two album flags are a listen's: a record is a Masterpiece or Formative
    // when an album listen of it says so, and a song marked Formative
    // (2026-09-30) does not bring its record under the filter. The card
    // counts Formative on album listens only and its window lists the same
    // rows (/api/public/stamps, About.js); the wall reads it the same way so
    // the three agree about what counts.
    const marked = (rows, test) => rows.some(test);
    return albums
      .filter(album => {
        const e = album.face;
        // Names only — the album and the artist, nothing else — and, since
        // 2026-09-24, the songs a record has notes on: somebody looking for
        // the song they marked finds the record it is behind.
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
          foldForSearch(e.artist).includes(q) ||
          album.notes.some(n => foldForSearch(n.song).includes(q))
        )) return false;
        if (kind === 'albums' && !album.listens.length) return false;
        if (kind === 'tracks' && !album.notes.length) return false;
        if (genre && (e.genre || '') !== genre) return false;
        if (favoritesOnly && !marked(album.all, x => x.favorite === true || x.favorite === 'true')) return false;
        if (masterpiecesOnly && !marked(album.listens, x => x.rating === 'Masterpiece' || x.masterpiece === true)) return false;
        // The flag, which is now the only place this is recorded — the nine
        // rows that said so under the old relationship column were migrated
        // onto it before that column was dropped.
        if (formativeOnly && !marked(album.listens, x => x.formative === true || x.formative === 'true')) return false;
        if (sentOnly && !marked(album.all, x => x.entry_type === 'Submission' && x.credit_by_hand !== true)) return false;
        if (yearActive) {
          const y = releaseYear(e);
          // An entry with no year can't be shown to fall inside a range, so
          // narrowing the years drops it rather than guessing on its behalf.
          if (y === null || y < yearRange[0] || y > yearRange[1]) return false;
        }
        return true;
      });
  }, [albums, search, kind, genre, favoritesOnly, masterpiecesOnly, formativeOnly, sentOnly, yearActive, yearRange]);

  // In the view's order, and with each record's band. In order is by the day
  // a record came into the journal, which never changes: the wall never
  // reorders under anybody who has not asked it to.
  // By color reads the covers it has not seen this visit, all at once, and
  // the wall arranges itself when the last has answered. `colorsRead` is
  // only there to say that something new is known.
  const [colorsRead, setColorsRead] = useState(0);
  useEffect(() => {
    if (view !== 'color') return undefined;
    const unread = new Map();
    for (const a of filtered) if (!colorKnown(a) && !unread.has(a.face.album_art)) unread.set(a.face.album_art, a.face.slug);
    if (!unread.size) return undefined;
    let here = true;
    Promise.all([...unread].map(([address, slug]) => readCoverColor(address)
      .then(c => c || askServerForColor(slug, address))
      .then(c => coverColors.set(address, c || UNREAD))))
      .then(() => {
        if (!here) return;
        glideFrom.current = positions();
        setColorsRead(n => n + 1);
      });
    return () => { here = false; };
  }, [view, filtered]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- colorsRead says the covers' colors (a module map) have changed
  const arranged = useMemo(() => arrange(filtered, view, seed), [filtered, view, seed, colorsRead]);
  // How many records each band holds, all of it and not just this page's
  // share, for the number at the end of its heading (Miyel, 2026-10-22: "I
  // want to know how many late night"). A count on a group of records, the
  // way the card counts them — never one beside a person.
  const bandSizes = useMemo(() => {
    const sizes = new Map();
    for (const { band } of arranged) if (band) sizes.set(band.key, (sizes.get(band.key) || 0) + 1);
    return sizes;
  }, [arranged]);
  const bandCount = band => {
    const n = bandSizes.get(band.key) || 0;
    const noun = band.key === 'song' ? 'track' : 'album';
    return <span className="arc-band-count">{n === 1 ? `1 ${noun}` : `${n} ${noun}s`}</span>;
  };

  // What is on the wall right now, in this order, left where the layer can
  // read it — so a swipe on an entry goes to the record beside it here, not
  // the next one in the database. See library/handoff.js.
  // The wall as one long run of pages (Miyel, 2026-09-25): every record's
  // entries in a row, oldest first — a folder flips through itself — and
  // then the next record's. So a swipe on an entry opened from here moves
  // through its folder and carries on to the record beside it.
  useEffect(() => { handOffOrder(arranged.flatMap(({ album }) => [...album.all].reverse())); }, [arranged]);

  const pages = Math.max(1, Math.ceil(arranged.length / PER_PAGE));
  // Clamped rather than reset in an effect: if the filters shrink the results
  // under your feet, the page you are on may no longer exist, and the honest
  // answer is the last one that does.
  const current = Math.min(page, pages - 1);
  const shown = pages > 1 ? arranged.slice(current * PER_PAGE, (current + 1) * PER_PAGE) : arranged;

  const activeView = VIEWS.find(v => v.value === view) ?? VIEWS[0];

  // A new view starts at its beginning: page four of one order is nothing in
  // particular of another. Shuffle pressed again is a new shuffle.
  function chooseView(value) {
    glideFrom.current = positions();
    if (value === 'shuffle') setSeed(freshSeed());
    setView(value);
    storeView(value);
    setPage(0);
    closeViews();
  }

  // ── Room under the line, 2026-10-22 ────────────────────────────────────
  // With the page at its top the line sits low on the screen, and a panel
  // dropped from it ran off the foot (Miyel: "the screen should scroll down to
  // see the contents of opened fields"). So as a panel opens the page slides
  // up by what it is short of — never past the point where the line sticks,
  // which is as high as the line goes — and the panel rides up with the line:
  // the views hang from it, and the filters follow it on every step
  // (JournalFilters).
  //
  // Measured once each is drawn, before it is painted: the views menu's own
  // height, and the filters' whole content (scrollHeight), since they are
  // already held to what is left of the screen and would measure short.
  const lineWrap = useRef(null);
  useLayoutEffect(() => {
    if (!viewsOpen) return;
    const menu = lineWrap.current?.querySelector('.arc-views');
    if (menu) makeRoom(menu.offsetHeight);
  // Once per opening: the menu leaving is not an opening.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewsOpen]);
  useLayoutEffect(() => {
    if (!filtersOpen) return;
    const sheet = document.querySelector('.arc-sheet');
    // Its content and its own border, which scrollHeight leaves out.
    if (sheet) makeRoom(sheet.scrollHeight + sheet.offsetHeight - sheet.clientHeight);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersOpen]);
  function makeRoom(tall) {
    const wrap = lineWrap.current;
    const port = scroller?.current || document.scrollingElement;
    if (!wrap || !port) return;
    const box = wrap.getBoundingClientRect();
    const stuckAt = parseFloat(getComputedStyle(wrap).top) || 0;
    const floor = window.innerHeight - (isPhone ? 80 : 16);
    const short = Math.min(box.bottom + 6 + tall - floor, box.top - stuckAt);
    if (short <= 1) return;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    port.scrollBy({ top: short, behavior: still ? 'auto' : 'smooth' });
  }

  function closeViews() {
    setViewsLeaving(true);
    clocks.current.push(setTimeout(() => { setViewsOpen(false); setViewsLeaving(false); }, VIEWS_OUT_MS));
  }

  useEffect(() => {
    if (!viewsOpen) return undefined;
    const onKey = e => {
      if (e.key !== 'Escape') return;
      setViewsLeaving(true);
      clocks.current.push(setTimeout(() => { setViewsOpen(false); setViewsLeaving(false); }, VIEWS_OUT_MS));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewsOpen]);

  // ── The wall rearranging itself, 2026-10-22 ─────────────────────────────
  // A new view moves the covers rather than redrawing them (Miyel: "more
  // fluid, also everything fluid"): where every tile was is written down
  // before the view changes, and once the new order is drawn — before it is
  // painted — each one is put back where it was and let go, on the same
  // curve and the same length the wall closes a gap with. A cover that was
  // not on the wall before fades in where it lands. By color moves twice:
  // when it is chosen, which leaves the wall as it is, and when the last
  // cover has been read.
  const glideFrom = useRef(null);
  useLayoutEffect(() => {
    const was = glideFrom.current;
    glideFrom.current = null;
    if (!was || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    closeTheGap(was);
    const box = grid.current;
    if (!box) return;
    const fresh = [...box.querySelectorAll('[data-tile-key]')].filter(tile => !was.has(tile.dataset.tileKey));
    for (const tile of fresh) { tile.style.transition = 'none'; tile.style.opacity = '0'; }
    const show = () => {
      for (const tile of fresh) { tile.style.transition = `opacity ${FILE_MS}ms ease`; tile.style.opacity = ''; }
      clocks.current.push(setTimeout(() => { for (const tile of fresh) tile.style.transition = ''; }, FILE_MS + 40));
    };
    clocks.current.push(requestAnimationFrame(show));
    clocks.current.push(setTimeout(show, 120));
  }, [arranged, closeTheGap]);

  // Turning a page leaves the scroll where it is. It went to the top, from
  // when the wall was the whole page; under the beacon the top is the
  // beacon, and every press threw you a floor past the covers (2026-10-20).
  // A page is fifty tiles, so the next one lays out exactly where this one
  // was. A shorter last page is clamped by the browser, and the wall's floor
  // is a screen tall at least, so the clamp lands on covers and never on the
  // beacon above them.
  function toPage(next) {
    setPage(next);
  }

  function clearFilters() {
    setPage(0);
    setSearch(''); setKind(''); setGenre(''); setGenresOpen(false);
    setFavoritesOnly(false); setMasterpiecesOnly(false); setFormativeOnly(false); setSentOnly(false);
    setYearPicked(null);
  }

  // Whether the Filters button is underlined: something behind it is doing
  // the narrowing. Only what is tucked away counts — the search box is in
  // plain sight — and never the view, which takes nothing away. It was a
  // number in a filled badge until 2026-10-22 (the wall's filters brief): the
  // underline already says something is on, and the badge was the shape that
  // change took out.
  const narrowed = Boolean(kind) || Boolean(genre) || favoritesOnly || masterpiecesOnly || formativeOnly || sentOnly || yearActive;
  const hasActiveFilters = Boolean(search) || narrowed;

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
          <div className="arc-grid" data-density={density} ref={grid}>
            {shown.map(({ album, band }, i) => (
              <Fragment key={album.key}>
                {/* A band's heading over its first record, and again at the
                    top of a page that opens part way through one. Inside the
                    grid, across every column, so the tiles keep one grid to
                    file across when a record comes or goes. */}
                {band && (i === 0 || shown[i - 1].band.key !== band.key) && (
                  band.stars ? (
                    <h3 className="arc-band">
                      <StarRating rating={band.stars} size={11} />
                      <span className="arc-band-said">{band.label}</span>
                      {bandCount(band)}
                    </h3>
                  ) : band.glyph ? (
                    <h3 className="arc-band">
                      <band.glyph size={13} weight="regular" aria-hidden="true" />
                      {band.label}
                      {bandCount(band)}
                    </h3>
                  ) : band.bars ? (
                    <h3 className="arc-band">
                      <ShapeBars bars={band.bars} />
                      {band.label}
                      {bandCount(band)}
                    </h3>
                  ) : <h3 className="arc-band">{band.label}{bandCount(band)}</h3>
                )}
                <AlbumTile
                  album={album}
                  density={density}
                  /* Only a record with nothing else behind it leaves the wall;
                     deleting one listen of three changes the tile, not the
                     wall. */
                  going={album.all.length === 1 && going === album.face.slug}
                />
              </Fragment>
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
      <div className="arc-bar-wrap" ref={lineWrap}>
        {/* Catches the press that closes the views, and nothing else: it is
            clear, and before the bar so the bar stays above it. */}
        {viewsOpen && <div className="arc-views-scrim" onClick={closeViews} />}
        <div className={'arc-bar' + (searchOpen ? ' arc-bar--searching' : '')}>
          {/* The order the wall is in, which is also how to change it — the
              thing that tells you where you are is the thing that moves you.
              It drops from the line, on a phone too: the floor is the Listen
              bar's.

              Arrows, and the view's name beside them once the wall is in any
              order but its own (Miyel, 2026-10-22): In order needs no saying,
              so the line is three quiet glyphs most of the time, and a wall a
              visitor finds By color or shuffled still says so. */}
          <span className="arc-view">
            <button
              type="button"
              className="arc-ctl arc-view-now"
              onClick={() => {
                if (viewsOpen) { closeViews(); return; }
                setViewsOpen(true);
              }}
              aria-expanded={viewsOpen && !viewsLeaving}
              aria-haspopup="menu"
              aria-label={`The wall is ${activeView.label.toLowerCase()}. Change the view`}
            >
              <ArrowsDownUp size={16} weight="regular" aria-hidden="true" />
              {view !== DEFAULT_VIEW && <span>{activeView.label}</span>}
            </button>
            {viewsOpen && (
              <span className={'arc-views' + (viewsLeaving ? ' arc-views--leaving' : '')} role="menu" aria-label="Views">
                {VIEWS.map(v => (
                  <Fragment key={v.value}>
                    {v === VIEWS.find(w => w.fun) && <span className="arc-views-rule" aria-hidden="true" />}
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={v.value === view}
                      className={'ln-word arc-views-word' + (v.value === view ? ' ln-word--on' : '')}
                      onClick={() => chooseView(v.value)}
                    >
                      {v.label}
                    </button>
                  </Fragment>
                ))}
                {/* How big the covers are, under a last hairline: how the wall
                    is shown, as the order is. The menu stays open for it, so
                    the sizes can be tried one after another. */}
                <span className="arc-views-rule" aria-hidden="true" />
                <GridDensity value={density} onChange={changeDensity} />
              </span>
            )}
          </span>
          {/* One thing that is a magnifier and a search: pressed, the field
              grows out to the left and the magnifier draws itself into the ×
              at its end — the handle running on to become one stroke of it,
              the lens closing, the other stroke drawn across — and the × does
              all of it backwards. Nouns only in the field: the magnifier was
              the verb. It still searches the writing too; the full answer
              stays on the aria-label, where it is read out.

              It folds back when it is left empty, on the ×, and on Escape,
              and the × clears it, or the wall would stay narrowed by words
              nothing on the line shows. With words in it and the focus
              elsewhere, it stays open, saying what is narrowing the wall. */}
          <span className={'arc-seek' + (searchOpen ? ' arc-seek--open' : '')}>
            <input
              ref={searchField}
              className="arc-seek-field"
              tabIndex={searchOpen ? 0 : -1}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => { if (!search) setSearchOpen(false); }}
              onKeyDown={e => { if (e.key === 'Escape') closeSearch(); }}
              placeholder="Albums or artists"
              aria-label="Search albums, artists and notes"
            />
            {/* Held on the press while open, so the field keeps the focus: an
                empty field left to blur first would fold before the press
                landed, and the press would open it again. */}
            <button
              type="button"
              className="arc-seek-mark"
              onPointerDown={e => { if (searchOpen) e.preventDefault(); }}
              onClick={searchOpen ? closeSearch : openSearch}
              aria-label={searchOpen ? 'Close the search' : 'Search albums, artists and notes'}
              aria-expanded={searchOpen}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle className="arc-seek-lens" cx="10" cy="10" r="6" />
                <line className="arc-seek-one" x1="19" y1="19" x2="5" y2="5" pathLength="20" />
                <line className="arc-seek-two" x1="19" y1="5" x2="5" y2="19" pathLength="20" />
              </svg>
            </button>
          </span>

          <button
            type="button"
            ref={filterBtnRef}
            className={'arc-ctl' + (narrowed ? ' arc-ctl--on' : '')}
            onClick={() => {
              if (filtersOpen) { closeFilters(); return; }
              setFiltersOpen(true);
            }}
            aria-label="Filters"
            aria-expanded={filtersOpen && !filtersLeaving}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="7" x2="21" y2="7" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="17" x2="21" y2="17" />
              <circle cx="9" cy="7" r="2.2" fill="var(--panel-solid)" /><circle cx="16" cy="12" r="2.2" fill="var(--panel-solid)" /><circle cx="7" cy="17" r="2.2" fill="var(--panel-solid)" />
            </svg>
            <span className="arc-ctl-text">Filters</span>
          </button>


          {/* Keyed off whether anything is actually hidden, not off whether a
              control is non-default — re-sorting changes no totals, and
              "34 of 34" reads like a filter that didn't work. */}
          <span className="arc-count">
            {filtered.length === albums.length
              ? `${albums.length} albums`
              : `${filtered.length} of ${albums.length}`}
          </span>
        </div>
      </div>

      {filtersOpen && (
        <JournalFilters
          onClose={closeFilters}
          isPhone={isPhone}
          scroller={scroller}
          anchorRef={filterBtnRef}
          kind={kind} setKind={setKind}
          genre={genre} setGenre={setGenre} genres={genres} genresShown={genresShown} genresRest={genresRest}
          genresOpen={genresOpen} setGenresOpen={setGenresOpen}
          yearBounds={yearBounds} yearRange={yearRange} setYearPicked={setYearPicked}
          favoritesOnly={favoritesOnly} setFavoritesOnly={setFavoritesOnly}
          masterpiecesOnly={masterpiecesOnly} setMasterpiecesOnly={setMasterpiecesOnly}
          formativeOnly={formativeOnly} setFormativeOnly={setFormativeOnly}
          sentOnly={sentOnly} setSentOnly={setSentOnly}
          hasActiveFilters={hasActiveFilters} clearFilters={clearFilters}
          shownCount={filtered.length}
          leaving={filtersLeaving}
        />
      )}
    </>
  );
}

// A shape's heading: five bars, the horizon's own idea, standing on one line.
function ShapeBars({ bars }) {
  return (
    <svg className="arc-band-bars" width={bars.length * 4 - 1} height="11" viewBox={`0 0 ${bars.length * 4 - 1} 11`} aria-hidden="true" focusable="false">
      {bars.map((h, i) => (
        <rect key={i} x={i * 4} y={11 - h * 2.2} width="3" height={h * 2.2} rx="0.6" fill="currentColor" />
      ))}
    </svg>
  );
}

// ── Why this is memoised, 2026-09-16 ───────────────────────────────────────
// The cross subscribes to the beacon, for the dot on its mark, so every change
// the beacon publishes re-renders HomeNav — and this wall is inside it. That
// cost nothing while the beacon was Last.fm's, which changes when a record
// changes. It costs something now that the beacon follows the listen being
// written: turning to the next track is a beacon change, and a listen opens as
// a layer *over* the cross rather than in place of it, so every track turn was
// reconciling forty covers on a wall nobody was looking at.
//
// The props are stable by construction — `entries` is state that changes when
// the journal is refetched, `scroller` is a ref object made once — so this
// holds rather than being a comparison paid on every render for nothing.
// Context is unaffected: a memoised component still re-renders when a context
// it reads changes, which is what keeps the theme and the bookplate honest.
export default memo(Journal);
