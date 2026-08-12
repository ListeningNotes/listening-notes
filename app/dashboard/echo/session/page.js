'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fonts } from '../../../../library/sitewide_visuals';
import { tx, bdr, dk } from '../../../../library/session_styles';
import { entryTypeLabel } from '../../../../library/entry_formatter';
import { useListeningSession } from '../../../../hooks/useListeningSession';
import PasswordGate from '../../../../components/session_components/PasswordGate';
import EchoNetwork from '../../../../components/EchoNetwork';
import { SessionDuration } from '../../../../library/session_timers';
import AlbumDebrief from '../../../../components/session_components/steps/AlbumDebrief';
import TrackNotes from '../../../../components/session_components/steps/TrackNotes';
import AlbumNotes from '../../../../components/session_components/steps/AlbumNotes';
import ScoreScreen from '../../../../components/session_components/steps/ScoreScreen';
import ReflectChat from '../../../../components/session_components/steps/ReflectChat';
import TagsEditor from '../../../../components/session_components/steps/TagsEditor';
import SessionPreview from '../../../../components/session_components/steps/SessionPreview';

const STEPS = [
  { id: 0, label: 'Album Debrief' },
  { id: 1, label: 'Track Notes' },
  { id: 2, label: 'Album Notes' },
  { id: 3, label: 'Score' },
  { id: 4, label: 'Tags' },
  { id: 5, label: 'Preview' },
];

