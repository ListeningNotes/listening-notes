'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fonts } from '../../../../library/sitewide_visuals';
import { tx, bdr } from '../../../../library/session_styles';
import { useListeningSession } from '../../../../hooks/useListeningSession';
import PasswordGate from '../../../../components/session_components/PasswordGate';
import EchoOrb from '../../../../components/EchoOrb';
import EchoChat from '../../../../components/EchoChat';
import EchoNetwork from '../../../../components/EchoNetwork';
import { SessionDuration, LOADING_PHRASES } from '../../../../library/session_timers';
import AlbumDebrief from '../../../../components/session_components/steps/AlbumDebrief';
import TrackNotes from '../../../../components/session_components/steps/TrackNotes';
import AlbumNotes from '../../../../components/session_components/steps/AlbumNotes';
import ReflectChat from '../../../../components/session_components/steps/ReflectChat';
import TagsEditor from '../../../../components/session_components/steps/TagsEditor';
import SessionPreview from '../../../../components/session_components/steps/SessionPreview';

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

  const [authed, setAuthed]     = useState(false);
  const [checking, setChecking] = useState(true);
  const [step, setStep]         = useState(0);
  const [maxStep, setMaxStep]   = useState(0);

  // Typewriter for loading phrases
  const [loadTyped, setLoadTyped]   = useState('');
  const [loadCursor, setLoadCursor] = useState(true);

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
      if (!raw) { router.replace('/dashboard/echo'); return; }
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
      router.replace('/dashboard/echo');
    }
  }, [authed]);

  // Restart typewriter each time the loading phrase rotates
  useEffect(() => {
    if (researchState !== 'loading') return;
    const phrase = LOADING_PHRASES[phraseIndex % LOADING_PHRASES.length];
    setLoadTyped('');
    setLoadCursor(true);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setLoadTyped(phrase.slice(0, i));
      if (i >= phrase.length) { clearInterval(id); setTimeout(() => setLoadCursor(false), 200); }
    }, 30);
    return () => clearInterval(id);
  }, [phraseIndex, researchState]);

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
        @keyframes ln-panel-appear { from{opacity:0;transform:translateY(14px) scale(0.99)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes ln-fade  { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes echo-cursor-blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes q-art-glow {
          0%,100% { box-shadow: 0 8px 40px rgba(0,0,0,0.10), 0 0 60px 30px rgba(255,255,255,0.45); transform: scale(1); }
          50%      { box-shadow: 0 12px 52px rgba(0,0,0,0.15), 0 0 90px 55px rgba(255,255,255,0.65); transform: scale(1.012); }
        }
        html, body { background: #f5f2ec !important; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 99px; }
        textarea::placeholder { color: rgba(255,255,255,0.28); }
      `}</style>

      {/* EchoNetwork — flows during loading, hidden once session panel is up */}
      {showLoadingScreen && (
        <EchoNetwork
          searchQuery=''
          collapsed={false}
          albumArt=''
          onCollapsed={() => {}}
          dimmed={false}
          zooming={false}
          spotlitArts={[]}
          spotlit={false}
          onSpotlit={() => {}}
          cardsEmerging={false}
        />
      )}

      {/* EchoOrb */}
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

      {/* Echo loading card — same frosted style as the search screen */}
      {showLoadingScreen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>

          {albumArt && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <img src={albumArt} alt='' style={{ width: 200, height: 200, borderRadius: 16, objectFit: 'cover', animation: 'q-art-glow 2.4s ease-in-out infinite' }} />
            </div>
          )}

          {albumInput && (
            <div style={{ fontFamily: fonts.mono, fontSize: 12, color: 'rgba(26,21,32,0.45)', letterSpacing: '0.06em', marginBottom: 20, textAlign: 'center' }}>
              {albumInput}{artistName ? ` · ${artistName}` : ''}
            </div>
          )}

          {researchState === 'error' ? (
            <div style={{ fontFamily: fonts.mono, fontSize: 12, color: '#ef4444', letterSpacing: '0.06em' }}>{researchError}</div>
          ) : (
            <div style={{
              width: 'fit-content', minWidth: 280, maxWidth: 'min(500px, calc(100vw - 48px))',
              background: 'rgba(255,255,255,0.45)',
              backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
              borderRadius: 40, boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
              padding: '28px 36px', position: 'relative', overflow: 'hidden', textAlign: 'center',
            }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg, rgba(255,255,255,0.6) 0%, transparent 60%)', pointerEvents: 'none' }} />
              <div style={{ fontFamily: fonts.sans, fontWeight: 700, fontSize: 22, color: '#1a1520', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                {loadTyped}
                {loadCursor && <span style={{ display: 'inline-block', marginLeft: 1, animation: 'echo-cursor-blink 0.75s step-end infinite' }}>|</span>}
              </div>
            </div>
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
                  {step === 0 && <AlbumDebrief brief={brief} researchState={researchState} researchError={researchError} echoDebrief={echoDebrief} echoDebriefLoading={echoDebriefLoading} onNext={() => advanceTo(1)} onReset={() => router.replace('/dashboard/echo')} />}
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
