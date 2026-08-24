'use client';


import { useState, useRef } from 'react';
import Link from 'next/link';
import NavBeacon from './NavBeacon';
import { useBookplate } from './Bookplate';

function SurpriseLink({ href, label }) {
  const ref = useRef(null);
  const symbols = ['✦', '★', '✸', '⬡', '✺', '◆', '✧', '⋆'];

  function explode(e) {
    const count = 28;
    for (let i = 0; i < count; i++) {
      const span = document.createElement('span');
      span.className = 'gold-particle';
      span.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      const angle = (i / count) * 360;
      const dist = 60 + Math.random() * 80;
      const rad = (angle * Math.PI) / 180;
      const gx = Math.cos(rad) * dist;
      const gy = Math.sin(rad) * dist;
      const dur = 0.6 + Math.random() * 0.4;
      const hue = 35 + Math.random() * 20;
      span.style.setProperty('--gx', gx + 'px');
      span.style.setProperty('--gy', gy + 'px');
      span.style.setProperty('--dur', dur + 's');
      span.style.setProperty('--gr', (Math.random() * 360) + 'deg');
      span.style.color = 'hsl(' + hue + ', 90%, 55%)';
      span.style.left = e.clientX + 'px';
      span.style.top = e.clientY + 'px';
      document.body.appendChild(span);
      setTimeout(() => span.remove(), dur * 1000);
    }
  }

  return (
    <Link href={href} className="topnav-link topnav-link--surprise" onClick={explode}>
      <span className="surprise-inner" ref={ref}>{label}</span>
    </Link>
  );
}

export default function TopNav({ onToggleTheme, theme, hideBeacon = false }) {
  const { instagram_url } = useBookplate();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { href: '/about',    label: 'About'   },
    { href: '/archive',  label: 'Archive' },
    { href: '/compare',  label: 'Compare' },
    { href: '/submit',   label: 'Submit'  },
    { href: '/shuffle',  label: 'Surprise', surprise: true },
  ];

  return (
    <nav className="topnav">
      <div className="topnav-inner" style={{ backdropFilter: 'blur(48px)', WebkitBackdropFilter: 'blur(48px)' }}>
        <Link href="/" className="topnav-wordmark" style={{ display: 'flex', alignItems: 'center' }}>
          <img
            src="/Logo.png"
            alt="Listening Notes"
            style={{ height: '48px', width: 'auto', filter: theme === 'dark' ? 'invert(1)' : 'none', transition: 'filter 0.2s' }}
          />
        </Link>
        <div className="topnav-links">
          {links.map(l => l.surprise
            ? <SurpriseLink key={l.href} href={l.href} label={l.label} />
            : <Link key={l.href} href={l.href} className="topnav-link">{l.label}</Link>
          )}
        </div>
        <div className="topnav-right">
          {!hideBeacon && <NavBeacon />}
          {/* Nothing at all when the journal has no Instagram — an empty
              link is worse than no icon. */}
          {instagram_url && (
            <a href={instagram_url} target="_blank" rel="noopener noreferrer" className="topnav-icon-btn" aria-label="Instagram">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/></svg>
            </a>
          )}
          <button className="topnav-icon-btn" onClick={onToggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"/>
              </svg>
            )}
          </button>
          <button className={'topnav-hamburger' + (menuOpen ? ' topnav-hamburger--open' : '')} onClick={() => setMenuOpen(v => !v)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="topnav-drawer">
          {links.map(l => (
            <Link key={l.href} href={l.href} className="topnav-drawer-link" onClick={() => setMenuOpen(false)}>{l.label}</Link>
          ))}
        </div>
      )}
    </nav>
  );
}
