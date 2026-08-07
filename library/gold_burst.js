// The gold sparkle burst. Was duplicated verbatim in DotNav and TopNav; it now
// lives here so marking a Masterpiece in a session fires the same effect the
// rest of the site uses, rather than reading as a form checkbox.
//
// Relies on .gold-particle and @keyframes gold-explode in globals.css.

const SYMBOLS = ['✦', '★', '✸', '⬡', '✺', '◆', '✧', '⋆'];

export function goldBurst(e, { count = 28, spread = 80 } = {}) {
  const x = e?.clientX, y = e?.clientY;
  if (x == null || y == null) return;

  for (let i = 0; i < count; i++) {
    const span = document.createElement('span');
    span.className = 'gold-particle';
    span.textContent = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const angle = (i / count) * 360;
    const dist  = 60 + Math.random() * spread;
    const rad   = (angle * Math.PI) / 180;
    const dur   = 0.6 + Math.random() * 0.4;
    span.style.setProperty('--gx', Math.cos(rad) * dist + 'px');
    span.style.setProperty('--gy', Math.sin(rad) * dist + 'px');
    span.style.setProperty('--dur', dur + 's');
    span.style.setProperty('--gr', (Math.random() * 360) + 'deg');
    span.style.color = 'hsl(' + (35 + Math.random() * 20) + ', 90%, 55%)';
    span.style.left = x + 'px';
    span.style.top  = y + 'px';
    document.body.appendChild(span);
    setTimeout(() => span.remove(), dur * 1000);
  }
}
