
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const PASSWORD = 'listeningnotes';
const MONO  = "'DM Mono', 'Courier New', monospace";
const SERIF = "'DM Serif Display', Georgia, serif";
const SANS  = "'DM Sans', system-ui, sans-serif";

// ── Star Rating ────────────────────────────────────────────────────────────

function StarRating({ value, onChange, size = 18 }) {
  const [hover, setHover] = useState(null);
  const display = hover ?? value;
  return (
    <div style={{ display: 'flex', gap: 1 }} onMouseLeave={() => setHover(null)}>
      {[1,2,3,4,5].map(n => {
        const filled = n <= display;
        const half = !filled && display >= n - 0.5 && display < n;
        return (
          <span key={n} style={{ position: 'relative', display: 'inline-block', width: size, height: size, cursor: 'pointer', flexShrink: 0 }}>
            <span style={{ position: 'absolute', inset: 0, width: '50%', zIndex: 10 }}
              onMouseEnter={() => setHover(n - 0.5)}
              onClick={() => onChange(value === n - 0.5 ? 0 : n - 0.5)} />
            <span style={{ position: 'absolute', left: '50%', top: 0, right: 0, bottom: 0, zIndex: 10 }}
              onMouseEnter={() => setHover(n)}
              onClick={() => onChange(value === n ? 0 : n)} />
            <span style={{ position: 'absolute', inset: 0, color: '#d0ccc5', fontSize: size, lineHeight: 1, userSelect: 'none' }}>★</span>
            {(filled || half) && (
              <span style={{ position: 'absolute', inset: 0, overflow: 'hidden', width: filled ? size : size / 2, color: '#E8B84B', fontSize: size, lineHeight: 1, userSelect: 'none' }}>★</span>
            )}
          </span>
        );
      })}
    </div>
  );
}

// ── API helpers ────────────────────────────────────────────────────────────

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
    const detailRes = await fetch(
      `https://musicbrainz.org/ws/2/release/${best.id}?inc=recordings&fmt=json`,
      { headers: { 'User-Agent': 'ListeningNotes/1.0 (listeningnotes.blog)' } }
    );
    const detail = await detailRes.json();
    const tracks = [];
    for (const disc of (detail.media || [])) {
      for (const t of (disc.tracks || [])) {
        tracks.push({ number: tracks.length + 1, title: t.title || t.recording?.title || 'Unknown', duration: t.length ? Math.round(t.length / 1000) : null });
      }
    }
    return tracks.length ? tracks : null;
  } catch { return null; }
}

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
    if (best?.artworkUrl100) return best.artworkUrl100.replace(/\d+x\d+bb/, '3000x3000bb');
    return '';
  } catch { return ''; }
}

