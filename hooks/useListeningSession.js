'use client';
import { useState, useEffect, useRef } from 'react';
import { fetchTracklist, fetchAlbumArtUrl } from '../library/music_data_api';
import { handOff, takeOver } from '../library/baton';
import { serializeTracks } from '../library/entry_formatter';

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
  const [trackFavorites, setTrackFavorites] = useState({});   // index -> true
  const [openTrack, setOpenTrack]         = useState(null);

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

  // Start the timer as soon as the session begins. The panel now opens before
  // the briefing has finished, so waiting on 'done' would undercount the listen.
  useEffect(() => {
    if (researchState !== 'idle' && !timerRef.current) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
  }, [researchState]);

  // Autosave draft to localStorage whenever notes change
  useEffect(() => {
    if (!brief) return;
    const draft = {
      album: brief.album, artist: brief.artist, year: brief.year,
      albumArt, overallNotes, trackNotes, trackRatings, trackFavorites,
      rating, Masterpiece, Favorite, entryType, relationship,
    };
    localStorage.setItem('ln_session_draft', JSON.stringify(draft));
    // brief is a dependency because it now arrives after the user can type —
    // without it, notes written before the briefing landed would go unsaved.
  }, [brief, overallNotes, trackNotes, trackRatings, trackFavorites, rating, Masterpiece, Favorite, entryType, relationship]);

  // Format one step early. The tags on step 4 are produced by this call, so
  // starting it at step 3 means they're already there when the user arrives
  // instead of being watched for.
  const formattedNotesRef = useRef('');
  useEffect(() => {
    if (step >= 3 && !output && !formatting && brief && overallNotes.trim()) {
      formattedNotesRef.current = overallNotes;
      doFormat();
    }
  }, [step]);

  // Going back and editing the notes after a format leaves the output stale —
  // drop it so the next step re-runs against what's actually written.
  useEffect(() => {
    if (output && overallNotes !== formattedNotesRef.current) setOutput(null);
  }, [overallNotes]);

  // Seed tags from formatted output on first format
  useEffect(() => {
    if (output?.tags?.length && sessionTags.length === 0) setSessionTags(output.tags);
  }, [output]);

  // Restores a saved draft without clobbering anything already typed. The
  // session is now usable before the briefing lands, so this can fire while
  // the user is mid-sentence — every field yields to what's already there.
  function restoreDraft(albumName) {
    try {
      const s = JSON.parse(localStorage.getItem('ln_session_draft'));
      if (!s || s.album !== albumName) return;
      setOverallNotes(prev => prev || s.overallNotes || '');
      setTrackNotes(prev => (Object.keys(prev).length ? prev : (s.trackNotes || {})));
      setTrackRatings(prev => (Object.keys(prev).length ? prev : (s.trackRatings || {})));
      setTrackFavorites(prev => (Object.keys(prev).length ? prev : (s.trackFavorites || {})));
      setRating(prev => prev || s.rating || 0);
      setMasterpiece(prev => prev || s.Masterpiece || false);
      setFavorite(prev => prev || s.Favorite || false);
      setEntryType(prev => prev || s.entryType || '');
      setRelationship(prev => prev || s.relationship || '');
    } catch {}
  }

  // Each snapshot the baton hands us. The brief arrives in pieces, so this
  // fires many times — the last one carries done:true.
  const restoredRef = useRef(false);
  function onResearchUpdate(partial, error, finished) {
    if (error) {
      setResearchError(error);
      setResearchState('error');
      return;
    }
    if (partial) {
      setBrief(partial);
      if (!restoredRef.current) { restoredRef.current = true; restoreDraft(partial.album); }
      if (partial.done) setResearchState('done');
    } else if (finished) {
      setResearchState('done');
    }
  }

  // Starts the session's data fetches and returns straight away. The briefing
  // streams in behind the user rather than blocking entry to the session.
  function doResearch(album, artist, existingArt, opts = {}) {
    const collectionId = opts.collectionId || null;

    setResearchState('loading');
    setResearchError('');
    setBrief(null);
    setTracks(null);
    setTrackNotes({});
    setTrackRatings({});
    setTrackFavorites({});
    setElapsed(0);
    setOverallNotes('');
    setRating(0);
    setMasterpiece(false);
    setFavorite(false);
    setSaved(false);
    setOutput(null);
    setSessionTags([]);
    setChatMessages([]);
    restoredRef.current = false;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    // Neither of these depends on the briefing, so they run in parallel with it.
    if (!existingArt) {
      fetchAlbumArtUrl(album, artist, '').then(url => { if (url) setAlbumArt(url); });
    }
    setTracksLoading(true);
    fetchTracklist(album, artist, collectionId).then(t => { setTracks(t || []); setTracksLoading(false); });

    // Inherit the call the album picker started; if there isn't one, start now.
    if (!takeOver(album, artist, onResearchUpdate)) {
      handOff(album, artist);
      takeOver(album, artist, onResearchUpdate);
    }
  }

  // Throw away the stored briefing and research the album again. Deliberately
  // does not touch notes, ratings or tags — only the briefing is replaced, so
  // this is safe to hit in the middle of a listen.
  function refreshResearch() {
    const album  = albumInput || brief?.album;
    const artist = artistName || brief?.artist;
    if (!album) return;
    setResearchState('loading');
    setResearchError('');
    setBrief(null);
    handOff(album, artist, { refresh: true });
    takeOver(album, artist, onResearchUpdate);
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
      // Tracks are saved as data, and the two text shapes are derived from that
      // same list — so the stars in the prose and the bars in the horizon can't
      // disagree the way they used to.
      const structuredTracks = (tracks || []).map((t, i) => ({
        number: t.number || i + 1,
        title: t.title,
        rating: trackRatings[i] || 0,
        favorite: !!trackFavorites[i],
        note: (trackNotes[i] || '').trim(),
      })).filter(t => t.rating > 0 || t.note || t.favorite);
      const derived = serializeTracks(structuredTracks);

      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          album: brief.album, artist: brief.artist, year: brief.year,
          entry_type: entryType || 'Personal Library',
          relationship: relationship || '',
          rating: Masterpiece ? 'Masterpiece' : (rating ? rating + ' stars' : ''),
          favorite: Favorite,
          notes: output.album_notes,
          tracks: structuredTracks,
          track_notes: derived.track_notes,
          tags: sessionTags,
          horizon: derived.horizon,
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
    trackFavorites, setTrackFavorites,
    openTrack, setOpenTrack,
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
    refreshResearch,
    doFormat,
    doSave,
    sendChat,
    restoreDraft,
  };
}