export default function EchoSessionPage() {
  const router = useRouter();

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
    entryType, setEntryType, relationship, setRelationship,
    tracks, tracksLoading, trackNotes, setTrackNotes, trackRatings, setTrackRatings,
    trackFavorites, setTrackFavorites,
    openTrack, setOpenTrack,
    chatMessages, chatInput, setChatInput, chatLoading, chatEndRef,
    sessionTags, setSessionTags, tagInput, setTagInput,
    formatting, output, saving, saved,
    elapsed,
    doResearch, refreshResearch, doFormat, doSave, sendChat,
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

  // On mount: read pending session from localStorage and kick off research
  useEffect(() => {
    if (!authed) return;
    try {
      const raw = localStorage.getItem('ln_pending_session');
      if (!raw) { router.replace('/dashboard/echo'); return; }
      const pending = JSON.parse(raw);
      const { album, artist, year, artUrl, collectionId, relationship: rel, entryType: et } = pending;

      setAlbumInput(album);
      setArtistName(artist);
      if (artUrl) setAlbumArt(artUrl);
      setRelationship(rel || '');
      setEntryType(et || '');

      // Pass relationship/entryType explicitly to avoid stale-closure issue
      doResearch(album, artist, artUrl, { relationship: rel || '', entryType: et || '', collectionId });
    } catch {
      router.replace('/dashboard/echo');
    }
  }, [authed]);

  // Animation timing — all relative to auth completing, fires exactly once.
  // Reads artUrl directly from localStorage (same pattern as loading-test).
  useEffect(() => {
    if (!authed || skipIntro) return;
    let artUrl = '';
    try {
      const raw = localStorage.getItem('ln_pending_session');
      artUrl = raw ? (JSON.parse(raw)?.artUrl ?? '') : '';
    } catch { /* ignore */ }

    // nodeArt + assembling fire immediately so the image starts loading right away.
    // The zoom transition starts at t=300ms and takes ~2.2s (ends ~t=2500ms).
    // Ripple 1 fires at t=2200ms so the wave sweeps in as the canvas finishes panning back.
    if (artUrl) { setNodeArt(artUrl); setAssembling(true); }
    const t1 = setTimeout(() => setZoomed(false), 300);
    const t2 = setTimeout(() => setDimmed(false), 600);
    const t3 = setTimeout(() => setRippleCount(1), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [authed, skipIntro]);

  // Escape closes the Echo drawer — along with the ✕ and clicking away, since
  // a panel that traps you is worse than no panel.
  useEffect(() => {
    if (!askOpen) return;
    const onKey = e => { if (e.key === 'Escape') setAskOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [askOpen]);

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
  function goToStep(newStep) {
    setStepDir(newStep >= step ? 1 : -1);
    setStep(newStep);
    setMaxStep(m => Math.max(m, newStep));
    setAskOpen(false);
  }

  if (checking) return <div style={{ minHeight: '100vh', background: '#f5f2ec' }} />;
  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />;

  // Show loading only until the assembly animation completes — and not at all
  // when the briefing was already on file.
  const showLoadingScreen = !assembled && !skipIntro;

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
        @keyframes ln-drawer-in { from{opacity:0;transform:translateX(28px)} to{opacity:1;transform:translateX(0)} }
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
            width: '100%', maxWidth: 1100, height: 'calc(100vh - 48px)',
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
              <div style={{ width: 220, flexShrink: 0, borderRight: `1px solid ${bdr(0.1)}`, display: 'flex', flexDirection: 'column', padding: '20px 0', background: 'rgba(0,0,0,0.08)' }}>
                <a href="/dashboard" style={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: tx(0.3), textDecoration: 'none', padding: '0 20px', marginBottom: 16, display: 'block' }}>← Dashboard</a>

                {albumArt && (
                  <div style={{ margin: '0 16px 16px', borderRadius: 12, overflow: 'hidden', aspectRatio: '1', boxShadow: `0 8px 32px ${bdr(0.3)}`, flexShrink: 0 }}>
                    <img src={albumArt} alt={brief?.album} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                )}

                {brief && (
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

                {(relationship || entryType || elapsed > 0) && (
                  <div style={{ padding: '10px 16px', borderTop: `1px solid ${bdr(0.08)}`, borderBottom: `1px solid ${bdr(0.08)}`, marginBottom: 12 }}>
                    {relationship && <div style={{ fontFamily: fonts.mono, fontSize: 9, color: tx(0.38), letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>{relationship}</div>}
                    {entryType && <div style={{ fontFamily: fonts.mono, fontSize: 9, color: tx(0.38), letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>{entryTypeLabel(entryType)}</div>}
                    {elapsed > 0 && <div style={{ fontFamily: fonts.mono, fontSize: 9, color: tx(0.25), letterSpacing: '0.1em', marginTop: 4 }}>{SessionDuration(elapsed)}</div>}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 10px' }}>
                  {STEPS.map(s => {
                    const isPast = s.id < step;
                    const isCurrent = s.id === step;
                    const isReachable = s.id <= maxStep;
                    return (
                      <button key={s.id} onClick={() => isReachable && !isCurrent && goToStep(s.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, width: '100%', textAlign: 'left', background: isCurrent ? 'rgba(255,255,255,0.18)' : 'transparent', border: 'none', cursor: isReachable && !isCurrent ? 'pointer' : 'default', transition: 'background 0.15s' }}>
                        <span style={{
                          width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                          background: isCurrent ? 'rgba(255,255,255,0.95)' : isPast ? bdr(0.42) : 'transparent',
                          border: `1px solid ${isCurrent ? 'rgba(255,255,255,0.95)' : isPast ? bdr(0.42) : bdr(0.26)}`,
                          boxShadow: isCurrent ? '0 0 10px 2px rgba(255,255,255,0.5), 0 0 24px 7px rgba(255,255,255,0.18)' : 'none',
                          transition: 'background 0.25s, box-shadow 0.25s, border-color 0.25s',
                        }} />
                        <span style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.04em', color: isCurrent ? tx(0.88) : isPast ? tx(0.5) : tx(0.28), transition: 'color 0.15s' }}>
                          {s.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Main content */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
                <div style={{ flex: 1, padding: '40px 48px 56px' }}>
                  {/* Keyed on step so each screen mounts fresh and slides in. */}
                  <div key={step} style={{ animation: `${stepDir > 0 ? 'ln-step-fwd' : 'ln-step-back'} 0.35s cubic-bezier(0.22,1,0.36,1) both` }}>
                    {step === 0 && <AlbumDebrief brief={brief} researchState={researchState} researchError={researchError} onNext={() => goToStep(1)} onReset={() => router.replace('/dashboard/echo')} onRefresh={refreshResearch} />}
                    {step === 1 && <TrackNotes tracks={tracks} tracksLoading={tracksLoading} trackNotes={trackNotes} setTrackNotes={setTrackNotes} trackRatings={trackRatings} setTrackRatings={setTrackRatings} trackFavorites={trackFavorites} setTrackFavorites={setTrackFavorites} openTrack={openTrack} setOpenTrack={setOpenTrack} onNext={() => goToStep(2)} onAsk={() => setAskOpen(true)} />}
                    {step === 2 && <AlbumNotes tracks={tracks} trackRatings={trackRatings} trackFavorites={trackFavorites} overallNotes={overallNotes} setOverallNotes={setOverallNotes} onNext={() => goToStep(3)} />}
                    {step === 3 && <ScoreScreen tracks={tracks} trackRatings={trackRatings} trackFavorites={trackFavorites} rating={rating} setRating={setRating} Masterpiece={Masterpiece} setMasterpiece={setMasterpiece} Favorite={Favorite} setFavorite={setFavorite} onNext={() => goToStep(4)} />}
                    {step === 4 && <TagsEditor sessionTags={sessionTags} setSessionTags={setSessionTags} tagInput={tagInput} setTagInput={setTagInput} formatting={formatting} onNext={() => goToStep(5)} />}
                    {step === 5 && <SessionPreview brief={brief} albumArt={albumArt} output={output} formatting={formatting} rating={rating} sessionTags={sessionTags} saving={saving} saved={saved} overallNotes={overallNotes} tracks={tracks} trackRatings={trackRatings} trackFavorites={trackFavorites} doFormat={doFormat} doSave={doSave} />}
                  </div>
                </div>
              </div>

              {/* Ask Echo — slides in over the track list, tracks still visible
                  beside it. Lives here rather than inside TrackNotes so it can
                  sit inside the panel instead of floating over the viewport. */}
              {step === 1 && askOpen && (
                <div
                  onClick={() => setAskOpen(false)}
                  style={{ position: 'absolute', inset: 0, zIndex: 4, background: dk(0.28) }}
                />
              )}
              {step === 1 && askOpen && (
                <div style={{
                  position: 'absolute', top: 0, right: 0, bottom: 0,
                  width: 'min(420px, 58%)', zIndex: 5,
                  display: 'flex', flexDirection: 'column',
                  padding: '22px 22px 20px',
                  background: dk(0.62),
                  backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
                  borderLeft: `1px solid ${bdr(0.14)}`,
                  boxShadow: `-18px 0 50px ${dk(0.35)}`,
                  animation: 'ln-drawer-in 0.3s cubic-bezier(0.22,1,0.36,1)',
                }}>
                  <ReflectChat
                    chatMessages={chatMessages} chatInput={chatInput} setChatInput={setChatInput}
                    chatLoading={chatLoading} chatEndRef={chatEndRef} sendChat={sendChat}
                    onClose={() => setAskOpen(false)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
