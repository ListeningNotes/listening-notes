// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useState, useEffect } from 'react';
import { fonts } from '../../../library/sitewide_visuals';
import { keep_receipt } from '../../../library/receipts';
import { recallAddress, keepAddress } from '../../../library/return_address';

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
  const [address, setAddress] = useState('');
  const [text, setText] = useState('');

  // The same one value the send form keeps, under the same key — see
  // return_address.js. Fill it in on any journal and it is already there on
  // the next one, whichever form asked for it first. That shared key is also
  // what will let a journal offer Compare to a visitor: the offer depends on
  // the browser holding an address, not on where it was typed.
  useEffect(() => { setAddress(recallAddress()); }, []);
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
        body: JSON.stringify({ slug, track_index: trackIndex, author_name: name, author_url: address, content: text }),
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
      {/* A name, and where you keep your own journal if you keep one. No
          email: nothing on this site sends any, so an address would be a
          personal detail held for no reason — and with nowhere for a reply to
          go, the way to find out whether anyone answered is to come back and
          look.

          The URL is not a replacement for that. It is the opposite kind of
          thing: an address is where something is rather than who somebody is,
          it is the same field the send form asks for and shares one stored
          value with, and a URL that resolves to a real journal is a better
          signal than an email, which anybody can invent. */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" style={inputStyle} />
        <input
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="Your journal (optional)"
          autoComplete="off"
          inputMode="url"
          style={inputStyle}
        />
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Drop a comment here" rows={3} style={{ ...inputStyle, resize: 'vertical', width: '100%', marginBottom: '8px' }} />
      {error && <div style={{ fontFamily: fonts.mono, fontSize: '10px', color: '#d4604f', marginBottom: '8px' }}>{error}</div>}
      <button onClick={handlePost} disabled={posting} style={accentBtnSm}>{posting ? 'Posting…' : 'Post comment'}</button>
    </div>
  );
}
