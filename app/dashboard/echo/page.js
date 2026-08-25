'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { fonts } from '../../../library/sitewide_visuals';
import { useAlbumSelection, CARD_STAGGER_MS } from '../../../hooks/useAlbumSelection';
import { handOff } from '../../../library/baton';
import PasswordGate from '../../../components/session_components/PasswordGate';
import EchoNetwork from '../../../components/EchoNetwork';
import PreListenQuestionnaire from '../../../components/session_components/steps/PreListenQuestionnaire';
import { SESSION_STEPS } from '../../../hooks/useListeningSession';

const ECHO_PROMPTS = [
  'Who do you want to listen to?',
  'What artist do you want to hear?',
  "How's it going? Who do you wanna hear?",
  "Ready. Who should I search?",
  "Who's been stuck in your head lately?",
  "Hey. Who should I search for?",
  "Who should I search for you?",
  "Go ahead, tell me who to look up.",
  "What artist do you want to explore?",
  "What do you feel like hearing?",
  "Ready? Give me an artist.",
];

// Calculate where each album card will land in the final centered flex-wrap grid.
// Returns [{x, y}] — top-left corner of each card in viewport coords.
function calcGridTargets(count) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const CARD = 160, GAP = 20, TOP_BAR = 52, PER_ROW = 5;
  const rows       = Math.ceil(count / PER_ROW);
  const gridH      = rows * CARD + (rows - 1) * GAP;
  const gridW      = PER_ROW * CARD + (PER_ROW - 1) * GAP;
  const startY     = TOP_BAR + Math.max(0, (H - TOP_BAR - gridH) / 2);

  return Array.from({ length: count }, (_, i) => {
    const row      = Math.floor(i / PER_ROW);
    const col      = i % PER_ROW;
    const rowCount = Math.min(count - row * PER_ROW, PER_ROW);
    const rowW     = rowCount * CARD + (rowCount - 1) * GAP;
    const rowStartX = (W - rowW) / 2;
    return { x: rowStartX + col * (CARD + GAP), y: startY + row * (CARD + GAP) };
  });
}

