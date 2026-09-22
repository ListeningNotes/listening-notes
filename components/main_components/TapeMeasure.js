// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';

// components/main_components/TapeMeasure.js
// TEMPORARY, dev server only, and deleted before the branch merges.
//
// Miyel, 2026-09-22: a friend's journal opened from the installed app comes
// up in the in-app sheet sitting too low, with the band at the foot under the
// sheet's own toolbar. The numbers that sheet reports are not the numbers
// Safari reports, and guessing at them is how a fix lands on the wrong phone.
// So this holds a tape measure up to the screen from inside the sheet.
//
// Two halves, one per place it can be standing:
//   installed (standalone)  a button that opens this same dev server under the
//                           laptop's other address — a different site, so iOS
//                           opens it in the sheet, the way it opens a friend's
//   anywhere else           the readout, in the middle of the screen where no
//                           toolbar can cover it, for a screenshot
//
// Nothing here renders in a production build.

import { useEffect, useState } from 'react';

// The laptop answers to both of these on the home network, and to iOS they
// are two different sites. Whichever one the installed app lives at, the
// button goes to the other. Next is told to allow both (next.config.mjs).
const BY_NAME = 'Miyels-Laptop.local';
const BY_NUMBER = '192.168.1.154';

// A box sized in one unit, measured in pixels. How tall 100dvh or an env()
// inset really is can only be read off something drawn with it.
function probe(css) {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;left:0;top:0;width:1px;visibility:hidden;pointer-events:none;' + css;
  document.body.appendChild(el);
  const r = el.getBoundingClientRect();
  el.remove();
  return Math.round(r.height);
}

function box(selector) {
  const el = document.querySelector(selector);
  if (!el) return '—';
  const r = el.getBoundingClientRect();
  return `${Math.round(r.top)} → ${Math.round(r.bottom)}`;
}

function measure() {
  const vv = window.visualViewport;
  const root = getComputedStyle(document.documentElement);
  return [
    ['standalone', String(window.matchMedia('(display-mode: standalone)').matches || !!navigator.standalone)],
    ['screen', `${screen.width} × ${screen.height}`],
    ['inner', `${innerWidth} × ${innerHeight}`],
    ['visual', vv ? `${Math.round(vv.width)} × ${Math.round(vv.height)} @ ${Math.round(vv.offsetTop)}` : '—'],
    ['100dvh', probe('height:100dvh')],
    ['100svh', probe('height:100svh')],
    ['100lvh', probe('height:100lvh')],
    ['100vh', probe('height:100vh')],
    ['safe top', probe('height:env(safe-area-inset-top)')],
    ['safe bottom', probe('height:env(safe-area-inset-bottom)')],
    ['--safe-top', root.getPropertyValue('--safe-top').trim() ? probe('height:var(--safe-top)') : '—'],
    ['scrollY', Math.round(window.scrollY)],
    ['doc height', document.documentElement.scrollHeight],
    ['.hn', box('.hn')],
    ['bar', box('.hn-bar')],
    ['moon', box('.hn-lights')],
    ['crown', box('.hn-crown')],
    ['band', box('.hn-foot')],
  ];
}

export default function TapeMeasure() {
  const [rows, setRows] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const read = () => {
      setInstalled(window.matchMedia('(display-mode: standalone)').matches || !!navigator.standalone);
      setRows(measure());
    };
    // After the page has laid itself out, and again whenever the sheet moves
    // its toolbars — those are the numbers most likely to change under us.
    const first = setTimeout(read, 600);
    window.addEventListener('resize', read);
    window.addEventListener('scroll', read, { passive: true });
    window.visualViewport?.addEventListener('resize', read);
    window.visualViewport?.addEventListener('scroll', read);
    return () => {
      clearTimeout(first);
      window.removeEventListener('resize', read);
      window.removeEventListener('scroll', read);
      window.visualViewport?.removeEventListener('resize', read);
      window.visualViewport?.removeEventListener('scroll', read);
    };
  }, []);

  if (process.env.NODE_ENV !== 'development' || !rows) return null;

  if (installed) {
    const other = location.hostname === BY_NAME ? BY_NUMBER : BY_NAME;
    return (
      <a
        href={`${location.protocol}//${other}:${location.port}/`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 9999, padding: '10px 16px', borderRadius: 999,
          background: '#d33', color: '#fff', font: '600 13px/1 var(--font-label), monospace',
          letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none',
        }}
      >
        Open in sheet
      </a>
    );
  }

  return (
    <div
      style={{
        position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 9999, padding: '10px 12px', borderRadius: 10,
        background: 'rgba(200, 20, 20, 0.92)', color: '#fff',
        font: '11px/1.45 var(--font-label), monospace', pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {rows.map(([k, v]) => (
        <div key={k}><span style={{ opacity: 0.7 }}>{k}</span> {v}</div>
      ))}
    </div>
  );
}
