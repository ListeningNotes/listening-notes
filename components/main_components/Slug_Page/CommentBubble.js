// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useState } from 'react';
import { fonts } from '../../../library/sitewide_visuals';
import CommentThread from './CommentThread';
import NewCommentForm from './NewCommentForm';

// Everything behind the little speech bubble: the count, the thread it folds
// open, and the modal you post from. It lived inside TrackThread until the
// album notes needed the same thing — copying it would have meant two places
// to keep in step, and the whole point is that commenting on the album feels
// identical to commenting on a track.
//
// `trackIndex` is what the comment is attached to: 0…n for a track, -1 for the
// album as a whole. That -1 is not a new convention — save_comment has always
// written it for a comment that names no track, and the moderation inbox
// already reads `track_index >= 0` to decide whether to print "· track 4".
// Nothing on the page had ever asked for the bucket, so nothing showed it.

// Quiet text, the same language the actions inside a thread already speak
// (↑ 0 / reply / collapse). A pill read as a button and pulled the eye away
// from the writing, which is the thing on this page worth looking at.
const quietAction = {
  fontFamily: fonts.mono, fontSize: '9px', letterSpacing: '0.1em',
  textTransform: 'uppercase', color: 'var(--ink-faint)',
  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
};

export default function CommentBubble({ slug, trackIndex, comments = [], label, onRefresh }) {
  // Comments are simply there. Hiding them behind a control was solving a
  // volume problem this site doesn't have, and it's what made an approved
  // comment look like it had never posted.
  const [showComments, setShowComments] = useState(true);
  const [composing, setComposing] = useState(false);
  const count = comments.length;

  return (
    <>
      {/* The way in, at the end of the note you've just read. With comments it
          carries the count and folds the thread; with none it carries a plus
          and opens the modal.

          The spacing here is deliberate and easy to undo by accident: it sits
          6px under the note, and only spaces itself away from what follows
          when a thread is actually open below it. Given its own margins it
          stacked three gaps — above, below, and the track's own padding — for
          a mark 16px tall, which cost 33px on every track. */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: count > 0 && showComments ? '16px' : '0' }}>
        <button
          onClick={() => (count > 0 ? setShowComments(v => !v) : setComposing(true))}
          aria-label={count === 0 ? 'Add the first comment' : showComments ? 'Hide comments' : 'Show comments'}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            color: count > 0 && showComments ? 'var(--ink-soft)' : 'var(--ink-faint)',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
          <span style={{ fontFamily: fonts.mono, fontSize: '10px' }}>{count > 0 ? count : '+'}</span>
        </button>
      </div>

      {count > 0 && showComments && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '16px' }}>
          {comments.map(c => (
            <CommentThread key={c.id} comment={c} slug={slug} onReplyPosted={onRefresh} />
          ))}
        </div>
      )}

      {/* Only at the foot of an open thread, where you land having read it. An
          empty track already has its way in on the emblem above, and repeating
          it here would put a second control on every track with nothing to
          show. */}
      {count > 0 && showComments && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => setComposing(true)} style={quietAction}>+ comment</button>
        </div>
      )}

      {/* Posting is a modal rather than a form unfolding in place: in the
          tracklist that pushed everything below it down the page while you
          typed. */}
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
                {/* What you're answering — a track name, or the album's own
                    title when the bubble belongs to the album notes. */}
                <div style={{ fontSize: '14px', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
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
              onPosted={() => { setComposing(false); setShowComments(true); onRefresh(); }}
            />
          </div>
        </div>
      )}
    </>
  );
}
