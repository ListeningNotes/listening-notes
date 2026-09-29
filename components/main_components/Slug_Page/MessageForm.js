// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// components/main_components/Slug_Page/MessageForm.js
// The one form a message is written in.
//
// A field, the word that sends it, and a way out. Where the words go is not
// this file's business: whoever opens the form hands it `send`, which takes
// what was written and answers `{ ok }` or `{ ok: false, error }`. The inbox
// hands it a reply, which leaves through this copy's own outbox; an entry
// hands it a message to this journal's keeper (the messages brief). Those
// are the two places a message is written, and there is no third. It
// unfolds where it was asked for and covers nothing (DECISIONS: a control
// opens where it belongs).
//
// ── Nothing typed is ever lost ────────────────────────────────────────────
// What is written is kept in the browser as it is typed, under `draftKey`,
// and put back when the form opens again — so closing it, a stray press, or
// the page going away costs nothing. A message that does not land keeps
// every word and says what happened in the other copy's own words. The
// draft is cleared only once the message has landed.
//
// `children` stands above the field: who the message is signed by, for a
// form that has to ask.
import { useLayoutEffect, useRef, useState } from 'react';
import { User } from '@phosphor-icons/react';
import { recallSender, keepSender, journalUrl } from '../../../library/return_address';

const DRAFTS = 'ln-message-draft:';

function recall(key) {
  if (typeof window === 'undefined' || !key) return '';
  try { return window.localStorage.getItem(DRAFTS + key) || ''; } catch { return ''; }
}

function keep(key, words) {
  if (typeof window === 'undefined' || !key) return;
  try {
    if (words.trim()) window.localStorage.setItem(DRAFTS + key, words);
    else window.localStorage.removeItem(DRAFTS + key);
  } catch { /* storage off: the words are still in the field */ }
}

