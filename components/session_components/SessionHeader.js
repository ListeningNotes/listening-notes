// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/session_components/SessionHeader.js
// The strip at the top of a listen: what you are logging, and the four steps.
//
// It is what makes one-thing-at-a-time possible. Every screen below it holds
// exactly one job — the tracks, the note, the preview — and could not also
// carry what you are logging without eating a phone's screen. So the title
// and the artist sit here as a line and stay put while the screens turn
// underneath. No small cover: the album screen is the art, large and centred,
// and a thumbnail of it up here was the same picture twice.
//
// The back caret is the way to a different record. Leaving the listen
// altogether is the layer's own gesture — swipe from the left edge, or the
// browser's back — which puts you back on the desk you started from.
//
// Top right, where every other screen keeps its day-and-night switch: the
// switch, and beside it the question mark. That is the reference — something
// to ask about the album or the notes, from any screen, that never writes a
// word of the entry. It glows a little so it reads as a door rather than a
// decoration, and it is absent on a copy with no key rather than present and
// broken. There is no Save draft button: the draft saves itself.

'use client';
import { CaretLeft } from '@phosphor-icons/react';
import { SESSION_STEPS } from '../../hooks/useListeningSession';
import { useTheme } from '../main_components/Lightswitch';

export default function SessionHeader({
  album, artist, year,
  step, onStep,
  onBack,
  canAsk, onAsk, asking,
}) {
  const { theme, toggle } = useTheme();

  return (
    <header className="ses-head">
      <div className="ses-head-in">
        <div className="ses-head-row">
          <button type="button" className="ses-back" onClick={onBack} aria-label="Change album" title="Change album">
            <CaretLeft size={16} weight="bold" aria-hidden="true" />
          </button>

          <div className="ses-head-text">
            <span className="ses-head-album">{album}</span>
            <span className="ses-head-artist">{artist}{year ? ` · ${year}` : ''}</span>
          </div>

          {canAsk && (
            <button
              type="button"
              className={'ses-ask-btn' + (asking ? ' ses-ask-btn--on' : '')}
              onClick={onAsk}
              aria-label="Ask about this album"
              title="Ask about this album"
              aria-pressed={!!asking}
            >
              ?
            </button>
          )}
          <button type="button" className="hp-icon-btn ses-theme" onClick={toggle} aria-label="Toggle theme">
            {theme === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"/></svg>
            )}
          </button>
        </div>

        {/* Every step is a button. The preview in particular is worth a look
            at any moment — the page so far is how you find out what the note
            still needs — so nothing here is gated on having been there. */}
        <nav className="ses-steps" aria-label="Steps">
          {SESSION_STEPS.map((label, id) => {
            const isCurrent = id === step;
            const isPast = id < step;
            const reachable = !isCurrent;
            const cls = ['ses-stepbtn', isCurrent && 'ses-stepbtn--current', isPast && 'ses-stepbtn--past'].filter(Boolean).join(' ');
            return (
              <button
                key={label}
                type="button"
                className={cls}
                onClick={() => reachable && onStep(id)}
                disabled={!reachable}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <span className="ses-stepdot" aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