// Search iTunes for artist discography
async function searchArtistAlbums(artistQuery) {
  if (!artistQuery.trim()) return [];
  try {
    const query = encodeURIComponent(artistQuery);
    const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=album&limit=20&attribute=artistTerm`);
    const data = await res.json();
    const results = data.results || [];
    // Deduplicate by collection name, take most relevant
    const seen = new Set();
    const albums = [];
    for (const r of results) {
      const key = (r.collectionName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!seen.has(key) && r.artworkUrl100) {
        seen.add(key);
        albums.push({
          name: r.collectionName,
          artist: r.artistName,
          year: (r.releaseDate || '').slice(0, 4),
          art: r.artworkUrl100.replace(/\d+x\d+bb/, '600x600bb'),
          artLarge: r.artworkUrl100.replace(/\d+x\d+bb/, '3000x3000bb'),
        });
      }
    }
    return albums.slice(0, 12);
  } catch { return []; }
}

function fmtDuration(s) {
  if (!s) return '';
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function fmtTime(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const LOADING_PHRASES = [
  'Searching the archive...','Pulling press records...','Checking release dates...',
  'Reading liner notes...','Cross-referencing labels...','Scanning chart history...',
  'Digging through the stacks...','Consulting the canon...','Reviewing session logs...','Gathering context...',
];

// ── Password Gate ──────────────────────────────────────────────────────────

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
          style={{ background: '#1a1916', color: '#1a1916', borderRadius: 8, padding: '12px 0', fontFamily: MONO, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', border: 'none', fontWeight: 600 }}>
          Enter →
        </button>
      </div>
    </div>
  );
}

// ── Album Picker Landing ───────────────────────────────────────────────────

function AlbumPicker({ onSelect }) {
  const [artistInput, setArtistInput] = useState('');
  const [albums, setAlbums] = useState([]);
  const [searching, setSearching] = useState(false);
  const [manualAlbum, setManualAlbum] = useState('');
  const [showManual, setShowManual] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  const labelStyle = { fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7a776f' };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
      {/* Animated glass background */}
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

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: albums.length > 0 ? 'flex-start' : 'center', padding: '48px 24px', transition: 'justify-content 0.3s', position:'relative', zIndex:1 }}>

        {/* Prompt + artist input */}
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

          {/* Manual album override */}
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

        {/* Album carousel */}
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

        {/* Empty state after search yields nothing */}
        {!searching && artistInput.trim() && albums.length === 0 && (
          <div style={{ marginTop: 24, fontFamily: MONO, fontSize: 11, color: '#aaa8a2', textAlign: 'center' }}>
            No results — try typing the album manually above
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Session App ───────────────────────────────────────────────────────


function ResearchOverlay({ art, phraseIndex, album, artist }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', opacity:visible?1:0, transition:'opacity 0.4s ease', overflow:'hidden' }}>
      {art && <div style={{ position:'absolute', inset:'-40px', backgroundImage:`url(${art})`, backgroundSize:'cover', backgroundPosition:'center', filter:'blur(60px) saturate(1.2) brightness(0.85)', transform:'scale(1.15)' }} />}
      <div style={{ position:'absolute', inset:0, background:art?'rgba(245,243,239,0.82)':'#f5f3ef' }} />
      <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:32, padding:32, textAlign:'center' }}>
        {art && <img src={art} alt={album} style={{ width:120, height:120, borderRadius:14, objectFit:'cover', boxShadow:'0 24px 64px rgba(0,0,0,0.6)' }} />}
        <div>
          <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:'clamp(1.4rem,3vw,2rem)', color:'#1a1916', lineHeight:1.1, marginBottom:6 }}>{album}</div>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(26,25,22,0.4)' }}>{artist}</div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
          <div key={phraseIndex} style={{ fontFamily:"'DM Mono',monospace", fontSize:11, letterSpacing:'0.12em', textTransform:'uppercase', color:'#1a1916', animation:'overlay-fade 0.5s ease forwards' }}>
            {['Searching the archive...','Pulling press records...','Checking release dates...','Reading liner notes...','Cross-referencing labels...','Scanning chart history...','Digging through the stacks...','Consulting the canon...'][phraseIndex % 8]}
          </div>
          <div style={{ display:'flex', gap:6 }}>
            {[0,1,2].map(i => <div key={i} style={{ width:5, height:5, borderRadius:'50%', background:'rgba(200,212,122,0.4)', animation:`overlay-dot 1.4s ease-in-out ${i*0.2}s infinite` }} />)}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes overlay-fade { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes overlay-dot { 0%,100%{opacity:0.3;transform:scale(1)} 50%{opacity:1;transform:scale(1.4)} }
      `}</style>
    </div>
  );
}

