// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/setup/page.js
// Who this copy belongs to. Asked once, one screen at a time.
//
// ── A route, not a takeover ───────────────────────────────────────────────
// Same shape as /login and for the same reason: a screen that is only ever
// reached by being redirected to it cannot be linked, bookmarked, or reached
// again after a half-finished attempt. It redirects home once the journal has
// been claimed, exactly as /login redirects home once you are wearing a
// wristband.
//
// ── One screen at a time, and everything after the name says Skip ─────────
// The old version was one form with four fields, and two of the four were
// there only because nothing else could write them. Neither is asked now:
// the address is the host the request came in on, and the founding date is
// today. What is left is the name, which is the only thing the journal
// needs, and then a series of things it would be nice to have — the photo,
// the prompts, the rig, Last.fm, the Anthropic key — each on its own screen with a
// Skip under it. Skip means later, not never: every one of them has a home
// afterwards, on the card or at /settings, which is what makes offering to
// skip honest.
//
// The password is near the end rather than first. It is the thing the
// person is least sure about, and by then they have told the journal their
// name and seen it take a photograph, which is a better moment to be asked
// to choose one than a blank form is. After it, one more screen: add the
// journal to the home screen. iOS cannot be asked to do that by a page, so
// the screen shows the gesture and the icon; it is skippable and lives in
// Settings too.
//
// ── How the door opens before there is a password ─────────────────────────
// There is no password yet on a fresh copy, so the gate asks for the claim
// code instead — the one printed in the build log while the copy was
// deploying, which only the person who deployed it has seen. It buys a
// wristband like a password would, and the wristband is what the rest of
// these screens write with. A copy that was locked the old way, with
// SESSION_PASSWORD in the environment, asks for that password as before;
// the password screen is still required, and the one chosen there takes
// over.
//
// ── What each screen writes, and when ─────────────────────────────────────
// Next writes; Skip writes nothing. The photo goes up the moment it is chosen
// (it is the one field that can fail on its own terms). The name and the
// password wait for the last screen, because they are what the claim is made
// of, and the claim is the one write that has to be all or nothing.

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CaretDown, Check } from '@phosphor-icons/react';
import { fonts } from '../../library/sitewide_visuals';
import { BIO_PROMPTS, BIO_LIMIT } from '../../library/bioprompt';
import PasswordGate from '../../components/session_components/PasswordGate';
import { shrink } from '../../components/main_components/IdentificationCardEditor';
import AddToHomeScreen from '../../components/main_components/AddToHomeScreen';
import { useJournalHost } from '../../hooks/useJournalHost';

// The password claims the journal; the home screen comes after, because it is
// the one step the software cannot perform and the moment right after the
// journal starts working is the moment somebody will actually do it.
// Links used to sit between Last.fm and the rig and are retired from the
// whole site for now — see About.js.
const STEPS = ['name', 'photo', 'prompts', 'rig', 'lastfm', 'anthropic', 'password', 'homescreen'];
const PASSWORD_FLOOR = 8;

