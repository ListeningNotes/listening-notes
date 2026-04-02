'use client';
import { useState } from 'react';

const STAR_LABELS = { 1: '★', 1.5: '★½', 2: '★★', 2.5: '★★½', 3: '★★★', 3.5: '★★★½', 4: '★★★★', 4.5: '★★★★½', 5: '★★★★★' };

function HorizonBar({ horizon }) {
  if (!horizon) return null;
  const chars = [...horizon.trim()];
  const validChars = ['▁','▂','▃','▄','▅','▆','▇','█',' '];
  if (!chars.some(c => validChars.includes(c))) return null;

  return (
    <div style={{ margin: '2rem 0', textAlign: 'center' }}>
      <div style={{ fontFamily: 'monospace', fontSize: '1.4rem', letterSpacing: '2px', color: '#c8d47a', lineHeight: 1 }}>
        {horizon}
      </div>
    </div>
  );
}

function Stars({ rating }) {
  if (!rating) return null;
  return (
    <span style={{ color: '#c8d47a', letterSpacing: '1px' }}>
      {STAR_LABELS[parseFloat(rating)] || rating}
    </span>
  );
}

export default function PostClient({ entry }) {
  const [editMode, setEditMode] = useState(false);
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState('');
  const [fields, setFields] = useState({ ...entry });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const tags = fields.tags
    ? (Array.isArray(fields.tags) ? fields.tags : fields.tags.split(',').map(t => t.trim()).filter(Boolean))
    : [];

  function handleAuth(e) {
    e.preventDefault();
    if (password === 'listeningnotes') {
      setAuthed(true);
      setEditMode(true);
      setShowAuthPrompt(false);
      setAuthError('');
    } else {
      setAuthError('wrong password');
    }
  }

  function handleEditClick() {
    if (authed) {
      setEditMode(true);
    } else {
      setShowAuthPrompt(true);
    }
  }

  function handleChange(key, value) {
    setFields(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch(`/api/entries/${entry.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, password: 'listeningnotes' }),
      });
      const data = await res.json();
      if (data.entry) {
        setSaveMsg('saved.');
        setEditMode(false);
        setTimeout(() => setSaveMsg(''), 3000);
      } else {
        setSaveMsg('error saving');
      }
    } catch {
      setSaveMsg('error saving');
    }
    setSaving(false);
  }
  async function handleDelete() {
  if (!confirmDelete) {
    setConfirmDelete(true);
    return;
  }
  try {
    await fetch(`/api/entries/${entry.slug}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'listeningnotes' }),
    });
    window.location.href = '/';
  } catch {
    setSaveMsg('error deleting');
  }
}

  return (
    <div style={{
      background: '#0e0e0e',
      minHeight: '100vh',
      color: '#e8e4dc',
      fontFamily: 'DM Sans, sans-serif',
    }}>

      {/* Header bar */}
      <div style={{
        borderBottom: '1px solid #2a2a2a',
        padding: '1.2rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        background: '#0e0e0e',
        zIndex: 10,
      }}>
        <a href="/" style={{ color: '#555', fontFamily: 'DM Mono, monospace', fontSize: '11px', letterSpacing: '0.15em', textDecoration: 'none', textTransform: 'uppercase' }}>
          ← listening notes
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {saveMsg && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#c8d47a' }}>{saveMsg}</span>}
          {editMode ? (
  <>
    <button onClick={handleDelete} style={{ ...ghostBtn, color: '#ff6b6b', borderColor: '#ff6b6b33' }}>
      {confirmDelete ? 'confirm delete' : 'delete'}
    </button>
    <button onClick={() => { setEditMode(false); setConfirmDelete(false); }} style={ghostBtn}>cancel</button>
    <button onClick={handleSave} disabled={saving} style={accentBtn}>
      {saving ? 'saving…' : 'save'}
    </button>
  </>
          ) : (
            <button onClick={handleEditClick} style={ghostBtn}>edit</button>
          )}
        </div>
      </div>

      {/* Auth prompt */}
      {showAuthPrompt && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}>
          <form onSubmit={handleAuth} style={{
            background: '#161616', border: '1px solid #2a2a2a', borderRadius: '12px',
            padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '280px',
          }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', letterSpacing: '0.1em', color: '#555', textTransform: 'uppercase' }}>password</div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              style={{
                background: '#0e0e0e', border: '1px solid #2a2a2a', borderRadius: '6px',
                color: '#e8e4dc', padding: '0.7rem 1rem', fontFamily: 'DM Mono, monospace',
                fontSize: '13px', outline: 'none',
              }}
            />
            {authError && <div style={{ color: '#c8d47a', fontFamily: 'DM Mono, monospace', fontSize: '11px' }}>{authError}</div>}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" onClick={() => setShowAuthPrompt(false)} style={ghostBtn}>cancel</button>
              <button type="submit" style={accentBtn}>enter</button>
            </div>
          </form>
        </div>
      )}

      {/* Main layout */}
      <div style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '4rem 2rem 6rem',
      }}>

        {/* Album art */}
        {editMode ? (
          <div style={{ marginBottom: '2.5rem' }}>
            <Label>album art url</Label>
            <EditInput value={fields.album_art || ''} onChange={v => handleChange('album_art', v)} placeholder="paste image url…" />
            {fields.album_art && (
              <img src={fields.album_art} alt="" style={{ width: '100%', maxWidth: '300px', borderRadius: '8px', marginTop: '1rem', display: 'block' }} />
            )}
          </div>
        ) : fields.album_art ? (
          <div style={{ marginBottom: '3rem' }}>
            <img
              src={fields.album_art}
              alt={fields.album}
              style={{
                width: '100%',
                maxWidth: '340px',
                display: 'block',
                borderRadius: '8px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}
            />
          </div>
        ) : null}

        {/* Title block */}
        <div style={{ marginBottom: '2.5rem' }}>
          {editMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <EditInput value={fields.album || ''} onChange={v => handleChange('album', v)} style={{ fontFamily: 'DM Serif Display, serif', fontSize: '2rem' }} />
              <EditInput value={fields.artist || ''} onChange={v => handleChange('artist', v)} />
              <EditInput value={fields.year || ''} onChange={v => handleChange('year', v)} placeholder="year" />
            </div>
          ) : (
            <>
              <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 400, lineHeight: 1.1, marginBottom: '0.5rem', color: '#e8e4dc' }}>
                {fields.album}
              </h1>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', letterSpacing: '0.1em', color: '#555', textTransform: 'uppercase' }}>
                {fields.artist}{fields.year ? ` · ${fields.year}` : ''}
              </div>
            </>
          )}
        </div>

        {/* Metadata row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '3rem', paddingBottom: '2rem', borderBottom: '1px solid #2a2a2a' }}>
          {editMode ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <Label>rating</Label>
                <select value={fields.rating || ''} onChange={e => handleChange('rating', e.target.value)} style={selectStyle}>
                  <option value="">—</option>
                  {[1,1.5,2,2.5,3,3.5,4,4.5,5].map(v => <option key={v} value={v}>{STAR_LABELS[v]}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <Label>relationship</Label>
                <select value={fields.relationship || ''} onChange={e => handleChange('relationship', e.target.value)} style={selectStyle}>
                  {['First Listen','Revisit','Formative','Study','Submission'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <Label>entry type</Label>
                <select value={fields.entry_type || ''} onChange={e => handleChange('entry_type', e.target.value)} style={selectStyle}>
                  {['Personal Library','Submission'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </>
          ) : (
            <>
              {fields.rating && (
                <Chip><Stars rating={fields.rating} /></Chip>
              )}
              {fields.relationship && <Chip>{fields.relationship}</Chip>}
              {fields.entry_type && <Chip>{fields.entry_type}</Chip>}
              {fields.favorite === true || fields.favorite === 'true' ? <Chip accent>Favorite</Chip> : null}
            </>
          )}
        </div>

        {/* Background / research */}
        {(fields.background || editMode) && (
          <section style={{ marginBottom: '3rem' }}>
            <SectionLabel>background</SectionLabel>
            {editMode ? (
              <EditTextarea value={fields.background || ''} onChange={v => handleChange('background', v)} rows={8} />
            ) : (
              <div style={{ lineHeight: 1.8, color: '#a8a49c', fontSize: '0.95rem' }}>
                {fields.background}
              </div>
            )}
          </section>
        )}

        {/* Horizon bar */}
        {(fields.horizon || editMode) && (
          <section style={{ marginBottom: '3rem' }}>
            {editMode ? (
              <>
                <SectionLabel>horizon</SectionLabel>
                <EditInput value={fields.horizon || ''} onChange={v => handleChange('horizon', v)} placeholder="▁▂▃▆▇ bar characters…" style={{ fontFamily: 'monospace' }} />
              </>
            ) : (
              <HorizonBar horizon={fields.horizon} />
            )}
          </section>
        )}

        {/* Notes / writing */}
        {(fields.notes || editMode) && (
          <section style={{ marginBottom: '3rem' }}>
            <SectionLabel>notes</SectionLabel>
            {editMode ? (
              <EditTextarea value={fields.notes || ''} onChange={v => handleChange('notes', v)} rows={10} />
            ) : (
              <div style={{ lineHeight: 1.9, fontSize: '1.05rem', whiteSpace: 'pre-wrap' }}>
                {fields.notes}
              </div>
            )}
          </section>
        )}

        {/* Tags */}
        {(tags.length > 0 || editMode) && (
          <section style={{ marginBottom: '3rem' }}>
            {editMode ? (
              <>
                <SectionLabel>tags (comma separated)</SectionLabel>
                <EditInput
                  value={Array.isArray(fields.tags) ? fields.tags.join(', ') : (fields.tags || '')}
                  onChange={v => handleChange('tags', v)}
                  placeholder="jazz, 1970s, experimental…"
                />
              </>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {tags.map((tag, i) => (
                  <span key={i} style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: '10px',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#555',
                    border: '1px solid #2a2a2a',
                    borderRadius: '4px',
                    padding: '0.3rem 0.6rem',
                  }}>{tag}</span>
                ))}
              </div>
            )}
          </section>
        )}


      </div>
    </div>
  );
}

