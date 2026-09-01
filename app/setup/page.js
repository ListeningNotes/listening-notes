// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/setup/page.js
// Who this copy belongs to. Asked once.
//
// ── A route, not a takeover ───────────────────────────────────────────────
// Same shape as /login and for the same reason: a screen that is only ever
// reached by being redirected to it cannot be linked, bookmarked, or reached
// again after a half-finished attempt. It redirects home once the journal has
// been claimed, exactly as /login redirects home once you are wearing a
// wristband.
//
// ── One step, four fields ─────────────────────────────────────────────────
// Everything else on the card is edited where it prints, which is a decision
// this repo already made — so a longer setup would be a second editor for
// fields that have one. The nine bio prompts in particular do not belong: the
// file that holds them says three get answered and nine is a questionnaire.
//
// Of the four, only the name is really the journal's. The other three are here
// because nothing else can ever write them:
//   site_address  is in WRITABLE and no surface writes it, so the card's code
//                 face and the share flow are dead until somebody does
//   founded_at    is write-once, so this is the only chance
//   lastfm_user   is in WRITABLE with no writer, and its absence is why the
//                 landing pane of a fresh copy has nothing playing on it
//
// The serial is minted by the route rather than asked for. It is the copy's
// identity, not the keeper's.
//
// ── The password comes first, and it is the same form ─────────────────────
// PasswordGate in its bare shape, which exists for this. There is no
// choose-a-password step and there must not be: the password is an environment
// variable, set in the deploy form before the URL resolves, which is what
// makes a fresh copy unclaimable rather than a land grab waiting to happen.

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fonts } from '../../library/sitewide_visuals';
import PasswordGate from '../../components/session_components/PasswordGate';

const today = () => new Date().toISOString().slice(0, 10);

