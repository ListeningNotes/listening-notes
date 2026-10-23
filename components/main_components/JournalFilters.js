// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/JournalFilters.js
// The wall's filters: a sheet from the foot of the screen on a phone, a
// popover under its button on a desk. Sort, genre, release year, the three
// highlights, and the way out — and on a phone the album size too.
//
// ── In the site's own language, 2026-10-22 ────────────────────────────────
// Miyel's brief, the wall's filters: this was the last screen still built of
// pills and boxes. Every choice is a word now, faint off and inked and
// underlined on (`.ln-word`); the highlights are the session's own marks, a
// glyph over a word in its colour; and the way out is the same word,
// heavier. Same filters, same results — only how they are said changed.
//
// Journal owns every filter value — it is the one doing the filtering — and
// this owns only how the sheet behaves: where the popover hangs, the pull
// down that dismisses it on a phone, the scroll lock underneath, Escape.
// It is mounted only while open, so opening it fresh is a fresh sheet: there
// is no drag offset to reset because there is nothing left over.
//
// The sort options live here rather than in Journal because both the bar and
// the sheet read them, and the sheet is what explains them.
'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Fingerprint, Heart, SketchLogo } from '@phosphor-icons/react';
import { useHoldStill } from '../../hooks/useHoldStill';
import GridDensity from './GridDensity';

export const SORTS = [
  { value: 'posted', label: 'Date posted',  defaultDir: 'desc', asc: 'Oldest first', desc: 'Newest first' },
  { value: 'album',  label: 'Album',        defaultDir: 'asc',  asc: 'A–Z',          desc: 'Z–A' },
  { value: 'artist', label: 'Artist',       defaultDir: 'asc',  asc: 'A–Z',          desc: 'Z–A' },
  { value: 'rating', label: 'Rating',       defaultDir: 'desc', asc: 'Lowest first', desc: 'Highest first' },
  { value: 'year',   label: 'Release year', defaultDir: 'desc', asc: 'Oldest first', desc: 'Newest first' },
];

