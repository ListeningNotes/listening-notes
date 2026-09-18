// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// hooks/useSessionDraft.js
// What keeps a listen from being lost: the browser's own copy of what has
// been written, and the row in `drafts` that follows it a few seconds behind.
// Lifted out of useListeningSession, which owns the listen itself — the
// record, the tracks, the notes, the score — and hands this everything it
// watches plus the setters a restored draft writes back through.
//
// Two copies, and the newer one wins. The browser's is written on every
// change and costs nothing; the row is debounced and survives the browser.
// A listen with nothing written yet never overwrites either, so leaving one
// record for another does not throw away notes on the first.
'use client';
import { useState, useEffect, useRef } from 'react';

// The browser's own copy of what has been written, so a closed tab or a locked
// phone loses nothing. One record at a time; a listen with nothing written
// yet never overwrites it, so leaving one record for another does not throw
// away notes on the first before a word has been typed on the second.
const DRAFT_KEY = 'ln_session_draft';

export function useSessionDraft({ step, saved, hasWriting, values, setters }) {
  const {
    albumInput, artistName, year, albumArt, genre, entryType, receivedFrom, receivedDate,
    receivedFromUrl = '', creditPrivate = false, submissionId = null,
    collectionIdRef, tracks, overallNotes, trackNotes, trackRatings, trackFavorites,
    rating, Masterpiece, Favorite, Formative, elapsedRef,
  } = values;
  const {
    setOverallNotes, setRating, setFavorite, setFormative,
    setTrackNotes, setTrackRatings, setTrackFavorites, setEntryType, setAlbumArt,
    setTrouble,
  } = setters;

  // Draft — the row in `drafts` this listen is being kept in. It writes itself
  // a few seconds after the last change, so there is no button to remember;
  // the in-flight write is held so a save of the entry can wait for it before
  // deleting the row rather than racing it.
  const [draftState, setDraftState] = useState('idle');   // idle | saving | saved | error
  const draftIdRef      = useRef(null);
  const draftFlightRef  = useRef(null);

  // Autosave to the browser whenever anything changes. The tracklist rides
  // along so a restored listen files every note under the song it was written
  // about — asking Apple again could hand the list back in a different order.
  //
  // **Held back a third of a second, since 2026-09-16.** It ran on every
  // keystroke, and what it does on each one is serialise the whole listen —
  // every track, every note — and write it to disk, synchronously, on the
  // thread that is drawing the letter you just typed. A third of a second is
  // far below the three the row takes and still lands long before a phone can
  // lock, so it loses nothing and stops sitting inside the typing.
  useEffect(() => {
    if (!albumInput || !hasWriting || saved) return undefined;
    const t = setTimeout(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        album: albumInput, artist: artistName, year, albumArt,
        tracks: tracks || [],
        overallNotes, trackNotes, trackRatings, trackFavorites,
        rating, Masterpiece, Favorite, Formative, entryType, step,
        savedAt: Date.now(),
      }));
    } catch { /* storage full or blocked — the draft button still works */ }
    }, 300);
    return () => clearTimeout(t);
  }, [albumInput, artistName, year, albumArt, tracks, overallNotes, trackNotes, trackRatings, trackFavorites, rating, Masterpiece, Favorite, Formative, entryType, step, hasWriting, saved]);

  // The row in `drafts` follows the writing. Debounced, because every keystroke
  // is a change and a write per keystroke is a flood; three seconds after the
  // last one is soon enough that a phone locking mid-sentence still has the
  // sentence. The browser's own copy above is what covers the seconds between.
  useEffect(() => {
    if (!albumInput || !hasWriting || saved) return undefined;
    const t = setTimeout(() => { save({ quiet: true }); }, 3000);
    return () => clearTimeout(t);
  // save is deliberately not a dependency: it is remade on every render,
  // and listing it would reset the three seconds on renders that changed
  // nothing worth saving.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumInput, overallNotes, trackNotes, trackRatings, trackFavorites, rating, Masterpiece, Favorite, Formative, entryType, step, hasWriting, saved]);

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

  // Puts a saved draft's writing back on the screen, and returns its tracklist.
  function hydrate(draft) {
    draftIdRef.current = draft.id;
    setOverallNotes(draft.notes || '');
    setRating(draft.rating || 0);
    // Masterpiece is not restored and has no setter: it is read off the track
    // ratings, which are restored below, so putting a saved value back would be
    // putting back an answer that may no longer match its own working.
    setFavorite(!!draft.favorite);
    setFormative(!!draft.formative);
    elapsedRef.current = draft.elapsed || 0;

    const rows = Array.isArray(draft.tracks) ? draft.tracks : [];
    const notes = {}, ratings = {}, favourites = {};
    rows.forEach((t, i) => {
      if (t.note)     notes[i] = t.note;
      if (t.rating)   ratings[i] = t.rating;
      if (t.favorite) favourites[i] = true;
    });
    setTrackNotes(notes);
    setTrackRatings(ratings);
    setTrackFavorites(favourites);
    return rows;
  }

  // The browser's copy, if it is about this record.
  function readLocal(album, artist) {
    try {
      const s = JSON.parse(localStorage.getItem(DRAFT_KEY));
      if (!s || s.album !== album) return null;
      if (artist && s.artist && s.artist !== artist) return null;
      return s;
    } catch { return null; }
  }

  function applyLocal(s) {
    setOverallNotes(s.overallNotes || '');
    setTrackNotes(s.trackNotes || {});
    setTrackRatings(s.trackRatings || {});
    setTrackFavorites(s.trackFavorites || {});
    setRating(s.rating || 0);
    // Same as above: the ratings restored two lines up already say it.
    setFavorite(!!s.Favorite);
    setFormative(!!s.Formative);
    if (s.entryType) setEntryType(s.entryType);
    if (s.albumArt) setAlbumArt(prev => prev || s.albumArt);
  }

  // Writes everything on screen to the drafts table. One row per record, so
  // writing twice in a listen updates rather than piles up. quiet:true is the
  // automatic save — it does not say anything if it fails, because the next
  // change will try again and the browser's copy is still there.
  //
  // Answers true when the row is written and false when it is not, which is
  // how the ✕ knows whether it is allowed to leave (see endListen in
  // app/session/page.js). It used to answer nothing at all, and got away with
  // it only because the failure raised a window.alert — a blocking one, which
  // held the leaving where it stood until the alert was closed. Take the
  // blocking away and the listen would have shut over the top of its own bad
  // news, 2026-09-18.
  async function save({ quiet = false } = {}) {
    const album = albumInput;
    // Nothing to write is not a failure: there is no reason to keep somebody
    // on a screen because a record they touched and left had nothing on it.
    if (!album || saved) return true;
    if (draftFlightRef.current) await draftFlightRef.current;
    setDraftState('saving');
    const flight = (async () => {
      const res = await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          album,
          artist: artistName || '',
          year,
          genre,
          entry_type: entryType,
          album_art: albumArt,
          collection_id: collectionIdRef.current,
          step,
          elapsed: elapsedRef.current,
          rating,
          masterpiece: Masterpiece,
          favorite: Favorite,
          formative: Formative,
          notes: overallNotes,
          tracks: draftTrackRows(),
          received_from: receivedFrom,
          received_date: receivedDate,
          received_from_url: receivedFromUrl,
          credit_private: creditPrivate,
          submission_id: submissionId,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      draftIdRef.current = data.draft?.id ?? draftIdRef.current;
    })();
    draftFlightRef.current = flight;
    try {
      await flight;
      setDraftState('saved');
      return true;
    } catch (err) {
      setDraftState('error');
      // Only when it was asked for. The automatic save stays silent on
      // purpose — the next change tries again and the browser's copy is
      // still there — and pressing × to leave is not the automatic one, so
      // this is what spoke on 2026-09-18 when a half star met an integer
      // column. It said `invalid input syntax for type integer: "4.5"` in
      // the browser's own black box, which is what this replaced.
      if (!quiet) {
        setTrouble?.({
          says: 'That did not save to the server. Your writing is safe on this phone, and it is what a finished listen is built from.',
          because: err.message,
        });
      }
      return false;
    } finally {
      if (draftFlightRef.current === flight) draftFlightRef.current = null;
    }
  }

  // The button says SAVED for a moment and then goes back to offering. Long
  // enough to read, short enough that it's ready again when you next reach it.
  useEffect(() => {
    if (draftState !== 'saved' && draftState !== 'error') return undefined;
    const t = setTimeout(() => setDraftState('idle'), 2600);
    return () => clearTimeout(t);
  }, [draftState]);

  // A fresh record: nothing kept, nothing in flight to wait for.
  function reset() {
    setDraftState('idle');
    draftIdRef.current = null;
  }

  // The listen is an entry now. Leaving the draft behind would offer it back
  // on the picker as though it were still unfinished. An automatic save may
  // still be in the air; wait for it, or it lands after this.
  async function finish() {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* nothing to clear */ }
    if (draftFlightRef.current) { try { await draftFlightRef.current; } catch { /* already reported */ } }
    if (draftIdRef.current) {
      fetch(`/api/drafts/${draftIdRef.current}`, { method: 'DELETE' }).catch(() => {});
      draftIdRef.current = null;
    }
  }

  return { state: draftState, save, hydrate, readLocal, applyLocal, reset, finish };
}
