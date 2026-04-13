'use client';
import { useState } from 'react';
import { fonts } from '../../../library/sitewide_visuals';

const inputStyle = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid #2a2a2a', borderRadius: '6px',
  color: '#e8e4dc', padding: '7px 10px', fontFamily: fonts.mono, fontSize: '11px',
  outline: 'none', flex: 1, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
};

const accentBtnSm = {
  fontFamily: fonts.mono, fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase',
  color: '#0e0e0e', background: '#c8d47a', border: 'none', borderRadius: '6px',
  padding: '7px 14px', cursor: 'pointer',
};

const ghostBtnSm = {
  fontFamily: fonts.mono, fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase',
  color: '#555', background: 'none', border: '1px solid #2a2a2a', borderRadius: '6px',
  padding: '7px 14px', cursor: 'pointer',
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

export default function CommentThread({ comment, slug, onReplyPosted }) {
  const [collapsed, setCollapsed] = useState(false);
  const [replying, setReplying] = useState(false);
  const [upvotes, setUpvotes] = useState(comment.upvotes);
  const [upvoted, setUpvoted] = useState(false);
  const [replyName, setReplyName] = useState('');
  const [replyEmail, setReplyEmail] = useState('');
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
    if (!replyName.trim() || !replyEmail.trim() || !replyText.trim()) return;
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
        setReplying(false);
        setReplyName(''); setReplyEmail(''); setReplyText('');
        onReplyPosted();
      }
    } finally {
      setPosting(false);
    }
  }

  const initials = comment.author_name.slice(0, 2).toUpperCase();

  return (
    <div style={{ display: 'flex', gap: 0, marginBottom: '2px' }}>
      <div onClick={() => setCollapsed(v => !v)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '32px', flexShrink: 0, cursor: 'pointer' }}>
        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#1c1c1c', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.mono, fontSize: '8px', color: '#555', flexShrink: 0 }}>
          {initials}
        </div>
        {(comment.replies?.length > 0 || !collapsed) && (
          <div style={{ flex: 1, width: '1px', background: collapsed ? 'transparent' : '#2a2a2a', margin: '3px 0', minHeight: '12px', transition: 'background 0.2s' }} />
        )}
      </div>

      <div style={{ flex: 1, paddingTop: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontFamily: fonts.mono, fontSize: '11px', color: '#e8e4dc', letterSpacing: '0.04em' }}>{comment.author_name}</span>
          <span style={{ fontFamily: fonts.mono, fontSize: '9px', color: '#444' }}>{timeAgo(comment.created_at)}</span>
        </div>

        {!collapsed && (
          <>
            <div style={{ fontSize: '13px', lineHeight: 1.7, color: '#a8a49c', marginBottom: '8px' }}>{comment.content}</div>
            <div style={{ display: 'flex', gap: '14px', marginBottom: '10px' }}>
              <button onClick={handleUpvote} style={{ fontFamily: fonts.mono, fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: upvoted ? '#c8d47a' : '#555', background: 'none', border: 'none', cursor: upvoted ? 'default' : 'pointer', padding: 0 }}>
                ↑ {upvotes}
              </button>
              <button onClick={() => setReplying(v => !v)} style={{ fontFamily: fonts.mono, fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#555', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                reply
              </button>
              <button onClick={() => setCollapsed(true)} style={{ fontFamily: fonts.mono, fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#555', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                collapse
              </button>
            </div>

            {replying && (
              <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input value={replyName} onChange={e => setReplyName(e.target.value)} placeholder="Name" style={inputStyle} />
                  <input value={replyEmail} onChange={e => setReplyEmail(e.target.value)} placeholder="Email (private)" type="email" style={inputStyle} />
                </div>
                <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Reply..." rows={2} style={{ ...inputStyle, resize: 'vertical', width: '100%' }} />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleReply} disabled={posting} style={accentBtnSm}>{posting ? '…' : 'Post reply'}</button>
                  <button onClick={() => setReplying(false)} style={ghostBtnSm}>Cancel</button>
                </div>
              </div>
            )}

            {comment.replies?.length > 0 && (
              <div>
                {comment.replies.map(r => (
                  <CommentThread key={r.id} comment={r} slug={slug} onReplyPosted={onReplyPosted} />
                ))}
              </div>
            )}
          </>
        )}

        {collapsed && (
          <button onClick={() => setCollapsed(false)} style={{ fontFamily: fonts.mono, fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#444', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 10px' }}>
            {comment.replies?.length > 0 ? `expand (${comment.replies.length} repl${comment.replies.length > 1 ? 'ies' : 'y'})` : 'expand'}
          </button>
        )}
      </div>
    </div>
  );
}
