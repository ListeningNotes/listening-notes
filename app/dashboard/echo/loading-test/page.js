'use client';
import { useState, useEffect, useRef } from 'react';
import { fonts } from '../../../../library/sitewide_visuals';
import { LOADING_PHRASES } from '../../../../library/session_timers';
import EchoNetwork from '../../../../components/EchoNetwork';

const FALLBACK = {
  album: 'Kind of Blue',
  artist: 'Miles Davis',
  artUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/9f/44/cd/9f44cd9e-5a1d-1ec9-0a1f-f9ba2e14a5c2/source/600x600bb.jpg',
};

const AUTO_DURATION = 12000;

export default function LoadingTestPage() {
  const [session, setSession]         = useState(null);
  const [progress, setProgress]       = useState(0);
  const [auto, setAuto]               = useState(false);
  const [done, setDone]               = useState(false);
  const [loadTyped, setLoadTyped]     = useState('');
  const [loadCursor, setLoadCursor]   = useState(true);
  const autoStartRef = useRef(null);
  const rafRef       = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('ln_pending_session');
      setSession(raw ? JSON.parse(raw) : FALLBACK);
    } catch { setSession(FALLBACK); }
  }, []);

  // Auto-play animation
  useEffect(() => {
    if (!auto) { if (rafRef.current) cancelAnimationFrame(rafRef.current); return; }
    autoStartRef.current = performance.now() - progress * AUTO_DURATION;
    function tick(now) {
      const p = Math.min(1, (now - autoStartRef.current) / AUTO_DURATION);
      setProgress(p);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else setAuto(false);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [auto]);

  // Typewriter cycle: type forward → pause → backspace → next phrase
  useEffect(() => {
    if (done) return;
    let idx = 0;
    let cancelled = false;

    function runPhrase() {
      if (cancelled) return;
      const phrase = LOADING_PHRASES[idx];
      let i = 0;
      setLoadCursor(true);

      const typeId = setInterval(() => {
        if (cancelled) { clearInterval(typeId); return; }
        i++;
        setLoadTyped(phrase.slice(0, i));
        if (i >= phrase.length) {
          clearInterval(typeId);
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
  }, [done]);

  if (!session) return <div style={{ minHeight: '100vh', background: '#f5f2ec' }} />;
  const { artUrl } = session;

  return (
    <>
      <style>{`
        @keyframes echo-cursor-blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        html, body { background: #f5f2ec !important; }
      `}</style>

      <EchoNetwork
        searchQuery='' collapsed={false} albumArt='' onCollapsed={() => {}}
        dimmed={false} zooming={false} pulsing={false}
        spotlitArts={[]} spotlit={false} onSpotlit={() => {}} cardsEmerging={false}
        nodeArt={artUrl}
      />

      {/* Phrase card */}
      {!done && (
        <div style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 10, pointerEvents: 'none',
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
              {loadCursor && <span style={{ display: 'inline-block', marginLeft: 1, animation: 'echo-cursor-blink 0.75s step-end infinite' }}>|</span>}
            </div>
          </div>
        </div>
      )}

      {/* Dev controls */}
      <div style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        zIndex: 10, display: 'flex', alignItems: 'center', gap: 12,
        background: 'rgba(245,242,236,0.88)', backdropFilter: 'blur(12px)',
        borderRadius: 16, padding: '12px 20px',
        border: '1px solid rgba(26,21,32,0.10)',
      }}>
        <input
          type="range" min={0} max={1} step={0.001}
          value={progress}
          onChange={e => { setAuto(false); setProgress(Number(e.target.value)); }}
          style={{ width: 200 }}
        />
        <button onClick={() => setAuto(v => !v)} style={btnStyle}>
          {auto ? '⏸ pause' : '▶ auto'}
        </button>
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
