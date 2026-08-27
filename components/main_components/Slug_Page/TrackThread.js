// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { Heart } from '@phosphor-icons/react';
import { fonts } from '../../../library/sitewide_visuals';
import StarRating from '../StarRating';
import CommentBubble from './CommentBubble';

// `note` is the track's own note with any cross-references already turned
// into links — see FullPostPage for why the linking happens up there and not
// here. Falls back to the plain text so the component still stands alone.
export default function TrackThread({ track, note, trackIndex, slug, commentsByTrack, onRefresh }) {
  const trackComments = commentsByTrack[String(trackIndex)] || [];

  return (
    // Padding lives on the track itself, so the gap above the divider is the
    // same whether or not this track has a thread and a + comment under it.
    <div id={'track-' + trackIndex} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0' }}>
        {/* Number reads left, flush with the page edge — right-aligning it in
            a fixed box was what made the row look indented. */}
        <span style={{ fontFamily: fonts.mono, fontSize: '10px', color: 'var(--ink-faint)', textAlign: 'left', flexShrink: 0 }}>{track.num}</span>
        <span className="ln-track-name" style={{ fontSize: '13px', color: 'var(--ink)', minWidth: 0 }}>{track.name}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto', flexShrink: 0 }}>
          {track.favorite && (
            <span title="Favourite song" style={{ display: 'inline-flex', color: 'var(--fav, #f0484f)', lineHeight: 1 }}><Heart size={12} weight="fill" /></span>
          )}
          {track.stars > 0 && <StarRating rating={track.stars} size={12} />}
        </div>
      </div>

      {/* The note carries no border of its own — the row's own bottom border
          already closes the track off, and having both drew two lines a few
          pixels apart. */}
      {track.note && (
        <p style={{ fontSize: '13px', lineHeight: 1.8, color: 'var(--ink-soft)', marginBottom: '6px', whiteSpace: 'pre-wrap' }}>{note ?? track.note}</p>
      )}

      {/* The way in, at the end of the note you've just read. Lives in
          CommentBubble now, which the album notes share — see the note at the
          top of that file for why. */}
      <CommentBubble
        slug={slug}
        trackIndex={trackIndex}
        comments={trackComments}
        label={track.name}
        onRefresh={onRefresh}
      />
    </div>
  );
}
