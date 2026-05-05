'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fonts } from '../../../library/sitewide_visuals';
import { tx, bdr } from '../../../library/session_styles';
import { useListeningSession } from '../../../hooks/useListeningSession';
import PasswordGate from '../../../components/session_components/PasswordGate';
import EchoOrb from '../../../components/EchoOrb';
import EchoChat from '../../../components/EchoChat';
import EchoNetwork from '../../../components/EchoNetwork';
import { SessionDuration, LOADING_PHRASES } from '../../../library/session_timers';
import AlbumDebrief from '../../../components/session_components/steps/AlbumDebrief';
import TrackNotes from '../../../components/session_components/steps/TrackNotes';
import AlbumNotes from '../../../components/session_components/steps/AlbumNotes';
import ReflectChat from '../../../components/session_components/steps/ReflectChat';
import TagsEditor from '../../../components/session_components/steps/TagsEditor';
import SessionPreview from '../../../components/session_components/steps/SessionPreview';

const STEPS = [
  { id: 0, label: 'Album Debrief' },
  { id: 1, label: 'Track Notes' },
  { id: 2, label: 'Album Notes' },
  { id: 3, label: 'Reflect' },
  { id: 4, label: 'Tags' },
  { id: 5, label: 'Preview' },
];

export default function EchoSessionPage() {
  const router = useRouter();

  const [authed, setAuthed]   = useState(false);
  const [checking, setChecking] = useState(true);
  const [step, setStep]       = useState(0);
  const [maxStep, setMaxStep] = useState(0);

  const {
    brief, researchState, researchError, phraseIndex,
    albumArt, setAlbumArt, albumInput, setAlbumInput, artistName, setArtistName,
    overallNotes, setOverallNotes,
    rating, setRating, Masterpiece, setMasterpiece, Favorite, setFavorite,
    entryType, setEntryType, relationship, setRelationship,
    tracks, tracksLoading, trackNotes, setTrackNotes, trackRatings, setTrackRatings,
    openTrack, setOpenTrack,
    echoDebrief, echoDebriefLoading, echoMood, setEchoMood,
    echoActive, echoChatOpen, setEchoChatOpen,
    echoChatHistory, echoChatInput, setEchoChatInput, echoChatLoading,
    chatMessages, chatInput, setChatInput, chatLoading, chatEndRef,
    sessionTags, setSessionTags, tagInput, setTagInput,
    formatting, output, saving, saved,
    elapsed,
    doResearch, doFormat, doSave, sendEchoChat, sendChat,
  } = useListeningSession({ step });

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
      if (!raw) { router.replace('/echo'); return; }
      const pending = JSON.parse(raw);
      const { album, artist, year, artUrl, relationship: rel, entryType: et } = pending;

      setAlbumInput(album);
      setArtistName(artist);
      if (artUrl) setAlbumArt(artUrl);
      setRelationship(rel || '');
      setEntryType(et || '');
      setEchoMood('thinking');

      // Pass relationship/entryType explicitly to avoid stale-closure issue
      doResearch(album, artist, artUrl, { relationship: rel || '', entryType: et || '' });
    } catch {
      router.replace('/echo');
    }
  }, [authed]);

  function advanceTo(newStep) {
    setStep(newStep);
    setMaxStep(m => Math.max(m, newStep));
  }

  if (checking) return <div style={{ minHeight: '100vh', background: '#f5f2ec' }} />;
  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />;

  const showLoadingScreen = researchState !== 'done' && researchState !== 'error';

  return (
    <>
      <style>{`
        @keyframes ln-art-sweep { 0%{clip-path:inset(100% 0 0 0)} 100%{clip-path:inset(10% 0 0 0)} }
        .ln-art-loading { animation: ln-art-sweep 14s cubic-bezier(0.4,0,0.2,1) forwards; }
        .ln-art-done    { clip-path: inset(0%) !important; transition: clip-path 0.7s ease !important; }
        @keyframes ln-panel-appear { from{opacity:0;transform:translateY(14px) scale(0.99)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes ln-fade  { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ln-dot   { 0%,80%,100%{opacity:0.18;transform:scale(0.7)} 40%{opacity:1;transform:scale(1)} }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 99px; }
        textarea::placeholder { color: rgba(255,255,255,0.28); }
      `}</style>

      {/* EchoNetwork — loading backdrop only */}
      {showLoadingScreen && (
        <EchoNetwork
          searchQuery=''
          collapsed={true}
          albumArt={albumArt}
          onCollapsed={() => {}}
          dimmed={false}
          zooming={false}
          spotlitArts={[]}
          spotlit={false}
          onSpotlit={() => {}}
          cardsEmerging={false}
        />
      )}

      {/* EchoOrb — compact 56px */}
      <EchoOrb
        albumArt={albumArt}
        mood={echoMood}
        active={echoActive}
        loading={researchState === 'loading'}
        onClick={researchState === 'done' ? () => setEchoChatOpen(v => !v) : undefined}
      />

      {/* EchoChat float panel */}
      {researchState === 'done' && (
        <EchoChat
          open={echoChatOpen}
          onClose={() => setEchoChatOpen(false)}
          messages={echoChatHistory}
          onSend={msg => sendEchoChat(msg, 'chat')}
          loading={echoChatLoading}
          input={echoChatInput}
          setInput={setEchoChatInput}
        />
      )}

      {/* White base */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: '#fff', pointerEvents: 'none' }} />

      {/* Grayscale faded art */}
      {albumArt && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1, backgroundImage: `url(${albumArt})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'grayscale(1) brightness(0.55)', transform: 'scale(1.04)', pointerEvents: 'none' }} />
      )}

      {/* Full-color art sweeps up */}
      {albumArt && (
        <div
          className={researchState === 'loading' ? 'ln-art-loading' : 'ln-art-done'}
          style={{ position: 'fixed', inset: 0, zIndex: 2, backgroundImage: `url(${albumArt})`, backgroundSize: 'cover', backgroundPosition: 'center', transform: 'scale(1.04)', pointerEvents: 'none' }}
        />
      )}

      {/* Loading text overlay */}
      {showLoadingScreen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 52, pointerEvents: 'none' }}>
          {researchState === 'loading' && (
            <div key={phraseIndex} style={{ fontFamily: fonts.mono, fontSize: 11, color: 'rgba(26,21,32,0.5)', letterSpacing: '0.1em', animation: 'ln-fade 0.5s ease' }}>
              {LOADING_PHRASES[phraseIndex % LOADING_PHRASES.length]}
            </div>
          )}
          {researchState === 'error' && (
            <div style={{ fontFamily: fonts.mono, fontSize: 11, color: '#ef4444' }}>{researchError}</div>
          )}
        </div>
      )}

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
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.10)', zIndex: 1 }} />

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
                    {entryType && <div style={{ fontFamily: fonts.mono, fontSize: 9, color: tx(0.38), letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>{entryType}</div>}
                    {elapsed > 0 && <div style={{ fontFamily: fonts.mono, fontSize: 9, color: tx(0.25), letterSpacing: '0.1em', marginTop: 4 }}>{SessionDuration(elapsed)}</div>}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 10px' }}>
                  {STEPS.map(s => {
                    const isPast = s.id < step;
                    const isCurrent = s.id === step;
                    const isReachable = s.id <= maxStep;
                    return (
                      <button key={s.id} onClick={() => isReachable && !isCurrent && setStep(s.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, width: '100%', textAlign: 'left', background: isCurrent ? 'rgba(255,255,255,0.18)' : 'transparent', border: 'none', cursor: isReachable && !isCurrent ? 'pointer' : 'default', transition: 'background 0.15s' }}>
                        <span style={{ fontFamily: fonts.mono, fontSize: 9, width: 14, textAlign: 'center', flexShrink: 0, color: isCurrent ? '#6a7a18' : isPast ? '#6a7a18' : tx(0.25) }}>
                          {isPast ? '✓' : s.id + 1}
                        </span>
                        <span style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.04em', color: isCurrent ? tx(0.88) : isPast ? tx(0.5) : tx(0.28), transition: 'color 0.15s' }}>
                          {s.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Main content */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: step === 3 ? 'hidden' : 'auto' }}>
                <div style={{ flex: 1, padding: step === 3 ? '36px 48px 36px' : '40px 48px 56px', display: step === 3 ? 'flex' : 'block', flexDirection: step === 3 ? 'column' : undefined, overflowY: step === 3 ? 'hidden' : undefined }}>
                  {step === 0 && <AlbumDebrief brief={brief} researchState={researchState} researchError={researchError} echoDebrief={echoDebrief} echoDebriefLoading={echoDebriefLoading} onNext={() => advanceTo(1)} onReset={() => router.replace('/echo')} />}
                  {step === 1 && <TrackNotes tracks={tracks} tracksLoading={tracksLoading} trackNotes={trackNotes} setTrackNotes={setTrackNotes} trackRatings={trackRatings} setTrackRatings={setTrackRatings} openTrack={openTrack} setOpenTrack={setOpenTrack} onNext={() => advanceTo(2)} />}
                  {step === 2 && <AlbumNotes rating={rating} setRating={setRating} Masterpiece={Masterpiece} setMasterpiece={setMasterpiece} Favorite={Favorite} setFavorite={setFavorite} overallNotes={overallNotes} setOverallNotes={setOverallNotes} onNext={() => advanceTo(3)} />}
                  {step === 3 && <ReflectChat chatMessages={chatMessages} chatInput={chatInput} setChatInput={setChatInput} chatLoading={chatLoading} chatEndRef={chatEndRef} sendChat={sendChat} onNext={() => advanceTo(4)} />}
                  {step === 4 && <TagsEditor sessionTags={sessionTags} setSessionTags={setSessionTags} tagInput={tagInput} setTagInput={setTagInput} formatting={formatting} onNext={() => advanceTo(5)} />}
                  {step === 5 && <SessionPreview brief={brief} albumArt={albumArt} output={output} formatting={formatting} rating={rating} sessionTags={sessionTags} saving={saving} saved={saved} overallNotes={overallNotes} doFormat={doFormat} doSave={doSave} />}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
