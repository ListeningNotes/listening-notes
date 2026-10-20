// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { Fragment, useEffect, useState } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import { ArrowRight } from '@phosphor-icons/react';
import { fonts } from '../../library/sitewide_visuals';
import { useBookplate } from '../main_components/Bookplate';
import { useJournalHost } from '../../hooks/useJournalHost';
import { canHoldKeys, markKeyHere, readyToOffer, KeyOffer } from '../main_components/Keyring';

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
// `autoFocus` puts the cursor in the field as it appears — for the lock on
// the pitch pane, where the field only exists because a key was just pressed.
//
// ── A key first, 2026-10-20 ───────────────────────────────────────────────
// Where the journal has a passkey on its ring (library/keyring.js), the door
// opens to one line, *Only [keeper] can write here.*, an Unlock that asks the
// device for Face ID or its like, and *use your password* under it (Miyel's
// words, 2026-10-17: the line names the person and what the lock guards, so
// it reads the same to somebody who calls this a journal or a blog). Where
// it has none, the password field is the door, as it always was. The claim
// code is untouched. After the password opens it, on a device that could
// use Face ID instead, the door asks *Use Face ID next time?* before letting
// the keeper through (KeyOffer, in Keyring.js; Miyel's words).
//
// ── A soft field, 2026-10-20 ──────────────────────────────────────────────
// Miyel's pick over a boxed field and a faint Enter: the password sits in a
// soft well with an arrow at its end, and the journal's address — the name
// a password manager files it under — is a small line under it. Under it to
// the eye only: in the markup it still comes first, because a manager takes
// the field before a password for its username.
//
// ── The spare key, 2026-10-20 ─────────────────────────────────────────────
// Where one is waiting, *use your spare key* sits beside *use your password*
// (Miyel's words, 2026-10-17), and under the field where the field is the
// door. It asks for the sixteen characters in the same well, through the
// same route, and opens once: the sign-in spends it (library/secrets.js).
// The field it uses is no password, so it carries no username for a manager
// to file it under, and is never offered to be saved over the password.

// The lock's options, fetched before anything is pressed: Safari lets Face
// ID be asked for only straight from a press, and a press that waited on the
// network first would be refused. The challenge lasts five minutes, so a
// caller asks again every four. Returns { options, any, spare, password },
// or null: `spare` is whether a spare key is waiting, `password` whether the
// journal has one at all.
export async function askTheLock() {
  try {
    const r = await fetch('/api/auth/passkey', { cache: 'no-store' });
    if (!r.ok) return null;
    const d = await r.json();
    return d?.options
      ? { options: d.options, any: Boolean(d.any), spare: Boolean(d.spare), password: d.password !== false }
      : null;
  } catch {
    return null;
  }
}

// Open the door with this device's key. Called straight from a press, with
// what askTheLock fetched. Returns { ok }, or { ok: false } with `error` to
// say, `cancelled` when the device was told no, and `unknown` when the key
// is not on the journal's ring any more.
export async function unlockWith(asked) {
  let response;
  try {
    response = await startAuthentication({ optionsJSON: asked.options });
  } catch {
    // Face ID dismissed, or no key for this journal on this device: the
    // browser does not say which, and neither is worth a sentence.
    return { ok: false, cancelled: true };
  }
  try {
    const r = await fetch('/api/auth/passkey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      if (d.unknown) markKeyHere(false);
      return {
        ok: false,
        unknown: Boolean(d.unknown),
        error: d.error || (r.status === 429 ? 'Too many attempts. Wait a minute.' : 'That key didn’t work.'),
      };
    }
    markKeyHere(true);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Something went wrong. Try again.' };
  }
}

