// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fonts } from '../../../../library/sitewide_visuals';
import { tx, bdr, dk } from '../../../../library/session_styles';
import { entryTypeLabel } from '../../../../library/entry_formatter';
import { useListeningSession, SESSION_STEPS } from '../../../../hooks/useListeningSession';
import PasswordGate from '../../../../components/session_components/PasswordGate';
import SessionButton from '../../../../components/session_components/SessionButton';
import EchoNetwork from '../../../../components/EchoNetwork';
import { SessionDuration } from '../../../../library/session_timers';
import AlbumDebrief from '../../../../components/session_components/steps/AlbumDebrief';
import TrackNotes from '../../../../components/session_components/steps/TrackNotes';
import AlbumNotes from '../../../../components/session_components/steps/AlbumNotes';
import ScoreScreen from '../../../../components/session_components/steps/ScoreScreen';
import ReflectChat from '../../../../components/session_components/steps/ReflectChat';
import SessionPreview from '../../../../components/session_components/steps/SessionPreview';

// Tags used to sit between Score and Preview. They were generated rather than
// written, and nothing on the site ever found anything by one — the archive
// searches the notes instead now, and genre is its own field. The step and the
// display are gone; the column and everything already in it are untouched.
// The list itself lives with the hook, since the Listen page names steps too.

