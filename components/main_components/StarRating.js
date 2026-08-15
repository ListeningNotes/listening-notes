'use client';
import { useEffect, useRef } from 'react';
import { goldBurst } from '../../library/gold_burst';

const STAR_PATH = 'M9 1.5l2.163 4.38 4.837.703-3.5 3.412.826 4.818L9 12.39l-4.326 2.273.826-4.818L2 6.583l4.837-.703z';

function StarSVG({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" style={{ display: 'block' }}>
      <path d={STAR_PATH} fill="currentColor" />
    </svg>
  );
}

// `animate` lights every star at once on arrival. It used to stagger them
// 0.34s apart so the rating counted itself out one to five, which meant the
// fifth star didn't land until a second and a half in — on a phone that read
// as the page being slow rather than as an effect.
//
// `burst` throws the same gold sparkle the Surprise dot uses, once, as the
// stars finish. Reserved for a masterpiece: it's the moment the row fills.
// The .ln-star-fill keyframes are defined by whoever switches this on, the
// same way .ln-star-glow is in EntryModal.
export default function StarRating({ rating, size = 18, glow = false, animate = false, burst = false, style = {} }) {
  const rowRef = useRef(null);

  useEffect(() => {
    if (!burst) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const el = rowRef.current;
    if (!el) return;
    // The phone and desktop layouts both render this row and hide one with
    // display:none. A hidden copy measures 0×0 — firing from it would spray
    // the sparkle out of the top-left corner of the page.
    const box = el.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const t = setTimeout(() => {
      goldBurst(
        { clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 },
        { count: 24, spread: 70 },
      );
    }, 240);
    return () => clearTimeout(t);
  }, [burst]);

  if (!rating && rating !== 0) return null;
  const numeric = parseFloat(rating);
  if (isNaN(numeric)) return null;

  return (
    <div ref={rowRef} style={{ display: 'inline-flex', gap: 3, alignItems: 'center', ...style }}>
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
