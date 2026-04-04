'use client';

import { useState, useEffect, useRef } from 'react';

const PASSWORD = 'listeningnotes';
const MONO  = "'DM Mono', 'Courier New', monospace";
const SERIF = "'DM Serif Display', Georgia, serif";
const SANS  = "'DM Sans', system-ui, sans-serif";

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

  useEffect(() => {
    if (!briefLoading) return;
    setLoadingFactIndex(0);
    const interval = setInterval(() => setLoadingFactIndex(i => (i + 1) % LOADING_PHRASES.length), 1800);
    return () => clearInterval(interval);
  }, [briefLoading]);

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
    } catch (err) { alert('Save failed: ' + err.message); }
    finally { setSaving(false); }
  }

  const border = '1px solid #e0dcd5';
  const labelStyle = { fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7a776f' };

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f3ef', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: SANS }}>
        <div style={{ background: '#fff', border: '1px solid #e0dcd5', borderRadius: 20, padding: 48, width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 4px 32px rgba(0,0,0,0.08)' }}>
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 900, color: '#1a1916', letterSpacing: '-0.02em' }}>Listening Notes</div>
            <div style={{ ...labelStyle, marginTop: 4 }}>session access</div>
          </div>
          <input type="password" placeholder="password" value={pw}
            onChange={e => { setPw(e.target.value); setPwError(false); }}
            onKeyDown={e => e.key === 'Enter' && handleAuth()}
            style={{ background: '#fff', border: `1px solid ${pwError ? '#ef4444' : '#e0dcd5'}`, borderRadius: 8, padding: '12px 16px', fontFamily: MONO, fontSize: 13, color: '#1a1916', outline: 'none' }}
          />
          {pwError && <div style={{ fontFamily: MONO, fontSize: 11, color: '#ef4444' }}>incorrect password</div>}
          <button onClick={handleAuth}
            style={{ background: '#c8d47a', color: '#1a1916', borderRadius: 8, padding: '12px 0', fontFamily: MONO, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', border: 'none', fontWeight: 600 }}>
            Enter →
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes sn-pulse { 0%,100%{opacity:0.5}50%{opacity:1} }
        @keyframes sn-fade { from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)} }
        .sn-skel { background:#ece9e3; border-radius:3px; animation:sn-pulse 1.6s ease-in-out infinite; }
        .sn-ti { background:#fff; border:1px solid #e0dcd5; border-radius:8px; padding:8px 14px; font-family:'DM Mono',monospace; font-size:12px; color:#1a1916; outline:none; }
        .sn-ti:focus { border-color:#c8d47a; }
        .sn-ti::placeholder { color:#aaa8a2; }
        .sn-sel { background:#fff; border:1px solid #e0dcd5; border-radius:6px; padding:7px 10px; font-family:'DM Mono',monospace; font-size:11px; color:#7a776f; outline:none; cursor:pointer; }
        .sn-check { accent-color:#c8d47a; cursor:pointer; }
        .sn-row:hover { background:rgba(0,0,0,0.015); }
        .sn-btn { transition:opacity 0.15s,transform 0.1s; }
        .sn-btn:hover:not(:disabled) { opacity:0.8; transform:translateY(-1px); }
        .sn-btn:disabled { opacity:0.3; cursor:not-allowed; }
        .sn-track-input { font-family:'DM Mono',monospace; font-size:11px; color:#5a5750; background:transparent; border:none; border-bottom:1px solid #e8e5df; outline:none; width:100%; padding:5px 0; }
        .sn-track-input:focus { border-color:#c8d47a; }
        .sn-track-input::placeholder { color:#c0bdb7; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:#e0dcd5; border-radius:99px; }
      `}</style>

      {albumArt && <div style={{ position:'fixed', inset:0, zIndex:0, backgroundImage:`url(${albumArt})`, backgroundSize:'cover', backgroundPosition:'center', filter:'blur(80px) saturate(1.2) brightness(1.1)', transform:'scale(1.15)', opacity:0.22, transition:'opacity 1s', pointerEvents:'none' }} />}
      <div style={{ position:'fixed', inset:0, zIndex:0, background:'rgba(245,243,239,0.88)', pointerEvents:'none' }} />

      <div style={{ minHeight:'100vh', color:'#1a1916', display:'flex', flexDirection:'column', fontFamily:SANS, position:'relative', zIndex:1 }}>

        <div style={{ display:'flex', alignItems:'center', gap:16, padding:'14px 28px', borderBottom:border, background:'rgba(255,255,255,0.75)', backdropFilter:'blur(12px)', flexShrink:0 }}>
          <span style={{ fontFamily:'Fraunces, serif', fontSize:18, fontWeight:900, color:'#1a1916', letterSpacing:'-0.02em', flexShrink:0 }}>Listening Notes</span>
          <span style={{ color:'#d0ccc5' }}>·</span>
          <span style={{ fontFamily:MONO, fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'#7a776f' }}>session</span>
          {brief && <><span style={{ color:'#d0ccc5' }}>·</span><span style={{ fontFamily:MONO, fontSize:11, color:'#aaa8a2' }}>{fmtTime(elapsed)}</span></>}
          <div style={{ marginLeft:'auto', display:'flex', gap:10, alignItems:'center' }}>
            <input value={albumInput} onChange={e => setAlbumInput(e.target.value)} onKeyDown={e => e.key==='Enter' && doResearch()} placeholder="Album title..." className="sn-ti" style={{ width:190 }} />
            <input value={artistInput} onChange={e => setArtistInput(e.target.value)} onKeyDown={e => e.key==='Enter' && doResearch()} placeholder="Artist..." className="sn-ti" style={{ width:150 }} />
            <button onClick={doResearch} disabled={briefLoading || !albumInput.trim()} className="sn-btn"
              style={{ background:'#c8d47a', color:'#1a1916', borderRadius:8, padding:'8px 20px', fontFamily:MONO, fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', border:'none', cursor:'pointer', fontWeight:600, flexShrink:0 }}>
              {briefLoading ? '···' : 'Research →'}
            </button>
          </div>
        </div>

        <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

          <div style={{ width:'50%', borderRight:border, display:'flex', flexDirection:'column', overflow:'hidden', background:'rgba(255,255,255,0.5)', backdropFilter:'blur(8px)' }}>
            <div style={{ padding:'10px 22px', borderBottom:border, flexShrink:0 }}>
              <span style={labelStyle}>Album Briefing</span>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'20px 22px', display:'flex', flexDirection:'column', gap:20 }}>

              {!brief && !briefLoading && !briefError && (
                <div style={{ textAlign:'center', paddingTop:80, fontFamily:MONO, fontSize:11, color:'#aaa8a2', lineHeight:2 }}>
                  Enter an album above<br/>and click Research.
                </div>
              )}

              {briefLoading && (
                <div style={{ display:'flex', flexDirection:'column', gap:20, paddingTop:40 }}>
                  <div key={loadingFactIndex} style={{ fontFamily:MONO, fontSize:11, color:'#aaa8a2', textAlign:'center', animation:'sn-fade 0.4s ease' }}>
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
                    <div style={{ fontFamily:SERIF, fontSize:22, color:'#1a1916', lineHeight:1.1, marginBottom:5 }}>{brief.album}</div>
                    <div style={{ fontFamily:MONO, fontSize:11, color:'#c8d47a', marginBottom:10 }}>{brief.artist}</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      {[brief.year, brief.genre, brief.label, brief.debut ? '⬖ debut' : null].filter(Boolean).map((t,i) => (
                        <span key={i} style={{ fontFamily:MONO, fontSize:10, color:'#7a776f', border:'1px solid #e0dcd5', padding:'2px 8px', borderRadius:4, background:'#fff' }}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {[['Context',brief.context],['Production',brief.production],['Reception',brief.reception],['Listen For',brief.listen_for]].map(([l,val]) => val ? (
                  <div key={l}>
                    <div style={{ ...labelStyle, marginBottom:8, paddingBottom:6, borderBottom:'1px solid #e8e5df' }}>{l}</div>
                    <div style={{ fontSize:12.5, lineHeight:1.78, color:'#5a5750' }}>{val}</div>
                  </div>
                ) : null)}

                {brief.key_facts?.length > 0 && (
                  <div>
                    <div style={{ ...labelStyle, marginBottom:8, paddingBottom:6, borderBottom:'1px solid #e8e5df' }}>Key Facts</div>
                    {brief.key_facts.map((f,i) => <div key={i} style={{ fontSize:12.5, color:'#5a5750', marginBottom:6 }}>— {f}</div>)}
                  </div>
                )}
              </>)}
            </div>
          </div>

          <div style={{ width:'50%', display:'flex', flexDirection:'column', background:'rgba(255,255,255,0.6)', backdropFilter:'blur(8px)' }}>

            <div style={{ padding:'10px 22px', borderBottom:border, display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
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

            <div style={{ padding:'10px 22px', borderBottom:border, display:'flex', alignItems:'center', gap:16, flexShrink:0 }}>
              <StarRating value={rating} onChange={setRating} size={20} />
              <div style={{ width:1, height:18, background:'#e0dcd5' }} />
              {[['Masterpiece',Masterpiece,setMasterpiece],['Favorite',Favorite,setFavorite]].map(([lbl,val,fn]) => (
                <label key={lbl} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
                  <input type="checkbox" checked={val} onChange={e => fn(e.target.checked)} className="sn-check" />
                  <span style={{ fontFamily:MONO, fontSize:10, color:val ? '#1a1916' : '#aaa8a2' }}>{lbl}</span>
                </label>
              ))}
              {ratedTracks.length > 0 && (
                <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
                  <button onClick={() => setScoreCheckOpen(c => !c)} style={{ fontFamily:MONO, fontSize:10, textTransform:'uppercase', color:'#aaa8a2', background:'none', border:'none', cursor:'pointer', letterSpacing:'0.1em' }}>
                    {scoreCheckOpen ? '▼' : '▶'} score check
                  </button>
                  {scoreCheckOpen && <span style={{ fontFamily:MONO, fontSize:11, color:'#c8d47a', fontWeight:600 }}>{scoreCheckAvg} / 5</span>}
                </div>
              )}
            </div>

            <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column' }}>

              <div style={{ borderBottom:border, padding:'14px 22px 16px' }}>
                <div style={{ ...labelStyle, marginBottom:10 }}>Overall Notes</div>
                <textarea
                  value={overallNotes}
                  onChange={e => {
                    setOverallNotes(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  placeholder="How does this album feel as a whole? Themes, impressions, context..."
                  style={{ fontFamily:MONO, fontSize:12.5, lineHeight:1.9, color:'#1a1916', background:'transparent', border:'none', outline:'none', resize:'none', width:'100%', minHeight:120, overflow:'hidden', display:'block', boxSizing:'border-box' }}
                />
              </div>

              {tracks && tracks.length > 0 && (
                <div>
                  <div style={{ padding:'12px 22px 8px', borderBottom:'1px solid #f0ede8' }}>
                    <span style={labelStyle}>Track Notes</span>
                    {tracksLoading && <span style={{ ...labelStyle, marginLeft:8, opacity:0.4 }}>loading...</span>}
                  </div>
                  {tracks.map((t,i) => (
                    <div key={i} className="sn-row" style={{ padding:'10px 22px', borderBottom:'1px solid #f0ede8', display:'flex', flexDirection:'column', gap:6 }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                        <span style={{ fontFamily:MONO, fontSize:11, color:'#7a776f', minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          <span style={{ color:'#c0bdb7', marginRight:6 }}>{t.number}.</span>
                          {t.title}
                          {t.duration && <span style={{ color:'#d8d5cf', marginLeft:8 }}>{fmtDuration(t.duration)}</span>}
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

            <div style={{ padding:'12px 22px', borderTop:border, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, background:'rgba(255,255,255,0.5)' }}>
              <span style={{ fontFamily:MONO, fontSize:10, color:'#aaa8a2' }}>{overallNotes.length} chars</span>
              <button onClick={doFormat} disabled={!brief || overallNotes.trim().length < 10 || formatting} className="sn-btn"
                style={{ background:'#1a1916', color:'#f5f3ef', borderRadius:8, padding:'9px 24px', fontFamily:MONO, fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', border:'none', cursor:'pointer', fontWeight:600 }}>
                {formatting ? 'Formatting…' : 'Format & Done →'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {output && (
        <div style={{ position:'fixed', inset:0, background:'rgba(26,25,22,0.6)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:24 }}>
          <div style={{ background:'#fff', border:'1px solid #e0dcd5', borderRadius:20, width:'100%', maxWidth:680, maxHeight:'85vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 24px 80px rgba(0,0,0,0.2)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 28px', borderBottom:'1px solid #e0dcd5' }}>
              <span style={{ fontFamily:SERIF, fontSize:20, color:'#1a1916' }}>Session Output</span>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                {!saved
                  ? <button onClick={doSave} disabled={saving} className="sn-btn" style={{ background:'#c8d47a', color:'#1a1916', borderRadius:8, padding:'8px 20px', fontFamily:MONO, fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', border:'none', cursor:'pointer', fontWeight:600 }}>
                      {saving ? 'Saving…' : 'Save to Site →'}
                    </button>
                  : <span style={{ fontFamily:MONO, fontSize:11, color:'#c8d47a', fontWeight:600 }}>✓ saved</span>
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
