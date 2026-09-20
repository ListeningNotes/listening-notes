// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/About.js
// One face of the cross's turning pane: who keeps this journal. The other is
// the desk, or the colophon signed out; a switch at the foot turns between
// them, and the journal beside them does not move when it does.
//
// This is the about page. Not a link to one — the page itself, sitting where
// the card used to have to be turned over to reach. The flip is gone: a card
// with a front and a back meant the same object existed in two places and
// neither was the canonical one, and the pane it turned into is a place you
// can be, which the back of a sheet never was.
//
// The card leads and the writing follows it. That order is the whole argument
// for the pane: a card is a glance and prose is a sit-down, and on one screen
// you had to choose which of the two the page was for. Down the pane, the
// glance comes first and the sit-down is there for whoever wants it.
//
// Two things left this pane and are worth knowing where they went. The key —
// the legend for every mark in the journal — belongs on the entries where
// those marks are actually printed, so a reader meets a definition at the
// moment they meet the thing it defines rather than by remembering there is a
// page about it. And the source line moved to the pitch pane, which is the
// public page about the software rather than the public page about a person;
// see the note there, because that line is a licence obligation and not
// decoration.
//
// The writing here is three finished sentences rather than a paragraph. The
// long essay went to /get, which is the address every copy's pitch pane points
// at, and the free-text bio went with it: a blank box asking somebody to
// describe themselves gets a paragraph about the project, where an opening
// like "I can never skip —" gets two words worth reading. See
// library/bioprompt.js for the nine and why they are fixed.
//
// Nothing anybody reads here is in this file. The prompts ship in code and the
// answers come off the settings row, so a journal installed this morning has
// no answers and no rig, and the pane is exactly the card and nothing else —
// and because HomeNav decides whether to draw a down caret by measuring the
// pane rather than by being told, that copy also gets no arrow pointing at
// nothing.

'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowSquareOut, CaretDown, Check, GlobeSimple, LinkSimple, MagnifyingGlass, Plus, X } from '@phosphor-icons/react';
import Link from 'next/link';
import { arrivingAlone } from '../../library/handoff';
import { useHoldStill } from '../../hooks/useHoldStill';
import IdentityCard from './IdentityCard';
import {
  DEFAULT_RIG_ICON, LINK_ICONS, RIG_ICONS, identify, readLink, rigIcon,
} from '../../library/card_links';
import { useIdentificationCardEditor } from './IdentificationCardEditor';
import { useBookplate } from './Bookplate';
import { BIO_PROMPTS, readBioAnswers } from '../../library/bioprompt';
import { VERSION, RELEASE_URL } from '../../library/version';

// How long the row at the foot takes to change places with the band. The
// band's own transition in nav.css is the same number, and the delay that
// makes the band follow the bar back up rather than cross it is there too.
const EDIT_BAR_MS = 300;

// The openings carry a trailing em dash of their own (bioprompt.js), put there
// when the question and the answer shared a line and it had to separate them.
// They have not shared a line since 2026-09-15 — two lines in two faces, which
// separate themselves — and the dash was being taken off at the print and left
// on everywhere else: on the line you press to change an opening, and on all
// nine in the list under it, where a column of sentences each ending in a dash
// reads as nine unfinished thoughts. Taken off at the render rather than out of
// the nine strings, because it is the typography that made it redundant and
// the typography is the thing most likely to change again.
const noDash = text => text.replace(/\s*[—–-]\s*$/, '');


// Three, and the cap is the point. Somewhere to be found is not somewhere to
// list every account anybody has ever opened — a row of three marks reads at a
// glance and a row of nine reads as a footer.
const LINK_LIMIT = 3;

// The links are retired from view, 2026-09-02, on the keeper's call: not
// shown anywhere, not asked for at setup, not edited on the pane. The column
// and its rows stay — it is somebody's data and the schema is still a draft —
// so flipping this back is the whole of un-retiring them.
const LINKS_SHOWN = false;

// How many records the pin's search shows at once. Enough to scroll a little
// and find something without typing, few enough that the sheet does not become
// the archive — which exists, one swipe away, and is the right place to browse.
const PIN_RESULTS = 40;

