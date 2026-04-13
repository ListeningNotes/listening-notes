// app/session/page.js
// The main session tool — your private workspace for listening and writing entries.
// Password protected. Never linked publicly.
// 
// Flow: Password Gate → Album Picker → Research Loading Screen → Session View → Output Modal → Save
//
// Key features:
// - Artist-first album picker via iTunes Search API
// - Research brief fetched from /api/research (Claude)
// - Split panel: brief on left, notes on right
// - Track-by-track notes and star ratings
// - AI chat companion via /api/reflect
// - Format & Done sends notes to /api/format (Claude) for light editing
// - Save to Site posts finished entry to /api/entries (database)
// - Draft auto-saved to localStorage so sessions survive page refresh

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const PASSWORD = 'listeningnotes';

// ── DESIGN TOKENS ──────────────────────────────────────────────────────────
// Font and style constants reused throughout this file.
// Changing these here changes them everywhere in the session UI.
const MONO  = "'DM Mono', 'Courier New', monospace";
const SERIF = "'DM Serif Display', Georgia, serif";
const SANS  = "'DM Sans', system-ui, sans-serif";

// ── STAR RATING COMPONENT ──────────────────────────────────────────────────
// Reusable half-star rating input. Used for overall rating and per-track ratings.
// value: current rating (0–5, supports .5 increments)
// onChange: called with new value when user clicks
// size: pixel size of each star

function StarRating({ value, onChange, size = 18 }) {
  const [hover, setHover] = useState(null);
  const display = hover ?? value; // show hover state if hovering, otherwise show actual value
  return (
    <div style={{ display: 'flex', gap: 1 }} onMouseLeave={() => setHover(null)}>
      {[1,2,3,4,5].map(n => {
        const filled = n <= display;
        const half = !filled && display >= n - 0.5 && display < n;
        return (
          <span key={n} style={{ position: 'relative', display: 'inline-block', width: size, height: size, cursor: 'pointer', flexShrink: 0 }}>
            {/* Left half hitbox — triggers half star */}
            <span style={{ position: 'absolute', inset: 0, width: '50%', zIndex: 10 }}
              onMouseEnter={() => setHover(n - 0.5)}
              onClick={() => onChange(value === n - 0.5 ? 0 : n - 0.5)} />
            {/* Right half hitbox — triggers full star */}
            <span style={{ position: 'absolute', left: '50%', top: 0, right: 0, bottom: 0, zIndex: 10 }}
              onMouseEnter={() => setHover(n)}
              onClick={() => onChange(value === n ? 0 : n)} />
            {/* Grey background star */}
            <span style={{ position: 'absolute', inset: 0, color: '#d0ccc5', fontSize: size, lineHeight: 1, userSelect: 'none' }}>★</span>
            {/* Gold fill — full width for full star, half width for half star */}
            {(filled || half) && (
              <span style={{ position: 'absolute', inset: 0, overflow: 'hidden', width: filled ? size : size / 2, color: '#E8B84B', fontSize: size, lineHeight: 1, userSelect: 'none' }}>★</span>
            )}
          </span>
        );
      })}
    </div>
  );
}

// ── EXTERNAL API HELPERS ───────────────────────────────────────────────────
// Functions that fetch data from third-party APIs.
// These run client-side in the browser — no server involved.

// Fetches the tracklist for an album from MusicBrainz.
// MusicBrainz is a free music database — preferred over Apple Music because it requires no API key.
// Returns an array of { number, title, duration } objects, or null if not found.
async function fetchTracklist(albumName, artistName, year) {
  try {
    const query = encodeURIComponent(`release:"${albumName}" AND artist:"${artistName}"`);
    const searchRes = await fetch(
      `https://musicbrainz.org/ws/2/release/?query=${query}&limit=10&fmt=json`,
      { headers: { 'User-Agent': 'ListeningNotes/1.0 (listeningnotes.blog)' } }
    );
    const searchData = await searchRes.json();
    const releases = searchData.releases || [];
    if (!releases.length) return null;

    // Score each release to find the best match.
    // Prefer releases that match the year, are marked "official", and are album type.
    const yearNum = year ? parseInt(String(year), 10) : NaN;
    let best = null, bestScore = -Infinity;
    for (const r of releases) {
      let score = r.score || 0;
      const releaseYear = parseInt((r.date || '').slice(0, 4), 10);
      if (!isNaN(yearNum) && !isNaN(releaseYear) && releaseYear === yearNum) score += 30;
      if ((r.status || '').toLowerCase() === 'official') score += 20;
      if ((r['release-group']?.['primary-type'] || '').toLowerCase() === 'album') score += 10;
      if (score > bestScore) { bestScore = score; best = r; }
    }
    if (!best) return null;

    // Fetch the full release details including track listings
    const detailRes = await fetch(
      `https://musicbrainz.org/ws/2/release/${best.id}?inc=recordings&fmt=json`,
      { headers: { 'User-Agent': 'ListeningNotes/1.0 (listeningnotes.blog)' } }
    );
    const detail = await detailRes.json();

    // Flatten all discs into a single track list with sequential numbering
    const tracks = [];
    for (const disc of (detail.media || [])) {
      for (const t of (disc.tracks || [])) {
        tracks.push({ number: tracks.length + 1, title: t.title || t.recording?.title || 'Unknown', duration: t.length ? Math.round(t.length / 1000) : null });
      }
    }
    return tracks.length ? tracks : null;
  } catch { return null; }
}

