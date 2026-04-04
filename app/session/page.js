'use client';

import { useState, useEffect, useRef } from 'react';

const PASSWORD = 'listeningnotes';

const C = {
  bg:      '#0e0e0e',
  bg2:     '#161616',
  surface: '#1c1c1c',
  border:  '#2a2a2a',
  border2: '#1e1e1e',
  text:    '#e8e4dc',
  muted:   '#555',
  muted2:  '#9a9590',
  accent:  '#c8d47a',
  gold:    '#E8B84B',
};

const FONT  = "'DM Sans', system-ui, sans-serif";
const MONO  = "'DM Mono', 'Courier New', monospace";
const SERIF = "'DM Serif Display', Georgia, serif";

const label = (extra = {}) => ({
  fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em',
  textTransform: 'uppercase', color: '#555', ...extra,
});

function StarRating({ value, onChange, size = 18 }) {
  const [hover, setHover] = useState(null);
  const display = hover ?? value;
  return (
    <div style={{ display: 'flex', gap: 2 }} onMouseLeave={() => setHover(null)}>
      {[1,2,3,4,5].map(n => {
        const filled = n <= display;
        const half = !filled && display >= n - 0.5 && display < n;
        return (
          <span key={n} style={{ position: 'relative', width: size * 1.2, height: size, display: 'inline-block', cursor: 'pointer' }}>
            <span style={{ position: 'absolute', inset: 0, width: '50%', zIndex: 10 }}
              onMouseEnter={() => setHover(n - 0.5)}
              onClick={() => onChange(value === n - 0.5 ? 0 : n - 0.5)} />
            <span style={{ position: 'absolute', inset: 0, left: '50%', width: '50%', zIndex: 10 }}
              onMouseEnter={() => setHover(n)}
              onClick={() => onChange(value === n ? 0 : n)} />
            {filled && <span style={{ color: '#E8B84B', fontSize: size }}>★</span>}
            {half && (
              <span style={{ position: 'relative', display: 'inline-block' }}>
                <span style={{ color: '#2a2a2a', fontSize: size }}>★</span>
                <span style={{ position: 'absolute', left: 0, top: 0, width: '50%', overflow: 'hidden', display: 'inline-block', color: '#E8B84B', fontSize: size }}>★</span>
              </span>
            )}
            {!filled && !half && <span style={{ color: '#2a2a2a', fontSize: size }}>★</span>}
          </span>
        );
      })}
    </div>
  );
}

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

