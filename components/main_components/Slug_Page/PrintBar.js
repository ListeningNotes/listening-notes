// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/Slug_Page/PrintBar.js
// The bar at the foot of the entry while it is being printed.
//
// The same fixed bar the correction mode wears, with the printer's things on
// it: words picking what is being changed, when there is more than one thing to
// change, and one row of choices under them.
// No pills: a word with a line under the one that is on, a glyph over a word.
// Save is the one big black button, and the way back an X at the top left (Miyel, 2026-11-03).
//
// `final` is the pop-up: the finished print over the page, with the button
// that hands it over. The address went to the clipboard with Save. (A Copy
// link button lived here for an afternoon; the cover on the entry page
// already copies the address.)
'use client';

import { createPortal } from 'react-dom';
import { DownloadSimple, Export, X } from '@phosphor-icons/react';

export default function PrintBar({ sections = [], tab = null, onTab, away = false, onSave, onDone, status, final = false, inBar = false, saving = false, picture = null, clip = null, canSend = false, onBack, onDeliver, canDeliver = false }) {
  // Portalled onto the body: the paper sets its own colours on the box it
  // sits in, and the bar is the page's, not the paper's — it keeps the
  // site's theme whatever ground the card is on (Miyel, 2026-09-13).
  if (typeof document === 'undefined') return null;
  // A phone with no sheet holds the picture to save it, and the line says so:
  // no button then, only Close.
  // Made and ready: with somewhere to send it, the bar itself says so and offers it, over
  // the same print, rather than a screen of its own (Miyel, 2026-11-07).
  if (final && inBar && canDeliver) {
    return createPortal(
      <div className="ln-print-bar ln-print-bar--ready" role="toolbar" aria-label="Your print is ready">
        <div className="ln-print-told" aria-live="polite">
          {status && <strong>{status}</strong>}
          <span>{canSend ? 'Share it to your story, then add a Link sticker and paste.' : 'Download it, post it, then add your link.'}</span>
        </div>
        <button type="button" className="ln-print-save" onClick={onDeliver}>
          {canSend ? <Export size={19} aria-hidden="true" /> : <DownloadSimple size={19} aria-hidden="true" />}
          <span>{canSend ? 'Share' : 'Download'}</span>
        </button>
        {/* Done, once it is shared: back to the post, the printer put away (Miyel, 2026-11-07). */}
        <div className="ln-print-after">
          <button type="button" className="ln-print-word" onClick={onBack}>Change something</button>
          <button type="button" className="ln-print-word" onClick={onDone}>Done</button>
        </div>
      </div>,
      document.body,
    );
  }
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
  if (away) return null;
  const section = sections.find(s => s.key === tab) || sections[0];
  return createPortal(
    <>
    <button type="button" className="ln-print-shut" onClick={onDone} aria-label="Back">
      <X size={22} aria-hidden="true" />
    </button>
    <div className="ln-print-bar" role="toolbar" aria-label="Printing">
      {section && (
        <>
          {sections.length > 1 && (
            <div className="ln-print-tabs" role="group" aria-label="What to change">
              {sections.map(t => (
                <button key={t.key} type="button" aria-pressed={t.key === section.key} className={'ln-print-word' + (t.key === section.key ? ' ln-print-word--on' : '')} onClick={() => onTab(t.key)}>
                  {t.label}
                </button>
              ))}
            </div>
          )}
          <div className={'ln-print-choices' + (section.stacked ? ' ln-print-choices--stacked' : '')}>
            {section.groups.map((group, g) => (
              <div className="ln-print-group" key={g}>
                {group.map(c => (
                  <button key={c.key} type="button" aria-pressed={c.on} className={'ln-print-choice' + (c.on ? ' ln-print-choice--on' : '') + (c.icon ? '' : ' ln-print-choice--word')} onClick={c.press}>
                    {c.icon}
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
      {!saving && <div className="ln-print-said" aria-live="polite">{status}</div>}
      <button type="button" className="ln-print-save" onClick={onSave} disabled={saving}>
        <DownloadSimple size={19} aria-hidden="true" />
        <span>{saving ? 'Making your flyer…' : 'Save'}</span>
      </button>
    </div>
    </>,
    document.body,
  );
}
