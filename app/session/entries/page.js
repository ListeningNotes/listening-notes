
'use client';

import { useState, useEffect } from 'react';

const PASSWORD = 'listeningnotes';
const MONO  = "'DM Mono', 'Courier New', monospace";
const SERIF = "'DM Serif Display', Georgia, serif";
const SANS  = "'DM Sans', system-ui, sans-serif";
const BORDER = '1px solid #e0dcd5';

const labelStyle = { fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7a776f' };

function inputStyle(focused) {
  return {
    background: '#fff', border: `1px solid ${focused ? '#1a1916' : '#e0dcd5'}`, borderRadius: 8,
    padding: '9px 14px', fontFamily: MONO, fontSize: 12, color: '#1a1916', outline: 'none', width: '100%', boxSizing: 'border-box',
  };
}

// ── Password Gate ──────────────────────────────────────────────────────────

function PasswordGate({ onAuth }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState(false);

  function handleAuth() {
    if (pw === PASSWORD) onAuth();
    else setError(true);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f3ef', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', border: BORDER, borderRadius: 20, padding: 48, width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 4px 32px rgba(0,0,0,0.08)' }}>
        <div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 900, color: '#1a1916', letterSpacing: '-0.02em' }}>Listening Notes</div>
          <div style={{ ...labelStyle, marginTop: 4 }}>entries access</div>
        </div>
        <input type="password" placeholder="password" value={pw}
          onChange={e => { setPw(e.target.value); setError(false); }}
          onKeyDown={e => e.key === 'Enter' && handleAuth()}
          style={{ background: '#fff', border: `1px solid ${error ? '#ef4444' : '#e0dcd5'}`, borderRadius: 8, padding: '12px 16px', fontFamily: MONO, fontSize: 13, color: '#1a1916', outline: 'none' }}
        />
        {error && <div style={{ fontFamily: MONO, fontSize: 11, color: '#ef4444' }}>incorrect password</div>}
        <button onClick={handleAuth}
          style={{ background: '#1a1916', color: '#1a1916', borderRadius: 8, padding: '12px 0', fontFamily: MONO, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', border: 'none', fontWeight: 600 }}>
          Enter →
        </button>
      </div>
    </div>
  );
}

// ── Edit Modal ─────────────────────────────────────────────────────────────

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
    background: entry.background || '',
    notes: entry.notes || '',
    tags: Array.isArray(entry.tags) ? entry.tags.join(', ') : (entry.tags || ''),
    horizon: entry.horizon || '',
    album_art: entry.album_art || '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  function set(key, val) { setFields(f => ({ ...f, [key]: val })); }

  async function handleSave() {
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/entries/${entry.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, password: PASSWORD }),
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
      const res = await fetch(`/api/entries/${entry.slug}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: PASSWORD }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onDelete(entry.slug);
    } catch (err) { setError(err.message); setDeleting(false); }
  }

  const taStyle = (minH = 80) => ({
    background: '#fff', border: BORDER, borderRadius: 8, padding: '9px 14px',
    fontFamily: MONO, fontSize: 12, color: '#1a1916', outline: 'none',
    width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: minH,
  });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,25,22,0.55)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
      <div style={{ background: '#f5f3ef', border: BORDER, borderRadius: 20, width: '100%', maxWidth: 700, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.2)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 28px', borderBottom: BORDER, background: '#fff' }}>
          <div>
            <div style={{ fontFamily: SERIF, fontSize: 18, color: '#1a1916' }}>{entry.album}</div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#aaa8a2', marginTop: 2 }}>{entry.artist}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <a href={`/entries/${entry.slug}`} target="_blank" rel="noreferrer"
              style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7a776f', textDecoration: 'none', padding: '7px 14px', border: BORDER, borderRadius: 8, background: '#f5f3ef' }}>
              View →
            </a>
            <button onClick={handleSave} disabled={saving}
              style={{ background: '#1a1916', color: '#1a1916', border: 'none', borderRadius: 8, padding: '8px 20px', fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontWeight: 600, opacity: saving ? 0.5 : 1 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={handleDelete} disabled={deleting}
              style={{ background: confirmDelete ? '#ef4444' : '#fff', color: confirmDelete ? '#fff' : '#ef4444', border: `1px solid ${confirmDelete ? '#ef4444' : '#fca5a5'}`, borderRadius: 8, padding: '8px 14px', fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.15s' }}>
              {deleting ? '…' : confirmDelete ? 'Confirm delete' : 'Delete'}
            </button>
            {confirmDelete && (
              <button onClick={() => setConfirmDelete(false)} style={{ fontFamily: MONO, fontSize: 10, color: '#aaa8a2', background: 'none', border: 'none', cursor: 'pointer' }}>cancel</button>
            )}
            <button onClick={onClose} style={{ fontFamily: MONO, fontSize: 11, color: '#7a776f', background: '#f0ede8', border: BORDER, borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>✕</button>
          </div>
        </div>

        {/* Form */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {error && <div style={{ fontFamily: MONO, fontSize: 11, color: '#ef4444', padding: '8px 12px', background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 6 }}>{error}</div>}

          {/* Row 1 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: 12 }}>
            <div><div style={{ ...labelStyle, marginBottom: 6 }}>Album</div><input value={fields.album} onChange={e => set('album', e.target.value)} style={inputStyle()} /></div>
            <div><div style={{ ...labelStyle, marginBottom: 6 }}>Artist</div><input value={fields.artist} onChange={e => set('artist', e.target.value)} style={inputStyle()} /></div>
            <div><div style={{ ...labelStyle, marginBottom: 6 }}>Year</div><input value={fields.year} onChange={e => set('year', e.target.value)} style={inputStyle()} /></div>
          </div>

          {/* Row 2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ ...labelStyle, marginBottom: 6 }}>Rating</div>
              <input value={fields.rating} onChange={e => set('rating', e.target.value)} placeholder="e.g. 4.5 stars" style={inputStyle()} />
            </div>
            <div>
              <div style={{ ...labelStyle, marginBottom: 6 }}>Relationship</div>
              <select value={fields.relationship} onChange={e => set('relationship', e.target.value)}
                style={{ ...inputStyle(), appearance: 'none' }}>
                <option value="">—</option>
                <option>First Listen</option><option>Revisit</option><option>Formative</option><option>Study</option><option>Submission</option>
              </select>
            </div>
            <div>
              <div style={{ ...labelStyle, marginBottom: 6 }}>Entry Type</div>
              <select value={fields.entry_type} onChange={e => set('entry_type', e.target.value)}
                style={{ ...inputStyle(), appearance: 'none' }}>
                <option value="">—</option>
                <option value="Personal Library">Personal Library</option>
                <option value="Submission">Submission</option>
              </select>
            </div>
          </div>

          {/* Toggles */}
          <div style={{ display: 'flex', gap: 20 }}>
            {[['Favorite', 'favorite'], ['Masterpiece', 'masterpiece']].map(([label, key]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={fields[key]} onChange={e => set(key, e.target.checked)}
                  style={{ accentColor: '#1a1916', cursor: 'pointer', width: 14, height: 14 }} />
                <span style={{ fontFamily: MONO, fontSize: 11, color: fields[key] ? '#1a1916' : '#aaa8a2' }}>{label}</span>
              </label>
            ))}
          </div>

          {/* Background */}
          <div>
            <div style={{ ...labelStyle, marginBottom: 6 }}>Background</div>
            <textarea value={fields.background} onChange={e => set('background', e.target.value)} style={taStyle(100)} />
          </div>

          {/* Notes */}
          <div>
            <div style={{ ...labelStyle, marginBottom: 6 }}>Notes</div>
            <textarea value={fields.notes} onChange={e => set('notes', e.target.value)} style={taStyle(160)} />
          </div>

          {/* Tags + Horizon */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ ...labelStyle, marginBottom: 6 }}>Tags (comma separated)</div>
              <input value={fields.tags} onChange={e => set('tags', e.target.value)} style={inputStyle()} />
            </div>
            <div>
              <div style={{ ...labelStyle, marginBottom: 6 }}>Horizon</div>
              <input value={fields.horizon} onChange={e => set('horizon', e.target.value)} placeholder="▁▂▃▆▇…" style={inputStyle()} />
            </div>
          </div>

          {/* Album art */}
          <div>
            <div style={{ ...labelStyle, marginBottom: 6 }}>Album Art URL</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <input value={fields.album_art} onChange={e => set('album_art', e.target.value)} style={{ ...inputStyle(), flex: 1 }} />
              {fields.album_art && (
                <img src={fields.album_art} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: BORDER }} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Entries Page ──────────────────────────────────────────────────────

export default function SessionEntries() {
  const [authed, setAuthed] = useState(false);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    if (localStorage.getItem('ln_session_auth') === 'true') setAuthed(true);
  }, []);

  function handleAuth() {
    setAuthed(true);
    localStorage.setItem('ln_session_auth', 'true');
  }

  useEffect(() => {
    if (!authed) return;
    fetch('/api/entries')
      .then(r => r.json())
      .then(d => { setEntries(d.entries || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [authed]);

  function handleSave(updated) {
    setEntries(prev => prev.map(e => e.slug === updated.slug ? updated : e));
    setEditing(null);
  }

  function handleDelete(slug) {
    setEntries(prev => prev.filter(e => e.slug !== slug));
    setEditing(null);
  }

  const filtered = entries
    .filter(e => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (e.album || '').toLowerCase().includes(q) || (e.artist || '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === 'alpha') return (a.album || '').localeCompare(b.album || '');
      return 0;
    });

  if (!authed) return <PasswordGate onAuth={handleAuth} />;

  return (
    <>
      <style>{`
        .se-row:hover { background: #f0ede8; }
        .se-row { transition: background 0.1s; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #e0dcd5; border-radius: 99px; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f5f3ef', fontFamily: SANS, color: '#1a1916' }}>

        {/* Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 28px', borderBottom: BORDER, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10 }}>
          <a href="/session" style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 900, color: '#1a1916', letterSpacing: '-0.02em', textDecoration: 'none' }}>Listening Notes</a>
          <span style={{ color: '#d0ccc5' }}>·</span>
          <span style={{ ...labelStyle }}>entries</span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: '#c0bdb7', marginLeft: 4 }}>{filtered.length} / {entries.length}</span>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search album or artist…"
              style={{ background: '#fff', border: BORDER, borderRadius: 8, padding: '7px 14px', fontFamily: MONO, fontSize: 12, color: '#1a1916', outline: 'none', width: 220 }}
            />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{ background: '#fff', border: BORDER, borderRadius: 8, padding: '7px 10px', fontFamily: MONO, fontSize: 11, color: '#7a776f', outline: 'none', cursor: 'pointer' }}>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="alpha">A–Z</option>
            </select>
            <a href="/session" style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7a776f', textDecoration: 'none', padding: '7px 14px', border: BORDER, borderRadius: 8, background: '#fff' }}>← Session</a>
          </div>
        </div>

        {/* Table */}
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...Array(8)].map((_, i) => <div key={i} style={{ height: 56, borderRadius: 10, background: '#ece9e3', animation: 'pulse 1.4s ease-in-out infinite', animationDelay: i * 0.08 + 's' }} />)}
            </div>
          ) : (
            <div style={{ background: '#fff', border: BORDER, borderRadius: 14, overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 80px 100px 100px 48px', gap: 0, padding: '8px 16px', borderBottom: BORDER, background: '#f5f3ef' }}>
                {['Art', 'Album', 'Artist', 'Year', 'Rating', 'Type', ''].map((h, i) => (
                  <div key={i} style={{ ...labelStyle, padding: '4px 8px' }}>{h}</div>
                ))}
              </div>

              {filtered.length === 0 && (
                <div style={{ padding: '48px 24px', textAlign: 'center', fontFamily: MONO, fontSize: 11, color: '#aaa8a2' }}>No entries found.</div>
              )}

              {filtered.map((entry) => (
                <div key={entry.slug} className="se-row" style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 80px 100px 100px 48px', gap: 0, padding: '10px 16px', borderBottom: BORDER, alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => setEditing(entry)}>
                  <div style={{ padding: '0 8px' }}>
                    {entry.album_art
                      ? <img src={entry.album_art} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', display: 'block' }} />
                      : <div style={{ width: 36, height: 36, borderRadius: 6, background: '#ece9e3' }} />
                    }
                  </div>
                  <div style={{ padding: '0 8px', fontFamily: SANS, fontSize: 13, fontWeight: 500, color: '#1a1916', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.album}</div>
                  <div style={{ padding: '0 8px', fontFamily: MONO, fontSize: 11, color: '#7a776f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.artist}</div>
                  <div style={{ padding: '0 8px', fontFamily: MONO, fontSize: 11, color: '#aaa8a2' }}>{entry.year || '—'}</div>
                  <div style={{ padding: '0 8px', fontFamily: MONO, fontSize: 11, color: '#1a1916' }}>{entry.rating || '—'}</div>
                  <div style={{ padding: '0 8px', fontFamily: MONO, fontSize: 10, color: '#aaa8a2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.entry_type || '—'}</div>
                  <div style={{ padding: '0 8px', display: 'flex', gap: 6 }}>
                    {entry.favorite === true && <span title="Favorite" style={{ fontSize: 12 }}>♥</span>}
                    {entry.masterpiece === true && <span title="Masterpiece" style={{ fontSize: 10, color: '#1a1916', fontFamily: MONO }}>M</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editing && (
        <EditModal
          entry={editing}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