export default function Session() {
  const [authed, setAuthed] = useState(false);
  // 'picker' | 'session'
  const [view, setView] = useState('picker');
  const [loadingArt, setLoadingArt] = useState('');

  // Pre-filled from picker
  const [albumInput, setAlbumInput] = useState('');
  const [artistInput, setArtistInput] = useState('');

  const [brief, setBrief] = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState('');
  const [loadingFactIndex, setLoadingFactIndex] = useState(0);
  const [albumArt, setAlbumArt] = useState('');
  const [tracks, setTracks] = useState(null);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [trackNotes, setTrackNotes] = useState({});
  const [trackRatings, setTrackRatings] = useState({});
  const [overallNotes, setOverallNotes] = useState('');
  const [rating, setRating] = useState(0);
  const [Masterpiece, setMasterpiece] = useState(false);
  const [Favorite, setFavorite] = useState(false);
  const [entryType, setEntryType] = useState('');
  const [relationship, setRelationship] = useState('');
  const [formatting, setFormatting] = useState(false);
  const [output, setOutput] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [scoreCheckOpen, setScoreCheckOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (localStorage.getItem('ln_session_auth') === 'true') setAuthed(true);
  }, []);

  useEffect(() => {
    if (brief && !timerRef.current) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
  }, [brief]);

  // Auto-save draft
  useEffect(() => {
    if (!brief) return;
    const draft = { album: brief.album, artist: brief.artist, year: brief.year, albumArt, overallNotes, trackNotes, trackRatings, rating, Masterpiece, Favorite, entryType, relationship };
    localStorage.setItem('ln_session_draft', JSON.stringify(draft));
  }, [overallNotes, trackNotes, trackRatings, rating, Masterpiece, Favorite, entryType, relationship]);

  // Restore draft if same album
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

  // Called when user picks an album from the picker
  async function handlePickerSelect({ album, artist, year, artUrl }) {
    setAlbumInput(album);
    setArtistInput(artist);
    if (artUrl) { setAlbumArt(artUrl); setLoadingArt(artUrl); }
    setView('loading');
    await doResearch(album, artist, artUrl);
    setView('session');


  }

  const ratedTracks = Object.values(trackRatings).filter(v => v > 0);
  const scoreCheckAvg = ratedTracks.length
    ? (ratedTracks.reduce((a, b) => a + b, 0) / ratedTracks.length).toFixed(2) : null;

  async function doResearch(album, artist, existingArt) {
    const a = album || albumInput;
    const ar = artist || artistInput;
    if (!a.trim()) return;
    setBriefLoading(true); setBriefError(''); setBrief(null);
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
      restoreDraft(data.album);
      // Fetch better art from research result if we didn't get it from picker
      if (!existingArt) {
        fetchAlbumArtUrl(data.album, data.artist, data.year).then(url => { if (url) setAlbumArt(url); });
      }
      setTracksLoading(true);
      fetchTracklist(data.album, data.artist, data.year).then(t => { setTracks(t || []); setTracksLoading(false); });
    } catch (err) {
      setBriefError(err.message || 'Research failed.');
    } finally { setBriefLoading(false); }
  }

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
      localStorage.removeItem('ln_session_draft');
    } catch (err) { alert('Save failed: ' + err.message); }
    finally { setSaving(false); }
  }

  const border = '1px solid #e0dcd5';
  const labelStyle = { fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7a776f' };

  // ── Render gates ──

  if (!authed) return <PasswordGate onAuth={handleAuth} />;
  if (view === 'picker') return <AlbumPicker onSelect={handlePickerSelect} />;
  if (view === 'loading') return <ResearchOverlay art={loadingArt} phraseIndex={loadingFactIndex} album={albumInput} artist={artistInput} />;

  // ── Session view ───────────────────────────────────────────────────────────

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

      {albumArt && <div style={{ position:'fixed', inset:0, zIndex:0, backgroundImage:`url(${albumArt})`, backgroundSize:'cover', backgroundPosition:'center', filter:'blur(8px) saturate(1.2) brightness(0.75)', transform:'scale(1.1)', opacity:1, transition:'opacity 1.2s ease', pointerEvents:'none' }} />}
      <div style={{ position:'fixed', inset:0, zIndex:0, background: albumArt ? 'rgba(245,243,239,0.15)' : 'rgba(245,243,239,0.95)', pointerEvents:'none', transition:'background 1.2s ease' }} />

      <div style={{ minHeight:'100vh', color:'#e8e4dc', display:'flex', flexDirection:'column', fontFamily:SANS, position:'relative', zIndex:1 }}>

        {/* Top bar */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px', flexShrink:0 }}>
          <button onClick={() => setView('picker')} style={{ fontFamily:MONO, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(232,228,220,0.7)', background:'rgba(0,0,0,0.35)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, padding:'7px 14px', cursor:'pointer', backdropFilter:'blur(8px)' }}>
            ← Back
          </button>
          {brief && <span style={{ fontFamily:MONO, fontSize:10, color:'rgba(232,228,220,0.35)', letterSpacing:'0.1em' }}>{fmtTime(elapsed)}</span>}
          <a href="/session/entries" style={{ fontFamily:MONO, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(232,228,220,0.7)', textDecoration:'none', padding:'6px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(0,0,0,0.35)', backdropFilter:'blur(8px)', flexShrink:0 }}>Entries</a>
        </div>
        {/* Split panels */}
        <div style={{ display:'flex', flex:1, overflow:'hidden', gap:16, padding:16 }}>

          {/* LEFT: Brief */}
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

          {/* RIGHT: Notes */}
          <div style={{ flex:1, borderRadius:16, display:'flex', flexDirection:'column', overflow:'hidden', background:'rgba(0,0,0,0.45)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,0.1)' }}>

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

            <div style={{ padding:'10px 22px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', gap:16, flexShrink:0 }}>
              <StarRating value={rating} onChange={setRating} size={20} />
              <div style={{ width:1, height:18, background:'rgba(255,255,255,0.15)' }} />
              {[['Masterpiece',Masterpiece,setMasterpiece],['Favorite',Favorite,setFavorite]].map(([lbl,val,fn]) => (
                <label key={lbl} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
                  <input type="checkbox" checked={val} onChange={e => fn(e.target.checked)} className="sn-check" />
                  <span style={{ fontFamily:MONO, fontSize:10, color:val ? '#e8e4dc' : 'rgba(232,228,220,0.35)' }}>{lbl}</span>
                </label>
              ))}
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

              {tracksLoading && !tracks && (
                <div style={{ padding:'14px 22px', display:'flex', flexDirection:'column', gap:10 }}>
                  <span style={labelStyle}>Track Notes</span>
                  {[...Array(6)].map((_,i) => <div key={i} className="sn-skel" style={{ height:36, borderRadius:6 }} />)}
                </div>
              )}
            </div>

            <div style={{ padding:'12px 22px', borderTop:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, background:'rgba(0,0,0,0.2)' }}>
              <span style={{ fontFamily:MONO, fontSize:10, color:'rgba(232,228,220,0.35)' }}>{overallNotes.length} chars</span>
              <button onClick={doFormat} disabled={!brief || overallNotes.trim().length < 10 || formatting} className="sn-btn"
                style={{ background:'rgba(255,255,255,0.15)', color:'#e8e4dc', borderRadius:8, padding:'9px 24px', fontFamily:MONO, fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', border:'1px solid rgba(255,255,255,0.2)', cursor:'pointer', fontWeight:600 }}>
                {formatting ? 'Formatting…' : 'Format & Done →'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Output modal */}
      {output && (
        <div style={{ position:'fixed', inset:0, background:'rgba(26,25,22,0.6)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:24 }}>
          <div style={{ background:'#fff', border:'1px solid #e0dcd5', borderRadius:20, width:'100%', maxWidth:680, maxHeight:'85vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 24px 80px rgba(0,0,0,0.2)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 28px', borderBottom:'1px solid #e0dcd5' }}>
              <span style={{ fontFamily:SERIF, fontSize:20, color:'#1a1916' }}>Session Output</span>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                {!saved
                  ? <button onClick={doSave} disabled={saving} className="sn-btn" style={{ background:'#1a1916', color:'#1a1916', borderRadius:8, padding:'8px 20px', fontFamily:MONO, fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', border:'none', cursor:'pointer', fontWeight:600 }}>
                      {saving ? 'Saving…' : 'Save to Site →'}
                    </button>
                  : <span style={{ fontFamily:MONO, fontSize:11, color:'rgba(232,228,220,0.8)', fontWeight:600 }}>✓ saved</span>
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

