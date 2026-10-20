// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/Keyring.js
// Your keys, in Settings: the passkeys that open this journal (Miyel's
// names, 2026-10-17 — the keyring, and the section Your keys).
//
// Each key is a device — "iPhone · added Oct 20" — and Add this device makes
// one here, with Face ID or its like (library/keyring.js). A key comes off
// the ring with two presses, the × and then the word, so a stray tap takes
// nothing; the last way into a journal with no password does not come off
// at all (app/api/keyring). The device's options are fetched before the
// press and again every four minutes, for the reason the lock's are: Safari
// asks for Face ID only straight from a press (PasswordGate.js).
//
// A browser that cannot hold a key — the dev server on a phone, over plain
// http — is told where it can, rather than shown a button that fails.
//
// The browser's half of keys lives here too, for the lock (WritingAccess.js),
// the door (PasswordGate.js) and the card's foot (About.js): whether this
// browser can hold a key, whether it has opened this journal with one, and
// the offer to make one, KeyOffer.

'use client';

import { useEffect, useRef, useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { Fingerprint, Key, ScanSmiley } from '@phosphor-icons/react';
import { useJournalHost } from '../../hooks/useJournalHost';

// The browser's note that it has unlocked this journal with a key before,
// so the lock can go straight to Face ID next time — one tap (Miyel's pick).
// Only a yes is kept: the key itself never leaves the device.
export const KEY_HERE = 'ln-key-here';

export function keyHere() {
  try { return localStorage.getItem(KEY_HERE) === '1'; } catch { return false; }
}

export function markKeyHere(on) {
  try {
    if (on) localStorage.setItem(KEY_HERE, '1');
    else localStorage.removeItem(KEY_HERE);
  } catch { /* a private window keeps nothing, and asks every time */ }
}

// Whether this browser can hold a key at all: a secure page, at a named
// address, in a browser that knows passkeys. The dev server on a phone, over
// plain http, cannot; nor can a bare number like 127.0.0.1, which no browser
// will file a key under.
export function canHoldKeys() {
  if (typeof window === 'undefined' || !window.isSecureContext || !('PublicKeyCredential' in window)) return false;
  const host = window.location.hostname;
  return !/^[\d.]+$/.test(host) && !host.startsWith('[');
}

// What a device is called in the list, from what its browser says it is.
function thisDevice() {
  const ua = navigator.userAgent || '';
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'iPad';
  if (/Macintosh|Mac OS X/.test(ua)) return 'Mac';
  if (/Android/.test(ua)) return 'Android phone';
  if (/CrOS/.test(ua)) return 'Chromebook';
  if (/Windows/.test(ua)) return 'Windows computer';
  return 'This device';
}

// How this device unlocks, in its own words, for the offer: Face ID on an
// iPhone — Touch ID on one with a home button, which the screen's size
// gives away — Touch ID on a Mac, and the general name elsewhere.
function wayIn() {
  const device = thisDevice();
  if (device === 'iPhone') {
    const homeButton = Math.max(window.screen.width, window.screen.height) <= 736;
    return homeButton ? { word: 'Touch ID', Glyph: Fingerprint } : { word: 'Face ID', Glyph: ScanSmiley };
  }
  if (device === 'iPad') return { word: 'Face ID or Touch ID', Glyph: ScanSmiley };
  if (device === 'Mac') return { word: 'Touch ID', Glyph: Fingerprint };
  if (device === 'Android phone') return { word: 'your fingerprint', Glyph: Fingerprint };
  if (device === 'Windows computer') return { word: 'Windows Hello', Glyph: ScanSmiley };
  return { word: 'a passkey', Glyph: Fingerprint };
}

// ── Use Face ID next time? 2026-10-20 ─────────────────────────────────────
// The offer to make this device a key, made where the keeper is rather than
// only in Settings (Miyel's picks, 2026-10-20): straight after the password
// opens the door, and — for a keeper already signed in, who may not see the
// lock for months — once at the foot of the card. The same offer in both:
// the question, the device's way in as a glyph over its name, and not now.
// Not now is kept on this device and the offer is not made here again; Your
// keys in Settings makes a key whenever it is wanted.
//
// Offered only where it can work: a page that can hold keys, on a device
// with Face ID or its like, that has not unlocked this journal with a key
// and was not told not now. Its options are fetched before it is drawn, for
// Safari, which asks for Face ID only straight from a press; where they
// cannot be had there is nothing to offer.
const NOT_NOW = 'ln-key-not-now';

function saidNotNow() {
  try { return localStorage.getItem(NOT_NOW) === '1'; } catch { return false; }
}

async function makingOptions() {
  try {
    const r = await fetch('/api/keyring', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const d = await r.json().catch(() => ({}));
    return d.options || null;
  } catch {
    return null;
  }
}

// Whether to offer, and what with: { options, way }, or null. Signed in
// already, since the options are the keeper's to ask for.
export async function readyToOffer() {
  if (!canHoldKeys() || keyHere() || saidNotNow()) return null;
  let able = false;
  try { able = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); } catch { /* no */ }
  if (!able) return null;
  const options = await makingOptions();
  return options ? { options, way: wayIn() } : null;
}

// `ready` is what readyToOffer found, when the caller has already asked (the
// door, which waits on it before letting the keeper in); without it the
// offer asks for itself and draws nothing until it knows (the card's foot).
// `onDone` is called once it is answered, either way; `onNothing` when it
// asked for itself and found nothing to offer.
export function KeyOffer({ ready = null, onDone = null, onNothing = null, place = 'door' }) {
  const [offer, setOffer] = useState(ready);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState('');
  const [trouble, setTrouble] = useState('');
  const done = useRef(onDone);
  const nothing = useRef(onNothing);
  useEffect(() => { done.current = onDone; nothing.current = onNothing; });

  useEffect(() => {
    let gone = false;
    const ask = async () => {
      const found = await readyToOffer();
      if (gone) return;
      setOffer(found);
      if (!found) nothing.current?.();
    };
    if (!ready) ask();
    // The challenge lasts five minutes, so a fresh one every four.
    const again = setInterval(async () => {
      const options = await makingOptions();
      if (!gone && options) setOffer(was => (was ? { ...was, options } : was));
    }, 4 * 60 * 1000);
    return () => { gone = true; clearInterval(again); };
  }, [ready]);

  async function use() {
    if (!offer || busy) return;
    setBusy(true);
    setTrouble('');
    let response;
    try {
      response = await startRegistration({ optionsJSON: offer.options });
    } catch (error) {
      setBusy(false);
      // A device already holding a key for this journal — one synced from
      // another of the keeper's devices — is as good as one made now.
      if (error?.name === 'InvalidStateError') {
        markKeyHere(true);
        setSaid(`This ${thisDevice()} already unlocks with ${offer.way.word}.`);
        done.current?.();
      }
      // Told no: the offer stays, with not now under it.
      return;
    }
    try {
      const r = await fetch('/api/keyring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response, device: thisDevice() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'The key could not be added.');
      markKeyHere(true);
      setSaid(`Added. Next time, Unlock opens with ${offer.way.word}.`);
      done.current?.();
    } catch (error) {
      setTrouble(error?.message || 'The key could not be added.');
      const options = await makingOptions();
      setOffer(was => (options && was ? { ...was, options } : was));
    }
    setBusy(false);
  }

  function notNow() {
    try { localStorage.setItem(NOT_NOW, '1'); } catch { /* asked again next time */ }
    setOffer(null);
    done.current?.();
  }

  if (said) return <p className={'ko-said' + (place === 'foot' ? ' ko--foot' : '')} role="status">{said}</p>;
  if (!offer) return null;
  const { word, Glyph } = offer.way;
  return (
    <div className={'ko' + (place === 'foot' ? ' ko--foot' : '')}>
      <p className="ko-line">{`Use ${word} next time?`}</p>
      <button type="button" className="ko-use" onClick={use} disabled={busy}>
        <Glyph size={26} aria-hidden="true" />
        <span>{`Use ${word}`}</span>
      </button>
      {trouble && <p className="pg-said">{trouble}</p>}
      <button type="button" className="pg-or" onClick={notNow}>not now</button>
    </div>
  );
}

// ── The spare key, shown, 2026-10-20 ──────────────────────────────────────
// The one time it is ever seen — library/secrets.js keeps only its hash — in
// Miyel's words: the key, what it is for, Copy drawn as a button (her ask)
// and I've saved it, which puts it away for good.
export function SpareKeyShown({ code, replaced = false, onSaved }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* it is on screen to be written down */ }
  }
  return (
    <div className="sk" role="group" aria-label="Your spare key">
      <p className="sk-h">Your spare key</p>
      <p className="sk-code">{code}</p>
      <p className="sk-note">If you lose your phone and your password, this opens your journal once. Write it down or save it somewhere safe — you won’t see it again.</p>
      {replaced && <p className="sk-note">The one before no longer works.</p>}
      <div className="sk-do">
        <button type="button" className="sk-copy" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
        <button type="button" className="sk-saved" onClick={onSaved}>I’ve saved it</button>
      </div>
    </div>
  );
}

