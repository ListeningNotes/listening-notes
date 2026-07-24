'use client';

import { useState } from 'react';
import DotNav from '../../components/main_components/DotNav';
import SiteNav from '../../components/main_components/SiteNav';

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
    if (!form.album.trim() || !form.artist.trim() || !form.year.trim() || !form.note.trim()) {
      setError('Album, artist, year, and note are required.');
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

  function handleReset() {
    setForm({ album: '', artist: '', year: '', note: '', name: '', email: '' });
    setError('');
    setDone(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      <SiteNav />
      <DotNav />

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '120px 24px 80px' }}>

        <div style={{ background: 'var(--panel)', backdropFilter: 'var(--card-blur)', WebkitBackdropFilter: 'var(--card-blur)', border: '1px solid var(--panel-border)', borderRadius: 'var(--radius)', padding: '36px', boxShadow: 'var(--shadow-lift)' }}>

        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 400, margin: '0 0 12px', lineHeight: 1.2 }}>
            Submit an Album
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--ink-soft)', margin: 0, lineHeight: 1.7 }}>
            Recommend an album and tell me what to listen for.
          </p>
        </div>

        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ background: 'var(--bg-warm)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '32px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: '10px' }}>Submitted.</div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--ink-soft)', margin: 0, lineHeight: 1.7 }}>
                {form.name ? `Thanks, ${form.name}. ` : ''}I'll give it a listen.
                {form.email ? " I'll let you know when it goes up." : ''}
              </p>
            </div>
            <button onClick={handleReset} style={{
              marginTop: '20px', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: '0.8rem', letterSpacing: '0.06em',
              color: 'var(--ink-soft)', background: 'var(--surface)',
              border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
              padding: '11px 24px',
            }}>
              Submit another album →
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <span style={label}>Album <span style={{ color: 'var(--accent)' }}>*</span></span>
                <input style={field} value={form.album} onChange={set('album')}/>
              </div>
              <div>
                <span style={label}>Artist <span style={{ color: 'var(--accent)' }}>*</span></span>
                <input style={field} value={form.artist} onChange={set('artist')} />
              </div>
            </div>

            <div style={{ maxWidth: '160px' }}>
              <span style={label}>Year<span style={{ color: 'var(--accent)' }}>*</span></span>
              <input style={field} value={form.year} onChange={set('year')} />
            </div>

            <div>
              <span style={label}>Note<span style={{ color: 'var(--accent)' }}>*</span></span>
              <textarea
                style={{ ...field, resize: 'vertical', minHeight: '120px', lineHeight: 1.7 }}
                value={form.note}
                onChange={set('note')}
                placeholder="Let me know why you're submitting this album."
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

            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4px' }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.8rem', letterSpacing: '0.09em', textTransform: 'uppercase',
                  color: 'var(--ink)',
                  background: 'var(--accent)',
                  border: '1px solid var(--accent)',
                  borderRadius: 50, padding: '13px 40px',
                  boxShadow: submitting ? 'none' : '0 4px 16px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.4)',
                  opacity: submitting ? 0.6 : 1,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {submitting ? 'Sending…' : 'Submit'}
              </button>
            </div>

          </form>
        )}

        </div>
      </div>
    </div>
  );
}
