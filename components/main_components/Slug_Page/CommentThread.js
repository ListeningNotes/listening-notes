// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useState } from 'react';
import NewCommentForm from './NewCommentForm';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  const d = Math.floor(h / 24);
  if (d < 7) return d + 'd ago';
  return Math.floor(d / 7) + 'w ago';
}

// One comment and everything under it. Styles are .ln-say-* in entry.css; this
// file carried its own style objects until 2026-09-21 and the note at the top
// of CommentBubble says what was wrong with them.
export default function CommentThread({ comment, slug, onReplyPosted, depth = 0 }) {
  // Expanded by default, the way a thread you've opened should already be
  // readable. Collapsing is something you do to a branch you're done with.
  const [collapsed, setCollapsed] = useState(false);
  const [replying, setReplying] = useState(false);
  const [upvotes, setUpvotes] = useState(comment.upvotes);
  const [upvoted, setUpvoted] = useState(false);
  async function handleUpvote() {
    if (upvoted) return;
    setUpvoted(true);
    setUpvotes(v => v + 1);
    await fetch('/api/comments/upvote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: comment.id }),
    });
  }

  const replyCount = comment.replies?.length || 0;

  // Your own comment, still waiting to be read. It only ever reaches the
  // browser that wrote it — the server matches it against a signed receipt — so
  // there's no need to check whether this reader is allowed to see it. If it
  // arrived, it's theirs.
  const held = comment.pending;

  return (
    // Dimmed as a whole so the held comment reads as not-quite-here next to the
    // ones that are. The line underneath says why; the fade is what makes you
    // look for it.
    <div className={held ? 'ln-say ln-say--held' : 'ln-say'}>
      {/* A real button rather than a div that listens for clicks: it is the
          second way to fold a branch (the rail is the other) and on a phone it
          is the bigger of the two targets, so it should also be the one a
          keyboard and a screen reader can find. */}
      <button
        type="button"
        className="ln-say-who"
        onClick={() => setCollapsed(v => !v)}
        aria-expanded={!collapsed}
      >
        <span className="ln-say-name">{comment.author_name}</span>
        <span className="ln-say-when">{timeAgo(comment.created_at)}</span>
        {collapsed && <span className="ln-say-more">+{replyCount + 1}</span>}
      </button>

      {!collapsed && (
        <>
          <p className="ln-say-body">{comment.content}</p>

          {/* Where the actions would be, so the row underneath a comment says
              one thing or the other and the thread keeps its rhythm. Nothing to
              upvote or reply to yet — it isn't a conversation until someone
              else can see it. */}
          {held ? (
            <p className="ln-say-held-line">Posted — waiting to be read</p>
          ) : (
            <div className="ln-say-acts">
              <button
                type="button"
                className={'ln-word' + (upvoted ? ' ln-say-up--on' : '')}
                onClick={handleUpvote}
                aria-label={upvoted ? `Upvoted, ${upvotes}` : `Upvote, ${upvotes} so far`}
              >
                ↑ {upvotes}
              </button>
              <button type="button" className="ln-word" onClick={() => setReplying(v => !v)}>Reply</button>
              <button type="button" className="ln-word" onClick={() => setCollapsed(true)}>Collapse</button>
            </div>
          )}

          {/* ── Replying happens here too ─────────────────────────────────
              It was a fixed overlay with a scrim until 2026-09-21, carrying a
              clamped copy of the comment so you could still see what you were
              answering once the thread itself had been covered over. Which is
              the tell: the cure for hiding the thing you are answering is not
              to reprint it, it is not to hide it. CommentBubble had already
              made exactly this argument for the new-comment form two screens
              up and this file had not heard it. Nothing is covered now, the
              comment stays where it is directly above, and the quoted copy is
              gone because there is nothing to quote. */}
          {replying && (
            <div className="ln-say-form">
              {/* No "Reply to <name>" over it either. The name is on the row
                  directly above, and the form is underneath it: where a thing
                  opens is what it is about. */}
              <NewCommentForm
                slug={slug}
                trackIndex={comment.track_index}
                parentId={comment.id}
                onPosted={() => { setReplying(false); onReplyPosted(); }}
                onLeave={() => setReplying(false)}
              />
            </div>
          )}

          {/* Replies sit behind the rail, which spans exactly the branch this
              comment owns. Tapping it folds the branch, the way the rail does
              on Reddit — it's the thing people actually reach for. */}
          {replyCount > 0 && (
            <div className="ln-say-branch">
              <button
                type="button"
                className="ln-say-rail"
                onClick={() => setCollapsed(true)}
                aria-label={`Fold ${comment.author_name}'s replies`}
              />
              <div className="ln-say-kids">
                {comment.replies.map(r => (
                  <CommentThread key={r.id} comment={r} slug={slug} onReplyPosted={onReplyPosted} depth={depth + 1} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
