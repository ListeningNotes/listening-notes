// app/page.js
// The public homepage. The first thing anyone sees when they visit the site.
//
// Three main sections:
// 1. TopNav — floating pill navigation with dropdown groups, theme toggle, Instagram link
// 2. Hero — the live listening beacon showing what's currently playing on Last.fm
// 3. AlbumStrip — auto-scrolling row of album art tiles, each opens an EntryModal

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useTheme } from '../components/ThemeProvider';
import { useListeningBeacon } from '../hooks/useListeningBeacon';
import EntryModal from '../components/EntryModal';

// ── SURPRISE LINK ──────────────────────────────────────────────────────────
// A nav link that explodes gold particles on click.
// Used for the "Surprise" link that goes to /shuffle.

function SurpriseLink({ href, label }) {
  const ref = useRef(null);
  const symbols = ['✦', '★', '✸', '⬡', '✺', '◆', '✧', '⋆'];

  // Creates 28 particle elements at the click position and animates them outward.
  // Each particle is a DOM element appended to the body and removed after its animation.
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
      // CSS custom properties drive the animation — defined in globals.css
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

// ── TOP NAV ────────────────────────────────────────────────────────────────
// Floating pill navigation at the top of the page.
// Has dropdown groups (Listen, Explore), standalone links, theme toggle, and Instagram.
// On mobile, collapses into a hamburger drawer.

function TopNav({ onToggleTheme, theme }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState(null); // which dropdown group is open

  // Nav structure — groups show as dropdowns, standalone as direct links
  const groups = [
    { label: 'Listen', links: [{ href: '/about', label: 'About' }, { href: '/specs', label: 'Specs' }, { href: '/index', label: 'Index' }] },
    { label: 'Explore', links: [{ href: '/archive', label: 'Archive' }, { href: '/compare', label: 'Compare' }] },
  ];
  const standalone = [
    { href: '/submit', label: 'Submit' },
    { href: '/shuffle', label: 'Surprise', surprise: true }, // uses SurpriseLink
  ];

  return (
    <nav className="topnav" onMouseLeave={() => setOpenGroup(null)}>
      <div className="topnav-inner">
        <Link href="/" className="topnav-wordmark">Listening Notes</Link>
        <div className="topnav-links">
          {groups.map(g => (
            <div key={g.label} className="topnav-group" onMouseEnter={() => setOpenGroup(g.label)}>
              <span className="topnav-link topnav-link--group">
                {g.label}
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3.5l3 3 3-3"/></svg>
              </span>
              {openGroup === g.label && (
                <div className="topnav-dropdown">
                  {g.links.map(l => <Link key={l.href} href={l.href} className="topnav-dropdown-link">{l.label}</Link>)}
                </div>
              )}
            </div>
          ))}
          {standalone.map(l => l.surprise
            ? <SurpriseLink key={l.href} href={l.href} label={l.label} />
            : <Link key={l.href} href={l.href} className="topnav-link">{l.label}</Link>
          )}
        </div>
        <div className="topnav-right">
          <a href="https://instagram.com/listeningnotes.blog" target="_blank" rel="noopener noreferrer" className="topnav-icon-btn" aria-label="Instagram">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/></svg>
          </a>
          {/* Theme toggle — shows sun icon in dark mode, moon in light mode */}
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
          {/* Hamburger — mobile only, toggles the drawer */}
          <button className={'topnav-hamburger' + (menuOpen ? ' topnav-hamburger--open' : '')} onClick={() => setMenuOpen(v => !v)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>
      </div>
      {/* Mobile drawer — all nav links flattened into a vertical list */}
      {menuOpen && (
        <div className="topnav-drawer">
          {groups.flatMap(g => g.links).concat(standalone).map(l => (
            <Link key={l.href} href={l.href} className="topnav-drawer-link" onClick={() => setMenuOpen(false)}>{l.label}</Link>
          ))}
        </div>
      )}
    </nav>
  );
}

// ── HERO ───────────────────────────────────────────────────────────────────
// Full-bleed hero section with the live listening beacon.
// The beacon shows what's currently playing on Last.fm.
// Clicking it expands to show the 3 most recently played tracks as echo tiles.
// Background is a blurred version of the current album art.

function Hero() {
  const { track: trackObj, isLive } = useListeningBeacon(); // live track from Last.fm hook
  const trackName = trackObj?.name || '—';
  const artistName = trackObj?.artist || '';
  const artUrl = trackObj?.image || '';
  const [panelOpen, setPanelOpen] = useState(false);
  const [recentStack, setRecentStack] = useState([]); // last 3 tracks (excluding now playing)
  const prevTrack = useRef(null);   // tracks the previous song to detect changes
  const prevArtRef = useRef('');    // stores the art of the previous track for the stack

  // Fetch recent scrobbles from Last.fm every 30 seconds
  useEffect(() => {
    async function fetchRecent() {
      try {
        const res = await fetch('https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=listeningnotes&api_key=f022ca293645cd4cf2beeb3be7ae4b6f&limit=6&format=json');
        const data = await res.json();
        const tracks = data?.recenttracks?.track || [];
        const nowPlaying = tracks.find(t => t['@attr']?.nowplaying);
        const past = tracks
          .filter(t => !t['@attr']?.nowplaying)
          .map(t => ({ track: t.name, artist: t.artist['#text'], art: t.image?.[3]?.['#text'] || t.image?.[2]?.['#text'] || '' }))
          .filter(t => !(nowPlaying && t.track === nowPlaying.name && t.artist === nowPlaying.artist['#text']));
        setRecentStack(past.slice(0, 3));
      } catch(e) {}
    }
    fetchRecent();
    const interval = setInterval(fetchRecent, 30000);
    return () => clearInterval(interval);
  }, []);

  // When the track changes, push the previous track into the recent stack
  useEffect(() => {
    if (!trackObj?.name) return;
    const key = trackObj.name + '|||' + trackObj.artist;
    if (key === prevTrack.current) return; // same track, no change
    if (prevTrack.current) {
      const [prevName, prevArtist] = prevTrack.current.split('|||');
      const prevArt = prevArtRef.current;
      setRecentStack(prev => {
        const newEntry = { track: prevName, artist: prevArtist, art: prevArt };
        // Remove the current track from the stack in case it was already in there
        const filtered = prev.filter(t => !(t.track === trackObj.name && t.artist === trackObj.artist));
        return [newEntry, ...filtered].slice(0, 3);
      });
    } else {
      // First load — just remove the current track from the stack if it's there
      setRecentStack(prev => prev.filter(t => !(t.track === trackObj.name && t.artist === trackObj.artist)));
    }
    prevTrack.current = key;
    prevArtRef.current = artUrl;
  }, [trackObj]);

  // Scale sizes for the 3 echo tiles — each gets progressively smaller
  const sizes = [0.82, 0.68, 0.56];

  return (
    <section className="hero">
      {/* Blurred album art background — updates with each new track */}
      {artUrl && <div className="hero-blur-bg" style={{ backgroundImage: 'url(' + artUrl + ')' }} />}
      <div className="hero-fade-bottom" />
      <div className="hero-inner" style={{ zIndex: 3 }}>
        <div className={'beacon-stage' + (panelOpen ? ' beacon-stage--open' : '')}>
          {/* Echo tiles — the 3 recent tracks that appear when the beacon is open */}
          {recentStack.slice(0, 3).map((item, i) => (
            <div key={i} className="beacon-recent-tile" style={{ '--scale': sizes[i], '--delay': ((i + 1) * 0.08) + 's' }}>
              {item.art && <img src={item.art} alt={item.track} className="beacon-recent-art" />}
              <div className="beacon-recent-meta">
                <div className="beacon-recent-track">{item.track}</div>
                <div className="beacon-recent-artist">{item.artist}</div>
              </div>
            </div>
          ))}
          {/* Main beacon card — the clickable now-playing button */}
          <button className="beacon-card beacon-card--main" onClick={() => setPanelOpen(v => !v)} aria-expanded={panelOpen} aria-label="Toggle recent listens">
            <div className={'beacon-art-wrap' + (isLive ? ' beacon-art-wrap--live' : '')}>
              {artUrl
                ? <img src={artUrl} alt={trackName} className={'beacon-art' + (!isLive ? ' beacon-art--idle' : '')} />
                : <div className="beacon-art-placeholder">♪</div>
              }
              {!isLive && artUrl && <div className="beacon-idle-overlay"><span>Last played</span></div>}
            </div>
            <div className="beacon-meta">
              <div className="beacon-status">
                <span className={'beacon-dot' + (isLive ? ' beacon-dot--live' : '')} />
                <span className="beacon-status-text">{isLive ? 'Now listening' : 'Not listening'}</span>
              </div>
              <div className="beacon-track">{trackName || '—'}</div>
              {artistName && <div className="beacon-artist">{artistName}</div>}
            </div>
          </button>
        </div>
      </div>
    </section>
  );
}

// ── ALBUM STRIP ────────────────────────────────────────────────────────────
// Auto-scrolling horizontal strip of album art tiles.
// Entries are tripled so the strip loops seamlessly without gaps.
// Uses requestAnimationFrame for smooth animation instead of CSS transitions.
// Clicking a tile opens the EntryModal for that entry.

function AlbumStrip({ entries, onTileClick }) {
  const trackRef = useRef(null);
  const animFrameRef = useRef(null);
  const posRef = useRef(0);          // current scroll position in pixels
  const pausedRef = useRef(false);   // true when user clicks an arrow button
  const speed = 0.5;                 // pixels per frame

  // Triple the entries so the strip loops — when we hit 1/3 of the total width, reset to 0
  const tiles = entries.length > 0 ? [...entries, ...entries, ...entries] : [];

  // Animation loop — runs every frame via requestAnimationFrame
  const tick = useCallback(() => {
    const el = trackRef.current;
    if (!el) { animFrameRef.current = requestAnimationFrame(tick); return; }
    if (!pausedRef.current) {
      const third = el.scrollWidth / 3; // width of one set of entries
      posRef.current += speed;
      if (posRef.current >= third) posRef.current -= third; // seamless loop reset
      el.style.transform = 'translateX(-' + posRef.current + 'px)';
    }
    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current); // cleanup on unmount
  }, [tick, entries]);

  // Arrow button handler — nudges the strip left or right and pauses briefly
  function nudge(dir) {
    const el = trackRef.current;
    if (!el) return;
    const third = el.scrollWidth / 3;
    pausedRef.current = true;
    posRef.current += dir * 280;
    // Keep position within the first third to maintain seamless looping
    if (posRef.current < 0) posRef.current += third;
    if (posRef.current >= third) posRef.current -= third;
    el.style.transform = 'translateX(-' + posRef.current + 'px)';
    setTimeout(() => { pausedRef.current = false; }, 1200);
  }

  if (entries.length === 0) return null;

  return (
    <div className="strip-outer">
      <button className="strip-arrow strip-arrow--left" onClick={() => nudge(-1)} aria-label="Previous">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <div className="strip-viewport">
        <div className="strip-track" ref={trackRef}>
          {tiles.map((entry, i) => (
            <button
              key={entry.id + '-' + i}
              className="strip-tile"
              onClick={() => onTileClick(entry.slug)}
              aria-label={entry.album + ' by ' + entry.artist}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              {entry.album_art
                ? <img src={entry.album_art} alt={entry.album} className="strip-tile-img" draggable={false} loading="lazy" />
                : <div className="strip-tile-placeholder">{entry.album?.[0] ?? '♪'}</div>
              }
              {/* Hover overlay — shows album and artist name on hover */}
              <div className="strip-tile-hover">
                <div className="strip-tile-hover-album">{entry.album}</div>
                <div className="strip-tile-hover-artist">{entry.artist}</div>
              </div>
            </button>
          ))}
        </div>
        {/* Gradient fades on left and right edges to soften the strip boundaries */}
        <div className="strip-fade-left" />
        <div className="strip-fade-right" />
      </div>
      <button className="strip-arrow strip-arrow--right" onClick={() => nudge(1)} aria-label="Next">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
  );
}

// ── HOME PAGE ──────────────────────────────────────────────────────────────
// Root component. Fetches all entries on load and passes them to AlbumStrip.
// Manages which entry modal is open via modalSlug state.

export default function HomePage() {
  const { theme, toggle: toggleTheme } = useTheme();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalSlug, setModalSlug] = useState(null); // slug of the open entry modal, or null

  // Load all entries from the database on mount
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
          // Skeleton tiles while entries are loading
          <div className="strip-skeleton">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="strip-skeleton-tile" />)}
          </div>
        ) : (
          <AlbumStrip entries={entries} onTileClick={setModalSlug} />
        )}
        <div className="hp-cta">
          <Link href="/archive" className="hp-cta-btn hp-cta-btn--filled">See full archive →</Link>
          <Link href="/submit" className="hp-cta-btn hp-cta-btn--outline">Submit an album</Link>
        </div>
      </div>

      {/* Entry modal — renders when a tile is clicked, closes on backdrop click or X */}
      {modalSlug && (
        <EntryModal slug={modalSlug} onClose={() => setModalSlug(null)} />
      )}
    </div>
  );
}