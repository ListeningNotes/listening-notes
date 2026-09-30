// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/session/page.js
// Find the album, log the listen.
//
// One address for the whole thing. With nothing on the desk it is the picker:
// a search field and a grid of covers. Tap one and the same page becomes the
// listen — the cover settles at the top of one screen laid out as the entry
// is: the record, its stars and marks and note, then the tracks under the
// horizon they build. The preview is the second screen and the only other
// one. The record being listened to is kept in the browser, so a reload, a
// locked phone or a closed tab reopens where you were.
//
// ── One screen, 2026-09-29 ────────────────────────────────────────────────
// Miyel's brief *the session becomes one screen*. It was four — Overview,
// Tracks one at a time, Album, Preview — and the first three are this one
// page (steps/AlbumNotes.js, steps/TrackNotes.js). The header that carried
// the small beacon and the steps went with them: the live dot in the list
// says the same thing where you are already looking, and the two words that
// used to be steps are at the foot with a third — Discard, Save draft,
// Preview. The needle is still set and the beacon still broadcasts.
//
// ── Why it is not two pages any more ──────────────────────────────────────
// It was: /dashboard/echo found the album and /dashboard/echo/session took
// the notes, with a network of floating covers between them that assembled
// into the album art while research ran. Both were named for a character
// this software no longer has, and the ceremony between them was paid for on
// every listen. What is left is the function. The network survives as one of
// the dashboard's backgrounds.
//
// ── The one moment kept ───────────────────────────────────────────────────
// The cover you tap travels to the header and settles there. Half a second,
// one gesture, on the same curve the entry layer uses to slide in — enough to
// feel like this site without performing. Nothing waits on it: the album
// screen is already on and usable while the cover is still moving.
//
// ── Not a reduced version on a phone ──────────────────────────────────────
// No step, field or mark exists on one and not the other. A phone is one
// column, the record over the tracks; a desk stands the record at the left
// and the tracks at the right, with the foot's three words in a row at the
// top. Decided by the listen's own width, because on a desk it opens beside
// the spine and the window's width is not the listen's.
//
// ── How it is usually reached ─────────────────────────────────────────────
// From the desk, as a layer: app/@layer/(.)session intercepts this address
// and draws this same component on the sheet an entry arrives on, so it
// slides in from the right and a swipe puts you back on the desk. Opened
// cold it is a page. Nothing here knows which; the one rule that differs —
// where the nav row sits — is CSS scoped to the layer.

'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CaretLeft } from '@phosphor-icons/react';
import { useListeningSession, SESSION_STEPS, PENDING_KEY, TRACK_NOTE_KEY, saidSoAboutTheDesk, saidSoAboutTheEntry } from '../../hooks/useListeningSession';
import AlbumPicker from '../../components/session_components/AlbumPicker';
import NoteSheet from '../../components/session_components/NoteSheet';
import TrackNotes from '../../components/session_components/steps/TrackNotes';
import AlbumNotes from '../../components/session_components/steps/AlbumNotes';
import SessionPreview from '../../components/session_components/steps/SessionPreview';
import Trouble from '../../components/session_components/Trouble';
import SendSheet from '../../components/main_components/SendSheet';
import TrackNotePage from '../entries/[slug]/TrackNotePage';
import { useBeforeLeaving, useLayerExit } from '../../components/main_components/LayerEntry';

// How long the picked cover takes to reach the header. The step body slides in
// on the same curve at nearly the same length, so the two read as one move.
const LANDING_MS = 520;

// How wide the listen has to be before it is laid out as a desk: the record
// at the left, the tracks at the right. A number about the listen, not the
// window — it opens beside the spine.
const WIDE_PX = 720;

