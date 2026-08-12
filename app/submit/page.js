'use client';

import { useState } from 'react';
import Link from 'next/link';
import { fonts } from '../../library/sitewide_visuals';
import DotNav from '../../components/main_components/DotNav';
import SiteNav from '../../components/main_components/SiteNav';

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
    <div className="sb-page" style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)', fontFamily: fonts.sans }}>
      <style>{`
        /* Same 136px the nav ends on everywhere else — this page used to clear
           it with a hand-picked 168px of padding, which is the same number
           arrived at by eye. */
        .sb-page { --sb-nav-bottom: 136px; }

        /* Opens the way an entry does: title, a line under it in the label
           face, then the qualifiers. */
        /* The same 860/48 box About uses, so the title, the section rules and
           the closing buttons land on the same left edge on both pages. */
        .sb-hero {
          max-width: 860px; margin: 0 auto;
          padding: calc(var(--sb-nav-bottom) + 44px) 48px 26px;
        }
        .sb-hero h1 {
          font-family: var(--font-display);
          font-size: clamp(1.9rem, 4vw, 2.6rem);
          font-weight: var(--font-display-weight);
          letter-spacing: -0.015em; line-height: 1.05; margin: 0 0 8px;
        }
        .sb-hero-line {
          font-family: var(--font-label); font-size: 11px;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--ink-soft); margin-bottom: 14px;
        }

        .sb-main { max-width: 860px; margin: 0 auto; padding: 0 48px 100px; }
        .sb-fields { display: flex; flex-direction: column; gap: 20px; }
        .sb-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        /* The only break in the run — what's below it is the part you can skip,
           so it gets a rule and a little more air rather than a heading. */
        .sb-optional {
          display: flex; flex-direction: column; gap: 14px;
          margin-top: 12px; padding-top: 24px; border-top: 1px solid var(--border);
        }

        .sb-label {
          display: block;
          font-family: var(--font-label); font-size: 10px;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--ink-faint); margin-bottom: 7px;
        }
        /* Red, not the site's gold: gold is the rating colour everywhere else
           on the site, and a required-field mark is not a rating. Same red the
           validation message below the form uses. */
        .sb-req { color: #e05555; }

        /* Frosted like every other input on the site (the archive's search
           field is the same recipe) rather than the flat white --surface these
           carried, which read as a different site on the dark theme. */
        .sb-field {
          display: block; width: 100%; box-sizing: border-box;
          background: var(--panel);
          border: 1px solid var(--border); border-radius: 10px;
          color: var(--ink);
          padding: 11px 13px;
          font-family: ${fonts.sans}; font-size: 14px; line-height: 1.6;
          outline: none;
          transition: border-color 0.15s;
        }
        .sb-field::placeholder { color: var(--ink-faint); }
        .sb-field:focus { border-color: var(--ink-faint); }
        textarea.sb-field { resize: vertical; min-height: 130px; line-height: 1.8; }

        .sb-hint {
          font-family: var(--font-label); font-size: 10px;
          letter-spacing: 0.06em; color: var(--ink-faint);
        }
        .sb-error { font-size: 13px; color: #e05555; }

        /* The one committing action on the page, so it's the one solid button
           — the same ink fill the archive gives its Show N. */
        .sb-submit {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 13px 40px; border-radius: 999px;
          background: var(--ink); color: var(--bg); border: 1px solid var(--ink);
          font-family: var(--font-mono); font-size: 10px;
          letter-spacing: 0.14em; text-transform: uppercase;
          cursor: pointer; transition: opacity 0.18s;
        }
        .sb-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        .sb-done {
          background: var(--panel);
          backdrop-filter: var(--card-blur); -webkit-backdrop-filter: var(--card-blur);
          border: 1px solid var(--panel-border); border-radius: var(--r-lg);
          box-shadow: var(--shadow-soft);
          padding: 36px 28px; text-align: center;
        }
        .sb-done-title { font-family: var(--font-display); font-weight: var(--font-display-weight); font-size: 1.7rem; margin-bottom: 10px; }
        .sb-done-body { font-size: 14px; line-height: 1.8; color: var(--ink-soft); margin: 0; }

        .sb-foot {
          margin-top: 48px; padding-top: 28px; border-top: 1px solid var(--border);
          display: flex; justify-content: center; align-items: center; gap: 12px; flex-wrap: wrap;
        }

        @media (max-width: 768px) {
          .sb-hero { padding: calc(var(--sb-nav-bottom) + 24px) 24px 22px; }
          .sb-main { padding: 0 24px 80px; }
          /* Album and artist each get a full row — side by side on a phone
             leaves neither enough width to read what you've typed. */
          .sb-pair { grid-template-columns: 1fr; gap: 18px; }
        }
      `}</style>

      <SiteNav />
      <DotNav />

      <header className="sb-hero">
        <h1>Submit an Album</h1>
        <div className="sb-hero-line">Recommend an album and tell me what to listen for</div>
      </header>

      <main className="sb-main">
        {done ? (
          <>
            <div className="sb-done">
              <div className="sb-done-title">Submitted.</div>
              <p className="sb-done-body">
                {form.name ? `Thanks, ${form.name}. ` : ''}I&apos;ll give it a listen.
                {form.email ? ' I’ll let you know when it goes up.' : ''}
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 22 }}>
              <button type="button" className="ln-pill" onClick={handleReset}>
                Submit another album →
              </button>
            </div>
          </>
        ) : (
          // One run of fields, no headings over them. Album title / Artist /
          // Year of release / Note is short enough to read straight down —
          // grouping four fields under three headings named more parts than
          // the form has.
          <form onSubmit={handleSubmit} className="sb-fields">

            <div className="sb-pair">
              <div>
                <span className="sb-label">Album title <span className="sb-req">*</span></span>
                <input className="sb-field" value={form.album} onChange={set('album')} />
              </div>
              <div>
                <span className="sb-label">Artist <span className="sb-req">*</span></span>
                <input className="sb-field" value={form.artist} onChange={set('artist')} />
              </div>
            </div>

            <div style={{ maxWidth: 190 }}>
              <span className="sb-label">Year of release <span className="sb-req">*</span></span>
              <input className="sb-field" value={form.year} onChange={set('year')} />
            </div>

            <div>
              <span className="sb-label">Note <span className="sb-req">*</span></span>
              <textarea
                className="sb-field"
                value={form.note}
                onChange={set('note')}
                placeholder="Let me know why you're submitting this album."
              />
            </div>

            <div className="sb-optional">
              <div className="sb-hint">Optional — leave blank to stay anonymous</div>
              <div className="sb-pair">
                <div>
                  <span className="sb-label">Your name</span>
                  <input className="sb-field" value={form.name} onChange={set('name')} placeholder="So I know who sent it" />
                </div>
                <div>
                  <span className="sb-label">Email (private)</span>
                  <input className="sb-field" type="email" value={form.email} onChange={set('email')} placeholder="I'll let you know when it's up" />
                </div>
              </div>
            </div>

            {error && <div className="sb-error">{error}</div>}

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
              <button type="submit" className="sb-submit" disabled={submitting}>
                {submitting ? 'Sending…' : 'Submit'}
              </button>
            </div>
          </form>
        )}

        {/* Every other page closes on this pair; this one had no way out at all. */}
        <div className="sb-foot">
          <Link href="/" className="ln-pill">← Back home</Link>
          <Link href="/archive" className="ln-pill">Archive →</Link>
        </div>
      </main>
    </div>
  );
}
