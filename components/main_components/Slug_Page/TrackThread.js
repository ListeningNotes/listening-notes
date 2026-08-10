'use client';
import { useState } from 'react';
import { fonts } from '../../../library/sitewide_visuals';
import StarRating from '../StarRating';
import CommentThread from './CommentThread';
import NewCommentForm from './NewCommentForm';

export default function TrackThread({ track, trackIndex, slug, commentsByTrack, onRefresh }) {
  const [open, setOpen] = useState(false);
  const trackComments = commentsByTrack[String(trackIndex)] || [];
  const count = trackComments.length;

  return (
    <div id={'track-' + trackIndex} style={{ borderBottom: '1px solid var(--border)' }}>
      <div onClick={() => setOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', cursor: 'pointer' }}>
        {/* Number reads left, flush with the page edge — right-aligning it in
            a fixed box was what made the row look indented. */}
        <span style={{ fontFamily: fonts.mono, fontSize: '10px', color: 'var(--ink-faint)', textAlign: 'left', flexShrink: 0 }}>{track.num}</span>
        <span className="ln-track-name" style={{ fontSize: '13px', color: 'var(--ink)', minWidth: 0 }}>{track.name}</span>
        {/* Everything else rides to the right edge together, so the comment
            pill always lands on the page's right margin. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto', flexShrink: 0 }}>
          {track.favorite && (
            <span title="Favourite song" style={{ fontSize: '11px', color: 'var(--gold)', lineHeight: 1 }}>♥</span>
          )}
          {track.stars > 0 && <StarRating rating={track.stars} size={12} />}
          <span style={{
            fontFamily: fonts.mono, fontSize: '9px', letterSpacing: '0.06em',
            color: count ? 'var(--ink)' : 'var(--ink-faint)',
            background: count ? 'var(--accent)' : 'var(--bg-warm)',
            border: '1px solid var(--border)',
            borderRadius: '999px', padding: '3px 10px', whiteSpace: 'nowrap',
            transition: 'all 0.15s',
          }}>
            {count ? count + ' comment' + (count > 1 ? 's' : '') : '+ comment'}
          </span>
        </div>
      </div>

      {/* The note carries no border of its own — the row's own bottom border
          already closes the track off, and having both drew two lines a few
          pixels apart. */}
      {track.note && (
        <p style={{ fontSize: '13px', lineHeight: 1.8, color: 'var(--ink-soft)', marginBottom: '20px', whiteSpace: 'pre-wrap' }}>{track.note}</p>
      )}

      {open && (
        <div style={{ paddingLeft: '32px', paddingBottom: '20px' }}>
          <NewCommentForm slug={slug} trackIndex={trackIndex} onPosted={onRefresh} />
          {trackComments.length === 0 && (
            <div style={{ fontFamily: fonts.mono, fontSize: '10px', color: 'var(--ink-faint)', paddingBottom: '8px' }}>No comments yet. Be the first.</div>
          )}
          {trackComments.map(c => (
            <CommentThread key={c.id} comment={c} slug={slug} onReplyPosted={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}
