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
  // Expanded by default, the way a thread you've opened should already be
  // readable. Collapsing is something you do to a branch you're done with.
  const [collapsed, setCollapsed] = useState(false);
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
  const initials = (comment.author_name || '?').slice(0, 2).toUpperCase();

  return (
    <div style={{ display: 'flex', gap: '10px' }}>
      {/* Avatar column. The rail beneath it runs the height of everything this
          comment owns, which is what shows at a glance where a branch of the
          conversation starts and ends. Tapping either folds the branch. */}
      <div
        onClick={() => setCollapsed(v => !v)}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '26px', flexShrink: 0, cursor: 'pointer' }}
      >
        <div style={{
          width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
          background: 'var(--bg-warm)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: fonts.mono, fontSize: '9px', color: 'var(--ink-soft)',
        }}>
          {initials}
        </div>
        {!collapsed && (
          <div style={{ flex: 1, width: '2px', borderRadius: '1px', background: 'var(--border)', margin: '6px 0 0' }} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0, paddingBottom: collapsed ? '10px' : '4px' }}>
        <div
          onClick={() => setCollapsed(v => !v)}
          style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap', cursor: 'pointer', paddingTop: '5px' }}
        >
          <span style={{ fontFamily: fonts.mono, fontSize: '11px', color: 'var(--ink)', letterSpacing: '0.04em' }}>{comment.author_name}</span>
          <span style={{ fontFamily: fonts.mono, fontSize: '9px', color: 'var(--ink-faint)' }}>{timeAgo(comment.created_at)}</span>
          {collapsed && (
            <span style={{ fontFamily: fonts.mono, fontSize: '9px', color: 'var(--ink-faint)' }}>
              · +{replyCount + 1}
            </span>
          )}
        </div>

        {!collapsed && (
          <>
            <div style={{ fontSize: '13px', lineHeight: 1.7, color: 'var(--ink-soft)', margin: '5px 0 0', overflowWrap: 'anywhere' }}>{comment.content}</div>

            <div style={{ display: 'flex', gap: '14px', margin: '8px 0 0', flexWrap: 'wrap' }}>
              <button onClick={handleUpvote} style={{ ...linkBtn, color: upvoted ? 'var(--accent)' : 'var(--ink-faint)', cursor: upvoted ? 'default' : 'pointer' }}>
                ↑ {upvotes}
              </button>
              <button onClick={() => setReplying(v => !v)} style={linkBtn}>reply</button>
              <button onClick={() => setCollapsed(true)} style={linkBtn}>collapse</button>
            </div>

            {replying && (
              <div style={{ margin: '12px 0 4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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

            {replyCount > 0 && (
              <div style={{ marginTop: '10px' }}>
                {comment.replies.map(r => (
                  <CommentThread key={r.id} comment={r} slug={slug} onReplyPosted={onReplyPosted} depth={depth + 1} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
