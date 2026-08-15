'use client';
import { Heart } from '@phosphor-icons/react';
import { fonts, colors } from '../../library/sitewide_visuals';

// One horizon renderer for every surface that draws one during a session —
// Album Notes, Score and Preview. Every bar shares a single baseline because
// they're all flex children of one flex-end row; the old Preview drew the
// horizon as block characters (▁▂▃█), which fell back to a different font per
// glyph and left the bars sitting on inconsistent baselines.
//
// labels=true writes each track title on a diagonal beneath its own bar.

export default function HorizonChart({
  tracks = [],
  trackRatings = {},
  favorites = null,          // index-keyed map; falls back to tracks[i].favorite
  height = 130,
  labels = false,
  color = 'rgba(255,255,255,0.82)',
  emptyColor = 'rgba(255,255,255,0.13)',
  labelColor = 'rgba(255,255,255,0.45)',
  animate = true,
}) {
  if (!tracks.length) return null;

  const isFav = i => (favorites ? !!favorites[i] : !!tracks[i]?.favorite);

  const gap      = tracks.length > 24 ? 2 : tracks.length > 14 ? 3 : 4;
  const labelH   = labels ? (tracks.length > 20 ? 62 : 76) : 0;
  const labelMax = tracks.length > 20 ? 78 : 104;

  return (
    // Headroom above the bars. A 5-star bar fills the row exactly, so without
    // this its top sits flush against whatever is above it — and the ♥ on a
    // 5-star favourite is drawn above the row entirely, landing on the label.
    // Both read as a bar that's been cut off rather than one that peaked.
    <div style={{ width: '100%', paddingTop: 13 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap, height }}>
        {tracks.map((t, i) => {
          const r = trackRatings?.[i] || 0;
          const fav = isFav(i);
          return (
            <div
              key={i}
              title={`${t.number || i + 1}. ${t.title}${r ? ` — ${r} / 5` : ' — unrated'}${fav ? ' ♥' : ''}`}
              style={{
                flex: 1, minWidth: 0, height: '100%',
                display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                position: 'relative',
              }}
            >
              {fav && (
                // Phosphor's Heart, same as the marks on an archive card —
                // inline-flex so the icon isn't sitting on a text baseline.
                <span style={{
                  position: 'absolute', bottom: `calc(${Math.max(3, (r / 5) * 100)}% + 4px)`,
                  left: '50%', transform: 'translateX(-50%)',
                  display: 'inline-flex', lineHeight: 1, color: colors.fav, pointerEvents: 'none',
                }}><Heart size={10} weight="fill" /></span>
              )}
              <div style={{
                width: '100%',
                height: `${Math.max(3, (r / 5) * 100)}%`,
                background: r ? color : emptyColor,
                borderRadius: '3px 3px 0 0',
                transition: animate ? 'height 0.3s cubic-bezier(0.34,1.2,0.64,1), background 0.2s' : 'none',
              }} />
            </div>
          );
        })}
      </div>

      {labels && (
        <div style={{ display: 'flex', gap, height: labelH, marginTop: 6 }}>
          {tracks.map((t, i) => (
            <div key={i} style={{ flex: 1, minWidth: 0, position: 'relative' }}>
              {/* Anchored at the bar's centre and rotated down-left, so the end
                  of each title points at the bar it belongs to. */}
              <span style={{
                position: 'absolute', top: 0, right: '50%',
                transformOrigin: '100% 0',
                transform: 'rotate(-52deg)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                maxWidth: labelMax, display: 'block', textAlign: 'right',
                fontFamily: fonts.mono, fontSize: 9.5, lineHeight: 1.2,
                color: labelColor, pointerEvents: 'none',
              }}>
                {t.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