// Fetches album art URL from iTunes Search API.
// Returns a high-resolution art URL (3000x3000) or empty string if not found.
// Uses a scoring system to find the best match when multiple results are returned.
async function fetchAlbumArtUrl(albumName, artistName, year) {
  try {
    const norm = s => String(s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
    const soundtrackTerms = ['soundtrack', 'original motion picture', 'ost', 'music from', 'score'];
    const albumWords = albumName.replace(/[^a-zA-Z0-9 ]/g, ' ').trim().split(/\s+/);
    const searchAlbum = albumWords.length > 4 ? albumWords.slice(0, 4).join(' ') : albumName;
    const query = encodeURIComponent(`${artistName} ${searchAlbum}`);
    const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=album&limit=25`);
    const data = await res.json();
    const results = data.results || [];
    if (!results.length) return '';

    const normAlbum = norm(albumName);
    const normArtist = norm(artistName);
    const isSoundtrack = soundtrackTerms.some(t => normAlbum.includes(t));
    const yearNum = year ? parseInt(String(year).match(/\d{4}/)?.[0] || '', 10) : NaN;

    // Score each result — exact name/artist match scores highest
    let best = null, bestScore = -Infinity;
    for (const r of results) {
      const rAlbum = norm(r.collectionName || '');
      const rArtist = norm(r.artistName || '');
      const rYear = parseInt((r.releaseDate || '').slice(0, 4), 10);
      let score = 0;
      if (rAlbum === normAlbum) score += 40;
      else if (rAlbum.includes(normAlbum) || normAlbum.includes(rAlbum)) score += 20;
      if (rArtist === normArtist) score += 30;
      else if (rArtist.includes(normArtist) || normArtist.includes(rArtist)) score += 15;
      else if (isSoundtrack) score += 10;
      if (!isNaN(yearNum) && !isNaN(rYear)) {
        if (rYear === yearNum) score += 20;
        else if (Math.abs(rYear - yearNum) <= 2) score += 8;
      }
      if (score > bestScore) { bestScore = score; best = r; }
    }
    // Replace the default 100x100 thumbnail with a 3000x3000 version
    if (best?.artworkUrl100) return best.artworkUrl100.replace(/\d+x\d+bb/, '3000x3000bb');
    return '';
  } catch { return ''; }
}

// Fetches an artist's full discography from iTunes.
// Used by the album picker landing page.
// Step 1: find the artist by name to get their iTunes ID
// Step 2: look up all albums by that ID
// Returns up to 20 albums sorted newest first, excluding singles and EPs.
async function searchArtistAlbums(artistQuery) {
  if (!artistQuery.trim()) return [];
  try {
    const searchRes = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(artistQuery)}&entity=musicArtist&limit=5`
    );
    const searchData = await searchRes.json();
    const artists = searchData.results || [];
    if (!artists.length) return [];

    // Pick the artist whose name most closely matches the query
    const q = artistQuery.toLowerCase().trim();
    const best = artists.find(a => a.artistName.toLowerCase() === q) || artists[0];
    const artistId = best.artistId;
    const artistName = best.artistName;

    const lookupRes = await fetch(
      `https://itunes.apple.com/lookup?id=${artistId}&entity=album&limit=100`
    );
    const lookupData = await lookupRes.json();
    // Filter out the artist record itself (first result) — keep only albums
    const results = (lookupData.results || []).filter(r => r.wrapperType === 'collection');

    // Deduplicate and filter out singles (track count 1-3) and "-  Single" titles
    const seen = new Set();
    const albums = [];
    for (const r of results) {
      if (!r.artworkUrl100) continue;
      const trackCount = r.trackCount || 0;
      if (trackCount > 0 && trackCount <= 3) continue;
      const name = r.collectionName || '';
      if (/- single$/i.test(name)) continue;
      const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seen.has(key)) continue;
      seen.add(key);
      albums.push({
        name,
        artist: artistName,
        year: (r.releaseDate || '').slice(0, 4),
        trackCount,
        art: r.artworkUrl100.replace(/\d+x\d+bb/, '600x600bb'),       // thumbnail for the grid
        artLarge: r.artworkUrl100.replace(/\d+x\d+bb/, '3000x3000bb'), // full res for the session background
      });
    }
    albums.sort((a, b) => (b.year || '0').localeCompare(a.year || '0'));
    return albums.slice(0, 20);
  } catch { return []; }
}

// ── UTILITY FORMATTERS ─────────────────────────────────────────────────────

