// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/Slug_Page/PrintBar.js
// The bar at the foot of the entry while it is being printed.
//
// The same fixed bar the correction mode wears, with the printer's things on
// it: what the print shows, as plain words (`choices`, Miyel, 2026-11-03: they
// replaced tapping the print); the ground under the card (dots, also turned
// by a sideways swipe on the screen); the paper's size, which the paper on
// screen takes at once (Miyel, 2026-09-13: the other sizes have to be seen,
// not only saved); and Save and Done. No pills: a word with a line under the
// one that is on, a glyph over a word for the doors.
//
// `final` is the pop-up: the finished print over the page, with the button
// that hands it over. The address went to the clipboard with Save. (A Copy
// link button lived here for an afternoon; the cover on the entry page
// already copies the address.)
'use client';

import { createPortal } from 'react-dom';
import { DownloadSimple, X } from '@phosphor-icons/react';
import { FRAME_ORDER, FRAMES } from '../SharePrinter';

export default function PrintBar({ grounds, ground, onGround, look = null, choices = null, size, onSize, onSave, onDone, status, final = false, picture = null, clip = null, canSend = false, onBack, onDeliver, canDeliver = false }) {
  // Portalled onto the body: the paper sets its own colours on the box it
  // sits in, and the bar is the page's, not the paper's — it keeps the
  // site's theme whatever ground the card is on (Miyel, 2026-09-13).
  if (typeof document === 'undefined') return null;
  // A phone with no sheet holds the picture to save it, and the line says so:
  // no button then, only Close.
  if (final) {
    return createPortal(
      <div className="ln-print-pop" role="dialog" aria-modal="true" aria-label="Your print" onClick={onBack}>
        <div className="ln-print-pop-sheet" onClick={event => event.stopPropagation()}>
          {clip
            ? <video className="ln-print-pop-print" src={clip} autoPlay loop muted playsInline />
            : <img className="ln-print-pop-print" src={picture} alt="Your print" />}
          <div className="ln-print-said" aria-live="polite">{status}</div>
          <div className="ln-print-doors">
            {canDeliver && (
              <button type="button" className="ln-print-door" onClick={onDeliver}>
                <DownloadSimple size={20} aria-hidden="true" />
                <span>{canSend ? 'Save or share' : 'Save'}</span>
              </button>
            )}
            <button type="button" className="ln-print-door" onClick={onBack}>
              <X size={20} aria-hidden="true" />
              <span>Close</span>
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );
  }
  const current = grounds.find(g => g.key === ground);
  return createPortal(
    <div className="ln-print-bar" role="toolbar" aria-label="Printing">
      {choices && (
        <div className="ln-print-words" role="group" aria-label="What the print shows">
          {choices.map(c => (
            <button key={c.key} type="button" aria-pressed={c.on} className={'ln-print-word' + (c.on ? ' ln-print-word--on' : '')} onClick={c.press}>
              {c.label}
            </button>
          ))}
        </div>
      )}
      <div className="ln-print-said" aria-live="polite">{status}</div>
      {/* The ground's name — or, where a plate has a dial (JournalPlate.js),
          what the plate says, the dial's stop with it. */}
      <div className="ln-print-look">{look ?? current?.label}</div>
      <div className="ln-print-grounds" role="tablist" aria-label="Ground">
        {grounds.map(g => (
          <button
            key={g.key}
            type="button"
            role="tab"
            aria-selected={g.key === ground}
            aria-label={g.label}
            title={g.label}
            className={'ln-print-dot' + (g.key === ground ? ' ln-print-dot--on' : '')}
            onClick={() => onGround(g.key)}
          />
        ))}
      </div>

      <div className="ln-print-row ln-print-sizes" role="tablist" aria-label="Size">
        {FRAME_ORDER.map(key => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={key === size}
            className={'ln-print-size' + (key === size ? ' ln-print-size--on' : '')}
            onClick={() => onSize(key)}
            title={FRAMES[key].note}
          >
            {FRAMES[key].label}
          </button>
        ))}
      </div>

      <div className="ln-print-doors">
        <button type="button" className="ln-print-door" onClick={onSave}>
          <DownloadSimple size={20} aria-hidden="true" />
          <span>Save</span>
        </button>
        <button type="button" className="ln-print-door" onClick={onDone}>
          <X size={20} aria-hidden="true" />
          <span>Done</span>
        </button>
      </div>
    </div>,
    document.body,
  );
}
