// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useState } from 'react';

export default function StarRating({ value, onChange, size = 18 }) {
  const [hover, setHover] = useState(null);
  const display = hover ?? value;

  return (
    <div style={{ display: 'flex', gap: 1 }} onMouseLeave={() => setHover(null)}>
      {[1,2,3,4,5].map(n => {
        const filled = n <= display;
        const half = !filled && display >= n - 0.5 && display < n;
        return (
          <span key={n} style={{ position: 'relative', display: 'inline-block', width: size, height: size, cursor: 'pointer', flexShrink: 0 }}>
            <span style={{ position: 'absolute', inset: 0, width: '50%', zIndex: 10 }}
              onMouseEnter={() => setHover(n - 0.5)}
              onClick={() => onChange(value === n - 0.5 ? 0 : n - 0.5)} />
            <span style={{ position: 'absolute', left: '50%', top: 0, right: 0, bottom: 0, zIndex: 10 }}
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
