// app/dashboard/entries/page.js
// Your private CMS — view, edit, and delete all entries in the database.
// Password protected, same gate as the main session tool.

'use client';

import { useState, useEffect, useRef } from 'react';
import PasswordGate from '../../../components/session_components/PasswordGate';
import backgrounds from '../../../components/session_components/backgrounds';
import StarRating from '../../../components/session_components/StarRating';
import { fonts } from '../../../library/sitewide_visuals';

const MONO  = "'DM Mono', 'Courier New', monospace";
const SERIF = "'DM Serif Display', Georgia, serif";
const SANS  = "'DM Sans', system-ui, sans-serif";
const INK = '#1a1916';
const PANEL_BG = 'rgba(255,255,255,0.8)';
const HAIR = '1px solid rgba(26,25,22,0.08)';
const labelStyle = { fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(26,25,22,0.45)' };

// Frosted controls (search / sort)
const controlStyle = {
  background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(26,25,22,0.12)', borderRadius: 10,
  padding: '8px 14px', fontFamily: MONO, fontSize: 12, color: INK, outline: 'none',
  backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
};

// ── EDIT MODAL ──────────────────────────────────────────────────────────────
function inputStyle(focused) {
  return {
    background: 'rgba(255,255,255,0.7)', border: `1px solid ${focused ? INK : 'rgba(26,25,22,0.14)'}`, borderRadius: 10,
    padding: '9px 14px', fontFamily: MONO, fontSize: 12, color: INK, outline: 'none', width: '100%', boxSizing: 'border-box',
  };
}

function EditModal({ entry, onSave, onDelete, onClose }) {
  const [fields, setFields] = useState({
    album: entry.album || '',
    artist: entry.artist || '',
    year: entry.year || '',
    rating: entry.rating || '',
    relationship: entry.relationship || '',
    entry_type: entry.entry_type || '',
    favorite: entry.favorite === true || entry.favorite === 'true',
    masterpiece: entry.masterpiece === true,
    notes: entry.notes || '',
    tags: Array.isArray(entry.tags) ? entry.tags.join(', ') : (entry.tags || ''),
    horizon: entry.horizon || '',
    album_art: entry.album_art || '',
    tracks: Array.isArray(entry.tracks) ? entry.tracks.map(t => ({ ...t })) : [],
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  function set(key, val) { setFields(f => ({ ...f, [key]: val })); }
  function setTrack(i, key, val) {
    setFields(f => ({ ...f, tracks: f.tracks.map((t, n) => (n === i ? { ...t, [key]: val } : t)) }));
  }

  async function handleSave() {
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/entries/${entry.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onSave(data.entry);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      const res = await fetch(`/api/entries/${entry.slug}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onDelete(entry.slug);
    } catch (err) { setError(err.message); setDeleting(false); }
  }

  const taStyle = (minH = 80) => ({ ...inputStyle(), resize: 'vertical', minHeight: minH });

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(26,25,22,0.3)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: PANEL_BG, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.6)', borderRadius: 24, width: '100%', maxWidth: 700, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.2)', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(255,255,255,0.5) 0%, transparent 40%)', pointerEvents: 'none' }} />

        {/* Header */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 26px', borderBottom: HAIR }}>
          <div>
            <div style={{ fontFamily: SERIF, fontSize: 18, color: INK }}>{entry.album}</div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(26,25,22,0.4)', marginTop: 2 }}>{entry.artist}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <a href={`/entries/${entry.slug}`} target="_blank" rel="noreferrer"
              style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(26,25,22,0.55)', textDecoration: 'none', padding: '7px 14px', border: '1px solid rgba(26,25,22,0.12)', borderRadius: 999, background: 'rgba(255,255,255,0.5)' }}>
              View →
            </a>
            <button onClick={handleSave} disabled={saving}
              style={{ background: INK, color: '#fff', border: 'none', borderRadius: 999, padding: '8px 20px', fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontWeight: 600, opacity: saving ? 0.5 : 1 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={handleDelete} disabled={deleting}
              style={{ background: confirmDelete ? '#ef4444' : 'rgba(255,255,255,0.5)', color: confirmDelete ? '#fff' : '#ef4444', border: `1px solid ${confirmDelete ? '#ef4444' : 'rgba(239,68,68,0.4)'}`, borderRadius: 999, padding: '8px 14px', fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.15s' }}>
              {deleting ? '…' : confirmDelete ? 'Confirm delete' : 'Delete'}
            </button>
            {confirmDelete && (
              <button onClick={() => setConfirmDelete(false)} style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(26,25,22,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>cancel</button>
            )}
            <button onClick={onClose} style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(26,25,22,0.5)', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(26,25,22,0.1)', borderRadius: 10, padding: '8px 13px', cursor: 'pointer' }}>✕</button>
          </div>
        </div>

        {/* Form body */}
        <div style={{ position: 'relative', zIndex: 1, flex: 1, overflowY: 'auto', padding: 26, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {error && <div style={{ fontFamily: MONO, fontSize: 11, color: '#ef4444', padding: '8px 12px', background: 'rgba(255,245,245,0.8)', border: '1px solid #fca5a5', borderRadius: 8 }}>{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: 12 }}>
            <div><div style={{ ...labelStyle, marginBottom: 6 }}>Album</div><input value={fields.album} onChange={e => set('album', e.target.value)} style={inputStyle()} /></div>
            <div><div style={{ ...labelStyle, marginBottom: 6 }}>Artist</div><input value={fields.artist} onChange={e => set('artist', e.target.value)} style={inputStyle()} /></div>
            <div><div style={{ ...labelStyle, marginBottom: 6 }}>Year</div><input value={fields.year} onChange={e => set('year', e.target.value)} style={inputStyle()} /></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ ...labelStyle, marginBottom: 6 }}>Rating</div>
              <input value={fields.rating} onChange={e => set('rating', e.target.value)} placeholder="e.g. 4.5 stars" style={inputStyle()} />
            </div>
            <div>
              <div style={{ ...labelStyle, marginBottom: 6 }}>Relationship</div>
              <select value={fields.relationship} onChange={e => set('relationship', e.target.value)} style={{ ...inputStyle(), appearance: 'none' }}>
                <option value="">—</option>
                <option>First Listen</option><option>Revisit</option><option>Formative</option><option>Study</option><option>Submission</option>
              </select>
            </div>
            <div>
              <div style={{ ...labelStyle, marginBottom: 6 }}>Entry Type</div>
              <select value={fields.entry_type} onChange={e => set('entry_type', e.target.value)} style={{ ...inputStyle(), appearance: 'none' }}>
                <option value="">—</option>
                <option value="Personal Library">Personal Library</option>
                <option value="Submission">Submission</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 20 }}>
            {[['Favorite', 'favorite'], ['Masterpiece', 'masterpiece']].map(([lbl, key]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={fields[key]} onChange={e => set(key, e.target.checked)} style={{ accentColor: INK, cursor: 'pointer', width: 14, height: 14 }} />
                <span style={{ fontFamily: MONO, fontSize: 11, color: fields[key] ? INK : 'rgba(26,25,22,0.4)' }}>{lbl}</span>
              </label>
            ))}
          </div>

          <div>
            <div style={{ ...labelStyle, marginBottom: 6 }}>Notes</div>
            <textarea value={fields.notes} onChange={e => set('notes', e.target.value)} style={taStyle(160)} />
          </div>

          {/* Tracks — the stars and notes that used to be locked inside the
              prose. Saving re-derives both the track text and the horizon from
              these, so the three can't disagree. */}
          {fields.tracks.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={labelStyle}>Tracks ({fields.tracks.length})</div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(26,25,22,0.4)' }}>
                  horizon rebuilds on save
                </div>
              </div>
              <div style={{ border: '1px solid rgba(26,25,22,0.1)', borderRadius: 12, overflow: 'hidden' }}>
                {fields.tracks.map((t, i) => (
                  <div key={i} style={{
                    padding: '12px 14px',
                    borderTop: i ? '1px solid rgba(26,25,22,0.07)' : 'none',
                    background: i % 2 ? 'rgba(255,255,255,0.35)' : 'transparent',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(26,25,22,0.35)', minWidth: 22 }}>{t.number}.</span>
                      <input
                        value={t.title || ''}
                        onChange={e => setTrack(i, 'title', e.target.value)}
                        style={{ ...inputStyle(), flex: 1, padding: '6px 10px', fontSize: 13 }}
                      />
                      <StarRating value={t.rating || 0} onChange={v => setTrack(i, 'rating', v)} size={18} />
                      <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(26,25,22,0.4)', minWidth: 26, textAlign: 'right' }}>
                        {t.rating || '—'}
                      </span>
                    </div>
                    <textarea
                      value={t.note || ''}
                      onChange={e => setTrack(i, 'note', e.target.value)}
                      placeholder="no note"
                      style={{ ...taStyle(56), fontSize: 12, marginLeft: 32, width: 'calc(100% - 32px)' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div style={{ ...labelStyle, marginBottom: 6 }}>Tags (comma separated)</div>
            <input value={fields.tags} onChange={e => set('tags', e.target.value)} style={inputStyle()} />
          </div>

          <div>
            <div style={{ ...labelStyle, marginBottom: 6 }}>Album Art URL</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <input value={fields.album_art} onChange={e => set('album_art', e.target.value)} style={{ ...inputStyle(), flex: 1 }} />
              {fields.album_art && <img src={fields.album_art} alt="" style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(26,25,22,0.12)' }} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN ENTRIES PAGE ────────────────────────────────────────────────────────
export default function SessionEntries() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [sortField, setSortField] = useState(null); // null = default (newest first)
  const [sortDir, setSortDir] = useState('asc');
  const toggleSort = (field, initialDir = 'asc') => {
    if (sortField === field) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir(initialDir); }
  };
  const [albums, setAlbums] = useState([]);
  const Background = useRef(backgrounds[Math.floor(Math.random() * backgrounds.length)]).current;

  useEffect(() => {
    fetch('/api/auth/check').then(r => r.json()).then(d => setAuthed(!!d.authed)).catch(() => {}).finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (!authed) return;
    fetch('/api/entries').then(r => r.json()).then(d => {
      const list = d.entries || [];
      setEntries(list); setLoading(false);
      setAlbums(list.filter(e => e.album_art).sort(() => Math.random() - 0.5));
    }).catch(() => setLoading(false));
  }, [authed]);

  function handleSave(updated) { setEntries(prev => prev.map(e => e.slug === updated.slug ? updated : e)); setEditing(null); }
  function handleDelete(slug) { setEntries(prev => prev.filter(e => e.slug !== slug)); setEditing(null); }

  const filtered = entries
    .filter(e => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (e.album || '').toLowerCase().includes(q) || (e.artist || '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (!sortField) return new Date(b.created_at) - new Date(a.created_at);
      const num = v => parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')) || 0;
      const pick = {
        date: e => new Date(e.created_at).getTime(),
        album: e => (e.album || '').toLowerCase(),
        artist: e => (e.artist || '').toLowerCase(),
        type: e => (e.entry_type || '').toLowerCase(),
        year: e => num(e.year),
        rating: e => (e.masterpiece === true ? 999 : num(e.rating)),
      }[sortField];
      const av = pick(a), bv = pick(b);
      const cmp = typeof av === 'number' ? av - bv : av.localeCompare(bv);
      return sortDir === 'asc' ? cmp : -cmp;
    });

  if (checking) return <div style={{ minHeight: '100vh', background: '#eef0ec' }} />;
  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />;

  const COLS = '74px 1fr 1fr 70px 130px 110px';

  // Clickable column header with a sort caret.
  const SortHead = ({ field, initialDir = 'asc', children }) => {
    const active = sortField === field;
    return (
      <button onClick={() => toggleSort(field, initialDir)}
        style={{ ...labelStyle, padding: '0 8px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 4, color: active ? INK : labelStyle.color }}>
        {children}
        <span style={{ fontSize: 8, lineHeight: 1, color: active ? INK : 'rgba(26,25,22,0.28)' }}>{active ? (sortDir === 'asc' ? '▲' : '▼') : '▾'}</span>
      </button>
    );
  };

  return (
    <>
      <style>{`
        .se-row:hover { background: rgba(255,255,255,0.42); }
        .se-row { transition: background 0.12s; }
        html, body { background: #eef0ec; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.14); border-radius: 99px; }
      `}</style>

      {/* Fixed album background + frosted overlay */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: '#eef0ec', overflow: 'hidden' }}>
        <Background albums={albums} />
        <div style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', background: 'rgba(224,224,220,0.5)' }} />
      </div>

      <div style={{ height: '100vh', position: 'relative', zIndex: 1, fontFamily: SANS, color: INK, display: 'flex', flexDirection: 'column' }}>

        {/* Top bar — back button (echo style) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 28px', flexShrink: 0 }}>
          <a href="/dashboard" style={{ fontFamily: fonts.mono, fontWeight: 600, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(26,21,32,0.5)', textDecoration: 'none', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(26,21,32,0.12)', background: 'rgba(245,242,236,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', flexShrink: 0 }}>← Dashboard</a>
          <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(26,25,22,0.35)', letterSpacing: '0.08em' }}>{filtered.length} / {entries.length}</span>
        </div>

        {/* Entries panel */}
        <div style={{ flex: 1, minHeight: 0, width: '100%', maxWidth: 1000, alignSelf: 'center', padding: '4px 24px 24px', display: 'flex', flexDirection: 'column' }}>

          {/* Centered search */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14, flexShrink: 0 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search album or artist…" style={{ ...controlStyle, width: 'min(420px, 100%)', textAlign: 'center' }} />
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...Array(8)].map((_, i) => <div key={i} style={{ height: 52, borderRadius: 12, background: 'rgba(255,255,255,0.4)' }} />)}
            </div>
          ) : (
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: PANEL_BG, backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)', border: '1px solid rgba(255,255,255,0.55)', borderRadius: 24, boxShadow: '0 12px 44px rgba(0,0,0,0.10)', overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(255,255,255,0.5) 0%, transparent 45%)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: COLS, padding: '14px 20px', borderBottom: HAIR, flexShrink: 0, alignItems: 'center' }}>
                  <SortHead field="date" initialDir="desc">Added</SortHead>
                  <SortHead field="album">Album</SortHead>
                  <SortHead field="artist">Artist</SortHead>
                  <SortHead field="year">Year</SortHead>
                  <SortHead field="rating">Rating</SortHead>
                  <SortHead field="type">Type</SortHead>
                </div>
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>

                {filtered.length === 0 && (
                  <div style={{ padding: '56px 24px', textAlign: 'center', fontFamily: MONO, fontSize: 11, color: 'rgba(26,25,22,0.35)' }}>No entries found.</div>
                )}

                {filtered.map((entry) => (
                  <div key={entry.slug} className="se-row" style={{ display: 'grid', gridTemplateColumns: COLS, padding: '10px 20px', borderBottom: '1px solid rgba(26,25,22,0.05)', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => setEditing(entry)}>
                    <div style={{ padding: '0 8px' }}>
                      {entry.album_art
                        ? <img src={entry.album_art} alt="" style={{ width: 36, height: 36, borderRadius: 7, objectFit: 'cover', display: 'block' }} />
                        : <div style={{ width: 36, height: 36, borderRadius: 7, background: 'rgba(0,0,0,0.06)' }} />}
                    </div>
                    <div style={{ padding: '0 8px', fontFamily: SANS, fontSize: 13, fontWeight: 500, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.album}</div>
                    <div style={{ padding: '0 8px', fontFamily: MONO, fontSize: 11, color: 'rgba(26,25,22,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.artist}</div>
                    <div style={{ padding: '0 8px', fontFamily: MONO, fontSize: 11, color: 'rgba(26,25,22,0.4)' }}>{entry.year || '—'}</div>
                    <div style={{ padding: '0 8px', fontFamily: MONO, fontSize: 11, color: INK, display: 'flex', alignItems: 'center', gap: 5 }}>
                      {(() => {
                        if (entry.masterpiece === true) return '5';
                        if (!entry.rating) return '—';
                        const n = parseFloat(String(entry.rating).replace(/[^0-9.]/g, ''));
                        return isNaN(n) ? entry.rating : n;
                      })()}
                      {entry.masterpiece === true && <span title="Masterpiece" style={{ color: '#E8B84B', fontSize: 18, lineHeight: 1 }}>★</span>}
                      {entry.favorite === true && <span title="Favorite" style={{ color: '#e0245e', fontSize: 18, lineHeight: 1 }}>♥</span>}
                    </div>
                    <div style={{ padding: '0 8px', fontFamily: MONO, fontSize: 10, color: 'rgba(26,25,22,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.entry_type || '—'}</div>
                  </div>
                ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {editing && <EditModal entry={editing} onSave={handleSave} onDelete={handleDelete} onClose={() => setEditing(null)} />}
    </>
  );
}
