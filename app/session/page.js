'use client';

import { useState, useEffect, useRef } from 'react';

const PASSWORD = 'listeningnotes';

// ── Half-star rating component ──────────────────────────────────────────
function StarRating({ value, onChange, small = false }) {
  const [hover, setHover] = useState(null);
  const size = small ? 'text-base' : 'text-xl';
  const display = hover ?? value;

  return (
    <div className="flex gap-0.5" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map(n => {
        const full = n <= display;
        const half = !full && display >= n - 0.5 && display < n;

        return (
          <span key={n} className={`relative cursor-pointer ${size}`}
            style={{ width: small ? '1.1em' : '1.3em', display: 'inline-block' }}>
            {/* left half hitbox */}
            <span className="absolute inset-0 w-1/2 z-10"
              onMouseEnter={() => setHover(n - 0.5)}
              onClick={() => onChange(value === n - 0.5 ? 0 : n - 0.5)} />
            {/* right half hitbox */}
            <span className="absolute inset-0 left-1/2 w-1/2 z-10"
              onMouseEnter={() => setHover(n)}
              onClick={() => onChange(value === n ? 0 : n)} />
            {/* visual */}
            {full && <span className="text-[#c8d47a]">★</span>}
            {half && (
              <span style={{ position: 'relative', display: 'inline-block' }}>
                {/* grey background star */}
                <span className="text-[#333]">★</span>
                {/* yellow left half clipped over it */}
                <span style={{
                  position: 'absolute', left: 0, top: 0,
                  width: '50%', overflow: 'hidden', display: 'inline-block'
                }} className="text-[#c8d47a]">★</span>
              </span>
            )}
            {!full && !half && <span className="text-[#333]">★</span>}
          </span>
        );
      })}
    </div>
  );
}

// ── MusicBrainz tracklist fetch ─────────────────────────────────────────
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

    // Score releases — prefer official, prefer year match
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

    // Fetch full release with recordings
    const detailRes = await fetch(
      `https://musicbrainz.org/ws/2/release/${best.id}?inc=recordings&fmt=json`,
      { headers: { 'User-Agent': 'ListeningNotes/1.0 (listeningnotes.blog)' } }
    );
    const detail = await detailRes.json();
    const media = detail.media || [];

    // Flatten all tracks across all discs
    const tracks = [];
    for (const disc of media) {
      for (const t of (disc.tracks || [])) {
        tracks.push({
  number: tracks.length + 1,
  title: t.title || t.recording?.title || 'Unknown',
  duration: t.length ? Math.round(t.length / 1000) : null,
});
      }
    }
    return tracks.length ? tracks : null;
  } catch (err) {
    console.log('Tracklist fetch failed:', err);
    return null;
  }
}

// ── iTunes art fetch ────────────────────────────────────────────────────
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

