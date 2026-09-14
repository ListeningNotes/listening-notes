// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/Slug_Page/PrintBar.js
// The bar at the foot of the entry while it is being printed.
//
// The same fixed bar the correction mode wears, with the printer's things on
// it in three rows: the ground under the card (three dots, also turned by a
// sideways swipe on the screen); the paper's size, which the paper on screen
// takes at once (Miyel, 2026-09-13: the other sizes have to be seen, not
// only saved); and Save and Done. Save is the share sheet on a phone — Save
// Image and Instagram are on it — and a download elsewhere; the entry's
// address goes to the clipboard with it. (A Copy link button lived here for
// an afternoon; the cover on the entry page already copies the address.)
'use client';

import { createPortal } from 'react-dom';
import { CaretLeft, DownloadSimple, X } from '@phosphor-icons/react';
import { FRAME_ORDER, FRAMES } from '../SharePrinter';

export default function PrintBar({ grounds, ground, onGround, size, onSize, onSave, onDone, status, final = false, onBack, onDeliver, canDeliver = false }) {
  // Portalled onto the body: the paper sets its own colours on the box it
  // sits in, and the bar is the page's, not the paper's — it keeps the
  // site's theme whatever ground the card is on (Miyel, 2026-09-13).
  if (typeof document === 'undefined') return null;
  // The final picture is up: nothing to choose, only the way back. Holding
  // the picture is what saves it, and the line under the bar says so.
  // What the bar says — the hint, Copied, hold-to-save — goes at the TOP of
  // the bar: on the home screen the bar reaches below the viewport to meet
  // the screen's foot, and a last line down there is a line nobody sees
  // (Miyel's phone, 2026-09-13).
  if (final) {
    // The final picture is up: nothing to choose — the way back, and the
    // tap that hands the picture over (the share sheet, or a download). A
    // phone with no sheet holds the picture instead, and the line says so.
    return createPortal(
      <div className="ln-print-bar" role="toolbar" aria-label="Your print">
        <div className="ln-print-said" aria-live="polite">{status}</div>
        <div className="ln-print-row">
          <button type="button" className="ln-pin" onClick={onBack}>
            <CaretLeft size={13} weight="bold" aria-hidden="true" />
            <span>Back to the card</span>
          </button>
          {canDeliver && (
            <button type="button" className="ln-pin ln-pin--on" onClick={onDeliver}>
              <DownloadSimple size={13} weight="bold" aria-hidden="true" />
              <span>Save</span>
            </button>
          )}
        </div>
      </div>,
      document.body,
    );
  }
  const current = grounds.find(g => g.key === ground);
  return createPortal(
    <div className="ln-print-bar" role="toolbar" aria-label="Printing">
      <div className="ln-print-said" aria-live="polite">{status}</div>
      <div className="ln-print-look">{current?.label}</div>
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

      <div className="ln-print-row">
        <button type="button" className="ln-pin ln-pin--on" onClick={onSave}>
          <DownloadSimple size={13} weight="bold" aria-hidden="true" />
          <span>Save</span>
        </button>
        <button type="button" className="ln-pin" onClick={onDone}>
          <X size={13} weight="bold" aria-hidden="true" />
          <span>Done</span>
        </button>
      </div>
    </div>,
    document.body,
  );
}
