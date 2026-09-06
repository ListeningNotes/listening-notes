// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/session/page.js
// Find the album, log the listen.
//
// One address for the whole thing. With nothing on the desk it is the picker:
// a search field and a grid of covers. Tap one and the same page becomes the
// listen — the cover settles into the header, and the four screens turn
// underneath it: the album, the tracks one at a time, the note and score, the
// preview. The record being listened to is kept in the browser, so a reload,
// a locked phone or a closed tab reopens where you were.
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
// Every screen holds one thing and runs full-bleed, on both devices. The
// difference between a phone and a desk is the width of the column, and
// nothing else — no step, field or mark exists on one and not the other.
//
// ── How it is usually reached ─────────────────────────────────────────────
// From the desk, as a layer: app/@layer/(.)session intercepts this address
// and draws this same component on the sheet an entry arrives on, so it
// slides in from the right and a swipe puts you back on the desk. Opened
// cold it is a page. Nothing here knows which; the one rule that differs —
// where the nav row sits — is CSS scoped to the layer.

'use client';
import { useState, useEffect, useRef } from 'react';
import { useBookplate } from '../../components/main_components/Bookplate';
import { useListeningSession, SESSION_STEPS, PENDING_KEY } from '../../hooks/useListeningSession';
import AlbumPicker from '../../components/session_components/AlbumPicker';
import SessionHeader from '../../components/session_components/SessionHeader';
import AskSheet from '../../components/session_components/AskSheet';
import AlbumScreen from '../../components/session_components/steps/AlbumScreen';
import TrackNotes from '../../components/session_components/steps/TrackNotes';
import AlbumNotes from '../../components/session_components/steps/AlbumNotes';
import SessionPreview from '../../components/session_components/steps/SessionPreview';

// How long the picked cover takes to reach the header. The step body slides in
// on the same curve at nearly the same length, so the two read as one move.
const LANDING_MS = 520;

