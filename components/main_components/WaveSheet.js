// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// components/main_components/WaveSheet.js
// Just added somebody: say so, or not.
//
// Adding is silent and one-sided and stays that way. This is the one moment
// the keeper may choose to tell them — "I'm keeping your journal, here's
// where mine is" — and the only moment there is: a wave is offered when you
// add somebody and at no other time, and there is no wave back (Miyel,
// 2026-09-22). If they add you from your wave, their copy offers them this
// same sheet, which is the reply.
//
// The sheet confirms the add first, then sets the two expectations the brief
// asked for, in the gift screen's words (Miyel, 2026-09-23): a wave lets them
// see your name and journal address, and you will not find out whether they
// add you back. Not now is quiet and
// costs nothing — skipping the wave is not a lesser path.
//
// A journal too old to take a wave says so in a line and the sheet stays: the
// person is in the book either way, and the add never waited on the wave.
//
// The sheet is the send sheet's shape (.sn-*), and opens and puts itself away
// as GiveSheet does. It never assumes a pronoun: "them" and "their", because
// a name does not say.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, HandWaving, User } from '@phosphor-icons/react';
import { journalUrl } from '../../library/return_address';

// The layer's numbers, by name and by value — see SendSheet.js.
const FAR_ENOUGH = 0.2;
const FAST_ENOUGH = 0.3;
// How long "Waved" stands before the sheet goes on its own.
const WAVED_MS = 1300;

export default function WaveSheet({ person, onClose }) {
  const open = Boolean(person);
  // 'ask' · 'waving' · 'waved' · 'failed'
  const [state, setState] = useState('ask');
  const [said, setSaid] = useState('');

  const shut = useCallback(() => { setState('ask'); setSaid(''); onClose?.(); }, [onClose]);

  // Waved, then gone on its own: there is nothing left to do here.
  useEffect(() => {
    if (state !== 'waved') return undefined;
    const t = setTimeout(shut, WAVED_MS);
    return () => clearTimeout(t);
  }, [state, shut]);

  // ── The pull ── the send sheet's, line for line.
  const sheetRef = useRef(null);
  const [dragY, setDragY] = useState(0);
  const [held, setHeld] = useState(false);
  const pull = useRef(null);
  function grab(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pull.current = { y: event.clientY, at: event.timeStamp };
    setHeld(true);
    try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch { /* no capture, still a pull */ }
  }
  function move(event) {
    if (!pull.current) return;
    setDragY(Math.max(0, event.clientY - pull.current.y));
  }
  function release(event) {
    const from = pull.current;
    pull.current = null;
    setHeld(false);
    if (!from) return;
    const dy = Math.max(0, event.clientY - from.y);
    const ms = Math.max(1, event.timeStamp - from.at);
    const tall = sheetRef.current?.offsetHeight || window.innerHeight;
    setDragY(0);
    if (dy > tall * FAR_ENOUGH || dy / ms > FAST_ENOUGH) shut();
  }

  // Escape closes, like every other layer here.
  useEffect(() => {
    if (!open) return undefined;
    const key = e => { if (e.key === 'Escape') shut(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [open, shut]);

  // The band steps down while this is up — one row at the foot of the
  // screen at a time (GiveSheet.js).
  useEffect(() => {
    if (!open) return undefined;
    const cross = document.querySelector('.hn');
    cross?.toggleAttribute('data-waving', true);
    return () => cross?.removeAttribute('data-waving');
  }, [open]);

  // The part of the screen you can see — GiveSheet.js has why.
  useEffect(() => {
    if (!open) return undefined;
    const vv = window.visualViewport;
    const sheet = sheetRef.current;
    if (!vv || !sheet) return undefined;
    const sync = () => {
      const room = document.documentElement.clientHeight || window.innerHeight;
      sheet.style.setProperty('--sn-bottom', `${Math.max(0, Math.round(room - vv.offsetTop - vv.height))}px`);
      sheet.style.setProperty('--sn-room', `${Math.round(vv.height)}px`);
    };
    sync();
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
    };
  }, [open]);

  if (!open) return null;

  const name = String(person.name || '').trim();

  return (
    <>
      <div className="sn-scrim" onClick={shut} aria-hidden="true" />
      <section
        ref={sheetRef}
        className="sn-sheet wv-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={name ? `${name} is in your address book` : 'Added to your address book'}
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: held ? 'none' : undefined } : undefined}
      >
        <div
          className="sn-pull"
          onPointerDown={grab}
          onPointerMove={move}
          onPointerUp={release}
          onPointerCancel={release}
          aria-hidden="true"
        />
        {/* Their face, read off their journal, over the plain mark. */}
        <span className="wv-face" aria-hidden="true">
          <User size={30} weight="regular" />
          <img src={`${journalUrl(person.address)}/api/portrait`} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} />
        </span>
        <p className="wv-kicker">Added</p>
        <h2 className="wv-head">{name ? `${name} is in your address book` : "They're in your address book"}</h2>
        {/* Miyel's words, 2026-09-23, the same as the gift screen's in setup. */}
        <p className="wv-line">Let {name || 'them'} see your name and journal address.</p>
        <p className="wv-small">You won&rsquo;t find out whether {name ? `${name} adds` : 'they add'} you back.</p>

        {state === 'failed' ? (
          <p className="wv-said" role="status">{said}</p>
        ) : (
          <button
            type="button"
            className="wv-go"
            disabled={state !== 'ask'}
            onClick={async () => {
              setState('waving');
              try {
                const r = await fetch('/api/outbox', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ wave: true, person_id: person.id }),
                });
                const d = await r.json().catch(() => ({}));
                if (d.ok) { setState('waved'); return; }
                setSaid(d.error || 'The wave did not go. They are still in your address book.');
                setState('failed');
              } catch {
                setSaid('The wave did not go. They are still in your address book.');
                setState('failed');
              }
            }}
          >
            {state === 'waved'
              ? <><Check size={20} weight="regular" aria-hidden="true" /> Waved</>
              : <><HandWaving size={22} weight="regular" aria-hidden="true" /> {state === 'waving' ? 'Waving…' : (name ? `Wave to ${name}` : 'Wave')}</>}
          </button>
        )}
        <button type="button" className="wv-not" onClick={shut}>
          {state === 'failed' ? 'Done' : 'Not now'}
        </button>
      </section>
    </>
  );
}
