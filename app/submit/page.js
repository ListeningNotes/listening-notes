'use client';

import { useState } from 'react';
import Link from 'next/link';
import DotNav from '../../components/main_components/DotNav';
import { useTheme } from '../../components/main_components/Lightswitch';

const field = {
  display: 'block',
  width: '100%',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)',
  color: 'var(--text)',
  padding: '10px 12px',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.85rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const label = {
  display: 'block',
  fontFamily: 'var(--font-label)',
  fontSize: '0.7rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--ink-soft)',
  marginBottom: '6px',
};

export default function SubmitPage() {
  const { theme, toggle: toggleTheme } = useTheme();
  const [form, setForm] = useState({ album: '', artist: '', year: '', note: '', name: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  function set(key) {
    return e => setForm(f => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.album.trim() || !form.artist.trim() || !form.note.trim()) {
      setError('Album, artist, and note are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          album: form.album,
          artist: form.artist,
          year: form.year,
          note: form.note,
          submitter_name: form.name,
          submitter_email: form.email,
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setDone(true);
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      <Link href="/" className="hp-logo-mini" aria-label="Listening Notes">
        <img src="/Logo.png" alt="Listening Notes" style={{ height: 30, width: 'auto', display: 'block', filter: theme === 'dark' ? 'invert(1)' : 'none' }} />
      </Link>
      <div className="hp-corner">
        <a
          href="https://instagram.com/listeningnotes.blog"
          target="_blank"
          rel="noopener noreferrer"
          className="hp-icon-btn"
          aria-label="Instagram"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/></svg>
        </a>
        <button className="hp-icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"/></svg>
          )}
        </button>
      </div>
      <DotNav />

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '120px 24px 80px' }}>

        <div style={{ background: 'var(--panel)', backdropFilter: 'var(--card-blur)', WebkitBackdropFilter: 'var(--card-blur)', border: '1px solid var(--panel-border)', borderRadius: 'var(--radius)', padding: '36px', boxShadow: 'var(--shadow-lift)' }}>

        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 400, margin: '0 0 12px', lineHeight: 1.2 }}>
            What should I listen to?
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--ink-soft)', margin: 0, lineHeight: 1.7 }}>
            Recommend an album and tell me what to listen for. I'll add it to my queue and write it up when I do.
          </p>
        </div>

        {done ? (
          <div style={{ background: 'var(--bg-warm)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '32px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: '10px' }}>Submitted.</div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--ink-soft)', margin: 0, lineHeight: 1.7 }}>
              {form.name ? `Thanks, ${form.name}. ` : ''}I'll give it a listen.
              {form.email ? " I'll let you know when it goes up." : ''}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <span style={label}>Album <span style={{ color: 'var(--accent)' }}>*</span></span>
                <input style={field} value={form.album} onChange={set('album')} placeholder="e.g. Madvillainy" />
              </div>
              <div>
                <span style={label}>Artist <span style={{ color: 'var(--accent)' }}>*</span></span>
                <input style={field} value={form.artist} onChange={set('artist')} placeholder="e.g. Madvillain" />
              </div>
            </div>

            <div style={{ maxWidth: '160px' }}>
              <span style={label}>Year</span>
              <input style={field} value={form.year} onChange={set('year')} placeholder="e.g. 2004" />
            </div>

            <div>
              <span style={label}>What makes it special? What should I listen for? <span style={{ color: 'var(--accent)' }}>*</span></span>
              <textarea
                style={{ ...field, resize: 'vertical', minHeight: '120px', lineHeight: 1.7 }}
                value={form.note}
                onChange={set('note')}
                placeholder="Tell me what you hear in it, why it matters to you, or just make the case..."
              />
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '16px' }}>
                Optional — leave blank to stay anonymous
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <span style={label}>Your name</span>
                  <input style={field} value={form.name} onChange={set('name')} placeholder="So I know who sent it" />
                </div>
                <div>
                  <span style={label}>Email (private)</span>
                  <input style={field} value={form.email} onChange={set('email')} type="email" placeholder="I'll let you know when it's up" />
                </div>
              </div>
            </div>

            {error && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#e05555' }}>{error}</div>
            )}

            <div>
              <button
                type="submit"
                disabled={submitting}
                className="hp-cta-btn hp-cta-btn--filled"
                style={{ opacity: submitting ? 0.6 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
              >
                {submitting ? 'Sending…' : 'Submit →'}
              </button>
            </div>

          </form>
        )}

        </div>
      </div>
    </div>
  );
}
