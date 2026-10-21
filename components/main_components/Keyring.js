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
// press and again every four minutes while the page is on screen
// (keepFresh, below), for the reason the lock's are: Safari asks for Face ID
// only straight from a press (PasswordGate.js).
//
// A browser that cannot hold a key — the dev server on a phone, over plain
// http — is told where it can, rather than shown a button that fails.
//
// The browser's half of keys lives here too, for the lock (WritingAccess.js),
// the door (PasswordGate.js) and the card's foot (About.js): whether this
// browser can hold a key, whether it has opened this journal with one, and
// the offer to make one, KeyOffer.

'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { ArrowRight, Fingerprint, Key, ScanSmiley } from '@phosphor-icons/react';
import { usePasswordName } from '../../hooks/useJournalHost';
import { useBookplate } from './Bookplate';

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

// ── A fresh challenge, only while the page is on screen ──────────────────
// Every Unlock and Use Face ID holds options fetched before the press,
// because Safari asks for Face ID only straight from one, and the challenge
// in them lasts five minutes (library/keyring.js), so they are asked for
// again every four. Only while the page is on screen, 2026-10-20: each ask
// reads the database, and four minutes is under the five Neon waits before
// it sleeps, so one sign-in tab left behind another window kept the
// journal's database awake all day. Hidden, nothing is asked; back on
// screen with options four minutes old, they are asked for at once.
//
// `ask` has just been called by the caller; this keeps it fresh from there.
// Returns the stop, for the effect's cleanup.
const FRESH_MS = 4 * 60 * 1000;

export function keepFresh(ask) {
  let at = Date.now();
  let timer = null;
  const wait = ms => { clearTimeout(timer); timer = setTimeout(renew, ms); };
  function renew() {
    // A clock that runs out while hidden asks nothing and stops; coming
    // back starts it again.
    if (document.visibilityState !== 'visible') return;
    at = Date.now();
    ask();
    wait(FRESH_MS);
  }
  function back() {
    if (document.visibilityState !== 'visible') return;
    const left = FRESH_MS - (Date.now() - at);
    if (left <= 0) renew();
    else wait(left);
  }
  wait(FRESH_MS);
  document.addEventListener('visibilitychange', back);
  return () => {
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', back);
  };
}

// What a device is called in the list, from what its browser says it is.
export function thisDevice() {
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
export function wayIn() {
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

// ── The lock's two halves ─────────────────────────────────────────────────
// Moved here from PasswordGate.js on 2026-10-20, with the rest of the
// browser's keys, when Confirm it's you (below) came to ask through them too.
//
// The lock's options, fetched before anything is pressed: Safari lets Face
// ID be asked for only straight from a press, and a press that waited on the
// network first would be refused. The challenge lasts five minutes, so a
// caller asks again every four, while the page is on screen (keepFresh, in
// Keyring.js). Returns { options, any, spare, password },
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
// what askTheLock fetched. Returns { ok, proved_left }, or { ok: false } with `error` to
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
    return { ok: true, proved_left: d.proved_left };
  } catch {
    return { ok: false, error: 'Something went wrong. Try again.' };
  }
}

// ── Confirm it's you, 2026-10-20 ──────────────────────────────────────────
// Changing a way in — the password, the spare key, a key made or taken off —
// asks that the keeper proved it was them in the last five minutes
// (library/wristband.js), so a phone left signed in, in somebody else's
// hand, cannot make itself a way in (Miyel: "it's so easy to change the
// password"). Where it has been longer, the press opens this under it
// instead: Use Face ID, where the journal has a key and this device can hold
// one, with *use your password* under it — the lock's own door, in the lock's
// own pieces — and the password's soft field where there is no key. Never the
// spare key, which would be spent. Her words and her five minutes.
//
// A page knows how much of its proof is left from what the server says with
// the keys and their options (noteProof), so it asks before a press rather
// than after one: Face ID given for a new key, and the key then refused,
// would leave a key on the device that opens nothing. Under a minute left
// counts as none, for the same reason.
const PROOF_MARGIN_MS = 60 * 1000;
let provedUntil = 0;

export function noteProof(seconds) {
  if (Number.isFinite(seconds)) provedUntil = Date.now() + seconds * 1000;
}

