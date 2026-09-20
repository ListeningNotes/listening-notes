// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/Feed.js
// The desk's second floor: what the people in the address book logged.
//
// Entries, not people. Each row is a record somebody in the book wrote up —
// a small face and a name on an entry-shaped row — read straight off their
// journal's public feed from this browser, the way the page about a person
// reads one.
// Nothing central, nobody learns they were read, and nothing here is stored:
// the book says whose feeds to ask and the feeds say the rest.
//
// One feed, from 2026-09-19 (the friends brief). There were two views in a
// tab row — Recent and Submissions — and they are not two kinds of thing you
// choose between, they are a list and a subset of it. So the feed is everyone
// in the book, newest first and capped: a shelf rather than a river.
//
// The subset had a word in the corner for an hour — *Came back*, off her own
// mock-up — and it went the same evening (Miyel: "remove came back and just
// center feed"). A filter nobody asked for is a control to read past on every
// visit, and what came back from a send is on its way to the inbox as an
// arrival, which is where something that happened belongs. See brief 1's
// third item.
//
// The match that found them is still here and still unused, deliberately:
// the brief's instruction for that third item is to reuse it rather than
// write a second one. No counts, no badges, no unread state — the dot on an
// inbox row is the only new-state this site has.
//
// A row offers Compare only when it is a record you also have: this album,
// their rating against yours and the shape of the two listens, track by
// track. Compare arrives because something happened, not as a place you go.
// The whole-journal compare is the page about a person, which a face or a
// name opens (app/dashboard/people/[id]/page.js).
//
// A row opens their entry in a new window, which on a home screen is a sheet
// inside the app (DECISIONS, The model). Their writing stays on their
// journal: the feed carries none of it, and that is the reason to visit.
//
// Each row is the record, large and centred, with the words under it — the
// shape an entry's first screen has, one after another down the floor — and
// not a cover-thumbnail-and-title list. A list is a table of what exists; a
// feed is records going past. No box around it: the pieces under the art
// are simply large, because the feed holds little and can afford to be
// (Miyel, 2026-09-13). The Compare panel opens under the item.
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Envelope, Fingerprint, Heart, Rows, Shuffle, SketchLogo, SquaresFour, User } from '@phosphor-icons/react';
import { useBookplate } from './Bookplate';
import StarRating from './StarRating';
import { parseHorizon } from '../../library/entry_formatter';
import { carrySender, journalUrl, tidyJournal } from '../../library/return_address';

// How much of a river a shelf may hold. Recent from everyone in the book
// could be endless; forty is a look, not a scroll. Submissions is bounded
// by what came back and the cap is a backstop.
const RECENT_MOST = 40;
const SUBMISSIONS_MOST = 30;
// How long one journal gets to answer before its rows are simply absent.
const EACH_MS = 8000;
// How long a comparison takes to put itself away. One movement, not two: the
// door comes down over a horizon that does not move (Miyel, 2026-09-20). A
// frame or two more than the fold itself, so the panel is not taken out of
// the page on the same tick it finishes.
const SHUT_MS = 340;

// ── Two densities ─────────────────────────────────────────────────────────
// The feed one record a screen, or six rows of one. Her brief, 2026-09-20:
// "one toggle, two states, nothing in between." No menu and no settings page
// — the control is a glyph in the feed's own header and the glyph is the
// shape it makes, which is the rule the archive's density control already
// keeps (GridDensity.js).
//
// Remembered between visits, for the reason that one does: a density you
// chose is a preference, and re-picking it every time you open the page is
// the page forgetting something you told it.
//
// NAME: `rows` and `full` are placeholders for Miyel.
const DENSITIES = ['full', 'rows'];
const DEFAULT_DENSITY = 'full';
const DENSITY_KEY = 'ln-feed-density';

function readStoredDensity() {
  if (typeof window === 'undefined') return DEFAULT_DENSITY;
  try {
    const saved = window.localStorage.getItem(DENSITY_KEY);
    return DENSITIES.includes(saved) ? saved : DEFAULT_DENSITY;
  } catch {
    return DEFAULT_DENSITY;
  }
}

function storeDensity(value) {
  try { window.localStorage.setItem(DENSITY_KEY, value); } catch { /* private window */ }
}

