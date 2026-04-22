'use client';
import { useState, useEffect, useRef } from 'react';
import { fonts } from '../../../library/sitewide_visuals';
import { fetchTracklist, fetchAlbumArtUrl, searchArtistAlbums } from '../../../library/music_data_api';
import PasswordGate from '../../../components/session_components/PasswordGate';
import StarRating from '../../../components/session_components/StarRating';
import { TrackLength, SessionDuration, LOADING_PHRASES } from '../../../library/session_timers';

const STEPS = [
  { id: 0, label: 'Album' },
  { id: 1, label: 'Research' },
  { id: 2, label: 'Notes' },
  { id: 3, label: 'Tracks' },
  { id: 4, label: 'Echo' },
  { id: 5, label: 'Preview' },
];

const lbl = {
  fontFamily: fonts.mono,
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.38)',
};

const selStyle = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 20,
  padding: '7px 14px',
  fontFamily: fonts.mono,
  fontSize: 11,
  color: 'rgba(255,255,255,0.6)',
  outline: 'none',
  cursor: 'pointer',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
};

function OrbBtn({ onClick, children, disabled = false, accent = false, size = 'md', style: extra = {} }) {
  const pad = size === 'sm' ? '8px 20px' : size === 'lg' ? '14px 44px' : '11px 30px';
  const fs = size === 'sm' ? 10 : size === 'lg' ? 13 : 11;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      fontFamily: fonts.mono, fontSize: fs, letterSpacing: '0.09em', textTransform: 'uppercase',
      color: disabled ? 'rgba(255,255,255,0.22)' : '#fff',
      background: disabled ? 'rgba(255,255,255,0.07)' : accent ? 'rgba(200,212,122,0.22)' : 'rgba(255,255,255,0.16)',
      border: `1px solid ${disabled ? 'rgba(255,255,255,0.08)' : accent ? 'rgba(200,212,122,0.38)' : 'rgba(255,255,255,0.22)'}`,
      borderRadius: 50, padding: pad,
      boxShadow: disabled ? 'none' : accent
        ? '0 0 24px rgba(200,212,122,0.28), 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.18)'
        : '0 0 14px rgba(255,255,255,0.1), 0 4px 14px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.14)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s ease', flexShrink: 0, ...extra,
    }}>{children}</button>
  );
}