// Formats seconds into M:SS — used for track durations
function fmtDuration(s) {
  if (!s) return '';
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Formats seconds into M:SS — used for the session elapsed timer
function fmtTime(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Rotating loading phrases shown during research
const LOADING_PHRASES = [
  'Searching the archive...','Pulling press records...','Checking release dates...',
  'Reading liner notes...','Cross-referencing labels...','Scanning chart history...',
  'Digging through the stacks...','Consulting the canon...','Reviewing session logs...','Gathering context...',
];

// ── PASSWORD GATE ──────────────────────────────────────────────────────────
// Shown when the user hasn't authenticated yet.
// On success, sets localStorage so the gate doesn't show again this browser session.

function PasswordGate({ onAuth }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState(false);
  const border = '1px solid #e0dcd5';
  const MONO = "'DM Mono', monospace";

  function handleAuth() {
    if (pw === PASSWORD) { onAuth(); }
    else setError(true);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f3ef', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: '#fff', border, borderRadius: 20, padding: 48, width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 4px 32px rgba(0,0,0,0.08)' }}>
        <div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 900, color: '#1a1916', letterSpacing: '-0.02em' }}>Listening Notes</div>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7a776f', marginTop: 4 }}>session access</div>
        </div>
        <input type="password" placeholder="password" value={pw}
          onChange={e => { setPw(e.target.value); setError(false); }}
          onKeyDown={e => e.key === 'Enter' && handleAuth()}
          style={{ background: '#fff', border: `1px solid ${error ? '#ef4444' : '#e0dcd5'}`, borderRadius: 8, padding: '12px 16px', fontFamily: MONO, fontSize: 13, color: '#1a1916', outline: 'none' }}
        />
        {error && <div style={{ fontFamily: MONO, fontSize: 11, color: '#ef4444' }}>incorrect password</div>}
        <button onClick={handleAuth}
          style={{ background: '#1a1916', color: '#fff', borderRadius: 8, padding: '12px 0', fontFamily: MONO, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', border: 'none', fontWeight: 600 }}>
          Enter →
        </button>
      </div>
    </div>
  );
}

// ── ALBUM PICKER ───────────────────────────────────────────────────────────
// The landing screen after login. Search by artist name, pick an album to begin.
// Debounces the search input so it doesn't fire on every keystroke.
// Also has a manual entry option for albums not found in iTunes.

function AlbumPicker({ onSelect }) {
  const [artistInput, setArtistInput] = useState('');
  const [albums, setAlbums] = useState([]);
  const [searching, setSearching] = useState(false);
  const [manualAlbum, setManualAlbum] = useState('');
  const [showManual, setShowManual] = useState(false);
  const debounceRef = useRef(null); // holds the setTimeout reference so we can cancel it
  const inputRef = useRef(null);

  const labelStyle = { fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7a776f' };

  // Auto-focus the search input when the picker loads
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search — waits 600ms after the user stops typing before firing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!artistInput.trim()) { setAlbums([]); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchArtistAlbums(artistInput);
      setAlbums(results);
      setSearching(false);
    }, 600);
    return () => clearTimeout(debounceRef.current);
  }, [artistInput]);

  // When an album tile is clicked, pass the selection up to the main Session component
  function handleAlbumClick(album) {
    onSelect({ album: album.name, artist: album.artist, year: album.year, artUrl: album.artLarge });
  }

  function handleManualSubmit() {
    if (!manualAlbum.trim() || !artistInput.trim()) return;
    onSelect({ album: manualAlbum.trim(), artist: artistInput.trim(), year: '', artUrl: '' });
  }

  const border = '1px solid #e0dcd5';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: SANS, position:'relative' }}>

      <style>{`
        @keyframes drift1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,-20px) scale(1.08)} }
        @keyframes drift2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-25px,30px) scale(1.06)} }
        @keyframes drift3 { 0%,100%{transform:translate(0,0) scale(1.05)} 50%{transform:translate(20px,20px) scale(1)} }
        @keyframes shimmer { 0%,100%{opacity:0.4} 50%{opacity:0.7} }
      `}</style>

      {/* Animated blob background — three colored circles drifting slowly */}
      <div style={{ position:'fixed', inset:0, overflow:'hidden', zIndex:0, background:'#f0ede8' }}>
        <div style={{ position:'absolute', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle, rgba(200,212,122,0.45) 0%, transparent 70%)', top:'-10%', left:'-5%', animation:'drift1 14s ease-in-out infinite' }} />
        <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(180,200,255,0.35) 0%, transparent 70%)', bottom:'-10%', right:'5%', animation:'drift2 18s ease-in-out infinite' }} />
        <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,220,180,0.35) 0%, transparent 70%)', top:'30%', right:'20%', animation:'drift3 22s ease-in-out infinite' }} />
        <div style={{ position:'absolute', inset:0, backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)' }} />
        <div style={{ position:'absolute', inset:0, background:'rgba(245,243,239,0.3)' }} />
      </div>

      {/* Top nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 28px', borderBottom: border, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)', WebkitBackdropFilter:'blur(16px)', flexShrink: 0, position:'relative', zIndex:1 }}>
        <span style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 900, color: '#1a1916', letterSpacing: '-0.02em' }}>Listening Notes</span>
        <span style={{ color: '#d0ccc5' }}>·</span>
        <span style={{ ...labelStyle }}>session</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <a href="/session/entries" style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7a776f', textDecoration: 'none', padding: '6px 10px', borderRadius: 8, border, background: '#fff' }}>Entries</a>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: albums.length > 0 ? 'flex-start' : 'center', padding: '48px 24px', transition: 'justify-content 0.3s', position:'relative', zIndex:1 }}>

        {/* Search input */}
        <div style={{ width: '100%', maxWidth: 560, marginBottom: albums.length > 0 ? 32 : 0 }}>
          <div style={{ fontFamily: SERIF, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#1a1916', lineHeight: 1.1, marginBottom: 28, textAlign: 'center' }}>
            What do you want<br />to listen to?
          </div>
          <div style={{ position: 'relative' }}>
            <input
              ref={inputRef}
              value={artistInput}
              onChange={e => setArtistInput(e.target.value)}
              placeholder="Search by artist..."
              style={{
                width: '100%', background: '#fff', border: '1px solid #d8d5cf',
                borderRadius: 14, padding: '16px 22px', fontFamily: SANS, fontSize: 16,
                color: '#1a1916', outline: 'none', boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
                boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = '#1a1916'}
              onBlur={e => e.target.style.borderColor = '#d8d5cf'}
            />
            {searching && (
              <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontFamily: MONO, fontSize: 10, color: '#aaa8a2', letterSpacing: '0.1em' }}>
                searching…
              </div>
            )}
          </div>

          {/* Manual album entry — shown when artist has been typed */}
          {artistInput.trim() && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
              {!showManual ? (
                <button onClick={() => setShowManual(true)} style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa8a2', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  + type album manually
                </button>
              ) : (
                <>
                  <input
                    value={manualAlbum}
                    onChange={e => setManualAlbum(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
                    placeholder="Album title..."
                    style={{ flex: 1, background: '#fff', border, borderRadius: 8, padding: '9px 14px', fontFamily: MONO, fontSize: 12, color: '#1a1916', outline: 'none' }}
                    autoFocus
                  />
                  <button onClick={handleManualSubmit} disabled={!manualAlbum.trim()}
                    style={{ background: '#1a1916', color: '#f5f3ef', border: 'none', borderRadius: 8, padding: '9px 18px', fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', opacity: manualAlbum.trim() ? 1 : 0.3 }}>
                    Start →
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Album grid — shown after search results load */}
        {albums.length > 0 && (
          <div style={{ width: '100%', maxWidth: 960 }}>
            <div style={{ ...labelStyle, marginBottom: 16, paddingLeft: 4 }}>
              Albums by {albums[0]?.artist} — choose one to begin
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 14,
            }}>
              {albums.map((album, i) => (
                <button
                  key={i}
                  onClick={() => handleAlbumClick(album)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', borderRadius: 10, transition: 'transform 0.15s', }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{ borderRadius: 10, overflow: 'hidden', aspectRatio: '1', background: '#ece9e3', marginBottom: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                    <img src={album.art} alt={album.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                  <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 500, color: '#1a1916', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.name}</div>
                  {album.year && <div style={{ fontFamily: MONO, fontSize: 10, color: '#aaa8a2', marginTop: 2 }}>{album.year}</div>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!searching && artistInput.trim() && albums.length === 0 && (
          <div style={{ marginTop: 24, fontFamily: MONO, fontSize: 11, color: '#aaa8a2', textAlign: 'center' }}>
            No results — try typing the album manually above
          </div>
        )}
      </div>
    </div>
  );
}

// ── RESEARCH LOADING OVERLAY ───────────────────────────────────────────────
// Full-screen overlay shown while /api/research is running.
// Shows the album art with a color-reveal fill animation that rises from the bottom.
// When research completes (onBurst is truthy), the art expands to fill the screen
// then transitions into the session view.

function ResearchOverlay({ art, phraseIndex, album, artist, onBurst }) {
  const [visible, setVisible] = useState(false);
  const [fillPct, setFillPct] = useState(0);     // 0–100, drives the color reveal height
  const [expanding, setExpanding] = useState(false); // triggers the expand-to-fill animation
  const fillRef = useRef(null);
  const fillPctRef = useRef(0);

  // Fade in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  // Slowly fill to ~82% while research is running
  // This gives visual feedback that something is happening without knowing the real progress
  useEffect(() => {
    fillRef.current = setInterval(() => {
      fillPctRef.current = Math.min(fillPctRef.current + 0.5, 82);
      setFillPct(fillPctRef.current);
    }, 50);
    return () => clearInterval(fillRef.current);
  }, []);

  // When research completes, rapidly fill to 100% then trigger the expand animation
  useEffect(() => {
    if (!onBurst) return;
    clearInterval(fillRef.current);
    const finish = setInterval(() => {
      fillPctRef.current = Math.min(fillPctRef.current + 4, 100);
      setFillPct(fillPctRef.current);
      if (fillPctRef.current >= 100) {
        clearInterval(finish);
        setTimeout(() => setExpanding(true), 80);
      }
    }, 20);
  }, [onBurst]);

  const phrases = ['Searching the archive...','Pulling press records...','Checking release dates...','Reading liner notes...','Cross-referencing labels...','Scanning chart history...','Digging through the stacks...','Consulting the canon...'];

  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:28, opacity:visible?1:0, transition:'opacity 0.4s ease', background:'rgba(245,243,239,0.96)', backdropFilter:'blur(12px)' }}>
      <div style={{ position:'relative', width:300, height:300 }}>
        {/* Pulsing ring around the art */}
        <div style={{ position:'absolute', inset:-12, borderRadius:28, border:'1.5px solid rgba(26,25,22,0.1)', animation:'ro-pulse 2s ease-in-out infinite', pointerEvents:'none' }} />
        {/* Art container — scales up to fill screen when expanding = true */}
        <div style={{
          position:'relative', width:300, height:300, borderRadius: expanding ? '0px' : '20px',
          overflow:'hidden',
          boxShadow: expanding ? 'none' : '0 24px 80px rgba(0,0,0,0.18)',
          transform: expanding ? `scale(${typeof window !== 'undefined' ? Math.max(window.innerWidth/300, window.innerHeight/300) * 1.05 : 6})` : 'scale(1)',
          transition: expanding ? 'transform 0.7s cubic-bezier(0.4,0,0.2,1), border-radius 0.7s ease, box-shadow 0.5s ease' : 'none',
          transformOrigin: 'center center',
          flexShrink: 0,
        }}>
          {art ? (<>
            {/* Desaturated dark base layer */}
            <img src={art} alt={album} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', filter:'grayscale(100%) brightness(0.55) blur(1px)', display:'block' }} />
            {/* Color reveal layer — rises from the bottom as fillPct increases */}
            <div style={{ position:'absolute', left:0, right:0, bottom:0, height:fillPct+'%', overflow:'hidden', transition:'height 0.06s linear' }}>
              <img src={art} alt="" style={{ position:'absolute', bottom:0, left:0, width:'100%', height:'300px', objectFit:'cover', display:'block' }} />
            </div>
          </>) : (
            <div style={{ width:'100%', height:'100%', background:'#2a2a2a' }} />
          )}
        </div>
      </div>
      <div style={{ textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:'clamp(1.2rem,2.5vw,1.7rem)', color:'#1a1916', lineHeight:1.1 }}>{album}</div>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(26,25,22,0.35)' }}>{artist}</div>
        <div key={phraseIndex} style={{ fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(26,25,22,0.45)', marginTop:6, animation:'overlay-fade 0.5s ease forwards' }}>
          {phrases[phraseIndex % 8]}
        </div>
      </div>
      <style>{`
        @keyframes ro-pulse{0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(1.04);opacity:0.15}}
        @keyframes overlay-fade{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </div>
  );
}

// ── MAIN SESSION COMPONENT ─────────────────────────────────────────────────
// Controls the overall session flow and holds all session state.
// Renders one of three views based on the `view` state:
// 'picker' → AlbumPicker
// 'loading' → ResearchOverlay  
// 'session' → the split-panel notes interface

export default function Session() {
  const [authed, setAuthed] = useState(false);
  const [view, setView] = useState('picker'); // 'picker' | 'loading' | 'session'
  const [loadingArt, setLoadingArt] = useState('');

  // Album identity — set from picker, passed to research
  const [albumInput, setAlbumInput] = useState('');
  const [artistInput, setArtistInput] = useState('');

  // Research brief — the structured album data returned from /api/research
  const [brief, setBrief] = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState('');
  const [loadingFactIndex, setLoadingFactIndex] = useState(0);

  // Media
  const [albumArt, setAlbumArt] = useState('');
  const [tracks, setTracks] = useState(null);       // null = not fetched yet, [] = not found
  const [tracksLoading, setTracksLoading] = useState(false);

  // Notes state — what you write during the session
  const [trackNotes, setTrackNotes] = useState({});    // { trackIndex: string }
  const [trackRatings, setTrackRatings] = useState({}); // { trackIndex: number }
  const [overallNotes, setOverallNotes] = useState('');
  const [rating, setRating] = useState(0);
  const [Masterpiece, setMasterpiece] = useState(false);
  const [Favorite, setFavorite] = useState(false);
  const [entryType, setEntryType] = useState('');
  const [relationship, setRelationship] = useState('');

  // Output — the formatted result from /api/format, shown in the output modal
  const [formatting, setFormatting] = useState(false);
  const [output, setOutput] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // UI state
  const [scoreCheckOpen, setScoreCheckOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);        // session timer in seconds
  const timerRef = useRef(null);
  const [burstReady, setBurstReady] = useState(false); // triggers the loading overlay expand animation

  // Chat state — the AI companion drawer at the bottom of the notes panel
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null); // used to auto-scroll to the latest message

  // Check localStorage for existing auth on mount — avoids re-entering password after refresh
  useEffect(() => {
    if (localStorage.getItem('ln_session_auth') === 'true') setAuthed(true);
  }, []);

  // Start the elapsed timer once a brief is loaded
  useEffect(() => {
    if (brief && !timerRef.current) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
  }, [brief]);

  // Auto-save draft to localStorage whenever notes or metadata changes
  // This means if you refresh or navigate away, your work is preserved
  useEffect(() => {
    if (!brief) return;
    const draft = { album: brief.album, artist: brief.artist, year: brief.year, albumArt, overallNotes, trackNotes, trackRatings, rating, Masterpiece, Favorite, entryType, relationship };
    localStorage.setItem('ln_session_draft', JSON.stringify(draft));
  }, [overallNotes, trackNotes, trackRatings, rating, Masterpiece, Favorite, entryType, relationship]);

  // Restore a previously saved draft if it matches the current album
  function restoreDraft(albumName) {
    try {
      const saved = JSON.parse(localStorage.getItem('ln_session_draft'));
      if (saved && saved.album === albumName) {
        setOverallNotes(saved.overallNotes || '');
        setTrackNotes(saved.trackNotes || {});
        setTrackRatings(saved.trackRatings || {});
        setRating(saved.rating || 0);
        setMasterpiece(saved.Masterpiece || false);
        setFavorite(saved.Favorite || false);
        setEntryType(saved.entryType || '');
        setRelationship(saved.relationship || '');
        return true;
      }
    } catch {}
    return false;
  }

  // Cycle through loading phrases while research is running
  useEffect(() => {
    if (!briefLoading) return;
    setLoadingFactIndex(0);
    const interval = setInterval(() => setLoadingFactIndex(i => (i + 1) % LOADING_PHRASES.length), 1800);
    return () => clearInterval(interval);
  }, [briefLoading]);

  function handleAuth() {
    setAuthed(true);
    localStorage.setItem('ln_session_auth', 'true');
  }

  // Called when an album is selected in the picker.
  // Sets up state, shows the loading overlay, fires research.
  async function handlePickerSelect({ album, artist, year, artUrl }) {
    setAlbumInput(album);
    setArtistInput(artist);
    if (artUrl) { setAlbumArt(artUrl); setLoadingArt(artUrl); }
    setView('loading');
    await doResearch(album, artist, artUrl);
    await new Promise(r => setTimeout(r, 1000)); // brief pause so expand animation completes
    setView('session');
  }

  // Average star rating across all rated tracks — shown in the score check panel
  const ratedTracks = Object.values(trackRatings).filter(v => v > 0);
  const scoreCheckAvg = ratedTracks.length
    ? (ratedTracks.reduce((a, b) => a + b, 0) / ratedTracks.length).toFixed(2) : null;

  // Calls /api/research to get the album brief from Claude.
  // Also fires album art and tracklist fetches in parallel.
  async function doResearch(album, artist, existingArt) {
    const a = album || albumInput;
    const ar = artist || artistInput;
    if (!a.trim()) return;
    setBriefLoading(true); setBriefError(''); setBrief(null); setBurstReady(false);
    setTracks(null); setTrackNotes({}); setTrackRatings({});
    if (!existingArt) setAlbumArt('');
    setElapsed(0); setOverallNotes('');
    setRating(0); setMasterpiece(false); setFavorite(false);
    setSaved(false); setOutput(null);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    try {
      const res = await fetch('/api/research', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ album: a, artist: ar })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBrief(data);
      restoreDraft(data.album); // check if there's a saved draft for this album
      setBurstReady(true); // signals the loading overlay to complete its animation

      // If we didn't get art from the picker, try to fetch it from the research result
      if (!existingArt) {
        fetchAlbumArtUrl(data.album, data.artist, data.year).then(url => { if (url) setAlbumArt(url); });
      }
      // Fetch tracklist in parallel — doesn't block the session from loading
      setTracksLoading(true);
      fetchTracklist(data.album, data.artist, data.year).then(t => { setTracks(t || []); setTracksLoading(false); });
    } catch (err) {
      setBriefError(err.message || 'Research failed.');
    } finally { setBriefLoading(false); }
  }

  // Sends a message to /api/reflect — the AI chat companion.
  // Passes your current notes and the album brief as context.
  async function sendChat(msg) {
  if (chatLoading) return;
  const message = msg || chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: message }]);
    setChatLoading(true);
    try {
      const res = await fetch('/api/reflect', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, brief, overallNotes, trackNotes, trackRatings, tracks: tracks || [] })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setChatMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'ai', text: 'Something went wrong: ' + err.message }]);
    } finally { setChatLoading(false); }
  }

  // Sends notes to /api/format for light editing and structure.
  // Result appears in the output modal for review before saving.
  async function doFormat() {
    if (!overallNotes.trim() || !brief) return;
    setFormatting(true);
    try {
      const res = await fetch('/api/format', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, notes: overallNotes, rating, Masterpiece, Favorite, entryType, relationship, horizonBar: true, trackNotes, trackRatings, tracks: tracks || [] })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setOutput(data);
    } catch (err) { alert('Formatting failed: ' + err.message); }
    finally { setFormatting(false); }
  }

  // Saves the formatted output to the database via /api/entries.
  // Clears the localStorage draft on success.
  async function doSave() {
    if (!output) return;
    setSaving(true);
    try {
      const res = await fetch('/api/entries', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          album: brief.album, artist: brief.artist, year: brief.year,
          entry_type: entryType || 'Personal Library',
          relationship: relationship || '',
          rating: Masterpiece ? 'Masterpiece' : (rating ? rating + ' stars' : ''),
          Favorite, background: output.background, notes: output.notes_prose,
          tags: output.tags || [], horizon: output.horizon || '',
          album_art: albumArt, post_link: ''
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSaved(true);
      localStorage.removeItem('ln_session_draft'); // clear draft — entry is now in the database
    } catch (err) { alert('Save failed: ' + err.message); }
    finally { setSaving(false); }
  }

  const border = '1px solid #e0dcd5';
  const labelStyle = { fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7a776f' };

  // ── RENDER GATES ────────────────────────────────────────────────────────
  // Each gate checks state and returns early with the appropriate screen.

  if (!authed) return <PasswordGate onAuth={handleAuth} />;
  if (view === 'picker') return <AlbumPicker onSelect={handlePickerSelect} />;
  if (view === 'loading') return <ResearchOverlay art={loadingArt} phraseIndex={loadingFactIndex} album={albumInput} artist={artistInput} onBurst={burstReady} />;

  // ── SESSION VIEW ─────────────────────────────────────────────────────────
  // The main split-panel interface shown after research completes.

  return (
    <>
      <style>{`
        @keyframes sn-pulse { 0%,100%{opacity:0.5}50%{opacity:1} }
        @keyframes sn-fade { from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)} }
        .sn-skel { background:rgba(255,255,255,0.08); border-radius:3px; animation:sn-pulse 1.6s ease-in-out infinite; }
        .sn-ti { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:8px; padding:8px 14px; font-family:'DM Mono',monospace; font-size:12px; color:#e8e4dc; outline:none; }
        .sn-ti:focus { border-color:rgba(255,255,255,0.4); }
        .sn-ti::placeholder { color:rgba(232,228,220,0.25); }
        .sn-sel { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:7px 10px; font-family:'DM Mono',monospace; font-size:11px; color:rgba(232,228,220,0.6); outline:none; cursor:pointer; }
        .sn-check { accent-color:#fff; cursor:pointer; }
        .sn-row:hover { background:rgba(255,255,255,0.05); }
        .sn-btn { transition:opacity 0.15s,transform 0.1s; }
        .sn-btn:hover:not(:disabled) { opacity:0.8; transform:translateY(-1px); }
        .sn-btn:disabled { opacity:0.3; cursor:not-allowed; }
        .sn-track-input { font-family:'DM Mono',monospace; font-size:11px; color:rgba(232,228,220,0.7); background:transparent; border:none; border-bottom:1px solid rgba(255,255,255,0.1); outline:none; width:100%; padding:5px 0; }
        .sn-track-input:focus { border-color:rgba(255,255,255,0.35); }
        .sn-track-input::placeholder { color:rgba(232,228,220,0.2); }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:#e0dcd5; border-radius:99px; }
      `}</style>

      {/* Blurred album art as full-screen background */}
      {albumArt && <div style={{ position:'fixed', inset:0, zIndex:0, backgroundImage:`url(${albumArt})`, backgroundSize:'cover', backgroundPosition:'center', filter:'blur(8px) saturate(1.2) brightness(0.75)', transform:'scale(1.1)', opacity:1, transition:'opacity 1.2s ease', pointerEvents:'none' }} />}
      <div style={{ position:'fixed', inset:0, zIndex:0, background: albumArt ? 'rgba(245,243,239,0.15)' : 'rgba(245,243,239,0.95)', pointerEvents:'none', transition:'background 1.2s ease' }} />

      <div style={{ minHeight:'100vh', color:'#e8e4dc', display:'flex', flexDirection:'column', fontFamily:SANS, position:'relative', zIndex:1 }}>

        {/* Top bar — back button, timer, entries link */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px', flexShrink:0 }}>
          <button onClick={() => setView('picker')} style={{ fontFamily:MONO, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(232,228,220,0.7)', background:'rgba(0,0,0,0.35)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, padding:'7px 14px', cursor:'pointer', backdropFilter:'blur(8px)' }}>
            ← Back
          </button>
          {brief && <span style={{ fontFamily:MONO, fontSize:10, color:'rgba(232,228,220,0.35)', letterSpacing:'0.1em' }}>{fmtTime(elapsed)}</span>}
          <a href="/session/entries" style={{ fontFamily:MONO, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(232,228,220,0.7)', textDecoration:'none', padding:'6px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(0,0,0,0.35)', backdropFilter:'blur(8px)', flexShrink:0 }}>Entries</a>
        </div>

        {/* Split panels */}
        <div style={{ display:'flex', flex:1, overflow:'hidden', gap:16, padding:16 }}>

          {/* LEFT PANEL: Album brief — research results from Claude */}
          <div style={{ flex:1, borderRadius:16, display:'flex', flexDirection:'column', overflow:'hidden', background:'rgba(0,0,0,0.45)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ padding:'10px 22px', borderBottom:'1px solid rgba(255,255,255,0.08)', flexShrink:0 }}>
              <span style={labelStyle}>Album Briefing</span>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'20px 22px', display:'flex', flexDirection:'column', gap:20 }}>

              {!brief && !briefLoading && !briefError && (
                <div style={{ textAlign:'center', paddingTop:80, fontFamily:MONO, fontSize:11, color:'rgba(232,228,220,0.35)', lineHeight:2 }}>
                  Researching album…
                </div>
              )}

              {/* Skeleton loading state */}
              {briefLoading && (
                <div style={{ display:'flex', flexDirection:'column', gap:20, paddingTop:40 }}>
                  <div key={loadingFactIndex} style={{ fontFamily:MONO, fontSize:11, color:'rgba(232,228,220,0.4)', textAlign:'center', animation:'sn-fade 0.4s ease' }}>
                    {LOADING_PHRASES[loadingFactIndex]}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {[80,60,90,45,80,65].map((w,i) => <div key={i} className="sn-skel" style={{ height:9, width:w+'%', animationDelay:i*0.1+'s' }} />)}
                  </div>
                </div>
              )}

              {briefError && <div style={{ fontFamily:MONO, fontSize:11, color:'#ef4444' }}>{briefError}</div>}

              {/* Brief content — album art, metadata chips, and research sections */}
              {brief && (<>
                <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
                  {albumArt
                    ? <img src={albumArt} alt={brief.album} style={{ width:96, height:96, borderRadius:10, objectFit:'cover', flexShrink:0, boxShadow:'0 8px 32px rgba(0,0,0,0.15)' }} />
                    : <div style={{ width:96, height:96, borderRadius:10, background:'#ece9e3', flexShrink:0 }} />
                  }
                  <div style={{ minWidth:0, paddingTop:4 }}>
                    <div style={{ fontFamily:SERIF, fontSize:22, color:'#e8e4dc', lineHeight:1.1, marginBottom:5 }}>{brief.album}</div>
                    <div style={{ fontFamily:MONO, fontSize:11, color:'rgba(232,228,220,0.5)', marginBottom:10 }}>{brief.artist}</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      {[brief.year, brief.genre, brief.label, brief.debut ? '⬖ debut' : null].filter(Boolean).map((t,i) => (
                        <span key={i} style={{ fontFamily:MONO, fontSize:10, color:'rgba(232,228,220,0.5)', border:'1px solid rgba(255,255,255,0.15)', padding:'2px 8px', borderRadius:4, background:'rgba(255,255,255,0.08)' }}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Research sections — Context, Production, Reception, Listen For */}
                {[['Context',brief.context],['Production',brief.production],['Reception',brief.reception],['Listen For',brief.listen_for]].map(([l,val]) => val ? (
                  <div key={l}>
                    <div style={{ ...labelStyle, marginBottom:8, paddingBottom:6, borderBottom:'1px solid #e8e5df' }}>{l}</div>
                    <div style={{ fontSize:12.5, lineHeight:1.78, color:'rgba(232,228,220,0.75)' }}>{val}</div>
                  </div>
                ) : null)}

                {brief.key_facts?.length > 0 && (
                  <div>
                    <div style={{ ...labelStyle, marginBottom:8, paddingBottom:6, borderBottom:'1px solid #e8e5df' }}>Key Facts</div>
                    {brief.key_facts.map((f,i) => <div key={i} style={{ fontSize:12.5, color:'rgba(232,228,220,0.75)', marginBottom:6 }}>— {f}</div>)}
                  </div>
                )}
              </>)}
            </div>
          </div>

          {/* RIGHT PANEL: Notes — your writing workspace */}
          <div style={{ flex:1, borderRadius:16, display:'flex', flexDirection:'column', overflow:'hidden', background:'rgba(0,0,0,0.45)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,0.1)' }}>

            {/* Notes panel header — entry type and relationship dropdowns */}
            <div style={{ padding:'10px 22px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
              <span style={labelStyle}>Session Notes</span>
              <select value={entryType} onChange={e => setEntryType(e.target.value)} className="sn-sel" style={{ marginLeft:'auto' }}>
                <option value="">— Type</option>
                <option value="Personal Library">Personal Library</option>
                <option value="Submission">Submission</option>
              </select>
              <select value={relationship} onChange={e => setRelationship(e.target.value)} className="sn-sel">
                <option value="">— Relationship</option>
                <option>First Listen</option>
                <option>Revisit</option>
                <option>Formative</option>
                <option>Study</option>
                <option>Submission</option>
              </select>
            </div>

            {/* Rating bar — stars, masterpiece/favorite toggles, score check */}
            <div style={{ padding:'10px 22px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', gap:16, flexShrink:0 }}>
              <StarRating value={rating} onChange={setRating} size={20} />
              <div style={{ width:1, height:18, background:'rgba(255,255,255,0.15)' }} />
              {[['Masterpiece',Masterpiece,setMasterpiece],['Favorite',Favorite,setFavorite]].map(([lbl,val,fn]) => (
                <label key={lbl} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
                  <input type="checkbox" checked={val} onChange={e => fn(e.target.checked)} className="sn-check" />
                  <span style={{ fontFamily:MONO, fontSize:10, color:val ? '#e8e4dc' : 'rgba(232,228,220,0.35)' }}>{lbl}</span>
                </label>
              ))}
              {/* Score check — shows average of all rated tracks */}
              {ratedTracks.length > 0 && (
                <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
                  <button onClick={() => setScoreCheckOpen(c => !c)} style={{ fontFamily:MONO, fontSize:10, textTransform:'uppercase', color:'rgba(232,228,220,0.35)', background:'none', border:'none', cursor:'pointer', letterSpacing:'0.1em' }}>
                    {scoreCheckOpen ? '▼' : '▶'} score check
                  </button>
                  {scoreCheckOpen && <span style={{ fontFamily:MONO, fontSize:11, color:'rgba(232,228,220,0.8)', fontWeight:600 }}>{scoreCheckAvg} / 5</span>}
                </div>
              )}
            </div>

            <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column' }}>

              {/* Overall notes textarea — auto-expands as you type */}
              <div style={{ borderBottom:'1px solid rgba(255,255,255,0.08)', padding:'14px 22px 16px' }}>
                <div style={{ ...labelStyle, marginBottom:10 }}>Overall Notes</div>
                <textarea
                  value={overallNotes}
                  onChange={e => {
                    setOverallNotes(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  placeholder="How does this album feel as a whole? Themes, impressions, context..."
                  style={{ fontFamily:MONO, fontSize:12.5, lineHeight:1.9, color:'#e8e4dc', background:'transparent', border:'none', outline:'none', resize:'none', width:'100%', minHeight:120, overflow:'hidden', display:'block', boxSizing:'border-box' }}
                />
              </div>

              {/* Per-track notes — shown once tracklist loads */}
              {tracks && tracks.length > 0 && (
                <div>
                  <div style={{ padding:'12px 22px 8px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                    <span style={labelStyle}>Track Notes</span>
                    {tracksLoading && <span style={{ ...labelStyle, marginLeft:8, opacity:0.4 }}>loading...</span>}
                  </div>
                  {tracks.map((t,i) => (
                    <div key={i} className="sn-row" style={{ padding:'10px 22px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', gap:6 }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                        <span style={{ fontFamily:MONO, fontSize:11, color:'rgba(232,228,220,0.5)', minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          <span style={{ color:'rgba(232,228,220,0.25)', marginRight:6 }}>{t.number}.</span>
                          {t.title}
                          {t.duration && <span style={{ color:'rgba(232,228,220,0.25)', marginLeft:8 }}>{fmtDuration(t.duration)}</span>}
                        </span>
                        <StarRating value={trackRatings[i] || 0} onChange={v => setTrackRatings(prev => ({ ...prev, [i]: v }))} size={13} />
                      </div>
                      {/* Auto-expanding track note textarea */}
                      <textarea
                        value={trackNotes[i] || ''}
                        onChange={e => {
                          setTrackNotes(prev => ({ ...prev, [i]: e.target.value }));
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        placeholder="notes..."
                        className="sn-track-input"
                        rows={1}
                        style={{ resize:'none', overflow:'hidden', display:'block' }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Track skeleton — shown while tracklist is loading */}
              {tracksLoading && !tracks && (
                <div style={{ padding:'14px 22px', display:'flex', flexDirection:'column', gap:10 }}>
                  <span style={labelStyle}>Track Notes</span>
                  {[...Array(6)].map((_,i) => <div key={i} className="sn-skel" style={{ height:36, borderRadius:6 }} />)}
                </div>
              )}
            </div>

            {/* AI Chat drawer — slides up from bottom of notes panel */}
            {chatOpen && (
              <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', display:'flex', flexDirection:'column', height:280, background:'rgba(0,0,0,0.25)', flexShrink:0 }}>
                <div style={{ flex:1, overflowY:'auto', padding:'12px 16px', display:'flex', flexDirection:'column', gap:10 }}>
                  {/* Quick prompt suggestions shown when chat is empty */}
                  {chatMessages.length === 0 && (
                    <div style={{ display:'flex', flexDirection:'column', gap:8, paddingTop:8 }}>
                      <div style={{ fontFamily:MONO, fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(232,228,220,0.25)', marginBottom:4 }}>Quick prompts</div>
                      {['Reflect on my notes so far', 'What patterns do you notice?', 'Push back on something I said'].map(p => (
                        <button key={p} onClick={() => sendChat(p)}
                          style={{ fontFamily:MONO, fontSize:10, color:'rgba(232,228,220,0.5)', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:6, padding:'6px 12px', cursor:'pointer', textAlign:'left', letterSpacing:'0.04em' }}>
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Chat message history */}
                  {chatMessages.map((m, i) => (
                    <div key={i} style={{ display:'flex', flexDirection:'column', gap:2, alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div style={{ fontFamily:MONO, fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(232,228,220,0.25)' }}>{m.role === 'user' ? 'you' : 'ai'}</div>
                      <div style={{ maxWidth:'85%', padding:'8px 12px', borderRadius:10, background: m.role === 'user' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', fontFamily:SANS, fontSize:12, lineHeight:1.7, color:'rgba(232,228,220,0.88)', whiteSpace:'pre-wrap' }}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                  {/* Typing indicator */}
                  {chatLoading && (
                    <div style={{ display:'flex', gap:4, padding:'4px 0' }}>
                      {[0,1,2].map(i => <div key={i} style={{ width:5, height:5, borderRadius:'50%', background:'rgba(232,228,220,0.3)', animation:`overlay-dot 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                {/* Chat input */}
                <div style={{ display:'flex', gap:8, padding:'10px 16px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
                    placeholder="Ask anything about the music…"
                    style={{ flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, padding:'8px 12px', fontFamily:MONO, fontSize:11, color:'#e8e4dc', outline:'none' }}
                  />
                  <button onClick={() => sendChat()} disabled={!chatInput.trim() || chatLoading}
                    style={{ background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:8, padding:'8px 14px', fontFamily:MONO, fontSize:11, color:'#e8e4dc', cursor:'pointer', letterSpacing:'0.06em' }}>
                    →
                  </button>
                </div>
              </div>
            )}

            {/* Bottom action bar — char count, chat toggle, format button */}
            <div style={{ padding:'12px 22px', borderTop:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, background:'rgba(0,0,0,0.2)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontFamily:MONO, fontSize:10, color:'rgba(232,228,220,0.35)' }}>{overallNotes.length} chars</span>
                <button onClick={() => setChatOpen(v => !v)}
                  style={{ fontFamily:MONO, fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color: chatOpen ? '#e8e4dc' : 'rgba(232,228,220,0.4)', background: chatOpen ? 'rgba(255,255,255,0.12)' : 'none', border:'1px solid ' + (chatOpen ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'), borderRadius:6, padding:'5px 10px', cursor:'pointer' }}>
                  {chatOpen ? '✕ chat' : '💬 ask ai'}
                </button>
              </div>
              {/* Format & Done — disabled until brief is loaded and notes are at least 10 chars */}
              <button onClick={doFormat} disabled={!brief || overallNotes.trim().length < 10 || formatting} className="sn-btn"
                style={{ background:'rgba(255,255,255,0.15)', color:'#e8e4dc', borderRadius:8, padding:'9px 24px', fontFamily:MONO, fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', border:'1px solid rgba(255,255,255,0.2)', cursor:'pointer', fontWeight:600 }}>
                {formatting ? 'Formatting…' : 'Format & Done →'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* OUTPUT MODAL ────────────────────────────────────────────────────────
          Shows the formatted output from /api/format for review.
          From here you can save to the database or close and keep editing. */}
      {output && (
        <div style={{ position:'fixed', inset:0, background:'rgba(26,25,22,0.6)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:24 }}>
          <div style={{ background:'#fff', border:'1px solid #e0dcd5', borderRadius:20, width:'100%', maxWidth:680, maxHeight:'85vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 24px 80px rgba(0,0,0,0.2)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 28px', borderBottom:'1px solid #e0dcd5' }}>
              <span style={{ fontFamily:SERIF, fontSize:20, color:'#1a1916' }}>Session Output</span>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                {!saved
                  ? <button onClick={doSave} disabled={saving} className="sn-btn" style={{ background:'#1a1916', color:'#fff', borderRadius:8, padding:'8px 20px', fontFamily:MONO, fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', border:'none', cursor:'pointer', fontWeight:600 }}>
                      {saving ? 'Saving…' : 'Save to Site →'}
                    </button>
                  : <span style={{ fontFamily:MONO, fontSize:11, color:'#7a776f', fontWeight:600 }}>✓ saved</span>
                }
                <button onClick={() => setOutput(null)} style={{ background:'#f5f3ef', color:'#7a776f', borderRadius:8, padding:'8px 14px', fontFamily:MONO, fontSize:11, border:'1px solid #e0dcd5', cursor:'pointer' }}>close</button>
              </div>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:28, display:'flex', flexDirection:'column', gap:24 }}>
              <div>
                <div style={{ ...labelStyle, marginBottom:10 }}>Background</div>
                <div style={{ fontSize:13.5, lineHeight:1.85, color:'#5a5750' }}>{output.background}</div>
              </div>
              {output.horizon && <div style={{ textAlign:'center', fontFamily:MONO, fontSize:16, color:'#c0bdb7', letterSpacing:'0.04em' }}>{output.horizon}</div>}
              <div>
                <div style={{ ...labelStyle, marginBottom:10 }}>Notes</div>
                <div style={{ fontSize:13.5, lineHeight:1.85, color:'#1a1916' }}>{output.notes_prose}</div>
              </div>
              <div>
                <div style={{ ...labelStyle, marginBottom:10 }}>Tags</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {(output.tags || []).map((t,i) => (
                    <span key={i} style={{ fontFamily:MONO, fontSize:10, color:'#7a776f', border:'1px solid #e0dcd5', padding:'3px 10px', borderRadius:4, background:'#f5f3ef' }}>#{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}