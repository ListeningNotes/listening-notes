// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/session_components/AskSheet.js
// A question, asked of something that already knows the album and the notes.
//
// On a phone it is a bottom sheet: it slides up over the current screen, the
// session header stays visible at the top edge, and a swipe down on its head
// dismisses it. On a desk it stands upright as a column beside the writing,
// and the writing moves over rather than going dark — the same object, the
// same messages, arranged for the room.
//
// It opens ready to use. No greeting and no "how can I help": the album and
// the notes so far are already in its context, so the first thing on screen
// is the field, focused, keyboard up. Asking within a second.
//
// And dismissing it returns you exactly where you were — the same track, the
// same cursor position in the note. The last field you were writing in is
// remembered as you go, and given back its focus and its selection when the
// sheet leaves. If it lost your place it would not get used.
//
// The keyboard is the hard part. On a phone the field has to sit above the
// keyboard, never under it, and the sheet has to size itself to what is left
// of the screen. visualViewport says how much the keyboard is covering; the
// two numbers are written to the root as custom properties and the sheet's
// bottom and max-height read them. dvh, never vh — vh is the screen with the
// keyboard still counted in it.

'use client';
import { useEffect, useRef, useState } from 'react';
import { X } from '@phosphor-icons/react';

// How far a finger drags the sheet down before letting go dismisses it, and
// how fast a shorter flick has to be.
const FAR_ENOUGH_PX = 90;
const FAST_ENOUGH = 0.45;

export default function AskSheet({ open, onClose, messages, input, setInput, loading, onSend }) {
  const sheetRef = useRef(null);
  const listRef  = useRef(null);
  const lastField = useRef(null);   // the note field last written in, and where the cursor was
  const [drag, setDrag] = useState(0);
  const [settling, setSettling] = useState(false);
  const pull = useRef(null);

  // Remember where the writing was happening, as it happens. The trigger is a
  // button, and on a desk clicking it takes the focus first — so by the time
  // the sheet opens, activeElement is the button and the field is already
  // gone. Watching focus move keeps the last field regardless.
  useEffect(() => {
    const onFocus = e => {
      const el = e.target;
      if (!el || (el.tagName !== 'TEXTAREA' && el.tagName !== 'INPUT')) return;
      if (sheetRef.current?.contains(el)) return;
      lastField.current = { el, start: el.selectionStart, end: el.selectionEnd };
    };
    const onSelect = e => {
      const f = lastField.current;
      if (f && e.target === f.el) { f.start = f.el.selectionStart; f.end = f.el.selectionEnd; }
    };
    document.addEventListener('focusin', onFocus);
    document.addEventListener('selectionchange', onSelect);
    return () => {
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('selectionchange', onSelect);
    };
  }, []);

  // The keyboard's height, and the room left above it, while the sheet is up.
  useEffect(() => {
    if (!open) return undefined;
    const vv = window.visualViewport;
    const root = document.documentElement;
    const measure = () => {
      if (!vv) return;
      const lift = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty('--ask-lift', `${Math.round(lift)}px`);
      root.style.setProperty('--ask-room', `${Math.round(vv.height)}px`);
    };
    measure();
    vv?.addEventListener('resize', measure);
    vv?.addEventListener('scroll', measure);
    return () => {
      vv?.removeEventListener('resize', measure);
      vv?.removeEventListener('scroll', measure);
      root.style.removeProperty('--ask-lift');
      root.style.removeProperty('--ask-room');
    };
  }, [open]);

  // The thread stays pinned to the newest message. Sets scrollTop on its own
  // scroller rather than scrolling something into view, which would drag the
  // page behind the sheet along with it.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, loading, open]);

  // Leaving gives the writing back its cursor. A frame later, so the sheet is
  // out of the tree before the field is asked to take focus.
  function close() {
    onClose();
    const f = lastField.current;
    if (f?.el?.isConnected) {
      requestAnimationFrame(() => {
        try {
          f.el.focus({ preventScroll: true });
          f.el.setSelectionRange(f.start ?? f.el.value.length, f.end ?? f.el.value.length);
        } catch { /* a field that cannot take a selection */ }
      });
    }
  }

  // Escape closes the sheet and nothing else — the layer underneath listens
  // for the same key, and stopping it here keeps one press from closing both.
  function onKey(e) {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    close();
  }

  // The head is the handle. Only the head: the thread scrolls, and a drag
  // that started there is a scroll.
  function begin(e) {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    pull.current = { y: t.clientY, at: e.timeStamp, lastY: t.clientY, lastAt: e.timeStamp };
    setSettling(false);
  }
  function move(e) {
    if (!pull.current || e.touches.length !== 1) return;
    const t = e.touches[0];
    pull.current.lastY = t.clientY;
    pull.current.lastAt = e.timeStamp;
    setDrag(Math.max(0, t.clientY - pull.current.y));
  }
  function end() {
    const done = pull.current;
    pull.current = null;
    if (!done) return;
    const travelled = Math.max(0, done.lastY - done.y);
    const speed = travelled / Math.max(1, done.lastAt - done.at);
    setSettling(true);
    if (travelled > FAR_ENOUGH_PX || (travelled > 24 && speed > FAST_ENOUGH)) {
      setDrag(window.innerHeight);
      window.setTimeout(() => { setDrag(0); close(); }, 180);
      return;
    }
    setDrag(0);
  }

  if (!open) return null;

  return (
    <>
      <div className="ses-ask-scrim" onClick={close} aria-hidden="true" />
      <div
        ref={sheetRef}
        className={'ses-ask' + (settling ? ' ses-ask--settling' : '') + (drag > 0 ? ' ses-ask--dragging' : '')}
        style={drag > 0 ? { transform: `translateY(${drag}px)` } : undefined}
        role="dialog"
        aria-label="Ask about this album"
        onKeyDown={onKey}
      >
        <div className="ses-ask-head" onTouchStart={begin} onTouchMove={move} onTouchEnd={end} onTouchCancel={end}>
          <span className="ses-ask-grab" aria-hidden="true" />
          <span className="ses-label">Ask</span>
          <button type="button" className="ses-ask-x" onClick={close} aria-label="Close">
            <X size={14} weight="bold" aria-hidden="true" />
          </button>
        </div>

        <div ref={listRef} className="ses-ask-list">
          {messages.map((m, i) => (
            <div key={i} className={'ses-ask-msg ' + (m.role === 'user' ? 'ses-ask-msg--you' : 'ses-ask-msg--ref')}>
              {m.text}
            </div>
          ))}
          {loading && (
            <div className="ses-ask-msg ses-ask-msg--ref" aria-label="Thinking">
              <span className="ses-pulse" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* autoFocus rather than a focus() in an effect: React focuses it in
            the same task as the tap that opened the sheet, which is what a
            phone needs before it will raise the keyboard. */}
        <form className="ses-ask-row" onSubmit={e => { e.preventDefault(); onSend(); }}>
          <input
            className="ses-input ses-ask-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about this album, or your notes"
            autoComplete="off"
            enterKeyHint="send"
            autoFocus
          />
          <button type="submit" className="ses-btn ses-btn--primary" disabled={!input.trim() || loading}>Ask</button>
        </form>
      </div>
    </>
  );
}
