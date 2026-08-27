// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { backgroundScale } from '../../../library/background_scale';

const TILE  = 400;
const GAP   = 10;
const SPEED = 3;

export default function SplitScreen({ albums = [] }) {
  if (!albums.length) return null;

  // Split library in half so top and bottom rows never share an album
  const mid    = Math.ceil(albums.length / 2);
  const topSet = albums.slice(0, mid);
  const botSet = albums.slice(mid).length ? albums.slice(mid) : albums.slice(0, mid).reverse();

  // Duplicate once for seamless loop — visible window sees each album only once
  const topBand = [...topSet, ...topSet];
  const botBand = [...botSet, ...botSet];

  // Bands keep their desktop share of the width. 1 on desktop.
  const k     = backgroundScale();
  const tile  = Math.round(TILE * k);
  const gap   = Math.round(GAP * k);
  const step  = tile + gap;
  const topDuration = (step * topBand.length) / 2 / SPEED / 60;
  const botDuration = (step * botBand.length) / 2 / SPEED / 60;

  const keyframes = `
    @keyframes scrollLeft  { from { transform: translateX(0); }    to { transform: translateX(-50%); } }
    @keyframes scrollRight { from { transform: translateX(-50%); } to { transform: translateX(0);    } }
  `;

  const rowStyle = (dir, duration) => ({
    display: 'flex', gap, width: 'max-content', alignItems: 'center',
    animation: `${dir} ${duration}s linear infinite`,
    willChange: 'transform',
  });

  const imgStyle = {
    width: tile, height: tile,
    objectFit: 'cover', display: 'block', flexShrink: 0, borderRadius: Math.round(16 * k),
  };

  const halfStyle = { flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center' };

  return (
    <>
      <style>{keyframes}</style>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={halfStyle}>
          <div style={rowStyle('scrollLeft', topDuration)}>
            {topBand.map((entry, i) => <img key={i} src={entry.album_art} alt="" style={imgStyle} />)}
          </div>
        </div>
        <div style={halfStyle}>
          <div style={rowStyle('scrollRight', botDuration)}>
            {botBand.map((entry, i) => <img key={i} src={entry.album_art} alt="" style={imgStyle} />)}
          </div>
        </div>
      </div>
    </>
  );
}
