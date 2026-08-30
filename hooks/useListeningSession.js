// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
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

// The five screens of a listen, in order. Exported because the session sidebar
// draws them and the Listen page has to name the one a draft was left on.
export const SESSION_STEPS = ['Album Debrief', 'Track Notes', 'Album Notes', 'Score', 'Preview'];

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
  // Apple's genre for the record, carried from the album picker. Falls back to
  // the briefing's, which is prose rather than a category, so it only stands in
  // when the record was typed in by hand.
  const [genre, setGenre]                 = useState('');

  // Who sent it, and when they did. Only ever set by a listen started from the
  // inbox, where both are already known — the sender put their name on the
  // send and the row is stamped with the moment it arrived. Everywhere else
  // these stay empty and the entry editor is still the only way to fill them
  // in, which is what it was for: DECISIONS calls them corrections, the kind
  // you make a week later on remembering who gave you the record.
  //
  // This is the half of the loop the send flow closes. It used to be that
  // somebody sent you an album, you logged it, and then typed their name into
  // a field to record a fact the database already had.
  const [receivedFrom, setReceivedFrom]   = useState('');
  const [receivedDate, setReceivedDate]   = useState('');

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

  // Draft — the row in `drafts` this listen is being kept in, and what the
  // button in the sidebar is currently showing.
  const [draftState, setDraftState] = useState('idle');   // idle | saving | saved | error
  const draftIdRef      = useRef(null);
  const collectionIdRef = useRef('');

  // Preview
  const [formatting, setFormatting] = useState(false);
  const [output, setOutput]         = useState(null);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  // The row that came back. Held so the Preview can point at the entry it just
  // made rather than only saying it worked.
  const [savedEntry, setSavedEntry] = useState(null);

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

  // Format one step early, so the preview is already written by the time the
  // Score step is done rather than being watched for on arrival.
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

  // The whole tracklist with each song's marks on it — what gets written to
  // the drafts row, and what a resumed session reads back. Untouched songs stay
  // in, because a draft has to be able to rebuild the list itself; the entry
  // save filters them out, which is why it builds its own.
  function draftTrackRows() {
    return (tracks || []).map((t, i) => ({
      number: t.number || i + 1,
      title: t.title,
      duration: t.duration ?? null,
      rating: trackRatings[i] || 0,
      favorite: !!trackFavorites[i],
      note: (trackNotes[i] || '').trim(),
    }));
  }

  // Puts a saved draft back on the screen. Unlike restoreDraft below this one
  // does overwrite — it runs as part of starting the session, before anything
  // can have been typed, and the row is the reason the session was opened.
  function hydrateDraft(draft) {
    draftIdRef.current = draft.id;
    if (draft.album_art) setAlbumArt(draft.album_art);
    setOverallNotes(draft.notes || '');
    setRating(draft.rating || 0);
    setMasterpiece(!!draft.masterpiece);
    setFavorite(!!draft.favorite);
    setEntryType(draft.entry_type || '');
    setRelationship(draft.relationship || '');
    setGenre(draft.genre || '');
    setElapsed(draft.elapsed || 0);

    const rows = Array.isArray(draft.tracks) ? draft.tracks : [];
    if (rows.length) {
      setTracks(rows.map(t => ({ number: t.number, title: t.title, duration: t.duration ?? null })));
      const notes = {}, ratings = {}, favourites = {};
      rows.forEach((t, i) => {
        if (t.note)     notes[i] = t.note;
        if (t.rating)   ratings[i] = t.rating;
        if (t.favorite) favourites[i] = true;
      });
      setTrackNotes(notes);
      setTrackRatings(ratings);
      setTrackFavorites(favourites);
    }
    // The browser's own copy has nothing to add over the row we just read.
    restoredRef.current = true;
  }

  // Writes everything on screen to the drafts table. One row per record, so
  // hitting this twice in a listen updates rather than piles up.
  async function saveDraft() {
    const album = brief?.album || albumInput;
    if (!album || draftState === 'saving') return;
    setDraftState('saving');
    try {
      const res = await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          album,
          artist: brief?.artist || artistName || '',
          year: brief?.year || '',
          genre: genre || brief?.genre || '',
          entry_type: entryType,
          relationship,
          album_art: albumArt,
          collection_id: collectionIdRef.current,
          step,
          elapsed,
          rating,
          masterpiece: Masterpiece,
          favorite: Favorite,
          notes: overallNotes,
          tracks: draftTrackRows(),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      draftIdRef.current = data.draft?.id ?? draftIdRef.current;
      setDraftState('saved');
    } catch (err) {
      setDraftState('error');
      alert('Saving the draft failed: ' + err.message);
    }
  }

  // The button says SAVED for a moment and then goes back to offering. Long
  // enough to read, short enough that it's ready again when you next reach it.
  useEffect(() => {
    if (draftState !== 'saved' && draftState !== 'error') return;
    const t = setTimeout(() => setDraftState('idle'), 2600);
    return () => clearTimeout(t);
  }, [draftState]);

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
    const draft = opts.draft || null;
    collectionIdRef.current = collectionId || '';
    draftIdRef.current = draft?.id ?? null;

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
    setSavedEntry(null);
    setOutput(null);
    setChatMessages([]);
    restoredRef.current = false;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    // Resuming: everything above just cleared the session, so put the saved
    // one back before any of it can be seen.
    const draftTracks = Array.isArray(draft?.tracks) ? draft.tracks : [];
    if (draft) hydrateDraft(draft);

    // Neither of these depends on the briefing, so they run in parallel with it.
    if (!existingArt) {
      fetchAlbumArtUrl(album, artist, '').then(url => { if (url) setAlbumArt(url); });
    }
    // A draft carries its own tracklist. Asking Apple again would be a second
    // chance to come back in a different order, and every note is filed by
    // position — so the saved list is the one a resumed listen keeps.
    if (!draftTracks.length) {
      setTracksLoading(true);
      fetchTracklist(album, artist, collectionId).then(t => { setTracks(t || []); setTracksLoading(false); });
    }

    // Inherit the call the album picker started; if there isn't one, start now.
    if (!takeOver(album, artist, onResearchUpdate)) {
      handOff(album, artist);
      takeOver(album, artist, onResearchUpdate);
    }
  }

  // Throw away the stored briefing and research the album again. Deliberately
  // does not touch notes or ratings — only the briefing is replaced, so
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

  // Every track that has anything on it, as one line Echo can actually read:
  // the title, what it scored, and what was written. Sending bare note text
  // stripped off which song each thought belonged to.
  function trackContextLines() {
    const list = tracks || [];
    if (!list.length) return Object.values(trackNotes).filter(Boolean);
    return list.map((t, i) => {
      const note = (trackNotes[i] || '').trim();
      const stars = trackRatings[i] || 0;
      const fav = !!trackFavorites[i];
      if (!note && !stars && !fav) return null;
      const marks = [];
      if (stars) marks.push(`${stars}★`);
      if (fav) marks.push('favourite');
      return `${t.number || i + 1}. ${t.title}${marks.length ? ` (${marks.join(', ')})` : ''}${note ? ` — ${note}` : ''}`;
    }).filter(Boolean);
  }

  // Reflect chat — the column beside Track Notes and Album Notes
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
          // Mid-listen the job is to push on the track just written about;
          // by Album Notes it's to surface the pattern across all of them.
          phase: step >= 2 ? 'reflection' : 'notation',
          conversationHistory: chatMessages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
          entryContext: {
            album: brief?.album || '', artist: brief?.artist || '', year: brief?.year || '',
            entryType, relationship,
            trackNotes: trackContextLines(),
            albumNotes: overallNotes.trim(),
            rating: rating ? rating + ' stars' : '',
          },
          echoMemory: '',
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      // Keeping the thread pinned to the newest message is ReflectChat's job —
      // it owns the scroller, and scrolling into view from here dragged the
      // panel behind the column along with it.
      setChatMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
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
          genre: genre || brief.genre || '',
          entry_type: entryType || 'Personal Library',
          relationship: relationship || '',
          // The score and the mark are two different things and travel in two
          // different columns. Writing 'Masterpiece' into rating threw the
          // stars away, left the masterpiece column false, and drew no stars
          // at all on the entry — parseFloat can't read a word. A masterpiece
          // with no stars set is five; that's what the mark means.
          rating: rating ? rating + ' stars' : (Masterpiece ? '5 stars' : ''),
          favorite: Favorite,
          masterpiece: Masterpiece,
          notes: output.album_notes,
          tracks: structuredTracks,
          track_notes: derived.track_notes,
          horizon: derived.horizon,
          album_art: albumArt,
          post_link: '',
          // Blank unless this listen came out of the inbox. create_entry runs
          // them through blankToNull, so an ordinary listen writes null here
          // exactly as it did before these existed.
          received_from: receivedFrom,
          received_date: receivedDate,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSaved(true);
      setSavedEntry(data.entry || null);
      localStorage.removeItem('ln_session_draft');
      // The listen is an entry now. Leaving the draft behind would offer it
      // back on the Listen page as though it were still unfinished.
      if (draftIdRef.current) {
        fetch(`/api/drafts/${draftIdRef.current}`, { method: 'DELETE' }).catch(() => {});
        draftIdRef.current = null;
      }
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
    genre, setGenre,
    receivedFrom, setReceivedFrom,
    receivedDate, setReceivedDate,
    // Tracks
    tracks,
    tracksLoading,
    trackNotes, setTrackNotes,
    trackRatings, setTrackRatings,
    trackFavorites, setTrackFavorites,
    openTrack, setOpenTrack,
    // Draft
    draftState,
    // Reflect chat
    chatMessages,
    chatInput, setChatInput,
    chatLoading,
    // Preview
    formatting,
    output,
    saving,
    saved,
    savedEntry,
    // Timer
    elapsed,
    // Functions
    doResearch,
    refreshResearch,
    saveDraft,
    doFormat,
    doSave,
    sendChat,
    restoreDraft,
  };
}
