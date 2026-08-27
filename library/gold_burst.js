// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// The gold sparkle burst. Was duplicated verbatim in DotNav and TopNav; it now
// lives here so marking a Masterpiece in a session fires the same effect the
// rest of the site uses, rather than reading as a form checkbox.
//
// Relies on .gold-particle and @keyframes gold-explode in globals.css.

const SYMBOLS = ['✦', '★', '✸', '⬡', '✺', '◆', '✧', '⋆'];

// ringX/ringY push each particle's starting point out onto an ellipse around
// the origin instead of stacking them all on it, so the sparkle breaks out
// from around a thing rather than out of its middle. Default 0 keeps the
// single-point burst the Surprise dot and the Score screen already use.
export function goldBurst(e, { count = 28, spread = 80, ringX = 0, ringY = 0 } = {}) {
  const x = e?.clientX, y = e?.clientY;
  if (x == null || y == null) return;
  const ringed = ringX > 0 || ringY > 0;

  for (let i = 0; i < count; i++) {
    const span = document.createElement('span');
    span.className = 'gold-particle';
    span.textContent = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    // Evenly spaced points read as a mechanical ring, so scatter them a little
    // — but only when there's a ring to scatter along.
    const jitter = ringed ? (Math.random() - 0.5) * (360 / count) : 0;
    const angle = (i / count) * 360 + jitter;
    const dist  = 60 + Math.random() * spread;
    const rad   = (angle * Math.PI) / 180;
    const dur   = 0.6 + Math.random() * 0.4;
    span.style.setProperty('--gx', Math.cos(rad) * dist + 'px');
    span.style.setProperty('--gy', Math.sin(rad) * dist + 'px');
    span.style.setProperty('--dur', dur + 's');
    span.style.setProperty('--gr', (Math.random() * 360) + 'deg');
    span.style.color = 'hsl(' + (35 + Math.random() * 20) + ', 90%, 55%)';
    span.style.left = (x + Math.cos(rad) * ringX) + 'px';
    span.style.top  = (y + Math.sin(rad) * ringY) + 'px';
    document.body.appendChild(span);
    setTimeout(() => span.remove(), dur * 1000);
  }
}