export default function WelcomeScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    keeper_name: '',
    site_address: '',
    lastfm_user: '',
    founded_at: today(),
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/check').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings').then(r => r.json()).catch(() => ({})),
    ]).then(([auth, s]) => {
      // Already claimed: there is nothing to do here and a form that appears
      // to save write-once fields it will silently drop is worse than none.
      if (s?.settings?.setup_complete) { router.replace('/'); return; }
      setAuthed(!!auth.authed);
      setChecking(false);
    });
  }, [router]);

  function set(key) {
    return e => setForm(f => ({ ...f, [key]: e.target.value }));
  }

  async function claim(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      // A full load rather than a push. The hold in the root layout is decided
      // on the server from a value that has just changed, and the cached
      // answer behind it lives in the server process — a client navigation
      // would re-use a tree rendered while this copy was still unclaimed.
      window.location.assign('/');
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setSaving(false);
    }
  }

  if (checking) return <div style={{ minHeight: '100dvh', background: 'var(--bg)' }} />;

  return (
    <div className="su-page" style={{ fontFamily: fonts.sans }}>
      <style>{`
        .su-page {
          min-height: 100dvh; background: var(--bg); color: var(--ink);
          display: flex; align-items: center; justify-content: center;
          padding: 32px 24px;
        }
        .su-card { width: 100%; max-width: 380px; }
        .su-mark { line-height: 0; display: flex; justify-content: center; margin-bottom: 10px; }
        .su-logo { width: 78px; height: auto; display: block; fill: var(--ink); }
        .su-dot { fill: var(--ink); }
        .su-line {
          font-family: var(--font-label); font-size: 10px;
          letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--ink-faint); text-align: center; margin-bottom: 26px;
        }
        .su-fields { display: flex; flex-direction: column; gap: 18px; }
        .su-label {
          display: block; font-family: var(--font-label); font-size: 10px;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--ink-faint); margin-bottom: 6px;
        }
        .su-hint {
          font-family: var(--font-label); font-size: 10px;
          color: var(--ink-faint); margin-top: 6px; line-height: 1.5;
        }
        .su-field {
          display: block; width: 100%; box-sizing: border-box;
          background: var(--panel); border: 1px solid var(--border);
          border-radius: 10px; color: var(--ink); padding: 11px 13px;
          font-family: ${fonts.sans}; font-size: 14px; line-height: 1.6;
          outline: none; transition: border-color 0.15s;
        }
        .su-field:focus { border-color: var(--ink-faint); }
        .su-field::placeholder { color: var(--ink-faint); }
        /* 16px on touch or Safari zooms in on focus and does not zoom back. */
        @media (pointer: coarse) { .su-field { font-size: 16px; } }
        .su-go {
          margin-top: 26px; width: 100%;
          display: inline-flex; align-items: center; justify-content: center;
          padding: 13px 0; border-radius: 999px;
          background: var(--ink); color: var(--bg); border: 1px solid var(--ink);
          font-family: var(--font-mono); font-size: 10px;
          letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer;
        }
        .su-go:disabled { opacity: 0.5; cursor: not-allowed; }
        .su-error { font-size: 13px; color: #e05555; margin-top: 14px; }
      `}</style>

      <div className="su-card">
        {/* The mark, matching the holding page a visitor sees on the same
            copy — the words there and the mark here would read as two
            different sites. */}
        <div className="su-mark" aria-label="Listening Notes" role="img">
          <svg viewBox="76 96 241 140" className="su-logo" xmlns="http://www.w3.org/2000/svg">
          <path
          transform="translate(73.734177, 220.794814)"
          d="M 44.65625 0 C 37.46875 0 31.160156 -1.601562 25.734375 -4.8125 C 20.304688 -8.019531 16.097656 -12.28125 13.109375 -17.59375 C 10.128906 -22.90625 8.640625 -28.773438 8.640625 -35.203125 L 8.640625 -116.21875 L 36.53125 -116.21875 L 36.53125 -33.203125 C 36.53125 -30.546875 37.46875 -28.222656 39.34375 -26.234375 C 41.226562 -24.242188 43.550781 -23.25 46.3125 -23.25 L 77.03125 -23.25 L 77.03125 0 Z M 44.65625 0 "
          />
          <path
          transform="translate(153.915942, 220.794814)"
          d="M 91.96875 2 C 85 2 78.742188 0.476562 73.203125 -2.5625 C 67.671875 -5.613281 63.300781 -9.847656 60.09375 -15.265625 C 56.882812 -20.691406 55.28125 -26.835938 55.28125 -33.703125 L 55.28125 -84.5 C 55.28125 -86.269531 54.835938 -87.875 53.953125 -89.3125 C 53.066406 -90.75 51.90625 -91.910156 50.46875 -92.796875 C 49.03125 -93.679688 47.425781 -94.125 45.65625 -94.125 C 43.882812 -94.125 42.28125 -93.679688 40.84375 -92.796875 C 39.40625 -91.910156 38.269531 -90.75 37.4375 -89.3125 C 36.601562 -87.875 36.1875 -86.269531 36.1875 -84.5 L 36.1875 0 L 8.96875 0 L 8.96875 -82.515625 C 8.96875 -89.484375 10.539062 -95.625 13.6875 -100.9375 C 16.84375 -106.25 21.21875 -110.453125 26.8125 -113.546875 C 32.40625 -116.648438 38.6875 -118.203125 45.65625 -118.203125 C 52.738281 -118.203125 59.046875 -116.648438 64.578125 -113.546875 C 70.109375 -110.453125 74.476562 -106.25 77.6875 -100.9375 C 80.90625 -95.625 82.515625 -89.484375 82.515625 -82.515625 L 82.515625 -31.703125 C 82.515625 -29.929688 82.957031 -28.300781 83.84375 -26.8125 C 84.726562 -25.320312 85.859375 -24.160156 87.234375 -23.328125 C 88.617188 -22.492188 90.144531 -22.078125 91.8125 -22.078125 C 93.582031 -22.078125 95.210938 -22.492188 96.703125 -23.328125 C 98.203125 -24.160156 99.394531 -25.320312 100.28125 -26.8125 C 101.164062 -28.300781 101.609375 -29.929688 101.609375 -31.703125 L 101.609375 -116.21875 L 128.65625 -116.21875 L 128.65625 -33.703125 C 128.65625 -26.835938 127.050781 -20.691406 123.84375 -15.265625 C 120.632812 -9.847656 116.265625 -5.613281 110.734375 -2.5625 C 105.203125 0.476562 98.945312 2 91.96875 2 Z M 91.96875 2 "
          />
          <circle
          cx="297.0547"
          cy="216.71875"
          r="14.1328"
          className="su-dot"
          />
          </svg>
        </div>
        <div className="su-line">{authed ? 'Whose journal is this?' : 'Writing access'}</div>

        {!authed ? (
          <PasswordGate bare onAuth={() => setAuthed(true)} />
        ) : (
          <form onSubmit={claim} className="su-fields">
            <div>
              <span className="su-label">Your name</span>
              <input className="su-field" value={form.keeper_name} onChange={set('keeper_name')} autoFocus />
              <div className="su-hint">
                The journal is named after whoever keeps it. This is the name machines read —
                you can add a decorated one to the card later.
              </div>
            </div>

            <div>
              <span className="su-label">This journal’s address</span>
              <input
                className="su-field" value={form.site_address} onChange={set('site_address')}
                placeholder="yourname.example.com" autoComplete="off" inputMode="url"
              />
              <div className="su-hint">Optional. It is what the card’s scannable code points at.</div>
            </div>

            <div>
              <span className="su-label">Logging since</span>
              <input className="su-field" type="date" value={form.founded_at} onChange={set('founded_at')} />
              <div className="su-hint">
                Today unless you are moving an older journal over. This one cannot be changed afterwards.
              </div>
            </div>

            <div>
              <span className="su-label">Last.fm username</span>
              <input
                className="su-field" value={form.lastfm_user} onChange={set('lastfm_user')}
                placeholder="Optional" autoComplete="off"
              />
              <div className="su-hint">Optional. Without it the journal simply shows no beacon.</div>
            </div>

            {error && <div className="su-error">{error}</div>}

            <button type="submit" className="su-go" disabled={saving}>
              {saving ? 'Opening…' : 'Open the journal'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
