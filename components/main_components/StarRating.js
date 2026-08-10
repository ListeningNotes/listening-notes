'use client';

const STAR_PATH = 'M9 1.5l2.163 4.38 4.837.703-3.5 3.412.826 4.818L9 12.39l-4.326 2.273.826-4.818L2 6.583l4.837-.703z';

function StarSVG({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" style={{ display: 'block' }}>
      <path d={STAR_PATH} fill="currentColor" />
    </svg>
  );
}

// `animate` wipes the gold in one star at a time, left to right, so the rating
// counts itself up on arrival. Opt-in — every rating in a list animating at
// once would be a mess. The .ln-star-fill keyframes are defined by whoever
// switches this on, the same way .ln-star-glow is defined in EntryModal.
export default function StarRating({ rating, size = 18, glow = false, animate = false, style = {} }) {
  if (!rating && rating !== 0) return null;
  const numeric = parseFloat(rating);
  if (isNaN(numeric)) return null;

  return (
    <div style={{ display: 'inline-flex', gap: 3, alignItems: 'center', ...style }}>
      {[1, 2, 3, 4, 5].map(i => {
        const fill = numeric >= i ? 'full' : numeric >= i - 0.5 ? 'half' : 'empty';
        return (
          <div key={i} className={glow ? 'ln-star-glow' : ''} style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            <div style={{ position: 'absolute', inset: 0, color: 'rgba(232,184,75,0.18)' }}>
              <StarSVG size={size} />
            </div>
            {fill !== 'empty' && (
              <div
                className={animate ? 'ln-star-fill' : undefined}
                style={{
                  position: 'absolute',
                  inset: 0,
                  overflow: 'hidden',
                  width: fill === 'half' ? size / 2 : size,
                  color: '#E8B84B',
                  ...(animate ? { animationDelay: ((i - 1) * 0.11) + 's' } : null),
                }}
              >
                <StarSVG size={size} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
