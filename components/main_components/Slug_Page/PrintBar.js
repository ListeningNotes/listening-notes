// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/Slug_Page/PrintBar.js
// The bar at the foot of the entry while it is being printed.
//
// The same fixed bar the correction mode wears, with the printer's things on
// it in three rows: the ground under the card (three dots, also turned by a
// sideways swipe on the screen); the paper's size, which the paper on screen
// takes at once (Miyel, 2026-09-13: the other sizes have to be seen, not
// only saved); and Save, the address, and Done. Save is the share sheet on
// a phone — Save Image and Instagram are on it — and a download elsewhere.
'use client';

import { DownloadSimple, LinkSimple, X } from '@phosphor-icons/react';
import { FRAME_ORDER, FRAMES } from '../SharePrinter';

export default function PrintBar({ grounds, ground, onGround, size, onSize, onSave, onCopy, onDone, status, link }) {
  return (
    <div className="ln-print-bar" role="toolbar" aria-label="Printing">
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
        <span className="ln-editing-label">Printing</span>
        <button type="button" className="ln-pin ln-pin--on" onClick={onSave}>
          <DownloadSimple size={13} weight="bold" aria-hidden="true" />
          <span>Save</span>
        </button>
        {link && (
          <button type="button" className="ln-pin" onClick={onCopy} title={link}>
            <LinkSimple size={13} weight="bold" aria-hidden="true" />
            <span>Link</span>
          </button>
        )}
        <button type="button" className="ln-pin" onClick={onDone}>
          <X size={13} weight="bold" aria-hidden="true" />
          <span>Done</span>
        </button>
      </div>

      <div className="ln-print-said" aria-live="polite">{status}</div>
    </div>
  );
}
