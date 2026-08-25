'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// No Home here — the logo and the beacon (see SiteNav.js) already cover
// getting back home, one 4-button row reads cleaner than five.
//
// About used to lead this row and no longer exists as a destination. The cover
// turns over now and the card on the back of it is the about page, which means
// the way to it is the flip control on the landing page rather than a dot — a
// dot pointing at a page that is really the other side of the page you are
// already on would be describing the site wrong.
const NAV = [
  { href: '/archive', label: 'Archive' },
  { href: '/compare', label: 'Compare' },
  { href: '/submit', label: 'Submit' },
  { href: '/shuffle', label: 'Surprise', surprise: true },
];

// Gold sparkle burst fired from the Surprise dot on click (restored from the old TopNav).
const SURPRISE_SYMBOLS = ['✦', '★', '✸', '⬡', '✺', '◆', '✧', '⋆'];
function explode(e) {
  const count = 28;
  for (let i = 0; i < count; i++) {
    const span = document.createElement('span');
    span.className = 'gold-particle';
    span.textContent = SURPRISE_SYMBOLS[Math.floor(Math.random() * SURPRISE_SYMBOLS.length)];
    const angle = (i / count) * 360;
    const dist = 60 + Math.random() * 80;
    const rad = (angle * Math.PI) / 180;
    const dur = 0.6 + Math.random() * 0.4;
    span.style.setProperty('--gx', Math.cos(rad) * dist + 'px');
    span.style.setProperty('--gy', Math.sin(rad) * dist + 'px');
    span.style.setProperty('--dur', dur + 's');
    span.style.setProperty('--gr', (Math.random() * 360) + 'deg');
    span.style.color = 'hsl(' + (35 + Math.random() * 20) + ', 90%, 55%)';
    span.style.left = e.clientX + 'px';
    span.style.top = e.clientY + 'px';
    document.body.appendChild(span);
    setTimeout(() => span.remove(), dur * 1000);
  }
}

// Site-wide dot navigation. Every dot always renders — the current page's
// is just highlighted (filled in), never removed or hidden. An earlier
// version removed/hid the current page's dot, which either reflowed the
// row (a different dot slid into the spot you'd just clicked and briefly
// looked highlighted for the wrong page) or left an awkward blank gap.
// Always rendering the same fixed 5 avoids both.
export default function DotNav() {
  const pathname = usePathname();

  return (
    <nav className="hp-dotnav" aria-label="Site navigation">
      {NAV.map(p => (
        <Link
          key={p.href}
          href={p.href}
          className={'hp-dot' + (pathname === p.href ? ' hp-dot--active' : '')}
          aria-label={p.label}
          onClick={p.surprise ? explode : undefined}
        >
          <span className="hp-dot-label">{p.label}</span>
        </Link>
      ))}
    </nav>
  );
}