async function makeSpare() {
  const r = await fetch('/api/keyring', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spare: true }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.code) throw new Error(d.error || 'A spare key could not be made just now.');
  return d;
}

// ── Make a spare key? at the card's foot, 2026-10-20 ──────────────────────
// Miyel's pick: the foot brings the spare key up when there is none, and
// again when the one there was has been used, once Face ID has nothing to
// ask — one question a visit. Not now is kept on this device with the time
// it was said, so a key used after it brings the question back.
const SPARE_NOT_NOW = 'ln-spare-not-now';

function SpareOffer() {
  const [state, setState] = useState(null);
  const [shown, setShown] = useState(null);
  const [busy, setBusy] = useState(false);
  const [trouble, setTrouble] = useState('');
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    let gone = false;
    (async () => {
      try {
        const r = await fetch('/api/keyring', { cache: 'no-store' });
        const d = await r.json();
        const spare = d?.spare;
        if (gone || !spare || spare.ready) return;
        let saidAt = null;
        try { saidAt = localStorage.getItem(SPARE_NOT_NOW); } catch { /* asks */ }
        const usedSince = spare.used_at && saidAt && new Date(spare.used_at) > new Date(saidAt);
        if (saidAt && !usedSince) return;
        setState(spare);
      } catch { /* nothing to ask */ }
    })();
    return () => { gone = true; };
  }, []);

  async function make() {
    if (busy) return;
    setBusy(true);
    setTrouble('');
    try {
      const d = await makeSpare();
      setShown(d.code);
    } catch (error) {
      setTrouble(error?.message || 'A spare key could not be made just now.');
    }
    setBusy(false);
  }

  function notNow() {
    try { localStorage.setItem(SPARE_NOT_NOW, new Date().toISOString()); } catch { /* asks again */ }
    setFinished(true);
  }

  if (shown) {
    return (
      <div className="ko--foot">
        <SpareKeyShown code={shown} onSaved={() => { setShown(null); setFinished(true); }} />
      </div>
    );
  }
  if (!state || finished) return null;
  const used = Boolean(state.used_at);
  return (
    <div className="ko ko--foot">
      <p className="ko-line">{used ? 'Your spare key is used up.' : 'Make a spare key?'}</p>
      {!used && <p className="ko-note">It opens your journal if you lose every device and your password.</p>}
      <button type="button" className="ko-use" onClick={make} disabled={busy}>
        <Key size={26} aria-hidden="true" />
        <span>{used ? 'Make a new one' : 'Make one'}</span>
      </button>
      {trouble && <p className="pg-said">{trouble}</p>}
      <button type="button" className="pg-or" onClick={notNow}>not now</button>
    </div>
  );
}

