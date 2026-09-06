// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/JournalFilters.js
// The wall's filters: a sheet from the foot of the screen on a phone, a
// popover under its button on a desk. Sort, genre, release year, the three
// highlights, and the way out.
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
  hasActiveFilters, clearFilters, shownCount,
}) {
  // Drag-to-dismiss on the phone sheet. `drag` is how far down the finger
  // has pulled it; `settling` marks the moment after release, when the
  // transform is being animated rather than driven by the finger.
  const sheetRef = useRef(null);
  const dragFromRef = useRef(null);
  const [drag, setDrag] = useState(0);
  const [settling, setSettling] = useState(false);

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
          <div className="arc-scrim" onClick={onClose} />
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
                <YearRange bounds={yearBounds} value={yearRange} onChange={setYearPicked} />
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
              <button type="button" className="arc-opt arc-sheet-done" onClick={onClose}>
                Show {shownCount}
              </button>
            </div>
          </div>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

// Which way the active sort runs. Deliberately not a caret glyph from the
// font — at 9px those render at wildly different weights across platforms,
// and this sits inside a chip next to text that has to stay readable.
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
