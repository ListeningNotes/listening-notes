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

// `centered` lines the icon, the name and the why up in the middle — the
// setup screen is centred top to bottom; Settings is a left-aligned page.
export default function AddToHomeScreen({ centered = false }) {
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
    <div className={'a2h' + (centered ? ' a2h--centered' : '')}>

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
                  In Safari, press the share button
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-label="share"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/></svg>
                  — the square with an arrow pointing up. On an iPhone it is in
                  the bar at the bottom of the screen, in the middle; on an iPad
                  it is at the top right, beside the address.
                </span>
              </li>
              <li><span>A sheet slides up. Scroll its list down past the apps until you see <strong>Add to Home Screen</strong>, with a small plus in a square. Press it.</span></li>
              <li><span>It shows the icon above and the name. Press <strong>Add</strong>, top right.</span></li>
              <li><span>The icon lands on your home screen, on the last page. Open it from there from now on — it opens without Safari around it.</span></li>
              <li><span>In Chrome on an iPhone the share button is at the top right instead, in the address bar; the rest is the same.</span></li>
            </ol>
          )}

          {where !== 'ios' && prompt && (
            <button type="button" className="a2h-go" onClick={install}>Add to home screen</button>
          )}

          {where === 'android' && !prompt && (
            <ol className="a2h-steps">
              <li><span>In Chrome, press the menu button — the three dots at the top right, beside the address bar.</span></li>
              <li><span>In the list that opens, press <strong>Add to Home screen</strong>. On some phones it says <strong>Install app</strong> instead; it is the same thing.</span></li>
              <li><span>A small panel shows the icon above and the name. Press <strong>Add</strong>, or <strong>Install</strong>.</span></li>
              <li><span>The icon lands on your home screen. Open it from there from now on — it opens without Chrome around it.</span></li>
              <li><span>In Samsung Internet the menu is the three lines at the bottom right, and the item is <strong>Add page to</strong>, then <strong>Home screen</strong>.</span></li>
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
