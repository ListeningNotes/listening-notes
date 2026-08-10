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
        <span style={{ fontFamily: fonts.mono, fontSize: '10px', color: 'var(--ink-faint)', width: '20px', textAlign: 'right', flexShrink: 0 }}>{track.num}</span>
        <span style={{ fontSize: '13px', color: 'var(--ink)', flex: 1 }}>{track.name}</span>
        {track.favorite && (
          <span title="Favourite song" style={{ fontSize: '11px', color: 'var(--gold)', flexShrink: 0, lineHeight: 1 }}>♥</span>
        )}
        {track.stars > 0 && <StarRating rating={track.stars} size={12} />}
        <span style={{
          fontFamily: fonts.mono, fontSize: '9px', letterSpacing: '0.06em',
          color: count ? 'var(--ink)' : 'var(--ink-faint)',
          background: count ? 'var(--accent)' : 'var(--bg-warm)',
          border: '1px solid var(--border)',
          borderRadius: '999px', padding: '3px 10px', whiteSpace: 'nowrap', flexShrink: 0,
          transition: 'all 0.15s',
        }}>
          {count ? count + ' comment' + (count > 1 ? 's' : '') : '+ comment'}
        </span>
        <span style={{ fontSize: '10px', color: 'var(--ink-faint)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>▶</span>
      </div>

      {track.note && (
        <p style={{ fontSize: '13px', lineHeight: 1.8, color: 'var(--ink-soft)', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--border)', whiteSpace: 'pre-wrap' }}>{track.note}</p>
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
