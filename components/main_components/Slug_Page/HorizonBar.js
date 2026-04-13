'use client';
import { fonts } from '../../../library/sitewide_visuals';
import { parseHorizon } from '../../../library/entry_formatter';

export default function HorizonBar({ horizon, tracks, commentsByTrack, onBarClick }) {
  const bars = parseHorizon(horizon);
  if (!bars.length) return null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '52px' }}>
        {bars.map((h, i) => {
          const track = tracks[i];
          const count = (commentsByTrack[String(i)] || []).length;
          const label = track ? (i + 1) + '. ' + track.title : 'Track ' + (i + 1);
          return (
            <div
              key={i}
              onClick={() => onBarClick(i)}
              title={label}
              style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', cursor: 'pointer', position: 'relative' }}
            >
              {count > 0 && (
                <div style={{ position: 'absolute', top: '-8px', left: '50%', transform: 'translateX(-50%)', width: '5px', height: '5px', borderRadius: '50%', background: '#c8d47a' }} />
              )}
              <div
                style={{ borderRadius: '2px 2px 0 0', background: '#c8d47a', height: (h * 100) + '%', transition: 'background 0.15s, transform 0.1s', transformOrigin: 'bottom' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#e0ec9a'; e.currentTarget.parentNode.style.transform = 'scaleX(1.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#c8d47a'; e.currentTarget.parentNode.style.transform = 'scaleX(1)'; }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
        <span style={{ fontFamily: fonts.mono, fontSize: '9px', color: '#555', letterSpacing: '0.1em' }}>track 1</span>
        <span style={{ fontFamily: fonts.mono, fontSize: '9px', color: '#555', letterSpacing: '0.1em' }}>track {bars.length}</span>
      </div>
    </div>
  );
}
