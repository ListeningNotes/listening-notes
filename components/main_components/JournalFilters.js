// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/JournalFilters.js
// The wall's filters, dropping from the wall's line: what a record is, its
// marks, genre, release year, and the way out — and on a phone the album size
// too. Sort was here until
// the wall's views replaced it (Journal.js, Views, not sorting): this sheet
// only takes records away now, and the view on the line rearranges them.
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
// It is mounted only while open, so opening it fresh is a fresh sheet.
//
// ── It drops from the line, 2026-10-22 ────────────────────────────────────
// On a phone it was a sheet rising from the foot of the screen, pulled down
// to dismiss. The foot is the Listen bar's now, and the views drop from the
// line, so Miyel asked for the filters to match ("I like the dropdown"): on a
// phone the panel hangs under the whole line, the width of the screen less
// its gutters, the same shape as the views menu; on a desk it still hangs
// under its button. Either way it closes on a press anywhere else, on
// Escape, or on Show, and folds away as it goes (`leaving`).
'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CaretDown, Envelope, Fingerprint, Heart, SketchLogo } from '@phosphor-icons/react';
import { useHoldStill } from '../../hooks/useHoldStill';
import GridDensity from './GridDensity';

export default function JournalFilters({
  onClose, isPhone, scroller, anchorRef,
  kind, setKind,
  genre, setGenre, genres, genresShown, genresRest, genresOpen, setGenresOpen,
  yearBounds, yearRange, setYearPicked,
  favoritesOnly, setFavoritesOnly, masterpiecesOnly, setMasterpiecesOnly, formativeOnly, setFormativeOnly,
  sentOnly, setSentOnly,
  hasActiveFilters, clearFilters, shownCount, density, changeDensity, leaving = false,
}) {
  const sheetRef = useRef(null);
  // Genre is folded to its one line until pressed, unless it was left open.
  const [genreShown, setGenreShown] = useState(false);
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
  //
  // On a phone it hangs under the whole line rather than under the button,
  // and is never taller than what is left above the Listen bar: past that it
  // scrolls inside itself.
  useLayoutEffect(() => {
    // Its right edge on the button's, since the button sits at the right end
    // of the line and a panel hung from its left ran off the screen; its top
    // where the views menu's is, under the line. Never taller than what is
    // left above the Listen bar on a phone: past that it scrolls inside.
    const sheet = sheetRef.current;
    const r = anchorRef.current?.getBoundingClientRect();
    const line = anchorRef.current?.closest('.arc-bar')?.getBoundingClientRect();
    if (!sheet || !r || !line) return;
    const top = line.bottom + 6;
    sheet.style.left = `${Math.max(12, r.right - sheet.offsetWidth)}px`;
    sheet.style.top = `${top}px`;
    sheet.style.right = 'auto';
    sheet.style.maxHeight = `${Math.max(200, window.innerHeight - top - (isPhone ? 80 : 16))}px`;
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

  return (
    <>
          {/* A press anywhere off the panel closes it. */}
          <div ref={scrimRef} className="arc-scrim" onClick={onClose} />
          <div
            ref={sheetRef}
            className={'arc-sheet' + (leaving ? ' arc-sheet--leaving' : '')}
            role="dialog"
            aria-label="Filters"
          >
            {/* The views menu's own shape, a list, at its size (Miyel,
                2026-10-22: "i prefered the size of the sort view"), but drawn
                in glyphs where it is drawn in words, so the two read as two
                places: a glyph beside each word, hairlines between the parts.

                First what a record is (her "track vs album"): a cover's
                square, and the same square with its corner turned down, the
                way a record known by its tracks sits on the wall. Neither
                pressed is both; pressing the one that is on lets it go.
                Album is every record with a listen; Track every record with
                a track note, whether or not it also has a listen. */}
            <div className="arc-picks">
              <Pick on={kind === 'albums'} onClick={() => setKind(kind === 'albums' ? '' : 'albums')}
                glyph={<KindGlyph folded={false} on={kind === 'albums'} />} word="Album" />
              <Pick on={kind === 'tracks'} onClick={() => setKind(kind === 'tracks' ? '' : 'tracks')}
                glyph={<KindGlyph folded on={kind === 'tracks'} />} word="Track" />
            </div>
            <span className="arc-sheet-rule" aria-hidden="true" />

            {/* The marks, the session's glyphs in the session's colours and
                order, each keeping the wall to the records that wear it — and
                the fourth the wall's tiles wear, the envelope on a record
                somebody sent (her ask, "maybe submissions joins"), in ink. A
                submission here is what the feed calls one: sent, not credited
                by hand. Formative is the session's glyph, whatever that is at
                the time; bold, not fill, as the session has it. */}
            <div className="arc-picks">
              <Pick on={masterpiecesOnly} tone="mp" onClick={() => setMasterpiecesOnly(v => !v)}
                glyph={<SketchLogo size={18} weight={masterpiecesOnly ? 'fill' : 'regular'} aria-hidden="true" />} word="Masterpiece" />
              <Pick on={favoritesOnly} tone="fav" onClick={() => setFavoritesOnly(v => !v)}
                glyph={<Heart size={18} weight={favoritesOnly ? 'fill' : 'regular'} aria-hidden="true" />} word="Favorite" />
              <Pick on={formativeOnly} tone="formative" onClick={() => setFormativeOnly(v => !v)}
                glyph={<Fingerprint size={18} weight={formativeOnly ? 'bold' : 'regular'} aria-hidden="true" />} word="Formative" />
              <Pick on={sentOnly} onClick={() => setSentOnly(v => !v)}
                glyph={<Envelope size={18} weight={sentOnly ? 'fill' : 'regular'} aria-hidden="true" />} word="Submission" />
            </div>
            <span className="arc-sheet-rule" aria-hidden="true" />

            {/* Only worth a group once there's more than one genre to choose
                between — on a young archive it would be a row with a single
                option and nothing to compare it against. */}
            {genres.length > 1 && (
              <div className="arc-sheet-group">
                {/* Folded to one line, which says the genre the wall is kept
                    to, the way the year's line says its span: the panel reads
                    as glyphs at a glance and the words wait to be asked for. */}
                <button type="button" className="arc-sheet-label arc-sheet-label--door"
                  aria-expanded={genreShown} onClick={() => setGenreShown(v => !v)}>
                  Genre
                  <span className="arc-sheet-value">
                    {genre || 'All'}
                    <CaretDown size={9} weight="bold" aria-hidden="true" />
                  </span>
                </button>
                {genreShown && <div className="arc-sheet-opts">
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
                </div>}
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

            <span className="arc-sheet-rule" aria-hidden="true" />

            {/* On a phone the album size lives here, off the line — the
                line is the view's and the search field's, and a size is
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

// One row of the filters: a glyph beside its word. On, the word inks and
// underlines as a view does in its menu, and the glyph takes its mark's
// colour, or ink for the ones with none of their own.
function Pick({ on, onClick, glyph, word: said, tone = '' }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={'arc-pick' + (tone ? ` arc-pick--${tone}` : '') + (on ? ' arc-pick--on' : '')}>
      <span className="arc-pick-glyph">{glyph}</span>
      <span className="arc-pick-word">{said}</span>
    </button>
  );
}

// Album and Track: a cover's square, and the same square with its top right
// corner turned down, the way a record known by its tracks sits on the wall.
// Outlined off, filled on, as Favorite's heart is.
function KindGlyph({ folded, on }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {folded ? (
        <>
          <path d="M5 4.5h9.5L19.5 9.5V19.5H5Z" fill={on ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M14.5 4.5V9.5H19.5" fill="none" stroke={on ? 'var(--panel-solid)' : 'currentColor'}
            strokeWidth="1.5" strokeLinejoin="round" />
        </>
      ) : (
        <rect x="5" y="4.5" width="14.5" height="15" rx="1.5" fill={on ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth="1.5" />
      )}
    </svg>
  );
}

// A word among the genres: the class, on or off.
const word = on => 'ln-word arc-word' + (on ? ' ln-word--on' : '');

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
