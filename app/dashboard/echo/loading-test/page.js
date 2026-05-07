'use client';
import { useState, useEffect, useCallback } from 'react';
import { fonts } from '../../../../library/sitewide_visuals';
import { LOADING_PHRASES } from '../../../../library/session_timers';
import EchoNetwork from '../../../../components/EchoNetwork';

const FALLBACK = {
  album: 'Kind of Blue',
  artist: 'Miles Davis',
  artUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/9f/44/cd/9f44cd9e-5a1d-1ec9-0a1f-f9ba2e14a5c2/source/600x600bb.jpg',
};

export default function LoadingTestPage() {
  const [session, setSession]         = useState(null);
  const [zoomed, setZoomed]           = useState(true);
  const [dimmed, setDimmed]           = useState(true);
  const [nodeArt, setNodeArt]         = useState('');
  const [assembling, setAssembling]   = useState(false);
  const [loadTyped, setLoadTyped]     = useState('');
  const [rippleCount, setRippleCount] = useState(0);
  const [completing, setCompleting]   = useState(false);
  const [assembled, setAssembled]     = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('ln_pending_session');
      setSession(raw ? JSON.parse(raw) : FALLBACK);
    } catch { setSession(FALLBACK); }
  }, []);

  // unzoom → undim → art reveal + assembly
  useEffect(() => {
    if (!session) return;
    const t1 = setTimeout(() => setZoomed(false), 300);
    const t2 = setTimeout(() => setDimmed(false), 600);
    const t3 = setTimeout(() => { setNodeArt(session.artUrl); setAssembling(true); }, 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [session]);

  // Typewriter — each completed phrase fires a ripple
  useEffect(() => {
    let idx = 0, cancelled = false;
    function runPhrase() {
      if (cancelled) return;
      const phrase = LOADING_PHRASES[idx];
      let i = 0;
      const typeId = setInterval(() => {
        if (cancelled) { clearInterval(typeId); return; }
        i++;
        setLoadTyped(phrase.slice(0, i));
        if (i >= phrase.length) {
          clearInterval(typeId);
          setRippleCount(c => c + 1);
          setTimeout(() => {
            if (cancelled) return;
            const backId = setInterval(() => {
              if (cancelled) { clearInterval(backId); return; }
              i--;
              setLoadTyped(phrase.slice(0, i));
              if (i <= 0) {
                clearInterval(backId);
                idx = (idx + 1) % LOADING_PHRASES.length;
                setTimeout(() => { if (!cancelled) runPhrase(); }, 80);
              }
            }, 18);
          }, 1800);
        }
      }, 30);
    }
    runPhrase();
    return () => { cancelled = true; };
  }, []);

  const handleAssembled = useCallback(() => {
    setCompleting(true);
    setTimeout(() => setAssembled(true), 400);
  }, []);

  if (!session) return <div style={{ minHeight: '100vh', background: '#f5f2ec' }} />;

  return (
    <>
      <style>{`
        @keyframes echo-cursor-blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes echo-art-appear { from{opacity:0} to{opacity:1} }
        html, body { background: #f5f2ec !important; }
      `}</style>

      <EchoNetwork
        searchQuery='' collapsed={false} albumArt='' onCollapsed={() => {}}
        dimmed={dimmed} zooming={zoomed} pulsing={false}
        spotlitArts={[]} spotlit={false} onSpotlit={() => {}} cardsEmerging={false}
        nodeArt={nodeArt} assembling={assembling} rippleCount={rippleCount}
        completing={completing} onAssembled={handleAssembled}
      />

      {assembled && session && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'echo-art-appear 1.0s ease forwards',
        }}>
          <img
            src={session.artUrl}
            alt={session.album}
            style={{
              width: 'min(60vw, 60vh)', height: 'min(60vw, 60vh)',
              borderRadius: 16,
              boxShadow: '0 24px 80px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.12)',
              display: 'block',
            }}
          />
        </div>
      )}

      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 10, pointerEvents: 'none',
        opacity: completing ? 0 : 1,
        transition: completing ? 'opacity 0.6s ease' : 'none',
      }}>
        <div style={{
          width: 'fit-content', minWidth: 0, maxWidth: 'min(480px, calc(100vw - 48px))',
          background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
          borderRadius: 40, boxShadow: '0 8px 32px rgba(0,0,0,0.07)',
          padding: '18px 28px', textAlign: 'center', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg, rgba(255,255,255,0.6) 0%, transparent 60%)', pointerEvents: 'none' }} />
          <div style={{ fontFamily: fonts.sans, fontWeight: 700, fontSize: 18, color: '#1a1520', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
            {loadTyped}
            <span style={{ display: 'inline-block', marginLeft: 1, animation: 'echo-cursor-blink 0.75s step-end infinite' }}>|</span>
          </div>
        </div>
      </div>

      <div style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        zIndex: 10, display: 'flex', alignItems: 'center', gap: 12,
        background: 'rgba(245,242,236,0.88)', backdropFilter: 'blur(12px)',
        borderRadius: 16, padding: '12px 20px',
        border: '1px solid rgba(26,21,32,0.10)',
      }}>
        <button onClick={() => window.location.reload()} style={btnStyle}>reset</button>
        <a href="/dashboard/echo" style={{ ...btnStyle, textDecoration: 'none' }}>← echo</a>
      </div>
    </>
  );
}

const btnStyle = {
  fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
  color: 'rgba(26,21,32,0.5)', background: 'rgba(245,242,236,0.8)', backdropFilter: 'blur(8px)',
  border: '1px solid rgba(26,21,32,0.14)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
};