export default function SessionPage() {
  const [authed, setAuthed]     = useState(false);
  const [checking, setChecking] = useState(true);

  // The record on the desk, or null for the picker. Mirrors the browser's copy
  // under PENDING_KEY; this is the one React renders from. Read once, here,
  // rather than in an effect: the first paint is the blank checking screen
  // whatever this holds, so the server and the browser cannot disagree.
  const [pending, setPending] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = JSON.parse(localStorage.getItem(PENDING_KEY));
      return stored?.album ? stored : null;
    } catch { return null; }
  });

  // ── Or a song, 2026-09-24 ───────────────────────────────────────────────
  // Pressed in the picker's Songs section: a track note rather than a listen
  // (the track-notes brief). It waits in the tab under TRACK_NOTE_KEY the way
  // a record waits in the browser, and while it is there this page is the
  // track note's card, being written — not the four screens of a listen. Read
  // the same way `pending` is, for the same reason.
  const [song, setSong] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = JSON.parse(sessionStorage.getItem(TRACK_NOTE_KEY));
      return stored?.song && stored?.album ? stored : null;
    } catch { return null; }
  });

  const [step, setStep]       = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [stepDir, setStepDir] = useState(1);   // 1 forward, -1 back — drives the slide

  // The reference's sheet. Closed on every change of record.


  // The cover in flight from the grid to the album screen: where it started,
  // where it is going, and whether it has been told to go.
  const [landing, setLanding] = useState(null);

  // A finger travelling across a screen. The tracks screen turns its own
  // pages and hands over at either end; everywhere else this turns the step.
  const swipe = useRef(null);

  const s = useListeningSession({ step });

  // ── How wide the listen is, which is not how wide the screen is ─────────
  // On a desk the listen opens over the journal, beside the spine, and the
  // spine is dragged to whatever width its keeper likes (useSpineWidth). So
  // "is there room for the desk's layout" is a question about this sheet,
  // and a media query answers it about the window. Measured here instead.
  const root = useRef(null);
  const [wide, setWide] = useState(false);
  const listening = !!pending?.album && !song;
  useEffect(() => {
    const el = root.current;
    if (!el || !listening) return undefined;
    const say = () => setWide(el.clientWidth >= WIDE_PX);
    say();
    const watch = typeof ResizeObserver === 'function' ? new ResizeObserver(say) : null;
    watch?.observe(el);
    return () => watch?.disconnect();
  }, [listening, checking, authed]);

  // ── A track's note, on its sheet ─────────────────────────────────────────
  // Which track's sheet is up, or null. What was typed on a sheet and then
  // put down without Done is kept here for the length of the listen and
  // offered back when that song's sheet opens again — nothing typed is lost
  // to a dismissal (NoteSheet.js).
  const [noting, setNoting] = useState(null);
  const kept = useRef({});
  function openNote(k) { setNoting(k); }
  function doneNote(text) {
    const k = noting;
    if (k === null) return;
    delete kept.current[k];
    s.setTrackNotes(prev => ({ ...prev, [k]: text }));
    setNoting(null);
  }
  function cancelNote(text) {
    const k = noting;
    if (k === null) return;
    if ((text || '') !== (s.trackNotes[k] || '')) kept.current[k] = text; else delete kept.current[k];
    setNoting(null);
  }

  // ── Sending a song from the tracklist, 2026-09-26 ───────────────────────
  // The envelope on a track row (RecordContents) opens the one send sheet
  // with that song in the left square: the record on the desk, and the
  // track's title as the song. A track and not the album, because there is no
  // entry yet and "hear this now" dies if it waits for the writing; the album
  // keeps being sent from the finished entry. The session stays open behind
  // it — the sheet is a popup over this page and the draft goes on saving
  // itself underneath, so nothing is saved, paused or lost by sending.
  const [sendingTrack, setSendingTrack] = useState(null);
  function sendTrack(track) { setSendingTrack(track); }

  // ── The note comes up to meet the keyboard, 2026-09-22 ──────────────────
  // Miyel: "it still feels weird when I open the keyboard — it glitches just
  // for a split second." Measured on her phone with the tape measure: about
  // 95ms after a tap, in a single frame, iOS slid the whole screen up so the
  // note box sat in the middle of what the keyboard leaves — 278pt the first
  // time, 300 the second, which is to the half point what centres the box
  // *where it was at the tap*. The sheet is pinned to the part of the screen
  // you can see (LayerEntry), so it pulled everything straight back down: a
  // frame or two up, then back. iOS moves the screen itself, ahead of any
  // page code, so no pin can be quick enough to hide it.
  //
  // And lifting the note once it has the focus is too late — that was the
  // second try, and iOS centred the box it had been shown at the tap. So the
  // tap on a note you are not already writing in is the listen's to handle:
  // it reads which letter the finger landed on, lifts the page until the
  // track's name sits just under the header (her ask: "have the track name
  // stay so it doesn't feel like it's going as far"), and only then puts the
  // cursor there and asks for the keyboard. iOS is shown a note already in
  // view and has nothing to slide. The lift glides up with the keyboard
  // rather than jumping. When the keyboard goes, the page goes back down.
  //
  // A long press is left to the browser — it is how words get selected — and
  // is still lifted once it has the focus, after iOS has had its slide.
  // Touch screens only: a mouse focuses the note on arrival and there is no
  // keyboard to make room for.
  useEffect(() => {
    // How much of the screen a keyboard leaves, once one has been seen — a
    // guess at a little over half before that.
    let room = null;
    let lifted = null;
    let settle = null;
    let press = null;
    const vv = window.visualViewport;
    const touchy = () => window.matchMedia('(pointer: coarse)').matches;
    const onViewport = () => { if (vv && vv.height < screen.height * 0.8) room = vv.height; };
    const notes = target => {
      const field = target?.closest?.('.ses-grow')?.querySelector('textarea');
      return field && field.closest('.ses') ? field : null;
    };

    // Lifts the page so the line above the note — the track's name, or
    // "Album notes" — sits just under the header, and further only if the
    // place you tapped would otherwise be under the keyboard. Returns how far
    // it actually went, which the scroll range can make less than asked.
    const raise = (field, tapY) => {
      const root = field.closest('.ses');
      const scroller = field.closest('.lay') || document.scrollingElement;
      const head = root.querySelector('.ses-head');
      const under = head ? head.getBoundingClientRect().bottom : 0;
      const above = field.closest('.ses-grow').previousElementSibling || field;
      const space = room || Math.round(window.innerHeight * 0.55);
      const at = tapY ?? field.getBoundingClientRect().top + 20;
      let by = above.getBoundingClientRect().top - (under + 10);
      if (at - by > space - 64) by = at - (space - 64);
      if (by < 4) return 0;
      // Room to go up into: a listen with little written has nowhere to
      // scroll to, so the page is given a screen of blank below while a note
      // is open, and it is taken away again once the page is back down.
      root.style.paddingBottom = '100vh';
      if (!lifted) lifted = { scroller, root, from: scroller.scrollTop };
      const was = scroller.scrollTop;
      scroller.scrollTop = was + by;
      return scroller.scrollTop - was;
    };

    // Which letter a point is over, read off a copy of the writing laid over
    // the box for the length of one question. The box itself cannot be asked
    // — the browser keeps its text out of reach — and the copy wraps exactly
    // where it does, because it takes the same type, width and padding.
    const letterAt = (field, x, y) => {
      const box = field.getBoundingClientRect();
      const look = getComputedStyle(field);
      const copy = document.createElement('div');
      copy.style.cssText = [
        'position:fixed', `left:${box.left}px`, `top:${box.top}px`, `width:${box.width}px`,
        'box-sizing:border-box', 'margin:0', 'border:0',
        `padding:${look.paddingTop} ${look.paddingRight} ${look.paddingBottom} ${look.paddingLeft}`,
        `font:${look.font}`, `letter-spacing:${look.letterSpacing}`, `word-spacing:${look.wordSpacing}`,
        'white-space:pre-wrap', 'overflow-wrap:break-word',
        'opacity:0', 'z-index:2147483647', 'pointer-events:auto',
      ].join(';');
      copy.textContent = field.value + ' ';
      document.body.appendChild(copy);
      let at = field.value.length;
      const range = document.caretRangeFromPoint?.(x, y);
      if (range && copy.contains(range.startContainer)) at = Math.min(range.startOffset, field.value.length);
      copy.remove();
      return at;
    };

    const onStart = e => {
      const field = notes(e.target);
      if (!field || field === document.activeElement || e.touches.length !== 1 || !touchy()) { press = null; return; }
      const t = e.touches[0];
      press = { field, x: t.clientX, y: t.clientY, t: performance.now() };
    };
    const onMove = e => {
      if (!press) return;
      const t = e.touches[0];
      if (Math.abs(t.clientX - press.x) > 10 || Math.abs(t.clientY - press.y) > 10) press = null;
    };
    const onEnd = e => {
      const p = press;
      press = null;
      // A press held long enough to select a word is the browser's.
      if (!p || performance.now() - p.t > 450) return;
      const { field } = p;
      const at = letterAt(field, p.x, p.y);
      // The browser's own focus goes, and the slide iOS would have made with it.
      e.preventDefault();
      clearTimeout(settle);
      const went = raise(field, p.y);
      field.setSelectionRange(at, at);
      field.focus({ preventScroll: true });
      if (went <= 0) return;
      // The page is already up — that is what iOS was shown. What you see
      // is drawn where it was and let go, on the site's curve, so it rises
      // with the keyboard instead of jumping ahead of it. The header is not
      // in it: only the listen under the header moves.
      const body = field.closest('.ses-body');
      if (!body) return;
      body.style.transition = 'none';
      body.style.transform = `translateY(${went}px)`;
      body.getBoundingClientRect();
      body.style.transition = 'transform 0.32s cubic-bezier(0.22, 0.61, 0.36, 1)';
      body.style.transform = '';
      setTimeout(() => { body.style.transition = ''; }, 380);
    };

    // A note that got the focus some other way — a long press, a keyboard —
    // is still lifted, after whatever iOS has done.
    const onIn = e => {
      const field = notes(e.target);
      if (!field || !touchy()) return;
      clearTimeout(settle);
      raise(field, null);
    };
    const onOut = e => {
      if (!lifted) return;
      const next = e.relatedTarget;
      if (notes(next) && lifted.root.contains(next)) return;
      const { scroller, root, from } = lifted;
      lifted = null;
      scroller.scrollTo({ top: from, behavior: 'smooth' });
      settle = setTimeout(() => { if (!lifted) root.style.paddingBottom = ''; }, 500);
    };
    document.addEventListener('touchstart', onStart, { capture: true, passive: true });
    document.addEventListener('touchmove', onMove, { capture: true, passive: true });
    document.addEventListener('touchend', onEnd, { capture: true, passive: false });
    document.addEventListener('focusin', onIn);
    document.addEventListener('focusout', onOut);
    vv?.addEventListener('resize', onViewport);
    return () => {
      document.removeEventListener('touchstart', onStart, true);
      document.removeEventListener('touchmove', onMove, true);
      document.removeEventListener('touchend', onEnd, true);
      document.removeEventListener('focusin', onIn);
      document.removeEventListener('focusout', onOut);
      vv?.removeEventListener('resize', onViewport);
      clearTimeout(settle);
    };
  }, []);

  // Puts a record on the desk — or clears it, with null — and lands on the
  // step it was left at. Called from whatever caused the change: the door
  // opening on a record already there, a tap in the picker, the back caret.
  function show(record) {
    const at = s.beginListen(record?.album ? record : null);
    setStep(at);
    setMaxStep(at);
    setStepDir(1);
    setPending(record?.album ? record : null);
  }

  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.json())
      .then(d => {
        const ok = !!d.authed;
        setAuthed(ok);
        // What was left on the desk — by the inbox, or by this page before a
        // reload — opens as soon as the door does. Not under a song: a track
        // note being written is the thing on the desk, and a listen started
        // behind it would light the beacon for a record nobody is playing.
        if (ok && pending?.album && !song) show(pending);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  // Once, on arrival: the check is a question asked at the door, and what
  // was left on the desk is read then and only then.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The landing. The album screen renders in the same commit as the record,
  // so on the next frame its cover can be measured and the image told where to
  // go; a frame later it is told to go, and once it has arrived it is removed.
  // While it flies the album screen fades in rather than sliding, so the
  // measurement is of where the cover will be and not where it is mid-slide.
  // Timers live in a ref rather than this effect's cleanup, because the effect
  // runs again as soon as the target is written and a cleanup there would
  // cancel the journey.
  const landingTimers = useRef([]);
  useEffect(() => {
    if (!landing || landing.to) return;
    landingTimers.current.push(requestAnimationFrame(() => {
      // The header's own cover — the mini beacon. It used to be the album
      // screen's large one, and that screen is gone with the Overview; the
      // contents screen deliberately has no cover on it, because the beacon
      // already does (Miyel's contents brief, 2026-09-18). Queried rather
      // than handed down a ref, the way the cross measures the beacon it
      // flies a record into: the destination belongs to the header, not to
      // whichever screen happens to be underneath it.
      const slot = document.querySelector('.ses .ses-record-cover');
      if (!slot) { setLanding(null); return; }
      const to = slot.getBoundingClientRect();
      setLanding(l => l && { ...l, to });
      landingTimers.current.push(requestAnimationFrame(() => setLanding(l => l && { ...l, go: true })));
      landingTimers.current.push(setTimeout(() => setLanding(null), LANDING_MS + 120));
    }));
  }, [landing]);
  useEffect(() => () => {
    landingTimers.current.forEach(id => { clearTimeout(id); cancelAnimationFrame(id); });
  }, []);

  // The listen is an entry now. Forgetting the pending record means a reload
  // opens the picker rather than a saved listen; the screen you are on keeps
  // its own copy until you leave.
  //
  // And then the desk clears itself, 2026-09-16, Miyel's, after the first real
  // listen: posting and then being left on the thing you just posted is a
  // screen with nothing left to do on it. Long enough to read the tick, then
  // back to the picker, which is where the next record is chosen and where an
  // unfinished one is waiting. The entry is on the wall; it does not need a
  // link out of the room it was written in.
  useEffect(() => {
    if (!s.saved) return undefined;
    try { localStorage.removeItem(PENDING_KEY); } catch { /* nothing to clear */ }
    saidSoAboutTheDesk();

    // ── Over the cross, the ending belongs to the cross ────────────────────
    // A listen opened from the beacon is a layer over the home pane, and the
    // pane never unmounted. So the record does not end here: it is handed
    // back, and the cross closes this layer, drops the cover into the journal
    // underneath and puts the record on the beacon captioned Last logged
    // (Miyel's beacon brief, item 4). Read it → and Log another are gone with
    // that, because the journal is where you have just landed and the picker
    // is one press of the beacon away.
    //
    // Asked of the page rather than passed in: the cross is either underneath
    // us or it is not, and that is exactly the question. Opened cold from a
    // bookmark there is no cross, no journal to fall into, and this keeps the
    // ending it already had — the tick, then the picker.
    if (document.querySelector('.hn')) {
      saidSoAboutTheEntry({
        slug: s.savedEntry?.slug || '',
        album: s.albumInput,
        artist: s.artistName,
        art: s.albumArt,
      });
      return undefined;
    }

    const t = setTimeout(() => { leave(); }, 1100);
    return () => clearTimeout(t);
  // leave is remade every render and listing it would restart the beat on
  // renders that changed nothing; the save is what this is waiting on.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.saved]);

  // From the picker: a record, and the box its cover was tapped in.
  function pick(record, from) {
    try { localStorage.setItem(PENDING_KEY, JSON.stringify(record)); } catch { /* the listen still opens */ }
    // A record pressed is a listen, whatever song was on the desk before it.
    try { sessionStorage.removeItem(TRACK_NOTE_KEY); } catch { /* nothing to clear */ }
    setSong(null);
    saidSoAboutTheDesk();
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (from && record.artUrl && !still) setLanding({ art: record.artUrl, from, to: null, go: false });
    show(record);
  }

  // A saved draft travels whole, so the session can put the notes back without
  // a second round trip.
  // `from` is the box of the cover on the tile that was pressed, so a resumed
  // draft flies into the header exactly as a searched record does. It was
  // hardcoded null, which meant every draft opened with no movement at all —
  // the same one-argument miss the cross had (2026-09-18).
  function resume(draft, from = null) {
    pick({
      album: draft.album,
      artist: draft.artist || '',
      year: draft.year || '',
      artUrl: draft.album_art || '',
      collectionId: draft.collection_id || null,
      genre: draft.genre || '',
      entryType: draft.entry_type || '',
      // The send this listen answers, if it came out of one, so finishing it
      // from the picker settles that send exactly as finishing it from the
      // inbox does (migrations/015).
      submissionId: draft.submission_id ?? null,
      draft,
    }, from);
  }

  // A song pressed in this page's own picker — the picker HomeNav draws on
  // the beacon does the same through its own beginTrackNote. The note opens
  // in place of the picker; there is no cover in flight, because a song has
  // no header slot to land in.
  function beginTrackNote(picked) {
    try { sessionStorage.setItem(TRACK_NOTE_KEY, JSON.stringify(picked)); } catch { /* the note still opens */ }
    setSong(picked);
  }

  // ── Putting the record down ───────────────────────────────────────────────
  // The × in the corner, on its second press (Miyel, 2026-09-18). Ending a
  // listen belongs in the listen: it lived on the beacon for an hour as a
  // second line under "Back to the listen" and that was two lines of words on
  // a screen whose whole job is one record.
  //
  // It is not the same thing as swiping the sheet away. Swiping is stepping
  // away — the record stays on the desk, the beacon says Last logged until
  // you come back, and coming back lands you on the step you left. This is
  // putting it down: the draft is saved, the desk is cleared, and the pane
  // you land on offers a new record rather than the old one.
  //
  // Two presses because it ends something, which is the same rule the discard
  // on a draft follows — and the second press says what it will do rather
  // than asking whether you are sure.
  const router = useRouter();

  // ── Putting the record down ──────────────────────────────────────────────
  // There is no × any more (2026-09-18). The way out of a listen is the pull
  // down that brought it up, which is the layer's own gesture and the one
  // every other sheet on this site already uses — Miyel: "I don't have them
  // anywhere else on the site, and swiping down is intuitive since the screen
  // comes up."
  //
  // Which means the draft has to be written by the gesture rather than by a
  // button, and a write that fails has to stop the sheet going. That is what
  // this registers: the layer asks before it moves, and a false answer leaves
  // the listen exactly where it is with Trouble showing why.
  // Set while a listen is being thrown away, so the sheet's own way out does
  // not write the draft it is in the middle of deleting.
  const discarding = useRef(false);
  const exit = useLayerExit();
  const layered = useBeforeLeaving(async () => {
    if (discarding.current) return true;
    // A track note keeps its own words as they are typed (TrackNotePage), so
    // putting one down is only putting the song away. There is no listen to
    // write a draft of.
    if (song) {
      try { sessionStorage.removeItem(TRACK_NOTE_KEY); } catch { /* nothing to clear */ }
      return true;
    }
    if (!s.saved && !(await s.saveDraft())) return false;
    try { localStorage.removeItem(PENDING_KEY); } catch { /* nothing to clear */ }
    saidSoAboutTheDesk();
    return true;
  });


  // Back to the picker. Nothing is confirmed and nothing is lost: a listen with
  // writing on it is kept as a draft first, so it is waiting under Unfinished
  // when the picker comes back.
  async function leave() {
    // Kept, always — not only when something has been written. A record you
    // went and found is a record you meant to play, and losing the search
    // because you closed the screen before typing a word is the one thing
    // Miyel kept running into while testing (2026-09-18: "let's just let the
    // drafts build"). Drafts are cleared in a press each; a lost search is an
    // afternoon done twice.
    //
    // A draft that would not save keeps you here. The message is up, the
    // listen is still on screen behind it, and nothing has been cleared — so
    // pressing again after fixing whatever it was does the whole thing
    // properly. Leaving anyway would have thrown away the one copy of the
    // afternoon that is not on this device.
    if (!s.saved && !(await s.saveDraft())) return false;
    try { localStorage.removeItem(PENDING_KEY); } catch { /* nothing to clear */ }
    saidSoAboutTheDesk();
    setLanding(null);
    show(null);
    return true;
  }

  // ── The three words at the foot, 2026-09-29 ──────────────────────────────
  // Save draft keeps the listen and leaves. The draft was already saving
  // itself as you went and again on the way out, so this is a visible way
  // out rather than a new ability: over the journal it closes the sheet the
  // way the pull does, and the sheet's own hook writes the draft first;
  // opened cold it puts the record down and shows the picker.
  function saveDraftAndLeave() {
    if (exit) { exit(); return; }
    leave();
  }

  // Discard throws the listen away, draft included, and asks first: the
  // first press arms the word, the second does it, the same two presses a
  // draft's discard takes on the picker. Nothing here is written; both
  // copies of the draft go and the needle lifts.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return undefined;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  async function discard() {
    if (!armed) { setArmed(true); return; }
    setArmed(false);
    discarding.current = true;
    await s.discardDraft();
    try { localStorage.removeItem(PENDING_KEY); } catch { /* nothing to clear */ }
    saidSoAboutTheDesk();
    if (exit) { exit(); return; }
    setLanding(null);
    show(null);
    discarding.current = false;
  }

  // ── The way back, for a mouse, on a listen opened on its own ────────────
  // Over the journal the sheet has a caret and the pull; opened cold — a
  // reload mid-listen, the installed app — there was no way out a mouse
  // could make. This is Save draft's own move, then the journal, since there
  // is nothing behind a cold page to go back to. Drawn for a mouse and never
  // on a phone (.ses-back, entry.css).
  async function backToTheJournal() {
    if (song) {
      try { sessionStorage.removeItem(TRACK_NOTE_KEY); } catch { /* nothing to clear */ }
    } else if (pending?.album && !(await leave())) return;
    router.push('/');
  }

  // Every step change goes through here so the slide knows which way to travel.
  function goToStep(n) {
    if (n < 0 || n >= SESSION_STEPS.length) return;
    setStepDir(n >= step ? 1 : -1);
    setStep(n);
    setMaxStep(m => Math.max(m, n));
  }

  // No gate on the way forward: the preview is worth a look at any moment,
  // and saving is what waits for an album note.
  function forward() { goToStep(step + 1); }

  function swipeStart(e) {
    if (e.touches.length !== 1) return;
    // A drag that begins on a rating belongs to the rating. Setting the
    // album's score is a horizontal drag of exactly the kind this listens
    // for, so without this the last inch of a five-star drag turned the page
    // to the preview (Miyel, 2026-09-18: "make sure scroll is frozen for
    // rating album stars as well"). The same guard the tracks screen got the
    // day before, and the same one the layer's pull-to-close uses: the row
    // says what it is with role="slider", so nothing here has to know where
    // the stars are. The track strip earns the same guard and says it with
    // `data-slide`, because a tablist cannot claim to be a slider — sliding
    // along it moves through the tracks (Strip in steps/TrackNotes.js).
    if (e.target?.closest?.('[role="slider"], [data-slide]')) { swipe.current = null; return; }
    // And a drag in the note you are writing is selecting words, not turning
    // the page (Miyel, 2026-09-22: "I cannot highlight text without changing
    // screens"). The tracks screen keeps the same rule for its own swipe.
    if (e.target === document.activeElement && e.target.closest?.('textarea, input')) { swipe.current = null; return; }
    const t = e.touches[0];
    // Where the page was when the finger landed: a pull down means leave only
    // from the top, the same rule the sheet's own pull follows.
    swipe.current = { x: t.clientX, y: t.clientY, top: window.scrollY <= 0 };
  }
  function swipeEnd(e) {
    const from = swipe.current;
    swipe.current = null;
    if (!from) return;
    // A long press that selected a word on the way is not a swipe either.
    const field = document.activeElement;
    if (field?.matches?.('textarea, input') && field.selectionStart !== field.selectionEnd) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - from.x;
    const dy = t.clientY - from.y;
    // ── Down, out of a listen with no sheet around it ─────────────────────
    // In the layer this is the layer's own job and doing it here as well
    // would put the record down twice. Opened cold there is no layer and no
    // pull, and since the × came off (2026-09-18) there would otherwise be no
    // way out of the page at all — so the same gesture is honoured here, from
    // the top of the screen, and `leave` writes the draft exactly as the
    // sheet's own way out does.
    if (!layered && from.top && dy > 80 && dy > Math.abs(dx) * 1.5) { leave(); return; }
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) forward(); else goToStep(step - 1);
  }

  // ── Nothing blank where a record is already in hand ─────────────────────
  // This returned an empty box for the whole of the wristband check — a few
  // hundred milliseconds — which is invisible when you arrive at an address
  // and ruinous when you arrive by pressing a record. The cover is in the air
  // at that moment, flying toward the header this screen has not drawn yet:
  // it looks for `.ses-cover`, finds a blank box, and is set down where it
  // is. Which is precisely what Miyel kept seeing and I kept failing to
  // explain — "the album art you choose goes to the placeholder, good, then
  // the session screen just opens from the bottom and the art is at the mini
  // beacon from that." The second half of the move was never running.
  //
  // So a listen that already has a record on the desk draws while the check
  // happens. There is nothing to hide: the record came out of this browser's
  // own storage, every route it will ask for checks the wristband itself, and
  // the redirect below still fires the moment the answer says no.
  if (checking && !pending?.album && !song) return <div style={{ minHeight: '100dvh', background: 'var(--bg)' }} />;
  if (!checking && !authed) { if (typeof window !== 'undefined') window.location.replace('/login'); return null; }

  const open = !!pending?.album;

  // Where the flying cover is drawn this frame: at its start until told to go,
  // then translated and scaled onto the header's slot.
  let landingStyle = null;
  if (landing) {
    const { from, to, go } = landing;
    const travelling = go && to;
    const dx = travelling ? to.left - from.left : 0;
    const dy = travelling ? to.top - from.top : 0;
    const k  = travelling ? to.width / from.width : 1;
    landingStyle = {
      left: from.left, top: from.top, width: from.width, height: from.height,
      transform: `translate(${dx}px, ${dy}px) scale(${k})`,
      transition: travelling ? `transform ${LANDING_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)` : 'none',
    };
  }

  return (
    <div className={'ses' + (wide ? ' ses--wide' : '')} ref={root}>
      {!layered && (
        <button type="button" className="ses-back" onClick={backToTheJournal} aria-label="Back to the journal" title="Back to the journal">
          <CaretLeft size={18} weight="bold" aria-hidden="true" />
        </button>
      )}

      {song ? (
        /* ── A track note, being written ─────────────────────────────────
           The card itself, before it exists — the rule the preview already
           keeps for a listen: what is being written is shown as it will
           print. Saved, it goes the way a saved listen goes: over the cross,
           the cross drops the sheet onto the journal and the beacon takes it
           as the last thing logged; opened cold, the picker comes back. */
        <TrackNotePage
          writing
          authed
          entry={{
            song: song.song,
            album: song.album,
            artist: song.artist || '',
            year: song.year || '',
            genre: song.genre || '',
            album_art: song.artUrl || '',
            collection_id: song.collectionId || '',
            // What its draft already holds, when the song came from one —
            // pressed as a draft, or found again in the search (AlbumPicker).
            written: song.written || null,
          }}
          onSaved={saved => {
            try { sessionStorage.removeItem(TRACK_NOTE_KEY); } catch { /* nothing to clear */ }
            if (document.querySelector('.hn')) {
              saidSoAboutTheEntry({ slug: saved.slug, album: saved.album, artist: saved.artist, art: saved.album_art });
              return;
            }
            setSong(null);
          }}
          onLeave={() => {
            try { sessionStorage.removeItem(TRACK_NOTE_KEY); } catch { /* nothing to clear */ }
            if (layered) router.back();
            else setSong(null);
          }}
        />
      ) : !open ? (
        <AlbumPicker onPick={pick} onResume={resume} onPickSong={beginTrackNote} />
      ) : (
        <>
          {/* ── The foot: Discard · Save draft · Preview ─────────────────
              The band the entry's correction bar is (.ln-editing-bar), with
              three words: the one that ends the listen faint, the one that
              keeps it in ink, the one that goes forward underlined. On a desk
              the same three sit in a row at the top (.ses-bar). Only on the
              session: the preview has its own foot, with its own words. */}
          {step === 0 && (
            <div className="ln-editing-bar ses-bar">
              <button type="button" className={'ln-word ses-bar-discard' + (armed ? ' ses-bar-discard--armed' : '')} onClick={discard}>
                {armed ? 'Discard?' : 'Discard'}
              </button>
              <button type="button" className="ln-word" onClick={saveDraftAndLeave}>Save draft</button>
              <button type="button" className="ln-word ln-word--on" onClick={() => goToStep(1)}>Preview</button>
            </div>
          )}

          <main className={'ses-body ses-body--page' + (wide ? ' ses-body--desk' : '')} onTouchStart={swipeStart} onTouchEnd={swipeEnd}>
            <div className={'ses-page' + (landing ? ' ses-step ses-step--fade' : '')}>
              <AlbumNotes
                album={s.albumInput} artist={s.artistName} year={s.year} albumArt={s.albumArt}
                trackRatings={s.trackRatings}
                overallNotes={s.overallNotes} setOverallNotes={s.setOverallNotes}
                rating={s.rating} setRating={s.setRating}
                Masterpiece={s.Masterpiece}
                Favorite={s.Favorite} setFavorite={s.setFavorite}
                Formative={s.Formative} setFormative={s.setFormative}
              />
              <TrackNotes
                tracks={s.tracks} tracksLoading={s.tracksLoading}
                trackNotes={s.trackNotes}
                trackRatings={s.trackRatings} setTrackRatings={s.setTrackRatings}
                trackFavorites={s.trackFavorites} setTrackFavorites={s.setTrackFavorites}
                onAir={s.onAir} putOnAir={s.putOnAir}
                onOpenNote={openNote}
                onLookAgain={s.lookAgain}
                onHandTracks={s.takeHandTracks}
              />
            </div>
          </main>

          {/* The preview stands over the whole session on its own sheet — the
              entry page needs the viewport. The session stays mounted
              underneath, so the way back is instant. */}
          {step === 1 && (
            <SessionPreview
              album={s.albumInput} artist={s.artistName} year={s.year} albumArt={s.albumArt} genre={s.genre}
              overallNotes={s.overallNotes} hasWriting={s.hasWriting}
              rating={s.rating} Masterpiece={s.Masterpiece} Favorite={s.Favorite} Formative={s.Formative}
              entryType={s.entryType} receivedFrom={s.receivedFrom} receivedFromUrl={s.receivedFromUrl}
              tracks={s.tracks} trackRatings={s.trackRatings} trackFavorites={s.trackFavorites} trackNotes={s.trackNotes}
              saving={s.saving} saved={s.saved} savedEntry={s.savedEntry}
              doSave={s.doSave}
              onBack={() => goToStep(0)}
              onAnother={leave}
            />
          )}

          {/* A track's note, on its sheet over the list. */}
          <NoteSheet
            open={noting !== null && !!s.tracks?.[noting]}
            number={s.tracks?.[noting]?.number || (noting !== null ? noting + 1 : '')}
            title={s.tracks?.[noting]?.title || ''}
            rating={noting !== null ? (s.trackRatings[noting] || 0) : 0}
            favorite={noting !== null ? !!s.trackFavorites?.[noting] : false}
            note={noting !== null ? (s.trackNotes[noting] || '') : ''}
            kept={noting !== null ? (kept.current[noting] || '') : ''}
            onRate={v => { const k = noting; if (k !== null) s.setTrackRatings(prev => ({ ...prev, [k]: v })); }}
            onFavorite={() => { const k = noting; if (k !== null) s.setTrackFavorites(prev => ({ ...prev, [k]: !prev[k] })); }}
            onSend={() => { const t = s.tracks?.[noting]; if (t) sendTrack(t); }}
            onDone={doneNote}
            onCancel={cancelNote}
          />
        </>
      )}

      {landing && landingStyle && (
        <img src={landing.art} alt="" aria-hidden="true" className="ses-landing" style={landingStyle} />
      )}

      {/* Outside the picker/listen split on purpose: something can go wrong on
          either side of it, and the message is about the listen rather than
          about the screen it happened on. Last in the tree so it is over the
          preview's own sheet — the save that fails is pressed there, and an
          answer underneath the button that asked for it is no answer. */}
      <Trouble
        says={s.trouble?.says}
        because={s.trouble?.because}
        onClose={() => s.setTrouble(null)}
      />

      {/* The send sheet, with the song from the row that was pressed. A
          popup over the whole page (it portals onto the body), so it is
          centred on the screen and not on the layer. */}
      <SendSheet
        open={Boolean(sendingTrack)}
        onClose={() => setSendingTrack(null)}
        record={sendingTrack ? {
          album: s.albumInput,
          artist: s.artistName,
          year: s.year || '',
          album_art: s.albumArt || '',
          collection_id: s.collectionIdRef?.current || '',
          song: sendingTrack.title || '',
        } : null}
        foot="Your session stays open behind this"
      />
    </div>
  );
}
