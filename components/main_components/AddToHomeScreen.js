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
// places; only the words around it differ. The why is Settings' alone
// (`explain`), the way UpdateSwitch does it: setup's question says enough —
// the screen once said the why twice, and then once, and now not at all.
//
// The emblem is Settings' too. In setup the mark at the top of the page
// turns into the app icon on this screen (app/setup/page.js), and an icon
// here as well said it twice. It stands alone where it shows: it had the
// keeper's name beside it, which was the ornamented name off the card — not
// the label a phone actually puts under the icon, which is the plain one
// (app/manifest.js) — and it read as a signature rather than a preview
// (Miyel, 2026-09-23).
//
// ── What it detects ───────────────────────────────────────────────────────
// Already installed: nothing to say, and it says so. iOS: the share-sheet
// steps, under the icon that will land on the screen. Samsung Internet: its
// own menu, which is not Chrome's. Anything else: Chrome's
// `beforeinstallprompt`, captured if it fires — it does not fire on every
// Chrome, and it needs a fetch handler in a service worker for the browser's
// own prompt, which this site does not ship — and otherwise the menu route,
// which works without one since Chrome 108.
//
// ── How it says it, 2026-09-23 ────────────────────────────────────────────
// Three tiles in the shape of /get's install steps — a number, what to press
// in bold, a line at most — where there were five paragraphs (Miyel: calmer,
// like the install steps). Where a button is hard to find by its name, the
// tile draws it: the share glyph, the row in the share sheet, the menu's
// dots. Drawn rather than photographed, because a screenshot is one phone's
// theme on one version of iOS, and a drawing takes the page's light or dark
// and does not go out of date.

'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { DeviceMobile, DotsThreeVertical, Export, List, Plus, PlusSquare } from '@phosphor-icons/react';

function detect() {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent || '';
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
  if (standalone) return 'installed';
  // iPadOS reports itself as a Mac; the touch points give it away.
  const apple = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (apple) return 'ios';
  // Before Android, because it is Android too, and its menu is its own.
  if (/SamsungBrowser/.test(ua)) return 'samsung';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

// Each browser's steps. `look` is the drawing of the thing to press, where
// its name alone would leave somebody hunting for it.
const STEPS = {
  ios: [
    { head: 'Press Share',
      look: <span className="a2h-key"><Export size={21} /></span>,
      text: 'At the bottom of Safari. Only see ···? Press that first.' },
    { head: 'Press Add to Home Screen',
      look: <span className="a2h-key a2h-key--row"><PlusSquare size={21} />Add to Home Screen</span>,
      text: 'Scroll down if you can’t see it.' },
    { head: 'Press Add',
      text: 'Top right. Open it as an app from now on.' },
  ],
  android: [
    { head: 'Press the menu',
      look: <span className="a2h-key"><DotsThreeVertical size={21} weight="bold" /></span>,
      text: 'Beside the address bar.' },
    { head: 'Press Add to home screen',
      look: <span className="a2h-key a2h-key--row"><DeviceMobile size={21} />Add to home screen</span>,
      text: 'Some phones say Install app.' },
    { head: 'Press Install',
      text: 'Or Add. Open it as an app from now on.' },
  ],
  samsung: [
    { head: 'Press the menu',
      look: <span className="a2h-key"><List size={21} /></span>,
      text: 'Bottom right.' },
    { head: 'Press Add page to',
      look: <span className="a2h-key a2h-key--row"><Plus size={21} />Add page to</span> },
    { head: 'Press Home screen',
      text: 'Then Add. Open it as an app from now on.' },
  ],
  desktop: [
    { head: 'In Chrome or Edge',
      look: <span className="a2h-key"><DotsThreeVertical size={21} weight="bold" /></span>,
      text: 'Open the menu and look for Install.' },
    { head: 'In Safari on a Mac',
      text: 'File, then Add to Dock.' },
    // The phone's two buttons, drawn, for somebody finishing on a computer
    // (Miyel, 2026-09-23).
    { head: 'On your phone',
      look: <><span className="a2h-key"><Export size={21} /></span><span className="a2h-key a2h-key--row"><PlusSquare size={21} />Add to Home Screen</span></>,
      text: 'Share, then Add to Home Screen — or on Android, the ⋮\u00a0menu.' },
  ],
};

// `centered` lines what is left up in the middle — the setup screen is
// centred top to bottom; Settings is a left-aligned page. `explain` is
// Settings, which has no line of its own saying why and no mark above it
// to turn into the icon.
export default function AddToHomeScreen({ centered = false, explain = false }) {
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

  const home = where === 'installed' || done;
  // A real prompt, where Chrome gave one, stands in for the menu route; iOS
  // never gives one.
  const steps = where === 'ios' ? STEPS.ios : (prompt ? null : STEPS[where]);
  // A computer's tiles are one way each, not one after another, so they are
  // not numbered.
  const numbered = where !== 'desktop';

  return (
    <div className={'a2h' + (centered ? ' a2h--centered' : '')}>

      {explain && !home && (
        <p className="a2h-why">It opens without the browser around it, and reads as an app.</p>
      )}

      {explain && (
        <div className="a2h-row">
          <span className="a2h-icon" aria-hidden="true">
            <img src="/icon-192.png" alt="" />
          </span>
        </div>
      )}

      {home ? (
        <p className="a2h-done">Already on your home screen.</p>
      ) : (
        <>
          {where !== 'ios' && prompt && (
            <button type="button" className="a2h-go" onClick={install}>Add to home screen</button>
          )}

          {steps && (
            <ol className="a2h-steps">
              {steps.map((step, i) => (
                <li className="ln-tile a2h-step" key={step.head}>
                  {numbered && <span className="a2h-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>}
                  <div className="a2h-words">
                    <h3 className="a2h-head">{step.head}</h3>
                    {step.look && <div className="a2h-look" aria-hidden="true">{step.look}</div>}
                    {step.text && <p className="a2h-text">{step.text}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}