export default function EchoSessionPage() {
  const router = useRouter();

  // What the Listen page left behind: the album to open, and — when a saved
  // draft was picked up — the whole row rather than an id, so the session can
  // be put back without a second round trip. Read once here rather than in the
  // effects below, because whether this is a resumed listen decides what the
  // very first frame shows.
  const [pending] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ln_pending_session')); } catch { return null; }
  });
  const resumed = !!pending?.draft;

  const [authed, setAuthed]     = useState(false);
  const [checking, setChecking] = useState(true);
  const [step, setStep]         = useState(0);
  const [maxStep, setMaxStep]   = useState(0);
  const [stepDir, setStepDir]   = useState(1);   // 1 forward, -1 back — drives the slide
  const [askOpen, setAskOpen]   = useState(false);

  // Loading animation state (mirrors loading-test flow)
  const [zoomed, setZoomed]           = useState(true);
  const [dimmed, setDimmed]           = useState(true);
  const [nodeArt, setNodeArt]         = useState('');
  const [assembling, setAssembling]   = useState(false);
  const [rippleCount, setRippleCount] = useState(0);
  const [completing, setCompleting]   = useState(false);
  const [expandScale, setExpandScale] = useState(1);
  const [assembled, setAssembled]     = useState(false);
  const [puzzleDone, setPuzzleDone]   = useState(false);

  const {
    brief, researchState, researchError,
    albumArt, setAlbumArt, albumInput, setAlbumInput, artistName, setArtistName,
    overallNotes, setOverallNotes,
    rating, setRating, Masterpiece, setMasterpiece, Favorite, setFavorite,
    Formative, setFormative,
    entryType, setEntryType, setGenre,
    setReceivedFrom, setReceivedDate,
    tracks, tracksLoading, trackNotes, setTrackNotes, trackRatings, setTrackRatings,
    trackFavorites, setTrackFavorites,
    openTrack, setOpenTrack,
    chatMessages, chatInput, setChatInput, chatLoading,
    formatting, output, saving, saved, savedEntry,
    elapsed,
    draftState,
    doResearch, refreshResearch, doFormat, doSave, sendChat, saveDraft,
  } = useListeningSession({ step });

  // An album already in the briefings table comes back instantly, so there is
  // nothing to wait through — the assembly animation is for albums being
  // researched for the first time.
  const skipIntro = brief?.cached === true;

  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.json())
      .then(d => setAuthed(!!d.authed))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  // On mount: open the album the Listen page handed over and kick off research
  useEffect(() => {
    if (!authed) return;
    if (!pending?.album) { router.replace('/dashboard/echo'); return; }
    const {
      album, artist, artUrl, collectionId, genre: gen,
      entryType: et, draft,
      receivedFrom, receivedDate,
    } = pending;

    setAlbumInput(album);
    setArtistName(artist);
    if (artUrl) setAlbumArt(artUrl);
    setEntryType(et || '');
    setGenre(gen || '');
    // Present only on a listen started from the inbox — see the note in
    // useListeningSession. Nothing else in the flow sets or asks for them.
    setReceivedFrom(receivedFrom || '');
    setReceivedDate(receivedDate || '');

    // A resumed listen reopens on the step it was left on, and everything up
    // to it stays reachable in the sidebar.
    if (draft) { setStep(draft.step || 0); setMaxStep(draft.step || 0); }

    // Passed explicitly to avoid a stale-closure issue
    doResearch(album, artist, artUrl, { entryType: et || '', collectionId, draft });
  }, [authed]);

  // Animation timing — all relative to auth completing, fires exactly once.
  useEffect(() => {
    // Nothing to assemble on the way back into a listen already in progress —
    // the ceremony is for a record being opened for the first time.
    if (!authed || skipIntro || resumed) return;
    const artUrl = pending?.artUrl ?? '';

    // nodeArt + assembling fire immediately so the image starts loading right away.
    // The zoom transition starts at t=300ms and takes ~2.2s (ends ~t=2500ms).
    // Ripple 1 fires at t=2200ms so the wave sweeps in as the canvas finishes panning back.
    if (artUrl) { setNodeArt(artUrl); setAssembling(true); }
    const t1 = setTimeout(() => setZoomed(false), 300);
    const t2 = setTimeout(() => setDimmed(false), 600);
    const t3 = setTimeout(() => setRippleCount(1), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [authed, skipIntro, resumed]);

  // Escape closes the Echo drawer — along with the ✕ and clicking away, since
  // a panel that traps you is worse than no panel.
  useEffect(() => {
    if (!askOpen) return;
    const onKey = e => { if (e.key === 'Escape') setAskOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [askOpen]);

  // Below this there isn't room for a 220px sidebar, a readable set of notes and
  // a conversation all at once — the notes end up a few characters wide. The
  // column stops pushing and lays over the notes instead, which is worse than
  // side by side but better than squeezing both into nothing.
  const [narrow, setNarrow] = useState(false);

  // Narrower still, and the 220px sidebar is the thing to give up. Half a
  // laptop screen — this window on the left, Apple Music on the right — lands
  // around 640–870px, and at that width the artwork and the album details are
  // eating the room the writing needs. The steps still have to be reachable,
  // so the column becomes a rail of markers rather than disappearing.
  const [tight, setTight] = useState(false);
  useEffect(() => {
    const measure = () => {
      setNarrow(window.innerWidth < 1040);
      setTight(window.innerWidth < 900);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // The width decides, but not permanently — the album details are worth a
  // look now and then even in a small window. null means "do what the width
  // says"; the toggle sets it, and crossing the breakpoint hands control back,
  // so the automatic behaviour reasserts itself at each new size rather than
  // one click switching it off for the rest of the session.
  const [railOverride, setRailOverride] = useState(null);
  useEffect(() => { setRailOverride(null); }, [tight]);
  const railed = railOverride ?? tight;

  // The puzzle finished assembling.
  const handleAssembled = useCallback(() => setPuzzleDone(true), []);

  // Reveal the session as soon as the puzzle has assembled. The briefing keeps
  // streaming in behind the panel, so there is nothing left to wait on here —
  // which is the whole point: ~4s on this screen instead of ~55s.
  useEffect(() => {
    if (!puzzleDone) return;
    setCompleting(true);
    const t1 = setTimeout(() => {
      const gridSize = Math.min(window.innerWidth, window.innerHeight) * 0.60;
      const scale = Math.max(window.innerWidth / gridSize, window.innerHeight / gridSize) * 1.05;
      setExpandScale(scale);
    }, 16);
    const t2 = setTimeout(() => setAssembled(true), 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [puzzleDone]);

  // Every step change goes through here so the slide knows which way to travel.
  // Deliberately leaves askOpen alone: moving from Track Notes to Album Notes
  // shouldn't shut the conversation you're carrying between them.
  function goToStep(newStep) {
    setStepDir(newStep >= step ? 1 : -1);
    setStep(newStep);
    setMaxStep(m => Math.max(m, newStep));
  }

  // The two writing steps. Everywhere else the column stays out of the way,
  // but askOpen is remembered so it reopens on the way back.
  const canAsk = step === 1 || step === 2;
  const chatOpen = canAsk && askOpen;

  // What you'd ask mid-listen isn't what you'd ask once every track is written
  // up and the whole record has to become one take.
  const askPrompts = step === 2
    ? ['Pull my track notes into one take', 'What am I circling around?', 'Where do my notes contradict each other?']
    : ['Reflect on my notes so far', 'What patterns do you notice?', 'Push back on something I said'];

  if (checking) return <div style={{ minHeight: '100vh', background: '#f5f2ec' }} />;
  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />;

  // Show loading only until the assembly animation completes — and not at all
  // when the briefing was already on file.
  const showLoadingScreen = !assembled && !skipIntro && !resumed;

  return (
    <>
      <style>{`
        @keyframes ln-panel-appear { from{opacity:0;transform:translateY(14px) scale(0.99)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes ln-fade  { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes echo-cursor-blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes ln-dot   { 0%,60%,100%{opacity:0.25;transform:translateY(0)} 30%{opacity:0.9;transform:translateY(-3px)} }
        /* Steps rise from below going forward, settle from above going back. */
        @keyframes ln-step-fwd  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ln-step-back { from{opacity:0;transform:translateY(-20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ln-pulse { 0%,100%{opacity:0.35} 50%{opacity:0.8} }
        @keyframes ln-lit {
          0%,100% { box-shadow: 0 0 16px 2px rgba(255,255,255,0.32), 0 0 40px 10px rgba(255,255,255,0.12), inset 0 1px 0 rgba(255,255,255,0.20); }
          50%     { box-shadow: 0 0 28px 6px rgba(255,255,255,0.60), 0 0 68px 20px rgba(255,255,255,0.24), inset 0 1px 0 rgba(255,255,255,0.34); }
        }
        html, body { background: #f5f2ec !important; }
        /* The panel is dark, so a dark hairline thumb was invisible — and 3px
           is nothing to aim at on a long preview. Wide grab area, slim look. */
        ::-webkit-scrollbar { width: 12px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.3);
          border: 4px solid transparent;
          background-clip: content-box;
          border-radius: 99px;
        }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.5); background-clip: content-box; }
        * { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.32) transparent; }
        textarea::placeholder, input::placeholder { color: rgba(255,255,255,0.3); }
      `}</style>

      {/* EchoNetwork — puzzle assembly loading animation */}
      {showLoadingScreen && (
        <EchoNetwork
          searchQuery='' collapsed={false} albumArt='' onCollapsed={() => {}}
          dimmed={dimmed} zooming={zoomed} pulsing={false}
          spotlitArts={[]} spotlit={false} onSpotlit={() => {}} cardsEmerging={false}
          nodeArt={nodeArt} assembling={assembling} rippleCount={rippleCount}
          completing={completing} onAssembled={handleAssembled}
        />
      )}

      {/* Art expansion — assembled mosaic zooms to full-bleed before session panel appears */}
      {completing && nodeArt && (
        <img
          src={nodeArt}
          alt=""
          style={{
            position: 'fixed', zIndex: 5, pointerEvents: 'none', display: 'block',
            top: '50%', left: '50%',
            width: 'min(60vw, 60vh)', height: 'min(60vw, 60vh)',
            objectFit: 'cover',
            borderRadius: 16,
            transform: `translate(-50%, -50%) scale(${expandScale})`,
            transition: 'transform 1.1s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      )}

      {/* Art backgrounds — only visible once session panel is up */}
      {!showLoadingScreen && <>
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: '#fff', pointerEvents: 'none' }} />
        {albumArt && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1, backgroundImage: `url(${albumArt})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'grayscale(1) brightness(0.55)', transform: 'scale(1.04)', pointerEvents: 'none' }} />
        )}
        {albumArt && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 2, backgroundImage: `url(${albumArt})`, backgroundSize: 'cover', backgroundPosition: 'center', transform: 'scale(1.04)', pointerEvents: 'none' }} />
        )}
      </>}

      {/* ── Panel ── */}
      {!showLoadingScreen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', boxSizing: 'border-box' }}>
          <div style={{
            // Height comes from the padded box around it rather than its own vh
            // sum. Two sources of truth for the same height drifted apart while
            // a window was being dragged, which is what made resizing jump.
            width: '100%', maxWidth: 1100, height: '100%',
            position: 'relative', overflow: 'hidden', borderRadius: 22,
            border: `1px solid ${bdr(0.1)}`, boxShadow: `0 24px 80px ${bdr(0.35)}`,
            display: 'flex', animation: 'ln-panel-appear 0.5s cubic-bezier(0.34,1.2,0.64,1)',
          }}>

            {/* Blurred art background */}
            {albumArt ? (
              <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${albumArt})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(48px) saturate(1.4)', transform: 'scale(1.15)', zIndex: 0 }} />
            ) : <div style={{ position: 'absolute', inset: 0, background: '#1a1410', zIndex: 0 }} />}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(16,12,20,0.34)', zIndex: 1 }} />

            <div style={{ position: 'relative', zIndex: 2, display: 'flex', width: '100%', height: '100%' }}>

              {/* Sidebar */}
              {/* Scrolls on a short window. Without it the artwork and album
                  details pushed the step markers off the bottom with no way to
                  reach them. */}
              <div style={{ width: railed ? 56 : 220, flexShrink: 0, borderRight: `1px solid ${bdr(0.1)}`, display: 'flex', flexDirection: 'column', padding: '20px 0', background: 'rgba(0,0,0,0.08)', overflowY: 'auto', overflowX: 'hidden', transition: 'width 0.28s cubic-bezier(0.22,1,0.36,1)' }}>
                <a
                  href="/dashboard"
                  title="Dashboard"
                  style={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: tx(0.3), textDecoration: 'none', padding: railed ? 0 : '0 20px', marginBottom: 10, display: 'block', textAlign: railed ? 'center' : 'left', whiteSpace: 'nowrap' }}
                >
                  {railed ? '←' : '← Dashboard'}
                </a>

                {/* The way back to the artwork and the album details without
                    dragging the window wider. */}
                <button
                  onClick={() => setRailOverride(!railed)}
                  title={railed ? 'Show album details' : 'Collapse to steps only'}
                  aria-label={railed ? 'Show album details' : 'Collapse to steps only'}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: tx(0.3), fontFamily: fonts.mono, fontSize: 11, lineHeight: 1, padding: railed ? '4px 0' : '4px 20px', marginBottom: 12, textAlign: railed ? 'center' : 'right', width: '100%' }}
                >
                  {railed ? '»' : '«'}
                </button>

                {!railed && albumArt && (
                  <div style={{ margin: '0 16px 16px', borderRadius: 12, overflow: 'hidden', aspectRatio: '1', boxShadow: `0 8px 32px ${bdr(0.3)}`, flexShrink: 0 }}>
                    <img src={albumArt} alt={brief?.album} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                )}

                {!railed && brief && (
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

                {!railed && (entryType || elapsed > 0) && (
                  <div style={{ padding: '10px 16px', borderTop: `1px solid ${bdr(0.08)}`, borderBottom: `1px solid ${bdr(0.08)}`, marginBottom: 12 }}>
                    {entryType && <div style={{ fontFamily: fonts.mono, fontSize: 9, color: tx(0.38), letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>{entryTypeLabel(entryType)}</div>}
                    {elapsed > 0 && <div style={{ fontFamily: fonts.mono, fontSize: 9, color: tx(0.25), letterSpacing: '0.1em', marginTop: 4 }}>{SessionDuration(elapsed)}</div>}
                  </div>
                )}

                {/* The one thing the rail keeps. Losing the artwork costs you
                    nothing mid-listen; losing the way back to Track Notes
                    strands you. Collapsed, the markers centre and the labels
                    go to the tooltip. */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: railed ? '0 6px' : '0 10px' }}>
                  {SESSION_STEPS.map((label, id) => {
                    const isPast = id < step;
                    const isCurrent = id === step;
                    const isReachable = id <= maxStep;
                    return (
                      <button key={id} onClick={() => isReachable && !isCurrent && goToStep(id)} title={railed ? label : undefined} aria-label={railed ? label : undefined} style={{ display: 'flex', alignItems: 'center', justifyContent: railed ? 'center' : 'flex-start', gap: 10, padding: railed ? '10px 0' : '9px 12px', borderRadius: 10, width: '100%', textAlign: 'left', background: isCurrent ? 'rgba(255,255,255,0.18)' : 'transparent', border: 'none', cursor: isReachable && !isCurrent ? 'pointer' : 'default', transition: 'background 0.15s' }}>
                        <span style={{
                          width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                          background: isCurrent ? 'rgba(255,255,255,0.95)' : isPast ? bdr(0.42) : 'transparent',
                          border: `1px solid ${isCurrent ? 'rgba(255,255,255,0.95)' : isPast ? bdr(0.42) : bdr(0.26)}`,
                          boxShadow: isCurrent ? '0 0 10px 2px rgba(255,255,255,0.5), 0 0 24px 7px rgba(255,255,255,0.18)' : 'none',
                          transition: 'background 0.25s, box-shadow 0.25s, border-color 0.25s',
                        }} />
                        {!railed && (
                          <span style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.04em', color: isCurrent ? tx(0.88) : isPast ? tx(0.5) : tx(0.28), transition: 'color 0.15s', whiteSpace: 'nowrap' }}>
                            {label}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Save as Draft — the way out of a listen that isn't finished.
                    Sits under the steps rather than beside Next, because it
                    belongs to the session as a whole and not to any one screen.
                    Leaving is the ← Dashboard link above; this is what makes
                    leaving safe. */}
                {/* Kept in the rail too — this is what makes leaving safe, and
                    a narrow window is no reason to make it unreachable. The
                    word shortens; the button doesn't go anywhere. */}
                <div style={{ marginTop: 'auto', padding: railed ? '18px 6px 0' : '18px 16px 0' }}>
                  <SessionButton
                    onClick={saveDraft}
                    disabled={draftState === 'saving' || !(brief?.album || albumInput)}
                    title={railed ? 'Save as Draft' : undefined}
                    style={{ width: '100%', padding: railed ? '10px 0' : '10px 8px', fontSize: railed ? 9 : 10, letterSpacing: railed ? 0 : '0.08em' }}
                  >
                    {draftState === 'saving' ? (railed ? '…' : 'Saving…')
                      : draftState === 'saved' ? (railed ? 'Saved' : 'Draft saved')
                      : draftState === 'error' ? (railed ? 'Retry' : 'Try again')
                      : (railed ? 'Draft' : 'Save as Draft')}
                  </SessionButton>
                  {!railed && (
                    <div style={{ fontFamily: fonts.mono, fontSize: 8.5, lineHeight: 1.5, letterSpacing: '0.06em', color: tx(0.28), textAlign: 'center', marginTop: 8 }}>
                      Pick it back up from Listen
                    </div>
                  )}
                </div>
              </div>

              {/* Main content — narrows rather than hides when Echo opens, so
                  the notes stay writable with the conversation beside them. */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
                {/* The gutters give way too once the window is tight — the
                    point of collapsing the sidebar is room for the writing,
                    and 48px of air either side gives a good deal of it back. */}
                <div style={{ flex: 1, padding: tight ? '32px 20px 48px' : (chatOpen && !narrow ? '40px 30px 56px' : '40px 48px 56px'), transition: 'padding 0.32s cubic-bezier(0.22,1,0.36,1)' }}>
                  {/* Keyed on step so each screen mounts fresh and slides in. */}
                  <div key={step} style={{ animation: `${stepDir > 0 ? 'ln-step-fwd' : 'ln-step-back'} 0.35s cubic-bezier(0.22,1,0.36,1) both` }}>
                    {step === 0 && <AlbumDebrief brief={brief} researchState={researchState} researchError={researchError} onNext={() => goToStep(1)} onReset={() => router.replace('/dashboard/echo')} onRefresh={refreshResearch} />}
                    {step === 1 && <TrackNotes tracks={tracks} tracksLoading={tracksLoading} trackNotes={trackNotes} setTrackNotes={setTrackNotes} trackRatings={trackRatings} setTrackRatings={setTrackRatings} trackFavorites={trackFavorites} setTrackFavorites={setTrackFavorites} openTrack={openTrack} setOpenTrack={setOpenTrack} onNext={() => goToStep(2)} />}
                    {step === 2 && <AlbumNotes tracks={tracks} trackRatings={trackRatings} trackFavorites={trackFavorites} overallNotes={overallNotes} setOverallNotes={setOverallNotes} onNext={() => goToStep(3)} />}
                    {step === 3 && <ScoreScreen tracks={tracks} trackRatings={trackRatings} trackFavorites={trackFavorites} rating={rating} setRating={setRating} Masterpiece={Masterpiece} setMasterpiece={setMasterpiece} Favorite={Favorite} setFavorite={setFavorite} Formative={Formative} setFormative={setFormative} onNext={() => goToStep(4)} />}
                    {step === 4 && <SessionPreview brief={brief} albumArt={albumArt} output={output} formatting={formatting} rating={rating} Masterpiece={Masterpiece} Favorite={Favorite} Formative={Formative} entryType={entryType} saving={saving} saved={saved} savedEntry={savedEntry} overallNotes={overallNotes} tracks={tracks} trackRatings={trackRatings} trackFavorites={trackFavorites} doFormat={doFormat} doSave={doSave} />}
                  </div>
                </div>
              </div>

              {/* Ask Echo — a column of the panel rather than a layer over it,
                  so the notes narrow instead of going dark and the same thread
                  stays open from Track Notes through Album Notes. On a window
                  too narrow to hold both it lays over the notes instead. */}
              {narrow && chatOpen && (
                <div onClick={() => setAskOpen(false)} style={{ position: 'absolute', inset: 0, zIndex: 4, background: dk(0.28) }} />
              )}
              <div style={{
                ...(narrow
                  ? { position: 'absolute', top: 0, right: 0, bottom: 0, zIndex: 5,
                      width: chatOpen ? 'min(380px, 82%)' : 0,
                      boxShadow: chatOpen ? `-18px 0 50px ${dk(0.35)}` : 'none' }
                  : { position: 'relative', flexShrink: 0,
                      width: chatOpen ? 'clamp(300px, 34%, 380px)' : 0 }),
                overflow: 'hidden',
                borderLeft: chatOpen ? `1px solid ${bdr(0.14)}` : '1px solid transparent',
                background: chatOpen ? dk(narrow ? 0.62 : 0.5) : 'transparent',
                backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
                transition: 'width 0.32s cubic-bezier(0.22,1,0.36,1), background 0.32s',
              }}>
                {/* minWidth keeps the conversation from reflowing while the
                    column travels — it gets clipped, not squeezed. */}
                <div style={{ width: '100%', minWidth: 280, height: '100%', display: 'flex', flexDirection: 'column', padding: '22px 22px 20px', boxSizing: 'border-box' }}>
                  <ReflectChat
                    chatMessages={chatMessages} chatInput={chatInput} setChatInput={setChatInput}
                    chatLoading={chatLoading} sendChat={sendChat}
                    prompts={askPrompts}
                    open={chatOpen}
                    onClose={() => setAskOpen(false)}
                  />
                </div>
              </div>

              {/* Lit like the step markers in the sidebar — the same "this is
                  live" language. Hides while the column is open; the ✕ in the
                  chat header is the way back. */}
              {canAsk && !askOpen && (
                <button
                  onClick={() => setAskOpen(true)}
                  title="Ask Echo"
                  aria-label="Ask Echo"
                  style={{
                    position: 'absolute', top: 18, right: 18, zIndex: 4,
                    width: 34, height: 34, borderRadius: '50%',
                    fontFamily: fonts.mono, fontSize: 16, lineHeight: 1,
                    color: dk(0.82), background: 'rgba(255,255,255,0.92)',
                    border: `1px solid ${bdr(0.5)}`, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'ln-lit 2.4s ease-in-out infinite',
                  }}
                >
                  ?
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