export default function JournalFilters({
  onClose, isPhone, scroller, anchorRef,
  sortBy, sortDir, chooseSort, activeSort,
  genre, setGenre, genres, genresShown, genresRest, genresOpen, setGenresOpen,
  yearBounds, yearRange, setYearPicked,
  favoritesOnly, setFavoritesOnly, masterpiecesOnly, setMasterpiecesOnly, formativeOnly, setFormativeOnly,
  hasActiveFilters, clearFilters, shownCount, density, changeDensity,
}) {
  // Drag-to-dismiss on the phone sheet. `drag` is how far down the finger
  // has pulled it; `settling` marks the moment after release, when the
  // transform is being animated rather than driven by the finger.
  const sheetRef = useRef(null);
  const dragFromRef = useRef(null);
  const [drag, setDrag] = useState(0);
  const [settling, setSettling] = useState(false);
  // The scrim is what useHoldStill walks up from: it is present for exactly
  // as long as this sheet is, and it is inside whatever is behind it.
  const scrimRef = useRef(null);

  // Nothing behind the sheet moves while it is open. This used to lock one
  // element — the wall's own scroller, guessed at from the prop below — and
  // inside the cross there are two more above it, the pane and the rail, both
  // of which went on scrolling under the sheet. See hooks/useHoldStill.js.
  useHoldStill(scrimRef, isPhone);

  // Measured after the open commits, off the live layout — reading the rect
  // inside the click handler catches whatever the bar looked like before
  // React had re-rendered it, which is a different place on the screen.
  // Written straight onto the popover rather than into state: a layout
  // effect runs before the browser paints, so the popover is never seen
  // anywhere but under its button, and there is no second render to pay for.
  useLayoutEffect(() => {
    if (isPhone) return;
    const r = anchorRef.current?.getBoundingClientRect();
    const sheet = sheetRef.current;
    if (!r || !sheet) return;
    sheet.style.left = `${r.left}px`;
    sheet.style.top = `${r.bottom + 8}px`;
    sheet.style.right = 'auto';
  }, [isPhone, anchorRef]);

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);

    // The phone sheet holds the page still (useHoldStill, above). The desktop
    // popover is small and pinned to its button, so locking the page would
    // pull the scrollbar out and shift the bar sideways underneath the panel
    // it is anchored to — it closes on scroll instead.
    let cleanupScroll = () => {};
    if (!isPhone) {
      // Whatever is moving, which on the cross is a pane and not the window.
      // Listening on window there would be listening to something that never
      // scrolls, and the popover would hang over the grid as it went past.
      const port = scroller?.current || window;
      const onScroll = () => onClose();
      port.addEventListener('scroll', onScroll, { passive: true });
      cleanupScroll = () => port.removeEventListener('scroll', onScroll);
    }

    return () => {
      window.removeEventListener('keydown', onKey);
      cleanupScroll();
    };
  }, [isPhone, scroller, onClose]);

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
      setTimeout(onClose, 180);
    } else {
      setDrag(0);                            // spring back
    }
  }

  return (
    <>
          {/* A pull down anywhere over the covers puts the sheet away, on the
              same handlers the grip uses rather than a second gesture written
              out again: with the page behind held still, a downward drag over
              the scrim had nothing left to do, and the thing somebody is
              plainly reaching for when they do it is out. A tap still closes.
              Phone only — on a desk this is an anchored popover and there is
              no sheet to drag anywhere. */}
          <div
            ref={scrimRef}
            className="arc-scrim"
            onClick={onClose}
            onPointerDown={isPhone ? onGripDown : undefined}
            onPointerMove={isPhone ? onGripMove : undefined}
            onPointerUp={isPhone ? onGripUp : undefined}
          />
          <div
            ref={sheetRef}
            className={'arc-sheet'
              + (drag > 0 && !settling ? ' arc-sheet--dragging' : '')
              + (settling ? ' arc-sheet--settling' : '')}
            role="dialog"
            aria-label="Filters"
            style={drag > 0 || settling ? { transform: `translateY(${drag}px)` } : undefined}
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
                onClick={() => { if (drag === 0) onClose(); }}
              />
            )}

            {isPhone && (
              <div className="arc-sheet-group">
                {/* What the arrow means rides on the label's own line, the
                    way the year's readout does: a line of its own under the
                    words was a row of the sheet spent on two words. */}
                <div className="arc-sheet-label">
                  Sort
                  <span className="arc-sheet-value">{activeSort[sortDir]}</span>
                </div>
                <div className="arc-sheet-opts">
                  {/* The word you're on carries the arrow, and tapping it
                      again turns it over — so the control shows both which
                      field is sorting and which way, in one place. */}
                  {SORTS.map(s => {
                    const on = sortBy === s.value;
                    return (
                      <button key={s.value} type="button"
                        className={word(on)}
                        aria-pressed={on}
                        title={on ? s[sortDir] : undefined}
                        onClick={() => chooseSort(s.value)}>
                        {s.label}
                        {on && <SortArrow dir={sortDir} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Only worth a group once there's more than one genre to choose
                between — on a young archive it would be a row with a single
                option and nothing to compare it against. */}
            {genres.length > 1 && (
              <div className="arc-sheet-group">
                <div className="arc-sheet-label">Genre</div>
                <div className="arc-sheet-opts">
                  <button type="button" className={word(!genre)} aria-pressed={!genre} onClick={() => setGenre('')}>All</button>
                  {genresShown.map(g => (
                    <button key={g.name} type="button"
                      className={word(genre === g.name)} aria-pressed={genre === g.name}
                      onClick={() => setGenre(genre === g.name ? '' : g.name)}>{g.name}</button>
                  ))}
                  {/* A hidden genre that's currently doing the filtering still
                      shows, collapsed or not — otherwise the archive would be
                      filtered by something with nothing on screen saying so. */}
                  {genresRest.map(g => (
                    (genresOpen || genre === g.name) && (
                      <button key={g.name} type="button"
                        className={word(genre === g.name)} aria-pressed={genre === g.name}
                        onClick={() => setGenre(genre === g.name ? '' : g.name)}>{g.name}</button>
                    )
                  ))}
                  {genresRest.length > 0 && (
                    <button type="button" className={word(false)} onClick={() => setGenresOpen(v => !v)}>
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
                <YearRange bounds={yearBounds} value={yearRange} onChange={setYearPicked} />
              </div>
            )}

            {/* The session's marks, drawn the way its album screen draws
                them (session.css, .ses-mark) and named the same — a mark here
                is the mark you gave the record there, and turning one on
                keeps the wall to the records that wear it. In the session's
                order too. Formative is the session's glyph, whatever that is
                at the time. */}
            <div className="arc-sheet-group">
              <div className="arc-sheet-label">Highlights</div>
              <div className="arc-marks">
                <button type="button" className={mark(masterpiecesOnly, 'mp')}
                  aria-pressed={masterpiecesOnly} onClick={() => setMasterpiecesOnly(v => !v)}>
                  <SketchLogo size={24} weight={masterpiecesOnly ? 'fill' : 'regular'} aria-hidden="true" />
                  <span className="ses-mark-word">Masterpiece</span>
                </button>
                <button type="button" className={mark(favoritesOnly, 'fav')}
                  aria-pressed={favoritesOnly} onClick={() => setFavoritesOnly(v => !v)}>
                  <Heart size={24} weight={favoritesOnly ? 'fill' : 'regular'} aria-hidden="true" />
                  <span className="ses-mark-word">Favorite</span>
                </button>
                <button type="button" className={mark(formativeOnly, 'formative')}
                  aria-pressed={formativeOnly} onClick={() => setFormativeOnly(v => !v)}>
                  {/* Bold, not fill, as the session has it: Phosphor's filled
                      fingerprint is a solid pad with the ridges knocked out. */}
                  <Fingerprint size={24} weight={formativeOnly ? 'bold' : 'regular'} aria-hidden="true" />
                  <span className="ses-mark-word">Formative</span>
                </button>
              </div>
            </div>

            {/* On a phone the album size lives here, off the bar, the way
                sort does — the bar is the search field's, and a size is
                picked once and remembered. Unlabelled, as it was in the bar:
                each glyph is the grid it makes. The way out is the same word
                as the choices, heavier — not a submit button. */}
            <div className="arc-sheet-foot">
              {isPhone && <GridDensity value={density} onChange={changeDensity} />}
              <span className="arc-sheet-ways">
                {hasActiveFilters && <button type="button" className={word(false)} onClick={clearFilters}>Clear all</button>}
                <button type="button" className="ln-word ln-word--on arc-sheet-done" onClick={onClose}>
                  Show {shownCount}
                </button>
              </span>
            </div>
          </div>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

// A choice in the sheet, and a mark: the classes, on or off.
const word = on => 'ln-word arc-word' + (on ? ' ln-word--on' : '');
const mark = (on, kind) => `ses-mark ses-mark--${kind}${on ? ' ses-mark--on' : ''}`;

// Which way the active sort runs. Deliberately not a caret glyph from the
// font — at 9px those render at wildly different weights across platforms,
// and this sits inside a word that has to stay readable.
export function SortArrow({ dir }) {
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
