'use client';
import { useState } from 'react';
import { fonts } from '../../../library/sitewide_visuals';
import CommentThread from './CommentThread';
import NewCommentForm from './NewCommentForm';

export default function TrackThread({ track, trackIndex, slug, commentsByTrack, onRefresh }) {
  const [open, setOpen] = useState(false);
  const trackComments = commentsByTrack[String(trackIndex)] || [];
  const count = trackComments.length;

  return (
    <div id={'track-' + trackIndex} style={{ borderBottom: '1px solid #2a2a2a' }}>
      <div onClick={() => setOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', cursor: 'pointer' }}>
        <span style={{ fontFamily: fonts.mono, fontSize: '10px', color: '#555', width: '20px', textAlign: 'right', flexShrink: 0 }}>{track.num}</span>
        <span style={{ fontSize: '13px', color: '#e8e4dc', flex: 1 }}>{track.name}</span>
        {track.stars > 0 && <span style={{ fontSize: '11px', color: '#c8d47a', letterSpacing: '1px' }}>{'★'.repeat(track.stars)}</span>}
        <span style={{
          fontFamily: fonts.mono, fontSize: '9px', letterSpacing: '0.06em',
          color: count ? '#c8d47a' : '#555',
          background: count ? 'rgba(200,212,122,0.08)' : '#1c1c1c',
          border: '1px solid ' + (count ? 'rgba(200,212,122,0.25)' : '#2a2a2a'),
          borderRadius: '999px', padding: '3px 10px', whiteSpace: 'nowrap', flexShrink: 0,
          transition: 'all 0.15s',
        }}>
          {count ? count + ' comment' + (count > 1 ? 's' : '') : '+ comment'}
        </span>
        <span style={{ fontSize: '10px', color: '#555', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>▶</span>
      </div>

      {track.note && (
        <p style={{ fontSize: '13px', lineHeight: 1.8, color: '#a8a49c', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #2a2a2a', whiteSpace: 'pre-wrap' }}>{track.note}</p>
      )}

      {open && (
        <div style={{ paddingLeft: '32px', paddingBottom: '20px' }}>
          <NewCommentForm slug={slug} trackIndex={trackIndex} onPosted={onRefresh} />
          {trackComments.length === 0 && (
            <div style={{ fontFamily: fonts.mono, fontSize: '10px', color: '#444', paddingBottom: '8px' }}>No comments yet. Be the first.</div>
          )}
          {trackComments.map(c => (
            <CommentThread key={c.id} comment={c} slug={slug} onReplyPosted={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}