export default function PasswordGate({ onAuth, bare = false, asking = 'password', initial = '', autoFocus = false }) {
  const claiming = asking === 'claim code';
  // The journal's own name over the password box, rather than the name of the
  // journal this software was written for. The owner is the only person who
  // ever sees this screen, and seeing a stranger's name on the way into your
  // own writing is the exact wrong first impression for a copy to make.
  const { cover_name, keeper_name } = useBookplate();
  const host = useJournalHost();
  const [pw, setPw] = useState(initial);
  // A string now rather than a flag, because there are two things that can go
  // wrong here and "incorrect password" is the wrong thing to say about the
  // other one.
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // The key's half of the door. `asked` is undefined until the lock has
  // answered, null if it could not, and { options, any, spare } once it has.
  // `way` is what was chosen over the key: 'password' or 'spare'.
  const [keyed, setKeyed] = useState(false);
  const [asked, setAsked] = useState(undefined);
  const [way, setWay] = useState(null);
  const [unlocking, setUnlocking] = useState(false);
  // The offer to make this device a key, once the password has opened the
  // door: what readyToOffer found, or null.
  const [offering, setOffering] = useState(null);
  // Asked on every device, keys or none, because the answer also says whether
  // a spare key is waiting; only a device that can hold a key asks again.
  useEffect(() => {
    if (claiming) return undefined;
    const can = canHoldKeys();
    if (can) setKeyed(true);
    let gone = false;
    const ask = async () => { const a = await askTheLock(); if (!gone) setAsked(a); };
    ask();
    const again = can ? setInterval(ask, 4 * 60 * 1000) : null;
    return () => { gone = true; if (again) clearInterval(again); };
  }, [claiming]);

  // Before the lock has answered there is nothing to draw but the line; after,
  // Unlock where there are keys, the field where there are none.
  const offerKey = keyed && asked?.any && !way;
  const showField = !keyed || Boolean(way) || (asked !== undefined && !asked?.any);
  // A journal with no password (claimed with Face ID) is never offered one:
  // where it has no key either, the field is the spare key's.
  const noPassword = asked?.password === false;
  const spareWay = way === 'spare' || (!way && showField && noPassword && Boolean(asked?.spare));
  // The other ways in, as words under the door: the password where it is not
  // already the field and there is one, and the spare key where one waits.
  const others = [];
  if (!claiming && !noPassword && !(showField && !spareWay)) others.push(['password', 'use your password']);
  if (!claiming && asked?.spare && !spareWay) others.push(['spare', 'use your spare key']);
  function choose(chosen) { setWay(chosen); setPw(''); setError(''); }
  const name = String(keeper_name || '').trim();
  const line = !claiming && name ? `Only ${name} can write here.` : '';

  async function unlock() {
    if (!asked?.options || unlocking) return;
    setUnlocking(true);
    setError('');
    const done = await unlockWith(asked);
    setUnlocking(false);
    if (done.ok) { onAuth(); return; }
    if (!done.cancelled) setError(done.error);
    // The challenge is spent either way: the next press needs a fresh one.
    setAsked(await askTheLock());
  }

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
        body: JSON.stringify(spareWay ? { spare: pw } : { password: pw }),
      });
      if (res.ok) {
        // In, and asked first whether this device should open it with Face
        // ID from now on, where it could.
        const ready = claiming ? null : await readyToOffer();
        if (ready) { setOffering(ready); return; }
        onAuth();
      } else if (res.status === 429) {
        // The doorman, not a wrong password. Saying so matters: five bad
        // guesses and then silence would read as the password having stopped
        // working, and the person reading it is the owner.
        const body = await res.json().catch(() => null);
        setError(body?.error || 'Too many attempts. Wait a minute.');
        setPw('');
      } else {
        setError(claiming ? 'That code did not match' : spareWay ? 'That spare key didn’t work.' : 'Incorrect password');
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
          {!spareWay && (
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
          )}
          <div className={'pg-well' + (error ? ' pg-well--wrong' : '')}>
            <input
              key={spareWay ? 'spare' : 'password'}
              type={claiming || spareWay ? 'text' : 'password'}
              name={spareWay ? 'spare-key' : 'password'}
              autoComplete={claiming || spareWay ? 'off' : 'current-password'}
              autoCapitalize={spareWay ? 'characters' : undefined}
              autoCorrect={spareWay ? 'off' : undefined}
              spellCheck={spareWay ? false : undefined}
              placeholder={claiming ? 'claim code' : spareWay ? 'spare key' : 'password'}
              className="pg-pw"
              value={pw}
              onChange={e => { setPw(e.target.value); setError(''); }}
              disabled={loading}
              autoFocus={autoFocus || Boolean(way)}
            />
            <button type="submit" className="pg-arrow" disabled={loading} aria-label={loading ? 'Checking' : 'Enter'}>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
          {error && <div className="pg-said">{error}</div>}
        </form>
  );

  // The door: the line, then Unlock and the password under it where there
  // are keys, or the field where there are none.
  const door = offering ? <KeyOffer ready={offering} onDone={onAuth} /> : (
    <>
      {line && <p className="pg-line">{line}</p>}
      {offerKey && (
        <>
          <button type="button" className="pg-go pg-unlock" onClick={unlock} disabled={unlocking}>
            {unlocking ? 'Unlocking…' : 'Unlock'}
          </button>
          {error && <div className="pg-said">{error}</div>}
        </>
      )}
      {showField && fields}
      {others.length > 0 && (offerKey || showField) && (
        <p className="pg-ways">
          {others.map(([chosen, words], i) => (
            <Fragment key={chosen}>
              {i > 0 && <span className="pg-dot" aria-hidden="true">·</span>}
              <button type="button" className="pg-or" onClick={() => choose(chosen)}>{words}</button>
            </Fragment>
          ))}
        </p>
      )}
    </>
  );

  // In a panel: the door, and the words the panel puts over it are its own.
  if (bare) return <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: fonts.sans }}>{door}</div>;

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', color: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: fonts.sans }}>
      <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'center' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--font-display-weight)', fontSize: 24, letterSpacing: '-0.02em' }}>{cover_name}</div>
          {/* The line says what this door is once a keeper is named; until
              then — a copy being set up — the old label does. */}
          {!line && <div style={{ fontFamily: 'var(--font-label)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginTop: 4 }}>Sign in</div>}
        </div>
        {door}
      </div>
    </div>
  );
}