// ── The mark is where pressing takes you ─────────────────────────────────
// Phosphor's own, like every other mark on this site (Miyel, 2026-09-20: "we
// need to use phosphor icons, this looks different"). Two were drawn by hand
// here for a day — a frame with two bars in it, a frame with one square — and
// neither read as the thing it stood for, which is the whole job of a glyph
// standing alone in a corner with no word beside it.
//
// It shows the view you are *in*, not the one pressing would get you. Miyel
// picked the other way round and turned it back the same hour — "you had it
// right, switch the glyph to match the view you're on" — and seeing both is
// the only way that question ever gets settled. It is the reading the rest of
// this site keeps: the archive's density control lights the grid it is
// drawing, and the band at the foot lights the pane you are on. A mark that
// shows you somewhere you are not is a fine convention and a bad second one.
//
// The label is the other sentence, and says what pressing does.
export function DensityToggle({ density, onFlip }) {
  const asRows = density === 'rows';
  return (
    <button
      type="button"
      className="fd-dense"
      onClick={onFlip}
      aria-label={asRows ? 'Show one record at a time' : 'Show the feed as rows'}
      title={asRows ? 'One record at a time' : 'Rows'}
    >
      {asRows
        ? <Rows size={18} weight="regular" aria-hidden="true" />
        : <SquaresFour size={18} weight="regular" aria-hidden="true" />}
    </button>
  );
}

// ── Who holds the density ─────────────────────────────────────────────────
// The control lives in the header at the top of the screen and the list it
// changes lives in the feed, and those are two different components — so
// neither of them can own this. Whoever draws the header owns it and hands
// the feed the answer: HomeNav on the cross, FeedPage at the feed's own
// address.
//
// Read after mount rather than during the first render: the server has no
// localStorage, and a value taken from it here would be the two of them
// disagreeing about what the page says.
//
// NAME: `useFeedDensity` is a placeholder for Miyel.
export function useFeedDensity() {
  const [density, setDensity] = useState(DEFAULT_DENSITY);
  useEffect(() => { setDensity(readStoredDensity()); }, []);
  const flip = () => {
    const next = density === 'rows' ? 'full' : 'rows';
    setDensity(next);
    storeDensity(next);
  };
  return { density, flip };
}

// ── The short form, for rows ──────────────────────────────────────────────
// `6h` where the tall version says `6h ago`. A row gives its meta line about
// 140px between the art and the stars, and "ago" is 26 of them said three
// times over — the artist and the name are the part that cannot be guessed,
// and they are what the ellipsis was eating. Her own mock-up writes the short
// form in rows and the long one under a record, which is the right split:
// under a record the line is a sentence, and in a row it is a label.
function briefly(when) {
  const long = timeAgo(when);
  if (long === 'just now') return 'now';
  if (long === 'yesterday') return 'Yesterday';
  return long.replace(' ago', '');
}

