'use client';
import { useState, useEffect, useRef } from 'react';
import { fonts } from '../../../../library/sitewide_visuals';
import EchoPuzzle from '../../../../components/EchoPuzzle';

const FALLBACK = {
  album: 'Kind of Blue',
  artist: 'Miles Davis',
  artUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/9f/44/cd/9f44cd9e-5a1d-1ec9-0a1f-f9ba2e14a5c2/source/600x600bb.jpg',
};

const AUTO_DURATION = 12000; // ms for 0→100%

export default function LoadingTestPage() {
  const [session, setSession]   = useState(null);
  const [progress, setProgress] = useState(0);
  const [auto, setAuto]         = useState(false);
  const [done, setDone]         = useState(false);
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

  if (!session) return <div style={{ minHeight: '100vh', background: '#f5f2ec' }} />;
  const { album, artist, artUrl } = session;

  return (
    <>
      <style>{`html, body { background: #f5f2ec !important; }`}</style>

      <EchoPuzzle
        albumArt={artUrl}
        progress={progress}
        onComplete={() => setDone(true)}
      />

      {/* Album label */}
      {album && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10, fontFamily: fonts.mono, fontSize: 11,
          color: 'rgba(26,21,32,0.4)', letterSpacing: '0.08em', pointerEvents: 'none',
        }}>
          {album}{artist ? ` · ${artist}` : ''}
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
        <button onClick={() => { setAuto(false); setProgress(0); setDone(false); }} style={btnStyle}>
          reset
        </button>
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
