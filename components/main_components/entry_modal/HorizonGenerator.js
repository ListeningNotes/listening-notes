// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { fonts } from '../../../library/sitewide_visuals';

function parseHorizon(horizon) {
  if (!horizon) return [];
  const BLOCK_MAP = { '\u2581': 0.12, '\u2582': 0.25, '\u2583': 0.37, '\u2584': 0.50, '\u2585': 0.62, '\u2586': 0.75, '\u2587': 0.87, '\u2588': 1.00 };
  if (horizon.trim().startsWith('[')) {
    try {
      const arr = JSON.parse(horizon);
      if (Array.isArray(arr)) return arr.map(v => parseFloat(v) / 5);
    } catch {}
  }
  return [...horizon.trim()].filter(c => BLOCK_MAP[c]).map(c => BLOCK_MAP[c]);
}


export default function HorizonGenerator({ horizon, tracks, animate }) {
  const bars = parseHorizon(horizon);
  const trackBars = tracks.length > 0 ? tracks.map(t => t.stars / 5) : bars;
  if (!trackBars.length) return null;
  const barWidth = Math.min(trackBars.length * 14, 280);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '28px 0 24px', gap: 14 }}>
      <div style={{ fontFamily: fonts.mono, fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)', flexShrink: 0 }}>
        Horizon
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 32, width: barWidth }}>
        {trackBars.map((h, i) => {
          const track = tracks[i];
          return (
            <div key={i} className="ln-horizon-bar-wrap" style={{ position: 'relative', flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end' }}>
              {track && <div className="ln-horizon-tooltip">{track.name}</div>}
              <div
                className="ln-horizon-bar"
                style={{
                  width: '100%',
                  height: Math.round(h * 100) + '%',
                  background: 'var(--accent)',
                  borderRadius: '1px 1px 0 0',
                  transformOrigin: 'bottom',
                  transform: animate ? 'scaleY(1)' : 'scaleY(0)',
                  opacity: animate ? 1 : 0,
                  transition: animate
                    ? 'transform 0.5s cubic-bezier(0.34,1.4,0.64,1), opacity 0.3s ease'
                    : 'none',
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
