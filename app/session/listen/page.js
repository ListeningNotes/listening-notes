'use client';
import { useState, useEffect, useRef } from 'react';
import { fonts } from '../../../library/sitewide_visuals';
import { fetchTracklist, fetchAlbumArtUrl, searchArtistAlbums } from '../../../library/music_data_api';
import PasswordGate from '../../../components/session_components/PasswordGate';
import StarRating from '../../../components/session_components/StarRating';
import EchoOrb from '../../../components/EchoOrb';
import EchoChat from '../../../components/EchoChat';
import EchoNetwork from '../../../components/EchoNetwork';
import { TrackLength, SessionDuration, LOADING_PHRASES } from '../../../library/session_timers';

const STEPS = [
  { id: 0, label: 'Album Debrief' },
  { id: 1, label: 'Track Notes' },
  { id: 2, label: 'Album Notes' },
  { id: 3, label: 'Reflect' },
  { id: 4, label: 'Tags' },
  { id: 5, label: 'Preview' },
];

const tx  = (a) => `rgba(255,255,255,${a})`;
const bdr = (a) => `rgba(255,255,255,${a})`;
const dk  = (a) => `rgba(15,12,10,${a})`;

const lbl = {
  fontFamily: fonts.mono,
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: tx(0.38),
};

function PanelBtn({ onClick, disabled = false, accent = false, children, style: extra = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase',
      color: disabled ? tx(0.22) : tx(0.78),
      background: disabled ? 'rgba(255,255,255,0.3)' : accent ? 'rgba(200,212,122,0.7)' : 'rgba(255,255,255,0.55)',
      border: `1px solid ${disabled ? bdr(0.06) : accent ? 'rgba(200,212,122,0.5)' : bdr(0.1)}`,
      borderRadius: 50, padding: '11px 30px',
      boxShadow: disabled ? 'none' : accent
        ? `0 0 18px rgba(200,212,122,0.22), 0 4px 12px ${bdr(0.1)}, inset 0 1px 0 rgba(255,255,255,0.55)`
        : `0 2px 8px ${bdr(0.07)}, inset 0 1px 0 rgba(255,255,255,0.55)`,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s ease', flexShrink: 0, ...extra,
    }}>{children}</button>
  );
}