export default function SessionPage() {
  const { research_available } = useBookplate();
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

  const [step, setStep]       = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [stepDir, setStepDir] = useState(1);   // 1 forward, -1 back — drives the slide

  // The reference's sheet. Closed on every change of record.
  const [asking, setAsking] = useState(false);


  // The cover in flight from the grid to the album screen: where it started,
  // where it is going, and whether it has been told to go.
  const [landing, setLanding] = useState(null);
  const coverRef = useRef(null);

  // A finger travelling across a screen. The tracks screen turns its own
  // pages and hands over at either end; everywhere else this turns the step.
  const swipe = useRef(null);

  const s = useListeningSession({ step });

  // Puts a record on the desk — or clears it, with null — and lands on the
  // step it was left at. Called from whatever caused the change: the door
  // opening on a record already there, a tap in the picker, the back caret.
  function show(record) {
    const at = s.beginListen(record?.album ? record : null);
    setStep(at);
    setMaxStep(at);
    setStepDir(1);
    setAsking(false);
    setPending(record?.album ? record : null);
  }

  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.json())
      .then(d => {
        const ok = !!d.authed;
        setAuthed(ok);
        // What was left on the desk — by the inbox, or by this page before a
        // reload — opens as soon as the door does.
        if (ok && pending?.album) show(pending);
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
      const slot = coverRef.current;
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
  useEffect(() => {
    if (!s.saved) return;
    try { localStorage.removeItem(PENDING_KEY); } catch { /* nothing to clear */ }
  }, [s.saved]);

  // From the picker: a record, and the box its cover was tapped in.
  function pick(record, from) {
    try { localStorage.setItem(PENDING_KEY, JSON.stringify(record)); } catch { /* the listen still opens */ }
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (from && record.artUrl && !still) setLanding({ art: record.artUrl, from, to: null, go: false });
    show(record);
  }

  // A saved draft travels whole, so the session can put the notes back without
  // a second round trip.
  function resume(draft) {
    pick({
      album: draft.album,
      artist: draft.artist || '',
      year: draft.year || '',
      artUrl: draft.album_art || '',
      collectionId: draft.collection_id || null,
      genre: draft.genre || '',
      entryType: draft.entry_type || '',
      draft,
    }, null);
  }

  // Back to the picker. Nothing is confirmed and nothing is lost: a listen with
  // writing on it is kept as a draft first, so it is waiting under Unfinished
  // when the picker comes back.
  async function leave() {
    if (s.hasWriting && !s.saved) await s.saveDraft();
    try { localStorage.removeItem(PENDING_KEY); } catch { /* nothing to clear */ }
    setLanding(null);
    show(null);
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
    const t = e.touches[0];
    swipe.current = { x: t.clientX, y: t.clientY };
  }
  function swipeEnd(e) {
    const from = swipe.current;
    swipe.current = null;
    if (!from || step === 1) return;   // the tracks screen has its own
    const t = e.changedTouches[0];
    const dx = t.clientX - from.x;
    const dy = t.clientY - from.y;
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) forward(); else goToStep(step - 1);
  }

  if (checking) return <div style={{ minHeight: '100dvh', background: 'var(--bg)' }} />;
  if (!authed) { if (typeof window !== 'undefined') window.location.replace('/login'); return null; }

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
    <div className={'ses' + (asking ? ' ses--ask' : '')}>

      {!open ? (
        <AlbumPicker onPick={pick} onResume={resume} />
      ) : (
        <>
          <SessionHeader
            album={s.albumInput}
            artist={s.artistName}
            year={s.year || s.brief?.year || ''}
            step={step}
            onStep={goToStep}
            onBack={leave}
            canAsk={!!research_available}
            onAsk={() => setAsking(a => !a)}
            asking={asking}
          />

          <main className="ses-body" onTouchStart={swipeStart} onTouchEnd={swipeEnd}>
            {/* Keyed on step so each screen mounts fresh and slides in. */}
            <div key={step} className={'ses-step' + (landing ? ' ses-step--fade' : stepDir < 0 ? ' ses-step--back' : '')}>
              {step === 0 && (
                <AlbumScreen
                  album={s.albumInput} artist={s.artistName} year={s.year} genre={s.genre}
                  entryType={s.entryType} receivedFrom={s.receivedFrom} albumArt={s.albumArt}
                  resuming={s.hasWriting || maxStep > 0}
                  coverRef={coverRef} coverHidden={!!landing}
                  brief={s.brief} researchState={s.researchState} researchError={s.researchError}
                  onResearch={() => s.doResearch()}
                  onRefresh={() => s.doResearch({ refresh: true })}
                  onNext={() => goToStep(1)}
                />
              )}
              {step === 1 && (
                <TrackNotes
                  tracks={s.tracks} tracksLoading={s.tracksLoading}
                  trackNotes={s.trackNotes} setTrackNotes={s.setTrackNotes}
                  trackRatings={s.trackRatings} setTrackRatings={s.setTrackRatings}
                  trackFavorites={s.trackFavorites} setTrackFavorites={s.setTrackFavorites}
                  openTrack={s.openTrack} setOpenTrack={s.setOpenTrack}
                  onPrev={() => goToStep(0)}
                  onNext={() => goToStep(2)}
                />
              )}
              {step === 2 && (
                <AlbumNotes
                  tracks={s.tracks} trackRatings={s.trackRatings} trackFavorites={s.trackFavorites}
                  overallNotes={s.overallNotes} setOverallNotes={s.setOverallNotes}
                  rating={s.rating} setRating={s.setRating}
                  Masterpiece={s.Masterpiece} setMasterpiece={s.setMasterpiece}
                  Favorite={s.Favorite} setFavorite={s.setFavorite}
                  Formative={s.Formative} setFormative={s.setFormative}
                  onNext={() => goToStep(3)}
                />
              )}
            </div>
          </main>

          {/* The preview stands over the whole session on its own sheet — the
              entry page needs the viewport. The notes screen stays mounted
              underneath, so the way back is instant. */}
          {step === 3 && (
            <SessionPreview
              album={s.albumInput} artist={s.artistName} year={s.year || s.brief?.year || ''} albumArt={s.albumArt} genre={s.genre || s.brief?.genre || ''}
              overallNotes={s.overallNotes}
              rating={s.rating} Masterpiece={s.Masterpiece} Favorite={s.Favorite} Formative={s.Formative}
              entryType={s.entryType} receivedFrom={s.receivedFrom}
              tracks={s.tracks} trackRatings={s.trackRatings} trackFavorites={s.trackFavorites} trackNotes={s.trackNotes}
              saving={s.saving} saved={s.saved} savedEntry={s.savedEntry}
              doSave={s.doSave}
              onBack={() => goToStep(2)}
              onAnother={leave}
            />
          )}

          <AskSheet
            open={asking}
            onClose={() => setAsking(false)}
            messages={s.chatMessages}
            input={s.chatInput}
            setInput={s.setChatInput}
            loading={s.chatLoading}
            onSend={() => s.sendChat()}
          />
        </>
      )}

      {landing && landingStyle && (
        <img src={landing.art} alt="" aria-hidden="true" className="ses-landing" style={landingStyle} />
      )}
    </div>
  );
}
