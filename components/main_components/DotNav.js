'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/archive', label: 'Archive' },
  { href: '/compare', label: 'Compare' },
  { href: '/about', label: 'About' },
  { href: '/submit', label: 'Submit' },
];

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
        >
          <span className="hp-dot-label">{p.label}</span>
        </Link>
      ))}
    </nav>
  );
}
