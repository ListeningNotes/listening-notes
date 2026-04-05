'use client';

const STAR_PATH = 'M9 1.5l2.163 4.38 4.837.703-3.5 3.412.826 4.818L9 12.39l-4.326 2.273.826-4.818L2 6.583l4.837-.703z';

function StarSVG({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" style={{ display: 'block' }}>
      <path d={STAR_PATH} fill="currentColor" />
    </svg>
  );
}

export default function StarRating({ rating, size = 18, style = {} }) {
  if (!rating && rating !== 0) return null;
  const numeric = parseFloat(rating);
  if (isNaN(numeric)) return null;

  return (
    <div style={{ display: 'inline-flex', gap: 3, alignItems: 'center', ...style }}>
      {[1, 2, 3, 4, 5].map(i => {
        const fill = numeric >= i ? 'full' : numeric >= i - 0.5 ? 'half' : 'empty';
        return (
          <div key={i} style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            <div style={{ position: 'absolute', inset: 0, color: 'rgba(232,184,75,0.18)' }}>
              <StarSVG size={size} />
            </div>
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
