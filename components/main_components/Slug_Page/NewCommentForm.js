'use client';
import { useState } from 'react';
import { fonts } from '../../../library/sitewide_visuals';
import { keep_receipt } from '../../../library/receipts';

const inputStyle = {
  background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '6px',
  color: 'var(--ink)', padding: '7px 10px', fontFamily: fonts.mono, fontSize: '11px',
  outline: 'none', flex: 1, minWidth: 0, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
  // Without this, width:100% plus the padding and border added up to wider
  // than the column and the whole site scrolled sideways on a phone.
  boxSizing: 'border-box',
};

const accentBtnSm = {
  fontFamily: fonts.mono, fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase',
  color: '#1a1a1a', background: 'var(--accent)', border: 'none', borderRadius: '6px',
  padding: '7px 14px', cursor: 'pointer',
};

export default function NewCommentForm({ slug, trackIndex, onPosted }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  async function handlePost() {
    setError('');
    if (!name.trim() || !text.trim()) { setError('Name and comment are required.'); return; }
    setPosting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, track_index: trackIndex, author_name: name, author_email: email, content: text }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setName(''); setEmail(''); setText('');

      // Keeping the receipt is what lets the next load show this comment back
      // to the person who wrote it while it waits to be read.
      keep_receipt(data.receipt);

      // Straight out, with no thank-you screen and no 1.6s wait. The comment
      // itself appearing in the thread is a better confirmation than any
      // message about it could be, and that used to be impossible: the comment
      // was invisible even to its author, so a message was all there was.
      onPosted();
    } catch { setError('Something went wrong.'); }
    finally { setPosting(false); }
  }

  return (
    // No border or trailing space of its own: this now lives inside the
    // Add Comment modal, which supplies its own framing.
    <div>
      {/* Stacked rather than side by side: at the 16px phones need to avoid
          zooming, two fields on one row in this indented column are too narrow
          to read their own placeholders. Email is optional — the moderation
          queue is what keeps junk out, so requiring one would only cost
          comments; it's here so anyone who wants an answer can get one. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" style={inputStyle} />
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email (optional, private)" type="email" style={inputStyle} />
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Drop a comment here" rows={3} style={{ ...inputStyle, resize: 'vertical', width: '100%', marginBottom: '8px' }} />
      {error && <div style={{ fontFamily: fonts.mono, fontSize: '10px', color: '#d4604f', marginBottom: '8px' }}>{error}</div>}
      <button onClick={handlePost} disabled={posting} style={accentBtnSm}>{posting ? 'Posting…' : 'Post comment'}</button>
    </div>
  );
}
