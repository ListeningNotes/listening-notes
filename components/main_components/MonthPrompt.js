// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// components/main_components/MonthPrompt.js
// The month's prompt, as the keeper sees it (2026-10-22, the blog's first
// piece; library/month_prompt.js has the rest). Three things:
//
//   MonthPrompt (default)  pinned over the keeper's wall while the prompt is
//                          open: what it asks, how long is left, and — once
//                          a record was sent — which. Never in a listen, and
//                          never on a page a visitor reads (the brief: the
//                          prompt is pinned to the journal, never to the
//                          session).
//   PromptSheet            opened from an entry's ··· (KeeperTools, Submit):
//                          the record, the entry's own writing as it stands
//                          and the keeper's name — what will be published —
//                          with nothing to type into, and Send to Listening
//                          Notes (Miyel's words). An entry with no writing
//                          sends the record alone.
//   useMonthPrompt         one copy of the prompt for the page, asked of the
//                          journal once the keeper is known, so the wall and
//                          an entry agree the moment a record is sent.
//
// What is sent is a record the keeper has already written about, from their
// own wall (Miyel: "the answer is a record not a real answer"), so the
// words say record and prompt, never answer and question.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from '@phosphor-icons/react';

// ── One copy of the prompt for the page ──────────────────────────────────
// undefined until asked, null when there is none open.
let held;
let asking = null;
const listeners = new Set();
const tell = next => { held = next; listeners.forEach(heard => heard()); };

function ask() {
  if (!asking) {
    asking = fetch('/api/prompt', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : { prompt: null }))
      .then(d => tell(d?.prompt || null))
      .catch(() => tell(null))
      .finally(() => { asking = null; });
  }
  return asking;
}

export function useMonthPrompt(authed) {
  const prompt = useSyncExternalStore(
    heard => { listeners.add(heard); return () => listeners.delete(heard); },
    () => held,
    () => undefined,
  );
  useEffect(() => {
    if (authed && held === undefined) ask();
  }, [authed]);
  return [authed ? prompt ?? null : null, tell];
}

// How long is left, said the way a person says it.
function timeLeft(endsAt, now = Date.now()) {
  const days = Math.ceil((Date.parse(endsAt) - now) / 86_400_000);
  if (!Number.isFinite(days) || days <= 1) return 'Last day';
  return `${days} days left`;
}

// The record as the prompt's note names it: the song for a track note.
const titleOf = sent => sent?.song || sent?.album || '';

// ── Over the wall ─────────────────────────────────────────────────────────
export default function MonthPrompt({ authed }) {
  const [prompt] = useMonthPrompt(authed);
  if (!prompt) return null;
  return (
    <section className="mp-note" aria-label="This month’s prompt">
      <p className="mp-when">This month’s prompt · {timeLeft(prompt.ends_at)}</p>
      <h2 className="mp-said">{prompt.said}</h2>
      {prompt.sent ? (
        <p className="mp-how">
          You sent{' '}
          <Link href={`/entries/${encodeURIComponent(prompt.sent.slug)}`} className="mp-sent">{titleOf(prompt.sent)}</Link>
        </p>
      ) : (
        <p className="mp-how">Send a record from your wall</p>
      )}
    </section>
  );
}

// ── The sheet ─────────────────────────────────────────────────────────────
// The send sheet's shape (SendSheet.js): a scrim, a sheet rising from the
// foot with a strip to pull it down, Escape to put it away.
const FAR_ENOUGH = 0.2;
const FAST_ENOUGH = 0.3;

export function PromptSheet({ open, onClose, entry, keeper, prompt, onSent }) {
  const [state, setState] = useState('ready');
  const [trouble, setTrouble] = useState('');
  const sheetRef = useRef(null);
  const [dragY, setDragY] = useState(0);
  const [holding, setHolding] = useState(false);
  const pull = useRef(null);

  const shut = useCallback(() => {
    if (state === 'sending') return;
    setTrouble('');
    setState('ready');
    onClose?.();
  }, [onClose, state]);

  useEffect(() => {
    if (!open) return undefined;
    const key = e => { if (e.key === 'Escape') shut(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [open, shut]);

  // Sent: a tick and the words for a moment, then the sheet puts itself away.
  useEffect(() => {
    if (state !== 'sent') return undefined;
    const t = setTimeout(() => { setState('ready'); onClose?.(); }, 1600);
    return () => clearTimeout(t);
  }, [state, onClose]);

  function grab(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pull.current = { y: event.clientY, at: event.timeStamp };
    setHolding(true);
    try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch { /* still a pull */ }
  }
  function move(event) {
    if (!pull.current) return;
    setDragY(Math.max(0, event.clientY - pull.current.y));
  }
  function release(event) {
    const from = pull.current;
    pull.current = null;
    setHolding(false);
    if (!from) return;
    const dy = Math.max(0, event.clientY - from.y);
    const ms = Math.max(1, event.timeStamp - from.at);
    const tall = sheetRef.current?.offsetHeight || window.innerHeight;
    setDragY(0);
    if (dy > tall * FAR_ENOUGH || dy / ms > FAST_ENOUGH) shut();
  }

  async function send() {
    if (state !== 'ready') return;
    setState('sending');
    setTrouble('');
    const answer = await fetch('/api/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: entry.slug }),
    }).then(r => r.json()).catch(() => null);
    if (answer?.ok) {
      onSent?.(answer.prompt || null);
      setState('sent');
      return;
    }
    setTrouble(answer?.error || 'It couldn’t be sent just now. Try again in a minute.');
    setState('ready');
  }

  if (!open || !entry || !prompt) return null;
  const writing = String(entry.notes || '').trim();
  const by = [entry.artist, entry.year].filter(Boolean).join(' · ');

  return (
    <>
      <div className="sn-scrim" onClick={shut} aria-hidden="true" />
      <section
        ref={sheetRef}
        className="sn-sheet mp-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Send this record to Listening Notes"
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: holding ? 'none' : undefined } : undefined}
      >
        <div className="sn-pull" onPointerDown={grab} onPointerMove={move} onPointerUp={release} onPointerCancel={release} aria-hidden="true" />
        <p className="mp-when">This month’s prompt · {prompt.month}</p>
        <h2 className="mp-said">{prompt.said}</h2>
        <p className="mp-label">This is what will be published</p>
        <div className="mp-record">
          {entry.album_art
            ? <img className="mp-cover" src={entry.album_art} alt="" />
            : <span className="mp-cover" aria-hidden="true" />}
          <div className="mp-record-words">
            <span className="mp-album">{entry.song || entry.album}</span>
            <span className="mp-by">{entry.song ? [entry.album, entry.artist].filter(Boolean).join(' · ') : by}</span>
          </div>
        </div>
        {writing && <p className="mp-writing">{writing}</p>}
        {keeper && <p className="mp-keeper">— {keeper}</p>}
        {state === 'sent' ? (
          <p className="mp-done" role="status"><Check size={16} weight="bold" aria-hidden="true" /> Sent to Listening Notes</p>
        ) : (
          <button type="button" className="mp-send" onClick={send} disabled={state === 'sending'}>
            {state === 'sending' ? 'Sending…' : 'Send to Listening Notes'}
            {state !== 'sending' && <ArrowRight size={14} weight="bold" aria-hidden="true" />}
          </button>
        )}
        {trouble && <p className="mp-trouble" role="alert">{trouble}</p>}
        <p className="mp-label mp-foot">Your entry, as you wrote it</p>
      </section>
    </>
  );
}