export default function MessageForm({
  draftKey,
  send,
  onSent,
  onLeave,
  label = 'Your message',
  placeholder = 'Write a message',
  children = null,
}) {
  const [text, setText] = useState(() => recall(draftKey));
  const [sending, setSending] = useState(false);
  const [trouble, setTrouble] = useState('');
  const field = useRef(null);

  // The cursor is in the field when it opens, so the keyboard is already up.
  // A layout effect, because iOS grants a focus that is still the tap's and a
  // plain effect runs after the paint, which is past it (SendSheet.js).
  useLayoutEffect(() => {
    const box = field.current;
    if (!box) return;
    box.focus();
    const end = box.value.length;
    box.setSelectionRange(end, end);
  }, []);

  function write(value) {
    setText(value);
    keep(draftKey, value);
  }

  async function go() {
    const said = text.trim();
    setTrouble('');
    if (!said) { setTrouble('Say something first.'); return; }
    setSending(true);
    let result = null;
    try {
      result = await send(said);
    } catch {
      result = null;
    }
    setSending(false);
    if (!result?.ok) {
      setTrouble(result?.error || 'Something went wrong. Nothing was sent, and your words are still here.');
      return;
    }
    keep(draftKey, '');
    setText('');
    onSent?.(result);
  }

  return (
    <div className="ln-say-fields ln-say-fields--message">
      {children}
      <textarea
        ref={field}
        className="ln-say-field"
        value={text}
        onChange={e => write(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        rows={3}
      />
      {trouble && <p className="ln-say-trouble">{trouble}</p>}
      {/* The pair the editing bar carries: the one that commits wears the
          rule, the other is a way out. */}
      <div className="ln-say-foot">
        <button type="button" className="ln-word ln-word--on" onClick={go} disabled={sending}>
          {sending ? 'Sending' : 'Message'}
        </button>
        {onLeave && (
          <button type="button" className="ln-word" onClick={onLeave} disabled={sending}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

// ── The way in, on an entry ────────────────────────────────────────────────
// "Message" and the keeper's name, under the album note and nowhere else on
// the page: one way in to an entry, in words. Miyel, 2026-09-29, on what
// mark it should wear — not the comment's bubble, and not the envelope,
// which on an entry means a record somebody sent: "maybe it's just text",
// and then "keep the words Message (user) in the album note section". The
// name says who the words go to, which is the one thing a stranger reading
// somebody's journal cannot take for granted.
//
// Pressed, the form unfolds where the word stood. What is written goes to
// this journal's keeper and is never drawn on the page; once it has gone the
// word says so for a moment and comes back.
//
// ── Who is writing ────────────────────────────────────────────────────────
// Two shapes, by how somebody got here, the way the send form has them
// (DECISIONS, 2026-09-14). A keeper who arrived through their own copy's
// link is known already — a face and a name, and *Not you* to disagree. Any
// one else is asked for a name and nothing more: somebody without a journal
// has nothing to put in a field that asks for one. Both are kept in the
// browser under the one key the send form uses (library/return_address.js),
// and read when the form opens, never before.
//
// Left out of the page altogether for the keeper on their own journal, by
// whoever draws it: there is nobody for them to write to.
export function MessageWayIn({ slug, keeper = '' }) {
  const [writing, setWriting] = useState(false);
  const [gone, setGone] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [asking, setAsking] = useState(false);
  const mine = useRef(null);
  const to = String(keeper || '').trim();

  // Room under it while it is open. The entry's notes live in an inner
  // scroller, and a form opened at the foot of it lands with its button
  // under the keyboard; 96px of floor on the element that scrolls, for as
  // long as the form is open, is what a correction and a credit already
  // ask for, the same way — a class on the screens, written from here.
  useLayoutEffect(() => {
    if (!writing) return undefined;
    const screens = mine.current?.closest('.ln-screens');
    if (!screens) return undefined;
    screens.classList.add('ln-saying');
    return () => screens.classList.remove('ln-saying');
  }, [writing]);

  function open() {
    const known = recallSender();
    setName(known.name);
    setAddress(known.address);
    setAsking(false);
    setGone(false);
    setWriting(true);
  }

  async function send(said) {
    if (!name.trim()) return { ok: false, error: 'Add your name, so they know who is writing.' };
    const answer = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, journal: address, said, about: { slug } }),
    }).catch(() => null);
    const body = await answer?.json().catch(() => null);
    if (!answer?.ok || !body?.ok) {
      return { ok: false, error: body?.error || 'Something went wrong. Nothing was sent, and your words are still here.' };
    }
    // Kept for the next journal this reader writes to.
    keepSender({ name, address });
    return { ok: true };
  }

  const knowMe = Boolean(name.trim() && address.trim()) && !asking;

  return (
    <div ref={mine} className="ln-message">
      {!writing && (
        <div className="ln-say-way">
          {gone ? (
            <span className="ln-word ln-message-gone" role="status">On its way{to ? ` to ${to}` : ''}</span>
          ) : (
            <button type="button" className="ln-word" onClick={open}>
              Message{to ? ` ${to}` : ''}
            </button>
          )}
        </div>
      )}
      {writing && (
        <div className="ln-say-form">
          <MessageForm
            draftKey={`entry-${slug}`}
            label={to ? `Your message to ${to}` : 'Your message'}
            placeholder={to ? `Write to ${to}` : 'Write a message'}
            send={send}
            onSent={() => {
              setWriting(false);
              setGone(true);
              setTimeout(() => setGone(false), 2600);
            }}
            onLeave={() => setWriting(false)}
          >
            {knowMe ? (
              // Who this is going to be signed by. Not a field and not a
              // label over one: it is a statement, and the only thing to do
              // with it is disagree.
              <div className="ln-say-me">
                <span className="ln-sender-portrait" aria-hidden="true">
                  <User size={16} weight="regular" />
                  <img
                    src={`${journalUrl(address)}/api/portrait`}
                    alt=""
                    loading="lazy"
                    onError={e => { e.currentTarget.style.display = 'none'; }}
                  />
                </span>
                <span className="ln-say-me-name">{name}</span>
                <button type="button" className="ln-word ln-say-me-not" onClick={() => setAsking(true)}>
                  Not you
                </button>
              </div>
            ) : (
              <div className={asking ? 'ln-say-pair' : undefined}>
                <input
                  className="ln-say-field"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  aria-label="Your name"
                />
                {asking && (
                  <input
                    className="ln-say-field"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Your journal, if you keep one"
                    aria-label="Your journal, if you keep one"
                    autoComplete="off"
                    inputMode="url"
                  />
                )}
              </div>
            )}
          </MessageForm>
        </div>
      )}
    </div>
  );
}
