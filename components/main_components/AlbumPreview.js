// components/main_components/AlbumPreview.js
// The metadata card shown on the back of an archive tile once it's flipped
// (see FlipTile.js). The tile's own album art sits blurred behind it — this
// only renders the wash + text on top. Metadata only (album, artist, year,
// rating, listen type); the actual notes/review live on the entry's own
// page, one tap away via Read More.
//
// `scale` shrinks the whole card's type to match the grid's density step —
// the archive grid runs from 2 albums across to 4 on a phone, and the sizes
// below are drawn for the widest of those. Below 0.75 there simply isn't
// room for every line, so the two secondary ones drop out and the card
// keeps album / artist / stars / button. The button ignores the scale on
// its height: it's the way through to the entry, so it stays a real
// fingertip target at every step.

'use client';
import Link from 'next/link';
import { Heart, SketchLogo } from '@phosphor-icons/react';
import { fonts } from '../../library/sitewide_visuals';
import { useTheme } from './Lightswitch';
import StarRating from './StarRating';
import { parseTracksFromNotes, parseRating, entryTypeLabel } from '../../library/entry_formatter';

// An album counts as a masterpiece if it's flagged as one or if every track
// on it got five stars. Unchanged from what this card has always done — it's
// only pulled out here so EntryMarks below can ask the same question.
function isMasterpiece(entry) {
  const tracks = parseTracksFromNotes(entry.track_notes || entry.notes);
  const allTracksFive = tracks.length > 0 && tracks.every(t => t.stars === 5);
  return allTracksFive || entry.rating === 'Masterpiece';
}

// The two things a record can be marked as: a favourite and a masterpiece.
// Phosphor icons rather than text glyphs — drawn on one grid at one weight,
// so the pair sits evenly without the per-glyph size fudging the ♥/◆/💎
// attempts all needed. Colour comes from the wrapper's `color` (Phosphor
// defaults to currentColor), which keeps the palette in globals.css with
// everything else rather than hardcoded as props here.
//
// These used to be pinned to the corners of the tile, floating over the
// album art. They live on the metadata card now, and only at the widest
// grid step — at three and four across the card is already carrying as much
// as it can hold (see AlbumPreview below).
export function EntryMarks({ entry, size = 13 }) {
  const isFav = entry.favorite === true || entry.favorite === 'true';
  const mp = isMasterpiece(entry);
  if (!isFav && !mp) return null;
  return (
    <div className="ln-marks">
      {isFav && (
        <span className="ln-mark ln-mark--fav" role="img" aria-label="Favorite" title="Favorite">
          <Heart size={size} weight="fill" />
        </span>
      )}
      {mp && (
        <span className="ln-mark ln-mark--mp" role="img" aria-label="Masterpiece" title="Masterpiece">
          <SketchLogo size={size} weight="fill" />
        </span>
      )}
    </div>
  );
}

export default function AlbumPreview({ entry, scale = 1 }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const px = n => Math.round(n * scale * 10) / 10;
  // Only the widest step has the height for all five lines. A tile three
  // across on a phone is ~110px tall, and album / artist / stars / button
  // already fills it — the listen type and the Masterpiece flag are the two
  // that can go without costing you the ability to tell which record it is.
  const roomForDetail = scale >= 0.9;
  const masterpiece = isMasterpiece(entry);
  const isFav = entry.favorite === true || entry.favorite === 'true';
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
        justifyContent: 'center', padding: px(14), gap: px(8),
      }}>
        {/* minHeight 0 + overflow hidden let this block give way rather than
            push the button off the card: on a tile this small an unusually
            long album title would otherwise overflow at both ends and clip
            the title itself, which is the one line that has to survive. */}
        <div style={{ minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
          <div style={{
            fontFamily: fonts.sans, fontSize: px(13), fontWeight: 700, color: textColor, lineHeight: 1.25,
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {entry.album}
          </div>
          <div style={{
            fontFamily: fonts.sans, fontSize: px(10.5), color: textSoft, marginTop: px(3),
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {entry.artist}{entry.year && <> · {entry.year}</>}
          </div>

          {/* Rating and honours share one band: stars left, marks pushed
              right. Riding the star row costs no height, so unlike the
              listen type below they survive at every density — which
              matters now that they're no longer on the tile's face.

              display:flex, not the default block: StarRating is an
              inline-flex, so in a block parent it sits in a line box and
              picks up the strut's leading — ~14px of empty space under the
              stars, which is exactly what pushed the listen-type line off
              the bottom of the card. */}
          {(displayRating > 0 || ((masterpiece || isFav) && roomForDetail)) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: px(6), marginTop: px(6) }}>
              {displayRating > 0 && <StarRating rating={displayRating} size={px(15)} />}
              {/* Two albums across only. At three and four the card is down
                  to title, artist and stars — the marks are the first thing
                  to go, ahead of anything that says which record this is. */}
              {roomForDetail && (
                <div style={{ marginLeft: 'auto', display: 'flex' }}>
                  <EntryMarks entry={entry} size={px(13)} />
                </div>
              )}
            </div>
          )}
          {/* How it was heard and where it came from, on one line: FIRST
              LISTEN · SUBMISSION. Two facts of the same kind, so they read
              as one line of provenance rather than two stacked labels. The
              two fields can't collide — Submission was removed as a
              relationship, so it only ever appears as a type. */}
          {roomForDetail && (entry.relationship || entry.entry_type) && (
            <div style={{ marginTop: px(3), fontFamily: fonts.mono, fontSize: px(7.5), letterSpacing: '0.08em', textTransform: 'uppercase', color: textFaint }}>
              {[entry.relationship, entryTypeLabel(entry.entry_type)].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>

        <Link
          href={`/entries/${entry.slug}`}
          onClick={e => e.stopPropagation()}
          style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: 24, padding: `${px(6)}px ${px(8)}px`, borderRadius: px(8),
            background: pillBg, border: `1px solid ${pillBorder}`,
            color: textColor, fontFamily: fonts.sans, fontSize: px(10), fontWeight: 600,
            textDecoration: 'none', whiteSpace: 'nowrap',
          }}
        >
          {scale >= 0.7 ? 'Read More →' : 'Read →'}
        </Link>
      </div>
    </div>
  );
}