export function provedNow() {
  return provedUntil - Date.now() > PROOF_MARGIN_MS;
}

export function ConfirmItsYou({ onConfirmed }) {
  const { keeper_name } = useBookplate();
  const filedUnder = usePasswordName(keeper_name);
  const [keyed, setKeyed] = useState(false);
  const [way, setWay] = useState(null);
  const [asked, setAsked] = useState(undefined);
  const [byPassword, setByPassword] = useState(false);
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const confirmed = useRef(onConfirmed);
  useEffect(() => { confirmed.current = onConfirmed; });

  // The lock's options, asked for before the press and kept fresh, as the
  // lock's are (askTheLock, keepFresh).
  useEffect(() => {
    const can = canHoldKeys();
    let gone = false;
    const ask = async () => { const a = await askTheLock(); if (!gone) setAsked(a); };
    Promise.resolve().then(() => {
      if (gone) return;
      setKeyed(can);
      if (can) setWay(wayIn());
    });
    ask();
    const stop = can ? keepFresh(ask) : null;
    return () => { gone = true; stop?.(); };
  }, []);

  const hasPassword = asked !== undefined && asked?.password !== false;
  // Face ID where this browser is known to hold a key for this journal, or
  // where there is no password to fall back on; otherwise the field, since a
  // device without a key would be shown a sheet that opens nothing.
  const offerKey = keyed && Boolean(way) && Boolean(asked?.any) && !byPassword && (keyHere() || !hasPassword);
  const showField = hasPassword && (byPassword || !offerKey);

  async function withKey() {
    if (!asked?.options || busy) return;
    setBusy(true);
    setError('');
    const done = await unlockWith(asked);
    setBusy(false);
    if (done.ok) { noteProof(done.proved_left); confirmed.current?.(); return; }
    if (!done.cancelled) setError(done.error);
    // The challenge is spent either way: the next press needs a fresh one.
    setAsked(await askTheLock());
  }

  async function withPassword(event) {
    event.preventDefault();
    if (busy || !pw) return;
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        noteProof(d.proved_left);
        setPw('');
        setBusy(false);
        confirmed.current?.();
        return;
      }
      setError(r.status === 429 ? d.error || 'Too many attempts. Wait a minute.' : 'Incorrect password');
      setPw('');
    } catch {
      setError('Something went wrong. Try again.');
    }
    setBusy(false);
  }

  const Glyph = way?.Glyph;
  return (
    <div className="ko ci">
      <p className="ko-line">Confirm it’s you</p>
      {offerKey && (
        <button type="button" className="ko-use" onClick={withKey} disabled={busy}>
          <Glyph size={26} aria-hidden="true" />
          <span>{`Use ${way.word}`}</span>
        </button>
      )}
      {showField && (
        <form onSubmit={withPassword} className="pg-form ci-form">
          {/* The keeper's name, for a password manager to find the
              password under, as the lock's own field has (PasswordGate.js). */}
          <input type="text" name="username" autoComplete="username" className="pg-who" value={filedUnder} onChange={() => {}} aria-label="Name" tabIndex={-1} />
          <div className={'pg-well' + (error ? ' pg-well--wrong' : '')}>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="password"
              className="pg-pw"
              value={pw}
              onChange={e => { setPw(e.target.value); setError(''); }}
              disabled={busy}
              autoFocus={byPassword}
            />
            <button type="submit" className="pg-arrow" disabled={busy} aria-label={busy ? 'Checking' : 'Enter'}>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
          {error && <div className="pg-said">{error}</div>}
        </form>
      )}
      {offerKey && error && <p className="pg-said">{error}</p>}
      {offerKey && hasPassword && (
        <button type="button" className="pg-or" onClick={() => { setByPassword(true); setError(''); }}>use your password</button>
      )}
    </div>
  );
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
    noteProof(d.proved_left);
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
  // Confirm it's you, opened in place of the door where the proof is old.
  const [asking, setAsking] = useState(false);
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
    // The challenge lasts five minutes, so a fresh one every four while
    // the offer is on screen.
    const stop = keepFresh(async () => {
      const options = await makingOptions();
      if (!gone && options) setOffer(was => (was ? { ...was, options } : was));
    });
    return () => { gone = true; stop(); };
  }, [ready]);

  async function use() {
    if (!offer || busy) return;
    // Asked before Face ID is, not after: a key made and then refused would
    // stay on the device opening nothing.
    if (!provedNow()) { setAsking(true); return; }
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
      if (r.status === 403 && d.prove) { noteProof(0); setAsking(true); setBusy(false); return; }
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
      {asking ? (
        <ConfirmItsYou onConfirmed={() => setAsking(false)} />
      ) : (
        <button type="button" className="ko-use" onClick={use} disabled={busy}>
          <Glyph size={26} aria-hidden="true" />
          <span>{`Use ${word}`}</span>
        </button>
      )}
      {trouble && <p className="pg-said">{trouble}</p>}
      <button type="button" className="pg-or" onClick={notNow}>not now</button>
    </div>
  );
}

