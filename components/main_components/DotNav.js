'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/archive', label: 'Archive' },
  { href: '/compare', label: 'Compare' },
  { href: '/about', label: 'About' },
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

// Site-wide dot navigation. Highlights the dot whose href matches the
// current pathname; each dot reveals its page label on hover.
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
