// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useState, useEffect, useRef } from 'react';
import { fetchTracklist, fetchAlbumArtUrl } from '../library/music_data_api';
import { serializeTracks } from '../library/entry_formatter';
import { useSessionDraft } from './useSessionDraft';

// Owns every API call and piece of state for a listen in progress:
// the record → the tracks → the notes and score → the preview → the save.
// Research is something you ask for on the album screen, not something that
// happens to you on the way in.
//
// step is passed in so the hook can assemble the preview when you reach it,
// and so the draft remembers which screen you were on (see useSessionDraft).

// The four screens of a listen, in order. The header draws them and the
// picker names the one a draft was left on.
export const SESSION_STEPS = ['Album', 'Tracks', 'Notes', 'Preview'];

// Where the record being listened to is kept between the picker and the
// session, and across a reload. Written by whoever starts a listen — the
// picker, the inbox — and read by /session as it opens.
export const PENDING_KEY = 'ln_pending_session';

export function useListeningSession({ step }) {
  // Research — optional, and only ever started by the button on the album screen
  const [brief, setBrief]                 = useState(null);
  const [researchState, setResearchState] = useState('idle');   // idle | loading | done | error
  const [researchError, setResearchError] = useState('');

  // The record
  const [albumArt, setAlbumArt]           = useState('');
  const [albumInput, setAlbumInput]       = useState('');
  const [artistName, setArtistName]       = useState('');
  const [year, setYear]                   = useState('');
  // Apple's genre for the record, carried from the picker. Falls back to the
  // briefing's, which is prose rather than a category, so it only stands in
  // when the record was typed in by hand and then researched.
  const [genre, setGenre]                 = useState('');
  // Nothing asks for this any more. Blank means Personal Library, and the
  // inbox sets Submission on a listen it starts. The entry editor is where it
  // gets corrected, like everything else about a finished entry.
  const [entryType, setEntryType]         = useState('');

  // Who sent it, and when they did. Only ever set by a listen started from the
  // inbox, where both are already known — the sender put their name on the
  // send and the row is stamped with the moment it arrived. Everywhere else
  // these stay empty and the entry editor is still the only way to fill them
  // in, which is what it was for: DECISIONS calls them corrections, the kind
  // you make a week later on remembering who gave you the record.
  const [receivedFrom, setReceivedFrom]   = useState('');
  const [receivedDate, setReceivedDate]   = useState('');

  // What gets written
  const [overallNotes, setOverallNotes]   = useState('');
  const [rating, setRating]               = useState(0);
  const [Masterpiece, setMasterpiece]     = useState(false);
  const [Favorite, setFavorite]           = useState(false);
  const [Formative, setFormative]         = useState(false);

  // Tracks
  const [tracks, setTracks]               = useState(null);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [trackNotes, setTrackNotes]       = useState({});
  const [trackRatings, setTrackRatings]   = useState({});
  const [trackFavorites, setTrackFavorites] = useState({});   // index -> true
  const [openTrack, setOpenTrack]         = useState(0);      // the track on screen

  // The reference — what has been asked of it this listen, and what it said.
  // Lives and dies with the record on the desk; nothing here is stored.
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput]       = useState('');
  const [chatLoading, setChatLoading]   = useState(false);

  // The draft — the browser's copy and the row in `drafts` — is kept by
  // useSessionDraft, below the timer, once everything it watches exists.
  const collectionIdRef = useRef('');

  // Preview
  const [formatting, setFormatting] = useState(false);
  const [output, setOutput]         = useState(null);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  // The row that came back. Held so the Preview can point at the entry it just
  // made rather than only saying it worked.
  const [savedEntry, setSavedEntry] = useState(null);

  // Which listen and which research request are the live ones. A tracklist or
  // a briefing that arrives after the record was changed must not land on the
  // new one.
  const listenRunRef   = useRef(0);
  const researchRunRef = useRef(0);

  // Session timer — runs while a record is open and stops once it is saved.
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!albumInput || saved) return undefined;
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [albumInput, saved]);

  // Whether anything has been written on this record — a note, a star, a mark.
  // Decides whether there is a draft worth keeping.
  const hasWriting = !!(
    overallNotes.trim() || rating || Masterpiece || Favorite || Formative
    || Object.values(trackNotes).some(n => n && n.trim())
    || Object.values(trackRatings).some(v => v > 0)
    || Object.values(trackFavorites).some(Boolean)
  );

  const draft = useSessionDraft({
    step, saved, hasWriting,
    values: {
      albumInput, artistName, year, albumArt, genre, entryType, receivedFrom, receivedDate,
      collectionIdRef, brief, tracks, overallNotes, trackNotes, trackRatings, trackFavorites,
      rating, Masterpiece, Favorite, Formative, elapsed,
    },
    setters: {
      setOverallNotes, setRating, setMasterpiece, setFavorite, setFormative, setElapsed,
      setTrackNotes, setTrackRatings, setTrackFavorites, setEntryType, setAlbumArt,
    },
  });

  // Assemble the preview on arrival. Nothing here reaches a model — format_post
  // is a local join of what was written — so it is redone every time the
  // Preview opens, which is what keeps it honest about edits made on the way
  // back through Notes.
  useEffect(() => {
    if (step !== SESSION_STEPS.length - 1 || saved) return;
    setOutput(null);
    if (overallNotes.trim()) doFormat();
  // Keyed on the step alone, on purpose: the preview is rebuilt on arrival,
  // not on every keystroke behind it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Opens a record: the tracklist, any saved draft, and whatever the browser
  // kept. Returns the step to open on. Pass null to clear the desk — the way
  // back to the picker.
  //
  // Two copies of a draft can exist, the row in `drafts` and the browser's
  // own, and the newer one wins. Pressing Save draft and then typing a little
  // more before the phone locked used to lose that little more.
  function beginListen(record) {
    const run = ++listenRunRef.current;
    researchRunRef.current++;

    setBrief(null);
    setResearchState('idle');
    setResearchError('');
    setTracks(null);
    setTracksLoading(false);
    setTrackNotes({});
    setTrackRatings({});
    setTrackFavorites({});
    setOpenTrack(0);
    setElapsed(0);
    setOverallNotes('');
    setRating(0);
    setMasterpiece(false);
    setFavorite(false);
    setFormative(false);
    setSaved(false);
    setSavedEntry(null);
    setOutput(null);
    draft.reset();
    setChatMessages([]);
    setChatInput('');
    collectionIdRef.current = '';

    if (!record?.album) {
      setAlbumInput(''); setArtistName(''); setYear(''); setAlbumArt('');
      setGenre(''); setEntryType(''); setReceivedFrom(''); setReceivedDate('');
      return 0;
    }

    const {
      album, artist = '', year: yr = '', artUrl = '', collectionId = null,
      genre: gen = '', entryType: et = '', receivedFrom: from = '',
      receivedDate: date = '', draft: savedDraft = null,
    } = record;

    collectionIdRef.current = collectionId || savedDraft?.collection_id || '';
    setAlbumInput(album);
    setArtistName(artist);
    setYear(yr || savedDraft?.year || '');
    setAlbumArt(artUrl || savedDraft?.album_art || '');
    setGenre(gen || savedDraft?.genre || '');
    setEntryType(et || savedDraft?.entry_type || '');
    setReceivedFrom(from || savedDraft?.received_from || '');
    setReceivedDate(date || (savedDraft?.received_date ? String(savedDraft.received_date).slice(0, 10) : ''));

    let rows = [];
    let openAt = 0;
    if (savedDraft) {
      rows = draft.hydrate(savedDraft);
      openAt = savedDraft.step || 0;
    }

    const local = draft.readLocal(album, artist);
    const localNewer = local && (!savedDraft || (local.savedAt || 0) > (Date.parse(savedDraft.updated_at) || 0));
    if (localNewer) {
      draft.applyLocal(local);
      if (!rows.length && Array.isArray(local.tracks) && local.tracks.length) rows = local.tracks;
      if (typeof local.step === 'number') openAt = local.step;
    }

    if (rows.length) {
      setTracks(rows.map(t => ({ number: t.number, title: t.title, duration: t.duration ?? null })));
    } else {
      setTracksLoading(true);
      fetchTracklist(album, artist, collectionIdRef.current || null).then(t => {
        if (run !== listenRunRef.current) return;
        setTracks(t || []);
        setTracksLoading(false);
      });
    }

    if (!artUrl && !savedDraft?.album_art) {
      fetchAlbumArtUrl(album, artist, yr).then(url => {
        if (url && run === listenRunRef.current) setAlbumArt(url);
      });
    }

    return Math.min(Math.max(0, openAt), SESSION_STEPS.length - 1);
  }

  // Asks for the briefing. Streams in as NDJSON — one whole brief per line,
  // each superseding the last — so the album screen fills in as it is written.
  // A record already in the briefings table comes back in one line and costs
  // nothing; refresh:true throws that copy away and researches again.
  async function doResearch({ refresh = false } = {}) {
    if (!albumInput || researchState === 'loading') return;
    const run = ++researchRunRef.current;
    setResearchState('loading');
    setResearchError('');
    setBrief(null);
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ album: albumInput, artist: artistName, refresh }),
      });
      if (!res.ok) {
        throw new Error(res.status === 401 ? 'Signed out — log in again.' : `Research failed (${res.status})`);
      }
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();   // hold back the partial line
        for (const line of lines) {
          if (!line.trim()) continue;
          const data = JSON.parse(line);
          if (data.error) throw new Error(data.error);
          if (run !== researchRunRef.current) return;
          setBrief(data);
          // Fills a gap, never overwrites: a record typed in by hand has no
          // year until the briefing finds one.
          if (data.year) setYear(prev => prev || String(data.year));
        }
      }
      if (run === researchRunRef.current) setResearchState('done');
    } catch (err) {
      if (run !== researchRunRef.current) return;
      setResearchError(err.message || 'Research failed.');
      setResearchState('error');
    }
  }

  // Every track that has anything on it, as one line the reference can read:
  // the title, what it scored, and what was written. Bare note text stripped
  // off which song each thought belonged to.
  function trackContextLines() {
    const list = tracks || [];
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

  // Asks the reference. What it knows is whatever is on the desk right now —
  // the record, the track on screen, every note so far — sent fresh each
  // time, so a question asked on track nine knows about track eight.
  async function sendChat(msg) {
    if (chatLoading) return;
    const message = (msg || chatInput).trim();
    if (!message) return;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: message }]);
    setChatLoading(true);
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: chatMessages,
          context: {
            album: albumInput, artist: artistName, year: year || brief?.year || '',
            currentTrack: tracks?.[openTrack]?.title || '',
            rating: rating ? `${rating} stars` : '',
            trackNotes: trackContextLines(),
            albumNotes: overallNotes.trim(),
          },
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setChatMessages(prev => [...prev, { role: 'ref', text: data.reply }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'ref', text: 'Something went wrong: ' + err.message }]);
    } finally { setChatLoading(false); }
  }

  // Returns what it assembled as well as setting it, so a save that arrives
  // before the preview's own assembly has landed can assemble and go on.
  async function doFormat() {
    if (!overallNotes.trim()) return null;
    setFormatting(true);
    try {
      const res = await fetch('/api/format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: brief || { album: albumInput, artist: artistName, year },
          notes: overallNotes, rating, Masterpiece, Favorite, Formative, entryType,
          trackNotes, trackRatings, tracks: tracks || [],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setOutput(data);
      return data;
    } catch (err) { alert('Formatting failed: ' + err.message); return null; }
    finally { setFormatting(false); }
  }

  async function doSave() {
    const out = output || await doFormat();
    if (!out) return;
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
          album: albumInput, artist: artistName, year: year || brief?.year || '',
          genre: genre || brief?.genre || '',
          entry_type: entryType || 'Personal Library',
          // The score and the mark are two different things and travel in two
          // different columns. A masterpiece with no stars set is five; that's
          // what the mark means.
          rating: rating ? rating + ' stars' : (Masterpiece ? '5 stars' : ''),
          favorite: Favorite,
          masterpiece: Masterpiece,
          formative: Formative,
          notes: out.album_notes,
          tracks: structuredTracks,
          track_notes: derived.track_notes,
          horizon: derived.horizon,
          album_art: albumArt,
          // Blank unless this listen came out of the inbox. create_entry runs
          // them through blankToNull, so an ordinary listen writes null here.
          received_from: receivedFrom,
          received_date: receivedDate,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSaved(true);
      setSavedEntry(data.entry || null);
      // The listen is an entry now; the draft — both copies — goes with it.
      await draft.finish();
    } catch (err) { alert('Save failed: ' + err.message); }
    finally { setSaving(false); }
  }

  return {
    // Research
    brief,
    researchState,
    researchError,
    // The record
    albumArt, setAlbumArt,
    albumInput, setAlbumInput,
    artistName, setArtistName,
    year, setYear,
    genre, setGenre,
    entryType, setEntryType,
    receivedFrom, setReceivedFrom,
    receivedDate, setReceivedDate,
    // Writing
    overallNotes, setOverallNotes,
    rating, setRating,
    Masterpiece, setMasterpiece,
    Favorite, setFavorite,
    Formative, setFormative,
    hasWriting,
    // Tracks
    tracks,
    tracksLoading,
    trackNotes, setTrackNotes,
    trackRatings, setTrackRatings,
    trackFavorites, setTrackFavorites,
    openTrack, setOpenTrack,
    // Draft
    draftState: draft.state,
    // The reference
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
    beginListen,
    doResearch,
    saveDraft: draft.save,
    doFormat,
    doSave,
    sendChat,
  };
}
