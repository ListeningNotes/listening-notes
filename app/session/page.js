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
      <style>{SESSION_CSS}</style>

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

// Kept with the page rather than in globals.css, the way AlbumFinder keeps its
// own: a block that arrives and leaves with the thing it styles can never
// become part of the stylesheet's cleanup problem. Everything reads the site's
// tokens, so the session follows the theme like every other page — it used to
// be the one dark glass panel on a light site.
const SESSION_CSS = `
  .ses {
    min-height: 100dvh;
    background: var(--bg);
    color: var(--ink);
    font-family: var(--font-nunito), sans-serif;
  }

  /* ── Type ──────────────────────────────────────────────────────────────── */
  .ses-label {
    font-family: var(--font-label); font-size: 10px;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--ink-faint);
  }
  .ses-title {
    font-family: var(--font-display); font-weight: var(--font-display-weight);
    font-size: clamp(1.45rem, 5.5vw, 1.9rem); line-height: 1.15;
    color: var(--ink); text-wrap: balance; margin: 0;
  }
  .ses-byline {
    font-family: var(--font-label); font-size: 11px;
    letter-spacing: 0.08em; color: var(--ink-soft);
  }
  .ses-prose { font-size: 15px; line-height: 1.85; color: var(--ink); white-space: pre-wrap; margin: 0; }
  .ses-prose a { color: inherit; }
  .ses-cite { line-height: 0; white-space: nowrap; }
  .ses-cite a {
    font-family: var(--font-label); font-size: 9.5px; padding: 0 1px;
    color: var(--ink-faint); text-decoration: none;
  }
  .ses-cite a:hover { color: var(--ink); }
  .ses-source {
    display: flex; align-items: baseline; gap: 8px;
    font-size: 13px; line-height: 1.5; color: var(--ink-soft); text-decoration: none;
  }
  .ses-source:hover { color: var(--ink); }
  .ses-source-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ses-chip {
    display: inline-flex; align-items: center; gap: 5px;
    font-family: var(--font-label); font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--ink-soft); border: 1px solid var(--border); border-radius: 4px; padding: 3px 8px;
  }
  .ses-rule { border: none; border-top: 1px solid var(--border); margin: 0; }

  /* ── Layout ────────────────────────────────────────────────────────────── */
  .ses-body {
    width: 100%; max-width: 680px; margin: 0 auto; box-sizing: border-box;
    padding: 24px 20px calc(56px + env(safe-area-inset-bottom, 0px));
  }
  @media (min-width: 769px) { .ses-body { padding: 40px 32px 80px; } }
  .ses-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
  .ses-center { display: flex; justify-content: center; align-items: center; }

  /* Screens rise from the right going forward, from the left coming back —
     the entry layer's language, on its curve. */
  .ses-step { animation: sesStepFwd 0.38s cubic-bezier(0.22, 0.61, 0.36, 1) both; }
  .ses-step--back { animation-name: sesStepBack; }
  .ses-step--fade { animation-name: sesStepFade; animation-duration: 0.5s; }
  @keyframes sesStepFade { from { opacity: 0; } to { opacity: 1; } }
  .ses-turn { animation: sesStepFwd 0.3s cubic-bezier(0.22, 0.61, 0.36, 1) both; }
  .ses-turn--back { animation-name: sesStepBack; }
  @keyframes sesStepFwd  { from { opacity: 0; transform: translateX(28px); }  to { opacity: 1; transform: none; } }
  @keyframes sesStepBack { from { opacity: 0; transform: translateX(-28px); } to { opacity: 1; transform: none; } }

  /* The cover on its way to the header. */
  .ses-landing {
    position: fixed; z-index: 50; pointer-events: none;
    object-fit: cover; border-radius: 6px; transform-origin: top left;
    box-shadow: 0 12px 40px rgba(0,0,0,0.28);
  }

  @media (prefers-reduced-motion: reduce) {
    .ses-step, .ses-turn { animation: none; }
  }

  /* ── Controls ──────────────────────────────────────────────────────────── */
  .ses-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    padding: 12px 24px; border-radius: 999px;
    border: 1px solid var(--border); background: transparent; color: var(--ink-soft);
    font-family: var(--font-label); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
    text-decoration: none; white-space: nowrap; cursor: pointer;
    transition: color 0.15s, border-color 0.15s, opacity 0.15s;
  }
  .ses-btn:hover { color: var(--ink); border-color: var(--ink-faint); }
  /* The preview's foot: the way back and the save, over the entry page. */
  .ses-preview { z-index: 210; }
  /* The foot of the preview, hung where the cross hangs its controls: the
     pencil-and-caret at the left edge, the save in the middle, over a soft
     fade so the writing dissolves under them rather than ending on a line. */
  .ses-preview-bar {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 220;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px;
    padding: 36px 24px max(18px, env(safe-area-inset-bottom, 0px));
    background: linear-gradient(to top, var(--bg) 55%, transparent 100%);
    pointer-events: none;
  }
  .ses-preview-bar > * { pointer-events: auto; }
  .ses-preview-bar .ses-actions { justify-content: center; }
  .ses-quiet--lead { color: var(--ink-soft); border-bottom-color: var(--ink-faint); }
  .ses-quiet:disabled { opacity: 0.4; cursor: default; }
  /* Room under the entry for the bar, so the last note is never under it. */
  .ses-preview .ln-content { padding-bottom: 140px !important; }

  .ses-btn--primary { background: var(--ink); color: var(--bg); border-color: var(--ink); }
  .ses-btn--primary:hover { color: var(--bg); opacity: 0.86; }
  .ses-btn:disabled { opacity: 0.35; cursor: default; pointer-events: none; }
  .ses-quiet {
    background: none; border: none; padding: 0 0 1px; cursor: pointer;
    font-family: var(--font-label); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--ink-faint); border-bottom: 1px solid var(--border);
    transition: color 0.15s;
  }
  .ses-quiet:hover { color: var(--ink-soft); }

  /* Toggles for the three marks. Small enough that all three sit in one row
     on a phone, and each takes its own colour once it is on — the same three
     the archive card and the entry use. */
  .ses-flag {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 12px; border-radius: 999px;
    border: 1px solid var(--border); background: transparent; color: var(--ink-faint);
    font-family: var(--font-label); font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase;
    cursor: pointer; transition: color 0.15s, border-color 0.15s, background 0.15s;
  }
  .ses-flag--on { background: var(--panel-strong); }
  .ses-flag--mp.ses-flag--on { color: var(--mp); border-color: var(--mp); }
  .ses-flag--fav.ses-flag--on { color: var(--fav); border-color: var(--fav); }
  .ses-flag--formative.ses-flag--on { color: var(--formative); border-color: var(--formative); }

  /* The same frosted recipe every other input on the site uses. */
  .ses-input {
    display: block; width: 100%; box-sizing: border-box;
    background: var(--panel); border: 1px solid var(--border); border-radius: 10px;
    color: var(--ink); padding: 12px 14px;
    font-family: var(--font-nunito), sans-serif; font-size: 14px; line-height: 1.6;
    outline: none; transition: border-color 0.15s;
  }
  .ses-input::placeholder { color: var(--ink-faint); }
  .ses-input:focus { border-color: var(--ink-faint); }
  .ses-textarea {
    display: block; width: 100%; box-sizing: border-box;
    background: transparent; border: none; border-bottom: 1px solid var(--border);
    outline: none; resize: none; overflow: hidden;
    font-family: var(--font-nunito), sans-serif; font-size: 15px; line-height: 1.8;
    color: var(--ink); padding: 6px 0; transition: border-color 0.15s;
  }
  .ses-textarea::placeholder { color: var(--ink-faint); }
  .ses-textarea:focus { border-color: var(--ink-faint); }
  /* 16px on touch, or Safari zooms the page in on focus and does not reliably
     zoom back out. See the longer note in app/submit/page.js. */
  @media (pointer: coarse) { .ses-input, .ses-textarea { font-size: 16px; } }
  .ses-field { display: flex; flex-direction: column; gap: 7px; }
  .ses-field--year { max-width: 150px; }

  .ses-pulse {
    display: inline-block; width: 7px; height: 7px; border-radius: 50%;
    background: var(--ink-soft); animation: sesPulse 1.5s ease-in-out infinite;
  }
  .ses-skel { height: 46px; border-radius: 8px; background: var(--panel); animation: sesPulse 1.6s ease-in-out infinite; }
  @keyframes sesPulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.9; } }

  /* ── Header ────────────────────────────────────────────────────────────── */
  .ses-head {
    position: sticky; top: 0; z-index: 20;
    background: var(--panel-strong);
    backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
    border-bottom: 1px solid var(--border);
    padding-top: env(safe-area-inset-top, 0px);
  }
  .ses-head-in { max-width: 680px; margin: 0 auto; padding: 10px 14px 0; box-sizing: border-box; }
  @media (min-width: 769px) { .ses-head-in { padding: 12px 32px 0; } }
  .ses-head-row { display: flex; align-items: center; gap: 12px; min-height: 48px; }
  .ses-back {
    flex-shrink: 0; width: 34px; height: 34px; border-radius: 50%; padding: 0;
    border: 1px solid var(--border); background: transparent; color: var(--ink-soft);
    display: flex; align-items: center; justify-content: center; cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }
  .ses-back:hover { color: var(--ink); border-color: var(--ink-faint); }
  /* The question mark. Lit the way the step markers used to be — a slow
     breath of light — so it reads as a door and not a decoration. */
  .ses-ask-btn {
    flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%; padding: 0;
    display: flex; align-items: center; justify-content: center;
    background: transparent; border: 1px solid var(--border); color: var(--ink-soft);
    font-family: var(--font-label); font-size: 13px; line-height: 1; cursor: pointer;
    animation: sesGlow 2.6s ease-in-out infinite;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
  }
  @keyframes sesGlow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(0,0,0,0); border-color: var(--border); }
    50%      { box-shadow: 0 0 12px 2px var(--panel-border); border-color: var(--ink-faint); }
  }
  .ses-ask-btn:hover, .ses-ask-btn--on { color: var(--bg); background: var(--ink); border-color: var(--ink); animation: none; }
  @media (prefers-reduced-motion: reduce) { .ses-ask-btn { animation: none; } }
  .ses-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .ses-head-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; padding-right: 4px; }
  .ses-head-album {
    font-family: var(--font-display); font-weight: 700; font-size: 14px; line-height: 1.2;
    color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .ses-head-artist {
    font-family: var(--font-label); font-size: 10px; letter-spacing: 0.08em;
    color: var(--ink-soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .ses-theme { width: 32px; height: 32px; flex-shrink: 0; color: var(--ink-soft); }
  .ses-theme:hover { color: var(--ink); }

  .ses-steps { display: flex; gap: 2px; margin: 4px -6px 0; }
  .ses-stepbtn {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px;
    padding: 10px 4px 12px; background: none; border: none;
    border-bottom: 2px solid transparent; cursor: pointer;
    font-family: var(--font-label); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--ink-faint); transition: color 0.15s, border-color 0.15s;
  }
  .ses-stepbtn--past { color: var(--ink-soft); }
  .ses-stepbtn--current { color: var(--ink); border-bottom-color: var(--ink); }
  .ses-stepbtn:disabled { cursor: default; }
  .ses-stepdot { width: 6px; height: 6px; border-radius: 50%; border: 1px solid currentColor; flex-shrink: 0; }
  .ses-stepbtn--past .ses-stepdot, .ses-stepbtn--current .ses-stepdot { background: currentColor; }

  /* ── The album screen ──────────────────────────────────────────────────── */
  .ses-album { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 14px; }
  .ses-album-art {
    width: clamp(180px, 54vw, 300px); aspect-ratio: 1; display: block; overflow: hidden;
    border-radius: 14px; background: var(--panel);
    box-shadow: 0 18px 44px rgba(0,0,0,0.18);
    margin-bottom: 10px; transition: opacity 0.2s;
  }
  .ses-album-art img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .ses-actions--center { justify-content: center; }
  .ses-album-brief { width: 100%; text-align: left; }

  /* ── Tracks, one at a time ─────────────────────────────────────────────── */
  .ses-track { touch-action: pan-y; }
  .ses-track-top { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }

  /* The strip — the horizon being built, one column per track. The label row
     is the entry page's: each title anchored at its column's centre and
     rotated down-left so its end points at the bar it belongs to. */
  /* Room on the left for the first title, which leans out past its own
     column the way every rotated label does. */
  .ses-strip { display: flex; gap: 3px; margin: 14px 0 22px; padding-left: 26px; }
  /* When the browser scrolls a focused field into view inside the layer, it
     lands under the header without this. */
  .lay--scrolls { scroll-padding-top: 120px; }
  .ses-strip-col {
    flex: 1; min-width: 0; display: grid; grid-template-rows: 56px 16px 82px;
    background: none; border: none; padding: 0; cursor: pointer; color: var(--ink-faint);
  }
  /* Headroom above a full bar for the heart a favourite carries. */
  .ses-strip-bars { position: relative; display: flex; align-items: flex-end; height: 100%; padding-top: 14px; box-sizing: border-box; }
  .ses-strip-heart {
    position: absolute; left: 50%; transform: translateX(-50%);
    display: inline-flex; line-height: 1; color: var(--ink); pointer-events: none;
  }
  .ses-strip-bar {
    display: block; width: 100%; border-radius: 3px 3px 0 0; background: var(--border);
    transition: height 0.3s cubic-bezier(0.34, 1.2, 0.64, 1), background 0.2s;
  }
  .ses-strip-bar--rated { background: var(--ink-soft); }
  .ses-strip-col--now .ses-strip-bar { background: var(--ink); }
  .ses-strip-dot {
    width: 7px; height: 7px; border-radius: 50%; justify-self: center; align-self: center;
    border: 1px solid var(--ink-faint); background: transparent;
    transition: background 0.2s, transform 0.2s, border-color 0.2s;
  }
  .ses-strip-col--done .ses-strip-dot { background: var(--ink-faint); }
  .ses-strip-col--now .ses-strip-dot { background: var(--ink); border-color: var(--ink); transform: scale(1.3); }
  .ses-strip-label { position: relative; display: block; height: 100%; }
  .ses-strip-title {
    position: absolute; top: 4px; right: 50%;
    transform-origin: 100% 0; transform: rotate(-52deg);
    display: block; max-width: 104px; text-align: right;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    font-family: var(--font-label); font-size: 9.5px; line-height: 1.2;
    color: var(--ink-faint); transition: color 0.15s;
  }
  .ses-strip-col--done .ses-strip-title { color: var(--ink-soft); }
  .ses-strip-col--now .ses-strip-title { color: var(--ink); }
  .ses-strip--dense .ses-strip-col { grid-template-rows: 52px 14px 70px; }
  .ses-strip--dense .ses-strip-title { max-width: 80px; font-size: 8.5px; }
  .ses-track-marks { display: flex; align-items: center; gap: 18px; margin: 20px 0 22px; }
  .ses-heart {
    display: inline-flex; padding: 4px; background: none; border: none; cursor: pointer;
    color: var(--ink-faint); transition: color 0.15s;
  }
  .ses-track-nav { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 26px; }
  .ses-caret {
    width: 36px; height: 36px; border-radius: 50%; padding: 0;
    display: flex; align-items: center; justify-content: center;
    border: 1px solid var(--border); background: transparent; color: var(--ink-soft); cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }
  .ses-caret:hover { color: var(--ink); border-color: var(--ink-faint); }

  /* ── The picker ────────────────────────────────────────────────────────── */
  /* Room for the nav row. On the page it is fixed and floats over the top,
     so the picker starts under it; on the layer it is in the flow (see
     .lay--scrolls .sitenav-row in globals.css) and the picker starts where
     it ends. */
  .ses-picker {
    max-width: 760px; margin: 0 auto; box-sizing: border-box;
    padding: calc(104px + var(--safe-top)) 20px calc(48px + env(safe-area-inset-bottom, 0px));
  }
  .lay--scrolls .ses-picker { padding-top: 18px; }
  .ses-under { display: flex; align-items: baseline; gap: 14px; min-height: 1.2em; margin-top: 10px; }
  .ses-under .ses-quiet { margin-left: auto; }
  .ses-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
    gap: 18px 14px; margin-top: 24px;
  }
  @media (min-width: 769px) { .ses-grid { grid-template-columns: repeat(auto-fill, minmax(136px, 1fr)); gap: 24px 18px; } }
  .ses-tile {
    display: flex; flex-direction: column; gap: 2px; min-width: 0;
    background: none; border: none; padding: 0; text-align: left; cursor: pointer; color: inherit;
  }
  .ses-tile-art {
    display: block; width: 100%; aspect-ratio: 1; border-radius: 6px; overflow: hidden;
    background: var(--panel); box-shadow: 0 4px 18px rgba(0,0,0,0.16); margin-bottom: 6px;
    transition: transform 0.2s cubic-bezier(0.34, 1.2, 0.64, 1);
  }
  .ses-tile-art img { width: 100%; height: 100%; object-fit: cover; display: block; }
  @media (hover: hover) { .ses-tile:hover .ses-tile-art { transform: scale(1.04); } }
  .ses-tile-name {
    font-weight: 600; font-size: 12px; line-height: 1.3; color: var(--ink);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .ses-tile-year {
    font-family: var(--font-label); font-size: 9px; color: var(--ink-faint);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .ses-hand { display: flex; flex-direction: column; gap: 16px; max-width: 440px; }

  .ses-drafts { display: flex; flex-direction: column; gap: 8px; margin-top: 30px; }
  .ses-drafts .ses-label { margin-bottom: 4px; }
  .ses-draft {
    display: flex; align-items: center; gap: 12px; padding: 8px;
    border-radius: 14px; background: var(--panel); border: 1px solid var(--border);
  }
  .ses-draft-open {
    flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px;
    background: none; border: none; padding: 0; cursor: pointer; text-align: left; color: inherit;
  }
  .ses-draft-art {
    width: 42px; height: 42px; border-radius: 9px; object-fit: cover; flex-shrink: 0;
    background: var(--border); display: block;
  }
  .ses-draft-album {
    display: block; font-weight: 600; font-size: 14px; color: var(--ink);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .ses-draft-meta {
    display: block; font-family: var(--font-label); font-size: 10px; color: var(--ink-soft);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px;
  }
  .ses-draft-x {
    flex-shrink: 0; height: 24px; min-width: 24px; padding: 0 8px; border-radius: 999px;
    border: none; background: var(--border); color: var(--ink-soft); cursor: pointer;
    font-family: var(--font-label); font-size: 10px; letter-spacing: 0.06em; line-height: 1;
    transition: background 0.15s, color 0.15s;
  }
  .ses-draft-x--sure { background: var(--ink); color: var(--bg); padding: 0 12px; }

  /* ── The reference ─────────────────────────────────────────────────────────
     A bottom sheet on a phone; a column beside the writing on a desk. */
  .ses-ask-scrim {
    position: fixed; inset: 0; z-index: 40;
    background: rgba(0, 0, 0, 0.14); animation: sesFade 0.18s ease;
  }
  @keyframes sesFade { from { opacity: 0; } to { opacity: 1; } }
  .ses-ask {
    position: fixed; left: 0; right: 0; z-index: 41;
    /* Both written from visualViewport while the sheet is open — how much of
       the bottom the keyboard covers, and how much screen is left above it.
       The fallbacks are the no-keyboard case. 96px stays clear at the top so
       the session header is still on screen. */
    bottom: var(--ask-lift, 0px);
    max-height: calc(min(var(--ask-room, 100dvh), 100dvh) - 96px);
    display: flex; flex-direction: column;
    background: var(--bg);
    border-top: 1px solid var(--panel-border); border-radius: 20px 20px 0 0;
    box-shadow: var(--shadow-lift);
    padding: 10px 16px calc(14px + env(safe-area-inset-bottom, 0px));
    box-sizing: border-box;
    animation: sesSlideUp 0.24s cubic-bezier(0.22, 0.61, 0.36, 1);
  }
  @keyframes sesSlideUp { from { transform: translateY(100%); } to { transform: none; } }
  .ses-ask--dragging { animation: none; transition: none; }
  .ses-ask--settling { animation: none; transition: transform 0.22s cubic-bezier(0.22, 0.61, 0.36, 1); }
  .ses-ask-head {
    position: relative; flex-shrink: 0;
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 0 10px; touch-action: none;
  }
  .ses-ask-grab {
    position: absolute; top: 0; left: 50%; transform: translateX(-50%);
    width: 36px; height: 4px; border-radius: 2px; background: var(--border);
  }
  .ses-ask-x {
    display: flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; border-radius: 50%; padding: 0;
    background: transparent; border: 1px solid var(--border); color: var(--ink-faint); cursor: pointer;
  }
  .ses-ask-x:hover { color: var(--ink); border-color: var(--ink-faint); }
  .ses-ask-list {
    flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain;
    display: flex; flex-direction: column; gap: 10px; padding: 2px 0 12px;
  }
  .ses-ask-msg {
    max-width: 88%; padding: 10px 14px; border-radius: 14px;
    font-size: 14px; line-height: 1.6; white-space: pre-wrap;
  }
  .ses-ask-msg--you { align-self: flex-end; background: var(--ink); color: var(--bg); }
  .ses-ask-msg--ref { align-self: flex-start; background: var(--panel-strong); border: 1px solid var(--border); color: var(--ink); }
  .ses-ask-row {
    flex-shrink: 0; display: flex; gap: 8px; align-items: center;
    padding-top: 10px; border-top: 1px solid var(--border);
  }
  .ses-ask-input { flex: 1; min-width: 0; }
  .ses-ask-row .ses-btn { padding: 12px 18px; }

  @media (min-width: 900px) {
    .ses-ask-scrim { display: none; }
    .ses-ask {
      top: 0; bottom: 0; left: auto; right: 0; width: 380px; max-height: none;
      border-radius: 0; border-top: none; border-left: 1px solid var(--border);
      box-shadow: none; padding: 18px 20px 20px;
      background: var(--panel-strong);
      backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
      animation: sesSlideIn 0.28s cubic-bezier(0.22, 0.61, 0.36, 1);
    }
    @keyframes sesSlideIn { from { transform: translateX(100%); } to { transform: none; } }
    .ses-ask--dragging, .ses-ask--settling { transform: none !important; }
    .ses-ask-grab { display: none; }
    .ses-ask-head { touch-action: auto; padding-top: 0; }
    /* The writing moves over rather than going dark. */
    .ses--ask .ses-body, .ses--ask .ses-head-in { margin-left: auto; margin-right: 400px; }
  }
`;
