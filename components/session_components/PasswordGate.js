// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useState } from 'react';
import { fonts } from '../../library/sitewide_visuals';
import { useBookplate } from '../main_components/Bookplate';
import { useJournalHost } from '../../hooks/useJournalHost';

// `bare` returns the form and nothing around it, for WritingAccess to put in
// its panel. The alternative was a second copy of these fields, and a second
// copy is precisely how the first one drifted out of the shape a password
// manager can read — the whole fix was markup, so the markup lives once.
//
// `asking` changes what the field says it wants — 'password' normally, or
// 'claim code' on a copy nobody has claimed yet, where the code printed in
// the build log is what opens this door. The route behind it is the same one;
// only the words on the field change, and the autocomplete hint, because a
// password manager should not offer to save a code that is about to expire.
// `initial` fills the field before anybody types — the setup screen uses it
// to hand back a code from a link that did not open the door, so the person
// can see it and press Enter rather than find the log again.
export default function PasswordGate({ onAuth, bare = false, asking = 'password', initial = '' }) {
  const claiming = asking === 'claim code';
  // The journal's own name over the password box, rather than the name of the
  // journal this software was written for. The owner is the only person who
  // ever sees this screen, and seeing a stranger's name on the way into your
  // own writing is the exact wrong first impression for a copy to make.
  const { cover_name } = useBookplate();
  const host = useJournalHost();
  const [pw, setPw] = useState(initial);
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
        setError(claiming ? 'That code did not match' : 'Incorrect password');
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
  // the field is hidden and filled with the journal's host — the same value
  // the setup screen filed the password under, which is what makes the saved
  // entry the one offered here. It was the keeper's name for a while, which
  // is not set yet when the password is first chosen.
  const fields = (
        <form onSubmit={handleAuth} className="pg-form">
          <input
            type="text"
            name="username"
            autoComplete="username"
            className="pg-who"
            value={host}
            onChange={() => {}}
            aria-label="Journal"
            tabIndex={-1}
          />
          <input
            type={claiming ? 'text' : 'password'}
            name="password"
            autoComplete={claiming ? 'off' : 'current-password'}
            placeholder={claiming ? 'claim code' : 'password'}
            className={'pg-pw' + (error ? ' pg-pw--wrong' : '')}
            value={pw}
            onChange={e => { setPw(e.target.value); setError(''); }}
            disabled={loading}
          />
          {error && <div className="pg-said">{error}</div>}
          <button type="submit" className="pg-go" disabled={loading}>
            {loading ? 'Checking…' : 'Enter →'}
          </button>
        </form>
  );

  // In a panel: the fields, and the words the panel puts over them are its own.
  if (bare) return <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: fonts.sans }}>{fields}</div>;

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', color: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: fonts.sans }}>
      <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'center' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--font-display-weight)', fontSize: 24, letterSpacing: '-0.02em' }}>{cover_name}</div>
          <div style={{ fontFamily: 'var(--font-label)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginTop: 4 }}>Sign in</div>
        </div>
        {fields}
      </div>
    </div>
  );
}
