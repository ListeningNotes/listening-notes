// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/settings/page.js
// The machinery. Owner-only, reached from the Settings door on the desk.
//
// ── What belongs here and what does not ───────────────────────────────────
// Setup offers to skip almost everything, and Skip has to mean later rather
// than never — so every field it can skip needs a home. This is that home
// for the things that are not printed anywhere: Last.fm, the two keys, the
// password, and the address. The starting theme and the wording of the key
// were here for an afternoon and came off (2026-09-01) — parked, not
// rejected; the theme column and the definitions column both still exist.
//
// The card's own fields — the name, the photo, the prompts, the links, the
// rig, the pinned record — are not edited here. Everything editable is
// edited where it prints, which is a decision this repo made once and keeps
// making: two editors for one field means neither is the real one. A list of
// doors to the card sat at the foot of this page for a day and came off,
// 2026-09-02 — the pencil on the card is the way, and a list of rows saying
// "not here" was the page apologising for it.
//
// ── Secrets go in and never come back out ─────────────────────────────────
// The keys and the password are written through /api/secrets and the page is
// only ever told whether one is set and its last four characters. A key that
// has been typed is replaced by typing another, or cleared; it is not shown.
//
// ── One Save per section ──────────────────────────────────────────────────
// Rather than one at the foot of the page, so that "that did not save" can
// say which part, and so that changing the password is its own act rather
// than a side effect of correcting a Last.fm username.

'use client';

import { useCallback, useEffect, useState } from 'react';
import { fonts } from '../../library/sitewide_visuals';
import SiteNav from '../../components/main_components/SiteNav';
import PasswordGate from '../../components/session_components/PasswordGate';
import AddToHomeScreen from '../../components/main_components/AddToHomeScreen';
import { useJournalHost } from '../../hooks/useJournalHost';

const PASSWORD_FLOOR = 8;

async function send(url, body) {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || 'That did not save. Try again.');
  return data;
}

// A section with its own Save, its own busy state and its own trouble line.
function Section({ title, note, onSave, children, saveLabel = 'Save' }) {
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState('');
  const [trouble, setTrouble] = useState('');

  async function save(event) {
    event.preventDefault();
    setBusy(true); setSaid(''); setTrouble('');
    try {
      await onSave();
      setSaid('Saved');
      setTimeout(() => setSaid(''), 2200);
    } catch (e) {
      setTrouble(e.message || 'That did not save.');
    }
    setBusy(false);
  }

  return (
    <form className="st-section" onSubmit={save}>
      <h2 className="st-h">{title}</h2>
      {note && <p className="st-note">{note}</p>}
      {children}
      <div className="st-foot">
        <button type="submit" className="st-save" disabled={busy}>{busy ? 'Saving…' : saveLabel}</button>
        {said && <span className="st-said" role="status">{said}</span>}
        {trouble && <span className="st-trouble" role="alert">{trouble}</span>}
      </div>
    </form>
  );
}

// What a stored secret looks like on this page: a line saying it is set and
// where from, and a field to replace it.
function secretLine(status) {
  if (!status) return 'Not set.';
  const where = status.source === 'environment' ? 'set in the environment' : 'set here';
  return `Set, ending ${status.tail} — ${where}.`;
}