// `entries` is every record in the journal, handed down rather than fetched:
// the cross already holds them for the wall, and the pin's search is a filter
// over a list that is already in memory. A journal large enough for that to be
// the wrong shape is a journal whose archive has the same problem, and they
// should be solved together.
export default function About({ stamps, authed = false, pinned = null, entries = [] }) {
  const settings = useBookplate();
  const { bioanswers, keeper_name, rig: rigRows, social_links } = settings;

  // Whose voice the answers are in, and what the journal actually listens to.
  // The name rather than a pronoun: every copy has a different somebody in it,
  // and "In Miyel's own words" reads where "In their own words" has to cover
  // everyone. No name yet — a copy claimed an hour ago — and it falls back to
  // the pronoun, which is the one case where covering everyone is right.
  // Top genres is the card's again (IdentityCard), under the counts: it is the
  // last of the counted things, not part of the reading. It printed down here
  // for an hour on the argument that it is neither a count nor something
  // anybody wrote, and the first half of that is wrong — it is counted.

  // One edit session for the pane, owned here and handed to the card. The card
  // used to make its own, which was fine while everything editable was printed
  // on it; the prompts print below it now, and two instances of the hook would
  // be two drafts of the same page with one save button between them.
  const edit = useIdentificationCardEditor(settings);

  // ── The band and the editing bar change places ──────────────────────────
  // One row at the foot of the screen at a time. The band drops out of the
  // window as the bar rises into it, and on the way back the bar sinks first
  // and the band follows it up a beat later (the delay is in nav.css).
  //
  // The band belongs to the cross and this bar belongs to the card, and they
  // have no component in common short of HomeNav — so they are joined by a
  // class on `.hn` rather than by threading editing state up through a pane
  // and back down. The DOM write is this file's own: it puts the class on and
  // takes it off, including if the pane goes away mid-correction.
  const [barUp, setBarUp] = useState(false);
  const [barGoing, setBarGoing] = useState(false);
  useEffect(() => {
    const cross = document.querySelector('.hn');
    if (edit.editing) {
      setBarGoing(false);
      setBarUp(true);
      cross?.classList.add('hn--editing');
      return () => cross?.classList.remove('hn--editing');
    }
    cross?.classList.remove('hn--editing');
    setBarGoing(going => going);
    return undefined;
  }, [edit.editing]);

  // And the way out, which is a state of its own because a row that is
  // unmounted on the frame it stops being wanted does not leave, it vanishes.
  useEffect(() => {
    if (edit.editing || !barUp) return undefined;
    setBarGoing(true);
    const done = setTimeout(() => { setBarUp(false); setBarGoing(false); }, EDIT_BAR_MS);
    return () => clearTimeout(done);
  }, [edit.editing, barUp]);

  // Whether a newer Listening Notes exists, for the line at the foot. Asked
  // once, of this copy's own server, which asks GitHub's public releases at
  // most once an hour (app/api/update/route.js). The only thing it can ever
  // say is that there is a newer version and where the button to take it is.
  // Only asked of a keeper: a visitor never sees the line and a fetch nobody
  // reads is a fetch on every journal on the internet.
  const [update, setUpdate] = useState(null);
  useEffect(() => {
    if (!authed) return;
    fetch('/api/update')
      .then(r => (r.ok ? r.json() : null))
      .then(d => d?.newer && setUpdate(d))
      .catch(() => {});
  }, [authed]);

  // Whether the pin's search is open, and what has been typed into it. Both
  // belong to the pane rather than to the card: the sheet covers the pane, and
  // a fixed panel rendered from inside the card would be a panel owned by the
  // thing it is covering.
  const [pinOpen, setPinOpen] = useState(false);
  const [pinQuery, setPinQuery] = useState('');

  // ── The count windows ─────────────────────────────────────────────────────
  // Which of the two flag counts is open, if either. A window of covers and
  // nothing else — no search, no filter, no sort — because this is a glance
  // and browsing is the wall's job (Miyel's brief, 2026-09-15). Owned here
  // rather than in the card for the same reason the pin's search is: the sheet
  // covers the pane, and a fixed panel drawn from inside the card would belong
  // to the thing it is sitting on top of.
  const [openCount, setOpenCount] = useState(null);
  // The drag that puts it away, the shape the archive's filter sheet uses
  // (JournalFilters): pointer events, so one pair of handlers drives a finger
  // and a trackpad, and downward only — tracking upward would lift the sheet
  // off the bottom of the screen and show the page behind it.
  const countSheetRef = useRef(null);
  const countFromRef = useRef(null);
  const countScrimRef = useRef(null);
  const [countDrag, setCountDrag] = useState(0);
  const [countSettling, setCountSettling] = useState(false);

  // Nothing behind the window moves while it is open. It held nothing still
  // at all until 2026-09-15, so the portrait and the writing under it carried
  // on scrolling behind a grid of covers — see hooks/useHoldStill.js, which
  // the archive's filter sheet shares.
  useHoldStill(countScrimRef, !!openCount);

  const shutCount = useCallback(() => {
    setOpenCount(null);
    setCountDrag(0);
    setCountSettling(false);
  }, []);

  // The pull that puts the window away. Out of the grip's markup since
  // 2026-09-15 so the scrim can carry the same three handlers: with the page
  // behind held still a downward drag over the portrait had nothing left to
  // do, and putting the window away is plainly what it is reaching for.
  function onCountDown(e) {
    countFromRef.current = e.clientY;
    setCountSettling(false);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onCountMove(e) {
    if (countFromRef.current === null) return;
    setCountDrag(Math.max(0, e.clientY - countFromRef.current));
  }
  function onCountUp() {
    if (countFromRef.current === null) return;
    countFromRef.current = null;
    const height = countSheetRef.current?.offsetHeight ?? 400;
    // A short sheet should not need a long pull and a tall one should not go
    // on a twitch — whichever is smaller.
    const closeAt = Math.min(120, height * 0.28);
    setCountSettling(true);
    if (countDrag > closeAt) { setCountDrag(height); setTimeout(shutCount, 180); }
    else setCountDrag(0);
  }

  // What is in the open window. The same two tests the wall filters on
  // (Journal.js), so the window and the archive's filter can never disagree
  // about what counts; masterpiece was a rating before it was a column, which
  // is why the first one asks twice.
  const inWindow = useMemo(() => {
    if (!openCount) return [];
    return entries.filter(e => (openCount === 'masterpieces'
      ? (e.masterpiece === true || e.rating === 'Masterpiece')
      : (e.formative === true || e.formative === 'true')));
  }, [openCount, entries]);

  useEffect(() => {
    if (!openCount) return undefined;
    const onKey = e => { if (e.key === 'Escape') shutCount(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openCount, shutCount]);

  // Which slot has its list of openings open, if any. One at a time, the same
  // way the card's mark chooser works — two lists of nine sentences open at
  // once is most of the pane.
  const [picking, setPicking] = useState(null);
  // Which mark palette is open, if any: 'rig', or the index of a link. One at
  // a time, so opening a second closes the first and the pane never has two
  // grids of icons on it at once. This lived on the card while the card was
  // the only surface an owner could edit; the rows it belongs to print here.
  const [choosing, setChoosing] = useState(null);
  // What the editor is currently showing for the rig, which is the draft
  // rather than what is saved — the heading below has to change the moment a
  // mark is pressed.
  const chosenRig = rigIcon(edit.rig);

  // An answer that grows instead of scrolling. It has to run on mount as well
  // as on every keystroke, or an answer already two lines long opens showing
  // one — and one line is exactly the wrong impression to give, since the
  // whole point of a finished sentence is that it can be as long as it needs
  // to be and no longer.
  const grow = el => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };
  // Escape closes it, because anything that opens over the page has to have a
  // way out that is not aiming at a particular pixel. Leaving edit mode closes
  // it too: the list belongs to an edit, not to the pane.
  useEffect(() => {
    if (picking === null) return;
    const onKey = event => { if (event.key === 'Escape') setPicking(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [picking]);
  // Derived rather than reset in an effect: the list only means anything
  // inside an edit, so it is read through that instead of being cleared when
  // the edit ends. An effect that only calls setState is a render asking to
  // happen twice.
  const openSlot = edit.editing ? picking : null;

  // All three, here. One of them used to be promoted onto the card and dropped
  // from this list so it did not print twice — the card is the counted facts
  // and a record now, and the writing all sits together on the screen below it,
  // which is what the pane is for.
  const answered = readBioAnswers(bioanswers);
  // Same filter the card applies, for the same reason: a row with no name is a
  // row somebody started and abandoned in the editor, and it should not print.
  const rigList = (Array.isArray(rigRows) ? rigRows : []).filter(r => r?.name?.trim());
  // rigIcon(rig_icon) resolved the keeper's chosen mark for the Rig setup
  // heading, which no longer wears one. Nothing reads it now; the chooser in
  // the editor still writes it. See the heading.
  // What the heading wears: the saved mark normally, the draft one while
  // editing, so pressing a new mark changes the heading under your thumb
  // rather than after a save.

  // Where else this person can be found. They used to be marks in the row
  // beside "Send an album" on the card, which put "here is somebody's Instagram"
  // next to the one thing the card is actually for. At the foot of the reading
  // they answer the question the reading has just raised: having read about
  // somebody, you might want to go and find them. De-duplicated on the href.
  const socials = useMemo(() => {
    const stored = Array.isArray(social_links) ? social_links.map(readLink) : [];
    const seen = new Set();
    return stored
      .filter(l => l.url?.trim())
      .map(l => identify(l.url.trim(), l.icon))
      .filter(l => l && !seen.has(l.href) && seen.add(l.href))
      .slice(0, LINK_LIMIT);
  }, [social_links]);

  // What the card should draw in the pinned row. While a correction is open
  // that is the draft — press a record in the sheet and the card shows it at
  // once, before anything is saved — and otherwise it is what the pane was
  // handed, which is what a visitor sees.
  const showingPin = edit.editing
    ? (entries.find(e => e.id === edit.pin) || null)
    : pinned;

  // The search. Album and artist only: this is somebody looking for a record
  // they already have in mind, not browsing, and matching notes as well would
  // put an album in the results for a sentence written about a different one.
  const pinResults = useMemo(() => {
    const q = pinQuery.trim().toLowerCase();
    const rows = q
      ? entries.filter(e =>
          `${e.album || ''} ${e.artist || ''}`.toLowerCase().includes(q))
      : entries;
    return rows.slice(0, PIN_RESULTS);
  }, [entries, pinQuery]);

  // Leaving the correction closes it: the sheet belongs to an edit, not to the
  // pane. Read through `editing` rather than cleared by an effect, for the same
  // reason openSlot is above — an effect whose whole body is setState is a
  // render asking to happen again, and React now says so out loud.
  const pinSheetOpen = edit.editing && pinOpen;

  // ── The sheet and the keyboard ────────────────────────────────────────────
  // A fixed panel anchored to the bottom of the screen is anchored to the
  // *layout* viewport, and an iOS keyboard does not change that — it slides up
  // over it. The sheet went behind the keyboard, Safari scrolled the page to
  // chase the field, and the whole thing ended up above the top of the screen
  // with its search box off-screen and its list running through the clock.
  //
  // visualViewport is the part actually being looked at. This measures how much
  // of the bottom is covered and lifts the sheet by exactly that, and caps its
  // height to the room that is left. Written straight onto the element rather
  // than into state: it fires on every frame of the keyboard animation, and a
  // re-render per frame to move one box is a re-render of the whole pane.
  // ── Leaving the pane puts the pencil down ─────────────────────────────────
  // A correction left open while somebody swipes to the beacon is a correction
  // they will come back to hours later, having forgotten what they changed, and
  // press Save on. It is also two panes of the cross disagreeing about what
  // state the site is in.
  //
  // Watched here rather than handed down from HomeNav, so About does not have
  // to know it is sitting in a cross — it asks whether it is on screen, which
  // is a question it can answer anywhere it is mounted.
  //
  // The threshold is a small number rather than zero, and that is the whole of
  // what took two attempts to get right.
  //
  // Scroll snapping parks a pane exactly edge to edge. A pane that has gone
  // completely off the left sits at left: -444, right: 0 against a viewport
  // starting at 0 — the rectangles touch, and a browser calls touching
  // rectangles intersecting. It reports isIntersecting: true with
  // intersectionRatio: 0, in both the on-screen and the gone state. An observer
  // watching for zero therefore sees no crossing and never fires a second time,
  // which is exactly what it did: one callback on open and silence afterwards.
  //
  // A small positive threshold is crossed for real — 0.5-ish down to 0 — so the
  // callback arrives. And it stays well clear of the legitimate low readings:
  // this pane is taller than the window, so its ratio sits near half even when
  // somebody has scrolled to the bottom of the rig, and cancelling an edit for
  // that would be worse than not cancelling it at all.
  const GONE = 0.02;
  const paneRef = useRef(null);
  // Read off the session rather than through it, so the effect depends on the
  // two things it uses instead of on the whole editor — which changes on every
  // keystroke into every field on the card.
  const { editing: correcting, cancel: putThePencilDown, begin: pickUpThePencil } = edit;

  // ── Arriving with the pencil already up ───────────────────────────────────
  // /?edit=card opens the correction as soon as the wristband is confirmed.
  // It exists for the settings page, which lists the photo, the prompts, the
  // links and the rig as things edited here rather than there, and has to be
  // able to say "here" with a link that lands on the fields and not on the
  // card. Once, on arrival; the query is not watched afterwards.
  const arrived = useRef(false);
  useEffect(() => {
    if (!authed || arrived.current) return;
    if (new URLSearchParams(window.location.search).get('edit') !== 'card') return;
    arrived.current = true;
    pickUpThePencil();
  }, [authed, pickUpThePencil]);
  useEffect(() => {
    if (!correcting) return undefined;
    const pane = paneRef.current;
    if (!pane) return undefined;
    const watch = new IntersectionObserver(
      ([seen]) => { if (seen.intersectionRatio < GONE) putThePencilDown(); },
      { threshold: GONE },
    );
    watch.observe(pane);
    return () => watch.disconnect();
  }, [correcting, putThePencilDown]);

  const sheetRef = useRef(null);
  useEffect(() => {
    if (!pinSheetOpen) return undefined;
    const seen = window.visualViewport;
    if (!seen) return undefined;
    const place = () => {
      const el = sheetRef.current;
      if (!el) return;
      const covered = Math.max(0, window.innerHeight - seen.height - seen.offsetTop);
      el.style.setProperty('--ab-pin-lift', `${covered}px`);
      el.style.setProperty('--ab-pin-room', `${Math.round(seen.height)}px`);
    };
    place();
    seen.addEventListener('resize', place);
    seen.addEventListener('scroll', place);
    return () => {
      seen.removeEventListener('resize', place);
      seen.removeEventListener('scroll', place);
    };
  }, [pinSheetOpen]);

  function choosePin(id) {
    edit.setPin(id);
    setPinOpen(false);
    setPinQuery('');
  }

  // Whether there is a second floor at all. A fresh copy with no prompts
  // answered and no rig has nothing to read, and a caret into an empty room
  // is worse than no caret — deep is measured, so leaving the floor out is
  // what keeps the caret away. Editing needs the floor for its fields.
  const hasReading = answered.length > 0 || rigList.length > 0 || edit.editing;

  return (
    <div className={'ab-pane' + (edit.editing ? ' ab-pane--editing' : '')} ref={paneRef}>
      {/* ── The bar that says a correction is open ──────────────────────
          The entry's own, class for class (entry.css, .ln-editing-bar), and
          for the same reason: the controls that started it are at the top of
          a page you are three screens down by the time you are rewriting an
          answer, and once the portrait has scrolled off nothing else on the
          screen says you are editing at all. Miyel, 2026-09-20: "edit ID page
          should take same look as edit mode in entry with same footer to end
          editing."

          It does not cover the band: the two change places. Miyel,
          2026-09-20 — "we can have the nav bar leave out the screen down and
          the edit toolbar come up; when finishing editing that one exits down
          and the nav bar comes back up." An entry has no band to swap with,
          which is why the bar simply appears there and why it looked wrong
          here: two rows stacked at the foot of the screen, one of them four
          doors out of a correction you have not decided what to do with.

          The band is HomeNav's and this is About's, so the two are joined by
          a class on the cross rather than by a prop — see the effect above.
          It stays mounted for the length of the way out, which is what
          `barGoing` is: unmounted on the frame editing ends, it would vanish
          rather than leave. */}
      {barUp && (
        <div className={'ln-editing-bar' + (barGoing ? ' ln-editing-bar--going' : '')}>
          <span className="ln-editing-label">Editing</span>
          <button type="button" className="ln-pin ln-pin--on" onClick={edit.save} disabled={edit.saving || edit.busy}>
            <Check size={13} weight="bold" aria-hidden="true" />
            <span>{edit.saving ? 'Saving' : 'Save'}</span>
          </button>
          <button type="button" className="ln-pin" onClick={edit.cancel} disabled={edit.saving}>
            <X size={13} weight="bold" aria-hidden="true" />
            <span>Cancel</span>
          </button>
        </div>
      )}
      {edit.trouble && <p className="ln-trouble">{edit.trouble}</p>}
      {/* No floors, and no crown, since 2026-09-15. The card is a page and
          pages scroll: the glance is at the top, the reading continues down
          the same scroll, and there is nothing to arrive at. Down means
          cover-then-contents and only the beacon and an entry have that shape
          — see HomeNav. The mark is small, in the card's own header. */}
      <div className="ab-card">
        <IdentityCard
          stamps={stamps}
          authed={authed}
          edit={edit}
          pinned={showingPin}
          onPickPin={() => { setPinQuery(''); setPinOpen(true); }}
          openCount={openCount}
          onOpenCount={next => { setCountDrag(0); setCountSettling(false); setOpenCount(next); }}
        />
      </div>

      {/* ── A count's window ──────────────────────────────────────────────
          Covers and nothing else: no bar, no search, no sort. The name and
          the number are in the header, so nothing needs a label, and the
          sheet is the height of what is in it — nine covers is three rows and
          should open short, where a fixed sheet with empty space under nine
          albums reads as something failing to load.

          Pressing a cover closes the window before the entry opens. One layer
          at a time: an entry arriving over an open sheet is the nesting
          problem in Gotchas, where a fixed panel inside a layer measures
          itself against the sheet rather than the window. And it opens alone —
          this pane hands out no order to swipe through. */}
      {openCount && (
        <>
          <div
            ref={countScrimRef}
            className="ab-count-scrim"
            onClick={shutCount}
            onPointerDown={onCountDown}
            onPointerMove={onCountMove}
            onPointerUp={onCountUp}
          />
          <div
            className={'ab-count-sheet' + (countSettling ? ' ab-count-sheet--settling' : '')}
            ref={countSheetRef}
            style={countDrag ? { transform: `translateY(${countDrag}px)` } : undefined}
            role="dialog"
            aria-label={`${inWindow.length} ${openCount}`}
          >
            <button
              type="button"
              className="ab-count-grip"
              aria-label="Close"
              onClick={shutCount}
              onPointerDown={onCountDown}
              onPointerMove={onCountMove}
              onPointerUp={onCountUp}
            />
            <p className="ab-count-head">
              <b>{inWindow.length}</b> {openCount}
            </p>
            {inWindow.length > 0 ? (
              <div className="ab-count-grid">
                {inWindow.map(row => (
                  <Link
                    key={row.id}
                    href={`/entries/${row.slug}`}
                    className="ab-count-cover"
                    title={`${row.album} — ${row.artist}`}
                    aria-label={`${row.album} — ${row.artist}`}
                    onClick={() => { arrivingAlone(); shutCount(); }}
                  >
                    {row.album_art
                      ? <img src={row.album_art} alt="" loading="lazy" />
                      : <span aria-hidden="true">\u266a</span>}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="ab-count-none">Nothing marked {openCount} yet.</p>
            )}
          </div>
        </>
      )}

      {/* ── The pin's search ──────────────────────────────────────────────
          A bottom sheet on a phone and a panel in the middle on a desktop,
          which is the shape the archive's filters already use — see
          .arc-sheet in Journal.js. No drag-to-dismiss here: that sheet is
          opened and closed dozens of times while somebody browses, and this
          one is opened when a person changes their mind about which record
          they are holding up, which is not often.

          It is rendered from the pane rather than the card because it covers
          the pane. A fixed panel drawn from inside the card would belong to
          the thing it is sitting on top of. */}
      {pinSheetOpen && (
        <>
          <div className="ab-pin-scrim" onClick={() => setPinOpen(false)} />
          <div className="ab-pin-sheet" ref={sheetRef} role="dialog" aria-label="Choose a pinned album">
            <div className="ab-pin-search">
              <MagnifyingGlass size={14} weight="bold" aria-hidden="true" />
              <input
                className="ab-pin-field"
                value={pinQuery}
                onChange={e => setPinQuery(e.target.value)}
                placeholder="Search your albums"
                aria-label="Search your albums"
              />
            </div>

            {/* ── Covers, not rows, 2026-09-20 ───────────────────────────
                Miyel: "the selection should be grid of albums not list." A
                row spends most of its width on words and gives the record a
                40px thumbnail, and a record is a picture: you know the one
                you are looking for by its cover long before you have read its
                title. It is also the shape the rest of this site picks
                records in — the wall on the beacon, the window a count
                opens, the archive — so this stops being the one place that
                asks you to read a list.

                The artist goes. Three across a phone leaves room for one line
                under the art, and between the cover and the title the artist
                is the third thing you need; it stays on the label for anybody
                who cannot see the picture. */}
            <div className="ab-pin-grid">
              {pinResults.map(row => (
                <button
                  key={row.id}
                  type="button"
                  className={'ab-pin-one' + (row.id === edit.pin ? ' ab-pin-one--on' : '')}
                  onClick={() => choosePin(row.id)}
                  aria-pressed={row.id === edit.pin}
                  aria-label={`${row.album} — ${row.artist}`}
                  title={`${row.album} — ${row.artist}`}
                >
                  <span className="ab-pin-one-art">
                    {row.album_art
                      ? <img src={row.album_art} alt="" />
                      : <span aria-hidden="true">♪</span>}
                    {row.id === edit.pin && (
                      <span className="ab-pin-one-tick" aria-hidden="true">
                        <Check size={12} weight="bold" />
                      </span>
                    )}
                  </span>
                  <span className="ab-pin-one-album">{row.album}</span>
                </button>
              ))}
              {pinResults.length === 0 && (
                <p className="ab-pin-empty">Nothing in the journal matches that.</p>
              )}
            </div>

            <div className="ab-pin-foot">
              {/* Clearing it is a thing somebody means to do, so it says so
                  rather than being the absence of a choice. */}
              <button type="button" className="ln-pill" onClick={() => choosePin(null)}>
                Pin nothing
              </button>
              <button type="button" className="ln-pill" onClick={() => setPinOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </>
      )}

      {/* Where the card ends and the reading starts. This boundary was a snap
          point for a day — proximity snapping, to catch a reader settling onto
          it — and it came out because what it actually did was argue with the
          thumb, pulling back toward a line somebody had deliberately gone
          past. The entrance to a pane's lower half wants designing properly;
          until it is, this is just where one thing stops and the next
          begins. */}
      {hasReading && (
      <div className="ab-below">
        {/* The prompts. Prompt and answer on one line, because they are one
            sentence: "I can never skip — Voodoo, side two" is a thought, and
            the same words as a label over a value are two things stacked. The
            opening carries its own em dash for the same reason — it is grammar
            rather than layout. */}
        {edit.editing ? (
          <section className="ab-block ab-block--prompts">
            {/* Three slots, always three. A list that grows as you answer makes
                "how many am I supposed to write" a question the interface asks
                instead of answers.

                A native select, not a grid of choices: nine full sentences do
                not fit as marks, and on a phone the system picker is a better
                list than anything drawn here. Openings already taken elsewhere
                are still offered — picking one swaps the two rather than
                refusing, so nothing has to be cleared to make a move somebody
                has already decided on. */}
            {edit.bio.map((row, index) => {
              const chosen = BIO_PROMPTS.find(p => p.key === row.key) || null;
              const open = openSlot === index;
              return (
                <div className="ab-prompt-edit" key={index}>
                  {/* The opening, as the thing you press to change it. A native
                      select would draw the system's own grey control, which is
                      the only bevelled thing on a site made of rules and type —
                      so this is the card's mark chooser in words: press the
                      line, the list opens under it, press a line to take it. */}
                  <button
                    type="button"
                    className={'ab-prompt-pick' + (open ? ' ab-prompt-pick--on' : '')}
                    onClick={() => setPicking(open ? null : index)}
                    aria-expanded={open}
                    aria-label={`Opening ${index + 1}`}
                  >
                    <span className={chosen ? 'ab-prompt-ask' : 'ab-prompt-none'}>
                      {chosen ? noDash(chosen.text) : 'Choose a prompt'}
                    </span>
                    <CaretDown size={11} weight="bold" aria-hidden="true" />
                  </button>

                  {open && (
                    <div className="ab-prompt-menu" role="group" aria-label="Openings">
                      {BIO_PROMPTS.map(prompt => {
                        const on = prompt.key === row.key;
                        // Openings already used in another slot stay on the
                        // list. Picking one swaps the two rather than refusing,
                        // so nothing has to be cleared to make a move somebody
                        // has already decided on — but it is marked, because a
                        // swap you did not expect reads as a bug.
                        const elsewhere = !on && edit.bio.some((r, i) => i !== index && r.key === prompt.key);
                        return (
                          <button
                            key={prompt.key}
                            type="button"
                            className={'ab-prompt-opt' + (on ? ' ab-prompt-opt--on' : '') + (elsewhere ? ' ab-prompt-opt--taken' : '')}
                            onClick={() => { edit.setBioKey(index, prompt.key); setPicking(null); }}
                            aria-pressed={on}
                          >
                            <span>{noDash(prompt.text)}</span>
                            {on && <Check size={12} weight="bold" aria-hidden="true" />}
                            {elsewhere && <span className="ab-prompt-taken" aria-hidden="true">in use</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* A textarea, not an input, and only because of how it
                      grows: the answer prints as a wrapped line and it should
                      be written as one. A single-line field scrolls sideways
                      under the caret, which hides the beginning of the
                      sentence you are trying to finish. Return does nothing —
                      see onKeyDown — because this is one sentence and a line
                      break in it would print as a space anyway. */}
                  <textarea
                    className="ab-prompt-input"
                    rows={1}
                    value={row.answer}
                    onChange={e => { edit.setBioAnswer(index, e.target.value); grow(e.currentTarget); }}
                    onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
                    ref={grow}
                    placeholder={row.key ? 'Finish the sentence' : ''}
                    disabled={!row.key}
                    aria-label={chosen ? chosen.text : `Answer ${index + 1}`}
                  />
                </div>
              );
            })}
          </section>
        ) : answered.length > 0 && (
          <section className="ab-block ab-block--prompts">
            {/* No heading. It said "In Miyel's own words" for an hour and did
                not need to: a question in one voice with an answer in another
                already says which of the two you are reading (Miyel,
                2026-09-15). */}
            {/* The opening carries its own trailing em dash (bioprompt.js),
                which was there to separate the question from the answer on one
                line. They are on two lines in two faces now, so the dash is
                separating things that separate themselves — taken off at the
                render rather than out of the nine strings, because it is the
                typography that made it redundant and the typography is the
                thing most likely to change again. */}
            {answered.map(row => (
              <div className="ab-prompt" key={row.key}>
                <p className="ab-prompt-ask">{noDash(row.text)}</p>
                <p className="ab-prompt-said">{row.answer}</p>
              </div>
            ))}
          </section>
        )}

        {/* The free-text bio used to print here and does not. A blank box is a
            hard question badly phrased: asked to describe yourself you write a
            paragraph about the project, asked what you can never skip you
            write two words worth reading. The column that held it is gone, and
            an optional free-text field alongside the prompts is a later decision, because
            it is much easier to add one than to take one away once people have
            filled it in. */}

        {(rigList.length > 0 || edit.editing) && (
          <section className="ab-block">
            {/* The rig used to come up from the bottom of the card in a
                drawer, which was the right answer while the card was the whole
                page and the wrong one the moment the page could scroll. A
                drawer is what you build when there is nowhere to put
                something. There is somewhere now.

                The rows and nothing else. There were once several hundred
                words under these about why any of it matters, and they are
                staying out: what is worth saying here is what the thing is
                and what it does, and the rest is the journal. Hardcoded they
                would also be one person's essay shipped inside everybody's
                copy — see the note on the rig column in migrations/001_initial.sql. */}
            {/* Two words and no glyph (Miyel, 2026-09-15). The mark that was
                here was the rig's chosen one — see the note by `chosenRig`
                below: choosing it is still offered in the editor and this was
                the only place it printed, so that choice currently changes
                nothing. It is left offered rather than quietly removed,
                because taking a setting away is a decision and this was a
                note about a glyph. */}
            <h2 className="ab-subhead">Rig setup</h2>
            {edit.editing ? (
              <div className="idc-links">
                {/* The rig, chosen the same way. It sits with the links because it
                    is the same kind of thing: a mark on the row under the button,
                    standing for somewhere else to go. */}
                <div className="idc-link-row idc-link-row--rig">
                  <button
                    type="button"
                    className={'idc-link-mark' + (choosing === 'rig' ? ' idc-link-mark--on' : '')}
                    onClick={() => setChoosing(choosing === 'rig' ? null : 'rig')}
                    aria-expanded={choosing === 'rig'}
                    aria-label="Choose a mark for your rig"
                    title="Choose a mark for your rig"
                  >
                    {chosenRig.Icon
                      ? <chosenRig.Icon size={17} weight="regular" aria-hidden="true" />
                      : <X size={15} weight="bold" aria-hidden="true" />}
                  </button>
                  <span className="idc-rig-said">
                    {chosenRig.Icon ? `The rig — ${chosenRig.label.toLowerCase()}` : 'No rig button'}
                  </span>
                  {choosing === 'rig' && (
                    <div className="idc-marks" role="group" aria-label="Marks for the rig">
                      {RIG_ICONS.map(option => {
                        const on = (edit.rig || DEFAULT_RIG_ICON) === option.name;
                        return (
                          <button
                            key={option.name}
                            type="button"
                            className={'idc-mark-opt' + (on ? ' idc-mark-opt--on' : '')}
                            onClick={() => { edit.setRig(option.name); setChoosing(null); }}
                            aria-pressed={on}
                            aria-label={option.label}
                            title={option.label}
                          >
                            {option.Icon
                              ? <option.Icon size={17} weight="regular" aria-hidden="true" />
                              : <X size={15} weight="bold" aria-hidden="true" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* What is in the sheet. Nothing about why it matters — that is
                    what the journal is for — just what each thing is and what it
                    does, which is the shape a tracklist reads in. */}
                {chosenRig.Icon && (
                  <div className="idc-gear">
                    {edit.gear.map((item, index) => (
                      <div className="idc-gear-row" key={index}>
                        <input
                          className="idc-link-input"
                          type="text"
                          value={item.name}
                          onChange={e => edit.setGearField(index, 'name', e.target.value)}
                          placeholder="KEF LS50"
                          aria-label={`Equipment ${index + 1}`}
                        />
                        <input
                          className="idc-link-input idc-gear-role"
                          type="text"
                          value={item.role}
                          onChange={e => edit.setGearField(index, 'role', e.target.value)}
                          placeholder="Speakers"
                          aria-label={`What equipment ${index + 1} does`}
                        />
                        <button
                          type="button"
                          className="idc-link-drop"
                          onClick={() => edit.dropGear(index)}
                          aria-label={`Remove equipment ${index + 1}`}
                        >
                          <X size={12} weight="bold" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                    <button type="button" className="idc-link-add" onClick={edit.addGear}>
                      <Plus size={11} weight="bold" aria-hidden="true" />
                      Add a piece
                    </button>
                  </div>
                )}
              </div>
            ) : (
            <div className="ab-rig">
              {rigList.map((item, i) => (
                <div className="ab-rig-row" key={item.name + i}>
                  {item.href ? (
                    <a className="ab-rig-name" href={item.href} target="_blank" rel="noopener noreferrer">
                      {item.name}
                      <ArrowSquareOut size={13} weight="bold" aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="ab-rig-name">{item.name}</span>
                  )}
                  <span className="ab-rig-role">{item.role}</span>
                </div>
              ))}
            </div>
            )}
          </section>
        )}

        {LINKS_SHOWN && (socials.length > 0 || edit.editing) && (
          <section className="ab-block">
            {/* Headed like the rig above it, because it is the same kind of
                thing: a short list of facts about somebody, at the end of the
                writing about them. Unheaded it was a row of marks floating
                between the rig and the pills with nothing saying what they
                were. */}
            <h2 className="ab-subhead">
              <LinkSimple size={15} weight="regular" aria-hidden="true" />
              Find me
            </h2>
            {edit.editing ? (
              <div className="idc-links">
                {edit.links.map((link, index) => {
                  const known = link.url.trim() ? identify(link.url.trim(), link.icon) : null;
                  const Icon = known ? known.Icon : LinkSimple;
                  return (
                    <div className="idc-link-row" key={index}>
                      {/* The mark opens the marks. A dropdown made you read a list
                          of names to pick a picture, which is the wrong way round
                          — you know the one you want by sight. */}
                      <button
                        type="button"
                        className={'idc-link-mark' + (choosing === index ? ' idc-link-mark--on' : '')}
                        onClick={() => setChoosing(choosing === index ? null : index)}
                        aria-expanded={choosing === index}
                        aria-label={`Choose a mark for link ${index + 1}`}
                        title="Choose a mark"
                      >
                        <Icon size={17} weight="regular" aria-hidden="true" />
                      </button>
                      <input
                        className="idc-link-input"
                        type="url"
                        inputMode="url"
                        value={link.url}
                        onChange={e => edit.setLink(index, e.target.value)}
                        placeholder="https://…"
                        aria-label={known ? known.label : `Link ${index + 1}`}
                      />
                      <button
                        type="button"
                        className="idc-link-drop"
                        onClick={() => edit.dropLink(index)}
                        aria-label={`Remove link ${index + 1}`}
                      >
                        <X size={12} weight="bold" aria-hidden="true" />
                      </button>
                      {choosing === index && (
                        <div className="idc-marks" role="group" aria-label="Marks">
                          {LINK_ICONS.map(option => {
                            const Mark = option.Icon || GlobeSimple;
                            const on = (link.icon || 'auto') === option.name;
                            return (
                              <button
                                key={option.name}
                                type="button"
                                className={'idc-mark-opt' + (on ? ' idc-mark-opt--on' : '')}
                                onClick={() => { edit.setLinkIcon(index, option.name); setChoosing(null); }}
                                aria-pressed={on}
                                aria-label={option.label}
                                title={option.label}
                              >
                                {option.Icon
                                  ? <Mark size={17} weight="regular" aria-hidden="true" />
                                  : <span className="idc-mark-auto" aria-hidden="true">A</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Gone at the cap rather than disabled. A dead button is a
                    control you have to press to be told no; its absence is the
                    same answer without the press. */}
                {!edit.atLinkLimit && (
                <button type="button" className="idc-link-add" onClick={edit.addLink}>
                  <Plus size={11} weight="bold" aria-hidden="true" />
                  Add a link
                </button>
                )}

              </div>
            ) : (
            <div className="ab-links">
              {socials.map(({ href, label, Icon }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ab-link"
                  aria-label={label}
                  title={label}
                >
                  <Icon size={20} weight="regular" aria-hidden="true" />
                </a>
              ))}
            </div>
            )}
          </section>
        )}

      </div>
      )}

      {/* ── The machinery, at the foot of the card, 2026-09-19 ────────────
          The desk was a page of doors and it is gone; three of its four went
          to the band and this is the fourth, with the software's own line
          under it. Here rather than anywhere else because the card is the
          page about this journal and Settings is where the journal's own
          facts are kept — the address, the beacon, the key, the password.
          The rest of the card is what a visitor reads; this is the part only
          its keeper can see, at the bottom, where you go looking for it
          rather than past it.

          The door is gone from it, 2026-09-20. Settings went up into the ···
          at the head of this pane, where everything else you can do to this
          page already is — Miyel, "settings on ID card should live in the
          toolbar" — and a single door standing on its own down here was one
          the keeper had to remember the position of rather than one place to
          look. What is left is the line about the software, which is not a
          door and is not the keeper's business alone: it says which version
          this copy is running. */}
      {authed && (
        <section className="ab-keep" aria-label="This copy">
          {/* The one line about the software rather than the journal: which
              version this is, and — only when it is true — that there is a
              newer one. No Source: §13 is owed to visitors and this is the
              half of the page a visitor never sees; the pitch pane carries it
              for them. */}
          <p className="db-colophon">
            <a className="pt-source" href={RELEASE_URL} target="_blank" rel="noopener noreferrer" title="What this version contains">
              {VERSION}
            </a>
            {update && (
              <>
                <span className="pt-colophon-dot" aria-hidden="true">&middot;</span>
                <a className="db-update db-update--newer" href={update.page} target="_blank" rel="noopener noreferrer">
                  A newer version is available &#8599;
                </a>
              </>
            )}
            <span className="pt-colophon-dot" aria-hidden="true">&middot;</span>
            <Link className="db-update" href="/dashboard/report" title="Something did not work">
              Report a problem
            </Link>
          </p>
        </section>
      )}
    </div>
  );
}
