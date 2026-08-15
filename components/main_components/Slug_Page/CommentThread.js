'use client';
import { useState } from 'react';
import { fonts } from '../../../library/sitewide_visuals';
import { keep_receipt } from '../../../library/receipts';

const inputStyle = {
  background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '6px',
  color: 'var(--ink)', padding: '7px 10px', fontFamily: fonts.mono, fontSize: '11px',
  outline: 'none', flex: 1, minWidth: 0, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
  // Same reason as the new-comment form: without this, width:100% plus the
  // padding and border overflowed the column and scrolled the page sideways.
  boxSizing: 'border-box',
};

const accentBtnSm = {
  fontFamily: fonts.mono, fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase',
  color: '#1a1a1a', background: 'var(--accent)', border: 'none', borderRadius: '6px',
  padding: '7px 14px', cursor: 'pointer',
};

const ghostBtnSm = {
  fontFamily: fonts.mono, fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase',
  color: 'var(--ink-soft)', background: 'none', border: '1px solid var(--border)', borderRadius: '6px',
  padding: '7px 14px', cursor: 'pointer',
};

const linkBtn = {
  fontFamily: fonts.mono, fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase',
  color: 'var(--ink-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
};

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

export default function CommentThread({ comment, slug, onReplyPosted, depth = 0 }) {
  // Expanded by default, the way a thread you've opened should already be
  // readable. Collapsing is something you do to a branch you're done with.
  const [collapsed, setCollapsed] = useState(false);
  const [replying, setReplying] = useState(false);
  const [upvotes, setUpvotes] = useState(comment.upvotes);
  const [upvoted, setUpvoted] = useState(false);
  const [replyName, setReplyName] = useState('');
  const [replyText, setReplyText] = useState('');
  const [posting, setPosting] = useState(false);

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

  async function handleReply() {
    if (!replyName.trim() || !replyText.trim()) return;
    setPosting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          track_index: comment.track_index,
          parent_id: comment.id,
          author_name: replyName,
          content: replyText,
        }),
      });
      const data = await res.json();
      if (data.comment) {
        setReplyName(''); setReplyText('');
        // Same as a new comment: keep the receipt, close, and let the reply
        // showing up in the branch be the confirmation.
        keep_receipt(data.receipt);
        setReplying(false);
        onReplyPosted();
      }
    } finally {
      setPosting(false);
    }
  }

  const replyCount = comment.replies?.length || 0;

  // Your own comment, still waiting to be read. It only ever reaches the
  // browser that wrote it — the server matches it against a signed receipt — so
  // there's no need to check whether this reader is allowed to see it. If it
  // arrived, it's theirs.
  const held = comment.pending;

  return (
    // Dimmed as a whole so the held comment reads as not-quite-here next to the
    // ones that are. The note underneath says why; the fade is what makes you
    // look for it.
    <div style={held ? { opacity: 0.55 } : undefined}>
      <div
        onClick={() => setCollapsed(v => !v)}
        style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap', cursor: 'pointer' }}
      >
        <span style={{ fontFamily: fonts.mono, fontSize: '11px', color: 'var(--ink)', letterSpacing: '0.04em' }}>{comment.author_name}</span>
        <span style={{ fontFamily: fonts.mono, fontSize: '9px', color: 'var(--ink-faint)' }}>{timeAgo(comment.created_at)}</span>
        {collapsed && (
          <span style={{ fontFamily: fonts.mono, fontSize: '9px', color: 'var(--ink-faint)' }}>· +{replyCount + 1}</span>
        )}
      </div>

      {!collapsed && (
        <>
          <div style={{ fontSize: '13px', lineHeight: 1.7, color: 'var(--ink-soft)', margin: '5px 0 0', overflowWrap: 'anywhere' }}>{comment.content}</div>

          {/* Where the actions would be, so the row underneath a comment says
              one thing or the other and the thread keeps its rhythm. Nothing to
              upvote or reply to yet — it isn't a conversation until someone
              else can see it. */}
          {held ? (
            <div style={{ fontFamily: fonts.mono, fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faint)', margin: '8px 0 0' }}>
              Posted — waiting to be read
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '14px', margin: '8px 0 0', flexWrap: 'wrap' }}>
              <button onClick={handleUpvote} style={{ ...linkBtn, color: upvoted ? 'var(--accent)' : 'var(--ink-faint)', cursor: upvoted ? 'default' : 'pointer' }}>
                ↑ {upvotes}
              </button>
              <button onClick={() => setReplying(true)} style={linkBtn}>reply</button>
              <button onClick={() => setCollapsed(true)} style={linkBtn}>collapse</button>
            </div>
          )}

          {/* Replies sit behind the rail, which spans exactly the branch this
              comment owns. Tapping it folds the branch, the way the rail does
              on Reddit — it's the thing people actually reach for. */}
          {replyCount > 0 && (
            <div style={{ display: 'flex', marginTop: '14px' }}>
              <div
                onClick={() => setCollapsed(true)}
                style={{ width: '2px', borderRadius: '1px', background: 'var(--border)', flexShrink: 0, cursor: 'pointer' }}
              />
              <div style={{ flex: 1, minWidth: 0, paddingLeft: '14px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {comment.replies.map(r => (
                  <CommentThread key={r.id} comment={r} slug={slug} onReplyPosted={onReplyPosted} depth={depth + 1} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Replying is a modal for the same reason adding a comment is: a form
          unfolding inside a thread pushes everything under it down the page
          while you type. It carries the comment being answered so you can see
          what you're replying to once the thread itself is covered. */}
      {replying && (
        <div
          onClick={() => setReplying(false)}
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
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
              <div style={{ fontFamily: fonts.mono, fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
                Reply to {comment.author_name}
              </div>
              <button
                onClick={() => setReplying(false)}
                aria-label="Close"
                style={{ fontFamily: fonts.mono, fontSize: '14px', color: 'var(--ink-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            <div style={{
              borderLeft: '2px solid var(--border)', paddingLeft: '12px', marginBottom: '16px',
              fontSize: '13px', lineHeight: 1.6, color: 'var(--ink-soft)',
              display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 4, overflow: 'hidden',
            }}>
              {comment.content}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input value={replyName} onChange={e => setReplyName(e.target.value)} placeholder="Name" style={inputStyle} />
              <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Reply…" rows={3} style={{ ...inputStyle, resize: 'vertical', width: '100%' }} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleReply} disabled={posting} style={accentBtnSm}>{posting ? '…' : 'Post reply'}</button>
                <button onClick={() => setReplying(false)} style={ghostBtnSm}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
