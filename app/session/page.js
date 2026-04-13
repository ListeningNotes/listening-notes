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
import { useState, useEffect, useRef } from 'react';
import { fonts } from '../../library/sitewide_visuals';
import { fetchTracklist, fetchAlbumArtUrl } from '../../library/music_data_api';
import PasswordGate from '../../components/session_components/PasswordGate';
import AlbumSelection from '../../components/session_components/AlbumSelection';
import LoadingResearch from '../../components/session_components/LoadingResearch';
import StarRating from '../../components/session_components/StarRating';
import { TrackLength, SessionDuration, LOADING_PHRASES } from '../../library/session_timers';

const PASSWORD = 'listeningnotes';

export default function Session() {
  const [authed, setAuthed] = useState(false);
  const [view, setView] = useState('picker'); // 'picker' | 'loading' | 'session'
  const [loadingArt, setLoadingArt] = useState('');

  const [albumInput, setAlbumInput] = useState('');
  const [artistInput, setArtistInput] = useState('');

  const [brief, setBrief] = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState('');
  const [loadingFactIndex, setLoadingFactIndex] = useState(0);


  const [albumArt, setAlbumArt] = useState('');
  const [tracks, setTracks] = useState(null);       // null = not fetched yet, [] = not found
  const [tracksLoading, setTracksLoading] = useState(false);

  const [trackNotes, setTrackNotes] = useState({});    // { trackIndex: string }
  const [trackRatings, setTrackRatings] = useState({}); // { trackIndex: number }
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
  const [elapsed, setElapsed] = useState(0);        // session timer in seconds
  const timerRef = useRef(null);
  const [burstReady, setBurstReady] = useState(false); // triggers the loading overlay expand animation

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null); // used to auto-scroll to the latest message

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
    const interval = setInterval(() => setLoadingFactIndex(i => (i + 1) % 8), 1800);
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
  const labelStyle = { fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7a776f' };

  // ── RENDER GATES ────────────────────────────────────────────────────────
  // Each gate checks state and returns early with the appropriate screen.

  if (!authed) return <PasswordGate onAuth={handleAuth} />;
  if (view === 'picker') return <AlbumSelection onSelect={handlePickerSelect} />;
  if (view === 'loading') return <LoadingResearch art={loadingArt} phraseIndex={loadingFactIndex} album={albumInput} artist={artistInput} onBurst={burstReady} />;

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

      <div style={{ minHeight:'100vh', color:'#e8e4dc', display:'flex', flexDirection:'column', fontFamily:fonts.sans, position:'relative', zIndex:1 }}>

        {/* Top bar — back button, timer, entries link */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px', flexShrink:0 }}>
          <button onClick={() => setView('picker')} style={{ fontFamily:fonts.mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(232,228,220,0.7)', background:'rgba(0,0,0,0.35)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, padding:'7px 14px', cursor:'pointer', backdropFilter:'blur(8px)' }}>
            ← Back
          </button>
          {brief && <span style={{ fontFamily:fonts.mono, fontSize:10, color:'rgba(232,228,220,0.35)', letterSpacing:'0.1em' }}>{SessionDuration(elapsed)}</span>}
          <a href="/session/entries" style={{ fontFamily:fonts.mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(232,228,220,0.7)', textDecoration:'none', padding:'6px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(0,0,0,0.35)', backdropFilter:'blur(8px)', flexShrink:0 }}>Entries</a>
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
                <div style={{ textAlign:'center', paddingTop:80, fontFamily:fonts.mono, fontSize:11, color:'rgba(232,228,220,0.35)', lineHeight:2 }}>
                  Researching album…
                </div>
              )}

              {/* Skeleton loading state */}
              {briefLoading && (
                <div style={{ display:'flex', flexDirection:'column', gap:20, paddingTop:40 }}>
                  <div key={loadingFactIndex} style={{ fontFamily:fonts.mono, fontSize:11, color:'rgba(232,228,220,0.4)', textAlign:'center', animation:'sn-fade 0.4s ease' }}>
                    {LOADING_PHRASES[loadingFactIndex % LOADING_PHRASES.length]}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {[80,60,90,45,80,65].map((w,i) => <div key={i} className="sn-skel" style={{ height:9, width:w+'%', animationDelay:i*0.1+'s' }} />)}
                  </div>
                </div>
              )}

              {briefError && <div style={{ fontFamily:fonts.mono, fontSize:11, color:'#ef4444' }}>{briefError}</div>}

              {/* Brief content — album art, metadata chips, and research sections */}
              {brief && (<>
                <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
                  {albumArt
                    ? <img src={albumArt} alt={brief.album} style={{ width:96, height:96, borderRadius:10, objectFit:'cover', flexShrink:0, boxShadow:'0 8px 32px rgba(0,0,0,0.15)' }} />
                    : <div style={{ width:96, height:96, borderRadius:10, background:'#ece9e3', flexShrink:0 }} />
                  }
                  <div style={{ minWidth:0, paddingTop:4 }}>
                    <div style={{ fontFamily:fonts.serif, fontSize:22, color:'#e8e4dc', lineHeight:1.1, marginBottom:5 }}>{brief.album}</div>
                    <div style={{ fontFamily:fonts.mono, fontSize:11, color:'rgba(232,228,220,0.5)', marginBottom:10 }}>{brief.artist}</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      {[brief.year, brief.genre, brief.label, brief.debut ? '⬖ debut' : null].filter(Boolean).map((t,i) => (
                        <span key={i} style={{ fontFamily:fonts.mono, fontSize:10, color:'rgba(232,228,220,0.5)', border:'1px solid rgba(255,255,255,0.15)', padding:'2px 8px', borderRadius:4, background:'rgba(255,255,255,0.08)' }}>{t}</span>
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
                  <span style={{ fontFamily:fonts.mono, fontSize:10, color:val ? '#e8e4dc' : 'rgba(232,228,220,0.35)' }}>{lbl}</span>
                </label>
              ))}
              {/* Score check — shows average of all rated tracks */}
              {ratedTracks.length > 0 && (
                <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
                  <button onClick={() => setScoreCheckOpen(c => !c)} style={{ fontFamily:fonts.mono, fontSize:10, textTransform:'uppercase', color:'rgba(232,228,220,0.35)', background:'none', border:'none', cursor:'pointer', letterSpacing:'0.1em' }}>
                    {scoreCheckOpen ? '▼' : '▶'} score check
                  </button>
                  {scoreCheckOpen && <span style={{ fontFamily:fonts.mono, fontSize:11, color:'rgba(232,228,220,0.8)', fontWeight:600 }}>{scoreCheckAvg} / 5</span>}
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
                  style={{ fontFamily:fonts.mono, fontSize:12.5, lineHeight:1.9, color:'#e8e4dc', background:'transparent', border:'none', outline:'none', resize:'none', width:'100%', minHeight:120, overflow:'hidden', display:'block', boxSizing:'border-box' }}
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
                        <span style={{ fontFamily:fonts.mono, fontSize:11, color:'rgba(232,228,220,0.5)', minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          <span style={{ color:'rgba(232,228,220,0.25)', marginRight:6 }}>{t.number}.</span>
                          {t.title}
                          {t.duration && <span style={{ color:'rgba(232,228,220,0.25)', marginLeft:8 }}>{TrackLength(t.duration)}</span>}
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
                      <div style={{ fontFamily:fonts.mono, fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(232,228,220,0.25)', marginBottom:4 }}>Quick prompts</div>
                      {['Reflect on my notes so far', 'What patterns do you notice?', 'Push back on something I said'].map(p => (
                        <button key={p} onClick={() => sendChat(p)}
                          style={{ fontFamily:fonts.mono, fontSize:10, color:'rgba(232,228,220,0.5)', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:6, padding:'6px 12px', cursor:'pointer', textAlign:'left', letterSpacing:'0.04em' }}>
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Chat message history */}
                  {chatMessages.map((m, i) => (
                    <div key={i} style={{ display:'flex', flexDirection:'column', gap:2, alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div style={{ fontFamily:fonts.mono, fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(232,228,220,0.25)' }}>{m.role === 'user' ? 'you' : 'ai'}</div>
                      <div style={{ maxWidth:'85%', padding:'8px 12px', borderRadius:10, background: m.role === 'user' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', fontFamily:fonts.sans, fontSize:12, lineHeight:1.7, color:'rgba(232,228,220,0.88)', whiteSpace:'pre-wrap' }}>
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
                    style={{ flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, padding:'8px 12px', fontFamily:fonts.mono, fontSize:11, color:'#e8e4dc', outline:'none' }}
                  />
                  <button onClick={() => sendChat()} disabled={!chatInput.trim() || chatLoading}
                    style={{ background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:8, padding:'8px 14px', fontFamily:fonts.mono, fontSize:11, color:'#e8e4dc', cursor:'pointer', letterSpacing:'0.06em' }}>
                    →
                  </button>
                </div>
              </div>
            )}

            {/* Bottom action bar — char count, chat toggle, format button */}
            <div style={{ padding:'12px 22px', borderTop:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, background:'rgba(0,0,0,0.2)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontFamily:fonts.mono, fontSize:10, color:'rgba(232,228,220,0.35)' }}>{overallNotes.length} chars</span>
                <button onClick={() => setChatOpen(v => !v)}
                  style={{ fontFamily:fonts.mono, fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color: chatOpen ? '#e8e4dc' : 'rgba(232,228,220,0.4)', background: chatOpen ? 'rgba(255,255,255,0.12)' : 'none', border:'1px solid ' + (chatOpen ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'), borderRadius:6, padding:'5px 10px', cursor:'pointer' }}>
                  {chatOpen ? '✕ chat' : '💬 ask ai'}
                </button>
              </div>
              {/* Format & Done — disabled until brief is loaded and notes are at least 10 chars */}
              <button onClick={doFormat} disabled={!brief || overallNotes.trim().length < 10 || formatting} className="sn-btn"
                style={{ background:'rgba(255,255,255,0.15)', color:'#e8e4dc', borderRadius:8, padding:'9px 24px', fontFamily:fonts.mono, fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', border:'1px solid rgba(255,255,255,0.2)', cursor:'pointer', fontWeight:600 }}>
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
              <span style={{ fontFamily:fonts.serif, fontSize:20, color:'#1a1916' }}>Session Output</span>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                {!saved
                  ? <button onClick={doSave} disabled={saving} className="sn-btn" style={{ background:'#1a1916', color:'#fff', borderRadius:8, padding:'8px 20px', fontFamily:fonts.mono, fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', border:'none', cursor:'pointer', fontWeight:600 }}>
                      {saving ? 'Saving…' : 'Save to Site →'}
                    </button>
                  : <span style={{ fontFamily:fonts.mono, fontSize:11, color:'#7a776f', fontWeight:600 }}>✓ saved</span>
                }
                <button onClick={() => setOutput(null)} style={{ background:'#f5f3ef', color:'#7a776f', borderRadius:8, padding:'8px 14px', fontFamily:fonts.mono, fontSize:11, border:'1px solid #e0dcd5', cursor:'pointer' }}>close</button>
              </div>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:28, display:'flex', flexDirection:'column', gap:24 }}>
              <div>
                <div style={{ ...labelStyle, marginBottom:10 }}>Background</div>
                <div style={{ fontSize:13.5, lineHeight:1.85, color:'#5a5750' }}>{output.background}</div>
              </div>
              {output.horizon && <div style={{ textAlign:'center', fontFamily:fonts.mono, fontSize:16, color:'#c0bdb7', letterSpacing:'0.04em' }}>{output.horizon}</div>}
              <div>
                <div style={{ ...labelStyle, marginBottom:10 }}>Notes</div>
                <div style={{ fontSize:13.5, lineHeight:1.85, color:'#1a1916' }}>{output.notes_prose}</div>
              </div>
              <div>
                <div style={{ ...labelStyle, marginBottom:10 }}>Tags</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {(output.tags || []).map((t,i) => (
                    <span key={i} style={{ fontFamily:fonts.mono, fontSize:10, color:'#7a776f', border:'1px solid #e0dcd5', padding:'3px 10px', borderRadius:4, background:'#f5f3ef' }}>#{t}</span>
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