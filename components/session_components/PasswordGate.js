// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useState } from 'react';
import { fonts } from '../../library/sitewide_visuals';
import { useBookplate } from '../main_components/Bookplate';

const border = '1px solid #e0dcd5';

// `bare` returns the form and nothing around it, for WritingAccess to put in
// its panel. The alternative was a second copy of these fields, and a second
// copy is precisely how the first one drifted out of the shape a password
// manager can read — the whole fix was markup, so the markup lives once.
export default function PasswordGate({ onAuth, bare = false }) {
  // The journal's own name over the password box, rather than the name of the
  // journal this software was written for. The owner is the only person who
  // ever sees this screen, and seeing a stranger's name on the way into your
  // own writing is the exact wrong first impression for a copy to make.
  const { cover_name, keeper_name } = useBookplate();
  const [pw, setPw] = useState('');
  // A string now rather than a flag, because there are two things that can go
  // wrong here and "incorrect password" is the wrong thing to say about the
  // other one.
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleAuth(event) {
    // A real submit event now, so Enter and the button are the same path and
    // Safari sees a form being submitted rather than a script doing something.
    event?.preventDefault();
    if (loading || !pw) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) {
        onAuth();
      } else if (res.status === 429) {
        // The doorman, not a wrong password. Saying so matters: five bad
        // guesses and then silence would read as the password having stopped
        // working, and the person reading it is the owner.
        const body = await res.json().catch(() => null);
        setError(body?.error || 'Too many attempts. Wait a minute.');
        setPw('');
      } else {
        setError('Incorrect password');
        setPw('');
      }
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Why this is a real form ───────────────────────────────────────────
  // Safari never offered to save or fill this, and the reason was the markup
  // rather than anything about the password. A password manager needs three
  // things and this had none of them: a real <form> with a real submit button,
  // autocomplete="current-password" on the field, and a username to file the
  // entry under.
  //
  // The username is the one that looks wrong and is not. Managers store a
  // pair; with no username there is nothing to name the entry, so Safari has
  // nowhere to put it and stays quiet. There is only ever one owner here, so
  // the field is hidden and filled with the keeper's name — the answer was
  // always known, it just had to be said out loud.
  const fields = (
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            type="text"
            name="username"
            autoComplete="username"
            value={keeper_name || cover_name || 'keeper'}
            readOnly
            aria-hidden="true"
            tabIndex={-1}
            style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
          />
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="password"
            value={pw}
            onChange={e => { setPw(e.target.value); setError(''); }}
            disabled={loading}
            style={{ background: '#fff', border: `1px solid ${error ? '#ef4444' : '#e0dcd5'}`, borderRadius: 8, padding: '12px 16px', fontFamily: fonts.mono, fontSize: 16, color: '#1a1916', outline: 'none', opacity: loading ? 0.6 : 1, textAlign: 'center' }}
          />
          {error && <div style={{ fontFamily: fonts.mono, fontSize: 11, color: '#ef4444', lineHeight: 1.5, textAlign: 'center' }}>{error}</div>}
          <button type="submit" disabled={loading}
            style={{ background: '#1a1916', color: '#fff', borderRadius: 8, padding: '12px 0', fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: loading ? 'default' : 'pointer', border: 'none', fontWeight: 600, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Checking…' : 'Enter →'}
          </button>
        </form>
  );

  // In a panel: the fields, and the words the panel puts over them are its own.
  if (bare) return <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: fonts.sans }}>{fields}</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f3ef', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: fonts.sans }}>
      <div style={{ background: '#fff', border, borderRadius: 20, padding: 48, width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 4px 32px rgba(0,0,0,0.08)', textAlign: 'center' }}>
        <div>
          <div style={{ fontFamily: fonts.sans, fontSize: 26, fontWeight: 900, color: '#1a1916', letterSpacing: '-0.02em' }}>{cover_name}</div>
          <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7a776f', marginTop: 4 }}>writing access</div>
        </div>
        {fields}
      </div>
    </div>
  );
}