export default function ListenPage() {
  const [authed, setAuthed] = useState(false);
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);

  // Album search
  const [artistInput, setArtistInput] = useState('');
  const [albums, setAlbums] = useState([]);
  const [searching, setSearching] = useState(false);
  const [manualAlbum, setManualAlbum] = useState('');
  const [showManual, setShowManual] = useState(false);
  const debounceRef = useRef(null);

  // Research
  const [brief, setBrief] = useState(null);
  const [researchState, setResearchState] = useState('idle');
  const [researchError, setResearchError] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);

  // Entry data
  const [albumArt, setAlbumArt] = useState('');
  const [albumInput, setAlbumInput] = useState('');
  const [artistName, setArtistName] = useState('');
  const [overallNotes, setOverallNotes] = useState('');
  const [rating, setRating] = useState(0);
  const [Masterpiece, setMasterpiece] = useState(false);
  const [Favorite, setFavorite] = useState(false);
  const [entryType, setEntryType] = useState('');
  const [relationship, setRelationship] = useState('');

  // Tracks
  const [tracks, setTracks] = useState(null);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [trackNotes, setTrackNotes] = useState({});
  const [trackRatings, setTrackRatings] = useState({});

  // Echo
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Preview
  const [formatting, setFormatting] = useState(false);
  const [output, setOutput] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Panel color derived from album art — hue-matched, forced dark
  const [panelColor, setPanelColor] = useState('hsl(240,28%,8%)');

  // Timer
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (localStorage.getItem('ln_session_auth') === 'true') setAuthed(true);
  }, []);

  useEffect(() => {
    if (!albumArt) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 40; canvas.height = 40;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 40, 40);
        const d = ctx.getImageData(0, 0, 40, 40).data;
        let r = 0, g = 0, b = 0;
        const total = d.length / 4;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i+1]; b += d[i+2]; }
        // Normalize to 0–1
        r = r / total / 255;
        g = g / total / 255;
        b = b / total / 255;
        // RGB → HSL
        const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
        let h = 0, s = 0;
        if (delta > 0) {
          s = delta / (1 - Math.abs(max + min - 1));
          if (max === r) h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
          else if (max === g) h = ((b - r) / delta + 2) / 6;
          else h = ((r - g) / delta + 4) / 6;
        }
        // Keep hue, light value for a bright frosted tint
        const hDeg = Math.round(h * 360);
        const sPct = Math.round(Math.min(s * 100, 40));
        setPanelColor(`hsla(${hDeg},${sPct}%,88%,0.18)`);
      } catch {}
    };
    img.src = albumArt;
  }, [albumArt]);

  useEffect(() => {
    if (researchState === 'done' && !timerRef.current) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
  }, [researchState]);

  useEffect(() => {
    if (!brief) return;
    const draft = {
      album: brief.album, artist: brief.artist, year: brief.year,
      albumArt, overallNotes, trackNotes, trackRatings,
      rating, Masterpiece, Favorite, entryType, relationship,
    };
    localStorage.setItem('ln_session_draft', JSON.stringify(draft));
  }, [overallNotes, trackNotes, trackRatings, rating, Masterpiece, Favorite, entryType, relationship]);

  // Loading phrases
  useEffect(() => {
    if (researchState !== 'loading') return;
    const interval = setInterval(() => setPhraseIndex(i => (i + 1) % LOADING_PHRASES.length), 1800);
    return () => clearInterval(interval);
  }, [researchState]);


  // Artist search debounce
  useEffect(() => {
    if (step !== 0) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!artistInput.trim()) { setAlbums([]); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchArtistAlbums(artistInput);
      setAlbums(results);
      setSearching(false);
    }, 600);
    return () => clearTimeout(debounceRef.current);
  }, [artistInput, step]);

  function handleAuth() {
    setAuthed(true);
    localStorage.setItem('ln_session_auth', 'true');
  }

  function advanceTo(newStep) {
    setStep(newStep);
    setMaxStep(m => Math.max(m, newStep));
  }

  async function handleAlbumSelect({ album, artist, year, artUrl }) {
    setAlbumInput(album);
    setArtistName(artist);
    if (artUrl) setAlbumArt(artUrl);
    advanceTo(1);
    await doResearch(album, artist, artUrl);
  }

  function handleManualSubmit() {
    if (!manualAlbum.trim() || !artistInput.trim()) return;
    handleAlbumSelect({ album: manualAlbum.trim(), artist: artistInput.trim(), year: '', artUrl: '' });
  }

  function restoreDraft(albumName) {
    try {
      const s = JSON.parse(localStorage.getItem('ln_session_draft'));
      if (s && s.album === albumName) {
        setOverallNotes(s.overallNotes || '');
        setTrackNotes(s.trackNotes || {});
        setTrackRatings(s.trackRatings || {});
        setRating(s.rating || 0);
        setMasterpiece(s.Masterpiece || false);
        setFavorite(s.Favorite || false);
        setEntryType(s.entryType || '');
        setRelationship(s.relationship || '');
      }
    } catch {}
  }

  async function doResearch(album, artist, existingArt) {
    setResearchState('loading');
    setResearchError('');
    setBrief(null);
    setTracks(null);
    setTrackNotes({});
    setTrackRatings({});
    setElapsed(0);
    setOverallNotes('');
    setRating(0);
    setMasterpiece(false);
    setFavorite(false);
    setSaved(false);
    setOutput(null);
    setPhraseIndex(0);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ album, artist }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBrief(data);
      restoreDraft(data.album);
      setResearchState('done');
      if (!existingArt) {
        fetchAlbumArtUrl(data.album, data.artist, data.year).then(url => { if (url) setAlbumArt(url); });
      }
      setTracksLoading(true);
      fetchTracklist(data.album, data.artist, data.year).then(t => { setTracks(t || []); setTracksLoading(false); });
    } catch (err) {
      setResearchError(err.message || 'Research failed.');
      setResearchState('error');
    }
  }

  async function sendChat(msg) {
    if (chatLoading) return;
    const message = msg || chatInput.trim();
    if (!message) return;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: message }]);
    setChatLoading(true);
    try {
      const res = await fetch('/api/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, brief, overallNotes, trackNotes, trackRatings, tracks: tracks || [] }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setChatMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'ai', text: 'Something went wrong: ' + err.message }]);
    } finally { setChatLoading(false); }
  }

  async function doFormat() {
    if (!overallNotes.trim() || !brief) return;
    setFormatting(true);
    try {
      const res = await fetch('/api/format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, notes: overallNotes, rating, Masterpiece, Favorite, entryType, relationship, trackNotes, trackRatings, tracks: tracks || [] }),
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          album: brief.album, artist: brief.artist, year: brief.year,
          entry_type: entryType || 'Personal Library',
          relationship: relationship || '',
          rating: Masterpiece ? 'Masterpiece' : (rating ? rating + ' stars' : ''),
          favorite: Favorite,
          background: output.background,
          notes: output.album_notes,
          track_notes: output.track_notes || '',
          tags: output.tags || [],
          horizon: output.horizon || '',
          album_art: albumArt,
          post_link: '',
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSaved(true);
      localStorage.removeItem('ln_session_draft');
    } catch (err) { alert('Save failed: ' + err.message); }
    finally { setSaving(false); }
  }

  if (!authed) return <PasswordGate onAuth={handleAuth} />;

  const showLoadingScreen = step === 1 && researchState === 'loading';

  // ── STEP RENDERS ────────────────────────────────────────────────────────

  function renderAlbum() {
    return (
      <div style={{ width: '100%', maxWidth: 700 }}>
        <div style={{ fontFamily: fonts.serif, fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', color: '#fff', lineHeight: 1.1, marginBottom: 40, textAlign: 'center' }}>
          What are you<br />listening to?
        </div>
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <input
            value={artistInput}
            onChange={e => setArtistInput(e.target.value)}
            placeholder="Search by artist..."
            style={{
              width: '100%', background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 14, padding: '16px 22px', fontFamily: fonts.sans, fontSize: 16,
              color: '#fff', outline: 'none', boxSizing: 'border-box',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.35)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.18)'}
          />
          {searching && (
            <div style={{ position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)', fontFamily: fonts.mono, fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>searching…</div>
          )}
        </div>
        {artistInput.trim() && !showManual && (
          <button onClick={() => setShowManual(true)} style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0', display: 'block', marginBottom: 8 }}>
            + enter album manually
          </button>
        )}
        {showManual && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <input
              value={manualAlbum} onChange={e => setManualAlbum(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleManualSubmit()} placeholder="Album title..." autoFocus
              style={{ flex: 1, background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 10, padding: '10px 16px', fontFamily: fonts.mono, fontSize: 12, color: '#fff', outline: 'none' }}
            />
            <OrbBtn onClick={handleManualSubmit} disabled={!manualAlbum.trim() || !artistInput.trim()}>Start →</OrbBtn>
          </div>
        )}
        {albums.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ ...lbl, marginBottom: 18 }}>Albums by {albums[0]?.artist} — choose one to begin</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(128px, 1fr))', gap: 14 }}>
              {albums.map((album, i) => (
                <button key={i} onClick={() => handleAlbumSelect({ album: album.name, artist: album.artist, year: album.year, artUrl: album.artLarge })}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', borderRadius: 12, transition: 'transform 0.18s ease' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px) scale(1.02)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0) scale(1)'}>
                  <div style={{ borderRadius: 12, overflow: 'hidden', aspectRatio: '1', background: 'rgba(255,255,255,0.08)', marginBottom: 9, boxShadow: '0 6px 24px rgba(0,0,0,0.45)' }}>
                    {album.art && <img src={album.art} alt={album.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                  </div>
                  <div style={{ fontFamily: fonts.sans, fontSize: 12, fontWeight: 500, color: '#fff', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.name}</div>
                  {album.year && <div style={{ fontFamily: fonts.mono, fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{album.year}</div>}
                </button>
              ))}
            </div>
          </div>
        )}
        {!searching && artistInput.trim() && albums.length === 0 && (
          <div style={{ textAlign: 'center', fontFamily: fonts.mono, fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 16 }}>
            No results — enter the album manually above
          </div>
        )}
      </div>
    );
  }

  function renderResearch() {
    if (researchState === 'error') {
      return (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: fonts.mono, fontSize: 12, color: '#ef4444', marginBottom: 28 }}>{researchError}</div>
          <OrbBtn onClick={() => { setStep(0); setMaxStep(0); }}>← Try another album</OrbBtn>
        </div>
      );
    }
    if (researchState === 'done' && brief) {
      return (
        <div style={{ width: '100%', maxWidth: 760, animation: 'ln-panel-appear 0.6s cubic-bezier(0.34,1.3,0.64,1) forwards' }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 32 }}>
            {albumArt && <img src={albumArt} alt={brief.album} style={{ width: 88, height: 88, borderRadius: 12, objectFit: 'cover', flexShrink: 0, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }} />}
            <div style={{ minWidth: 0, paddingTop: 4 }}>
              <div style={{ fontFamily: fonts.serif, fontSize: 28, color: '#fff', lineHeight: 1.1, marginBottom: 4 }}>{brief.album}</div>
              <div style={{ fontFamily: fonts.mono, fontSize: 12, color: 'rgba(255,255,255,0.42)', marginBottom: 12 }}>{brief.artist}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[brief.year, brief.genre, brief.label, brief.debut ? '⬖ debut' : null].filter(Boolean).map((t, i) => (
                  <span key={i} style={{ fontFamily: fonts.mono, fontSize: 10, color: 'rgba(255,255,255,0.42)', border: '1px solid rgba(255,255,255,0.14)', padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.06)' }}>{t}</span>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, marginBottom: 36 }}>
            {[['Context', brief.context], ['Production', brief.production], ['Reception', brief.reception], ['Listen For', brief.listen_for]].map(([l, val]) => val ? (
              <div key={l} style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 18 }}>
                <div style={{ ...lbl, marginBottom: 10 }}>{l}</div>
                <div style={{ fontSize: 14, lineHeight: 1.85, color: 'rgba(255,255,255,0.72)' }}>{val}</div>
              </div>
            ) : null)}
            {brief.key_facts?.length > 0 && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 18 }}>
                <div style={{ ...lbl, marginBottom: 10 }}>Key Facts</div>
                {brief.key_facts.map((f, i) => (
                  <div key={i} style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)', marginBottom: 6 }}>— {f}</div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <OrbBtn onClick={() => advanceTo(2)} accent size="lg">Start Listening →</OrbBtn>
          </div>
        </div>
      );
    }
    return null;
  }

  function renderNotes() {
    return (
      <div style={{ width: '100%', maxWidth: 720 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 28 }}>
          <StarRating value={rating} onChange={setRating} size={24} />
          <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
          {[['Masterpiece', Masterpiece, setMasterpiece], ['Favorite', Favorite, setFavorite]].map(([name, val, fn]) => (
            <label key={name} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={val} onChange={e => fn(e.target.checked)} style={{ accentColor: '#c8d47a', cursor: 'pointer' }} />
              <span style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: val ? '#c8d47a' : 'rgba(255,255,255,0.3)', transition: 'color 0.15s' }}>{name}</span>
            </label>
          ))}
          {(relationship || entryType) && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              {relationship && <span style={{ fontFamily: fonts.mono, fontSize: 10, color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '4px 12px' }}>{relationship}</span>}
              {entryType && <span style={{ fontFamily: fonts.mono, fontSize: 10, color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '4px 12px' }}>{entryType}</span>}
            </div>
          )}
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24, marginBottom: 20 }}>
          <div style={{ ...lbl, marginBottom: 14 }}>Album Notes</div>
          <textarea
            value={overallNotes}
            onChange={e => { setOverallNotes(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
            placeholder="How does this album feel as a whole? Themes, impressions, context..."
            style={{ fontFamily: fonts.mono, fontSize: 14, lineHeight: 2, color: '#fff', background: 'transparent', border: 'none', outline: 'none', resize: 'none', width: '100%', minHeight: 180, overflow: 'hidden', display: 'block', boxSizing: 'border-box' }}
          />
          <div style={{ ...lbl, marginTop: 8, textAlign: 'right' }}>{overallNotes.length} chars</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <OrbBtn onClick={() => advanceTo(3)} disabled={overallNotes.trim().length < 10} accent>Continue →</OrbBtn>
        </div>
      </div>
    );
  }

  function renderTracks() {
    const ratedCount = Object.values(trackRatings).filter(v => v > 0);
    const avg = ratedCount.length ? (ratedCount.reduce((a, b) => a + b, 0) / ratedCount.length).toFixed(2) : null;
    return (
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={lbl}>Track Notes</span>
          {avg && <span style={{ fontFamily: fonts.mono, fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>avg {avg} / 5</span>}
        </div>
        {tracksLoading && !tracks && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...Array(10)].map((_, i) => (
              <div key={i} style={{ height: 38, borderRadius: 8, background: 'rgba(255,255,255,0.06)', animation: `ln-pulse 1.6s ease-in-out ${i * 0.06}s infinite` }} />
            ))}
          </div>
        )}
        {tracks && tracks.length === 0 && (
          <div style={{ paddingTop: 60, textAlign: 'center', fontFamily: fonts.mono, fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>
            No tracklist found — continue with album notes only
          </div>
        )}
        {tracks && tracks.map((t, i) => (
          <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ fontFamily: fonts.mono, fontSize: 12, color: 'rgba(255,255,255,0.5)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ color: 'rgba(255,255,255,0.2)', marginRight: 8 }}>{t.number}.</span>
                {t.title}
                {t.duration && <span style={{ color: 'rgba(255,255,255,0.2)', marginLeft: 10 }}>{TrackLength(t.duration)}</span>}
              </span>
              <StarRating value={trackRatings[i] || 0} onChange={v => setTrackRatings(prev => ({ ...prev, [i]: v }))} size={14} />
            </div>
            <textarea
              value={trackNotes[i] || ''}
              onChange={e => { setTrackNotes(prev => ({ ...prev, [i]: e.target.value })); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
              placeholder="notes..." rows={1}
              style={{ fontFamily: fonts.mono, fontSize: 11, color: 'rgba(255,255,255,0.6)', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)', outline: 'none', width: '100%', padding: '4px 0', resize: 'none', overflow: 'hidden', display: 'block' }}
            />
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
          <OrbBtn onClick={() => advanceTo(4)} accent>Continue →</OrbBtn>
        </div>
      </div>
    );
  }

  function renderEcho() {
    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 16 }}>
          {chatMessages.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
              <div style={{ ...lbl, marginBottom: 8 }}>Quick prompts</div>
              {['Reflect on my notes so far', 'What patterns do you notice?', 'Push back on something I said'].map(p => (
                <button key={p} onClick={() => sendChat(p)} style={{
                  fontFamily: fonts.mono, fontSize: 11, color: 'rgba(255,255,255,0.55)',
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: 20, padding: '10px 18px', cursor: 'pointer', textAlign: 'left', letterSpacing: '0.03em', transition: 'background 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                >{p}</button>
              ))}
            </div>
          )}
          {chatMessages.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ ...lbl }}>{m.role === 'user' ? 'you' : 'echo'}</div>
              <div style={{ maxWidth: '80%', padding: '11px 16px', borderRadius: 16, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', fontFamily: fonts.sans, fontSize: 13, lineHeight: 1.75, color: 'rgba(255,255,255,0.88)', whiteSpace: 'pre-wrap' }}>
                {m.text}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div style={{ display: 'flex', gap: 5, padding: '4px 2px' }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', animation: `ln-dot 1.4s ease-in-out ${i * 0.22}s infinite` }} />)}
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            value={chatInput} onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
            placeholder="Ask anything about the music…"
            style={{ flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 20, padding: '10px 18px', fontFamily: fonts.mono, fontSize: 11, color: '#fff', outline: 'none' }}
          />
          <OrbBtn onClick={() => sendChat()} disabled={!chatInput.trim() || chatLoading} size="sm">→</OrbBtn>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <button onClick={() => advanceTo(5)} style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Skip →
          </button>
          <OrbBtn onClick={() => advanceTo(5)} accent>Continue →</OrbBtn>
        </div>
      </div>
    );
  }

  function renderPreview() {
    return (
      <div style={{ width: '100%', maxWidth: 760 }}>
        {!output ? (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            {albumArt && <img src={albumArt} alt={brief?.album} style={{ width: 88, height: 88, borderRadius: 12, objectFit: 'cover', display: 'block', margin: '0 auto 24px', boxShadow: '0 10px 40px rgba(0,0,0,0.6)' }} />}
            <div style={{ fontFamily: fonts.serif, fontSize: 26, color: '#fff', marginBottom: 4, lineHeight: 1.1 }}>{brief?.album}</div>
            <div style={{ fontFamily: fonts.mono, fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 48 }}>{brief?.artist}</div>
            <OrbBtn onClick={doFormat} disabled={formatting || !overallNotes.trim()} accent size="lg">
              {formatting ? 'Formatting…' : 'Format My Notes →'}
            </OrbBtn>
          </div>
        ) : (
          <div style={{ animation: 'ln-panel-appear 0.5s cubic-bezier(0.34,1.2,0.64,1) forwards' }}>
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 28, paddingBottom: 28, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {albumArt && <img src={albumArt} alt={brief?.album} style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover', flexShrink: 0, boxShadow: '0 6px 24px rgba(0,0,0,0.5)' }} />}
              <div>
                <div style={{ fontFamily: fonts.serif, fontSize: 22, color: '#fff', lineHeight: 1.05, marginBottom: 4 }}>{brief?.album}</div>
                <div style={{ fontFamily: fonts.mono, fontSize: 11, color: 'rgba(255,255,255,0.38)', marginBottom: 10 }}>{brief?.artist}{brief?.year ? ' · ' + brief.year : ''}</div>
                <div style={{ display: 'flex', gap: 3 }}>
                  {[1,2,3,4,5].map(i => <span key={i} style={{ fontSize: 14, color: i <= Math.floor(rating) ? '#E8B84B' : 'rgba(255,255,255,0.12)' }}>★</span>)}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 12.5, lineHeight: 1.8, color: 'rgba(255,255,255,0.58)', maxWidth: 380 }}>{output.background}</div>
            </div>
            <div style={{ ...lbl, marginBottom: 12 }}>Album Notes</div>
            <div style={{ fontSize: 14, lineHeight: 1.9, color: 'rgba(255,255,255,0.9)', whiteSpace: 'pre-wrap', marginBottom: 28 }}>{output.album_notes}</div>
            {output.horizon && (
              <div style={{ textAlign: 'center', fontFamily: fonts.mono, fontSize: 18, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.18)', margin: '24px 0' }}>{output.horizon}</div>
            )}
            {output.track_notes && (
              <>
                <div style={{ ...lbl, marginBottom: 12, marginTop: 4 }}>Track Notes</div>
                <div style={{ fontSize: 14, lineHeight: 1.9, color: 'rgba(255,255,255,0.75)', whiteSpace: 'pre-wrap', marginBottom: 28 }}>{output.track_notes}</div>
              </>
            )}
            {(output.tags || []).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)', marginBottom: 32 }}>
                {output.tags.map((t, i) => (
                  <span key={i} style={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '3px 10px', background: 'rgba(255,255,255,0.05)' }}>#{t}</span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16 }}>
              {!saved ? (
                <OrbBtn onClick={doSave} disabled={saving} accent size="lg">{saving ? 'Saving…' : 'Save to Site →'}</OrbBtn>
              ) : (
                <>
                  <span style={{ fontFamily: fonts.mono, fontSize: 11, color: '#c8d47a', letterSpacing: '0.1em' }}>✓ Saved</span>
                  <a href="/session" style={{ fontFamily: fonts.mono, fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textDecoration: 'none' }}>← Back to session</a>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  const stepRenders = [renderAlbum, renderResearch, renderNotes, renderTracks, renderEcho, renderPreview];

  // ── LAYOUT ──────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        /* Art sweeps up from bottom — slow enough to span typical load times */
        @keyframes ln-art-sweep {
          0%   { clip-path: inset(100% 0 0 0); }
          100% { clip-path: inset(10% 0 0 0); }
        }
        .ln-art-loading { animation: ln-art-sweep 14s cubic-bezier(0.4,0,0.2,1) forwards; }
        .ln-art-done    { clip-path: inset(0%) !important; transition: clip-path 0.7s ease !important; }
        @keyframes ln-panel-appear {
          from { opacity: 0; transform: translateY(18px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ln-glow {
          0%,100% { box-shadow: 0 0 14px rgba(200,212,122,0.3), 0 3px 14px rgba(0,0,0,0.35); }
          50%     { box-shadow: 0 0 26px rgba(200,212,122,0.52), 0 4px 20px rgba(0,0,0,0.4); }
        }
        @keyframes ln-fade { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
        @keyframes ln-pulse { 0%,100%{opacity:0.35} 50%{opacity:0.8} }
        @keyframes ln-dot { 0%,80%,100%{opacity:0.18;transform:scale(0.7)} 40%{opacity:1;transform:scale(1)} }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.16); border-radius: 99px; }
        select option { background: #1a1916; color: #fff; }
        input::placeholder { color: rgba(255,255,255,0.22); }
        textarea::placeholder { color: rgba(255,255,255,0.22); }
      `}</style>

      {/* Base dark background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: '#0c0a14', pointerEvents: 'none' }} />

      {/* Base dark background — always behind everything */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: '#080612', pointerEvents: 'none' }} />

      {/* Album art — sweeps up from bottom during loading */}
      {albumArt && (
        <div
          className={researchState === 'loading' ? 'ln-art-loading' : researchState === 'done' ? 'ln-art-done' : ''}
          style={{
            position: 'fixed', inset: 0, zIndex: 1,
            backgroundImage: `url(${albumArt})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            transform: 'scale(1.04)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Thin veil over art — only after loading, gives panel contrast */}
      {!showLoadingScreen && albumArt && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2,
          background: 'rgba(6,4,14,0.08)',
          pointerEvents: 'none',
        }} />
      )}

      {/* ── FULL-SCREEN LOADING ── */}
      {showLoadingScreen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          fontFamily: fonts.sans,
          padding: '0 24px',
        }}>
          {/* Album title */}
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontFamily: fonts.serif, fontSize: 'clamp(2rem, 5vw, 4rem)', color: '#fff', lineHeight: 1.05, marginBottom: 8, textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}>
              {albumInput}
            </div>
            <div style={{ fontFamily: fonts.mono, fontSize: 12, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {artistName}
            </div>
          </div>

          {/* Data capture */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>
                What kind of listen?
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {['First Listen', 'Revisit', 'Formative', 'Study'].map(r => (
                  <button key={r} onClick={() => setRelationship(r === relationship ? '' : r)} style={{
                    fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.06em',
                    color: relationship === r ? '#1a1916' : 'rgba(255,255,255,0.65)',
                    background: relationship === r ? '#c8d47a' : 'rgba(255,255,255,0.1)',
                    border: `1px solid ${relationship === r ? '#c8d47a' : 'rgba(255,255,255,0.18)'}`,
                    borderRadius: 50, padding: '9px 20px', cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: relationship === r ? '0 0 18px rgba(200,212,122,0.3)' : 'none',
                  }}>{r}</button>
                ))}
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>
                Entry type
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Personal Library', 'Submission'].map(t => (
                  <button key={t} onClick={() => setEntryType(t === entryType ? '' : t)} style={{
                    fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.06em',
                    color: entryType === t ? '#1a1916' : 'rgba(255,255,255,0.65)',
                    background: entryType === t ? '#c8d47a' : 'rgba(255,255,255,0.1)',
                    border: `1px solid ${entryType === t ? '#c8d47a' : 'rgba(255,255,255,0.18)'}`,
                    borderRadius: 50, padding: '9px 20px', cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: entryType === t ? '0 0 18px rgba(200,212,122,0.3)' : 'none',
                  }}>{t}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Loading indicator */}
          <div style={{ position: 'absolute', bottom: 52, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div key={phraseIndex} style={{ fontFamily: fonts.mono, fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', animation: 'ln-fade 0.5s ease' }}>
              {LOADING_PHRASES[phraseIndex % LOADING_PHRASES.length]}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', animation: `ln-dot 1.4s ease-in-out ${i * 0.22}s infinite` }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PANEL + BUBBLES ── */}
      {!showLoadingScreen && (
        <div style={{
          minHeight: '100vh',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 18, padding: '24px 28px',
          fontFamily: fonts.sans, color: '#fff',
          position: 'relative', zIndex: 6,
          boxSizing: 'border-box',
        }}>

          {/* Floating step bubbles */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            {STEPS.map((s, i) => {
              const isPast = s.id < step;
              const isCurrent = s.id === step;
              const isReachable = s.id <= maxStep;
              const isClickable = isReachable && !isCurrent;
              return (
                <div key={s.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <button
                    onClick={() => isClickable && setStep(s.id)}
                    title={s.label}
                    style={{
                      width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                      background: isCurrent
                        ? 'rgba(200,212,122,0.88)'
                        : isPast
                          ? 'rgba(200,212,122,0.18)'
                          : 'rgba(255,255,255,0.1)',
                      border: `1.5px solid ${isCurrent ? 'rgba(200,212,122,0.9)' : isPast ? 'rgba(200,212,122,0.35)' : 'rgba(255,255,255,0.18)'}`,
                      boxShadow: isCurrent
                        ? '0 0 0 0 rgba(200,212,122,0)'
                        : isPast
                          ? '0 2px 10px rgba(0,0,0,0.3)'
                          : '0 2px 8px rgba(0,0,0,0.2)',
                      animation: isCurrent ? 'ln-glow 2.8s ease-in-out infinite' : 'none',
                      color: isCurrent ? '#1a1916' : isPast ? '#c8d47a' : 'rgba(255,255,255,0.28)',
                      fontSize: 11, fontFamily: fonts.mono, fontWeight: 700,
                      cursor: isClickable ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.28s ease',
                    }}
                  >
                    {isPast ? '✓' : s.id + 1}
                  </button>
                  {i < STEPS.length - 1 && (
                    <div style={{
                      width: 1.5, height: 14,
                      background: isPast ? 'rgba(200,212,122,0.22)' : 'rgba(255,255,255,0.09)',
                      margin: '3px 0',
                      transition: 'background 0.28s ease',
                    }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Glass panel */}
          <div
            style={{
              flex: 1,
              maxWidth: 1040,
              height: 'calc(100vh - 48px)',
              background: panelColor,
              border: '1px solid rgba(255,255,255,0.28)',
              borderRadius: 26,
              boxShadow: '0 24px 72px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.35)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'ln-panel-appear 0.55s cubic-bezier(0.34,1.2,0.64,1)',
            }}
          >
            {/* Panel header */}
            {brief && (
              <div style={{ padding: '14px 28px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                {albumArt && <img src={albumArt} alt={brief.album} style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.35)' }} />}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: fonts.serif, fontSize: 15, color: 'rgba(255,255,255,0.9)', lineHeight: 1, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{brief.album}</div>
                  <div style={{ fontFamily: fonts.mono, fontSize: 10, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.05em' }}>{brief.artist}</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 18, alignItems: 'center', flexShrink: 0 }}>
                  {elapsed > 0 && <span style={{ fontFamily: fonts.mono, fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>{SessionDuration(elapsed)}</span>}
                  <a href="/session" style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', textDecoration: 'none' }}>← Session</a>
                </div>
              </div>
            )}

            {/* Step content */}
            <div style={{
              flex: 1, overflowY: 'auto',
              display: 'flex',
              alignItems: step === 0 ? 'center' : 'flex-start',
              justifyContent: 'center',
              padding: step === 4 ? '32px 48px 32px' : '40px 48px 56px',
            }}>
              {stepRenders[step]?.()}
            </div>

          </div>{/* end panel */}
        </div>
      )}
    </>
  );
}