// ── Format seconds to m:ss ──────────────────────────────────────────────
function fmtDuration(s) {
  if (!s) return '';
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
// ────────────────────────────────────────────────────────────────────────
const LOADING_PHRASES = [
  'Searching the archive...',
  'Pulling press records...',
  'Checking release dates...',
  'Reading liner notes...',
  'Cross-referencing labels...',
  'Scanning chart history...',
  'Digging through the stacks...',
  'Consulting the canon...',
  'Reviewing session logs...',
  'Gathering context...',
];
// ────────────────────────────────────────────────────────────────────────
export default function Session() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState(false);

  // Album / research
  const [albumInput, setAlbumInput] = useState('');
  const [artistInput, setArtistInput] = useState('');
  const [brief, setBrief] = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState('');
  const [loadingFactIndex, setLoadingFactIndex] = useState(0);

  // Art
  const [albumArt, setAlbumArt] = useState('');
  const [artCollapsed, setArtCollapsed] = useState(false);

  // Tracklist
  const [tracks, setTracks] = useState(null); // null = not loaded, [] = not found
  const [tracksLoading, setTracksLoading] = useState(false);
  const [trackNotes, setTrackNotes] = useState({});   // { index: string }
  const [trackRatings, setTrackRatings] = useState({}); // { index: number }

  // Notes / metadata
  const [overallNotes, setOverallNotes] = useState('');
  const [rating, setRating] = useState(0);
  const [Masterpiece, setMasterpiece] = useState(false);
  const [Favorite, setFavorite] = useState(false);
  const [entryType, setEntryType] = useState('');
  const [relationship, setRelationship] = useState('');
  const [horizonBar, setHorizonBar] = useState(true);

  // Output
  const [formatting, setFormatting] = useState(false);
  const [output, setOutput] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [scoreCheckOpen, setScoreCheckOpen] = useState(false);

  // Timer
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem('ln_session_auth');
    if (stored === 'true') setAuthed(true);
  }, []);

  useEffect(() => {
    if (brief && !timerRef.current) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
  }, [brief]);
  
  useEffect(() => {
  if (!briefLoading) return;
  setLoadingFactIndex(0);
  const interval = setInterval(() => {
    setLoadingFactIndex(i => (i + 1) % LOADING_PHRASES.length);
  }, 1800);
  return () => clearInterval(interval);
}, [briefLoading]);

  function formatTime(s) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  function handleAuth() {
    if (pw === PASSWORD) {
      setAuthed(true);
      localStorage.setItem('ln_session_auth', 'true');
    } else {
      setPwError(true);
    }
  }

  // Score Check — average of all rated tracks
  const ratedTracks = Object.values(trackRatings).filter(v => v > 0);
  const scoreCheckAvg = ratedTracks.length
    ? (ratedTracks.reduce((a, b) => a + b, 0) / ratedTracks.length).toFixed(2)
    : null;

  async function doResearch() {
    if (!albumInput.trim()) return;
    setBriefLoading(true);
    setBriefError('');
    setBrief(null);
    setTracks(null);
    setTrackNotes({});
    setTrackRatings({});
    setAlbumArt('');
    setArtCollapsed(false);
    setElapsed(0);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ album: albumInput, artist: artistInput })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBrief(data);

      // Fire art + tracklist in parallel
      fetchAlbumArtUrl(data.album, data.artist, data.year).then(url => {
        if (url) setAlbumArt(url);
      });

      setTracksLoading(true);
      fetchTracklist(data.album, data.artist, data.year).then(t => {
        setTracks(t || []);
        setTracksLoading(false);
      });

    } catch (err) {
      setBriefError(err.message || 'Research failed. Try again.');
    } finally {
      setBriefLoading(false);
    }
  }

  async function doFormat() {
    if (!overallNotes.trim() || !brief) return;
    setFormatting(true);
    try {
      const res = await fetch('/api/format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief, notes: overallNotes, rating, Masterpiece,
          Favorite, entryType, relationship, horizonBar,
          trackNotes, trackRatings,
          tracks: tracks || []
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setOutput(data);
    } catch (err) {
      alert('Formatting failed: ' + err.message);
    } finally {
      setFormatting(false);
    }
  }

  async function doSave() {
    if (!output) return;
    setSaving(true);
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          album: brief.album,
          artist: brief.artist,
          year: brief.year,
          entry_type: entryType || 'Personal Library',
          relationship: relationship || '',
          rating: Masterpiece ? 'Masterpiece' : (rating ? rating + ' stars' : ''),
          Favorite,
          background: output.background,
          notes: output.notes_prose,
          tags: output.tags || [],
          horizon: output.horizon || '',
          album_art: albumArt,
          post_link: ''
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSaved(true);
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  // ── PASSWORD GATE ───────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center p-6">
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-10 w-full max-w-sm flex flex-col gap-6">
          <h1 className="text-2xl" style={{ fontFamily: 'var(--font-serif)' }}>
            listening <em className="text-[#c8d47a]">notes</em>
          </h1>
          <p className="text-xs text-[#555] uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)' }}>session access</p>
          <input
            type="password"
            placeholder="password"
            value={pw}
            onChange={e => { setPw(e.target.value); setPwError(false); }}
            onKeyDown={e => e.key === 'Enter' && handleAuth()}
            className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm outline-none focus:border-[#c8d47a] text-[#e8e4dc]"
            style={{ fontFamily: 'var(--font-mono)' }}
          />
          {pwError && <p className="text-xs text-red-400" style={{ fontFamily: 'var(--font-mono)' }}>incorrect password</p>}
          <button onClick={handleAuth}
            className="bg-[#c8d47a] text-[#0e0e0e] rounded-lg py-3 text-xs uppercase tracking-widest font-medium cursor-pointer"
            style={{ fontFamily: 'var(--font-mono)' }}>
            Enter →
          </button>
        </div>
      </div>
    );
  }

  // ── MAIN SESSION ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0e0e0e] text-[#e8e4dc] flex flex-col">

      {/* Topbar */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-[#2a2a2a] bg-[#161616]">
        <span className="text-lg" style={{ fontFamily: 'var(--font-serif)' }}>
          listening <em className="text-[#c8d47a]">notes</em>
        </span>
        <span className="text-[#2a2a2a]">|</span>
        <span className="text-xs text-[#555] uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)' }}>session</span>
        {brief && (
          <>
            <span className="text-[#2a2a2a]">|</span>
            <span className="text-xs text-[#555]" style={{ fontFamily: 'var(--font-mono)' }}>{formatTime(elapsed)} elapsed</span>
          </>
        )}
        <div className="ml-auto flex gap-3">
          <input value={albumInput} onChange={e => setAlbumInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doResearch()}
            placeholder="Album title..."
            className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs outline-none focus:border-[#c8d47a] text-[#e8e4dc] w-48"
            style={{ fontFamily: 'var(--font-mono)' }} />
          <input value={artistInput} onChange={e => setArtistInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doResearch()}
            placeholder="Artist..."
            className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs outline-none focus:border-[#c8d47a] text-[#e8e4dc] w-36"
            style={{ fontFamily: 'var(--font-mono)' }} />
          <button onClick={doResearch} disabled={briefLoading}
            className="bg-[#c8d47a] text-[#0e0e0e] rounded-lg px-4 py-2 text-xs uppercase tracking-widest font-medium cursor-pointer disabled:opacity-40"
            style={{ fontFamily: 'var(--font-mono)' }}>
            {briefLoading ? '...' : 'Research →'}
          </button>
        </div>
      </div>

      {/* Main panels */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: Brief panel ── */}
        <div className="w-1/2 border-r border-[#2a2a2a] flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-[#2a2a2a] flex items-center justify-between">
            <span className="text-xs text-[#555] uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)' }}>Album Briefing</span>
          </div>

          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">

            {/* Empty state */}
            {!brief && !briefLoading && !briefError && (
              <p className="text-xs text-[#555] text-center mt-20" style={{ fontFamily: 'var(--font-mono)' }}>
                Enter an album above and click Research to pull context before you listen.
              </p>
            )}

            {/* Loading skeleton */}
            {briefLoading && (
  <div className="flex flex-col gap-6 mt-8 px-2">
    <p
      key={loadingFactIndex}
      className="text-xs text-[#555] text-center animate-pulse"
      style={{
        fontFamily: 'var(--font-mono)',
        animation: 'fadeIn 0.4s ease',
      }}>
      {LOADING_PHRASES[loadingFactIndex]}
    </p>
    <div className="flex flex-col gap-3">
      {[100, 70, 100, 50, 100, 80].map((w, i) => (
        <div key={i} className="h-2.5 rounded bg-[#1e1e1e] animate-pulse" style={{ width: `${w}%` }} />
      ))}
    </div>
  </div>
)}

            {briefError && (
              <p className="text-xs text-red-400 mt-4" style={{ fontFamily: 'var(--font-mono)' }}>{briefError}</p>
            )}

            {brief && (
              <>
                {/* Art + metadata side by side */}
<div className="flex gap-4 items-start">
  {albumArt && (
    <img
      src={albumArt}
      alt={brief.album}
      className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
    />
  )}
  <div className="flex flex-col gap-2 min-w-0">
    <h2 className="text-xl leading-tight" style={{ fontFamily: 'var(--font-serif)' }}>{brief.album}</h2>
    <p className="text-xs text-[#c8d47a]" style={{ fontFamily: 'var(--font-mono)' }}>{brief.artist}</p>
    <div className="flex flex-wrap gap-2 mt-1">
      {[brief.year, brief.genre, brief.label, brief.debut ? '⬖ debut' : null].filter(Boolean).map((t, i) => (
        <span key={i} className="text-xs border border-[#2a2a2a] px-2 py-0.5 rounded text-[#9a9590]"
          style={{ fontFamily: 'var(--font-mono)' }}>{t}</span>
      ))}
    </div>
  </div>
</div>

                {/* Briefing sections */}
                {[['Context', brief.context], ['Production', brief.production], ['Reception', brief.reception], ['Listen For', brief.listen_for]].map(([label, val]) => val ? (
                  <div key={label}>
                    <p className="text-xs text-[#555] uppercase tracking-widest mb-2 pb-1 border-b border-[#2a2a2a]" style={{ fontFamily: 'var(--font-mono)' }}>{label}</p>
                    <p className="text-xs leading-relaxed text-[#9a9590]">{val}</p>
                  </div>
                ) : null)}

                {brief.key_facts?.length > 0 && (
                  <div>
                    <p className="text-xs text-[#555] uppercase tracking-widest mb-2 pb-1 border-b border-[#2a2a2a]" style={{ fontFamily: 'var(--font-mono)' }}>Key Facts</p>
                    {brief.key_facts.map((f, i) => (
                      <p key={i} className="text-xs text-[#9a9590] mb-1">— {f}</p>
                    ))}
                  </div>
                )}

                {/* Tracklist */}
                <div>
                  <p className="text-xs text-[#555] uppercase tracking-widest mb-2 pb-1 border-b border-[#2a2a2a]" style={{ fontFamily: 'var(--font-mono)' }}>
                    Tracklist
                    {tracksLoading && <span className="ml-2 opacity-40">loading...</span>}
                  </p>
                  {tracksLoading && (
                    <div className="flex flex-col gap-2">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-2.5 rounded bg-[#1e1e1e] animate-pulse" style={{ width: `${60 + (i % 3) * 15}%` }} />
                      ))}
                    </div>
                  )}
                  {!tracksLoading && tracks && tracks.length === 0 && (
                    <p className="text-xs text-[#555]" style={{ fontFamily: 'var(--font-mono)' }}>Tracklist not found.</p>
                  )}
                  {!tracksLoading && tracks && tracks.length > 0 && (
                    <div className="flex flex-col gap-1">
                      {tracks.map((t, i) => (
                        <div key={i} className="flex items-center justify-between text-xs text-[#9a9590] py-0.5">
                          <span style={{ fontFamily: 'var(--font-mono)' }}>
                            <span className="text-[#555] mr-2">{t.number}.</span>
                            {t.title}
                          </span>
                          {t.duration && (
                            <span className="text-[#444] ml-2 flex-shrink-0" style={{ fontFamily: 'var(--font-mono)' }}>{fmtDuration(t.duration)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT: Notes panel ── */}
        <div className="w-1/2 flex flex-col overflow-hidden">

          {/* Controls bar */}
          <div className="px-5 py-3 border-b border-[#2a2a2a] flex items-center gap-4 flex-wrap">
            <span className="text-xs text-[#555] uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)' }}>Session Notes</span>

            <select value={entryType} onChange={e => setEntryType(e.target.value)}
              className="bg-[#1e1e1e] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#e8e4dc] outline-none ml-auto"
              style={{ fontFamily: 'var(--font-mono)' }}>
              <option value="">— Type</option>
              <option value="Personal Library">Personal Library</option>
              <option value="Submission">Submission</option>
            </select>

            <select value={relationship} onChange={e => setRelationship(e.target.value)}
              className="bg-[#1e1e1e] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-[#e8e4dc] outline-none"
              style={{ fontFamily: 'var(--font-mono)' }}>
              <option value="">— Relationship</option>
              <option>First Listen</option>
              <option>Revisit</option>
              <option>Formative</option>
              <option>Study</option>
              <option>Submission</option>
            </select>
          </div>

          {/* Rating bar */}
          <div className="px-5 py-2 border-b border-[#2a2a2a] flex items-center gap-5 flex-wrap">
            <StarRating value={rating} onChange={setRating} />
            <label className="flex items-center gap-2 text-xs text-[#9a9590] cursor-pointer" style={{ fontFamily: 'var(--font-mono)' }}>
              <input type="checkbox" checked={Masterpiece} onChange={e => setMasterpiece(e.target.checked)} className="accent-[#c8d47a]" />
              Masterpiece
            </label>
            <label className="flex items-center gap-2 text-xs text-[#9a9590] cursor-pointer" style={{ fontFamily: 'var(--font-mono)' }}>
              <input type="checkbox" checked={Favorite} onChange={e => setFavorite(e.target.checked)} className="accent-[#c8d47a]" />
              Favorite
            </label>
            <label className="flex items-center gap-2 text-xs text-[#9a9590] cursor-pointer" style={{ fontFamily: 'var(--font-mono)' }}>
              <input type="checkbox" checked={horizonBar} onChange={e => setHorizonBar(e.target.checked)} className="accent-[#c8d47a]" />
              horizon bar
            </label>
            {ratedTracks.length > 0 && (
  <div className="ml-auto flex items-center gap-2">
    <button
      onClick={() => setScoreCheckOpen(c => !c)}
      className="text-xs text-[#555] hover:text-[#c8d47a] transition-colors uppercase tracking-widest cursor-pointer"
      style={{ fontFamily: 'var(--font-mono)' }}>
      {scoreCheckOpen ? '▼' : '▶'} score check
    </button>
    {scoreCheckOpen && (
      <span className="text-xs text-[#c8d47a]" style={{ fontFamily: 'var(--font-mono)' }}>
        <strong>{scoreCheckAvg}</strong> / 5
      </span>
    )}
  </div>
)}
          </div>

          {/* Scrollable notes area */}
          <div className="flex-1 overflow-y-auto flex flex-col">

            {/* Overall album notes */}
            <div className="border-b border-[#2a2a2a]">
              <div className="px-5 pt-4 pb-1">
                <p className="text-xs text-[#555] uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)' }}>Overall Notes</p>
              </div>
              <textarea
                value={overallNotes}
                onChange={e => setOverallNotes(e.target.value)}
                placeholder="How does this album feel as a whole? Themes, impressions, context..."
                className="w-full bg-transparent outline-none resize-none px-5 py-3 text-xs leading-relaxed text-[#e8e4dc] placeholder-[#555] min-h-[100px]"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            {/* Per-track notes */}
            {tracks && tracks.length > 0 && (
              <div className="flex flex-col">
                <div className="px-5 pt-4 pb-2 border-b border-[#1a1a1a]">
                  <p className="text-xs text-[#555] uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)' }}>Track Notes</p>
                </div>
                {tracks.map((t, i) => (
                  <div key={i} className="border-b border-[#1a1a1a] px-5 py-3 flex flex-col gap-2">
                    {/* Track header */}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-[#e8e4dc] flex-1 min-w-0 truncate" style={{ fontFamily: 'var(--font-mono)' }}>
                        <span className="text-[#444] mr-1">{t.number}.</span>
                        {t.title}
                        {t.duration && <span className="text-[#444] ml-2">{fmtDuration(t.duration)}</span>}
                      </span>
                      <span className="flex-shrink-0">
                        <StarRating
                          value={trackRatings[i] || 0}
                          onChange={v => setTrackRatings(prev => ({ ...prev, [i]: v }))}
                          small
                        />
                      </span>
                    </div>
                    {/* Track notes input */}
                    <input
                      value={trackNotes[i] || ''}
                      onChange={e => setTrackNotes(prev => ({ ...prev, [i]: e.target.value }))}
                      placeholder="notes..."
                      className="bg-transparent border-b border-[#2a2a2a] outline-none text-xs text-[#9a9590] placeholder-[#444] py-1 w-full focus:border-[#555] transition-colors"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Tracklist loading state in notes panel */}
            {tracksLoading && (
              <div className="px-5 py-4 flex flex-col gap-3">
                <p className="text-xs text-[#555] uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)' }}>Track Notes</p>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-8 rounded bg-[#1e1e1e] animate-pulse" />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-[#2a2a2a] flex items-center justify-between">
            <span className="text-xs text-[#555]" style={{ fontFamily: 'var(--font-mono)' }}>{overallNotes.length} chars</span>
            <button
              onClick={doFormat}
              disabled={!brief || overallNotes.trim().length < 10 || formatting}
              className="bg-[#e8e4dc] text-[#0e0e0e] rounded-lg px-6 py-2 text-xs uppercase tracking-widest font-medium cursor-pointer disabled:opacity-30"
              style={{ fontFamily: 'var(--font-mono)' }}>
              {formatting ? 'Formatting…' : 'Format & Done →'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Output modal ── */}
      {output && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6">
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
              <h2 className="text-lg" style={{ fontFamily: 'var(--font-serif)' }}>Session Output</h2>
              <div className="flex gap-3">
                {!saved ? (
                  <button onClick={doSave} disabled={saving}
                    className="bg-[#c8d47a] text-[#0e0e0e] rounded-lg px-5 py-2 text-xs uppercase tracking-widest font-medium cursor-pointer disabled:opacity-40"
                    style={{ fontFamily: 'var(--font-mono)' }}>
                    {saving ? 'Saving…' : 'Save to Site →'}
                  </button>
                ) : (
                  <span className="text-xs text-[#c8d47a] px-5 py-2" style={{ fontFamily: 'var(--font-mono)' }}>✓ saved</span>
                )}
                <button onClick={() => setOutput(null)}
                  className="bg-[#2a2a2a] text-[#e8e4dc] rounded-lg px-4 py-2 text-xs cursor-pointer"
                  style={{ fontFamily: 'var(--font-mono)' }}>close</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              <div>
                <p className="text-xs text-[#555] uppercase tracking-widest mb-2" style={{ fontFamily: 'var(--font-mono)' }}>Background</p>
                <p className="text-xs leading-relaxed text-[#9a9590]">{output.background}</p>
              </div>
              {output.horizon && (
                <p className="text-center text-[#555] tracking-widest text-xs" style={{ fontFamily: 'var(--font-mono)' }}>{output.horizon}</p>
              )}
              <div>
                <p className="text-xs text-[#555] uppercase tracking-widest mb-2" style={{ fontFamily: 'var(--font-mono)' }}>Notes</p>
                <p className="text-xs leading-relaxed">{output.notes_prose}</p>
              </div>
              <div>
                <p className="text-xs text-[#555] uppercase tracking-widest mb-2" style={{ fontFamily: 'var(--font-mono)' }}>Tags</p>
                <div className="flex flex-wrap gap-2">
                  {(output.tags || []).map((t, i) => (
                    <span key={i} className="text-xs text-[#555] border border-[#2a2a2a] px-2 py-0.5 rounded" style={{ fontFamily: 'var(--font-mono)' }}>#{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}