export default function SettingsPage() {
  const host = useJournalHost();
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [settings, setSettings] = useState(null);
  const [secrets, setSecrets] = useState(null);

  const [address, setAddress] = useState('');
  const [lastfmUser, setLastfmUser] = useState('');
  const [lastfmKey, setLastfmKey] = useState('');
  const [anthropic, setAnthropic] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const load = useCallback(async () => {
    const [s, k] = await Promise.all([
      fetch('/api/settings').then(r => r.json()),
      fetch('/api/secrets').then(r => r.json()),
    ]);
    const row = s.settings || {};
    setSettings(row);
    setSecrets(k);
    setAddress(row.site_address || '');
    setLastfmUser(row.lastfm_user || '');
  }, []);

  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.json())
      .then(async d => {
        if (d.authed) { await load(); setAuthed(true); }
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [load]);

  if (checking) return <div style={{ minHeight: '100dvh', background: 'var(--bg)' }} />;
  // Signed out, this page *is* the sign-in: the three taps on the mark and
  // the pitch pane's line both land here. See WritingAccess.
  if (!authed) return <PasswordGate onAuth={async () => { await load(); setAuthed(true); }} />;

  return (
    <div className="st-page" style={{ fontFamily: fonts.sans }}>

      <SiteNav />

      <main className="st-main">
        <h1 className="st-title">Settings</h1>
        <p className="st-kicker">The machinery</p>

        <Section
          title="This journal’s address"
          note="Where the card’s scannable code points. Filled in from wherever the copy was first opened; change it if you have since put the journal on a domain of your own."
          onSave={() => send('/api/settings', { site_address: address })}
        >
          <input className="st-field" value={address} onChange={e => setAddress(e.target.value)} placeholder="yourname.example.com" inputMode="url" autoCapitalize="none" autoComplete="off" />
        </Section>

        <Section
          title="Last.fm"
          note={<>Connect your journal to a Last.fm account so you can have a live beacon of what you’re listening to. Create a free account, connect it to Spotify or Apple Music, then get an API key at <a href="https://www.last.fm/api/account/create" target="_blank" rel="noopener noreferrer">last.fm/api</a>.</>}
          onSave={async () => {
            await send('/api/settings', { lastfm_user: lastfmUser });
            if (lastfmKey.trim()) {
              setSecrets(await send('/api/secrets', { lastfm_key: lastfmKey.trim() }));
              setLastfmKey('');
            }
          }}
        >
          <div>
            <span className="st-label">Username</span>
            <input className="st-field" value={lastfmUser} onChange={e => setLastfmUser(e.target.value)} autoCapitalize="none" autoComplete="off" />
          </div>
          <div>
            <span className="st-label">API key</span>
            <p className="st-status">
              {secretLine(secrets?.lastfm_key)}
              {secrets?.lastfm_key?.source === 'journal' && (
                <button type="button" className="st-clear" onClick={async () => setSecrets(await send('/api/secrets', { lastfm_key: '' }))}>Clear</button>
              )}
            </p>
            <input className="st-field" value={lastfmKey} onChange={e => setLastfmKey(e.target.value)} placeholder={secrets?.lastfm_key ? 'Replace it' : 'Paste it here'} autoCapitalize="none" autoComplete="off" spellCheck={false} />
            <p className="st-status" style={{ marginTop: 8 }}>
              The form asks for an application name and a description. Any name works — your
              journal’s — and one line for the description. Leave the callback URL blank. You want
              the API key, not the shared secret.
            </p>
          </div>
        </Section>

        <Section
          title="Optional: AI assistance"
          note={<>If you add an Anthropic key, two things appear during a listening session. Research looks the album up and cites its sources, so you can read the background before you start. And a question mark you can open at any point, which already knows the record and what you’ve written so far — useful for asking questions during a listen, or for finding a common thread through multiple track notes. Nothing it says goes into your entry. You read it, then you write what you write. Get a key at <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer">console.anthropic.com</a>. You pay your own usage, and most people spend under a dollar a month. Note that it draws from an API balance, which is separate from a Claude.ai subscription. Everything else works without it.</>}
          onSave={async () => {
            if (!anthropic.trim()) return;
            setSecrets(await send('/api/secrets', { anthropic_key: anthropic.trim() }));
            setAnthropic('');
          }}
        >
          <div>
            <span className="st-label">Anthropic API key</span>
            <p className="st-status">
              {secretLine(secrets?.anthropic_key)}
              {secrets?.anthropic_key?.source === 'journal' && (
                <button type="button" className="st-clear" onClick={async () => setSecrets(await send('/api/secrets', { anthropic_key: '' }))}>Clear</button>
              )}
            </p>
            <input className="st-field" value={anthropic} onChange={e => setAnthropic(e.target.value)} placeholder={secrets?.anthropic_key ? 'Replace it' : 'Paste it here'} autoCapitalize="none" autoComplete="off" spellCheck={false} />
          </div>
        </Section>

        <Section
          title="Password"
          note="Change the password you sign in with. At least eight characters."
          saveLabel="Change password"
          onSave={async () => {
            if (password.length < PASSWORD_FLOOR) throw new Error(`At least ${PASSWORD_FLOOR} characters.`);
            if (password !== confirm) throw new Error('The two passwords do not match.');
            setSecrets(await send('/api/secrets', { password }));
            setPassword(''); setConfirm('');
          }}
        >
          <div>
            <span className="st-label">Journal</span>
            {/* The address the password is filed under — a real, visible,
                writable input, because that is what a password manager will
                pair the password with. Typing into it changes nothing. */}
            <input className="st-field st-who" type="text" name="username" autoComplete="username" value={host} onChange={() => {}} aria-label="Journal" tabIndex={-1} />
          </div>
          <div>
            <span className="st-label">New password</span>
            <input className="st-field" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <div>
            <span className="st-label">Again</span>
            <input className="st-field" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} />
          </div>
        </Section>

        <div className="st-section">
          <h2 className="st-h">On your home screen</h2>
          <AddToHomeScreen />
        </div>

        {/* The only way out. The route has existed since the wristband did
            and nothing ever called it, so signing out meant clearing cookies.
            Here because Settings is the owner's page: you came in through it
            and you leave through it. A full load afterwards, so the page
            renders as a visitor's rather than keeping the desk on screen with
            no cookie behind it. */}
        <div className="st-section st-section--out">
          <button
            type="button"
            className="st-clear"
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
              window.location.assign('/');
            }}
          >
            Sign out
          </button>
        </div>
      </main>
    </div>
  );
}
