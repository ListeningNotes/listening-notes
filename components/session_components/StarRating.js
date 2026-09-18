// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useState } from 'react';

// `roomy` is the same stars with a thumb-sized target under them, 2026-09-17.
//
// Each star is split down the middle so half ratings can be picked, which makes
// the real target half a star wide — seven pixels across in a tracklist at
// size 14, against the ~44 a fingertip actually covers. Reading it was fine;
// pressing it was aiming.
//
// The glyphs do not grow to fix that, or a tracklist becomes a column of
// controls. The *hit areas* grow instead: each half reaches well above and
// below its star and a little into the gap beside it, on `padding` with a
// matching negative `margin`, so the row keeps the height it had. The stars
// look the same and the target is four times the size.
export default function StarRating({ value, onChange, size = 18, roomy = false }) {
  const [hover, setHover] = useState(null);
  const display = hover ?? value;
  // How far each half reaches past its own star. Enough to clear 44px of
  // height at the sizes this is used at, and half the gap either side.
  const reach = roomy ? Math.max(10, Math.round((44 - size) / 2)) : 0;
  const grip = roomy
    ? { padding: `${reach}px ${Math.round(reach / 3)}px`, margin: `-${reach}px -${Math.round(reach / 3)}px` }
    : null;

  return (
    <div style={{ display: 'flex', gap: roomy ? 7 : 1 }} onMouseLeave={() => setHover(null)}>
      {[1,2,3,4,5].map(n => {
        const filled = n <= display;
        const half = !filled && display >= n - 0.5 && display < n;
        return (
          <span key={n} style={{ position: 'relative', display: 'inline-block', width: size, height: size, cursor: 'pointer', flexShrink: 0 }}>
            <span style={{ position: 'absolute', inset: 0, width: '50%', zIndex: 10, ...grip }}
              onMouseEnter={() => setHover(n - 0.5)}
              onClick={() => onChange(value === n - 0.5 ? 0 : n - 0.5)} />
            <span style={{ position: 'absolute', left: '50%', top: 0, right: 0, bottom: 0, zIndex: 10, ...grip }}
              onMouseEnter={() => setHover(n)}
              onClick={() => onChange(value === n ? 0 : n)} />
            <span style={{ position: 'absolute', inset: 0, color: '#d0ccc5', fontSize: size, lineHeight: 1, userSelect: 'none' }}>★</span>
            {(filled || half) && (
              <span style={{ position: 'absolute', inset: 0, overflow: 'hidden', width: filled ? size : size / 2, color: '#E8B84B', fontSize: size, lineHeight: 1, userSelect: 'none' }}>★</span>
            )}
          </span>
        );
      })}
    </div>
  );
}
