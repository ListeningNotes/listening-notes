'use client';
import { useState, useEffect, useRef } from 'react';
import { fonts } from '../../library/sitewide_visuals';
import { LOADING_PHRASES } from '../../library/session_timers';

export default function LoadingResearch({ art, phraseIndex, album, artist, onBurst }) {
  const [visible, setVisible] = useState(false);
  const [fillPct, setFillPct] = useState(0);
  const [expanding, setExpanding] = useState(false);
  const fillRef = useRef(null);
  const fillPctRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    fillRef.current = setInterval(() => {
      fillPctRef.current = Math.min(fillPctRef.current + 0.5, 82);
      setFillPct(fillPctRef.current);
    }, 50);
    return () => clearInterval(fillRef.current);
  }, []);

  useEffect(() => {
    if (!onBurst) return;
    clearInterval(fillRef.current);
    const finish = setInterval(() => {
      fillPctRef.current = Math.min(fillPctRef.current + 4, 100);
      setFillPct(fillPctRef.current);
      if (fillPctRef.current >= 100) {
        clearInterval(finish);
        setTimeout(() => setExpanding(true), 80);
      }
    }, 20);
  }, [onBurst]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease', background: 'rgba(245,243,239,0.96)', backdropFilter: 'blur(12px)' }}>
      <div style={{ position: 'relative', width: 300, height: 300 }}>
        <div style={{ position: 'absolute', inset: -12, borderRadius: 28, border: '1.5px solid rgba(26,25,22,0.1)', animation: 'ro-pulse 2s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{
          position: 'relative', width: 300, height: 300,
          borderRadius: expanding ? '0px' : '20px',
          overflow: 'hidden',
          boxShadow: expanding ? 'none' : '0 24px 80px rgba(0,0,0,0.18)',
          transform: expanding ? `scale(${typeof window !== 'undefined' ? Math.max(window.innerWidth / 300, window.innerHeight / 300) * 1.05 : 6})` : 'scale(1)',
          transition: expanding ? 'transform 0.7s cubic-bezier(0.4,0,0.2,1), border-radius 0.7s ease, box-shadow 0.5s ease' : 'none',
          transformOrigin: 'center center',
          flexShrink: 0,
        }}>
          {art ? (<>
            <img src={art} alt={album} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%) brightness(0.55) blur(1px)', display: 'block' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: fillPct + '%', overflow: 'hidden', transition: 'height 0.06s linear' }}>
              <img src={art} alt="" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '300px', objectFit: 'cover', display: 'block' }} />
            </div>
          </>) : (
            <div style={{ width: '100%', height: '100%', background: '#2a2a2a' }} />
          )}
        </div>
      </div>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{ fontFamily: fonts.serif, fontSize: 'clamp(1.2rem,2.5vw,1.7rem)', color: '#1a1916', lineHeight: 1.1 }}>{album}</div>
        <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(26,25,22,0.35)' }}>{artist}</div>
        <div key={phraseIndex} style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(26,25,22,0.45)', marginTop: 6, animation: 'overlay-fade 0.5s ease forwards' }}>
          {LOADING_PHRASES[phraseIndex % LOADING_PHRASES.length]}
        </div>
      </div>
      <style>{`
        @keyframes ro-pulse{0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(1.04);opacity:0.15}}
        @keyframes overlay-fade{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </div>
  );
}
