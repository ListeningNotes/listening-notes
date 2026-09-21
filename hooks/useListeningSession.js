// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useState, useEffect, useRef } from 'react';
import { fetchTracklist, fetchAlbumFacts, fetchAlbumArtUrl } from '../library/music_data_api';
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
// Overview · Tracks · Album · Preview.
//
// "Notes" became "Album" on 2026-09-18: that screen is where the record gets
// its score, its marks and the writing that is *about the album*, which is
// what the word Album says.
//
// Overview is a different screen behind the same word. It was the cover, the
// title and the artist — the beacon one row up, said larger — and it is the
// record's contents now: the facts and the tracklist
// (steps/RecordContents.js). It was folded into Tracks for an hour, as one
// step with two faces, and Miyel put it back the same day for a reason that
// is about the gesture rather than the shape: "I do miss scrolling
// horizontally through tracks and between steps." A face is not a step, so a
// swipe could not reach it, and a screen you can only arrive at by pressing
// its name is not on the same footing as the ones either side of it.
//
// **The stored value is the index, not the word.** The count went four → three
// → four across two hours, which is why there are two migrations about it:
// 017 shifted every draft down, 018 shifts it back. A copy that gets both at
// once nets out at nothing, which is correct; this one got them an hour apart,
// which is also correct.
export const SESSION_STEPS = ['Overview', 'Tracks', 'Album', 'Preview'];

// Where the record being listened to is kept between the picker and the
// session, and across a reload. Written by whoever starts a listen — the
// picker, the inbox — and read by /session as it opens.
export const PENDING_KEY = 'ln_pending_session';

// And what is shouted when it changes. A `storage` event fires in every tab
// EXCEPT the one that wrote the key, and the desk and the listen are always
// the same tab — the listen opens as a layer over the desk. So the desk only
// learned a record had been picked up when something else caused it to render,
// which on the picker is nothing at all: the picker and the listen are one
// route, so choosing a draft changes no address. Miyel saw that as the door
// not lighting until she clicked something else, 2026-09-16.
export const PENDING_EVENT = 'ln-pending-session';

export function saidSoAboutTheDesk() {
  try { window.dispatchEvent(new Event(PENDING_EVENT)); } catch { /* no window */ }
}

// ── And what is shouted when a listen becomes an entry ─────────────────────
// The record leaves the beacon and falls into the journal underneath it
// (Miyel's beacon brief, item 4). That is a thing the *cross* does, and the
// cross is the page the listen is sitting on top of — it never unmounted, so
// it is right there waiting to be told.
//
// A CustomEvent rather than the bare one above, because this one carries
// something: the record that was just posted and its slug, so the pane can
// drop that cover into the wall and put that record on the beacon without
// asking the server what just happened.
//
// Nothing listens on the standalone /session page, which is correct: opened
// cold from a bookmark there is no cross underneath and no journal to fall
// into, and the page keeps the ending it already had.
export const SAVED_EVENT = 'ln-listen-saved';

export function saidSoAboutTheEntry(entry) {
  try {
    window.dispatchEvent(new CustomEvent(SAVED_EVENT, { detail: entry }));
  } catch { /* no window */ }
}

