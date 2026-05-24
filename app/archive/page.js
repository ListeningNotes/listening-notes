'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { fonts } from '../../library/sitewide_visuals';
import { parseRating } from '../../library/entry_formatter';
import DotNav from '../../components/main_components/DotNav';
import EntryModal from '../../components/main_components/EntryModal';
import { useTheme } from '../../components/main_components/Lightswitch';

const SORTS = [
  { value: 'newest',    label: 'Newest'    },
  { value: 'oldest',    label: 'Oldest'    },
  { value: 'album-az',  label: 'Album A–Z' },
  { value: 'artist-az', label: 'Artist A–Z'},
  { value: 'rating',    label: 'Highest rated' },
];

const RELATIONSHIPS = ['First Listen', 'Revisit', 'Formative', 'Study', 'Submission'];
const TYPES = ['Personal Library', 'Submission'];

export default function ArchivePage() {
  const { theme, toggle } = useTheme();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalSlug, setModalSlug] = useState(null);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [relationship, setRelationship] = useState('');
  const [entryType, setEntryType] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [masterpiecesOnly, setMasterpiecesOnly] = useState(false);

  useEffect(() => {
    fetch('/api/entries')
      .then(r => r.json())
      .then(d => { setEntries(d.entries || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries
      .filter(e => {
        if (q && !((e.album || '').toLowerCase().includes(q) || (e.artist || '').toLowerCase().includes(q))) return false;
        if (relationship && e.relationship !== relationship) return false;
        if (entryType && e.entry_type !== entryType) return false;
        if (favoritesOnly && !(e.favorite === true || e.favorite === 'true')) return false;
        if (masterpiecesOnly && e.rating !== 'Masterpiece' && e.masterpiece !== true) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest')   return new Date(b.created_at) - new Date(a.created_at);
        if (sortBy === 'oldest')   return new Date(a.created_at) - new Date(b.created_at);
        if (sortBy === 'album-az') return (a.album  || '').localeCompare(b.album  || '');
        if (sortBy === 'artist-az')return (a.artist || '').localeCompare(b.artist || '');
        if (sortBy === 'rating')   return (parseRating(b.rating) || 0) - (parseRating(a.rating) || 0);
        return 0;
      });
  }, [entries, search, sortBy, relationship, entryType, favoritesOnly, masterpiecesOnly]);

  function clearFilters() {
    setSearch(''); setRelationship(''); setEntryType('');
    setFavoritesOnly(false); setMasterpiecesOnly(false); setSortBy('newest');
  }

  const hasActiveFilters = search || relationship || entryType || favoritesOnly || masterpiecesOnly || sortBy !== 'newest';

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--ink)', fontFamily: fonts.sans }}>
      <Link href="/" className="hp-logo-mini" aria-label="Listening Notes">
        <img src="/Logo.png" alt="Listening Notes" style={{ height: 30, width: 'auto', display: 'block', filter: theme === 'dark' ? 'invert(1)' : 'none' }} />
      </Link>
      <div className="hp-corner">
        <a
          href="https://instagram.com/listeningnotes.blog"
          target="_blank"
          rel="noopener noreferrer"
          className="hp-icon-btn"
          aria-label="Instagram"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/></svg>
        </a>
        <button className="hp-icon-btn" onClick={toggle} aria-label="Toggle theme">
          {theme === 'dark' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"/></svg>
          )}
        </button>
      </div>
      <DotNav />

      <style>{`
        .arc-tile { position: relative; aspect-ratio: 1 / 1; background: var(--bg-warm); border-radius: 10px; overflow: hidden; cursor: pointer; transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .arc-tile:hover { transform: translateY(-3px); box-shadow: var(--shadow-lift); }
        .arc-tile img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .arc-tile-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-size: 48px; color: var(--ink-faint); }
        .arc-tile-meta { position: absolute; left: 0; right: 0; bottom: 0; padding: 12px 12px 10px; background: linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0)); opacity: 0; transition: opacity 0.18s; pointer-events: none; }
        .arc-tile:hover .arc-tile-meta { opacity: 1; }
        .arc-tile-album { font-family: var(--font-sans); font-size: 12px; font-weight: 600; color: #fff; line-height: 1.25; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
        .arc-tile-artist { font-family: var(--font-label); font-size: 10px; color: rgba(255,255,255,0.7); margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .arc-tile-fav { position: absolute; top: 8px; right: 8px; font-size: 11px; color: #ff8aa3; text-shadow: 0 1px 4px rgba(0,0,0,0.6); }
        .arc-tile-mp  { position: absolute; top: 8px; left: 8px; font-family: var(--font-label); font-size: 9px; letter-spacing: 0.1em; color: var(--gold); padding: 2px 6px; background: rgba(0,0,0,0.6); border-radius: 4px; }
        .arc-skel { aspect-ratio: 1 / 1; border-radius: 10px; background: var(--bg-warm); animation: arcPulse 1.4s ease-in-out infinite; }
        @keyframes arcPulse { 0%,100% { opacity: 0.6; } 50% { opacity: 0.3; } }
      `}</style>

      {/* Hero */}
      <header style={{ maxWidth: 1100, margin: '0 auto', padding: '120px 24px 32px' }}>
        <div style={{ fontFamily: 'var(--font-label)', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 14 }}>
          Archive
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 'clamp(38px, 6vw, 60px)', margin: 0, lineHeight: 1.08, letterSpacing: '-0.02em' }}>
          Every album, in one place.
        </h1>
        <p style={{ fontFamily: fonts.sans, fontSize: 16, lineHeight: 1.6, color: 'var(--ink-soft)', marginTop: 18, maxWidth: 580 }}>
          {entries.length > 0 ? `${entries.length} entries and counting.` : 'Loading the archive…'}
        </p>
      </header>

      {/* Filter bar */}
      <div style={{
        position: 'sticky', top: 12, zIndex: 50, padding: '12px 24px',
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          padding: '12px 16px', background: 'var(--panel)',
          backdropFilter: 'var(--card-blur)', WebkitBackdropFilter: 'var(--card-blur)',
          border: '1px solid var(--panel-border)', borderRadius: 14,
          boxShadow: 'var(--shadow-soft)',
        }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search album or artist…"
            style={inputStyle}
          />
          <Select value={sortBy} onChange={setSortBy}>
            {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
          <Select value={relationship} onChange={setRelationship} placeholder="Relationship">
            <option value="">All relationships</option>
            {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
          </Select>
          <Select value={entryType} onChange={setEntryType} placeholder="Type">
            <option value="">All types</option>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Toggle active={favoritesOnly}     onClick={() => setFavoritesOnly(v => !v)}     label="Favorites" />
          <Toggle active={masterpiecesOnly}  onClick={() => setMasterpiecesOnly(v => !v)}  label="Masterpieces" />

          {hasActiveFilters && (
            <button onClick={clearFilters} style={clearStyle}>Clear</button>
          )}

          <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-label)', fontSize: 10, color: 'var(--ink-faint)', letterSpacing: '0.1em' }}>
            {filtered.length} / {entries.length}
          </span>
        </div>
      </div>

      {/* Grid */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 120px' }}>
        {loading ? (
          <div style={gridStyle}>
            {[...Array(18)].map((_, i) => <div key={i} className="arc-skel" style={{ animationDelay: (i * 0.04) + 's' }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 0', color: 'var(--ink-faint)',
            fontFamily: 'var(--font-label)', fontSize: 12, letterSpacing: '0.1em',
          }}>
            No entries match these filters.
          </div>
        ) : (
          <div style={gridStyle}>
            {filtered.map(e => {
              const isFav = e.favorite === true || e.favorite === 'true';
              const isMP  = e.rating === 'Masterpiece' || e.masterpiece === true;
              return (
                <div key={e.slug} className="arc-tile" onClick={() => setModalSlug(e.slug)}>
                  {e.album_art
                    ? <img src={e.album_art} alt={e.album} loading="lazy" />
                    : <div className="arc-tile-placeholder">{(e.album || '?')[0]}</div>
                  }
                  {isMP  && <div className="arc-tile-mp">M</div>}
                  {isFav && <div className="arc-tile-fav">♥</div>}
                  <div className="arc-tile-meta">
                    <div className="arc-tile-album">{e.album}</div>
                    <div className="arc-tile-artist">{e.artist}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 80, paddingTop: 32, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          <Link href="/" style={{
            fontFamily: 'var(--font-label)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'var(--ink-soft)', textDecoration: 'none',
          }}>
            ← Back home
          </Link>
        </div>
      </main>

      {modalSlug && <EntryModal slug={modalSlug} onClose={() => setModalSlug(null)} />}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

function Select({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        background: 'var(--panel-solid)', color: 'var(--ink)',
        border: '1px solid var(--border)', borderRadius: 8,
        padding: '8px 12px', fontFamily: 'var(--font-label)', fontSize: 11,
        letterSpacing: '0.06em', cursor: 'pointer', outline: 'none',
      }}
    >
      {children}
    </select>
  );
}

function Toggle({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: 'var(--font-label)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
        padding: '8px 14px', borderRadius: 999, cursor: 'pointer',
        background: active ? 'var(--accent)' : 'transparent',
        color: active ? '#1a1a1a' : 'var(--ink-soft)',
        border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
      }}
    >
      {label}
    </button>
  );
}

const inputStyle = {
  background: 'var(--panel-solid)', color: 'var(--ink)',
  border: '1px solid var(--border)', borderRadius: 8,
  padding: '8px 14px', fontFamily: 'var(--font-label)', fontSize: 12,
  outline: 'none', minWidth: 200, flex: '0 1 240px',
};

const clearStyle = {
  fontFamily: 'var(--font-label)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
  padding: '8px 12px', borderRadius: 999, cursor: 'pointer',
  background: 'transparent', color: 'var(--ink-soft)',
  border: '1px solid var(--border)',
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
  gap: 14,
};