// The foot of the keeper's own card asks one thing a visit: Face ID first,
// and the spare key once Face ID has nothing to ask.
export function KeeperFoot() {
  const [faceAnswered, setFaceAnswered] = useState(false);
  return (
    <>
      <KeyOffer place="foot" onNothing={() => setFaceAnswered(true)} />
      {faceAnswered && <SpareOffer />}
    </>
  );
}

const PASSWORD_FLOOR = 8;

// The spare key's row, in a few words: when it was made, when it was used,
// or that there is none yet.
function spareSaid(spare) {
  if (!spare) return '';
  if (spare.ready) return ` · made ${added(spare.made_at)}`;
  if (spare.used_at) return ` · used ${added(spare.used_at)}`;
  return ' · none yet';
}

function added(at) {
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Keyring() {
  const host = useJournalHost();
  const [keys, setKeys] = useState(null);
  // The other ways in, folded into Your keys (2026-10-20): where the password
  // comes from ('journal', 'environment', or null for none), the spare key's
  // state, the one shown just now, and the password being changed in place.
  const [password, setPassword] = useState(undefined);
  const [spare, setSpare] = useState(null);
  const [shown, setShown] = useState(null);
  const [making, setMaking] = useState(false);
  const [changing, setChanging] = useState(false);
  const [pw, setPw] = useState('');
  const [pwAgain, setPwAgain] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwSaid, setPwSaid] = useState('');
  const [pwTrouble, setPwTrouble] = useState('');
  const [able, setAble] = useState(null);
  const [offer, setOffer] = useState(null);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState('');
  const [trouble, setTrouble] = useState('');
  const [doubting, setDoubting] = useState(null);
  // Whether the options for making a key could be had: a button that cannot
  // work says so, rather than sitting there pressable and silent.
  const [offerLost, setOfferLost] = useState(false);


  // The ring, and — where this browser can make a key — the options to make
  // one with, fetched ahead of the press.
  useEffect(() => {
    let gone = false;
    fetch('/api/keyring', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (gone) return;
        setKeys(d.keys || []);
        setSpare(d.spare || null);
        setPassword(d.password ?? null);
      })
      .catch(() => { if (!gone) setTrouble('Your keys could not be read just now.'); });
    const can = canHoldKeys();
    const ask = async () => {
      try {
        const r = await fetch('/api/keyring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
        const d = await r.json().catch(() => ({}));
        if (!gone) {
          setAble(can);
          setOffer(d.options || null);
          setOfferLost(!d.options);
        }
      } catch {
        if (!gone) { setAble(can); setOfferLost(true); }
      }
    };
    if (can) ask();
    else Promise.resolve().then(() => { if (!gone) setAble(false); });
    const again = can ? setInterval(ask, 4 * 60 * 1000) : null;
    return () => { gone = true; if (again) clearInterval(again); };
  }, []);

  async function addThisDevice() {
    if (!offer || busy) return;
    setBusy(true);
    setSaid('');
    setTrouble('');
    const device = thisDevice();
    let response;
    try {
      response = await startRegistration({ optionsJSON: offer });
    } catch (error) {
      setBusy(false);
      // Told no is not a fault. A device that already holds a key for this
      // journal is told so, because pressing again would only say it again.
      if (error?.name === 'InvalidStateError') setTrouble('This device already has a key for this journal.');
      return;
    }
    try {
      const r = await fetch('/api/keyring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response, device }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'The key could not be added.');
      setKeys(d.keys || []);
      markKeyHere(true);
      setSaid(`Added. This ${device} can unlock your journal.`);
    } catch (error) {
      setTrouble(error?.message || 'The key could not be added.');
    }
    // A fresh challenge for the next press, and a list that now leaves this
    // device out of what it may make.
    try {
      const r = await fetch('/api/keyring', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const d = await r.json();
      setOffer(d.options || null);
      setOfferLost(!d.options);
    } catch { setOffer(null); setOfferLost(true); }
    setBusy(false);
  }

  async function newSpare() {
    if (making) return;
    setMaking(true);
    setTrouble('');
    setSaid('');
    try {
      const had = Boolean(spare?.ready);
      const d = await makeSpare();
      setSpare(d.spare || null);
      setShown({ code: d.code, replaced: had });
    } catch (error) {
      setTrouble(error?.message || 'A spare key could not be made just now.');
    }
    setMaking(false);
  }

  async function changePassword(event) {
    event.preventDefault();
    if (pwBusy) return;
    setPwSaid('');
    setPwTrouble('');
    if (pw.length < PASSWORD_FLOOR) { setPwTrouble(`At least ${PASSWORD_FLOOR} characters.`); return; }
    if (pw !== pwAgain) { setPwTrouble('The two passwords do not match.'); return; }
    setPwBusy(true);
    try {
      const r = await fetch('/api/secrets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.error) throw new Error(d.error || 'That did not save. Try again.');
      setPassword(d.password ?? 'journal');
      setPw('');
      setPwAgain('');
      setChanging(false);
      setPwSaid('Saved');
      setTimeout(() => setPwSaid(''), 2200);
    } catch (error) {
      setPwTrouble(error?.message || 'That did not save. Try again.');
    }
    setPwBusy(false);
  }

  async function remove(id) {
    if (doubting !== id) { setDoubting(id); return; }
    setDoubting(null);
    setTrouble('');
    setSaid('');
    try {
      const r = await fetch(`/api/keyring?id=${id}`, { method: 'DELETE' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'The key could not be removed.');
      // Which key is this device's is not known here, so any removal makes
      // the lock ask once before reaching for Face ID again.
      markKeyHere(false);
      setKeys(d.keys || []);
    } catch (error) {
      setTrouble(error?.message || 'The key could not be removed.');
    }
  }

  return (
    <>
      <p className="st-note">Unlock with Face ID, Touch ID or your phone instead of typing your password.</p>
      {keys?.length > 0 && (
        <ul className="kr-list">
          {keys.map(key => (
            <li className="kr-row" key={key.id}>
              <span className="kr-name">{key.device || 'A device'} · added {added(key.added_at)}</span>
              <button
                type="button"
                className={'kr-x' + (doubting === key.id ? ' kr-x--sure' : '')}
                onClick={() => remove(key.id)}
                onBlur={() => setDoubting(was => (was === key.id ? null : was))}
                aria-label={doubting === key.id ? `Remove the key on ${key.device || 'this device'}` : `Remove…`}
              >
                {doubting === key.id ? 'Remove' : '×'}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="st-foot">
        {able === false ? (
          <span className="st-said">Keys can be added at your journal’s own address.</span>
        ) : (
          <button type="button" className="st-save ln-word ln-word--on" onClick={addThisDevice} disabled={!offer || busy}>
            {busy ? 'Adding…' : '+ Add this device'}
          </button>
        )}
        {said && !trouble && <span className="st-said" role="status">{said}</span>}
        {trouble && <span className="st-trouble" role="alert">{trouble}</span>}
        {!trouble && able && offerLost && (
          <span className="st-trouble" role="alert">Keys can’t be added just now. Try again in a moment.</span>
        )}
      </div>
      {password !== undefined && (
        <ul className="kr-list kr-list--ways">
          <li className="kr-row">
            <span className="kr-name">
              Password{password === null ? ' · none' : ''}
              {pwSaid && <span className="st-said kr-said" role="status">{pwSaid}</span>}
            </span>
            <button
              type="button"
              className="kr-do"
              onClick={() => { setChanging(was => !was); setPwTrouble(''); setPwSaid(''); }}
            >
              {changing ? 'cancel' : password === null ? 'set one' : 'change'}
            </button>
          </li>
          {changing && (
            <li className="kr-more">
              <form className="kr-change" onSubmit={changePassword}>
                {/* The address the password is filed under — a real, visible,
                    writable input, because that is what a password manager
                    pairs the password with. Typing into it changes nothing. */}
                <input className="st-field st-who" type="text" name="username" autoComplete="username" value={host} onChange={() => {}} aria-label="Journal" tabIndex={-1} />
                <input className="st-field" type="password" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} placeholder="New password" aria-label="New password" />
                <input className="st-field" type="password" autoComplete="new-password" value={pwAgain} onChange={e => setPwAgain(e.target.value)} placeholder="Re-type password" aria-label="Re-type password" />
                <div className="st-foot">
                  <button type="submit" className="st-save ln-word ln-word--on" disabled={pwBusy}>{pwBusy ? 'Saving…' : password === null ? 'Set password' : 'Change password'}</button>
                  {pwTrouble && <span className="st-trouble" role="alert">{pwTrouble}</span>}
                </div>
              </form>
            </li>
          )}
          <li className="kr-row">
            <span className="kr-name">Spare key{spareSaid(spare)}</span>
            <button type="button" className="kr-do" onClick={newSpare} disabled={making}>
              {spare?.ready || spare?.used_at ? 'make a new one' : 'make one'}
            </button>
          </li>
          {shown && (
            <li className="kr-more">
              <SpareKeyShown code={shown.code} replaced={shown.replaced} onSaved={() => setShown(null)} />
            </li>
          )}
        </ul>
      )}
    </>
  );
}
