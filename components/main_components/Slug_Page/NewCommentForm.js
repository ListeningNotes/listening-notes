'use client';
import { useState } from 'react';
import { fonts } from '../../../library/sitewide_visuals';

const inputStyle = {
  background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '6px',
  color: 'var(--ink)', padding: '7px 10px', fontFamily: fonts.mono, fontSize: '11px',
  outline: 'none', flex: 1, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
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
    if (!name.trim() || !email.trim() || !text.trim()) { setError('Name, email and comment are required.'); return; }
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
      onPosted();
    } catch { setError('Something went wrong.'); }
    finally { setPosting(false); }
  }

  return (
    <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" style={inputStyle} />
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email (private)" type="email" style={inputStyle} />
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="What did you hear?" rows={3} style={{ ...inputStyle, resize: 'vertical', width: '100%', marginBottom: '8px' }} />
      {error && <div style={{ fontFamily: fonts.mono, fontSize: '10px', color: '#d4604f', marginBottom: '8px' }}>{error}</div>}
      <button onClick={handlePost} disabled={posting} style={accentBtnSm}>{posting ? 'Posting…' : 'Post comment'}</button>
    </div>
  );
}
