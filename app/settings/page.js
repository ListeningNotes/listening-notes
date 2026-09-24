// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/settings/page.js
// The machinery. Owner-only, reached from the Settings door on the desk.
//
// ── What belongs here and what does not ───────────────────────────────────
// Setup offers to skip almost everything, and Skip has to mean later rather
// than never — so every field it can skip needs a home. This is that home
// for the things that are not printed anywhere: the key, the password and the
// address. Whether the beacon broadcasts was one of them from 2026-09-16 until
// 2026-09-24, when every journal came to broadcast and the switch came out;
// Last.fm was one until 2026-09-16, when it came out of the software altogether. The starting theme and the wording of the key
// were here for an afternoon and came off (2026-09-01) — parked, not
// rejected; the theme column and the definitions column both still exist.
// Light or dark came back for an hour on 2026-09-15 and went again the same
// evening: it has one home, the top right of the beacon, and a preference
// with two homes is a preference somebody has to find twice.
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
// than a side effect of correcting the address.

'use client';

import { useCallback, useEffect, useState } from 'react';
import { fonts } from '../../library/sitewide_visuals';
import SiteNav from '../../components/main_components/SiteNav';
import PasswordGate from '../../components/session_components/PasswordGate';
import AddToHomeScreen from '../../components/main_components/AddToHomeScreen';
import UpdateSwitch from '../../components/main_components/UpdateSwitch';
import JournalCopy from '../../components/main_components/JournalCopy';
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
        <button type="submit" className="st-save ln-word ln-word--on" disabled={busy}>{busy ? 'Saving…' : saveLabel}</button>
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

export default function SettingsPage({ layered = false }) {
  const host = useJournalHost();
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [settings, setSettings] = useState(null);
  const [secrets, setSecrets] = useState(null);

  const [address, setAddress] = useState('');
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
    <div className={'st-page' + (layered ? ' st-page--layered' : '')} style={{ fontFamily: fonts.sans }}>

      <SiteNav />

      <main className="st-main">
        <header className="st-top">
          <h1 className="st-title">Settings</h1>
          <p className="st-kicker">The machinery behind your journal.</p>
        </header>

        <Section
          title="This journal’s address"
          note="Where your card’s code points. Change it if you move the journal to a domain of your own."
          onSave={async () => {
            await send('/api/settings', { site_address: address });
            // The code on the card encodes the address, so it is pressed
            // again once the new one is on the row. Quietly: what happened
            // is in the server's log, not on this form.
            await fetch('/api/portrait/code', { method: 'POST' }).catch(() => {});
          }}
        >
          <input className="st-field" value={address} onChange={e => setAddress(e.target.value)} placeholder="yourname.example.com" inputMode="url" autoCapitalize="none" autoComplete="off" />
        </Section>

        {/* "Your beacon" was here from 2026-09-16 to 2026-09-24: Now logging
            or Quiet. Every journal broadcasts now (Miyel), and a copy that
            had chosen Quiet broadcasts again after the update. */}

        {/* "Optional: AI assistance" was here until 2026-09-18 — an Anthropic
            key, and a paragraph describing the two things it turned on inside
            a listen. Both came out of the software that day (see
            docs/RETIRED-PROMPTS.md), and a settings row asking for a key that
            nothing reads is worse than no row: it would have had June, Zach
            and Blue pasting in a key and paying for nothing.

            The vault still knows the column and library/secrets.js still
            resolves it, because the schema is additive-only and because that
            is what a retirement is — the plumbing stays, nothing is connected
            to it. */}

        <Section
          title="Password"
          note="The one you sign in with. At least eight characters."
          saveLabel="Change password"
          onSave={async () => {
            if (password.length < PASSWORD_FLOOR) throw new Error(`At least ${PASSWORD_FLOOR} characters.`);
            if (password !== confirm) throw new Error('The two passwords do not match.');
            setSecrets(await send('/api/secrets', { password }));
            setPassword(''); setConfirm('');
          }}
        >
          {/* The address the password is filed under — a real, visible,
              writable input, because that is what a password manager will
              pair the password with. Typing into it changes nothing. */}
          <input className="st-field st-who" type="text" name="username" autoComplete="username" value={host} onChange={() => {}} aria-label="Journal" tabIndex={-1} />
          {/* Placeholders where labels were, the way setup asks. */}
          <input className="st-field" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="New password" aria-label="New password" />
          <input className="st-field" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-type password" aria-label="Re-type password" />
        </Section>

        {/* The export, which nothing led to until 2026-09-23. Two presses —
            make a copy, then hand it over — and JournalCopy says why. */}
        <div className="st-section">
          <h2 className="st-h">Back up your journal</h2>
          <JournalCopy />
        </div>

        {/* Here as well as in setup, for anyone who skipped it there, and
            for a copy whose updater was switched off or never arrived. It
            says so itself when it is already on. */}
        <div className="st-section">
          <h2 className="st-h">Keeping up to date</h2>
          <UpdateSwitch explain />
        </div>

        <div className="st-section">
          <h2 className="st-h">On your home screen</h2>
          <AddToHomeScreen explain />
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