export default function ListenPage() {
  const [authed, setAuthed]   = useState(false);
  const [checking, setChecking] = useState(true);
  const [step, setStep]       = useState(-1); // -1 = album search
  const [maxStep, setMaxStep] = useState(-1);

  // Album search
  const [artistInput, setArtistInput] = useState('');
  const [albums, setAlbums]           = useState([]);
  const [searching, setSearching]     = useState(false);
  const [manualAlbum, setManualAlbum] = useState('');
  const [showManual, setShowManual]   = useState(false);
  const debounceRef = useRef(null);

  // Confirm flow — two sequential questions before research fires
  const [confirmPhase, setConfirmPhase] = useState(null); // null | 'q1' | 'q2'
  const [pendingAlbum, setPendingAlbum] = useState(null);

  // Research
  const [brief, setBrief]               = useState(null);
  const [researchState, setResearchState] = useState('idle');
  const [researchError, setResearchError] = useState('');
  const [phraseIndex, setPhraseIndex]   = useState(0);

  // Entry data
  const [albumArt, setAlbumArt]     = useState('');
  const [albumInput, setAlbumInput] = useState('');
  const [artistName, setArtistName] = useState('');
  const [overallNotes, setOverallNotes] = useState('');
  const [rating, setRating]         = useState(0);
  const [Masterpiece, setMasterpiece] = useState(false);
  const [Favorite, setFavorite]     = useState(false);
  const [entryType, setEntryType]   = useState('');
  const [relationship, setRelationship] = useState('');

  // Tracks
  const [tracks, setTracks]         = useState(null);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [trackNotes, setTrackNotes] = useState({});
  const [trackRatings, setTrackRatings] = useState({});
  const [openTrack, setOpenTrack]   = useState(null);

  // Echo
  const [echoDebrief, setEchoDebrief]       = useState(null);
  const [echoDebriefLoading, setEchoDebriefLoading] = useState(false);
  const [echoMood, setEchoMood]             = useState('thinking');
  const [echoActive, setEchoActive]         = useState(false);
  const [echoChatOpen, setEchoChatOpen]     = useState(false);
  const [echoChatHistory, setEchoChatHistory] = useState([]);
  const [echoChatInput, setEchoChatInput]   = useState('');
  const [echoChatLoading, setEchoChatLoading] = useState(false);

  // Legacy reflect chat (step 3) — kept for "quick prompts" UX
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput]       = useState('');
  const [chatLoading, setChatLoading]   = useState(false);
  const chatEndRef = useRef(null);

  // Tags
  const [sessionTags, setSessionTags] = useState([]);
  const [tagInput, setTagInput]       = useState('');

  // Preview
  const [formatting, setFormatting] = useState(false);
  const [output, setOutput]         = useState(null);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);

  // Timer
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.json())
      .then(d => setAuthed(!!d.authed))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

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

  useEffect(() => {
    if (researchState !== 'loading') return;
    const interval = setInterval(() => setPhraseIndex(i => (i + 1) % LOADING_PHRASES.length), 1800);
    return () => clearInterval(interval);
  }, [researchState]);

  useEffect(() => {
    if (step !== -1) return;
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

  useEffect(() => {
    if (step === 4 && !output && !formatting && brief && overallNotes.trim()) doFormat();
  }, [step]);

  useEffect(() => {
    if (output?.tags?.length && sessionTags.length === 0) setSessionTags(output.tags);
  }, [output]);

  function handleAuth() { setAuthed(true); }

  function advanceTo(newStep) {
    setStep(newStep);
    setMaxStep(m => Math.max(m, newStep));
  }

  // Called after confirm questions are answered — fires research
  async function handleAlbumSelect({ album, artist, year, artUrl }) {
    setAlbumInput(album);
    setArtistName(artist);
    if (artUrl) setAlbumArt(artUrl);
    setStep(0);
    setMaxStep(0);
    setEchoMood('thinking');
    await doResearch(album, artist, artUrl);
  }

  // Confirm Q1: album picked in grid — go to relationship question
  function handleAlbumPick(album) {
    setPendingAlbum({ album: album.name, artist: album.artist, year: album.year, artUrl: album.artLarge });
    setRelationship('');
    setEntryType('');
    setConfirmPhase('q1');
  }

  // Manual album submit — go to confirm flow too
  function handleManualSubmit() {
    if (!manualAlbum.trim() || !artistInput.trim()) return;
    setPendingAlbum({ album: manualAlbum.trim(), artist: artistInput.trim(), year: '', artUrl: '' });
    setRelationship('');
    setEntryType('');
    setConfirmPhase('q1');
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
    setEchoDebrief(null);
    setEchoDebriefLoading(false);
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
    setSessionTags([]);
    setPhraseIndex(0);
    setChatMessages([]);
    setEchoChatHistory([]);
    setEchoChatOpen(false);
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
      setEchoMood('curious');

      if (!existingArt) {
        fetchAlbumArtUrl(data.album, data.artist, data.year).then(url => { if (url) setAlbumArt(url); });
      }
      setTracksLoading(true);
      fetchTracklist(data.album, data.artist).then(t => { setTracks(t || []); setTracksLoading(false); });

      // Get Echo's research briefing
      setEchoDebriefLoading(true);
      try {
        const echoRes = await fetch('/api/echo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: JSON.stringify(data),
            phase: 'research',
            conversationHistory: [],
            entryContext: {
              album: data.album, artist: data.artist, year: data.year,
              entryType, relationship,
              trackNotes: [], rating: '', tags: [],
            },
            echoMemory: '',
          }),
        });
        const echoData = await echoRes.json();
        if (!echoData.error) {
          setEchoDebrief(echoData.reply);
          setEchoActive(true);
        }
      } catch {}
      setEchoDebriefLoading(false);

    } catch (err) {
      setResearchError(err.message || 'Research failed.');
      setResearchState('error');
    }
  }

  // Echo chat — used for the Reflect step and EchoChat panel
  async function sendEchoChat(message, phase = 'chat') {
    if (echoChatLoading || !message.trim()) return;
    setEchoChatInput('');
    const userMsg = { role: 'user', content: message };
    setEchoChatHistory(prev => [...prev, userMsg]);
    setEchoChatLoading(true);
    setEchoActive(false);
    try {
      const res = await fetch('/api/echo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          phase,
          conversationHistory: echoChatHistory,
          entryContext: {
            album: brief?.album || '', artist: brief?.artist || '', year: brief?.year || '',
            entryType, relationship,
            trackNotes: Object.values(trackNotes).filter(Boolean),
            rating: rating ? rating + ' stars' : '',
            tags: sessionTags,
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

  // Legacy reflect chat for step 3 quick prompts
  async function sendChat(msg) {
    if (chatLoading) return;
    const message = msg || chatInput.trim();
    if (!message) return;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: message }]);
    setChatLoading(true);
    try {
      const res = await fetch('/api/echo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          phase: 'reflection',
          conversationHistory: chatMessages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
          entryContext: {
            album: brief?.album || '', artist: brief?.artist || '', year: brief?.year || '',
            entryType, relationship,
            trackNotes: Object.values(trackNotes).filter(Boolean),
            rating: rating ? rating + ' stars' : '',
            tags: sessionTags,
          },
          echoMemory: '',
        }),
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
          tags: sessionTags,
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

  if (checking) return <div style={{ minHeight: '100vh', background: '#f5f2ec' }} />;
  if (!authed) return <PasswordGate onAuth={handleAuth} />;

  const showLoadingScreen = step >= 0 && researchState !== 'done' && researchState !== 'error';

  // ── STEP RENDERS ──────────────────────────────────────────────────────────

  // Step 0 — Album Debrief: Echo's narrative voice instead of raw research sections
  function renderHistory() {
    if (researchState === 'error') {
      return (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: fonts.mono, fontSize: 12, color: '#ef4444', marginBottom: 28 }}>{researchError}</div>
          <PanelBtn onClick={() => { setStep(-1); setMaxStep(-1); setConfirmPhase(null); }}>← Try another album</PanelBtn>
        </div>
      );
    }
    if (!brief) return null;

    return (
      <div style={{ width: '100%' }}>

        {/* Echo debrief — italic narrative */}
        {echoDebriefLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
            {[88, 72, 84, 58, 78].map((w, i) => (
              <div key={i} style={{ height: 9, width: w + '%', borderRadius: 4, background: 'rgba(255,255,255,0.12)', animation: `ln-pulse 1.6s ease-in-out ${i * 0.12}s infinite` }} />
            ))}
          </div>
        )}

        {echoDebrief && !echoDebriefLoading && (
          <div style={{ marginBottom: 36, paddingBottom: 32, borderBottom: `1px solid ${bdr(0.07)}` }}>
            <div style={{ ...lbl, marginBottom: 14 }}>Echo</div>
            <div style={{
              fontFamily: fonts.sans, fontSize: 14.5, lineHeight: 1.88,
              color: tx(0.82), fontStyle: 'italic',
              whiteSpace: 'pre-wrap',
            }}>
              {echoDebrief}
            </div>
          </div>
        )}

        {/* Raw research — kept below Echo's briefing as reference */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, marginBottom: 36 }}>
          {[['Context', brief.context], ['Production', brief.production], ['Reception', brief.reception], ['Listen For', brief.listen_for]].map(([l, val]) => val ? (
            <div key={l} style={{ borderTop: `1px solid ${bdr(0.07)}`, paddingTop: 18 }}>
              <div style={{ ...lbl, marginBottom: 10 }}>{l}</div>
              <div style={{ fontFamily: fonts.sans, fontSize: 13.5, lineHeight: 1.85, color: tx(0.65) }}>{val}</div>
            </div>
          ) : null)}
          {brief.key_facts?.length > 0 && (
            <div style={{ borderTop: `1px solid ${bdr(0.07)}`, paddingTop: 18 }}>
              <div style={{ ...lbl, marginBottom: 10 }}>Key Facts</div>
              {brief.key_facts.map((f, i) => (
                <div key={i} style={{ fontFamily: fonts.sans, fontSize: 13.5, color: tx(0.62), marginBottom: 6 }}>— {f}</div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <PanelBtn onClick={() => advanceTo(1)} accent>Start Listening →</PanelBtn>
        </div>
      </div>
    );
  }

  function renderTracks() {
    const ratedCount = Object.values(trackRatings).filter(v => v > 0);
    const avg = ratedCount.length ? (ratedCount.reduce((a, b) => a + b, 0) / ratedCount.length).toFixed(2) : null;
    return (
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={lbl}>Track Notes</span>
          {avg && <span style={{ fontFamily: fonts.mono, fontSize: 10, color: tx(0.35) }}>avg {avg} / 5</span>}
        </div>

        {tracksLoading && !tracks && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...Array(10)].map((_, i) => (
              <div key={i} style={{ height: 38, borderRadius: 8, background: 'rgba(0,0,0,0.06)', animation: `ln-pulse 1.6s ease-in-out ${i * 0.06}s infinite` }} />
            ))}
          </div>
        )}

        {tracks && tracks.length === 0 && (
          <div style={{ paddingTop: 60, textAlign: 'center', fontFamily: fonts.mono, fontSize: 11, color: tx(0.28) }}>
            No tracklist found — continue with album notes
          </div>
        )}

        {tracks && tracks.map((t, i) => {
          const isOpen = openTrack === i;
          return (
            <div key={i} style={{ borderBottom: `1px solid ${bdr(0.07)}` }}>
              <div
                onClick={() => setOpenTrack(isOpen ? null : i)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', cursor: 'pointer', userSelect: 'none' }}
              >
                <span style={{ fontFamily: fonts.mono, fontSize: 10, color: tx(0.22), minWidth: 20 }}>{t.number}.</span>
                <span style={{ fontFamily: fonts.mono, fontSize: 12, color: tx(0.75), flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                {t.duration && <span style={{ fontFamily: fonts.mono, fontSize: 10, color: tx(0.22) }}>{TrackLength(t.duration)}</span>}
                <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0 }}>
                  <StarRating value={trackRatings[i] || 0} onChange={v => setTrackRatings(prev => ({ ...prev, [i]: v }))} size={14} />
                </div>
                <span style={{ fontFamily: fonts.mono, fontSize: 10, color: tx(0.25), flexShrink: 0, width: 12, textAlign: 'center' }}>
                  {isOpen ? '▴' : '▾'}
                </span>
              </div>
              {isOpen && (
                <div style={{ paddingBottom: 14, paddingLeft: 28, paddingRight: 4 }}>
                  <textarea
                    autoFocus
                    value={trackNotes[i] || ''}
                    onChange={e => {
                      setTrackNotes(prev => ({ ...prev, [i]: e.target.value }));
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    placeholder="notes for this track..."
                    rows={2}
                    style={{
                      fontFamily: fonts.mono, fontSize: 12, color: tx(0.7),
                      background: 'transparent', border: 'none',
                      borderBottom: `1px solid ${bdr(0.08)}`, outline: 'none',
                      width: '100%', padding: '4px 0', resize: 'none', overflow: 'hidden', display: 'block',
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
          <PanelBtn onClick={() => advanceTo(2)} accent>Continue →</PanelBtn>
        </div>
      </div>
    );
  }

  function renderNotes() {
    return (
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
          <StarRating value={rating} onChange={setRating} size={24} />
          <div style={{ width: 1, height: 20, background: bdr(0.1), flexShrink: 0 }} />
          {[['Masterpiece', Masterpiece, setMasterpiece], ['Favorite', Favorite, setFavorite]].map(([name, val, fn]) => (
            <label key={name} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
              <input type="checkbox" checked={val} onChange={e => fn(e.target.checked)} style={{ accentColor: '#c8d47a', cursor: 'pointer', width: 15, height: 15 }} />
              <span style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: val ? '#6a7a18' : tx(0.35), transition: 'color 0.15s' }}>{name}</span>
            </label>
          ))}
        </div>
        <div style={{ borderTop: `1px solid ${bdr(0.07)}`, paddingTop: 20, marginBottom: 16 }}>
          <div style={{ ...lbl, marginBottom: 14 }}>Album Notes</div>
          <textarea
            value={overallNotes}
            onChange={e => { setOverallNotes(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
            placeholder="How does this album feel as a whole? Themes, impressions, context..."
            style={{
              fontFamily: fonts.mono, fontSize: 14, lineHeight: 2, color: tx(0.82),
              background: 'transparent', border: 'none', outline: 'none',
              resize: 'none', width: '100%', minHeight: 200, overflow: 'hidden',
              display: 'block', boxSizing: 'border-box',
            }}
          />
          <div style={{ ...lbl, marginTop: 8, textAlign: 'right' }}>{overallNotes.length} chars</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <PanelBtn onClick={() => advanceTo(3)} disabled={overallNotes.trim().length < 10} accent>Continue →</PanelBtn>
        </div>
      </div>
    );
  }

  // Step 3 — Reflect: Echo-powered
  function renderEcho() {
    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 16 }}>
          {chatMessages.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
              <div style={{ ...lbl, marginBottom: 8 }}>Quick prompts</div>
              {['Reflect on my notes so far', 'What patterns do you notice?', 'Push back on something I said'].map(p => (
                <button key={p} onClick={() => sendChat(p)} style={{
                  fontFamily: fonts.mono, fontSize: 11, color: tx(0.55),
                  background: 'rgba(255,255,255,0.5)', border: `1px solid ${bdr(0.08)}`,
                  borderRadius: 20, padding: '10px 18px', cursor: 'pointer', textAlign: 'left', letterSpacing: '0.03em',
                }}>{p}</button>
              ))}
            </div>
          )}
          {chatMessages.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ ...lbl }}>{m.role === 'user' ? 'you' : 'echo'}</div>
              <div style={{ maxWidth: '80%', padding: '11px 16px', borderRadius: 16, background: 'rgba(255,255,255,0.5)', border: `1px solid ${bdr(0.08)}`, fontFamily: fonts.sans, fontSize: 13, lineHeight: 1.75, color: tx(0.85), whiteSpace: 'pre-wrap', fontStyle: m.role === 'ai' ? 'italic' : 'normal' }}>
                {m.text}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div style={{ display: 'flex', gap: 5, padding: '4px 2px' }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: tx(0.25), animation: `ln-dot 1.4s ease-in-out ${i * 0.22}s infinite` }} />)}
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <div style={{ borderTop: `1px solid ${bdr(0.07)}`, paddingTop: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            value={chatInput} onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
            placeholder="ask echo anything..."
            style={{ flex: 1, background: 'rgba(255,255,255,0.5)', border: `1px solid ${bdr(0.1)}`, borderRadius: 20, padding: '10px 18px', fontFamily: fonts.mono, fontSize: 11, color: tx(0.8), outline: 'none' }}
          />
          <PanelBtn onClick={() => sendChat()} disabled={!chatInput.trim() || chatLoading} style={{ padding: '10px 18px' }}>→</PanelBtn>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <button onClick={() => advanceTo(4)} style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: tx(0.25), background: 'none', border: 'none', cursor: 'pointer' }}>
            Skip →
          </button>
          <PanelBtn onClick={() => advanceTo(4)} accent>Continue →</PanelBtn>
        </div>
      </div>
    );
  }

  function renderTags() {
    function addTag(raw) {
      const tag = raw.trim().toLowerCase().replace(/\s+/g, '-');
      if (!tag || sessionTags.includes(tag)) return;
      setSessionTags(prev => [...prev, tag]);
      setTagInput('');
    }
    function removeTag(tag) { setSessionTags(prev => prev.filter(t => t !== tag)); }

    return (
      <div style={{ width: '100%' }}>
        <div style={{ ...lbl, marginBottom: 16 }}>Tags</div>
        {formatting && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: tx(0.25), animation: `ln-dot 1.4s ease-in-out ${i * 0.22}s infinite` }} />)}
          </div>
        )}
        {sessionTags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
            {sessionTags.map((tag, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: tx(0.6), border: `1px solid ${bdr(0.12)}`, borderRadius: 20, padding: '5px 12px', background: 'rgba(255,255,255,0.5)' }}>
                #{tag}
                <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tx(0.35), fontSize: 11, padding: 0, lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginBottom: 36 }}>
          <input
            value={tagInput} onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addTag(tagInput); }}
            placeholder="Add a tag..."
            style={{ flex: 1, background: 'rgba(255,255,255,0.5)', border: `1px solid ${bdr(0.1)}`, borderRadius: 20, padding: '9px 18px', fontFamily: fonts.mono, fontSize: 11, color: tx(0.78), outline: 'none' }}
          />
          <PanelBtn onClick={() => addTag(tagInput)} disabled={!tagInput.trim()}>Add</PanelBtn>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <PanelBtn onClick={() => advanceTo(5)} accent>Preview →</PanelBtn>
        </div>
      </div>
    );
  }

  function renderPreview() {
    return (
      <div style={{ width: '100%' }}>
        {!output && !formatting ? (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            {albumArt && <img src={albumArt} alt={brief?.album} style={{ width: 88, height: 88, borderRadius: 12, objectFit: 'cover', display: 'block', margin: '0 auto 24px', boxShadow: `0 10px 40px ${bdr(0.2)}` }} />}
            <div style={{ fontFamily: fonts.serif, fontSize: 26, color: tx(0.85), marginBottom: 4, lineHeight: 1.1 }}>{brief?.album}</div>
            <div style={{ fontFamily: fonts.mono, fontSize: 11, color: tx(0.38), marginBottom: 48 }}>{brief?.artist}</div>
            <PanelBtn onClick={doFormat} disabled={!overallNotes.trim()} accent style={{ padding: '14px 44px', fontSize: 13 }}>
              Format My Notes →
            </PanelBtn>
          </div>
        ) : formatting ? (
          <div style={{ textAlign: 'center', paddingTop: 80 }}>
            <div style={{ fontFamily: fonts.mono, fontSize: 11, color: tx(0.35), letterSpacing: '0.1em', marginBottom: 20 }}>Formatting notes…</div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: tx(0.25), animation: `ln-dot 1.4s ease-in-out ${i * 0.22}s infinite` }} />)}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${bdr(0.08)}` }}>
              {albumArt && <img src={albumArt} alt={brief?.album} style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover', flexShrink: 0, boxShadow: `0 6px 24px ${bdr(0.2)}` }} />}
              <div>
                <div style={{ fontFamily: fonts.serif, fontSize: 22, color: tx(0.88), lineHeight: 1.05, marginBottom: 4 }}>{brief?.album}</div>
                <div style={{ fontFamily: fonts.mono, fontSize: 11, color: tx(0.38), marginBottom: 10 }}>{brief?.artist}{brief?.year ? ' · ' + brief.year : ''}</div>
                <div style={{ display: 'flex', gap: 3 }}>
                  {[1,2,3,4,5].map(i => <span key={i} style={{ fontSize: 14, color: i <= Math.floor(rating) ? '#c8960a' : tx(0.15) }}>★</span>)}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 1.8, color: tx(0.55), maxWidth: 380 }}>{output.background}</div>
            </div>
            <div style={{ ...lbl, marginBottom: 12 }}>Album Notes</div>
            <div style={{ fontFamily: fonts.sans, fontSize: 14, lineHeight: 1.9, color: tx(0.88), whiteSpace: 'pre-wrap', marginBottom: 28 }}>{output.album_notes}</div>
            {output.horizon && (
              <div style={{ textAlign: 'center', fontFamily: fonts.mono, fontSize: 18, letterSpacing: '0.06em', color: tx(0.18), margin: '24px 0' }}>{output.horizon}</div>
            )}
            {output.track_notes && (
              <>
                <div style={{ ...lbl, marginBottom: 12, marginTop: 4 }}>Track Notes</div>
                <div style={{ fontFamily: fonts.sans, fontSize: 14, lineHeight: 1.9, color: tx(0.72), whiteSpace: 'pre-wrap', marginBottom: 28 }}>{output.track_notes}</div>
              </>
            )}
            {sessionTags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 20, borderTop: `1px solid ${bdr(0.07)}`, marginBottom: 32 }}>
                {sessionTags.map((t, i) => (
                  <span key={i} style={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: tx(0.38), border: `1px solid ${bdr(0.1)}`, borderRadius: 20, padding: '3px 10px', background: 'rgba(255,255,255,0.4)' }}>#{t}</span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16 }}>
              {!saved ? (
                <PanelBtn onClick={doSave} disabled={saving} accent style={{ padding: '12px 40px', fontSize: 12 }}>
                  {saving ? 'Saving…' : 'Save to Site →'}
                </PanelBtn>
              ) : (
                <>
                  <span style={{ fontFamily: fonts.mono, fontSize: 11, color: '#6a7a18', letterSpacing: '0.1em' }}>✓ Saved</span>
                  <a href="/session" style={{ fontFamily: fonts.mono, fontSize: 11, color: tx(0.35), letterSpacing: '0.08em', textDecoration: 'none' }}>← Back to session</a>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  const stepRenders = [renderHistory, renderTracks, renderNotes, renderEcho, renderTags, renderPreview];

  // ── LAYOUT ────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes ln-art-sweep { 0%{clip-path:inset(100% 0 0 0)} 100%{clip-path:inset(10% 0 0 0)} }
        .ln-art-loading { animation: ln-art-sweep 14s cubic-bezier(0.4,0,0.2,1) forwards; }
        .ln-art-done    { clip-path: inset(0%) !important; transition: clip-path 0.7s ease !important; }
        @keyframes ln-panel-appear { from{opacity:0;transform:translateY(14px) scale(0.99)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes ln-fade  { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes echo-breathe { 0%,100%{opacity:0.72;transform:scale(1)} 50%{opacity:1;transform:scale(1.012)} }
        @keyframes ln-pulse { 0%,100%{opacity:0.35} 50%{opacity:0.8} }
        @keyframes ln-dot   { 0%,80%,100%{opacity:0.18;transform:scale(0.7)} 40%{opacity:1;transform:scale(1)} }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 99px; }
        input::placeholder  { color: rgba(255,255,255,0.3); }
        textarea::placeholder { color: rgba(255,255,255,0.28); }
      `}</style>

      {/* ── EchoNetwork — landing + loading backdrop ── */}
      {(step === -1 || showLoadingScreen) && (
        <EchoNetwork
          searchQuery={step === -1 && !confirmPhase ? artistInput : ''}
          collapsed={step >= 0}
          albumArt={albumArt || pendingAlbum?.artUrl || ''}
          onCollapsed={() => {}}
        />
      )}

      {/* ── EchoOrb — compact 56px, shown once session starts ── */}
      {step >= 0 && (
        <EchoOrb
          albumArt={albumArt}
          mood={echoMood}
          active={echoActive}
          loading={researchState === 'loading'}
          onClick={researchState === 'done' ? () => setEchoChatOpen(v => !v) : undefined}
        />
      )}

      {/* EchoChat float panel — session only */}
      {researchState === 'done' && (
        <EchoChat
          open={echoChatOpen}
          onClose={() => setEchoChatOpen(false)}
          messages={echoChatHistory}
          onSend={msg => sendEchoChat(msg, 'chat')}
          loading={echoChatLoading}
          input={echoChatInput}
          setInput={setEchoChatInput}
        />
      )}

      {/* ── ALBUM SEARCH (step -1, no confirm) ── */}
      {step === -1 && !confirmPhase && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1, display: 'flex', flexDirection: 'column' }}>

          {/* Back button — top left only */}
          <div style={{ padding: '14px 28px', flexShrink: 0 }}>
            <a href="/session" style={{ fontFamily: fonts.mono, fontWeight: 600, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(26,21,32,0.5)', textDecoration: 'none', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(26,21,32,0.12)', background: 'rgba(245,242,236,0.6)', backdropFilter: 'blur(8px)' }}>← Session</a>
          </div>

          {/* Echo prompt + search */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: albums.length > 0 ? 'flex-start' : 'center', padding: albums.length > 0 ? '32px 24px' : '0 24px', overflowY: 'auto' }}>
            <div style={{ width: '100%', maxWidth: 520, marginBottom: albums.length > 0 ? 36 : 0 }}>
              <div style={{
                background: 'rgba(255,255,255,0.72)',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                borderRadius: 40,
                boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                padding: '32px 32px 28px',
                position: 'relative',
                overflow: 'hidden',
              }}>
              {/* Inner gloss — matches hub cards */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg, rgba(255,255,255,0.6) 0%, transparent 60%)', pointerEvents: 'none' }} />
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontFamily: fonts.sans, fontWeight: 700, fontSize: 26, color: '#1a1520', lineHeight: 1.2 }}>
                  what should we listen to?
                </div>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  value={artistInput}
                  onChange={e => setArtistInput(e.target.value)}
                  placeholder="search by artist..."
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(245,242,236,0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(26,21,32,0.14)', borderRadius: 14, padding: '16px 22px', fontFamily: fonts.sans, fontWeight: 400, fontSize: 16, color: '#1a1520', outline: 'none', boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(26,21,32,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(26,21,32,0.14)'}
                  autoFocus
                />
                {searching && (
                  <div style={{ position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)', fontFamily: fonts.mono, fontSize: 11, color: 'rgba(26,21,32,0.35)', letterSpacing: '0.06em' }}>searching…</div>
                )}
              </div>

              {artistInput.trim() && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                  {!showManual ? (
                    <button onClick={() => setShowManual(true)} style={{ fontFamily: fonts.mono, fontWeight: 600, fontSize: 11, letterSpacing: '0.08em', color: 'rgba(26,21,32,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      + type album manually
                    </button>
                  ) : (
                    <>
                      <input
                        value={manualAlbum} onChange={e => setManualAlbum(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
                        placeholder="album title..." autoFocus
                        style={{ flex: 1, background: 'rgba(245,242,236,0.8)', border: '1px solid rgba(26,21,32,0.14)', borderRadius: 8, padding: '9px 14px', fontFamily: fonts.mono, fontSize: 12, color: '#1a1520', outline: 'none' }}
                      />
                      <button onClick={handleManualSubmit} disabled={!manualAlbum.trim()}
                        style={{ background: '#1a1520', color: '#f5f2ec', border: 'none', borderRadius: 8, padding: '9px 18px', fontFamily: fonts.mono, fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', opacity: manualAlbum.trim() ? 1 : 0.3 }}>
                        Start →
                      </button>
                    </>
                  )}
                </div>
              )}
              </div> {/* end frosted card */}
            </div>

            {albums.length > 0 && (
              <div style={{ width: '100%', maxWidth: 960 }}>
                <div style={{ fontFamily: fonts.mono, fontWeight: 600, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(26,21,32,0.4)', marginBottom: 16, paddingLeft: 4 }}>
                  Albums by {albums[0]?.artist} — choose one to begin
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14 }}>
                  {albums.map((album, i) => (
                    <button key={i} onClick={() => handleAlbumPick(album)}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', borderRadius: 10, transition: 'transform 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <div style={{ borderRadius: 10, overflow: 'hidden', aspectRatio: '1', background: 'rgba(26,21,32,0.08)', marginBottom: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                        {album.art && <img src={album.art} alt={album.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                      </div>
                      <div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 12, color: '#1a1520', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.name}</div>
                      {album.year && <div style={{ fontFamily: fonts.mono, fontSize: 10, color: 'rgba(26,21,32,0.4)', marginTop: 2 }}>{album.year}</div>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!searching && artistInput.trim() && albums.length === 0 && (
              <div style={{ marginTop: 24, fontFamily: fonts.mono, fontSize: 12, color: 'rgba(26,21,32,0.4)', textAlign: 'center' }}>
                No results — try typing the album manually above
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CONFIRM Q1 — relationship ── */}
      {step === -1 && confirmPhase === 'q1' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            {pendingAlbum?.artUrl && (
              <img src={pendingAlbum.artUrl} alt={pendingAlbum.album} style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover', marginBottom: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }} />
            )}
            <div style={{ fontFamily: fonts.mono, fontWeight: 400, fontSize: 12, color: 'rgba(26,21,32,0.45)', letterSpacing: '0.06em', marginBottom: 8 }}>
              {pendingAlbum?.album}{pendingAlbum?.year ? ` · ${pendingAlbum.year}` : ''}
            </div>
            <div style={{ fontFamily: fonts.sans, fontWeight: 700, fontSize: 22, color: '#1a1520', marginBottom: 32, lineHeight: 1.3 }}>
              is this your first time with this one?
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              {['First listen', 'Revisit', 'Deep study', 'Something else'].map(opt => (
                <button key={opt} onClick={() => { setRelationship(opt); setConfirmPhase('q2'); }} style={{
                  fontFamily: fonts.sans, fontWeight: 600, fontSize: 14, color: '#1a1520',
                  background: 'rgba(245,242,236,0.72)', border: '1px solid rgba(26,21,32,0.18)',
                  borderRadius: 32, padding: '11px 22px', cursor: 'pointer',
                  backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,242,236,0.95)'; e.currentTarget.style.borderColor = 'rgba(26,21,32,0.4)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,242,236,0.72)'; e.currentTarget.style.borderColor = 'rgba(26,21,32,0.18)'; }}
                >{opt}</button>
              ))}
            </div>
            <button onClick={() => setConfirmPhase(null)} style={{ marginTop: 28, fontFamily: fonts.mono, fontSize: 12, color: 'rgba(26,21,32,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}>
              ← back
            </button>
          </div>
        </div>
      )}

      {/* ── CONFIRM Q2 — entry type ── */}
      {step === -1 && confirmPhase === 'q2' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: fonts.sans, fontWeight: 700, fontSize: 22, color: '#1a1520', marginBottom: 32, lineHeight: 1.3 }}>
              how did this one come to you?
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              {['Personal collection', 'Submission', 'Discovery'].map(opt => (
                <button key={opt} onClick={() => { setEntryType(opt); setConfirmPhase(null); handleAlbumSelect(pendingAlbum); }} style={{
                  fontFamily: fonts.sans, fontWeight: 600, fontSize: 14, color: '#1a1520',
                  background: 'rgba(245,242,236,0.72)', border: '1px solid rgba(26,21,32,0.18)',
                  borderRadius: 32, padding: '11px 22px', cursor: 'pointer',
                  backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,242,236,0.95)'; e.currentTarget.style.borderColor = 'rgba(26,21,32,0.4)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,242,236,0.72)'; e.currentTarget.style.borderColor = 'rgba(26,21,32,0.18)'; }}
                >{opt}</button>
              ))}
            </div>
            <button onClick={() => setConfirmPhase('q1')} style={{ marginTop: 28, fontFamily: fonts.mono, fontSize: 12, color: 'rgba(26,21,32,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}>
              ← back
            </button>
          </div>
        </div>
      )}

      {/* ── SESSION (step >= 0) ── */}
      {step >= 0 && (
        <>
          {/* White base */}
          <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: '#fff', pointerEvents: 'none' }} />

          {/* Grayscale faded art */}
          {albumArt && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 1, backgroundImage: `url(${albumArt})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'grayscale(1) brightness(0.55)', transform: 'scale(1.04)', pointerEvents: 'none' }} />
          )}

          {/* Full-color art sweeps up */}
          {albumArt && (
            <div
              className={researchState === 'loading' ? 'ln-art-loading' : 'ln-art-done'}
              style={{ position: 'fixed', inset: 0, zIndex: 2, backgroundImage: `url(${albumArt})`, backgroundSize: 'cover', backgroundPosition: 'center', transform: 'scale(1.04)', pointerEvents: 'none' }}
            />
          )}

          {/* Loading text overlay (minimal — EchoOrb provides the visual) */}
          {showLoadingScreen && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 52, pointerEvents: 'none' }}>
              {researchState === 'loading' && (
                <div key={phraseIndex} style={{ fontFamily: fonts.mono, fontSize: 11, color: 'rgba(26,21,32,0.5)', letterSpacing: '0.1em', animation: 'ln-fade 0.5s ease' }}>
                  {LOADING_PHRASES[phraseIndex % LOADING_PHRASES.length]}
                </div>
              )}
              {researchState === 'error' && (
                <div style={{ fontFamily: fonts.mono, fontSize: 11, color: '#ef4444' }}>{researchError}</div>
              )}
            </div>
          )}

          {/* ── Panel ── */}
          {!showLoadingScreen && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', boxSizing: 'border-box' }}>
              <div style={{
                width: '100%', maxWidth: 1100, height: 'calc(100vh - 48px)',
                position: 'relative', overflow: 'hidden', borderRadius: 22,
                border: `1px solid ${bdr(0.1)}`, boxShadow: `0 24px 80px ${bdr(0.35)}`,
                display: 'flex', animation: 'ln-panel-appear 0.5s cubic-bezier(0.34,1.2,0.64,1)',
              }}>

                {/* Blurred art background */}
                {albumArt ? (
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${albumArt})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(48px) saturate(1.4)', transform: 'scale(1.15)', zIndex: 0 }} />
                ) : <div style={{ position: 'absolute', inset: 0, background: '#1a1410', zIndex: 0 }} />}
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.10)', zIndex: 1 }} />

                <div style={{ position: 'relative', zIndex: 2, display: 'flex', width: '100%', height: '100%' }}>

                  {/* Sidebar */}
                  <div style={{ width: 220, flexShrink: 0, borderRight: `1px solid ${bdr(0.1)}`, display: 'flex', flexDirection: 'column', padding: '20px 0', background: 'rgba(0,0,0,0.08)' }}>
                    <a href="/session" style={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: tx(0.3), textDecoration: 'none', padding: '0 20px', marginBottom: 16, display: 'block' }}>← Session</a>

                    {albumArt && (
                      <div style={{ margin: '0 16px 16px', borderRadius: 12, overflow: 'hidden', aspectRatio: '1', boxShadow: `0 8px 32px ${bdr(0.3)}`, flexShrink: 0 }}>
                        <img src={albumArt} alt={brief?.album} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </div>
                    )}

                    {brief && (
                      <div style={{ padding: '0 16px', marginBottom: 16 }}>
                        <div style={{ fontFamily: fonts.serif, fontSize: 15, color: tx(0.9), lineHeight: 1.2, marginBottom: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{brief.album}</div>
                        <div style={{ fontFamily: fonts.mono, fontSize: 10, color: tx(0.45), letterSpacing: '0.05em', marginBottom: 10 }}>{brief.artist}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {[brief.year, brief.genre].filter(Boolean).map((t, i) => (
                            <span key={i} style={{ fontFamily: fonts.mono, fontSize: 9, color: tx(0.42), border: `1px solid ${bdr(0.12)}`, borderRadius: 4, padding: '2px 7px', background: 'rgba(255,255,255,0.18)' }}>{t}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {(relationship || entryType || elapsed > 0) && (
                      <div style={{ padding: '10px 16px', borderTop: `1px solid ${bdr(0.08)}`, borderBottom: `1px solid ${bdr(0.08)}`, marginBottom: 12 }}>
                        {relationship && <div style={{ fontFamily: fonts.mono, fontSize: 9, color: tx(0.38), letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>{relationship}</div>}
                        {entryType && <div style={{ fontFamily: fonts.mono, fontSize: 9, color: tx(0.38), letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>{entryType}</div>}
                        {elapsed > 0 && <div style={{ fontFamily: fonts.mono, fontSize: 9, color: tx(0.25), letterSpacing: '0.1em', marginTop: 4 }}>{SessionDuration(elapsed)}</div>}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 10px' }}>
                      {STEPS.map(s => {
                        const isPast = s.id < step;
                        const isCurrent = s.id === step;
                        const isReachable = s.id <= maxStep;
                        return (
                          <button key={s.id} onClick={() => isReachable && !isCurrent && setStep(s.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, width: '100%', textAlign: 'left', background: isCurrent ? 'rgba(255,255,255,0.18)' : 'transparent', border: 'none', cursor: isReachable && !isCurrent ? 'pointer' : 'default', transition: 'background 0.15s' }}>
                            <span style={{ fontFamily: fonts.mono, fontSize: 9, width: 14, textAlign: 'center', flexShrink: 0, color: isCurrent ? '#6a7a18' : isPast ? '#6a7a18' : tx(0.25) }}>
                              {isPast ? '✓' : s.id + 1}
                            </span>
                            <span style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.04em', color: isCurrent ? tx(0.88) : isPast ? tx(0.5) : tx(0.28), transition: 'color 0.15s' }}>
                              {s.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Main content */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: step === 3 ? 'hidden' : 'auto' }}>
                    <div style={{ flex: 1, padding: step === 3 ? '36px 48px 36px' : '40px 48px 56px', display: step === 3 ? 'flex' : 'block', flexDirection: step === 3 ? 'column' : undefined, overflowY: step === 3 ? 'hidden' : undefined }}>
                      {stepRenders[step]?.()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
