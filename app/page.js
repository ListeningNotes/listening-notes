'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTheme } from '../components/main_components/Lightswitch';
import { useListeningBeacon } from '../hooks/useListeningBeacon';
import DotNav from '../components/main_components/DotNav';
import ListeningBeacon from '../components/main_components/ListeningBeacon';
import AlbumStrip from '../components/main_components/AlbumStrip';
import EntryModal from '../components/main_components/EntryModal';

function ScrollButton({ onClick, direction = 'down' }) {
  return (
    <button className="hp-scroll-btn" onClick={onClick} aria-label={direction === 'up' ? 'Scroll to previous screen' : 'Scroll to next screen'}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: direction === 'up' ? 'rotate(180deg)' : 'none' }}>
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  );
}

export default function HomePage() {
  const { theme, toggle: toggleTheme } = useTheme();
  const { isLive } = useListeningBeacon();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalSlug, setModalSlug] = useState(null);
  const [originRect, setOriginRect] = useState(null);
  const screenOneRef = useRef(null);
  const screenTwoRef = useRef(null);

  const openEntry = (slug, rect) => { setOriginRect(rect); setModalSlug(slug); };
  const closeEntry = () => { setModalSlug(null); setOriginRect(null); };
  const scrollToScreenTwo = () => {
    screenTwoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const scrollToScreenOne = () => {
    screenOneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    fetch('/api/entries')
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data.entries || []);
        setEntries(list);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const logo = (
    <Link href="/" className="hp-logo" aria-label="Listening Notes">
      <img
        src="/Logo.png"
        alt="Listening Notes"
        style={{ filter: theme === 'dark' ? 'invert(1)' : 'none' }}
      />
    </Link>
  );

  // Screen two's logo doubles as the live indicator: its printed period is
  // a real <circle> here (traced from public/logo.svg) instead of an
  // image, so it can be recolored/animated directly rather than faked with
  // a positioned overlay guessing at the dot's location.
  const screenTwoLogo = (
    <Link href="/" className="hp-logo hp-logo--mini-live" aria-label="Listening Notes">
      <svg viewBox="76 96 241 140" className="hp-logo-mark" xmlns="http://www.w3.org/2000/svg">
        <path
          transform="translate(73.734177, 220.794814)"
          d="M 44.65625 0 C 37.46875 0 31.160156 -1.601562 25.734375 -4.8125 C 20.304688 -8.019531 16.097656 -12.28125 13.109375 -17.59375 C 10.128906 -22.90625 8.640625 -28.773438 8.640625 -35.203125 L 8.640625 -116.21875 L 36.53125 -116.21875 L 36.53125 -33.203125 C 36.53125 -30.546875 37.46875 -28.222656 39.34375 -26.234375 C 41.226562 -24.242188 43.550781 -23.25 46.3125 -23.25 L 77.03125 -23.25 L 77.03125 0 Z M 44.65625 0 "
        />
        <path
          transform="translate(153.915942, 220.794814)"
          d="M 91.96875 2 C 85 2 78.742188 0.476562 73.203125 -2.5625 C 67.671875 -5.613281 63.300781 -9.847656 60.09375 -15.265625 C 56.882812 -20.691406 55.28125 -26.835938 55.28125 -33.703125 L 55.28125 -84.5 C 55.28125 -86.269531 54.835938 -87.875 53.953125 -89.3125 C 53.066406 -90.75 51.90625 -91.910156 50.46875 -92.796875 C 49.03125 -93.679688 47.425781 -94.125 45.65625 -94.125 C 43.882812 -94.125 42.28125 -93.679688 40.84375 -92.796875 C 39.40625 -91.910156 38.269531 -90.75 37.4375 -89.3125 C 36.601562 -87.875 36.1875 -86.269531 36.1875 -84.5 L 36.1875 0 L 8.96875 0 L 8.96875 -82.515625 C 8.96875 -89.484375 10.539062 -95.625 13.6875 -100.9375 C 16.84375 -106.25 21.21875 -110.453125 26.8125 -113.546875 C 32.40625 -116.648438 38.6875 -118.203125 45.65625 -118.203125 C 52.738281 -118.203125 59.046875 -116.648438 64.578125 -113.546875 C 70.109375 -110.453125 74.476562 -106.25 77.6875 -100.9375 C 80.90625 -95.625 82.515625 -89.484375 82.515625 -82.515625 L 82.515625 -31.703125 C 82.515625 -29.929688 82.957031 -28.300781 83.84375 -26.8125 C 84.726562 -25.320312 85.859375 -24.160156 87.234375 -23.328125 C 88.617188 -22.492188 90.144531 -22.078125 91.8125 -22.078125 C 93.582031 -22.078125 95.210938 -22.492188 96.703125 -23.328125 C 98.203125 -24.160156 99.394531 -25.320312 100.28125 -26.8125 C 101.164062 -28.300781 101.609375 -29.929688 101.609375 -31.703125 L 101.609375 -116.21875 L 128.65625 -116.21875 L 128.65625 -33.703125 C 128.65625 -26.835938 127.050781 -20.691406 123.84375 -15.265625 C 120.632812 -9.847656 116.265625 -5.613281 110.734375 -2.5625 C 105.203125 0.476562 98.945312 2 91.96875 2 Z M 91.96875 2 "
        />
        <circle
          cx="297.0547"
          cy="216.71875"
          r="14.1328"
          className={'hp-logo-mark-dot' + (isLive ? ' hp-logo-mark-dot--live' : '')}
        />
      </svg>
    </Link>
  );

  function renderStrip(variant) {
    if (loading) {
      const gridClass = variant === 'grid' ? ' hp-strip--grid' : '';
      const trackGridClass = variant === 'grid' ? ' hp-strip-track--grid' : '';
      const tileGridClass = variant === 'grid' ? ' strip-tile--grid' : '';
      return (
        <div className={'hp-strip' + gridClass}>
          <div className={'hp-strip-track' + trackGridClass}>
            {Array.from({ length: variant === 'grid' ? 6 : 8 }).map((_, i) => (
              <div key={i} className={'strip-tile strip-tile--skeleton' + tileGridClass} />
            ))}
          </div>
        </div>
      );
    }
    return <AlbumStrip entries={entries} onTileClick={openEntry} openSlug={modalSlug} variant={variant} />;
  }

  return (
    <div className="hp">
      <div className="hp-corner">
        <a
          href="https://instagram.com/listeningnotes.blog"
          target="_blank"
          rel="noopener noreferrer"
          className="hp-icon-btn"
          aria-label="Instagram"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/></svg>
        </a>
        <button className="hp-icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"/></svg>
          )}
        </button>
      </div>

      <main className="hp-main hp-desktop-layout">
        {logo}
        <DotNav />
        <div className="hp-dashboard">
          <div className="hp-dash-cell hp-dash-beacon">
            <ListeningBeacon />
          </div>
        </div>
        {renderStrip('scroll')}
      </main>

      <div className="hp-mobile-screens">
        <section className="hp-screen hp-screen--one" ref={screenOneRef}>
          {logo}
          <div className="hp-dashboard">
            <div className="hp-dash-cell hp-dash-beacon">
              <ListeningBeacon />
            </div>
          </div>
          <div className="hp-screen-one-controls">
            <a
              href="https://instagram.com/listeningnotes.blog"
              target="_blank"
              rel="noopener noreferrer"
              className="hp-icon-btn"
              aria-label="Instagram"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/></svg>
            </a>
            <ScrollButton onClick={scrollToScreenTwo} />
            <button className="hp-icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"/></svg>
              )}
            </button>
          </div>
        </section>
        <section className="hp-screen hp-screen--two" ref={screenTwoRef}>
          <div className="hp-mini-nav-row">
            {screenTwoLogo}
            <ListeningBeacon compact />
            <ScrollButton onClick={scrollToScreenOne} direction="up" />
          </div>
          <DotNav />
          <div className="hp-screen-strip">
            <div className="hp-screen-strip-title">Recent Listens</div>
            <div className="hp-screen-strip-scroll">
              {renderStrip('grid')}
            </div>
          </div>
        </section>
      </div>

      {modalSlug && (
        <EntryModal slug={modalSlug} originRect={originRect} onClose={closeEntry} />
      )}
    </div>
  );
}
