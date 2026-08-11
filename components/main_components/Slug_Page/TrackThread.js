'use client';
import { useState } from 'react';
import { fonts } from '../../../library/sitewide_visuals';
import StarRating from '../StarRating';
import CommentThread from './CommentThread';
import NewCommentForm from './NewCommentForm';

// The two actions sit under the track rather than in its title row, so it's
// visible that comments can be read and that one can be left. Before this the
// only affordance was the whole row being secretly clickable, which made an
// approved comment look like it had never posted.
const trackAction = {
  fontFamily: fonts.mono, fontSize: '9px', letterSpacing: '0.1em',
  textTransform: 'uppercase', background: 'transparent',
  border: '1px solid var(--border)', borderRadius: 999,
  padding: '7px 14px', cursor: 'pointer', whiteSpace: 'nowrap',
};

export default function TrackThread({ track, trackIndex, slug, commentsByTrack, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [composing, setComposing] = useState(false);
  const trackComments = commentsByTrack[String(trackIndex)] || [];
  const count = trackComments.length;

  return (
    <div id={'track-' + trackIndex} style={{ borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0' }}>
        {/* Number reads left, flush with the page edge — right-aligning it in
            a fixed box was what made the row look indented. */}
        <span style={{ fontFamily: fonts.mono, fontSize: '10px', color: 'var(--ink-faint)', textAlign: 'left', flexShrink: 0 }}>{track.num}</span>
        <span className="ln-track-name" style={{ fontSize: '13px', color: 'var(--ink)', minWidth: 0 }}>{track.name}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto', flexShrink: 0 }}>
          {track.favorite && (
            <span title="Favourite song" style={{ fontSize: '11px', color: 'var(--gold)', lineHeight: 1 }}>♥</span>
          )}
          {track.stars > 0 && <StarRating rating={track.stars} size={12} />}
        </div>
      </div>

      {/* The note carries no border of its own — the row's own bottom border
          already closes the track off, and having both drew two lines a few
          pixels apart. */}
      {track.note && (
        <p style={{ fontSize: '13px', lineHeight: 1.8, color: 'var(--ink-soft)', marginBottom: '16px', whiteSpace: 'pre-wrap' }}>{track.note}</p>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingBottom: '18px' }}>
        {count > 0 && (
          <button onClick={() => setOpen(v => !v)} style={{ ...trackAction, color: open ? 'var(--ink)' : 'var(--ink-soft)' }}>
            {open ? 'Close comments' : `Open comments (${count})`}
          </button>
        )}
        <button onClick={() => setComposing(true)} style={{ ...trackAction, color: 'var(--ink-soft)' }}>
          Add comment
        </button>
      </div>

      {open && (
        <div style={{ paddingBottom: '20px' }}>
          {trackComments.map(c => (
            <CommentThread key={c.id} comment={c} slug={slug} onReplyPosted={onRefresh} />
          ))}
        </div>
      )}

      {/* Posting is a modal rather than another drop-down: the drop-down is
          for reading, and a form unfolding inside the tracklist pushed
          everything below it down the page while you typed. */}
      {composing && (
        <div
          onClick={() => setComposing(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 600,
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '420px', boxSizing: 'border-box',
              background: 'var(--bg)', border: '1px solid var(--panel-border)',
              borderRadius: '20px', padding: '20px', boxShadow: 'var(--shadow-lift)',
              maxHeight: '80dvh', overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: fonts.mono, fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: '4px' }}>Add a comment</div>
                <div style={{ fontSize: '14px', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.name}</div>
              </div>
              <button
                onClick={() => setComposing(false)}
                aria-label="Close"
                style={{ fontFamily: fonts.mono, fontSize: '14px', color: 'var(--ink-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>
            <NewCommentForm
              slug={slug}
              trackIndex={trackIndex}
              onPosted={() => { setComposing(false); setOpen(true); onRefresh(); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
