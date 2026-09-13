// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/Slug_Page/PrintBar.js
// The bar at the foot of the entry while it is being printed.
//
// The same fixed bar the correction mode wears, with the printer's four
// things on it: the ground under the card (three dots, also turned by a
// sideways swipe on the screen), Send and Save, the address, and Done.
// Pressing Send or Save does not make the picture yet: the row swaps to the
// four paper sizes, because a story and a feed post are different shapes,
// and the picture is made for the one you pick.
'use client';

import { DownloadSimple, LinkSimple, ShareNetwork, X } from '@phosphor-icons/react';
import { FRAME_ORDER, FRAMES } from '../SharePrinter';

export default function PrintBar({ grounds, ground, onGround, choosing, onChoose, onPick, onCopy, onDone, canSend, status, link }) {
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

      {choosing ? (
        <div className="ln-print-row">
          <span className="ln-editing-label">{choosing === 'send' ? 'Send as' : 'Save as'}</span>
          {FRAME_ORDER.map(key => (
            <button key={key} type="button" className="ln-pin ln-pin--on" onClick={() => onPick(key)} title={FRAMES[key].note}>
              <span>{FRAMES[key].label}</span>
            </button>
          ))}
          <button type="button" className="ln-pin" onClick={() => onChoose(null)} aria-label="Back">
            <X size={13} weight="bold" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="ln-print-row">
          <span className="ln-editing-label">Printing</span>
          {canSend && (
            <button type="button" className="ln-pin ln-pin--on" onClick={() => onChoose('send')}>
              <ShareNetwork size={13} weight="bold" aria-hidden="true" />
              <span>Send</span>
            </button>
          )}
          <button type="button" className={'ln-pin' + (canSend ? '' : ' ln-pin--on')} onClick={() => onChoose('save')}>
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
      )}

      <div className="ln-print-said" aria-live="polite">{status}</div>
    </div>
  );
}
