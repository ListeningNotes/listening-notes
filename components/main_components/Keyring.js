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
import { Fingerprint, ScanSmiley } from '@phosphor-icons/react';
import { SANDBOX } from '../../library/version';

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
// `onDone` is called once it is answered, either way.
export function KeyOffer({ ready = null, onDone = null, place = 'door' }) {
  const [offer, setOffer] = useState(ready);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState('');
  const [trouble, setTrouble] = useState('');
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; });

  useEffect(() => {
    let gone = false;
    const ask = async () => {
      const found = await readyToOffer();
      if (!gone) setOffer(found);
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

function added(at) {
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Keyring() {
  const [keys, setKeys] = useState(null);
  const [able, setAble] = useState(null);
  const [offer, setOffer] = useState(null);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState('');
  const [trouble, setTrouble] = useState('');
  const [doubting, setDoubting] = useState(null);
  // Whether the options for making a key could be had: a button that cannot
  // work says so, rather than sitting there pressable and silent.
  const [offerLost, setOfferLost] = useState(false);

  // ── The sandbox's readout, 2026-10-20 — TEMPORARY, out before merge ────
  // What this phone says about keys, and what the last press came to, drawn
  // under Your keys on the sandbox only, so a try on the phone says what
  // happened without a cable to read its console.
  const [readout, setReadout] = useState(null);
  const [offerSaid, setOfferSaid] = useState('');
  const [lastPress, setLastPress] = useState('');
  useEffect(() => {
    if (!SANDBOX) return undefined;
    let gone = false;
    (async () => {
      const r = {
        secure: window.isSecureContext,
        api: 'PublicKeyCredential' in window,
        homeScreen: navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches,
        faceId: false,
      };
      try { r.faceId = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); } catch { /* stays no */ }
      if (!gone) setReadout(r);
    })();
    return () => { gone = true; };
  }, []);

  // The ring, and — where this browser can make a key — the options to make
  // one with, fetched ahead of the press.
  useEffect(() => {
    let gone = false;
    fetch('/api/keyring', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (!gone) setKeys(d.keys || []); })
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
          setOfferSaid(d.options ? 'ready' : `${r.status} ${d.error || ''}`.trim());
        }
      } catch (error) {
        if (!gone) { setAble(can); setOfferLost(true); setOfferSaid(`unreached: ${error?.message || error}`); }
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
    const pressed = performance.now();
    let response;
    try {
      response = await startRegistration({ optionsJSON: offer });
      setLastPress('the device answered');
    } catch (error) {
      setLastPress(`${error?.name || 'Error'}${error?.code ? ` ${error.code}` : ''} after ${Math.round(performance.now() - pressed)} ms: ${error?.message || ''}`);
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
      setLastPress('the device answered, and the key was kept');
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
      {SANDBOX && readout && (
        <p style={{ margin: '12px 0 0', fontFamily: 'var(--font-label)', fontSize: 10, lineHeight: 1.6, color: 'var(--sandbox)', overflowWrap: 'anywhere' }}>
          {`secure ${readout.secure ? 'yes' : 'no'} · passkeys ${readout.api ? 'yes' : 'no'} · face id ${readout.faceId ? 'yes' : 'no'} · home screen ${readout.homeScreen ? 'yes' : 'no'} · options ${offerSaid || '…'}`}
          {lastPress && <><br />{`last press: ${lastPress}`}</>}
        </p>
      )}
    </>
  );
}
