// components/main_components/AlbumPreview.js
// The metadata overlay shown on a recent-listen tile after it's tapped.
// The tile's own album art blurs and dims in place behind it (handled in
// AlbumStrip.js/globals.css) — this only renders the wash + text on top.
// Metadata only (album, artist, year, rating, listen type) — the actual
// notes/review live on the entry's own page, one tap away via Read More.

'use client';
import Link from 'next/link';
import { fonts } from '../../library/sitewide_visuals';
import { useTheme } from './Lightswitch';
import StarRating from './StarRating';
import { parseTracksFromNotes, parseRating } from '../../library/entry_formatter';

export default function AlbumPreview({ entry }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const tracks = parseTracksFromNotes(entry.track_notes || entry.notes);
  const allTracksFive = tracks.length > 0 && tracks.every(t => t.stars === 5);
  const masterpiece = allTracksFive || entry.rating === 'Masterpiece';
  const displayRating = masterpiece ? 5 : parseRating(entry.rating);

  // Dark mode keeps a dark wash + white text over the blurred/dimmed art.
  // Day mode needs the opposite contrast direction — a bright wash with
  // dark text — rather than the same dark treatment on both.
  const washColor = isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.68)';
  const textColor = isDark ? '#fff' : '#1c1c1c';
  const textSoft = isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.62)';
  const textFaint = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  const pillBg = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.08)';
  const pillBorder = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.18)';

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0, background: washColor }} />

      <div style={{
        position: 'relative', height: '100%', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: 14, gap: 10,
      }}>
        <div>
          <div style={{ fontFamily: fonts.sans, fontSize: 13, fontWeight: 700, color: textColor, lineHeight: 1.25 }}>
            {entry.album}
          </div>
          <div style={{ fontFamily: fonts.sans, fontSize: 10.5, color: textSoft, marginTop: 3 }}>
            {entry.artist}{entry.year && <> · {entry.year}</>}
          </div>

          {displayRating > 0 && (
            <div style={{ marginTop: 9 }}>
              <StarRating rating={displayRating} size={15} />
            </div>
          )}
          {masterpiece && (
            <div style={{ marginTop: 6, fontFamily: fonts.mono, fontSize: 7.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#E8B84B', fontWeight: 600 }}>
              Masterpiece
            </div>
          )}
          {entry.relationship && (
            <div style={{ marginTop: 6, fontFamily: fonts.mono, fontSize: 7.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: textFaint }}>
              {entry.relationship}
            </div>
          )}
        </div>

        <Link
          href={`/entries/${entry.slug}`}
          onClick={e => e.stopPropagation()}
          style={{
            flexShrink: 0, textAlign: 'center', padding: '6px 8px', borderRadius: 8,
            background: pillBg, border: `1px solid ${pillBorder}`,
            color: textColor, fontFamily: fonts.sans, fontSize: 10, fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Read More →
        </Link>
      </div>
    </div>
  );
}
