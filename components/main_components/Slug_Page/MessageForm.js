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
// will hand it a message to this journal's keeper (the messages brief). It
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
