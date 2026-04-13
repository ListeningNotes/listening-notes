// components/StarRating.js
// Read-only star rating display component. Used on entry pages and the entry modal.
// Supports full and half stars.
// Note: this is the DISPLAY version — the interactive star input used in the session
// tool is a separate inline component defined in app/session/page.js.
//
// Props:
// - rating: number (0–5, supports .5 increments) or string like "4.5 stars"
// - size: pixel size of each star (default 18)
// - style: optional additional styles for the wrapper

'use client';

// SVG path for a single star shape — shared across all star instances
const STAR_PATH = 'M9 1.5l2.163 4.38 4.837.703-3.5 3.412.826 4.818L9 12.39l-4.326 2.273.826-4.818L2 6.583l4.837-.703z';

// Renders a single star SVG at the given size
function StarSVG({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" style={{ display: 'block' }}>
      <path d={STAR_PATH} fill="currentColor" />
    </svg>
  );
}

export default function StarRating({ rating, size = 18, style = {} }) {
  // Return nothing if no rating is provided
  if (!rating && rating !== 0) return null;
  const numeric = parseFloat(rating);
  if (isNaN(numeric)) return null;

  return (
    <div style={{ display: 'inline-flex', gap: 3, alignItems: 'center', ...style }}>
      {[1, 2, 3, 4, 5].map(i => {
        // Determine fill state for each star position
        const fill = numeric >= i ? 'full' : numeric >= i - 0.5 ? 'half' : 'empty';
        return (
          <div key={i} style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            {/* Dim background star — always visible as the "empty" state */}
            <div style={{ position: 'absolute', inset: 0, color: 'rgba(232,184,75,0.18)' }}>
              <StarSVG size={size} />
            </div>
            {/* Colored fill — full width for full star, half width for half star */}
            {fill !== 'empty' && (
              <div style={{
                position: 'absolute',
                inset: 0,
                overflow: 'hidden',
                width: fill === 'half' ? size / 2 : size,
                color: '#c8d47a',
              }}>
                <StarSVG size={size} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}