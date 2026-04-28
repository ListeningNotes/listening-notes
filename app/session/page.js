// app/session/page.js
// Echo-powered session workspace. Password protected.
//
// Flow: Password Gate → Album Picker (Echo landing) → Research (Echo orb loading) → Session View → Output Modal → Save
//
// EchoOrb persists across picker, loading, and session states.
// It shrinks from full-screen to 48px compact at bottom-right when session starts.

'use client';
import { useState, useEffect, useRef } from 'react';
import { fonts } from '../../library/sitewide_visuals';
import { fetchTracklist, fetchAlbumArtUrl } from '../../library/music_data_api';
import PasswordGate from '../../components/session_components/PasswordGate';
import AlbumSelection from '../../components/session_components/AlbumSelection';
import StarRating from '../../components/session_components/StarRating';
import EchoOrb from '../../components/EchoOrb';
import EchoChat from '../../components/EchoChat';
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
  const [burstReady, setBurstReady] = useState(false);

  // Echo state
  const [echoDebrief, setEchoDebrief] = useState(null);
  const [echoDebriefLoading, setEchoDebriefLoading] = useState(false);
  const [echoMood, setEchoMood] = useState('thinking');
  const [echoActive, setEchoActive] = useState(false);
  const [echoChatOpen, setEchoChatOpen] = useState(false);
  const [echoChatHistory, setEchoChatHistory] = useState([]); // {role, content}[]
  const [echoChatInput, setEchoChatInput] = useState('');
  const [echoChatLoading, setEchoChatLoading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);

  // Window size for orb CSS transition
  const [windowW, setWindowW] = useState(1440);
  const [windowH, setWindowH] = useState(900);

  useEffect(() => {
    if (localStorage.getItem('ln_session_auth') === 'true') setAuthed(true);
    setWindowW(window.innerWidth);
    setWindowH(window.innerHeight);
  }, []);

  useEffect(() => {
    if (brief && !timerRef.current) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
  }, [brief]);

  useEffect(() => {
    if (!brief) return;
    const draft = { album: brief.album, artist: brief.artist, year: brief.year, albumArt, overallNotes, trackNotes, trackRatings, rating, Masterpiece, Favorite, entryType, relationship };
    localStorage.setItem('ln_session_draft', JSON.stringify(draft));
  }, [overallNotes, trackNotes, trackRatings, rating, Masterpiece, Favorite, entryType, relationship]);

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
    const interval = setInterval(() => setLoadingFactIndex(i => (i + 1) % 8), 1800);
    return () => clearInterval(interval);
  }, [briefLoading]);

  function handleAuth() {
    setAuthed(true);
    localStorage.setItem('ln_session_auth', 'true');
  }

  async function handlePickerSelect({ album, artist, year, artUrl, relationship: rel, entryType: et }) {
    setAlbumInput(album);
    setArtistInput(artist);
    if (rel) setRelationship(rel);
    if (et) setEntryType(et);
    if (artUrl) { setAlbumArt(artUrl); setLoadingArt(artUrl); }
    setView('loading');
    setEchoMood('thinking');
    await doResearch(album, artist, artUrl, rel, et);
    await new Promise(r => setTimeout(r, 400));
    setView('session');
    setEchoMood('curious');
  }

  const ratedTracks = Object.values(trackRatings).filter(v => v > 0);
  const scoreCheckAvg = ratedTracks.length
    ? (ratedTracks.reduce((a, b) => a + b, 0) / ratedTracks.length).toFixed(2) : null;

  async function doResearch(album, artist, existingArt, rel, et) {
    const a = album || albumInput;
    const ar = artist || artistInput;
    if (!a.trim()) return;
    setBriefLoading(true); setBriefError(''); setBrief(null); setBurstReady(false);
    setEchoDebrief(null); setEchoDebriefLoading(false);
    setTracks(null); setTrackNotes({}); setTrackRatings({});
    if (!existingArt) setAlbumArt('');
    setElapsed(0); setOverallNotes('');
    setRating(0); setMasterpiece(false); setFavorite(false);
    setSaved(false); setOutput(null);
    setSessionStarted(false); setEchoChatHistory([]); setEchoChatOpen(false);
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
      setBurstReady(true);

      if (!existingArt) {
        fetchAlbumArtUrl(data.album, data.artist, data.year).then(url => { if (url) setAlbumArt(url); });
      }
      setTracksLoading(true);
      fetchTracklist(data.album, data.artist, data.year).then(t => { setTracks(t || []); setTracksLoading(false); });

      // Get Echo's debrief — passes research JSON as the message for the research phase
      setEchoDebriefLoading(true);
      try {
        const echoRes = await fetch('/api/echo', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: JSON.stringify(data),
            phase: 'research',
            conversationHistory: [],
            entryContext: {
              album: data.album, artist: data.artist, year: data.year,
              entryType: et || '', relationship: rel || '',
              trackNotes: [], rating: '', tags: [],
            },
            echoMemory: '',
          }),
        });
        const echoData = await echoRes.json();
        if (!echoData.error) setEchoDebrief(echoData.reply);
      } catch {}
      setEchoDebriefLoading(false);
      setEchoActive(true);

    } catch (err) {
      setBriefError(err.message || 'Research failed.');
    } finally { setBriefLoading(false); }
  }

  async function sendEchoChat(message) {
    if (echoChatLoading || !message.trim()) return;
    setEchoChatInput('');
    const userMsg = { role: 'user', content: message };
    setEchoChatHistory(prev => [...prev, userMsg]);
    setEchoChatLoading(true);
    setEchoActive(false);

    try {
      const res = await fetch('/api/echo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          phase: 'chat',
          conversationHistory: echoChatHistory,
          entryContext: {
            album: brief?.album || '', artist: brief?.artist || '', year: brief?.year || '',
            entryType, relationship,
            trackNotes: Object.values(trackNotes).filter(Boolean),
            rating: rating ? rating + ' stars' : '',
            tags: [],
          },
          echoMemory: '',
        }),
      });
      const data = await res.json();
      if (!data.error) {
        setEchoChatHistory(prev => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch {}
    setEchoChatLoading(false);
  }

  async function doFormat() {
    if (!overallNotes.trim() || !brief) return;
    setFormatting(true);
    try {
      const res = await fetch('/api/format', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, notes: overallNotes, rating, Masterpiece, Favorite, entryType, relationship, trackNotes, trackRatings, tracks: tracks || [] })
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
          favorite: Favorite, background: output.background, notes: output.album_notes,
          track_notes: output.track_notes || '',
          tags: output.tags || [], horizon: output.horizon || '',
          album_art: albumArt, post_link: ''
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSaved(true);
      localStorage.removeItem('ln_session_draft');
      setTimeout(() => setView('picker'), 1800);
    } catch (err) { alert('Save failed: ' + err.message); }
    finally { setSaving(false); }
  }

  const border    = '1px solid #e0dcd5';
  const labelStyle = { fontFamily: fonts.mono, fontWeight: 600, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7a776f' };

  // ── Password gate — no orb ───────────────────────────────────────────────
  if (!authed) return <PasswordGate onAuth={handleAuth} />;

  // ── Orb position/size — CSS-transitioned ────────────────────────────────
  const orbIsCompact = view === 'session';
  const orbStyle = {
    position: 'fixed',
    right: orbIsCompact ? 24 : 0,
    bottom: orbIsCompact ? 24 : 0,
    width: orbIsCompact ? 48 : windowW,
    height: orbIsCompact ? 48 : windowH,
    zIndex: orbIsCompact ? 20 : 0,
    borderRadius: orbIsCompact ? '50%' : 0,
    background: orbIsCompact ? 'transparent' : '#f5f2ec',
    transition: 'right 0.6s ease-in-out, bottom 0.6s ease-in-out, width 0.6s ease-in-out, height 0.6s ease-in-out, border-radius 0.6s ease-in-out',
    boxShadow: orbIsCompact ? '0 4px 24px rgba(112,96,160,0.35)' : 'none',
    overflow: 'hidden',
  };

  return (
    <>
      {/* Persistent EchoOrb — full screen in picker/loading, compact 48px in session */}
      <EchoOrb
        mood={echoMood}
        active={echoActive}
        loading={view === 'loading'}
        albumArt={view === 'loading' ? loadingArt : null}
        onClick={orbIsCompact ? () => setEchoChatOpen(v => !v) : undefined}
        style={orbStyle}
      />

      {/* EchoChat float panel — only in session */}
      {view === 'session' && (
        <EchoChat
          open={echoChatOpen}
          onClose={() => setEchoChatOpen(false)}
          messages={echoChatHistory}
          onSend={sendEchoChat}
          loading={echoChatLoading}
          input={echoChatInput}
          setInput={setEchoChatInput}
        />
      )}

      {/* ── Picker overlay ── */}
      {view === 'picker' && (
        <AlbumSelection onSelect={handlePickerSelect} />
      )}

      {/* ── Loading overlay — minimal, orb provides visual ── */}
      {view === 'loading' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, pointerEvents: 'none' }}>
          <div style={{ fontFamily: fonts.sans, fontWeight: 700, fontSize: 18, color: '#1a1520', lineHeight: 1.1 }}>{albumInput}</div>
          <div style={{ fontFamily: fonts.mono, fontWeight: 400, fontSize: 11, color: 'rgba(26,25,22,0.4)', letterSpacing: '0.12em' }}>{artistInput}</div>
          <div key={loadingFactIndex} style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(26,25,22,0.35)', marginTop: 8, animation: 'echo-fade 0.5s ease forwards' }}>
            {LOADING_PHRASES[loadingFactIndex % LOADING_PHRASES.length]}
          </div>
          <style>{`@keyframes echo-fade{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}`}</style>
        </div>
      )}

      {/* ── Session view ── */}
      {view === 'session' && (
        <>
          <style>{`
            @keyframes sn-pulse { 0%,100%{opacity:0.5}50%{opacity:1} }
            @keyframes sn-fade  { from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)} }
            .sn-skel { background:rgba(255,255,255,0.08); border-radius:3px; animation:sn-pulse 1.6s ease-in-out infinite; }
            .sn-ti { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:8px; padding:8px 14px; font-family:'Nunito',sans-serif; font-size:12px; color:#e8e4dc; outline:none; }
            .sn-ti:focus { border-color:rgba(255,255,255,0.4); }
            .sn-ti::placeholder { color:rgba(232,228,220,0.25); }
            .sn-sel { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:7px 10px; font-family:'Nunito',sans-serif; font-size:11px; color:rgba(232,228,220,0.6); outline:none; cursor:pointer; }
            .sn-check { accent-color:#fff; cursor:pointer; }
            .sn-row:hover { background:rgba(255,255,255,0.05); }
            .sn-btn { transition:opacity 0.15s,transform 0.1s; }
            .sn-btn:hover:not(:disabled) { opacity:0.8; transform:translateY(-1px); }
            .sn-btn:disabled { opacity:0.3; cursor:not-allowed; }
            .sn-track-input { font-family:'Nunito',sans-serif; font-size:11px; color:rgba(232,228,220,0.7); background:transparent; border:none; border-bottom:1px solid rgba(255,255,255,0.1); outline:none; width:100%; padding:5px 0; }
            .sn-track-input:focus { border-color:rgba(255,255,255,0.35); }
            .sn-track-input::placeholder { color:rgba(232,228,220,0.2); }
            ::-webkit-scrollbar { width:4px; }
            ::-webkit-scrollbar-thumb { background:#e0dcd5; border-radius:99px; }
          `}</style>

          {albumArt && <div style={{ position:'fixed', inset:0, zIndex:0, backgroundImage:`url(${albumArt})`, backgroundSize:'cover', backgroundPosition:'center', filter:'blur(8px) saturate(1.2) brightness(0.75)', transform:'scale(1.1)', pointerEvents:'none' }} />}
          <div style={{ position:'fixed', inset:0, zIndex:0, background: albumArt ? 'rgba(245,243,239,0.15)' : 'rgba(245,243,239,0.95)', pointerEvents:'none', transition:'background 1.2s ease' }} />

          <div style={{ minHeight:'100vh', color:'#e8e4dc', display:'flex', flexDirection:'column', fontFamily:fonts.sans, position:'relative', zIndex:1 }}>

            {/* Top bar */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px', flexShrink:0 }}>
              <button onClick={() => setView('picker')} style={{ fontFamily:fonts.mono, fontWeight:600, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(232,228,220,0.7)', background:'rgba(0,0,0,0.35)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, padding:'7px 14px', cursor:'pointer', backdropFilter:'blur(8px)' }}>
                ← Back
              </button>
              {brief && <span style={{ fontFamily:fonts.mono, fontSize:10, color:'rgba(232,228,220,0.35)', letterSpacing:'0.1em' }}>{SessionDuration(elapsed)}</span>}
              <a href="/session/entries" style={{ fontFamily:fonts.mono, fontWeight:600, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(232,228,220,0.7)', textDecoration:'none', padding:'6px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(0,0,0,0.35)', backdropFilter:'blur(8px)', flexShrink:0 }}>Entries</a>
            </div>

            {/* Split panels */}
            <div style={{ display:'flex', flex:1, overflow:'hidden', gap:16, padding:'0 16px 16px' }}>

              {/* LEFT PANEL — Echo Debrief */}
              <div style={{ flex:1, borderRadius:16, display:'flex', flexDirection:'column', overflow:'hidden', background:'rgba(0,0,0,0.45)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ padding:'10px 22px', borderBottom:'1px solid rgba(255,255,255,0.08)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={labelStyle}>Echo</span>
                  {brief && <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {[brief.year, brief.genre, brief.label].filter(Boolean).map((t,i) => (
                      <span key={i} style={{ fontFamily:fonts.mono, fontSize:9, color:'rgba(232,228,220,0.4)', border:'1px solid rgba(255,255,255,0.1)', padding:'2px 7px', borderRadius:4, background:'rgba(255,255,255,0.06)' }}>{t}</span>
                    ))}
                  </div>}
                </div>

                <div style={{ flex:1, overflowY:'auto', padding:'20px 22px', display:'flex', flexDirection:'column', gap:20 }}>

                  {/* Album art + metadata */}
                  {brief && (
                    <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
                      {albumArt
                        ? <img src={albumArt} alt={brief.album} style={{ width:80, height:80, borderRadius:8, objectFit:'cover', flexShrink:0, boxShadow:'0 6px 24px rgba(0,0,0,0.2)' }} />
                        : <div style={{ width:80, height:80, borderRadius:8, background:'rgba(255,255,255,0.08)', flexShrink:0 }} />
                      }
                      <div style={{ minWidth:0, paddingTop:2 }}>
                        <div style={{ fontFamily:fonts.serif, fontWeight:800, fontSize:20, color:'#e8e4dc', lineHeight:1.1, marginBottom:4 }}>{brief.album}</div>
                        <div style={{ fontFamily:fonts.mono, fontSize:11, color:'rgba(232,228,220,0.45)' }}>{brief.artist}</div>
                      </div>
                    </div>
                  )}

                  {/* Echo loading skeleton */}
                  {echoDebriefLoading && (
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                      {[90,70,85,55,80].map((w,i) => <div key={i} className="sn-skel" style={{ height:9, width:w+'%', animationDelay:i*0.12+'s' }} />)}
                    </div>
                  )}

                  {/* Echo debrief — narrative voice */}
                  {echoDebrief && !echoDebriefLoading && (
                    <div style={{ fontSize:13, lineHeight:1.85, color:'rgba(232,228,220,0.82)', fontStyle:'italic', whiteSpace:'pre-wrap' }}>
                      {echoDebrief}
                    </div>
                  )}

                  {/* Research error fallback */}
                  {briefError && <div style={{ fontFamily:fonts.mono, fontSize:11, color:'#ef4444' }}>{briefError}</div>}

                  {/* Begin session button — appears once debrief is ready */}
                  {echoDebrief && !sessionStarted && (
                    <div style={{ paddingTop:8 }}>
                      <button onClick={() => setSessionStarted(true)} style={{ fontFamily:fonts.mono, fontWeight:600, fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(232,228,220,0.5)', background:'none', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, padding:'7px 14px', cursor:'pointer' }}>
                        begin session →
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT PANEL — Notes */}
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

                {/* Rating bar */}
                <div style={{ padding:'10px 22px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', gap:16, flexShrink:0 }}>
                  <StarRating value={rating} onChange={setRating} size={20} />
                  <div style={{ width:1, height:18, background:'rgba(255,255,255,0.15)' }} />
                  {[['Masterpiece',Masterpiece,setMasterpiece],['Favorite',Favorite,setFavorite]].map(([lbl,val,fn]) => (
                    <label key={lbl} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
                      <input type="checkbox" checked={val} onChange={e => fn(e.target.checked)} className="sn-check" />
                      <span style={{ fontFamily:fonts.mono, fontSize:10, color:val ? '#e8e4dc' : 'rgba(232,228,220,0.35)' }}>{lbl}</span>
                    </label>
                  ))}
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

                  {/* Overall notes */}
                  <div style={{ borderBottom:'1px solid rgba(255,255,255,0.08)', padding:'14px 22px 16px' }}>
                    <div style={{ ...labelStyle, marginBottom:10 }}>Overall Notes</div>
                    <textarea
                      value={overallNotes}
                      onChange={e => { setOverallNotes(e.target.value); e.target.style.height='auto'; e.target.style.height=e.target.scrollHeight+'px'; }}
                      placeholder="How does this album feel as a whole? Themes, impressions, context..."
                      style={{ fontFamily:fonts.mono, fontSize:12.5, lineHeight:1.9, color:'#e8e4dc', background:'transparent', border:'none', outline:'none', resize:'none', width:'100%', minHeight:120, overflow:'hidden', display:'block', boxSizing:'border-box' }}
                    />
                  </div>

                  {/* Track notes */}
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
                          <textarea
                            value={trackNotes[i] || ''}
                            onChange={e => { setTrackNotes(prev => ({ ...prev, [i]: e.target.value })); e.target.style.height='auto'; e.target.style.height=e.target.scrollHeight+'px'; }}
                            placeholder="notes..."
                            className="sn-track-input"
                            rows={1}
                            style={{ resize:'none', overflow:'hidden', display:'block' }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Track skeleton */}
                  {tracksLoading && !tracks && (
                    <div style={{ padding:'14px 22px', display:'flex', flexDirection:'column', gap:10 }}>
                      <span style={labelStyle}>Track Notes</span>
                      {[...Array(6)].map((_,i) => <div key={i} className="sn-skel" style={{ height:36, borderRadius:6 }} />)}
                    </div>
                  )}
                </div>

                {/* Bottom action bar */}
                <div style={{ padding:'12px 22px', borderTop:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, background:'rgba(0,0,0,0.2)' }}>
                  <span style={{ fontFamily:fonts.mono, fontSize:10, color:'rgba(232,228,220,0.35)' }}>{overallNotes.length} chars</span>
                  <button onClick={doFormat} disabled={!brief || overallNotes.trim().length < 10 || formatting} className="sn-btn"
                    style={{ background:'rgba(255,255,255,0.15)', color:'#e8e4dc', borderRadius:8, padding:'9px 24px', fontFamily:fonts.mono, fontWeight:700, fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', border:'1px solid rgba(255,255,255,0.2)', cursor:'pointer' }}>
                    {formatting ? 'Formatting…' : 'Format & Done →'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* OUTPUT MODAL */}
          {output && (
            <div style={{ position:'fixed', inset:0, zIndex:50 }}>
              <div onClick={() => setOutput(null)} style={{ position:'absolute', inset:0, background:'rgba(6,4,12,0.7)', backdropFilter:'blur(12px)' }} />
              <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'78vw', maxWidth:940, height:'86vh', borderRadius:16, overflow:'hidden', border:'1px solid rgba(255,255,255,0.09)', zIndex:51 }}>
                {albumArt && <img src={albumArt} alt={brief?.album} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', display:'block' }} />}
                <div style={{ position:'absolute', inset:0, background:'rgba(6,4,12,0.18)' }} />
                <button onClick={() => setOutput(null)} style={{ position:'absolute', top:14, right:14, zIndex:20, width:28, height:28, borderRadius:'50%', background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.09)', color:'rgba(255,255,255,0.45)', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                <div style={{ position:'absolute', top:48, left:44, right:44, bottom:64, background:'rgba(8,6,14,0.50)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:12, display:'flex', flexDirection:'column', overflow:'hidden' }}>
                  <div style={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
                    <div style={{ padding:'20px 22px', width:270, flexShrink:0, borderRight:'1px solid rgba(255,255,255,0.07)', display:'flex', flexDirection:'column' }}>
                      <div style={{ fontSize:26, fontWeight:800, color:'#f0ece4', lineHeight:1.05, letterSpacing:'-0.02em', marginBottom:3 }}>{brief?.album}</div>
                      <div style={{ fontSize:13, color:'rgba(255,255,255,0.42)', marginBottom:14 }}>{brief?.artist}{brief?.year ? ' · ' + brief.year : ''}</div>
                      <div style={{ height:1, background:'rgba(255,255,255,0.08)', marginBottom:12 }} />
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                        {[1,2,3,4,5].map(i => <span key={i} style={{ fontSize:16, color: i <= Math.floor(rating) ? '#E8B84B' : 'rgba(255,255,255,0.15)' }}>★</span>)}
                      </div>
                      <div style={{ fontFamily:fonts.mono, fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)' }}>
                        {relationship || ''}{entryType ? ' · ' + entryType : ''}
                      </div>
                    </div>
                    <div style={{ flex:1, padding:'20px 22px', minWidth:0 }}>
                      <div style={{ fontFamily:fonts.mono, fontSize:8, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(255,255,255,0.2)', marginBottom:10 }}>Background</div>
                      <div style={{ fontSize:12.5, fontWeight:300, lineHeight:1.8, color:'rgba(200,196,192,0.78)' }}>{output.background}</div>
                    </div>
                  </div>
                  <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
                    <div style={{ fontFamily:fonts.mono, fontSize:8, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(255,255,255,0.2)', marginBottom:12 }}>Album Notes</div>
                    <div style={{ fontSize:14, lineHeight:1.88, color:'rgba(232,228,220,0.92)', whiteSpace:'pre-wrap', marginBottom:24 }}>{output.album_notes}</div>
                    {output.horizon && <div style={{ textAlign:'center', fontFamily:fonts.mono, fontSize:18, letterSpacing:'0.05em', color:'rgba(255,255,255,0.25)', margin:'24px 0' }}>{output.horizon}</div>}
                    {output.track_notes && (
                      <>
                        <div style={{ fontFamily:fonts.mono, fontSize:8, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(255,255,255,0.2)', marginBottom:12, marginTop:8 }}>Track Notes</div>
                        <div style={{ fontSize:14, lineHeight:1.88, color:'rgba(210,206,200,0.85)', whiteSpace:'pre-wrap', marginBottom:24 }}>{output.track_notes}</div>
                      </>
                    )}
                    {(output.tags || []).length > 0 && (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6, paddingTop:20, borderTop:'1px solid rgba(255,255,255,0.07)' }}>
                        {output.tags.map((t,i) => <span key={i} style={{ fontFamily:fonts.mono, fontSize:8, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.28)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:4, padding:'3px 8px' }}>#{t}</span>)}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ position:'absolute', bottom:0, left:0, right:0, height:44, background:'rgba(6,4,12,0.55)', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px' }}>
                  <div style={{ display:'flex', gap:6, fontFamily:fonts.mono }}>
                    {(output.tags || []).slice(0,3).map((t,i) => (
                      <span key={i} style={{ display:'flex', alignItems:'center', gap:6 }}>
                        {i > 0 && <span style={{ color:'rgba(255,255,255,0.15)' }}>·</span>}
                        <span style={{ fontSize:8, letterSpacing:'0.06em', textTransform:'uppercase', color:'rgba(255,255,255,0.25)' }}>{t}</span>
                      </span>
                    ))}
                  </div>
                  {!saved
                    ? <button onClick={doSave} disabled={saving} className="sn-btn" style={{ fontFamily:fonts.mono, fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', color:'#c8d47a', background:'none', border:'1px solid rgba(200,212,122,0.3)', borderRadius:6, padding:'6px 16px', cursor:'pointer' }}>
                        {saving ? 'Saving…' : 'Save to Site →'}
                      </button>
                    : <span style={{ fontFamily:fonts.mono, fontSize:10, color:'#c8d47a', letterSpacing:'0.1em' }}>✓ saved</span>
                  }
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