// ── The spare key, shown, 2026-10-20 ──────────────────────────────────────
// The one time it is ever seen — library/secrets.js keeps only its hash — in
// Miyel's words: the key, what it is for, Copy drawn as a button (her ask)
// and I've saved it, which puts it away for good.
// `heading` is false where the page over it already says what it is (setup);
// `withPassword` false on a journal that has none, which is told so.
export function SpareKeyShown({ code, replaced = false, onSaved, heading = true, withPassword = true }) {
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
      {heading && <p className="sk-h">Your spare key</p>}
      <p className="sk-code">{code}</p>
      <p className="sk-note">{withPassword ? 'If you lose your phone and your password, this' : 'If you lose your phone, this'} opens your journal once. Write it down or save it somewhere safe — you won’t see it again.</p>
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
  if (!r.ok || !d.code) {
    const failed = new Error(d.error || 'A spare key could not be made just now.');
    failed.prove = r.status === 403 && Boolean(d.prove);
    throw failed;
  }
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
  const [withPassword, setWithPassword] = useState(true);
  const [shown, setShown] = useState(null);
  const [busy, setBusy] = useState(false);
  const [trouble, setTrouble] = useState('');
  const [finished, setFinished] = useState(false);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    let gone = false;
    (async () => {
      try {
        const r = await fetch('/api/keyring', { cache: 'no-store' });
        const d = await r.json();
        noteProof(d?.proved_left);
        const spare = d?.spare;
        if (gone || !spare || spare.ready) return;
        let saidAt = null;
        try { saidAt = localStorage.getItem(SPARE_NOT_NOW); } catch { /* asks */ }
        const usedSince = spare.used_at && saidAt && new Date(spare.used_at) > new Date(saidAt);
        if (saidAt && !usedSince) return;
        setWithPassword(d.password !== null);
        setState(spare);
      } catch { /* nothing to ask */ }
    })();
    return () => { gone = true; };
  }, []);

  async function make() {
    if (busy) return;
    if (!provedNow()) { setAsking(true); return; }
    setBusy(true);
    setTrouble('');
    try {
      const d = await makeSpare();
      setShown(d.code);
    } catch (error) {
      if (error?.prove) { noteProof(0); setAsking(true); } else setTrouble(error?.message || 'A spare key could not be made just now.');
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
        <SpareKeyShown code={shown} withPassword={withPassword} onSaved={() => { setShown(null); setFinished(true); }} />
      </div>
    );
  }
  if (!state || finished) return null;
  const used = Boolean(state.used_at);
  return (
    <div className="ko ko--foot">
      <p className="ko-line">{used ? 'Your spare key is used up.' : 'Make a spare key?'}</p>
      {!used && <p className="ko-note">{withPassword ? 'It opens your journal if you lose every device and your password.' : 'It opens your journal if you lose every device.'}</p>}
      {asking ? (
        <ConfirmItsYou onConfirmed={() => { setAsking(false); make(); }} />
      ) : (
        <button type="button" className="ko-use" onClick={make} disabled={busy}>
          <Key size={26} aria-hidden="true" />
          <span>{used ? 'Make a new one' : 'Make one'}</span>
        </button>
      )}
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
  const { keeper_name } = useBookplate();
  const filedUnder = usePasswordName(keeper_name);
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
  // Which change is waiting on Confirm it's you (above): 'password',
  // 'spare', 'add', or 'remove:' and a key's id.
  const [asking, setAsking] = useState(null);
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
        noteProof(d.proved_left);
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
        noteProof(d.proved_left);
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
    const stop = can ? keepFresh(ask) : null;
    return () => { gone = true; stop?.(); };
  }, []);

  async function addThisDevice() {
    if (!offer || busy) return;
    if (!provedNow()) { setAsking('add'); return; }
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
      if (r.status === 403 && d.prove) {
        noteProof(0);
        setAsking('add');
      } else {
        if (!r.ok) throw new Error(d.error || 'The key could not be added.');
        setKeys(d.keys || []);
        markKeyHere(true);
        setSaid(`Added. This ${device} can unlock your journal.`);
      }
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
    if (!provedNow()) { setAsking('spare'); return; }
    setMaking(true);
    setTrouble('');
    setSaid('');
    try {
      const had = Boolean(spare?.ready);
      const d = await makeSpare();
      setSpare(d.spare || null);
      setShown({ code: d.code, replaced: had });
    } catch (error) {
      if (error?.prove) { noteProof(0); setAsking('spare'); }
      else setTrouble(error?.message || 'A spare key could not be made just now.');
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
      if (r.status === 403 && d.prove) {
        // What was typed stays, for when the form opens again.
        noteProof(0);
        setChanging(false);
        setAsking('password');
        setPwBusy(false);
        return;
      }
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
    if (!provedNow()) { setAsking(`remove:${id}`); return; }
    await takeOff(id);
  }

  async function takeOff(id) {
    setTrouble('');
    setSaid('');
    try {
      const r = await fetch(`/api/keyring?id=${id}`, { method: 'DELETE' });
      const d = await r.json().catch(() => ({}));
      if (r.status === 403 && d.prove) { noteProof(0); setAsking(`remove:${id}`); return; }
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
            <Fragment key={key.id}>
              <li className="kr-row">
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
              {asking === `remove:${key.id}` && (
                <li className="kr-more">
                  <ConfirmItsYou onConfirmed={() => { setAsking(null); takeOff(key.id); }} />
                </li>
              )}
            </Fragment>
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
      {asking === 'add' && (
        <div className="kr-more">
          {/* Face ID cannot be asked twice from one press, so once it is
              you, Add this device is pressed again. */}
          <ConfirmItsYou onConfirmed={() => { setAsking(null); setSaid('Confirmed'); }} />
        </div>
      )}
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
              onClick={() => {
                setPwTrouble('');
                setPwSaid('');
                if (changing || asking === 'password') { setChanging(false); setAsking(null); return; }
                if (provedNow()) setChanging(true);
                else setAsking('password');
              }}
            >
              {changing || asking === 'password' ? 'cancel' : password === null ? 'set one' : 'change'}
            </button>
          </li>
          {asking === 'password' && (
            <li className="kr-more">
              <ConfirmItsYou onConfirmed={() => { setAsking(null); setChanging(true); }} />
            </li>
          )}
          {changing && (
            <li className="kr-more">
              <form className="kr-change" onSubmit={changePassword}>
                {/* The name the password is filed under — the keeper's, as
                    on the lock (hooks/useJournalHost.js) — a real, visible,
                    writable input, because that is what a password manager
                    pairs the password with. Typing into it changes nothing. */}
                <input className="st-field st-who" type="text" name="username" autoComplete="username" value={filedUnder} onChange={() => {}} aria-label="Name" tabIndex={-1} />
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
            <button type="button" className="kr-do" onClick={() => (asking === 'spare' ? setAsking(null) : newSpare())} disabled={making}>
              {asking === 'spare' ? 'cancel' : spare?.ready || spare?.used_at ? 'make a new one' : 'make one'}
            </button>
          </li>
          {asking === 'spare' && (
            <li className="kr-more">
              <ConfirmItsYou onConfirmed={() => { setAsking(null); newSpare(); }} />
            </li>
          )}
          {shown && (
            <li className="kr-more">
              <SpareKeyShown code={shown.code} replaced={shown.replaced} withPassword={password !== null} onSaved={() => setShown(null)} />
            </li>
          )}
        </ul>
      )}
    </>
  );
}
