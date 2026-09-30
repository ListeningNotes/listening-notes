// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/session_components/NoteSheet.js
// A track's note, written on a sheet that rises over the list.
//
// ── Why a sheet, 2026-09-29 ───────────────────────────────────────────────
// The session is one list of tracks (Miyel's brief, *the session becomes one
// screen*), and a note field opening inside a row is what sank the list the
// last time it was tried — "a long column of rows with a text field opening
// somewhere in the middle of it, the keyboard covering the rest" (2026-09-18).
// A sheet is not in the middle of the column: it comes up from the bottom,
// the list dims behind it, and when it goes the list is where it was.
//
// It carries the one song and everything about it: number and name, the
// stars, the heart, the envelope that sends it, the field, and two words —
// Cancel and Done. The stars and the heart are the row's own, set here or
// there alike; only the words wait for Done.
//
// ── Nothing typed is lost to a dismissal ──────────────────────────────────
// Cancel, the scrim and Escape all put the note back as it was when the
// sheet opened — and hand what was typed to the page, which keeps it for the
// length of the listen and offers it back the next time this song's sheet
// opens. The rule every sheet on the site keeps.
//
// ── The keyboard ──────────────────────────────────────────────────────────
// A sheet pinned to the bottom of the window is pinned under the keyboard
// on a phone. So it is pinned to the bottom of what can be seen instead —
// visualViewport, read while the keyboard is up — and its field takes the
// cursor as it opens, in the layout pass, while the press that opened it is
// still on the stack: the only moment a phone raises its keyboard for a
// focus it was not tapped into.
'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EnvelopeSimple, Heart } from '@phosphor-icons/react';
import StarRating from './StarRating';
import { colors } from '../../library/sitewide_visuals';
import { useHoldStill } from '../../hooks/useHoldStill';

export default function NoteSheet({
  open,
  number = '', title = '',
  rating = 0, favorite = false,
  note = '', kept = '',
  onRate, onFavorite, onSend = null,
  onDone, onCancel,
}) {
  // What is being written: the note as it stands, or what was typed and
  // put down last time, whichever the page handed over.
  const [text, setText] = useState('');
  const field = useRef(null);
  const sheet = useRef(null);
  useHoldStill(sheet, open);

  useLayoutEffect(() => {
    if (!open) return;
    setText(kept || note || '');
    const el = field.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(el.value.length, el.value.length);
  // On opening only: what it opens with is read then.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Pinned to the visible bottom while a keyboard is up.
  useEffect(() => {
    if (!open) return undefined;
    const vv = window.visualViewport;
    const el = sheet.current;
    if (!vv || !el) return undefined;
    const fit = () => {
      const under = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      el.style.setProperty('--ns-under', `${Math.round(under)}px`);
    };
    fit();
    vv.addEventListener('resize', fit);
    vv.addEventListener('scroll', fit);
    return () => {
      vv.removeEventListener('resize', fit);
      vv.removeEventListener('scroll', fit);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = event => {
      if (event.key === 'Escape') { event.stopPropagation(); onCancel(text); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, text, onCancel]);

  const [host] = useState(() => (typeof document !== 'undefined' ? document.body : null));
  if (!open || !host) return null;

  return createPortal(
    <>
      <div className="ns-scrim" aria-hidden="true" onClick={() => onCancel(text)} />
      <section ref={sheet} className="ns-sheet" role="dialog" aria-modal="true" aria-label={`Notes on ${title}`}>
        <span className="ns-handle" aria-hidden="true" />
        <div className="ns-head">
          <span className="ses-row-n">{number}</span>
          <h2 className="ns-title">{title}</h2>
          <div className="ns-marks">
            <StarRating value={rating} onChange={onRate} size={16} roomy />
            <button
              type="button"
              className="ses-heart"
              onClick={onFavorite}
              aria-label={favorite ? 'Remove from favourites' : 'Mark as a favourite song'}
              aria-pressed={favorite}
              style={{ color: favorite ? colors.fav : undefined }}
            >
              <Heart size={20} weight={favorite ? 'fill' : 'regular'} />
            </button>
            {/* Send this song. It belongs here: you are already looking at
                one song and thinking about it (the brief). The same send
                sheet everything else uses opens over this one. */}
            {onSend && (
              <button type="button" className="ses-heart" onClick={onSend} aria-label={`Send ${title} to somebody`} title="Send this song">
                <EnvelopeSimple size={20} weight="regular" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <span className="ses-label">Notes on this track</span>
        {/* Grown by layout, never measured — see .ses-grow. */}
        <div className="ses-grow ns-grow" data-said={text + ' '}>
          <textarea
            ref={field}
            className="ses-textarea"
            value={text}
            onChange={e => setText(e.target.value)}
            aria-label={`Notes on ${title}`}
            rows={4}
          />
        </div>

        <div className="ns-foot">
          <button type="button" className="ln-word" onClick={() => onCancel(text)}>Cancel</button>
          <button type="button" className="ln-word ln-word--on" onClick={() => onDone(text)}>Done</button>
        </div>
      </section>
    </>,
    host,
  );
}
