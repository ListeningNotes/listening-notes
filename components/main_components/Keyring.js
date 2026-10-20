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

'use client';

import { useEffect, useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { canHoldKeys, markKeyHere } from '../session_components/PasswordGate';

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

  async function remove(id) {
    if (doubting !== id) { setDoubting(id); return; }
    setDoubting(null);
    setTrouble('');
    setSaid('');
    try {
      const r = await fetch(`/api/keyring?id=${id}`, { method: 'DELETE' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'The key could not be removed.');
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
    </>
  );
}