function timeAgo(when) {
  const t = new Date(when).getTime();
  if (!t) return '';
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 60) return m <= 1 ? 'just now' : `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return d === 1 ? 'yesterday' : `${d}d ago`;
  const w = Math.round(d / 7);
  if (w < 8) return `${w}w ago`;
  return new Date(when).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

// The marks an entry wears, beside its stars, as marks and not words — the
// strip at the head of an entry draws the three flags this way (MiniCard),
// and a row is a glance (Miyel, 2026-09-13: the icon, not the tag's name).
// Sent gets an envelope in faint ink, the inbox's own mark.
function Marks({ entry, size = 12 }) {
  const fav = entry.favorite === true || entry.favorite === 'true';
  const mp = entry.masterpiece === true || entry.masterpiece === 'true';
  const formative = entry.formative === true || entry.formative === 'true';
  const sent = entry.entry_type === 'Submission';
  if (!fav && !mp && !formative && !sent) return null;
  return (
    <span className="ln-mini-flags fd-marks">
      {sent && (
        <span className="ln-mini-flag" style={{ color: 'var(--ink-faint)' }} role="img" aria-label="Submission" title="Submission">
          <Envelope size={size} weight="regular" />
        </span>
      )}
      {fav && (
        <span className="ln-mini-flag" style={{ color: 'var(--fav, #f0484f)' }} role="img" aria-label="Favorite" title="Favorite">
          <Heart size={size} weight="fill" />
        </span>
      )}
      {mp && (
        <span className="ln-mini-flag" style={{ color: 'var(--mp, #4a9bf0)' }} role="img" aria-label="Masterpiece" title="Masterpiece">
          <SketchLogo size={size} weight="fill" />
        </span>
      )}
      {formative && (
        <span className="ln-mini-flag" style={{ color: 'var(--formative, #3fa96b)' }} role="img" aria-label="Formative" title="Formative">
          <Fingerprint size={size} weight="bold" />
        </span>
      )}
    </span>
  );
}

// Their journal's own portrait, read straight off it; the plain mark when
// there is none.
function Face({ address }) {
  return (
    <span className="fd-face" aria-hidden="true">
      <User size={18} weight="regular" />
      <img src={`${journalUrl(address)}/api/portrait`} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} />
    </span>
  );
}

// ── The compare, opened ────────────────────────────────────────────────────
// One album and two listens of it, stacked: theirs above, yours below, and
// how far apart the two verdicts are written on the line between them. From
// Miyel's reference, 2026-09-20.
//
// **Theirs carries no stars of its own.** They are already on the entry four
// lines up — this panel opens underneath them — and printing them again would
// be the same fact twice on one screen. Yours are under your own horizon,
// which is the only place they appear at all.
//
// **The two horizons are not mirrored.** A pair of charts growing away from a
// shared line is a difference chart, and this is not one: these are two
// listens of the same record, each with its own shape, and the honest drawing
// of that is one above the other with the same baseline logic. Miyel: "don't
// mirror beacons they should be one above the other."
//
// The track notes are writing and the feed carries none, so they stay where
// they are and the foot of the panel points at both entries.
// A '1' per hearted track, in track order, from the lists — see HEARTS_FIELD
// in database_actions. A copy that has not been updated sends nothing, which
// reads here as no hearts rather than as an error.
const heartsOf = entry => String(entry?.hearts || '');

function Compared({ mine, theirs, name, closing = false }) {
  const yours = parseHorizon(mine.horizon);
  const hers = parseHorizon(theirs.horizon);
  const yourHearts = heartsOf(mine);
  const theirHearts = heartsOf(theirs);
  const x = Number(mine.rating_value), y = Number(theirs.rating_value);
  const apart = Number.isFinite(x) && Number.isFinite(y)
    && mine.rating_value !== null && theirs.rating_value !== null
    ? Math.abs(x - y)
    : null;
  const rated = mine.rating_value !== null && mine.rating_value !== undefined && mine.rating_value !== '';

  return (
    <div className={'fd-cmp' + (closing ? ' fd-cmp--shutting' : '')}>
      {hers.length > 0 && (
        <div className="fd-cmp-bars fd-cmp-bars--theirs" aria-label={`How ${name} heard it, track by track`}>
          {hers.map((v, i) => (
            <span key={i} className={theirHearts[i] === '1' ? 'fd-cmp-bar fd-cmp-bar--loved' : 'fd-cmp-bar'} style={{ '--tall': `${Math.max(9, v * 100)}%` }}>
              {theirHearts[i] === '1' && <Heart size={11} weight="fill" aria-hidden="true" />}
            </span>
          ))}
        </div>
      )}

      {/* The one number, on the line between the two listens. A rule with a
          word sitting on it, which is the shape the beacon's slot already
          uses — see .hn-pane--home's hairline and its note. */}
      <p className="fd-apart">
        <span>
          {apart === null ? 'Not both rated' : apart === 0 ? 'The same' : `${apart.toFixed(1)} apart`}
        </span>
      </p>

      {yours.length > 0 && (
        <div className="fd-cmp-bars fd-cmp-bars--yours" aria-label="How you heard it, track by track">
          {yours.map((v, i) => (
            <span key={i} className={yourHearts[i] === '1' ? 'fd-cmp-bar fd-cmp-bar--loved' : 'fd-cmp-bar'} style={{ '--tall': `${Math.max(9, v * 100)}%` }}>
              {yourHearts[i] === '1' && <Heart size={11} weight="fill" aria-hidden="true" />}
            </span>
          ))}
        </div>
      )}

      {/* Yours, and only yours. Theirs are on the entry above this. */}
      {rated && (
        <div className="fd-cmp-stars">
          <StarRating rating={Number(mine.rating_value)} size={17} />
        </div>
      )}

      {/* Nothing under the stars. Theirs was linked from the cover above and
          came off first; *Your copy* followed on 2026-09-20 — "it's
          understandable without". The lower horizon is yours because the
          stars under it are yours, and a label naming the thing you are
          looking at is a caption on a photograph of your own house. Your
          entry is on your own wall, one pane away, where it has always been.
      */}
    </div>
  );
}

// `density` is handed in rather than kept here, because the control that sets
// it is in the header at the top of the screen and this component is what is
// under it. See useFeedDensity, above.
export default function Feed({ entries = [], density = DEFAULT_DENSITY }) {
  const { keeper_name, site_address } = useBookplate();
  // null until the book has answered, so an empty book and a book not yet
  // read draw differently.
  const [people, setPeople] = useState(null);
  // address → { entries, name, failed }. Filled as each journal answers, so
  // the first rows are on screen before the slowest journal has spoken.
  const [journals, setJournals] = useState({});
  const [open, setOpen] = useState(null);
  // ── And the one on its way out ──────────────────────────────────────────
  // A comparison that is closing has to still be in the page to close in.
  // The key is held for the length of the movement and then let go — the
  // same shape the book's doors use for the same reason (Friends.js), and
  // the reason is Miyel's: "it just disappears the way it is now."
  const [shutting, setShutting] = useState(null);
  const shutTimer = useRef(null);
  const toggle = key => {
    clearTimeout(shutTimer.current);
    if (open === key) {
      setShutting(key);
      setOpen(null);
      shutTimer.current = setTimeout(() => setShutting(null), SHUT_MS);
      return;
    }
    setShutting(null);
    setOpen(key);
  };
  useEffect(() => () => clearTimeout(shutTimer.current), []);
  // `asRows`, not `rows`: this file already has a `rows` and it is the flat
  // list of everything everybody logged.
  const asRows = density === 'rows';

  useEffect(() => {
    let gone = false;
    fetch('/api/people')
      .then(r => (r.ok ? r.json() : { people: [] }))
      .then(d => {
        if (gone) return;
        const had = d.people || [];
        setPeople(had);
        for (const p of had) {
          fetch(`${journalUrl(p.address)}/api/public/entries`, { signal: AbortSignal.timeout(EACH_MS) })
            .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
            .then(j => {
              if (gone) return;
              const name = String(j.keeper_name || '').trim() || p.name || '';
              setJournals(prev => ({ ...prev, [p.address]: { entries: j.entries || [], name } }));
            })
            .catch(() => {
              if (gone) return;
              setJournals(prev => ({ ...prev, [p.address]: { entries: [], name: p.name || '', failed: true } }));
            });
        }
      })
      .catch(() => { if (!gone) setPeople([]); });
    return () => { gone = true; };
  }, []);

  // ── Opening a comparison brings it into view ────────────────────────────
  // Miyel, 2026-09-20: "when clicking, please make sure screen scrolls to show
  // the opened horizons." Press the mark on a record near the foot of the
  // screen and everything the press produced is below it — a control that
  // reports its result somewhere you cannot see has not reported anything.
  //
  // After the panel has opened, not during: it unfolds over 0.34s and its
  // height is not settled until it has. The bars start rising at the same
  // moment, so the scroll and the rise arrive together rather than one after
  // the other.
  //
  // By as much as it takes and no more, and never when the panel was already
  // in view — which is most presses, because most records are read from the
  // top of the screen.
  useEffect(() => {
    if (!open) return undefined;
    const settle = setTimeout(() => {
      const panel = document.querySelector('.fd-cmp');
      if (!panel) return;
      // Whichever box is doing the scrolling: the pane on the cross, the
      // window at the feed's own address.
      let box = panel.parentElement;
      while (box) {
        const how = getComputedStyle(box).overflowY;
        if ((how === 'auto' || how === 'scroll') && box.scrollHeight - box.clientHeight > 1) break;
        box = box.parentElement;
      }
      // The band has a ground and would cover the foot of the panel rather
      // than letting it show through. Measured off the element, because its
      // height carries a safe area that a custom property hands back as the
      // calc it was written as.
      const band = document.querySelector('.hn-foot')?.getBoundingClientRect().height || 0;
      const seen = panel.getBoundingClientRect();
      const floor = (box ? box.getBoundingClientRect().bottom : window.innerHeight) - band - 12;
      const over = seen.bottom - floor;
      if (over <= 1) return;
      if (box) box.scrollTo({ top: box.scrollTop + over, behavior: 'smooth' });
      else window.scrollBy({ top: over, behavior: 'smooth' });
    }, 360);
    return () => clearTimeout(settle);
  }, [open]);

  const me = tidyJournal(site_address);
  const myName = String(keeper_name || '').trim().toLowerCase();
  const mineByKey = useMemo(() => new Map(entries.map(e => [e.album_key, e])), [entries]);

  const rows = useMemo(() => {
    if (!people) return [];
    const all = [];
    for (const p of people) {
      const j = journals[p.address];
      if (!j) continue;
      for (const entry of j.entries) all.push({ person: { ...p, name: j.name || p.name || '' }, entry });
    }
    all.sort((a, b) => new Date(b.entry.posted_at) - new Date(a.entry.posted_at));
    return all;
  }, [people, journals]);

  // ── What came back ──────────────────────────────────────────────────────
  // Their Submission entries whose credit names this journal — by address
  // when the credit carries one, by the name the send carried when it does
  // not (an entry from before the address travelled).
  //
  // **Nothing reads this today and that is on purpose.** It drove a filter in
  // the corner of the feed for one evening and she took the filter off; what
  // it finds belongs in the inbox as an arrival, which is the third item of
  // the friends brief, and the brief's own instruction for building that is
  // to reuse this match rather than write a second one. Deleting it would
  // mean writing it again in a fortnight, subtly differently, against the
  // same two cases. It costs one pass over a list that is already in memory.
  // eslint-disable-next-line no-unused-vars
  const submissions = useMemo(() => rows.filter(({ entry }) => {
    if (entry.entry_type !== 'Submission') return false;
    const url = tidyJournal(entry.received_from_url);
    if (url) return url === me;
    const name = String(entry.received_from || '').trim().toLowerCase();
    return Boolean(name) && name === myName;
  }).slice(0, SUBMISSIONS_MOST), [rows, me, myName]);

  const recent = useMemo(() => rows.slice(0, RECENT_MOST), [rows]);
  const shown = recent;
  const stillAsking = Boolean(people?.some(p => !journals[p.address]));

  let body;
  if (people === null || (stillAsking && shown.length === 0)) {
    body = (
      <div className="fd-list">
        {[...Array(2)].map((_, i) => <div key={i} className="own-skeleton fd-art" style={{ margin: '0 auto 24px' }} />)}
      </div>
    );
  } else if (people.length === 0) {
    body = (
      <div className="fd-empty">
        Nobody in your address book yet.<br />
        <Link href="/dashboard/people">Add someone</Link> and what they log shows up here.
      </div>
    );
  } else if (shown.length === 0) {
    body = (
      <div className="fd-empty">
        Nobody in your address book has logged anything yet.
      </div>
    );
  } else {
    body = (
      /* The gap between records belongs to the tall version; rows carry their
         own rule and sit against each other. */
      <div className={'fd-list' + (asRows ? ' fd-list--rows' : '')}>
        {shown.map(({ person, entry }) => {
          const key = `${person.address}/${entry.slug}`;
          const mine = mineByKey.get(entry.album_key);
          // Carrying who this copy belongs to — see carrySender.
          const there = carrySender(`${journalUrl(person.address)}/entries/${entry.slug}`, { name: keeper_name, address: site_address }, { known: true });
          const rated = entry.rating_value !== null && entry.rating_value !== undefined && entry.rating_value !== '';
          // ── The ring on a shared cover ─────────────────────────────
          // A record you both have wears a thin gold rule round its art, in
          // both densities (her brief). It is the one thing on a feed you can
          // act on that is worth spotting without reading, and reading is
          // exactly what scrolling past six rows a screen does not leave time
          // for. The same fact the compare mark states in words; this states
          // it at a glance and on the object itself.
          const shared = Boolean(mine);

          if (asRows) {
            return (
              <div key={key} className="fd-rowwrap">
                <article className="fd-row">
                  <a
                    className={'fd-row-art' + (shared ? ' fd-art--shared' : '')}
                    href={there}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${entry.album} on ${person.name || 'their'} journal`}
                  >
                    {entry.album_art && <img src={entry.album_art} alt="" loading="lazy" />}
                  </a>
                  <div className="fd-row-words">
                    <a className="fd-row-album" href={there} target="_blank" rel="noopener noreferrer">{entry.album}</a>
                    {/* Artist, who, when — one line, in the caption face, cut
                        with an ellipsis rather than wrapped. A row that grows
                        a second line for a long artist is not a row. */}
                    <div className="fd-row-meta">
                      {entry.artist}
                      {' \u00b7 '}{person.name || 'Someone'}
                      {' \u00b7 '}{briefly(entry.posted_at)}
                    </div>
                  </div>
                  {/* The marks survive the squeeze. The envelope and the
                      compare are the two reasons to stop on a row, and a
                      density that hid them would be hiding the good part. */}
                  <div className="fd-row-marks">
                    {rated && <StarRating rating={Number(entry.rating_value)} size={11} />}
                    <Marks entry={entry} size={14} />
                    {mine && (
                      <button
                        type="button"
                        className={'fd-compare fd-compare--mark' + (open === key ? ' fd-compare--open' : '')}
                        onClick={() => toggle(key)}
                        aria-expanded={open === key}
                        aria-label={open === key ? 'Close the comparison' : `Compare your listen with ${person.name || 'theirs'}`}
                        title={open === key ? 'Close' : 'Compare'}
                      >
                        <Shuffle size={14} weight="regular" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </article>
                {(open === key || shutting === key) && mine && (
                  <Compared mine={mine} theirs={entry} name={person.name || 'them'} closing={shutting === key} />
                )}
              </div>
            );
          }

          return (
            <div key={key}>
              <article className="fd-item">
                <a className={'fd-art' + (shared ? ' fd-art--shared' : '')} href={there} target="_blank" rel="noopener noreferrer" aria-label={`${entry.album} on ${person.name || 'their'} journal`}>
                  {entry.album_art && <img src={entry.album_art} alt="" loading="lazy" />}
                </a>
                <a className="fd-album" href={there} target="_blank" rel="noopener noreferrer">{entry.album}</a>
                <div className="fd-artist">{entry.artist}{entry.year ? ` · ${entry.year}` : ''}</div>
                {/* ── Compare stands with the marks, 2026-09-20 ────────
                    In both densities, which is what her brief says and what
                    her reference draws: the compare is one of the marks on
                    the line, beside the envelope, not a control of its own
                    below the record.

                    It had a word under it for half a day, from the version
                    where it stood alone. A mark in a row of marks does not
                    get a caption — the envelope beside it has never had one —
                    and the ring round the cover has already said, before you
                    read anything, that this is a record you both have. */}
                <div className="fd-stars">
                  {rated && <StarRating rating={Number(entry.rating_value)} size={20} />}
                  <Marks entry={entry} size={20} />
                  {mine && (
                    <button
                      type="button"
                      className={'fd-compare fd-compare--mark' + (open === key ? ' fd-compare--open' : '')}
                      onClick={() => toggle(key)}
                      aria-expanded={open === key}
                      aria-label={open === key ? 'Close the comparison' : `Compare your listen with ${person.name || 'theirs'}`}
                      title={open === key ? 'Close' : 'Compare'}
                    >
                      <Shuffle size={20} weight="regular" aria-hidden="true" />
                    </button>
                  )}
                </div>
                <div className="fd-who">
                  <Link href={`/dashboard/people/${person.id}`} title={`Your page about ${person.name || 'them'}`} data-grows={`/dashboard/people/${person.id}`}>
                    <Face address={person.address} />
                    {person.name || 'Someone'}
                  </Link>
                  <span className="fd-when">&middot; {timeAgo(entry.posted_at)}</span>
                </div>
                {(open === key || shutting === key) && mine && (
                  <Compared mine={mine} theirs={entry} name={person.name || 'them'} closing={shutting === key} />
                )}
              </article>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="fd-wrap">
      {/* ── No header on this page ────────────────────────────────────
          There was one for a day: the feed's name on the left, the density
          on the right, on a rule of its own. Miyel took it off on
          2026-09-20 — "it's also giving a false header, it's outside true
          header" — and she is right about what it was. Every screen here
          already has a header at the top with a hairline under it, and a
          second bar a little way below the first is a page claiming a
          heading it does not have. The control moved up into the real one,
          which is the cross's bar on a phone and SiteNav's right-hand slot
          at this page's own address, and the name went with the row because
          the name was only ever there to give the control company.
          See DensityToggle, above; whoever draws the header draws it. */}
      {body}
    </div>
  );
}
