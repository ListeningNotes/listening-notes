// SPDX-License-Identifier: AGPL-3.0-or-later
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
        body: JSON.stringify({ slug, track_index: trackIndex, author_name: name, content: text }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setName(''); setText('');

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
      {/* A name and the comment, nothing else. The email field came out on
          purpose: with nowhere for a reply to be sent, the way to find out
          whether anyone answered is to come back and look — which is the
          behaviour worth having until accounts exist to notify. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" style={inputStyle} />
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Drop a comment here" rows={3} style={{ ...inputStyle, resize: 'vertical', width: '100%', marginBottom: '8px' }} />
      {error && <div style={{ fontFamily: fonts.mono, fontSize: '10px', color: '#d4604f', marginBottom: '8px' }}>{error}</div>}
      <button onClick={handlePost} disabled={posting} style={accentBtnSm}>{posting ? 'Posting…' : 'Post comment'}</button>
    </div>
  );
}