async function patchSettings(fields) {
  const res = await fetch('/api/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error('That did not save. Try again.');
}

async function patchSecrets(fields) {
  const res = await fetch('/api/secrets', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error('That did not save. Try again.');
}

export default function WelcomeScreen() {
  const router = useRouter();
  const host = useJournalHost();
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  // Whether a password already exists — from the environment, on a copy
  // locked the old way — which decides what the gate asks for and whether
  // the password screen may be skipped.
  const [hasPassword, setHasPassword] = useState(false);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [portrait, setPortrait] = useState('');
  const [bio, setBio] = useState(() => Array.from({ length: BIO_LIMIT }, () => ({ key: '', answer: '' })));
  // Which slot has its list of openings open, if any. One at a time — the
  // About pane's rule, for the About pane's reason: two lists of nine
  // sentences open at once is most of the screen.
  const [picking, setPicking] = useState(null);
  const [lastfmUser, setLastfmUser] = useState('');
  const [lastfmKey, setLastfmKey] = useState('');
  const [anthropic, setAnthropic] = useState('');
  const [gear, setGear] = useState([{ name: '', role: '' }]);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  // ── Rehearsal ─────────────────────────────────────────────────────────────
  // /setup?rehearse shows the screens on a copy that is already claimed, for
  // its owner, and writes nothing: Next moves on without saving, the photo
  // is previewed and not uploaded, and the last screen goes home. It exists
  // so the setup can be looked at without a fresh database, which is the one
  // thing a working journal does not have.
  const [rehearsing, setRehearsing] = useState(false);

  // The code, if the person arrived by the link in the build log. Tried
  // once, silently, before anything is drawn: if it opens the door the first
  // thing they see is the name screen, and the words "claim code" never come
  // up. If it does not — used already, mistyped, expired — the gate shows
  // with the code already in the field, so the worst case is one press.
  const [codeFromLink, setCodeFromLink] = useState('');

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const rehearse = query.has('rehearse');
    const code = (query.get('code') || '').trim();
    Promise.all([
      fetch('/api/auth/check').then(r => r.json()).catch(() => ({})),
      fetch('/api/setup').then(r => r.json()).catch(() => ({ claimed: true })),
    ]).then(async ([auth, status]) => {
      // Already claimed: there is nothing to do here and a form that appears
      // to save write-once fields it will silently drop is worse than none.
      // Unless the owner asked to see it again.
      if (status?.claimed && !(rehearse && auth.authed)) { router.replace('/'); return; }
      setRehearsing(Boolean(status?.claimed && rehearse));
      setHasPassword(Boolean(status?.has_password));
      let admitted = !!auth.authed;
      const knock = async password => {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        }).catch(() => null);
        return Boolean(res?.ok);
      };
      // The window first: for half an hour after the build the door opens
      // to a knock with nothing in it, which is how pressing the picture on
      // Vercel's Congratulations screen lands here with nothing to type.
      if (!admitted && !status?.claimed && status?.open) {
        admitted = await knock('');
      }
      // Then the code, if the person arrived by the link in the log.
      if (!admitted && code && !status?.claimed) {
        admitted = await knock(code);
        if (!admitted) setCodeFromLink(code);
        // The code comes off the address either way. It is a one-time secret
        // and should not sit in the history or get pasted on somewhere.
        window.history.replaceState(null, '', '/setup');
      }
      setAuthed(admitted);
      setChecking(false);
    });
  }, [router]);

  const current = STEPS[step];
  const last = step === STEPS.length - 1;
  // The journal is claimed on the password screen; the screen after it only
  // leaves. Once claimed, Back is no longer offered — there is nothing behind
  // it that could still be changed here.
  const claimed = current === 'homescreen';

  // Move on, after doing whatever this screen's Next does. Skip calls it with
  // nothing to do.
  async function advance(work) {
    setError('');
    setBusy(true);
    try {
      if (work && !rehearsing) await work();
      if (last) {
        // A full load rather than a push. The hold in the root layout is
        // decided on the server from a value that has just changed, and the
        // cached answer behind it lives in the server process — a client
        // navigation would re-use a tree rendered while this copy was still
        // unclaimed.
        window.location.assign('/');
        return;
      }
      setStep(s => s + 1);
    } catch (e) {
      setError(e.message || 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  // ── The claim ─────────────────────────────────────────────────────────────
  async function claim() {
    const chosen = password;
    if (chosen.length < PASSWORD_FLOOR) throw new Error(`At least ${PASSWORD_FLOOR} characters.`);
    if (chosen !== confirm) throw new Error('The two passwords do not match.');
    const res = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keeper_name: name, password: chosen }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) throw new Error(data.error || 'Setup failed');
  }

  // ── The photo ─────────────────────────────────────────────────────────────
  const fileRef = useRef(null);
  async function choosePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const body = await shrink(file);
      if (rehearsing) {
        setPortrait(`data:${body.mime};base64,${body.data}`);
        setBusy(false);
        return;
      }
      const res = await fetch('/api/portrait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const answer = await res.json();
      if (!res.ok) throw new Error(answer.error || 'That did not upload.');
      setPortrait(answer.portrait_url);
      await patchSettings({ portrait_url: answer.portrait_url, portrait_position: '50.0% 50.0%' });
    } catch (e) {
      setError(e.message === 'unreadable' ? 'That file could not be read as a picture.' : e.message);
    }
    setBusy(false);
  }

  if (checking) return <div style={{ minHeight: '100dvh', background: 'var(--bg)' }} />;

  return (
    <div className="su-page" style={{ fontFamily: fonts.sans }}>

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

        {!authed ? (
          <>
            <div className="su-line">{hasPassword ? 'Writing access' : 'Claim this journal'}</div>
            {!hasPassword && (
              <p className="su-why" style={{ textAlign: 'center', marginBottom: 18 }}>
                {codeFromLink
                  ? 'That link did not open the door. The code from it is below — press Enter to try again, or find the newest one in the build log.'
                  : 'Setup was open for half an hour after this copy was built, and that has passed. The quickest way back in: in Vercel, open the project, press Redeploy on its latest deployment, and come back here once it finishes. Or type the code from the end of the build log.'}
              </p>
            )}
            <PasswordGate bare asking={hasPassword ? 'password' : 'claim code'} initial={codeFromLink} onAuth={() => setAuthed(true)} />
          </>
        ) : (
          <>
            {/* ── The lights ──────────────────────────────────────────────
                The session's step dots, borrowed: one light per screen, lit
                once you have been through it, the current one ringed. Under
                them a track that fills as far as you have come, so it reads
                as a loading bar as much as a row of lights — and it moves
                when you press Next, which is the moment a person looks at it.
                Not buttons here, unlike the session's: the screens are in
                order and Back is underneath. */}
            <div
              className="su-lights"
              role="progressbar"
              aria-label="Setup progress"
              aria-valuemin={1}
              aria-valuemax={STEPS.length}
              aria-valuenow={step + 1}
              aria-valuetext={`Step ${step + 1} of ${STEPS.length}`}
            >
              <span className="su-track" aria-hidden="true">
                <span className="su-fill" style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
              </span>
              {STEPS.map((name, i) => (
                <span
                  key={name}
                  aria-hidden="true"
                  className={'su-light' + (i < step ? ' su-light--past' : '') + (i === step ? ' su-light--current' : '')}
                />
              ))}
            </div>
            <div className="su-line">
              {rehearsing && <span className="su-count">Rehearsal — nothing is saved</span>}
              {{
                name: 'Whose journal is this?',
                photo: 'A photo',
                prompts: 'Three openings',
                lastfm: 'What you are playing',
                anthropic: 'Optional: AI assistance',
                rig: 'What you listen on',
                password: 'A password',
                homescreen: 'One more thing',
              }[current]}
            </div>

            {current === 'name' && (
              <form className="su-fields" onSubmit={e => { e.preventDefault(); if (name.trim()) advance(); }}>
                <div>
                  <span className="su-label">Your name</span>
                  <input className="su-field" value={name} onChange={e => setName(e.target.value)} placeholder="Miyel" autoFocus autoComplete="name" />
                </div>
                <button type="submit" className="su-go" disabled={busy || !name.trim()}>Next</button>
              </form>
            )}

            {current === 'photo' && (
              <div className="su-fields">
                <label className="su-photo">
                  <input ref={fileRef} className="su-file" type="file" accept="image/*" onChange={choosePhoto} disabled={busy} />
                  {portrait ? <img src={portrait} alt="" /> : <span>{busy ? 'Working…' : 'Choose a photo'}</span>}
                </label>
                <div className="su-hint" style={{ textAlign: 'center' }}>
                  It goes on the card. You can reframe or replace it there later.
                </div>
                <button type="button" className="su-go" disabled={busy || !portrait} onClick={() => advance()}>Next</button>
              </div>
            )}

            {current === 'prompts' && (
              <div className="su-fields">
                <p className="su-why">Three sentences a visitor reads about you. Pick an opening and finish it. Any number of the three can stay empty.</p>
                {/* The About pane's picker, wearing the same classes: press
                    the line, the list opens under it, press a line to take
                    it. A native select was here for a day and drew the
                    system's own grey wheel on a phone, which is the one
                    bevelled thing on a site made of rules and type. Choosing
                    an opening already used in another slot swaps the two
                    rather than refusing. */}
                <div className="su-prompts">
                  {bio.map((row, i) => {
                    const chosen = BIO_PROMPTS.find(p => p.key === row.key) || null;
                    const open = picking === i;
                    return (
                      <div className="ab-prompt-edit" key={i}>
                        <button
                          type="button"
                          className={'ab-prompt-pick' + (open ? ' ab-prompt-pick--on' : '')}
                          onClick={() => setPicking(open ? null : i)}
                          aria-expanded={open}
                          aria-label={`Opening ${i + 1}`}
                        >
                          <span className={chosen ? 'ab-prompt-ask' : 'ab-prompt-none'}>
                            {chosen ? chosen.text : 'Choose an opening'}
                          </span>
                          <CaretDown size={11} weight="bold" aria-hidden="true" />
                        </button>
                        {open && (
                          <div className="ab-prompt-menu" role="group" aria-label="Openings">
                            {BIO_PROMPTS.map(prompt => {
                              const on = prompt.key === row.key;
                              const elsewhere = !on && bio.some((r, j) => j !== i && r.key === prompt.key);
                              return (
                                <button
                                  key={prompt.key}
                                  type="button"
                                  className={'ab-prompt-opt' + (on ? ' ab-prompt-opt--on' : '') + (elsewhere ? ' ab-prompt-opt--taken' : '')}
                                  onClick={() => {
                                    setBio(rows => rows.map((r, j) => {
                                      if (j === i) return { ...r, key: prompt.key };
                                      if (r.key === prompt.key) return { ...r, key: rows[i].key };
                                      return r;
                                    }));
                                    setPicking(null);
                                  }}
                                  aria-pressed={on}
                                >
                                  <span>{prompt.text}</span>
                                  {on && <Check size={12} weight="bold" aria-hidden="true" />}
                                  {elsewhere && <span className="ab-prompt-taken" aria-hidden="true">in use</span>}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <textarea
                          className="ab-prompt-input"
                          rows={1}
                          value={row.answer}
                          onChange={e => {
                            const el = e.currentTarget;
                            setBio(rows => rows.map((r, j) => (j === i ? { ...r, answer: el.value } : r)));
                            el.style.height = 'auto';
                            el.style.height = `${el.scrollHeight}px`;
                          }}
                          onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
                          placeholder={row.key ? 'Finish the sentence' : ''}
                          disabled={!row.key}
                          aria-label={chosen ? chosen.text : `Answer ${i + 1}`}
                        />
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button" className="su-go" disabled={busy}
                  onClick={() => advance(async () => {
                    const clean = bio.map(r => ({ key: r.key, answer: r.answer.trim() })).filter(r => r.key && r.answer);
                    if (clean.length) await patchSettings({ bioanswers: clean });
                  })}
                >Next</button>
              </div>
            )}

            {current === 'rig' && (
              <form className="su-fields" onSubmit={e => { e.preventDefault(); advance(async () => {
                const clean = gear.map(g => ({ name: g.name.trim(), role: g.role.trim() })).filter(g => g.name);
                if (clean.length) await patchSettings({ rig: clean });
              }); }}>
                <p className="su-why">The setup you listen on, as rows: the thing, and what it does. Speakers, an amp, a turntable, a pair of headphones.</p>
                {gear.map((g, i) => (
                  <div className="su-pair" key={i}>
                    <input className="su-field" value={g.name} placeholder="KEF LS50" onChange={e => setGear(rows => rows.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)))} />
                    <input className="su-field" value={g.role} placeholder="Speakers" onChange={e => setGear(rows => rows.map((r, j) => (j === i ? { ...r, role: e.target.value } : r)))} />
                  </div>
                ))}
                <button type="button" className="su-add" onClick={() => setGear(rows => [...rows, { name: '', role: '' }])}>+ Another</button>
                <button type="submit" className="su-go" disabled={busy || !gear.some(g => g.name.trim())}>Next</button>
              </form>
            )}

            {current === 'lastfm' && (
              <form className="su-fields" onSubmit={e => { e.preventDefault(); advance(async () => {
                if (lastfmUser.trim()) await patchSettings({ lastfm_user: lastfmUser.trim() });
                if (lastfmKey.trim()) await patchSecrets({ lastfm_key: lastfmKey.trim() });
              }); }}>
                <p className="su-why">
                  Connect your journal to a Last.fm account so you can have a
                  live beacon of what you’re listening to. Create a free
                  account, connect it to Spotify or Apple Music, then get an
                  API key at{' '}
                  <a href="https://www.last.fm/api/account/create" target="_blank" rel="noopener noreferrer">last.fm/api</a>.
                </p>
                <div>
                  <span className="su-label">Last.fm username</span>
                  <input className="su-field" value={lastfmUser} onChange={e => setLastfmUser(e.target.value)} autoComplete="off" autoCapitalize="none" />
                </div>
                <div>
                  <span className="su-label">Last.fm API key</span>
                  <input className="su-field" value={lastfmKey} onChange={e => setLastfmKey(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} />
                  <div className="su-hint">
                    The form asks for an application name and a description. Any name works — your
                    journal’s — and one line for the description, like “shows what I’m listening to
                    on my own site”. Leave the callback URL blank. You want the API key, not the shared secret.
                  </div>
                </div>
                <button type="submit" className="su-go" disabled={busy || !lastfmUser.trim()}>Next</button>
              </form>
            )}

            {current === 'anthropic' && (
              <form className="su-fields" onSubmit={e => { e.preventDefault(); advance(async () => {
                if (anthropic.trim()) await patchSecrets({ anthropic_key: anthropic.trim() });
              }); }}>
                <p className="su-why">
                  If you add an Anthropic key, two things appear during a
                  listening session. Research looks the album up and cites its
                  sources, so you can read the background before you start. And
                  a question mark you can open at any point, which already knows
                  the record and what you’ve written so far — useful for asking
                  questions during a listen, or for finding a common thread
                  through multiple track notes. Nothing it says goes into your
                  entry. You read it, then you write what you write.
                </p>
                <p className="su-why">
                  Get a key at{' '}
                  <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer">console.anthropic.com</a>.
                  You pay your own usage, and most people spend under a dollar a
                  month. Note that it draws from an API balance, which is
                  separate from a Claude.ai subscription. Everything else works
                  without it.
                </p>
                <div>
                  <span className="su-label">Anthropic API key</span>
                  <input className="su-field" value={anthropic} onChange={e => setAnthropic(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} />
                  <div className="su-hint">Kept on your own server and never shown to a visitor.</div>
                </div>
                <button type="submit" className="su-go" disabled={busy || !anthropic.trim()}>Next</button>
              </form>
            )}

            {current === 'password' && (
              <form className="su-fields" onSubmit={e => { e.preventDefault(); advance(claim); }}>
                <p className="su-why">What you’ll type to reach the writing side of your journal.</p>
                {/* The address the password is filed under — the same value
                    the sign-in form and Settings use, so the entry saved here
                    is the one offered later. Visible and writable, because a
                    password manager ignores a field it considers hidden and
                    Safari skips a read-only one. Typing into it does nothing.
                    See hooks/useJournalHost.js. */}
                <div>
                  <span className="su-label">Journal</span>
                  <input className="su-field su-who" type="text" name="username" autoComplete="username" value={host} onChange={() => {}} aria-label="Journal" tabIndex={-1} />
                </div>
                <div>
                  <span className="su-label">Password</span>
                  <input className="su-field" type="password" name="new-password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} minLength={PASSWORD_FLOOR} />
                  <div className="su-hint">At least {PASSWORD_FLOOR} characters.</div>
                </div>
                <div>
                  <span className="su-label">Again</span>
                  <input className="su-field" type="password" name="confirm-password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} />
                </div>
                <button type="submit" className="su-go" disabled={busy || !password || !confirm}>
                  {busy ? 'Claiming…' : 'Claim the journal'}
                </button>
              </form>
            )}

            {current === 'homescreen' && (
              <div className="su-fields">
                <p className="su-why" style={{ textAlign: 'center' }}>It’s yours. Put it on your home screen.</p>
                <AddToHomeScreen centered />
                <button type="button" className="su-go" disabled={busy} onClick={() => advance()}>Open the journal</button>
              </div>
            )}

            {error && <div className="su-error">{error}</div>}

            {step > 0 && !claimed && (
              <div className="su-under">
                <button type="button" className="su-back" disabled={busy} onClick={() => { setError(''); setStep(s => s - 1); }}>Back</button>
                {/* No Skip on the password screen. Under this flow nobody
                    typed one at deploy, so there is nothing to keep; a
                    developer who set SESSION_PASSWORD by hand can find
                    Settings. */}
                {current !== 'password' && (
                  <button type="button" className="su-skip" disabled={busy} onClick={() => advance()}>Skip</button>
                )}
              </div>
            )}
            {claimed && (
              <div className="su-under" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="su-skip" disabled={busy} onClick={() => advance()}>Later — it’s in Settings</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
