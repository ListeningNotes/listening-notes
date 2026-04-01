'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useTheme } from '../components/ThemeProvider';
import { useListeningBeacon } from '../hooks/useListeningBeacon';

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
      span.style.color = `hsl(${hue}, 90%, 55%)`;
      span.style.left = e.clientX + 'px';
      span.style.top = e.clientY + 'px';
      document.body.appendChild(span);
      setTimeout(() => span.remove(), dur * 1000);
    }
  }

  return (
    <Link
      href={href}
      className="topnav-link topnav-link--surprise"
      onClick={explode}
    >
      <span className="surprise-inner" ref={ref}>{label}</span>
    </Link>
  );
}

function TopNav({ onToggleTheme, theme }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState(null);

  const groups = [
    {
      label: 'Listen',
      links: [
        { href: '/about', label: 'About' },
        { href: '/specs', label: 'Specs' },
        { href: '/index', label: 'Index' },
      ]
    },
    {
      label: 'Explore',
      links: [
        { href: '/archive', label: 'Archive' },
        { href: '/compare', label: 'Compare' },
      ]
    },
  ];

  const standalone = [
    { href: '/submit', label: 'Submit' },
    { href: '/shuffle', label: 'Surprise', surprise: true },
  ];

  return (
    <nav className="topnav" onMouseLeave={() => setOpenGroup(null)}>
      <div className="topnav-inner">
        <Link href="/" className="topnav-wordmark">Listening Notes</Link>

        <div className="topnav-links">
          {groups.map(g => (
            <div
              key={g.label}
              className="topnav-group"
              onMouseEnter={() => setOpenGroup(g.label)}
            >
              <span className="topnav-link topnav-link--group">
                {g.label}
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3.5l3 3 3-3"/></svg>
              </span>
              {openGroup === g.label && (
                <div className="topnav-dropdown">
                  {g.links.map(l => (
                    <Link key={l.href} href={l.href} className="topnav-dropdown-link">{l.label}</Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          {standalone.map(l => (
            l.surprise ? (
              <SurpriseLink key={l.href} href={l.href} label={l.label} />
            ) : (
              <Link key={l.href} href={l.href} className="topnav-link">{l.label}</Link>
            )
          ))}
        </div>

        <div className="topnav-right">
          <a href="https://instagram.com/listeningnotes.blog" target="_blank" rel="noopener noreferrer" className="topnav-icon-btn" aria-label="Instagram">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/></svg>
          </a>
          <button className="topnav-icon-btn" onClick={onToggleTheme} aria-label="Toggle theme">
            {theme === "dark" ? (
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
          <button
            className={`topnav-hamburger ${menuOpen ? "topnav-hamburger--open" : ""}`}
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Menu"
          >
            <span /><span /><span />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="topnav-drawer">
          {groups.flatMap(g => g.links).concat(standalone).map(l => (
            <Link key={l.href} href={l.href} className="topnav-drawer-link" onClick={() => setMenuOpen(false)}>
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}

function Hero() {
  const { track: trackObj, isLive } = useListeningBeacon();
  const trackName = trackObj?.name || '—';
  const artistName = trackObj?.artist || '';
  const artUrl = trackObj?.image || '';
  const [panelOpen, setPanelOpen] = useState(false);
  const [recentStack, setRecentStack] = useState([]);
  const prevTrack = useRef(null);

  useEffect(() => {
    if (!trackObj?.name) return;
    const key = `${trackObj.name}|||${trackObj.artist}`;
    if (key === prevTrack.current) return;
    prevTrack.current = key;
    setRecentStack(prev => {
      const next = [{ track: trackObj.name, artist: trackObj.artist, art: trackObj.image }, ...prev];
      return next.slice(0, 6);
    });
  }, [trackObj]);

  return (
    <section className="hero">
      {artUrl && (
        <div className="hero-blur-bg" style={{ backgroundImage: `url(${artUrl})` }} />
      )}
      <div className="hero-fade-bottom" />
      <div className={`hero-inner ${panelOpen ? 'hero-inner--panel-open' : ''}`}>
        <button
          className="beacon-card"
          onClick={() => setPanelOpen(v => !v)}
          aria-expanded={panelOpen}
          aria-label="Toggle recent listens"
        >
          <div className={`beacon-art-wrap ${isLive ? 'beacon-art-wrap--live' : ''}`}>
            {artUrl ? (
              <img
                src={artUrl}
                alt={trackName}
                className={`beacon-art ${!isLive ? 'beacon-art--idle' : ''}`}
              />
            ) : (
              <div className="beacon-art-placeholder">♪</div>
            )}
            {isLive && <span className="beacon-live-dot" aria-hidden="true" />}
            {!isLive && artUrl && (
              <div className="beacon-idle-overlay">
                <span>Last played</span>
              </div>
            )}
          </div>

          <div className="beacon-meta">
            <div className="beacon-status">
              <span className={`beacon-dot ${isLive ? 'beacon-dot--live' : ''}`} />
              <span className="beacon-status-text">
                {isLive ? 'Now listening' : 'Not listening'}
              </span>
            </div>
            <div className="beacon-track">{trackName || '—'}</div>
            {artistName && <div className="beacon-artist">{artistName}</div>}
          </div>
        </button>

        <div className={`recent-panel ${panelOpen ? 'recent-panel--open' : ''}`}>
          <div className="recent-panel-header">Recent listens</div>
          {recentStack.length === 0 ? (
            <div className="recent-panel-empty">Nothing yet this session.</div>
          ) : (
            <div className="recent-panel-list">
              {recentStack.map((item, i) => (
                <div key={i} className="recent-item">
                  {item.art && <img src={item.art} alt="" className="recent-item-art" />}
                  <div className="recent-item-meta">
                    <div className="recent-item-track">{item.track}</div>
                    <div className="recent-item-artist">{item.artist}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function AlbumStrip({ entries }) {
  const trackRef = useRef(null);
  const animFrameRef = useRef(null);
  const posRef = useRef(0);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartPos = useRef(0);
  const resumeTimer = useRef(null);
  const speed = 0.6;

  // Triplicate so loop never shows a gap regardless of count
  const tiles = entries.length > 0 ? [...entries, ...entries, ...entries] : [];

  const tick = useCallback(() => {
    const el = trackRef.current;
    if (!el || isDragging.current) {
      animFrameRef.current = requestAnimationFrame(tick);
      return;
    }
    const third = el.scrollWidth / 3;
    posRef.current += speed;
    if (posRef.current >= third) posRef.current -= third;
    el.style.transform = `translateX(-${posRef.current}px)`;
    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [tick, entries]);

  function onPointerDown(e) {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartPos.current = posRef.current;
    trackRef.current?.setPointerCapture(e.pointerId);
    clearTimeout(resumeTimer.current);
  }
  function onPointerMove(e) {
    if (!isDragging.current) return;
    const delta = e.clientX - dragStartX.current;
    const el = trackRef.current;
    if (!el) return;
    const third = el.scrollWidth / 3;
    let next = dragStartPos.current - delta;
    if (next < 0) next += third;
    if (next >= third) next -= third;
    posRef.current = next;
    el.style.transform = `translateX(-${next}px)`;
  }
  function onPointerUp() {
    resumeTimer.current = setTimeout(() => {
      isDragging.current = false;
    }, 2500);
  }

  if (entries.length === 0) return null;

  return (
    <div className="strip-outer">
      <div
        className="strip-viewport"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{ cursor: 'grab' }}
      >
        <div className="strip-track" ref={trackRef}>
          {tiles.map((entry, i) => (
            <Link
              key={`${entry.id}-${i}`}
              href={`/entries/${entry.slug}`}
              className="strip-tile"
              draggable={false}
              onClick={e => { if (isDragging.current) e.preventDefault(); }}
            >
              {entry.album_art ? (
                <img
                  src={entry.album_art}
                  alt={entry.album}
                  className="strip-tile-img"
                  draggable={false}
                  loading="lazy"
                />
              ) : (
                <div className="strip-tile-placeholder">
                  {entry.album?.[0] ?? '♪'}
                </div>
              )}
              <div className="strip-tile-hover">
                <div className="strip-tile-hover-album">{entry.album}</div>
                <div className="strip-tile-hover-artist">{entry.artist}</div>
              </div>
            </Link>
          ))}
        </div>
        <div className="strip-fade-left" />
        <div className="strip-fade-right" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const { theme, toggleTheme } = useTheme();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="hp">
      <TopNav onToggleTheme={toggleTheme} theme={theme} />
      <Hero />

      <div className="hero-divider" />
      <div className="hp-strip-section">
        <div className="strip-label">Recent entries</div>
        {loading ? (
          <div className="strip-skeleton">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="strip-skeleton-tile" />
            ))}
          </div>
        ) : (
          <AlbumStrip entries={entries} />
        )}

        <div className="hp-cta">
          <Link href="/archive" className="hp-cta-btn hp-cta-btn--filled">
            See full archive →
          </Link>
          <Link href="/submit" className="hp-cta-btn hp-cta-btn--outline">
            Submit an album
          </Link>
        </div>
      </div>
    </div>
  );
}