export default function Session() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState(false);

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
  const [horizonBar, setHorizonBar] = useState(true);

  const [formatting, setFormatting] = useState(false);
  const [output, setOutput] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [scoreCheckOpen, setScoreCheckOpen] = useState(false);

  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const notesRef = useRef(null);

  useEffect(() => {
    if (localStorage.getItem('ln_session_auth') === 'true') setAuthed(true);
  }, []);

  useEffect(() => {
    if (brief && !timerRef.current) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
  }, [brief]);

  useEffect(() => {
    if (!briefLoading) return;
    setLoadingFactIndex(0);
    const interval = setInterval(() => setLoadingFactIndex(i => (i + 1) % LOADING_PHRASES.length), 1800);
    return () => clearInterval(interval);
  }, [briefLoading]);

  useEffect(() => {
    if (notesRef.current) {
      notesRef.current.style.height = 'auto';
      notesRef.current.style.height = Math.max(120, notesRef.current.scrollHeight) + 'px';
    }
  }, [overallNotes]);

  function handleAuth() {
    if (pw === PASSWORD) { setAuthed(true); localStorage.setItem('ln_session_auth', 'true'); }
    else setPwError(true);
  }

  const ratedTracks = Object.values(trackRatings).filter(v => v > 0);
  const scoreCheckAvg = ratedTracks.length
    ? (ratedTracks.reduce((a, b) => a + b, 0) / ratedTracks.length).toFixed(2) : null;

  async function doResearch() {
    if (!albumInput.trim()) return;
    setBriefLoading(true); setBriefError(''); setBrief(null);
    setTracks(null); setTrackNotes({}); setTrackRatings({});
    setAlbumArt(''); setElapsed(0); setOverallNotes('');
    setRating(0); setMasterpiece(false); setFavorite(false);
    setSaved(false); setOutput(null);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    try {
      const res = await fetch('/api/research', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ album: albumInput, artist: artistInput })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBrief(data);
      fetchAlbumArtUrl(data.album, data.artist, data.year).then(url => { if (url) setAlbumArt(url); });
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
        body: JSON.stringify({ brief, notes: overallNotes, rating, Masterpiece, Favorite, entryType, relationship, horizonBar, trackNotes, trackRatings, tracks: tracks || [] })
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
    } catch (err) { alert('Save failed: ' + err.message); }
    finally { setSaving(false); }
  }

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: '#0e0e0e', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: FONT }}>
        <div style={{ background: '#161616', border: '1px solid #2a2a2a', borderRadius: 16, padding: 40, width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ fontFamily: SERIF, fontSize: 22, color: '#e8e4dc' }}>listening notes</div>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#555', marginTop: 4 }}>session access</div>
          </div>
          <input type="password" placeholder="password" value={pw}
            onChange={e => { setPw(e.target.value); setPwError(false); }}
            onKeyDown={e => e.key === 'Enter' && handleAuth()}
            style={{ background: '#1c1c1c', border: `1px solid ${pwError ? '#ef4444' : '#2a2a2a'}`, borderRadius: 8, padding: '12px 16px', fontFamily: MONO, fontSize: 13, color: '#e8e4dc', outline: 'none' }}
          />
          {pwError && <div style={{ fontFamily: MONO, fontSize: 11, color: '#ef4444' }}>incorrect password</div>}
          <button onClick={handleAuth}
            style={{ background: '#c8d47a', color: '#0e0e0e', borderRadius: 8, padding: '12px 0', fontFamily: MONO, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', border: 'none', fontWeight: 500 }}>
            Enter →
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes sn-fade { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
        @keyframes sn-pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
        .sn-skel { background:#1c1c1c; border-radius:3px; animation:sn-pulse 1.6s ease-in-out infinite; }
        .sn-row:hover { background:rgba(255,255,255,0.02); }
        .sn-topbar-input { background:#1c1c1c; border:1px solid #2a2a2a; border-radius:8px; padding:8px 14px; font-family:'DM Mono','Courier New',monospace; font-size:12px; color:#e8e4dc; outline:none; transition:border-color 0.15s; }
        .sn-topbar-input:focus { border-color:#c8d47a; }
        .sn-topbar-input::placeholder { color:#555; }
        .sn-select { background:#1c1c1c; border:1px solid #2a2a2a; border-radius:6px; padding:7px 10px; font-family:'DM Mono','Courier New',monospace; font-size:11px; letter-spacing:0.06em; color:#9a9590; outline:none; cursor:pointer; }
        .sn-select:focus { border-color:#555; }
        .sn-check { accent-color:#c8d47a; cursor:pointer; width:13px; height:13px; }
        .sn-textarea { font-family:'DM Mono','Courier New',monospace; font-size:12px; line-height:1.9; color:#e8e4dc; background:transparent; border:none; outline:none; resize:none; width:100%; min-height:120px; }
        .sn-textarea::placeholder { color:#555; }
        .sn-track-input { font-family:'DM Mono','Courier New',monospace; font-size:11px; color:#9a9590; background:transparent; border:none; border-bottom:1px solid #1e1e1e; outline:none; width:100%; padding:5px 0; transition:border-color 0.15s; }
        .sn-track-input:focus { border-color:#555; color:#e8e4dc; }
        .sn-track-input::placeholder { color:#555; opacity:0.5; }
        .sn-btn { transition:opacity 0.15s, transform 0.1s; }
        .sn-btn:hover:not(:disabled) { opacity:0.85; transform:translateY(-1px); }
        .sn-btn:disabled { opacity:0.3; cursor:not-allowed; }
        ::-webkit-scrollbar { width:4px; background:transparent; }
        ::-webkit-scrollbar-thumb { background:#2a2a2a; border-radius:99px; }
      `}</style>

      <div style={{ minHeight:'100vh', background:'#0e0e0e', color:'#e8e4dc', display:'flex', flexDirection:'column', fontFamily:FONT }}>

        {/* Topbar */}
        <div style={{ display:'flex', alignItems:'center', gap:16, padding:'14px 24px', borderBottom:'1px solid #2a2a2a', background:'#161616', flexShrink:0 }}>
          <span style={{ fontFamily:SERIF, fontSize:18, color:'#e8e4dc', flexShrink:0 }}>listening notes</span>
          <span style={{ color:'#2a2a2a' }}>·</span>
          <span style={{ fontFamily:MONO, fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'#555' }}>session</span>
          {brief && (<>
            <span style={{ color:'#2a2a2a' }}>·</span>
            <span style={{ fontFamily:MONO, fontSize:11, color:'#555' }}>{fmtTime(elapsed)}</span>
          </>)}
          <div style={{ marginLeft:'auto', display:'flex', gap:10, alignItems:'center' }}>
            <input value={albumInput} onChange={e => setAlbumInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doResearch()}
              placeholder="Album title..." className="sn-topbar-input" style={{ width:180 }} />
            <input value={artistInput} onChange={e => setArtistInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doResearch()}
              placeholder="Artist..." className="sn-topbar-input" style={{ width:140 }} />
            <button onClick={doResearch} disabled={briefLoading || !albumInput.trim()} className="sn-btn"
              style={{ background:'#c8d47a', color:'#0e0e0e', borderRadius:8, padding:'8px 18px', fontFamily:MONO, fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', border:'none', cursor:'pointer', fontWeight:500, flexShrink:0 }}>
              {briefLoading ? '···' : 'Research →'}
            </button>
          </div>
        </div>

        {/* Two panels */}
        <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

          {/* LEFT: Brief */}
          <div style={{ width:'50%', borderRight:'1px solid #2a2a2a', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ padding:'10px 20px', borderBottom:'1px solid #2a2a2a', flexShrink:0 }}>
              <span style={{ fontFamily:MONO, fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'#555' }}>Album Briefing</span>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:20, display:'flex', flexDirection:'column', gap:20 }}>

              {!brief && !briefLoading && !briefError && (
                <div style={{ textAlign:'center', paddingTop:80, fontFamily:MONO, fontSize:11, color:'#555', lineHeight:2 }}>
                  Enter an album above<br/>and click Research.
                </div>
              )}

              {briefLoading && (
                <div style={{ display:'flex', flexDirection:'column', gap:20, paddingTop:40 }}>
                  <div key={loadingFactIndex} style={{ fontFamily:MONO, fontSize:11, color:'#555', textAlign:'center', animation:'sn-fade 0.4s ease forwards' }}>
                    {LOADING_PHRASES[loadingFactIndex]}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {[80,60,90,45,80,65].map((w,i) => (
                      <div key={i} className="sn-skel" style={{ height:9, width:w+'%', animationDelay:i*0.1+'s' }} />
                    ))}
                  </div>
                </div>
              )}

              {briefError && <div style={{ fontFamily:MONO, fontSize:11, color:'#ef4444', paddingTop:20 }}>{briefError}</div>}

              {brief && (<>
                {/* Art + meta */}
                <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
                  {albumArt
                    ? <img src={albumArt} alt={brief.album} style={{ width:88, height:88, borderRadius:8, objectFit:'cover', flexShrink:0, boxShadow:'0 8px 24px rgba(0,0,0,0.5)' }} />
                    : <div style={{ width:88, height:88, borderRadius:8, background:'#1c1c1c', flexShrink:0, border:'1px solid #2a2a2a' }} />
                  }
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontFamily:SERIF, fontSize:20, color:'#e8e4dc', lineHeight:1.1, marginBottom:4 }}>{brief.album}</div>
                    <div style={{ fontFamily:MONO, fontSize:11, color:'#c8d47a', marginBottom:10 }}>{brief.artist}</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      {[brief.year, brief.genre, brief.label, brief.debut ? '⬖ debut' : null].filter(Boolean).map((t,i) => (
                        <span key={i} style={{ fontFamily:MONO, fontSize:10, color:'#9a9590', border:'1px solid #2a2a2a', padding:'2px 8px', borderRadius:4 }}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {[['Context',brief.context],['Production',brief.production],['Reception',brief.reception],['Listen For',brief.listen_for]].map(([l,val]) => val ? (
                  <div key={l}>
                    <div style={{ fontFamily:MONO, fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'#555', marginBottom:8, paddingBottom:6, borderBottom:'1px solid #2a2a2a' }}>{l}</div>
                    <div style={{ fontSize:12, lineHeight:1.75, color:'#9a9590' }}>{val}</div>
                  </div>
                ) : null)}

                {brief.key_facts?.length > 0 && (
                  <div>
                    <div style={{ fontFamily:MONO, fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'#555', marginBottom:8, paddingBottom:6, borderBottom:'1px solid #2a2a2a' }}>Key Facts</div>
                    {brief.key_facts.map((f,i) => (
                      <div key={i} style={{ fontSize:12, color:'#9a9590', marginBottom:6 }}>— {f}</div>
                    ))}
                  </div>
                )}

                <div>
                  <div style={{ fontFamily:MONO, fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'#555', marginBottom:8, paddingBottom:6, borderBottom:'1px solid #2a2a2a' }}>
                    Tracklist {tracksLoading && <span style={{ opacity:0.4 }}>· loading...</span>}
                  </div>
                  {tracksLoading && (
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {[...Array(8)].map((_,i) => <div key={i} className="sn-skel" style={{ height:9, width:(55+(i%3)*15)+'%' }} />)}
                    </div>
                  )}
                  {!tracksLoading && tracks?.length === 0 && (
                    <div style={{ fontFamily:MONO, fontSize:11, color:'#555' }}>Tracklist not found.</div>
                  )}
                  {!tracksLoading && tracks?.length > 0 && (
                    <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                      {tracks.map((t,i) => (
                        <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'3px 0', fontFamily:MONO, fontSize:11, color:'#9a9590' }}>
                          <span><span style={{ color:'#555', marginRight:8 }}>{t.number}.</span>{t.title}</span>
                          {t.duration && <span style={{ color:'#2a2a2a', flexShrink:0, marginLeft:8 }}>{fmtDuration(t.duration)}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>)}
            </div>
          </div>

          {/* RIGHT: Notes */}
          <div style={{ width:'50%', display:'flex', flexDirection:'column', overflow:'hidden' }}>

            {/* Controls */}
            <div style={{ padding:'10px 20px', borderBottom:'1px solid #2a2a2a', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', flexShrink:0 }}>
              <span style={{ fontFamily:MONO, fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'#555' }}>Session Notes</span>
              <select value={entryType} onChange={e => setEntryType(e.target.value)} className="sn-select" style={{ marginLeft:'auto' }}>
                <option value="">— Type</option>
                <option value="Personal Library">Personal Library</option>
                <option value="Submission">Submission</option>
              </select>
              <select value={relationship} onChange={e => setRelationship(e.target.value)} className="sn-select">
                <option value="">— Relationship</option>
                <option>First Listen</option>
                <option>Revisit</option>
                <option>Formative</option>
                <option>Study</option>
                <option>Submission</option>
              </select>
            </div>

            {/* Rating row */}
            <div style={{ padding:'10px 20px', borderBottom:'1px solid #2a2a2a', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap', flexShrink:0 }}>
              <StarRating value={rating} onChange={setRating} size={18} />
              {[['Masterpiece',Masterpiece,setMasterpiece],['Favorite',Favorite,setFavorite],['Horizon',horizonBar,setHorizonBar]].map(([lbl,val,fn]) => (
                <label key={lbl} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
                  <input type="checkbox" checked={val} onChange={e => fn(e.target.checked)} className="sn-check" />
                  <span style={{ fontFamily:MONO, fontSize:10, letterSpacing:'0.08em', color:val ? '#9a9590' : '#555' }}>{lbl}</span>
                </label>
              ))}
              {ratedTracks.length > 0 && (
                <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
                  <button onClick={() => setScoreCheckOpen(c => !c)}
                    style={{ fontFamily:MONO, fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', color:'#555', background:'none', border:'none', cursor:'pointer' }}>
                    {scoreCheckOpen ? '▼' : '▶'} score check
                  </button>
                  {scoreCheckOpen && <span style={{ fontFamily:MONO, fontSize:11, color:'#c8d47a' }}>{scoreCheckAvg} / 5</span>}
                </div>
              )}
            </div>

            {/* Scrollable notes */}
            <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column' }}>
              <div style={{ borderBottom:'1px solid #2a2a2a' }}>
                <div style={{ padding:'12px 20px 4px', fontFamily:MONO, fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'#555' }}>Overall Notes</div>
                <textarea ref={notesRef} value={overallNotes} onChange={e => setOverallNotes(e.target.value)}
                  placeholder="How does this album feel as a whole? Themes, impressions, context..."
                  className="sn-textarea" style={{ padding:'8px 20px 16px' }} />
              </div>

              {tracks && tracks.length > 0 && (
                <div>
                  <div style={{ padding:'12px 20px 8px', borderBottom:'1px solid #1e1e1e', fontFamily:MONO, fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'#555' }}>Track Notes</div>
                  {tracks.map((t,i) => (
                    <div key={i} className="sn-row" style={{ padding:'10px 20px', borderBottom:'1px solid #1e1e1e', display:'flex', flexDirection:'column', gap:6, transition:'background 0.1s' }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                        <span style={{ fontFamily:MONO, fontSize:11, color:'#9a9590', minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          <span style={{ color:'#555', marginRight:6 }}>{t.number}.</span>
                          {t.title}
                          {t.duration && <span style={{ color:'#2a2a2a', marginLeft:8 }}>{fmtDuration(t.duration)}</span>}
                        </span>
                        <div style={{ flexShrink:0 }}>
                          <StarRating value={trackRatings[i] || 0} onChange={v => setTrackRatings(prev => ({ ...prev, [i]: v }))} size={13} />
                        </div>
                      </div>
                      <input value={trackNotes[i] || ''} onChange={e => setTrackNotes(prev => ({ ...prev, [i]: e.target.value }))}
                        placeholder="notes..." className="sn-track-input" />
                    </div>
                  ))}
                </div>
              )}

              {tracksLoading && (
                <div style={{ padding:'12px 20px', display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ fontFamily:MONO, fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'#555' }}>Track Notes</div>
                  {[...Array(6)].map((_,i) => <div key={i} className="sn-skel" style={{ height:32 }} />)}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding:'12px 20px', borderTop:'1px solid #2a2a2a', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <span style={{ fontFamily:MONO, fontSize:10, color:'#555' }}>{overallNotes.length} chars</span>
              <button onClick={doFormat} disabled={!brief || overallNotes.trim().length < 10 || formatting} className="sn-btn"
                style={{ background:'#e8e4dc', color:'#0e0e0e', borderRadius:8, padding:'9px 22px', fontFamily:MONO, fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', border:'none', cursor:'pointer', fontWeight:500 }}>
                {formatting ? 'Formatting…' : 'Format & Done →'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {output && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:24 }}>
          <div style={{ background:'#161616', border:'1px solid #2a2a2a', borderRadius:16, width:'100%', maxWidth:680, maxHeight:'85vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 24px', borderBottom:'1px solid #2a2a2a' }}>
              <span style={{ fontFamily:SERIF, fontSize:18, color:'#e8e4dc' }}>Session Output</span>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                {!saved
                  ? <button onClick={doSave} disabled={saving} className="sn-btn"
                      style={{ background:'#c8d47a', color:'#0e0e0e', borderRadius:8, padding:'8px 18px', fontFamily:MONO, fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', border:'none', cursor:'pointer', fontWeight:500 }}>
                      {saving ? 'Saving…' : 'Save to Site →'}
                    </button>
                  : <span style={{ fontFamily:MONO, fontSize:11, color:'#c8d47a' }}>✓ saved</span>
                }
                <button onClick={() => setOutput(null)}
                  style={{ background:'#1c1c1c', color:'#9a9590', borderRadius:8, padding:'8px 14px', fontFamily:MONO, fontSize:11, border:'1px solid #2a2a2a', cursor:'pointer' }}>
                  close
                </button>
              </div>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:24, display:'flex', flexDirection:'column', gap:20 }}>
              <div>
                <div style={{ fontFamily:MONO, fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'#555', marginBottom:8 }}>Background</div>
                <div style={{ fontSize:13, lineHeight:1.85, color:'#9a9590' }}>{output.background}</div>
              </div>
              {output.horizon && (
                <div style={{ textAlign:'center', fontFamily:MONO, fontSize:14, color:'#555', letterSpacing:'0.06em' }}>{output.horizon}</div>
              )}
              <div>
                <div style={{ fontFamily:MONO, fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'#555', marginBottom:8 }}>Notes</div>
                <div style={{ fontSize:13, lineHeight:1.85, color:'#e8e4dc' }}>{output.notes_prose}</div>
              </div>
              <div>
                <div style={{ fontFamily:MONO, fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'#555', marginBottom:8 }}>Tags</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {(output.tags || []).map((t,i) => (
                    <span key={i} style={{ fontFamily:MONO, fontSize:10, color:'#555', border:'1px solid #2a2a2a', padding:'3px 8px', borderRadius:4 }}>#{t}</span>
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
