'use client';
import { useState, useEffect, useRef } from 'react';
import { fetchTracklist, fetchAlbumArtUrl } from '../library/music_data_api';
import { LOADING_PHRASES } from '../library/session_timers';

// Owns every API call and piece of state for an active listening session:
// research → note-taking → Echo chat → formatting → saving.
//
// step is passed in so the hook can auto-format when the user reaches
// the preview step (step 4).

export function useListeningSession({ step }) {
  // Research
  const [brief, setBrief]                 = useState(null);
  const [researchState, setResearchState] = useState('idle');
  const [researchError, setResearchError] = useState('');
  const [phraseIndex, setPhraseIndex]     = useState(0);

  // Entry data
  const [albumArt, setAlbumArt]           = useState('');
  const [albumInput, setAlbumInput]       = useState('');
  const [artistName, setArtistName]       = useState('');
  const [overallNotes, setOverallNotes]   = useState('');
  const [rating, setRating]               = useState(0);
  const [Masterpiece, setMasterpiece]     = useState(false);
  const [Favorite, setFavorite]           = useState(false);
  const [entryType, setEntryType]         = useState('');
  const [relationship, setRelationship]   = useState('');

  // Tracks
  const [tracks, setTracks]               = useState(null);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [trackNotes, setTrackNotes]       = useState({});
  const [trackRatings, setTrackRatings]   = useState({});
  const [openTrack, setOpenTrack]         = useState(null);

  // Echo debrief + floating chat
  const [echoDebrief, setEchoDebrief]               = useState(null);
  const [echoDebriefLoading, setEchoDebriefLoading] = useState(false);

  // Reflect chat (step 3 quick-prompts)
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

  // Session timer
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  // Start timer once research completes
  useEffect(() => {
    if (researchState === 'done' && !timerRef.current) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
  }, [researchState]);

  // Autosave draft to localStorage whenever notes change
  useEffect(() => {
    if (!brief) return;
    const draft = {
      album: brief.album, artist: brief.artist, year: brief.year,
      albumArt, overallNotes, trackNotes, trackRatings,
      rating, Masterpiece, Favorite, entryType, relationship,
    };
    localStorage.setItem('ln_session_draft', JSON.stringify(draft));
  }, [overallNotes, trackNotes, trackRatings, rating, Masterpiece, Favorite, entryType, relationship]);

  // Cycle loading phrases while research is in flight
  useEffect(() => {
    if (researchState !== 'loading') return;
    const interval = setInterval(() => setPhraseIndex(i => (i + 1) % LOADING_PHRASES.length), 1800);
    return () => clearInterval(interval);
  }, [researchState]);

  // Auto-format when the user reaches the preview step
  useEffect(() => {
    if (step === 4 && !output && !formatting && brief && overallNotes.trim()) doFormat();
  }, [step]);

  // Seed tags from formatted output on first format
  useEffect(() => {
    if (output?.tags?.length && sessionTags.length === 0) setSessionTags(output.tags);
  }, [output]);

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

  // opts allows the echo page to pass relationship/entryType at call-time,
  // avoiding the stale-closure problem when these values are set from
  // localStorage immediately before doResearch is called.
  async function doResearch(album, artist, existingArt, opts = {}) {
    const relToUse = opts.relationship !== undefined ? opts.relationship : relationship;
    const etToUse  = opts.entryType  !== undefined ? opts.entryType  : entryType;

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
              entryType: etToUse, relationship: relToUse,
              trackNotes: [], rating: '', tags: [],
            },
            echoMemory: '',
          }),
        });
        const echoData = await echoRes.json();
        if (!echoData.error) {
          setEchoDebrief(echoData.reply);
        }
      } catch {}
      setEchoDebriefLoading(false);

    } catch (err) {
      setResearchError(err.message || 'Research failed.');
      setResearchState('error');
    }
  }

  // Reflect chat — step 3 quick-prompts
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

  return {
    // Research
    brief,
    researchState,
    researchError,
    phraseIndex,
    // Entry data
    albumArt, setAlbumArt,
    albumInput, setAlbumInput,
    artistName, setArtistName,
    overallNotes, setOverallNotes,
    rating, setRating,
    Masterpiece, setMasterpiece,
    Favorite, setFavorite,
    entryType, setEntryType,
    relationship, setRelationship,
    // Tracks
    tracks,
    tracksLoading,
    trackNotes, setTrackNotes,
    trackRatings, setTrackRatings,
    openTrack, setOpenTrack,
    // Echo
    echoDebrief,
    echoDebriefLoading,
    // Reflect chat
    chatMessages,
    chatInput, setChatInput,
    chatLoading,
    chatEndRef,
    // Tags
    sessionTags, setSessionTags,
    tagInput, setTagInput,
    // Preview
    formatting,
    output,
    saving,
    saved,
    // Timer
    elapsed,
    // Functions
    doResearch,
    doFormat,
    doSave,
    sendChat,
    restoreDraft,
  };
}