export function useListeningSession({ step }) {
  // The record
  // What the contents screen prints about the record: released, genre, label.
  // The count and the runtime are not here because they are the tracklist
  // said another way, and a number kept in two places is a number that can
  // disagree with itself.
  const [facts, setFacts]                 = useState({});
  const [albumArt, setAlbumArt]           = useState('');
  const [albumInput, setAlbumInput]       = useState('');
  const [artistName, setArtistName]       = useState('');
  const [year, setYear]                   = useState('');
  // Apple's genre for the record, carried from the picker. It fell back to
  // the briefing's until the research came out on 2026-09-18; a record typed
  // in by hand now simply has no genre until the entry is corrected.
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
  // Where the sender's journal is, when the listen came out of the inbox —
  // the credit the public feed carries (migrations/008_received_from_url.sql).
  const [receivedFromUrl, setReceivedFromUrl] = useState('');
  // Whether the sender asked not to be credited. Set by the send and never
  // by the keeper here — the entry's own editor is where it can be changed.
  const [creditPrivate, setCreditPrivate] = useState(false);
  const [receivedDate, setReceivedDate]   = useState('');
  // Which send this listen came out of, when it came out of one. Only the
  // inbox ever sets it, and it rides on the draft row so a listen finished a
  // day later still settles the send it answers (migrations/015).
  const [submissionId, setSubmissionId]   = useState(null);

  // What gets written
  const [overallNotes, setOverallNotes]   = useState('');
  const [rating, setRating]               = useState(0);
  // What went wrong, if anything: { says, because }. Null the rest of the
  // time. Three window.alert() calls fed into this on 2026-09-18 — see
  // components/session_components/Trouble.js for why they left.
  const [trouble, setTrouble]             = useState(null);
  // Masterpiece is not state and has no setter, 2026-09-17. It is what the
  // tracklist says — every track rated, every rating five — so it is read off
  // the ratings rather than kept beside them, where the two could disagree.
  // Nothing presses it; it appears at the end of a listen as a fact about what
  // you gave, rather than a judgement you award yourself at the start.
  // Declared below the ratings it reads, with the other derived values.
  const [Favorite, setFavorite]           = useState(false);
  const [Formative, setFormative]         = useState(false);

  // Tracks
  const [tracks, setTracks]               = useState(null);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [trackNotes, setTrackNotes]       = useState({});
  const [trackRatings, setTrackRatings]   = useState({});
  const [trackFavorites, setTrackFavorites] = useState({});   // index -> true

  // See the note where this used to be a useState. The same rule the writer
  // enforces (library/entry_formatter.js, flawless) — stated here in the
  // session's own terms, because the session holds its ratings in a map by
  // index rather than on the tracks themselves, and a listen has to be able to
  // show the mark before there is an entry to read it off.
  const Masterpiece = Array.isArray(tracks) && tracks.length > 0
    && tracks.every((_, i) => Number(trackRatings[i]) === 5);
  const [openTrack, setOpenTrack]         = useState(0);      // the track on screen

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

  // Which listen is the live one. A tracklist that arrives after the record
  // was changed must not land on the new one.
  const listenRunRef   = useRef(0);

  // Session timer — runs while a record is open and stops once it is saved.
  //
  // **A ref, not state, since 2026-09-16.** Nothing on any screen shows this
  // number. It exists to be written into the draft row and read back when a
  // listen is resumed — and as state it was re-rendering the whole listen once
  // a second, for an hour at a time, while somebody typed into a textarea
  // inside it. That is sixty re-renders a minute of the record, the tracklist
  // and the notes to change a value no eye ever meets. It is the answer to
  // "why does typing lag" and most of the answer to "why is the laptop hot".
  //
  // A ref keeps the counting and drops the rendering. The save reads
  // `.current` at the moment it writes, which is the only moment anything has
  // ever needed it.
  const elapsedRef = useRef(0);
  useEffect(() => {
    if (!albumInput || saved) return undefined;
    const id = setInterval(() => { elapsedRef.current += 1; }, 1000);
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
      receivedFromUrl, creditPrivate, submissionId,
      collectionIdRef, tracks, overallNotes, trackNotes, trackRatings, trackFavorites,
      rating, Masterpiece, Favorite, Formative, elapsedRef,
    },
    setters: {
      setOverallNotes, setRating, setFavorite, setFormative,
      setTrackNotes, setTrackRatings, setTrackFavorites, setEntryType, setAlbumArt,
      // A failed save that was asked for out loud says so through this. The
      // automatic one stays silent, which is the point of it.
      setTrouble,
    },
  });

  // ── The needle ────────────────────────────────────────────────────────────
  // What this listen tells the beacon. The record, and the track on screen —
  // nothing that was written. See migrations/013_needle.sql for why this is
  // not the drafts row: a draft is written once something has been typed, and
  // the first four minutes of a listen are a record picked, track one open
  // and not a word yet, which is exactly when the beacon should be lit.
  //
  // Debounced for the same reason the draft is — every keystroke is a change,
  // and a request per keystroke is a flood. Two seconds is invisible against
  // a beacon the world polls every fifteen.
  //
  // **It is keyed on interaction and never on a heartbeat.** The row expires
  // three hours after its last write, so what keeps a beacon alive is somebody
  // turning to a track or writing a line. A timer that pinged while the page
  // merely sat open would keep the beacon claiming a listen all weekend, which
  // is the one loophole this had to close.
  // ── The song a listen got to, 2026-09-20 ────────────────────────────────
  // Kept for the length of one record rather than read off the screen each
  // time. What is on screen answers "what is open", and the beacon is asking
  // something else: how far into this record its keeper has got. Those are
  // the same answer everywhere except the album screen, where nothing is
  // open — so going back to the cover for a moment used to take the song off
  // the beacon, and finishing from there left the record's name standing
  // where a song had been (Miyel, 2026-09-20: "if it ends on a song, leave
  // the song up").
  //
  // Blank until a song is actually reached, which is the whole of what the
  // old guard was for: openTrack is 0 before anybody has pressed anything,
  // so a record sitting on its own cover would otherwise announce track one.
  // Cleared by a different record arriving, and by nothing else.
  const gotTo = useRef({ album: '', track: '' });
  useEffect(() => {
    if (!albumInput || saved) return undefined;
    // ── Every record in hand is a beacon, 2026-09-18 ──────────────────────
    // This was `if (step === 0 && !hasWriting) return undefined` — a record on
    // the album screen with nothing opened and nothing written was somebody
    // deciding whether to start, and deciding is not a beacon. That was right
    // for the flow it was written in, where the picker was a page of its own
    // and the album screen was where you had a last look before committing.
    //
    // It is not the flow any more. A record is chosen on the beacon: you press
    // Start a listen, the picker takes that screen, and pressing a record
    // brings the session up over it. The deciding happens in the picker,
    // before any of that — so by the time a record is in hand the choice has
    // been made, and a beacon that stayed dark until the first track was
    // opened would be contradicting a screen somebody had already committed
    // to. This reverses "a record with no track chosen yet is not a beacon"
    // (DECISIONS, 2026-09-15), which the brief calls out by name.
    //
    // It said the record "flies out of the picker into the beacon slot" until
    // the evening of 2026-09-18. Nothing flies any more, and the beacon does
    // not light in front of anybody either: the sheet covers the screen and
    // the record underneath changes behind it. The gate above is unaffected —
    // it was never about the animation, only about when a record counts.
    //
    // The two seconds below still stand between a mis-tap and a broadcast,
    // and leaving lifts the needle as it always did.
    const t = setTimeout(() => {
      fetch('/api/needle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          album: albumInput,
          artist: artistName,
          album_art: albumArt,
          // Whatever song is open, and blank while the tracklist is still
          // being fetched or a resumed draft is sitting on its album screen.
          // Blank is no longer the same as no beacon — the gate above decides
          // that — so a listen with no song yet says the record's name instead
          // of going dark. It keeps naming the last song reached through Notes
          // and Preview too: the listen is still open, and dropping to "Last
          // logged" while its keeper writes the album note would be wrong at
          // the most deliberate moment of the whole thing.
          // The furthest song this listen has reached — see gotTo above.
          // Blank is not the same as no beacon: the route names the record
          // instead.
          track: (() => {
            if (gotTo.current.album !== albumInput) gotTo.current = { album: albumInput, track: '' };
            const open = step > 0 ? (tracks?.[openTrack]?.title || '') : '';
            if (open) gotTo.current.track = open;
            return gotTo.current.track;
          })(),
        }),
      }).then(() => { litRef.current = true; })
        .catch(() => { /* the beacon is not worth an alert */ });
    }, 2000);
    return () => clearTimeout(t);
  }, [albumInput, artistName, albumArt, tracks, openTrack, saved,
      overallNotes, trackNotes, trackRatings, trackFavorites,
      rating, Masterpiece, Favorite, Formative, step, hasWriting]);

  // The needle lifts. Called when the record comes off the desk, when the
  // listen becomes an entry, and when the listen leaves the screen.
  function liftNeedle() {
    fetch('/api/needle', { method: 'DELETE' }).catch(() => {});
  }

  // Whether this listen ever lit the beacon. Read by the cleanup below, and
  // the reason it exists is React's development mode, which mounts an effect,
  // tears it down and mounts it again to catch exactly the kind of cleanup
  // written here. Without the flag that rehearsal put the beacon out for the
  // two seconds before the write landed, every time a listen was opened — on
  // the dev server only, which is where it would have been seen and believed.
  const litRef = useRef(false);

  // ── Closing the listen is closing the listen, 2026-09-16 ──────────────────
  // Only two things used to put the needle down: posting, and going back to
  // the picker. Swiping the layer away or pressing back left it standing,
  // because a record was still on the desk — which is true, and is not what
  // closing something feels like. Miyel shut a listen, watched the beacon go on
  // claiming it, and was right to.
  //
  // So leaving the screen ends it, and coming back lights it again a couple of
  // seconds later — the write effect above does that on its own, which is why
  // this can be as blunt as it is. Switching tabs and locking a phone do not
  // unmount anything, so those keep the beacon lit and the expiry above is
  // still what catches a listen nobody ever comes back to.
  useEffect(() => () => { if (litRef.current) liftNeedle(); }, []);

  // Assemble the preview on arrival. Nothing here reaches a model — format_post
  // is a local join of what was written — so it is redone every time the
  // Preview opens, which is what keeps it honest about edits made on the way
  // back through Notes.
  useEffect(() => {
    if (step !== SESSION_STEPS.length - 1 || saved) return;
    setOutput(null);
    if (hasWriting) doFormat();
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

    setTracks(null);
    setFacts({});
    setTracksLoading(false);
    setTrackNotes({});
    setTrackRatings({});
    setTrackFavorites({});
    setOpenTrack(0);
    elapsedRef.current = 0;
    setOverallNotes('');
    setRating(0);
    // No setMasterpiece: clearing the ratings above clears it.
    setFavorite(false);
    setFormative(false);
    setSaved(false);
    setSavedEntry(null);
    setOutput(null);
    draft.reset();
    collectionIdRef.current = '';

    if (!record?.album) {
      // Back to the picker: there is no record on the desk, so the beacon
      // should stop saying there is.
      liftNeedle();
      setAlbumInput(''); setArtistName(''); setYear(''); setAlbumArt('');
      setGenre(''); setEntryType(''); setReceivedFrom(''); setReceivedDate(''); setReceivedFromUrl('');
      setSubmissionId(null);
      return 0;
    }

    const {
      album, artist = '', year: yr = '', artUrl = '', collectionId = null,
      genre: gen = '', entryType: et = '', receivedFrom: from = '',
      receivedDate: date = '', receivedFromUrl: fromUrl = '',
      creditPrivate: quiet = false, submissionId: sentId = null,
      draft: savedDraft = null,
    } = record;

    collectionIdRef.current = collectionId || savedDraft?.collection_id || '';
    setAlbumInput(album);
    setArtistName(artist);
    setYear(yr || savedDraft?.year || '');
    setAlbumArt(artUrl || savedDraft?.album_art || '');
    setGenre(gen || savedDraft?.genre || '');
    setEntryType(et || savedDraft?.entry_type || '');
    setReceivedFrom(from || savedDraft?.received_from || '');
    setReceivedFromUrl(fromUrl || savedDraft?.received_from_url || '');
    setReceivedDate(date || (savedDraft?.received_date ? String(savedDraft.received_date).slice(0, 10) : ''));
    setCreditPrivate(quiet === true || savedDraft?.credit_private === true);
    setSubmissionId(sentId ?? savedDraft?.submission_id ?? null);

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
      setTracks(rows.map(t => ({ number: t.number, title: t.title, duration: t.duration ?? null, disc: t.disc })));
      // A resumed draft brings its tracks back with it and nothing re-fetches
      // them, so this is the one thing the contents screen would otherwise
      // have no way of knowing. One lookup, and only on a resume.
      if (collectionIdRef.current) {
        fetchAlbumFacts(collectionIdRef.current).then(f => {
          if (run === listenRunRef.current) setFacts(f || {});
        });
      }
    } else {
      setTracksLoading(true);
      fetchTracklist(album, artist, collectionIdRef.current || null).then(found => {
        if (run !== listenRunRef.current) return;
        setTracks(found?.tracks || []);
        setFacts(found?.facts || {});
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

  // ── When there is no tracklist ────────────────────────────────────────────
  // Two ways out, and neither of them is giving up on the record: ask again,
  // or write it out yourself. iTunes misses plenty — a private press, a
  // bootleg, a record filed under a name nobody would guess — and a listen
  // with no tracklist is still a listen.
  function lookAgain() {
    const run = listenRunRef.current;
    if (!albumInput || tracksLoading) return;
    setTracksLoading(true);
    fetchTracklist(albumInput, artistName, collectionIdRef.current || null).then(found => {
      if (run !== listenRunRef.current) return;
      setTracks(found?.tracks || []);
      if (found?.facts) setFacts(found.facts);
      setTracksLoading(false);
    });
  }

  // One title a line, which is how anybody writes a tracklist out. No
  // durations, so the contents screen draws no bars for them and the runtime
  // row is simply absent — a record whose length nobody knows.
  function takeHandTracks(text) {
    const rows = String(text || '')
      .split('\n')
      .map(line => line.trim())
      // A number somebody typed in front of the title is theirs to drop: the
      // list is numbered on screen either way, and "1. 1. Bleak Bake" is what
      // keeping it would produce.
      .map(line => line.replace(/^\s*\d{1,3}\s*[.)\-–]\s*/, '').trim())
      .filter(Boolean);
    if (!rows.length) return;
    setTracks(rows.map((title, i) => ({ number: i + 1, title, duration: null })));
  }

  // ── The briefing and the question mark are gone, 2026-09-18 ────────────
  // Web-searched research on the album screen, and a reference you could ask
  // while writing. Both came out on Miyel's call: they were the only two
  // things in this software that spent somebody's money per press, the only
  // two that needed a key before they worked, and neither is something she
  // could not do on a phone beside the record. The prompts — which were the
  // work — are kept in docs/RETIRED-PROMPTS.md with the reason.
  //
  // The `briefings` table stays where it is: the schema is additive-only, and
  // a brief already researched is somebody's record of what they read.
  // Nothing writes to it now.

  // Returns what it assembled as well as setting it, so a save that arrives
  // before the preview's own assembly has landed can assemble and go on.
  async function doFormat() {
    // Anything at all, not an album note in particular (2026-09-18). The
    // album note used to be the one thing a listen could not be saved
    // without, which made every other kind of entry impossible: a record
    // rated and not written about, a record you only marked a favourite, a
    // record with notes on three tracks and nothing to say about the whole.
    // Miyel: "if someone wants to post just an overall album score with no
    // album notes, track notes or stars, I guess that's fine." It is —
    // hasWriting is the test, and it was already here, deciding whether a
    // draft was worth keeping. The same question, asked once.
    if (!hasWriting) return null;
    setFormatting(true);
    try {
      const res = await fetch('/api/format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // `brief` was the researched briefing; it is the record's own three
          // facts now and the name is kept only because /api/format reads it.
          brief: { album: albumInput, artist: artistName, year },
          notes: overallNotes, rating, Masterpiece, Favorite, Formative, entryType,
          trackNotes, trackRatings, tracks: tracks || [],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setOutput(data);
      return data;
    } catch (err) {
      setTrouble({
        says: 'The preview could not be built. Nothing you have written is affected.',
        because: err.message,
      });
      return null;
    }
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
      //
      // ── The whole record, not the part you wrote on ────────────────────
      // There was a `.filter(t => t.rating > 0 || t.note || t.favorite)` on
      // the end of this until 2026-09-18, and it is what made Miyel's blank
      // In Rainbows an entry with no tracklist at all: nothing was rated, so
      // every track was dropped, so the record it was about had no contents.
      // "Can we save the tracklist even when nothing is rated? It will also
      // help with editing — right now when hitting edit you can go to the
      // bottom screen and it's just fully blank."
      //
      // The filter was answering a question about *drawing* in the place that
      // decides what is *kept*, which is the wrong place for it twice over.
      // It threw away the record's own contents, which nothing else has,
      // rather than an opinion, which the reader can see is absent. And it
      // quietly lied about Masterpiece: three tracks rated five out of
      // sixteen used to be every track five stars, because the other thirteen
      // were not in the list to disagree.
      //
      // The reading view does the filtering now, where it belongs and where
      // being wrong costs a row rather than a record (FullPostPage).
      const structuredTracks = (tracks || []).map((t, i) => ({
        number: t.number || i + 1,
        title: t.title,
        rating: trackRatings[i] || 0,
        favorite: !!trackFavorites[i],
        note: (trackNotes[i] || '').trim(),
      }));
      const derived = serializeTracks(structuredTracks);

      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          album: albumInput, artist: artistName, year,
          genre,
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
          received_from_url: receivedFromUrl,
          credit_private: creditPrivate,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSaved(true);
      setSavedEntry(data.entry || null);

      // ── The send that started this is settled ────────────────────────────
      // A listen begun from the inbox marked its send `reviewed`, which means
      // started. Posting is what makes it `logged`, pointed at the record —
      // and nothing did that until 2026-09-16, so a record somebody sent could
      // be written up and published while their send still sat in the inbox
      // offering to resume a listen that no longer existed.
      //
      // The same route the "I've already logged this" button presses, doing
      // both halves: it settles the send and credits the entry to the sender,
      // and it credits only where the entry is not credited already — which
      // here it always is, since the credit rode in with the record.
      //
      // Deliberately not awaited and deliberately silent. The entry is saved;
      // a send that cannot be tidied — deleted from the inbox while this was
      // open, so the route answers 404 — is not a reason to tell somebody
      // their listen failed. The button is still there to press by hand.
      if (submissionId && data.entry?.id) {
        fetch(`/api/submissions/${submissionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entry_id: data.entry.id }),
        }).catch(() => {});
      }
      // The listen is an entry now; the draft — both copies — goes with it,
      // and so does the needle. The beacon moves from "Now logging" to "Last
      // logged" showing the record just finished, which is the same record it
      // was already showing — so the line changes and the cover does not.
      liftNeedle();
      await draft.finish();
    } catch (err) {
      // The frightening part of a failed save is not knowing whether an
      // hour's writing just went, so the first line answers that and the
      // reason comes second. It is true: the listen is untouched, `saved`
      // stays false, and both copies of the draft are where they were — which
      // matters most at the one moment this is likeliest to happen, a copy
      // redeploying under a listen when an update lands (the workflow runs
      // hourly, on its own).
      setTrouble({
        says: 'That did not save. Your listen is still here — press Save to journal again.',
        because: err.message,
      });
    }
    finally { setSaving(false); }
  }

  return {
    // What went wrong, and the way to dismiss it
    trouble, setTrouble,

    // The record
    albumArt, setAlbumArt,
    albumInput, setAlbumInput,
    artistName, setArtistName,
    year, setYear,
    genre, setGenre,
    entryType, setEntryType,
    receivedFrom, setReceivedFrom,
    receivedDate, setReceivedDate,
    receivedFromUrl, setReceivedFromUrl,
    creditPrivate,
    // Writing
    overallNotes, setOverallNotes,
    rating, setRating,
    Masterpiece,
    Favorite, setFavorite,
    Formative, setFormative,
    hasWriting,
    // Tracks
    tracks,
    tracksLoading,
    facts,
    trackNotes, setTrackNotes,
    trackRatings, setTrackRatings,
    trackFavorites, setTrackFavorites,
    openTrack, setOpenTrack,
    // Draft
    draftState: draft.state,
    // Preview
    formatting,
    output,
    saving,
    saved,
    savedEntry,
    // Timer. The ref itself, so a caller reads it at the moment it asks
    // rather than being re-rendered every second to be told.
    elapsedRef,
    // Functions
    beginListen,
    lookAgain,
    takeHandTracks,
    saveDraft: draft.save,
    doFormat,
    doSave,
  };
}
