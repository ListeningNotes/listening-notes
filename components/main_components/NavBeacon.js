'use client';
import { useState, useEffect, useRef } from 'react';
import { useListeningBeacon } from '../../hooks/useListeningBeacon';

export default function NavBeacon() {
  const { track, isLive } = useListeningBeacon();
  const [open, setOpen] = useState(false);
  const [recents, setRecents] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    async function fetchRecents() {
      try {
        const res = await fetch('https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=listeningnotes&api_key=f022ca293645cd4cf2beeb3be7ae4b6f&limit=5&format=json');
        const data = await res.json();
        const all = data?.recenttracks?.track || [];
        setRecents(all.filter(t => !t['@attr']?.nowplaying).slice(0, 3).map(t => ({
          name: t.name,
          artist: t.artist['#text'],
          art: t.image?.[2]?.['#text'] || ''
        })));
      } catch {}
    }
    fetchRecents();
    const iv = setInterval(fetchRecents, 30000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const artUrl = track?.image || '';
  const trackName = track?.name || '';
  const artistName = track?.artist || '';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '999px', padding: '5px 12px 5px 6px', cursor: 'pointer',
          transition: 'border-color 0.2s',
        }}
      >
        <div style={{ width: '26px', height: '26px', borderRadius: '6px', overflow: 'hidden', background: 'var(--bg2)', flexShrink: 0 }}>
          {artUrl && <img src={artUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', maxWidth: '140px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {trackName || '—'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {isLive && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#7cff9b', flexShrink: 0, animation: 'ln-pulse 2.5s ease-in-out infinite' }} />}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              {isLive ? 'Now listening' : 'Last played'}
            </span>
          </div>
        </div>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)', padding: '16px', width: '240px', zIndex: 300,
          boxShadow: '0 24px 60px rgba(0,0,0,0.15)',
        }}>
          {artUrl && (
            <div style={{ width: '100%', aspectRatio: '1', borderRadius: '10px', overflow: 'hidden', marginBottom: '12px' }}>
              <img src={artUrl} alt={trackName} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          )}
          <div style={{ fontFamily: 'var(--font-nunito), sans-serif', fontWeight: 900, fontSize: '15px', color: 'var(--text)', lineHeight: 1.2, marginBottom: '3px' }}>{trackName}</div>
          <div style={{ fontFamily: 'var(--font-nunito), sans-serif', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: '14px' }}>{artistName}</div>
          {recents.length > 0 && (
            <>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>Recently played</div>
              {recents.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '5px', overflow: 'hidden', background: 'var(--bg2)', flexShrink: 0 }}>
                    {r.art && <img src={r.art} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--text)', lineHeight: 1.3 }}>{r.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>{r.artist}</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
