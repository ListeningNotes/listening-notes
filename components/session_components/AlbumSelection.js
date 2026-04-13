'use client';
import { useState, useEffect, useRef } from 'react';
import { fonts } from '../../library/sitewide_visuals';
import { searchArtistAlbums } from '../../library/music_data_api';

const border = '1px solid #e0dcd5';
const labelStyle = { fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7a776f' };

export default function AlbumSelection({ onSelect }) {
  const [artistInput, setArtistInput] = useState('');
  const [albums, setAlbums] = useState([]);
  const [searching, setSearching] = useState(false);
  const [manualAlbum, setManualAlbum] = useState('');
  const [showManual, setShowManual] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!artistInput.trim()) { setAlbums([]); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchArtistAlbums(artistInput);
      setAlbums(results);
      setSearching(false);
    }, 600);
    return () => clearTimeout(debounceRef.current);
  }, [artistInput]);

  function handleAlbumClick(album) {
    onSelect({ album: album.name, artist: album.artist, year: album.year, artUrl: album.artLarge });
  }

  function handleManualSubmit() {
    if (!manualAlbum.trim() || !artistInput.trim()) return;
    onSelect({ album: manualAlbum.trim(), artist: artistInput.trim(), year: '', artUrl: '' });
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: fonts.sans, position: 'relative' }}>
      <style>{`
        @keyframes drift1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,-20px) scale(1.08)} }
        @keyframes drift2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-25px,30px) scale(1.06)} }
        @keyframes drift3 { 0%,100%{transform:translate(0,0) scale(1.05)} 50%{transform:translate(20px,20px) scale(1)} }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0, background: '#f0ede8' }}>
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,212,122,0.45) 0%, transparent 70%)', top: '-10%', left: '-5%', animation: 'drift1 14s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(180,200,255,0.35) 0%, transparent 70%)', bottom: '-10%', right: '5%', animation: 'drift2 18s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,220,180,0.35) 0%, transparent 70%)', top: '30%', right: '20%', animation: 'drift3 22s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(245,243,239,0.3)' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 28px', borderBottom: border, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', flexShrink: 0, position: 'relative', zIndex: 1 }}>
        <span style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 900, color: '#1a1916', letterSpacing: '-0.02em' }}>Listening Notes</span>
        <span style={{ color: '#d0ccc5' }}>·</span>
        <span style={labelStyle}>session</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <a href="/session/entries" style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7a776f', textDecoration: 'none', padding: '6px 10px', borderRadius: 8, border, background: '#fff' }}>Entries</a>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: albums.length > 0 ? 'flex-start' : 'center', padding: '48px 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ width: '100%', maxWidth: 560, marginBottom: albums.length > 0 ? 32 : 0 }}>
          <div style={{ fontFamily: fonts.serif, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#1a1916', lineHeight: 1.1, marginBottom: 28, textAlign: 'center' }}>
            What do you want<br />to listen to?
          </div>
          <div style={{ position: 'relative' }}>
            <input
              ref={inputRef}
              value={artistInput}
              onChange={e => setArtistInput(e.target.value)}
              placeholder="Search by artist..."
              style={{ width: '100%', background: '#fff', border: '1px solid #d8d5cf', borderRadius: 14, padding: '16px 22px', fontFamily: fonts.sans, fontSize: 16, color: '#1a1916', outline: 'none', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#1a1916'}
              onBlur={e => e.target.style.borderColor = '#d8d5cf'}
            />
            {searching && (
              <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontFamily: fonts.mono, fontSize: 10, color: '#aaa8a2', letterSpacing: '0.1em' }}>
                searching…
              </div>
            )}
          </div>

          {artistInput.trim() && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
              {!showManual ? (
                <button onClick={() => setShowManual(true)} style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa8a2', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  + type album manually
                </button>
              ) : (
                <>
                  <input
                    value={manualAlbum}
                    onChange={e => setManualAlbum(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
                    placeholder="Album title..."
                    style={{ flex: 1, background: '#fff', border, borderRadius: 8, padding: '9px 14px', fontFamily: fonts.mono, fontSize: 12, color: '#1a1916', outline: 'none' }}
                    autoFocus
                  />
                  <button onClick={handleManualSubmit} disabled={!manualAlbum.trim()}
                    style={{ background: '#1a1916', color: '#f5f3ef', border: 'none', borderRadius: 8, padding: '9px 18px', fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', opacity: manualAlbum.trim() ? 1 : 0.3 }}>
                    Start →
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {albums.length > 0 && (
          <div style={{ width: '100%', maxWidth: 960 }}>
            <div style={{ ...labelStyle, marginBottom: 16, paddingLeft: 4 }}>
              Albums by {albums[0]?.artist} — choose one to begin
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14 }}>
              {albums.map((album, i) => (
                <button key={i} onClick={() => handleAlbumClick(album)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', borderRadius: 10, transition: 'transform 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{ borderRadius: 10, overflow: 'hidden', aspectRatio: '1', background: '#ece9e3', marginBottom: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                    <img src={album.art} alt={album.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                  <div style={{ fontFamily: fonts.sans, fontSize: 12, fontWeight: 500, color: '#1a1916', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.name}</div>
                  {album.year && <div style={{ fontFamily: fonts.mono, fontSize: 10, color: '#aaa8a2', marginTop: 2 }}>{album.year}</div>}
                </button>
              ))}
            </div>
          </div>
        )}

        {!searching && artistInput.trim() && albums.length === 0 && (
          <div style={{ marginTop: 24, fontFamily: fonts.mono, fontSize: 11, color: '#aaa8a2', textAlign: 'center' }}>
            No results — try typing the album manually above
          </div>
        )}
      </div>
    </div>
  );
}
