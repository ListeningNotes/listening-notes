'use client';
import { useState, useEffect, useRef } from 'react';
import { searchArtistAlbums } from '../../library/music_data_api';

// Echo landing — no background rendered here; EchoOrb in session/page.js provides it.
export default function AlbumSelection({ onSelect }) {
  const [artistInput, setArtistInput] = useState('');
  const [albums, setAlbums] = useState([]);
  const [searching, setSearching] = useState(false);
  const [manualAlbum, setManualAlbum] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [pending, setPending] = useState(null); // selected album awaiting confirm
  const [relationship, setRelationship] = useState('');
  const [entryType, setEntryType] = useState('');
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

  function handleAlbumPick(album) {
    setPending(album);
    setRelationship('');
    setEntryType('');
  }

  function handleManualSubmit() {
    if (!manualAlbum.trim() || !artistInput.trim()) return;
    setPending({ name: manualAlbum.trim(), artist: artistInput.trim(), year: '', artLarge: '' });
    setRelationship('');
    setEntryType('');
  }

  function handleRelationshipPick(val) {
    setRelationship(val);
  }

  function handleEntryTypePick(val) {
    const et = val;
    if (!pending) return;
    onSelect({
      album: pending.name,
      artist: pending.artist,
      year: pending.year || '',
      artUrl: pending.artLarge || '',
      relationship,
      entryType: et,
    });
  }

  // ── Confirm Q2 — after relationship chosen ────────────────────────────────
  if (pending && relationship) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 22, color: '#1a1520', marginBottom: 36, lineHeight: 1.3 }}>
            how did this one come to you?
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            {['Personal collection', 'Submission', 'Discovery'].map(opt => (
              <button key={opt} onClick={() => handleEntryTypePick(opt)} style={{
                fontFamily: "'Nunito', sans-serif", fontWeight: 600, fontSize: 14,
                color: '#1a1520', background: 'rgba(245,242,236,0.72)',
                border: '1px solid rgba(26,21,32,0.18)', borderRadius: 32,
                padding: '11px 22px', cursor: 'pointer',
                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                transition: 'background 0.15s, border-color 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,242,236,0.95)'; e.currentTarget.style.borderColor = 'rgba(26,21,32,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,242,236,0.72)'; e.currentTarget.style.borderColor = 'rgba(26,21,32,0.18)'; }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Confirm Q1 — album selected, asking relationship ──────────────────────
  if (pending) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
        <div style={{ textAlign: 'center' }}>
          {pending.artLarge && (
            <img src={pending.artLarge} alt={pending.name}
              style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover', marginBottom: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }} />
          )}
          <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 400, fontSize: 12, color: 'rgba(26,21,32,0.45)', letterSpacing: '0.06em', marginBottom: 8 }}>
            {pending.name}{pending.year ? ` · ${pending.year}` : ''}
          </div>
          <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 22, color: '#1a1520', marginBottom: 32, lineHeight: 1.3 }}>
            is this your first time with this one?
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            {['First listen', 'Revisit', 'Deep study', 'Something else'].map(opt => (
              <button key={opt} onClick={() => handleRelationshipPick(opt)} style={{
                fontFamily: "'Nunito', sans-serif", fontWeight: 600, fontSize: 14,
                color: '#1a1520', background: 'rgba(245,242,236,0.72)',
                border: '1px solid rgba(26,21,32,0.18)', borderRadius: 32,
                padding: '11px 22px', cursor: 'pointer',
                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                transition: 'background 0.15s, border-color 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,242,236,0.95)'; e.currentTarget.style.borderColor = 'rgba(26,21,32,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,242,236,0.72)'; e.currentTarget.style.borderColor = 'rgba(26,21,32,0.18)'; }}
              >
                {opt}
              </button>
            ))}
          </div>
          <button onClick={() => setPending(null)} style={{ marginTop: 28, fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'rgba(26,21,32,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}>
            ← back
          </button>
        </div>
      </div>
    );
  }

  // ── Search / landing ──────────────────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', fontFamily: "'Nunito', sans-serif", zIndex: 5, overflowY: 'auto' }}>

      {/* Top nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 28px', flexShrink: 0 }}>
        <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 18, fontWeight: 900, color: '#1a1520', letterSpacing: '-0.02em' }}>Listening Notes</span>
        <span style={{ color: 'rgba(26,21,32,0.2)' }}>·</span>
        <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 600, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(153,153,153,0.8)' }}>session</span>
        <div style={{ marginLeft: 'auto' }}>
          <a href="/session/entries" style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 600, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(26,21,32,0.5)', textDecoration: 'none', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(26,21,32,0.12)', background: 'rgba(245,242,236,0.6)', backdropFilter: 'blur(8px)' }}>Entries</a>
        </div>
      </div>

      {/* Center — search UI */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: albums.length > 0 ? 'flex-start' : 'center', padding: '48px 24px' }}>
        <div style={{ width: '100%', maxWidth: 520, marginBottom: albums.length > 0 ? 36 : 0 }}>

          {/* Echo prompt */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 26, color: '#1a1520', lineHeight: 1.2, marginBottom: 12 }}>
              what should we listen to?
            </div>
            <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 600, fontSize: 11, letterSpacing: '0.28em', color: 'rgba(153,153,153,0.7)' }}>
              E C H O
            </div>
          </div>

          {/* Search input */}
          <div style={{ position: 'relative' }}>
            <input
              ref={inputRef}
              value={artistInput}
              onChange={e => setArtistInput(e.target.value)}
              placeholder="search by artist..."
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(245,242,236,0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(26,21,32,0.14)', borderRadius: 14,
                padding: '16px 22px',
                fontFamily: "'Nunito', sans-serif", fontWeight: 400, fontSize: 16, color: '#1a1520',
                outline: 'none', boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(26,21,32,0.4)'}
              onBlur={e => e.target.style.borderColor = 'rgba(26,21,32,0.14)'}
            />
            {searching && (
              <div style={{ position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)', fontFamily: "'Nunito', sans-serif", fontSize: 11, color: 'rgba(26,21,32,0.35)', letterSpacing: '0.06em' }}>
                searching…
              </div>
            )}
          </div>

          {artistInput.trim() && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
              {!showManual ? (
                <button onClick={() => setShowManual(true)} style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 600, fontSize: 11, letterSpacing: '0.08em', color: 'rgba(26,21,32,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  + type album manually
                </button>
              ) : (
                <>
                  <input
                    value={manualAlbum}
                    onChange={e => setManualAlbum(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
                    placeholder="album title..."
                    style={{ flex: 1, background: 'rgba(245,242,236,0.8)', border: '1px solid rgba(26,21,32,0.14)', borderRadius: 8, padding: '9px 14px', fontFamily: "'Nunito', sans-serif", fontSize: 12, color: '#1a1520', outline: 'none' }}
                    autoFocus
                  />
                  <button onClick={handleManualSubmit} disabled={!manualAlbum.trim()}
                    style={{ background: '#1a1520', color: '#f5f2ec', border: 'none', borderRadius: 8, padding: '9px 18px', fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', opacity: manualAlbum.trim() ? 1 : 0.3 }}>
                    Start →
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Album grid */}
        {albums.length > 0 && (
          <div style={{ width: '100%', maxWidth: 960 }}>
            <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 600, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(26,21,32,0.4)', marginBottom: 16, paddingLeft: 4 }}>
              Albums by {albums[0]?.artist} — choose one to begin
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14 }}>
              {albums.map((album, i) => (
                <button key={i} onClick={() => handleAlbumPick(album)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', borderRadius: 10, transition: 'transform 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{ borderRadius: 10, overflow: 'hidden', aspectRatio: '1', background: 'rgba(26,21,32,0.08)', marginBottom: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                    <img src={album.art} alt={album.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                  <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 600, fontSize: 12, color: '#1a1520', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.name}</div>
                  {album.year && <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 10, color: 'rgba(26,21,32,0.4)', marginTop: 2 }}>{album.year}</div>}
                </button>
              ))}
            </div>
          </div>
        )}

        {!searching && artistInput.trim() && albums.length === 0 && (
          <div style={{ marginTop: 24, fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'rgba(26,21,32,0.4)', textAlign: 'center' }}>
            No results — try typing the album manually above
          </div>
        )}
      </div>
    </div>
  );
}