// --- Small reusable style components ---

function Label({ children }) {
  return <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: '0.4rem' }}>{children}</div>;
}

function SectionLabel({ children }) {
  return <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#555', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid #2a2a2a' }}>{children}</div>;
}

function Chip({ children, accent }) {
  return (
    <span style={{
      fontFamily: 'DM Mono, monospace', fontSize: '11px', letterSpacing: '0.08em',
      border: `1px solid ${accent ? '#c8d47a44' : '#2a2a2a'}`,
      color: accent ? '#c8d47a' : '#a8a49c',
      borderRadius: '4px', padding: '0.3rem 0.7rem',
    }}>{children}</span>
  );
}

function EditInput({ value, onChange, placeholder, style = {} }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        background: '#161616', border: '1px solid #2a2a2a', borderRadius: '6px',
        color: '#e8e4dc', padding: '0.6rem 0.8rem', fontFamily: 'DM Sans, sans-serif',
        fontSize: '14px', outline: 'none', width: '100%', ...style,
      }}
    />
  );
}

function EditTextarea({ value, onChange, rows = 6 }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={rows}
      style={{
        background: '#161616', border: '1px solid #2a2a2a', borderRadius: '6px',
        color: '#e8e4dc', padding: '0.8rem', fontFamily: 'DM Sans, sans-serif',
        fontSize: '14px', outline: 'none', width: '100%', resize: 'vertical', lineHeight: 1.7,
      }}
    />
  );
}

const ghostBtn = {
  fontFamily: 'DM Mono, monospace', fontSize: '11px', letterSpacing: '0.1em',
  textTransform: 'uppercase', color: '#555', background: 'none',
  border: '1px solid #2a2a2a', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer',
};

const accentBtn = {
  fontFamily: 'DM Mono, monospace', fontSize: '11px', letterSpacing: '0.1em',
  textTransform: 'uppercase', color: '#0e0e0e', background: '#c8d47a',
  border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer',
};

const selectStyle = {
  background: '#161616', border: '1px solid #2a2a2a', borderRadius: '6px',
  color: '#e8e4dc', padding: '0.5rem 0.8rem', fontFamily: 'DM Mono, monospace',
  fontSize: '12px', outline: 'none',
};