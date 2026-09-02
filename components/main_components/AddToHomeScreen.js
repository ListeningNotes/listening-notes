// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/AddToHomeScreen.js
// The one step the software cannot do for you.
//
// ── Why it exists ─────────────────────────────────────────────────────────
// A journal on a home screen opens without the browser's chrome and reads as
// an app — the thing people do not know they are getting until they have
// seen it. iOS will not let a site put itself there; it is a gesture in
// Safari's share sheet, and the most anyone can do is show which one and
// why. Chrome on Android and on a desk will sometimes offer a real install
// prompt, and where it does this presses it.
//
// ── Where it shows ────────────────────────────────────────────────────────
// The last screen of setup, right after the journal has started working —
// the moment somebody has just named the thing and it is in front of them —
// and again in Settings for whoever tapped past it. Same component both
// places; only the words around it differ.
//
// ── What it detects ───────────────────────────────────────────────────────
// Already installed: nothing to say, and it says so. iOS: the share-sheet
// instructions, with the icon that will land on the screen. Anything else:
// Chrome's `beforeinstallprompt`, captured if it fires — it does not fire on
// every Chrome, and it needs a fetch handler in a service worker for the
// browser's own prompt, which this site does not ship — and otherwise the
// menu route, which works without one since Chrome 108.

'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useBookplate } from './Bookplate';

function detect() {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent || '';
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
  if (standalone) return 'installed';
  // iPadOS reports itself as a Mac; the touch points give it away.
  const apple = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (apple) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

export default function AddToHomeScreen() {
  const { cover_name } = useBookplate();
  // Read off the browser rather than copied into state on mount: the server
  // has no navigator and renders 'unknown', the client answers for itself,
  // and nothing re-renders to get there. Same shape Lightswitch uses.
  const where = useSyncExternalStore(() => () => {}, detect, () => 'unknown');
  const [prompt, setPrompt] = useState(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Chrome fires this once, early, and only if it has decided the site is
    // installable. Holding the event is what lets a button press show the
    // real prompt later instead of Chrome's own timing.
    const catchIt = event => { event.preventDefault(); setPrompt(event); };
    window.addEventListener('beforeinstallprompt', catchIt);
    const installed = () => setDone(true);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('beforeinstallprompt', catchIt);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  async function install() {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setDone(true);
    setPrompt(null);
  }

  const icon = (
    <span className="a2h-icon" aria-hidden="true">
      <img src="/icon-192.png" alt="" />
    </span>
  );

  return (
    <div className="a2h">
      <style>{`
        .a2h { display: flex; flex-direction: column; gap: 14px; }
        .a2h-row { display: flex; align-items: center; gap: 14px; }
        .a2h-icon {
          width: 56px; height: 56px; border-radius: 13px; overflow: hidden; flex: none;
          box-shadow: 0 1px 3px rgba(0,0,0,0.18);
        }
        .a2h-icon img { width: 100%; height: 100%; display: block; }
        .a2h-name { font-size: 14px; color: var(--ink); }
        .a2h-why { font-size: 13px; line-height: 1.65; color: var(--ink-soft); margin: 0; }
        .a2h-steps { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
        .a2h-steps li {
          font-size: 13px; line-height: 1.6; color: var(--ink);
          display: flex; gap: 10px; align-items: baseline;
        }
        .a2h-steps li::before {
          content: counter(a2h) '.'; counter-increment: a2h;
          font-family: var(--font-label); font-size: 10px; color: var(--ink-faint);
        }
        .a2h-steps { counter-reset: a2h; }
        .a2h-steps svg { width: 14px; height: 14px; vertical-align: -2px; margin: 0 2px; }
        .a2h-go {
          align-self: flex-start; display: inline-flex; align-items: center;
          padding: 11px 20px; border-radius: 999px;
          background: var(--ink); color: var(--bg); border: 1px solid var(--ink);
          font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.14em;
          text-transform: uppercase; cursor: pointer;
        }
        .a2h-done { font-family: var(--font-label); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-faint); }
      `}</style>

      <div className="a2h-row">
        {icon}
        <span className="a2h-name">{cover_name}</span>
      </div>

      {where === 'installed' || done ? (
        <p className="a2h-done">Already on your home screen.</p>
      ) : (
        <>
          <p className="a2h-why">
            On the home screen it opens without the browser around it, and
            reads as an app. That is when it starts feeling like yours.
          </p>

          {where === 'ios' && (
            <ol className="a2h-steps">
              <li>
                <span>
                  Press the share button
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-label="share"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/></svg>
                  at the bottom of Safari.
                </span>
              </li>
              <li><span>Scroll the list and choose <strong>Add to Home Screen</strong>.</span></li>
              <li><span>Press <strong>Add</strong>. The icon above lands on your screen.</span></li>
            </ol>
          )}

          {where !== 'ios' && prompt && (
            <button type="button" className="a2h-go" onClick={install}>Add to home screen</button>
          )}

          {where === 'android' && !prompt && (
            <ol className="a2h-steps">
              <li><span>Open Chrome’s menu — the three dots, top right.</span></li>
              <li><span>Choose <strong>Add to Home screen</strong>, or <strong>Install app</strong> where it says that.</span></li>
              <li><span>Press <strong>Add</strong>.</span></li>
            </ol>
          )}

          {where === 'desktop' && !prompt && (
            <ol className="a2h-steps">
              <li><span>In Chrome or Edge, open the menu — the three dots, top right — and choose <strong>Install</strong> or <strong>Add to dock</strong>.</span></li>
              <li><span>In Safari on a Mac, use <strong>File → Add to Dock</strong>.</span></li>
              <li><span>On a phone it goes on the home screen the same way; open this page there.</span></li>
            </ol>
          )}
        </>
      )}
    </div>
  );
}
