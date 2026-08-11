'use client';
import { useState } from 'react';
import { fonts } from '../../../library/sitewide_visuals';

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
  // Replies start folded away, so a long back-and-forth reads as a single
  // comment until you ask for the rest of it.
  const [showReplies, setShowReplies] = useState(false);
  const [replying, setReplying] = useState(false);
  const [upvotes, setUpvotes] = useState(comment.upvotes);
  const [upvoted, setUpvoted] = useState(false);
  const [replyName, setReplyName] = useState('');
  const [replyEmail, setReplyEmail] = useState('');
  const [replyText, setReplyText] = useState('');
  const [posting, setPosting] = useState(false);
  const [replyPosted, setReplyPosted] = useState(false);

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
    // Email optional here too, matching the new-comment form.
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
          author_email: replyEmail,
          content: replyText,
        }),
      });
      const data = await res.json();
      if (data.comment) {
        setReplyName(''); setReplyEmail(''); setReplyText('');
        // Replies are held for approval like everything else, so the reply
        // won't show up yet — say so rather than just closing the form.
        setReplyPosted(true);
        setTimeout(() => { setReplying(false); setReplyPosted(false); onReplyPosted(); }, 1600);
      }
    } finally {
      setPosting(false);
    }
  }

  const replyCount = comment.replies?.length || 0;

  return (
    // A reply is inset behind the thread line, so a chain reads as one
    // conversation rather than a stack of separate comments.
    <div style={{
      marginBottom: '12px',
      paddingLeft: depth > 0 ? '16px' : 0,
      borderLeft: depth > 0 ? '1px solid var(--border)' : 'none',
    }}>
      <div style={{
        background: 'var(--bg-warm)', border: '1px solid var(--border)',
        borderRadius: '18px', padding: '12px 16px',
        maxWidth: '100%', boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '5px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: fonts.mono, fontSize: '10px', color: 'var(--ink)', letterSpacing: '0.06em' }}>{comment.author_name}</span>
          <span style={{ fontFamily: fonts.mono, fontSize: '9px', color: 'var(--ink-faint)' }}>{timeAgo(comment.created_at)}</span>
        </div>
        <div style={{ fontSize: '13px', lineHeight: 1.65, color: 'var(--ink-soft)', overflowWrap: 'anywhere' }}>{comment.content}</div>
      </div>

      <div style={{ display: 'flex', gap: '14px', margin: '8px 0 0 6px', flexWrap: 'wrap' }}>
        <button onClick={handleUpvote} style={{ ...linkBtn, color: upvoted ? 'var(--accent)' : 'var(--ink-faint)', cursor: upvoted ? 'default' : 'pointer' }}>
          ↑ {upvotes}
        </button>
        <button onClick={() => setReplying(v => !v)} style={linkBtn}>reply</button>
        {replyCount > 0 && (
          <button onClick={() => setShowReplies(v => !v)} style={{ ...linkBtn, color: showReplies ? 'var(--ink-soft)' : 'var(--ink-faint)' }}>
            {showReplies ? 'hide replies' : `${replyCount} ${replyCount > 1 ? 'replies' : 'reply'}`}
          </button>
        )}
      </div>

      {replying && (
        <div style={{ margin: '12px 0 0 6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {replyPosted ? (
            <div style={{ fontFamily: fonts.mono, fontSize: '11px', lineHeight: 1.7, color: 'var(--ink-soft)' }}>
              Thanks — your reply is in. It&apos;ll appear once it&apos;s been read.
            </div>
          ) : (
            <>
              <input value={replyName} onChange={e => setReplyName(e.target.value)} placeholder="Name" style={inputStyle} />
              <input value={replyEmail} onChange={e => setReplyEmail(e.target.value)} placeholder="Email (optional, private)" type="email" style={inputStyle} />
              <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Reply…" rows={2} style={{ ...inputStyle, resize: 'vertical', width: '100%' }} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleReply} disabled={posting} style={accentBtnSm}>{posting ? '…' : 'Post reply'}</button>
                <button onClick={() => setReplying(false)} style={ghostBtnSm}>Cancel</button>
              </div>
            </>
          )}
        </div>
      )}

      {replyCount > 0 && showReplies && (
        <>
          {/* The tail from the sketch — dots trailing off the bubble towards
              whatever answers it. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '10px 0 8px 14px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--border)' }} />
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--border)' }} />
          </div>
          <div>
            {comment.replies.map(r => (
              <CommentThread key={r.id} comment={r} slug={slug} onReplyPosted={onReplyPosted} depth={depth + 1} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
