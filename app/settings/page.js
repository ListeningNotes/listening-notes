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
// The password is written through /api/secrets, from Your keys (Keyring.js),
// and the page is only ever told whether one is set and where it comes from.
// A secret that has been typed is replaced by typing another; it is not shown.
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
import Keyring from '../../components/main_components/Keyring';
import { DIRECTORY_URL } from '../../library/version';
import { tidyJournal } from '../../library/return_address';

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

// ── On the Board, 2026-10-08 ───────────────────────────────────────────────
// Being on the Board is the default for everyone (Miyel's Board brief), and
// this is the one switch that takes a journal off — off every board,
// friends' included. What it means is said before the switch, not after.
// The switch moves only once the registry has answered, so it never says
// on while the journal is off, and the line under it says what happened
// when it could not.
const BOARD_AT = tidyJournal(DIRECTORY_URL).replace(/^www\./, '');

function OnTheBoard() {
  const [on, setOn] = useState(null);   // null until asked
  const [busy, setBusy] = useState(false);
  const [trouble, setTrouble] = useState('');

  useEffect(() => {
    fetch('/api/listing')
      .then(r => (r.ok ? r.json() : null))
      .then(d => setOn(d ? Boolean(d.findable) : null))
      .catch(() => setOn(null));
  }, []);

  async function flip(next) {
    setBusy(true);
    setTrouble('');
    try {
      const res = await fetch('/api/listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listed: next }),
      });
      const d = await res.json().catch(() => ({}));
      if (typeof d.findable === 'boolean') setOn(d.findable);
      if (!res.ok || d.error) throw new Error(d.error || 'That did not work. Nothing changed.');
    } catch (e) {
      setTrouble(e.message);
    }
    setBusy(false);
  }

  return (
    <>
      <p className="st-note">
        Your name, your face and what you&rsquo;re playing are on the board at {BOARD_AT}{' '}&mdash; the same
        things your journal already shows anyone who visits. Your entries stay where they are. Off takes you
        off every board, your friends&rsquo; included.
      </p>
      <label className="st-switch">
        <span>On the board</span>
        <input
          type="checkbox"
          role="switch"
          className="ln-switch"
          checked={Boolean(on)}
          disabled={busy || on === null}
          onChange={e => flip(e.target.checked)}
        />
      </label>
      {(busy || trouble) && (
        <div className="st-foot">
          {busy && <span className="st-said" role="status">{on ? 'Taking you off\u2026' : 'Putting you on\u2026'}</span>}
          {trouble && <span className="st-trouble" role="alert">{trouble}</span>}
        </div>
      )}
    </>
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
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [settings, setSettings] = useState(null);

  const [address, setAddress] = useState('');

  const load = useCallback(async () => {
    const s = await fetch('/api/settings').then(r => r.json());
    const row = s.settings || {};
    setSettings(row);
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

  // Opened at #back-up, 2026-10-20 — the door on the letter a journal writes
  // when it wants a copy of itself (library/letterhead.js) — Settings starts
  // at Back up your journal rather than at its top. The section is drawn only
  // once the sign-in check has answered, too late for the browser's own jump
  // to an anchor, and over the journal Settings is a sheet with a scroller of
  // its own: so the nearest scroller is moved, and nothing under it. What is
  // above the section is still arriving — Your keys reads its rows on its
  // own — and would push it out of view, so it is put back as that settles,
  // until the keeper scrolls or a couple of seconds have passed.
  useEffect(() => {
    if (!authed || window.location.hash !== '#back-up') return undefined;
    const section = document.getElementById('back-up');
    if (!section) return undefined;
    // The nearest box that really scrolls: one that may and has more than it
    // shows. Not the style alone — a box clipped sideways reads as scrolling
    // up and down too, and moving it moves nothing.
    const scrollerOf = () => {
      for (let box = section.parentElement; box && box !== document.body; box = box.parentElement) {
        if (/^(auto|scroll)$/.test(getComputedStyle(box).overflowY) && box.scrollHeight > box.clientHeight + 1) return box;
      }
      return null;
    };
    const scroller = scrollerOf();
    // Clear of the bar over the page, with the section's heading in view.
    const above = 96;
    const place = () => {
      const off = section.getBoundingClientRect().top - (scroller ? scroller.getBoundingClientRect().top : 0) - above;
      if (scroller) scroller.scrollTop += off;
      else window.scrollTo({ top: window.scrollY + off });
    };
    place();
    // As the page grows, and on a few beats besides, for a page the browser
    // is not drawing — a home-screen app waking — where the first never
    // fires.
    const settling = new ResizeObserver(place);
    settling.observe(section.parentElement);
    const beats = [300, 800, 1500].map(ms => setTimeout(place, ms));
    const target = scroller || window;
    const stop = () => {
      settling.disconnect();
      beats.forEach(clearTimeout);
      target.removeEventListener('wheel', stop);
      target.removeEventListener('touchstart', stop);
    };
    target.addEventListener('wheel', stop, { passive: true });
    target.addEventListener('touchstart', stop, { passive: true });
    const enough = setTimeout(stop, 2000);
    return () => { clearTimeout(enough); stop(); };
  }, [authed]);

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

        {/* The Board, after the address it lists. The switch was here on
            2026-10-07 as "Be findable", went to the head of the list that
            evening, and came back on 2026-10-08 as the way off a Board
            everybody is on by default (Miyel's Board brief: "put the switch
            in Settings"). Not drawn on a copy with no directory. */}
        {DIRECTORY_URL && (
          <div className="st-section">
            <h2 className="st-h">The board</h2>
            <OnTheBoard />
          </div>
        )}

        {/* "Your beacon" was here from 2026-09-16 to 2026-09-24: Now logging
            or Quiet. Every journal broadcasts now (Miyel), and a copy that
            had chosen Quiet broadcasts again after the update. */}

        {/* "Optional: AI assistance" was here until 2026-09-18 — an Anthropic
            key, and a paragraph describing the two things it turned on inside
            a listen. Both came out of the software that day, and a settings
            row asking for a key that nothing reads is worse than no row: it
            would have had three beta testers pasting in a key and paying for
            nothing.

            The vault still knows the column and library/secrets.js still
            resolves it, because the schema is additive-only and because that
            is what a retirement is — the plumbing stays, nothing is connected
            to it. */}

        {/* Your keys, 2026-10-20: every way into this journal in one place —
            the passkeys and Add this device, then the password and the spare
            key, each a row with its word at the end
            (components/main_components/Keyring.js). The password was a
            section of its own under it until it was folded in the same day. */}
        <div className="st-section">
          <h2 className="st-h">Your keys</h2>
          <Keyring />
        </div>

        {/* The export, which nothing led to until 2026-09-23. Two presses —
            make a copy, then hand it over — and JournalCopy says why. */}
        <div className="st-section" id="back-up">
          <h2 className="st-h">Back up your journal</h2>
          <JournalCopy />
        </div>

        {/* Here as well as in setup, for anyone who skipped it there, and
            for a copy whose updater was switched off or never arrived. It
            says so itself when it is already on. */}
        <div className="st-section">
          <h2 className="st-h">Automatic updates</h2>
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
