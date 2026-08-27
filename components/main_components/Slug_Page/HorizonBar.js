// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { Heart } from '@phosphor-icons/react';
import { fonts } from '../../../library/sitewide_visuals';
import { parseHorizon } from '../../../library/entry_formatter';

export default function HorizonBar({ horizon, tracks, commentsByTrack, onBarClick }) {
  const bars = parseHorizon(horizon);
  if (!bars.length) return null;

  return (
    // Headroom for the marks. They used to hang off the top of the row with
    // nothing above them to hang into.
    <div style={{ paddingTop: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '52px' }}>
        {bars.map((h, i) => {
          const track = tracks[i];
          const count = (commentsByTrack[String(i)] || []).length;
          const label = track ? (i + 1) + '. ' + track.name : 'Track ' + (i + 1);
          const fav = !!track?.favorite;
          return (
            <div
              key={i}
              onClick={() => onBarClick(i)}
              title={label}
              style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', cursor: 'pointer', position: 'relative' }}
            >
              {/* One row holding both marks, so a favourite that also has
                  comments reads as two things side by side. The heart used to
                  be pinned to the top of its own bar, which put it under the
                  comment dot on a tall bar and inside the bar's click area.
                  pointerEvents:none keeps the whole column clickable through
                  them — the marks are labels, not targets. */}
              {(count > 0 || fav) && (
                <div style={{
                  position: 'absolute', bottom: '100%', marginBottom: '4px', left: '50%',
                  transform: 'translateX(-50%)', display: 'flex', alignItems: 'center',
                  gap: '3px', lineHeight: 1, pointerEvents: 'none',
                }}>
                  {fav && (
                    <span style={{ display: 'inline-flex', color: 'var(--fav, #f0484f)', lineHeight: 1 }}>
                      <Heart size={10} weight="fill" />
                    </span>
                  )}
                  {count > 0 && (
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent)' }} />
                  )}
                </div>
              )}
              <div
                style={{ borderRadius: '2px 2px 0 0', background: 'var(--accent)', height: (h * 100) + '%', transition: 'filter 0.15s, transform 0.1s', transformOrigin: 'bottom' }}
                onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.12)'; e.currentTarget.parentNode.style.transform = 'scaleX(1.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.parentNode.style.transform = 'scaleX(1)'; }}
              />
            </div>
          );
        })}
      </div>
      {/* Track titles on a diagonal beneath their own bar — the end of each
          title points at the bar it belongs to. Replaces the old "track 1 /
          track N" endpoints, which said nothing about the shape. */}
      <div style={{ display: 'flex', gap: '3px', height: bars.length > 20 ? 62 : 76, marginTop: '6px' }}>
        {bars.map((_, i) => {
          const track = tracks[i];
          return (
            <div key={i} style={{ flex: 1, minWidth: 0, position: 'relative' }}>
              <span style={{
                position: 'absolute', top: 0, right: '50%',
                transformOrigin: '100% 0', transform: 'rotate(-52deg)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                maxWidth: bars.length > 20 ? 78 : 104, display: 'block', textAlign: 'right',
                fontFamily: fonts.mono, fontSize: '9.5px', lineHeight: 1.2,
                color: 'var(--ink-faint)', pointerEvents: 'none',
              }}>
                {track ? track.name : i + 1}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