// How long a draft has been sitting there. Rounded hard on purpose — the point
// is 'this morning' or 'last week', not a timestamp.
function sinceLabel(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

export default function EchoPage() {
  const router = useRouter();

  const [authed, setAuthed]   = useState(false);
  const [checking, setChecking] = useState(true);

  // Typewriter entrance
  const [echoReady, setEchoReady]     = useState(false);
  const [echoPrompt]                  = useState(() => ECHO_PROMPTS[Math.floor(Math.random() * ECHO_PROMPTS.length)]);
  const [typedText, setTypedText]     = useState('');
  const [typingDone, setTypingDone]   = useState(false);
  const [cardVisible, setCardVisible] = useState(false);
  const [inputVisible, setInputVisible] = useState(false);
  const inputRef = useRef(null);

  // Confirm flow — two sequential questions before research fires
  const [confirmPhase, setConfirmPhase] = useState(null); // null | 'q2' — q1 asked
                                                          // for a relationship, which nothing picks any more
  const [pendingAlbum, setPendingAlbum] = useState(null);

  // Held here so they're available at the moment handleAlbumSelect fires
  const [relationship, setRelationship] = useState('');
  const [entryType, setEntryType]       = useState('');

  // Listens saved and walked away from. Offered under the prompt card, so the
  // first thing the page asks isn't 'who?' when there's already an answer
  // waiting halfway through.
  const [drafts, setDrafts]                 = useState([]);
  const [confirmDiscard, setConfirmDiscard] = useState(null);   // draft id

  // Album search + Echo network animation
  const {
    artistInput, setArtistInput,
    albums,
    searching,
    revealed,
    zoomReady,
    echoFaded,
    albumPage, setAlbumPage,
    nodePositions,
    cardPhase,
    manualAlbum, setManualAlbum,
    showManual, setShowManual,
    pickingAlbum,
    pickReady,
    pickFading,
    handleReveal,
    handleClearSearch,
    handleSpotlit,
    handleGridAlbumClick,
    handleAlbumPick,
    handleManualSubmit,
  } = useAlbumSelection({
    step: -1,
    onAlbumPick({ album, artist, year, artUrl, artLarge, collectionId, genre }) {
      setPendingAlbum({ album, artist, year, artUrl, artLarge, collectionId, genre });
      setRelationship('');
      setEntryType('');
      setConfirmPhase('q2');
      // Research needs nothing but the album and artist, so start it here and
      // let it run through the two questions and the loading animation.
      handOff(album, artist);
    },
  });

  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.json())
      .then(d => setAuthed(!!d.authed))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (!authed) return;
    fetch('/api/drafts')
      .then(r => r.json())
      .then(d => setDrafts(d.drafts || []))
      .catch(() => {});
  }, [authed]);

  // Fallback: force echoReady after 3s in case images are slow
  useEffect(() => {
    const t = setTimeout(() => setEchoReady(true), 3000);
    return () => clearTimeout(t);
  }, []);

  // When canvas is ready, fade the card in over two frames so the transition fires
  useEffect(() => {
    if (!echoReady || !authed) return;
    requestAnimationFrame(() => requestAnimationFrame(() => setCardVisible(true)));
  }, [echoReady, authed]);

  // Start typewriter once card has begun fading in
  useEffect(() => {
    if (!cardVisible) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setTypedText(echoPrompt.slice(0, i));
      if (i >= echoPrompt.length) {
        clearInterval(id);
        setTimeout(() => setTypingDone(true), 120);
      }
    }, 22);
    return () => clearInterval(id);
  }, [cardVisible]);

  // Preload artLarge the moment a grid album is clicked so it's ready for the session page
  useEffect(() => {
    if (!pickingAlbum?.album?.artLarge) return;
    const img = new Image();
    img.src = pickingAlbum.album.artLarge;
  }, [pickingAlbum]);

  // After typing finishes, let input mount for two frames then trigger its transition
  useEffect(() => {
    if (!typingDone) return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setInputVisible(true);
      setTimeout(() => inputRef.current?.focus(), 60);
    }));
  }, [typingDone]);

  function handleAuth() { setAuthed(true); }

  // Reopens a saved listen. The whole row travels with the album so the session
  // page can put the notes back without asking for them again, and the two
  // questions are skipped — they were answered the first time round.
  function resumeDraft(draft) {
    localStorage.setItem('ln_pending_session', JSON.stringify({
      album: draft.album,
      artist: draft.artist || '',
      year: draft.year || '',
      artUrl: draft.album_art || '',
      collectionId: draft.collection_id || null,
      genre: draft.genre || '',
      relationship: draft.relationship || '',
      entryType: draft.entry_type || '',
      draft,
    }));
    router.push('/dashboard/echo/session');
  }

  // Two taps, because there's no undo on the other side of this one.
  async function discardDraft(id) {
    if (confirmDiscard !== id) { setConfirmDiscard(id); return; }
    setDrafts(prev => prev.filter(d => d.id !== id));
    setConfirmDiscard(null);
    try { await fetch(`/api/drafts/${id}`, { method: 'DELETE' }); } catch {}
  }

  // Called after Q2 is answered — save pending data and navigate to session page.
  // The answer to Q2 arrives as an argument rather than being read off state:
  // the button that sets it calls this in the same breath, so the state here is
  // still one render behind. Q1's answer is a phase older and has landed.
  function handleAlbumSelect({ album, artist, year, artUrl }, chosen = {}) {
    const pending = { album, artist, year, artUrl: pendingAlbum?.artLarge || artUrl, collectionId: pendingAlbum?.collectionId, genre: pendingAlbum?.genre || '', relationship, entryType: chosen.entryType ?? entryType };
    localStorage.setItem('ln_pending_session', JSON.stringify(pending));
    router.push('/dashboard/echo/session');
  }

  if (checking) return <div style={{ minHeight: '100vh', background: '#f5f2ec' }} />;
  if (!authed) return <PasswordGate onAuth={handleAuth} />;

  return (
    <>
      <style>{`
        @keyframes echo-grid-emerge { 0%{opacity:0;transform:scale(0.05)} 60%{transform:scale(1.03)} 100%{opacity:1;transform:scale(1)} }
        @keyframes echo-card-in { 0%{opacity:0;transform:scale(0.78)} 100%{opacity:1;transform:scale(1)} }
        @keyframes echo-reel-in { 0%{opacity:0;transform:translate(var(--nx),var(--ny)) scale(0.12)} 24%{opacity:1} 100%{opacity:1;transform:translate(0,0) scale(1)} }
        @keyframes echo-breathe { 0%,100%{opacity:0.72;transform:scale(1)} 50%{opacity:1;transform:scale(1.012)} }
        @keyframes ln-fade  { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ln-pulse { 0%,100%{opacity:0.35} 50%{opacity:0.8} }
        @keyframes confirm-glow { 0%,100%{box-shadow:0 0 32px 12px rgba(255,255,255,0.55),0 0 70px 28px rgba(255,255,255,0.22),0 12px 40px rgba(0,0,0,0.28)} 50%{box-shadow:0 0 48px 20px rgba(255,255,255,0.78),0 0 100px 44px rgba(255,255,255,0.32),0 12px 40px rgba(0,0,0,0.28)} }
        @keyframes echo-cursor-blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        html, body { background: #f5f2ec !important; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 99px; }
        input::placeholder  { color: rgba(255,255,255,0.3); }
      `}</style>

      {/* ── EchoNetwork — landing backdrop ── */}
      <EchoNetwork
        searchQuery=''
        collapsed={false}
        albumArt={pendingAlbum?.artUrl || ''}
        onCollapsed={() => {}}
        dimmed={echoFaded}
        zooming={revealed}
        spotlitArts={albums.slice(albumPage * 15, (albumPage + 1) * 15).map(a => a.art || '')}
        spotlit={zoomReady && cardPhase !== 'grid'}
        onSpotlit={handleSpotlit}
        cardsEmerging={cardPhase === 'growing'}
        onReady={() => setEchoReady(true)}
      />

      {/* ── ALBUM SEARCH (no confirm) ── */}
      {!confirmPhase && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1, display: 'flex', flexDirection: 'column' }}>

          {/* Top bar */}
          <div style={{ padding: '14px 28px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href="/dashboard" style={{ fontFamily: fonts.mono, fontWeight: 600, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(26,21,32,0.5)', textDecoration: 'none', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(26,21,32,0.12)', background: 'rgba(245,242,236,0.6)', backdropFilter: 'blur(8px)', flexShrink: 0 }}>← Dashboard</a>
            {revealed && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(245,242,236,0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(26,21,32,0.14)', borderRadius: 20, padding: '7px 8px 7px 16px', animation: 'ln-fade 0.25s ease' }}>
                <span style={{ fontFamily: fonts.sans, fontSize: 14, color: '#1a1520' }}>{artistInput}</span>
                <button onClick={handleClearSearch} style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(26,21,32,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'rgba(26,21,32,0.55)', lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
              </div>
            )}
          </div>

          {/* Frosted prompt card */}
          {!revealed && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px',
              opacity: cardVisible ? 1 : 0,
              transform: cardVisible ? 'translateY(0)' : 'translateY(10px)',
              transition: 'opacity 0.7s ease, transform 0.7s cubic-bezier(0.16,1,0.3,1)',
            }}>
              <div style={{ width: 'fit-content', minWidth: 320, maxWidth: 'min(560px, calc(100vw - 48px))' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.45)',
                  backdropFilter: 'blur(18px)',
                  WebkitBackdropFilter: 'blur(18px)',
                  borderRadius: 40,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                  padding: '32px 32px 28px',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg, rgba(255,255,255,0.6) 0%, transparent 60%)', pointerEvents: 'none' }} />
                  <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ fontFamily: fonts.sans, fontWeight: 700, fontSize: 26, color: '#1a1520', lineHeight: 1.2, minHeight: '1.3em', whiteSpace: 'nowrap' }}>
                      {typedText}
                      {!typingDone && echoReady && (
                        <span style={{ display: 'inline-block', marginLeft: 1, animation: 'echo-cursor-blink 0.75s step-end infinite' }}>|</span>
                      )}
                    </div>
                  </div>
                  {typingDone && (
                    <div style={{
                      opacity: inputVisible ? 1 : 0,
                      transform: inputVisible ? 'translateY(0)' : 'translateY(-14px)',
                      transition: 'opacity 1.4s cubic-bezier(0.16,1,0.3,1), transform 1.4s cubic-bezier(0.16,1,0.3,1)',
                    }}>
                      <div style={{ position: 'relative' }}>
                        <input
                          ref={inputRef}
                          value={artistInput}
                          onChange={e => setArtistInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleReveal()}
                          placeholder=""
                          style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(245,242,236,0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(26,21,32,0.14)', borderRadius: 14, padding: '16px 22px', fontFamily: fonts.sans, fontWeight: 400, fontSize: 16, color: '#1a1520', outline: 'none', boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}
                          onFocus={e => e.target.style.borderColor = 'rgba(26,21,32,0.4)'}
                          onBlur={e => e.target.style.borderColor = 'rgba(26,21,32,0.14)'}
                        />
                        {searching && (
                          <div style={{ position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)', fontFamily: fonts.mono, fontSize: 11, color: 'rgba(26,21,32,0.3)', letterSpacing: '0.06em' }}>…</div>
                        )}
                      </div>
                      {artistInput.trim() && (
                        <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                          {!showManual ? (
                            <button onClick={() => setShowManual(true)} style={{ fontFamily: fonts.mono, fontWeight: 600, fontSize: 11, letterSpacing: '0.08em', color: 'rgba(26,21,32,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                              + type album manually
                            </button>
                          ) : (
                            <>
                              <input value={manualAlbum} onChange={e => setManualAlbum(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleManualSubmit()} placeholder="album title..." autoFocus style={{ flex: 1, background: 'rgba(245,242,236,0.8)', border: '1px solid rgba(26,21,32,0.14)', borderRadius: 8, padding: '9px 14px', fontFamily: fonts.mono, fontSize: 12, color: '#1a1520', outline: 'none' }} />
                              <button onClick={handleManualSubmit} disabled={!manualAlbum.trim()} style={{ background: '#1a1520', color: '#f5f2ec', border: 'none', borderRadius: 8, padding: '9px 18px', fontFamily: fonts.mono, fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', opacity: manualAlbum.trim() ? 1 : 0.3 }}>Start →</button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Unfinished listens — anything left mid-session, newest
                    first. Under the card rather than over it: the page's job is
                    still to ask who you want to hear, this is only the answer
                    you already gave and didn't finish. */}
                {drafts.length > 0 && typingDone && (
                  <div style={{
                    marginTop: 18,
                    opacity: inputVisible ? 1 : 0,
                    transform: inputVisible ? 'translateY(0)' : 'translateY(-8px)',
                    transition: 'opacity 1.4s cubic-bezier(0.16,1,0.3,1), transform 1.4s cubic-bezier(0.16,1,0.3,1)',
                  }}>
                    <div style={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(26,21,32,0.4)', textAlign: 'center', marginBottom: 10 }}>
                      Unfinished
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 232, overflowY: 'auto' }}>
                      {drafts.map(draft => (
                        <div key={draft.id} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          background: 'rgba(255,255,255,0.45)',
                          backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
                          border: '1px solid rgba(255,255,255,0.5)', borderRadius: 16,
                          padding: 8, boxShadow: '0 4px 18px rgba(0,0,0,0.06)',
                        }}>
                          <button onClick={() => resumeDraft(draft)} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                            {draft.album_art
                              ? <img src={draft.album_art} alt="" style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover', flexShrink: 0, display: 'block' }} />
                              : <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(26,21,32,0.08)', flexShrink: 0 }} />}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 14, color: '#1a1520', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{draft.album}</div>
                              <div style={{ fontFamily: fonts.mono, fontSize: 10, color: 'rgba(26,21,32,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {draft.artist} · {SESSION_STEPS[draft.step] || SESSION_STEPS[0]} · {sinceLabel(draft.updated_at)}
                              </div>
                            </div>
                          </button>
                          <button
                            onClick={() => discardDraft(draft.id)}
                            onBlur={() => setConfirmDiscard(c => (c === draft.id ? null : c))}
                            title="Discard this draft"
                            style={{
                              flexShrink: 0, cursor: 'pointer', borderRadius: 99,
                              fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.06em',
                              padding: confirmDiscard === draft.id ? '6px 12px' : '0',
                              width: confirmDiscard === draft.id ? 'auto' : 24,
                              height: 24, lineHeight: 1,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: confirmDiscard === draft.id ? '#1a1520' : 'rgba(26,21,32,0.08)',
                              color: confirmDiscard === draft.id ? '#f5f2ec' : 'rgba(26,21,32,0.5)',
                              border: 'none',
                            }}
                          >
                            {confirmDiscard === draft.id ? 'discard?' : '×'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Growing phase */}
          {cardPhase === 'growing' && nodePositions && (() => {
            const CARD     = 160;
            const pageAlbums = albums.slice(albumPage * 15, (albumPage + 1) * 15);
            const count    = Math.min(pageAlbums.length, nodePositions.length);
            const targets  = calcGridTargets(count);
            return (
              <div style={{ position: 'fixed', inset: 0, zIndex: 4, pointerEvents: 'none' }}>
                {pageAlbums.map((album, i) => {
                  if (i >= count) return null;
                  const node   = nodePositions[i];
                  const target = targets[i];
                  const nx = node.x - CARD / 2 - target.x;
                  const ny = node.y - CARD / 2 - target.y;
                  return (
                    <div
                      key={i}
                      onClick={e => { e.stopPropagation(); handleAlbumPick(album); }}
                      style={{
                        position: 'fixed',
                        left: target.x,
                        top:  target.y,
                        width: CARD,
                        pointerEvents: 'auto',
                        cursor: 'pointer',
                        textAlign: 'left',
                        '--nx': `${nx}px`,
                        '--ny': `${ny}px`,
                        animation: `echo-reel-in 0.55s cubic-bezier(0.25,1.0,0.5,1) ${i * CARD_STAGGER_MS}ms both`,
                      }}
                    >
                      <div style={{ borderRadius: 6, overflow: 'hidden', aspectRatio: '1', boxShadow: '0 8px 40px rgba(0,0,0,0.35)', width: CARD }}>
                        {album.art && <img src={album.art} alt={album.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                      </div>
                      <div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 11, color: '#1a1520', marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.name}</div>
                      {album.year && <div style={{ fontFamily: fonts.mono, fontSize: 10, color: 'rgba(26,21,32,0.4)', marginTop: 2 }}>{album.year}</div>}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Grid phase */}
          {revealed && cardPhase === 'grid' && (
            <div
              onClick={handleClearSearch}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', padding: '0 32px 32px' }}
            >
              {albums.length > 0 && (() => {
                const CARDS_PER_PAGE = 15;
                const totalPages = Math.ceil(albums.length / CARDS_PER_PAGE);
                const pageAlbums = albums.slice(albumPage * CARDS_PER_PAGE, (albumPage + 1) * CARDS_PER_PAGE);
                return (
                  <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, width: '100%', maxWidth: 960 }}>
                    <div key={albumPage} style={{ width: '100%', animation: 'ln-fade 0.5s ease both' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center' }}>
                        {pageAlbums.map((album, i) => (
                          <button key={albumPage + '-' + i}
                            onClick={e => handleGridAlbumClick(e, album)}
                            style={{
                              width: 160, flexShrink: 0,
                              background: 'none', border: 'none', padding: 0,
                              cursor: pickingAlbum ? 'default' : 'pointer', textAlign: 'left',
                              opacity: pickingAlbum ? 0 : 1,
                              transform: pickingAlbum ? 'scale(0.96)' : 'scale(1)',
                              transition: 'opacity 0.22s ease, transform 0.22s ease',
                              pointerEvents: pickingAlbum ? 'none' : 'auto',
                            }}
                            onMouseEnter={e => { if (!pickingAlbum) e.currentTarget.querySelector('.album-art-wrap').style.transform = 'scale(1.06)'; }}
                            onMouseLeave={e => e.currentTarget.querySelector('.album-art-wrap').style.transform = 'scale(1)'}
                          >
                            <div className="album-art-wrap" style={{ borderRadius: 6, overflow: 'hidden', aspectRatio: '1', marginBottom: 8, boxShadow: '0 6px 28px rgba(0,0,0,0.22)', transition: 'transform 0.2s cubic-bezier(0.34,1.2,0.64,1)' }}>
                              {album.art && <img src={album.art} alt={album.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                            </div>
                            <div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 11, color: '#1a1520', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.name}</div>
                            {album.year && <div style={{ fontFamily: fonts.mono, fontSize: 10, color: 'rgba(26,21,32,0.4)', marginTop: 2 }}>{album.year}</div>}
                          </button>
                        ))}
                      </div>
                    </div>

                    {totalPages > 1 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <button onClick={() => setAlbumPage(p => Math.max(0, p - 1))} disabled={albumPage === 0} style={{ width: 36, height: 36, borderRadius: '50%', background: albumPage === 0 ? 'rgba(245,242,236,0.3)' : 'rgba(245,242,236,0.75)', backdropFilter: 'blur(8px)', border: '1px solid rgba(26,21,32,0.12)', cursor: albumPage === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: albumPage === 0 ? 'rgba(26,21,32,0.2)' : 'rgba(26,21,32,0.6)', transition: 'all 0.2s' }}>←</button>
                        <span style={{ fontFamily: fonts.mono, fontSize: 10, color: 'rgba(26,21,32,0.35)', letterSpacing: '0.1em' }}>{albumPage + 1} / {totalPages}</span>
                        <button onClick={() => setAlbumPage(p => Math.min(totalPages - 1, p + 1))} disabled={albumPage === totalPages - 1} style={{ width: 36, height: 36, borderRadius: '50%', background: albumPage === totalPages - 1 ? 'rgba(245,242,236,0.3)' : 'rgba(245,242,236,0.75)', backdropFilter: 'blur(8px)', border: '1px solid rgba(26,21,32,0.12)', cursor: albumPage === totalPages - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: albumPage === totalPages - 1 ? 'rgba(26,21,32,0.2)' : 'rgba(26,21,32,0.6)', transition: 'all 0.2s' }}>→</button>
                      </div>
                    )}
                  </div>
                );
              })()}
              {!searching && albums.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, animation: 'ln-fade 0.6s ease' }}>
                  <div style={{ fontFamily: fonts.mono, fontSize: 11, color: 'rgba(26,21,32,0.4)', letterSpacing: '0.06em' }}>nothing found</div>
                  <button onClick={handleClearSearch} style={{ fontFamily: fonts.mono, fontSize: 10, color: 'rgba(26,21,32,0.5)', background: 'rgba(245,242,236,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(26,21,32,0.12)', borderRadius: 20, padding: '7px 16px', cursor: 'pointer' }}>← try again</button>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* Flying album — lives outside !confirmPhase so it persists through the transition */}
      {pickingAlbum && (() => {
        const GRID = 160;
        const DEST = 220;
        const { rect, album } = pickingAlbum;
        const gridCX = rect.left + GRID / 2;
        const gridCY = rect.top  + GRID / 2;
        const winCX  = window.innerWidth  / 2;
        const winCY  = window.innerHeight / 2;
        // Offset upward so the art lands above the frosted card in the questionnaire
        const destCY = winCY - 160;
        const dx = gridCX - winCX;
        const dy = gridCY - destCY;
        const s0 = GRID / DEST;
        return (
          <div style={{
            position: 'fixed',
            left: winCX - DEST / 2,
            top:  destCY - DEST / 2,
            width: DEST,
            height: DEST,
            zIndex: 8,
            pointerEvents: 'none',
            transformOrigin: 'center center',
            opacity: pickFading ? 0 : 1,
            transform: pickReady ? 'translate(0,0) scale(1)' : `translate(${dx}px,${dy}px) scale(${s0})`,
            transition: pickReady
              ? 'transform 1.1s cubic-bezier(0.22,1,0.36,1), opacity 0.4s ease'
              : 'opacity 0.3s ease',
          }}>
            <div style={{
              width: '100%', height: '100%', overflow: 'hidden',
              borderRadius: pickReady ? 16 : 6,
              boxShadow: '0 12px 56px rgba(0,0,0,0.40)',
              transition: 'border-radius 1.1s cubic-bezier(0.22,1,0.36,1)',
            }}>
              {album.art && <img src={album.art} alt={album.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
            </div>
          </div>
        );
      })()}

      {/* ── PRE-LISTEN QUESTIONNAIRE ── */}
      {confirmPhase && (
        <PreListenQuestionnaire
          pendingAlbum={pendingAlbum}
          confirmPhase={confirmPhase}
          onPhaseChange={setConfirmPhase}
          onConfirm={handleAlbumSelect}
          setEntryType={setEntryType}
        />
      )}
    </>
  );
}
