// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/GridDensity.js
// The three-step "how big are the albums" control on the archive page —
// the same idea as pinching in and out of the iPhone Photos grid, but as
// three tap targets instead of a gesture.
//
// The steps are named by how big the album art is, not by column count,
// because the count differs per breakpoint: LARGE is 2 columns on a phone
// and roughly 5 on a wide desktop, SMALL is 4 and roughly 10. The actual
// column maths lives in styles/journal.css, keyed off the data-density attribute
// this control's value gets written to — see .arc-grid there.

'use client';

export const DENSITIES = ['large', 'medium', 'small'];
export const DEFAULT_DENSITY = 'medium';
const STORAGE_KEY = 'ln-archive-density';

// The choice is remembered between visits: someone who prefers to see the
// whole archive at a glance shouldn't have to re-pick it every time.
export function readStoredDensity() {
  if (typeof window === 'undefined') return DEFAULT_DENSITY;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return DENSITIES.includes(saved) ? saved : DEFAULT_DENSITY;
  } catch {
    return DEFAULT_DENSITY;
  }
}

export function storeDensity(value) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* private browsing / storage disabled — the control still works, it
       just won't be remembered next visit */
  }
}

// Each icon is literally the grid it produces: a 2x2, a 3x3 and a 4x4 of
// squares, drawn to the same 16px box so they line up as one row.
function GridGlyph({ n }) {
  const gap = 1.4;
  const cell = (16 - gap * (n - 1)) / n;
  const squares = [];
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      squares.push(
        <rect
          key={row + '-' + col}
          x={col * (cell + gap)}
          y={row * (cell + gap)}
          width={cell}
          height={cell}
          rx={Math.min(1.2, cell / 3)}
        />
      );
    }
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      {squares}
    </svg>
  );
}

const LABELS = { large: 'Large albums', medium: 'Medium albums', small: 'Small albums' };
const SIDES  = { large: 2, medium: 3, small: 4 };

export default function GridDensity({ value, onChange }) {
  return (
    <div className="gd" role="group" aria-label="Album size">
      {DENSITIES.map(d => (
        <button
          key={d}
          type="button"
          className={'gd-btn' + (value === d ? ' gd-btn--on' : '')}
          onClick={() => onChange(d)}
          aria-label={LABELS[d]}
          aria-pressed={value === d}
          title={LABELS[d]}
        >
          <GridGlyph n={SIDES[d]} />
        </button>
      ))}
    </div>
  );
}
