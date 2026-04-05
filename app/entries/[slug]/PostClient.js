'use client';
import { useState } from 'react';
import StarRating from '../../../components/StarRating';

const STAR_VALUES = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
const STAR_LABELS = { 1: '★', 1.5: '★½', 2: '★★', 2.5: '★★½', 3: '★★★', 3.5: '★★★½', 4: '★★★★', 4.5: '★★★★½', 5: '★★★★★' };

const BLOCK_MAP = { '▁': 0.12, '▂': 0.25, '▃': 0.37, '▄': 0.50, '▅': 0.62, '▆': 0.75, '▇': 0.87, '█': 1.00 };
const VALID_BLOCKS = new Set(Object.keys(BLOCK_MAP));

function parseHorizon(horizon) {
  if (!horizon) return [];
  if (horizon.trim().startsWith('[')) {
    try {
      const arr = JSON.parse(horizon);
      if (Array.isArray(arr)) return arr.map(v => parseFloat(v) / 5);
    } catch {}
  }
  return [...horizon.trim()].filter(c => VALID_BLOCKS.has(c)).map(c => BLOCK_MAP[c]);
}

function HorizonBar({ horizon }) {
  const bars = parseHorizon(horizon);
  if (!bars.length) return null;
  return (
    <div style={{ margin: '2rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 56, maxWidth: 400 }}>
        {bars.map((h, i) => (
          <div key={i} style={{ flex: 1, height: h * 100 + '%', background: '#c8d47a', borderRadius: '2px 2px 0 0' }} />
        ))}
      </div>
    </div>
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
    if (password === 'listeningnotes') { setAuthed(true); setEditMode(true); setShowAuthPrompt(false); setAuthError(''); }
    else { setAuthError('wrong password'); }
  }

  function handleEditClick() {
    if (authed) { setEditMode(true); } else { setShowAuthPrompt(true); }
  }

  function handleChange(key, value) {
    setFields(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true); setSaveMsg('');
    try {
      const res = await fetch('/api/entries/' + entry.slug, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, password: 'listeningnotes' }),
      });
      const data = await res.json();
      if (data.entry) { setSaveMsg('saved.'); setEditMode(false); setTimeout(() => setSaveMsg(''), 3000); }
      else { setSaveMsg('error saving'); }
    } catch { setSaveMsg('error saving'); }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    try {
      await fetch('/api/entries/' + entry.slug, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'listeningnotes' }),
      });
      window.location.href = '/';
    } catch { setSaveMsg('error deleting'); }
  }

  return (
    <div style={{ background: '#0e0e0e', minHeight: '100vh', color: '#e8e4dc', fontFamily: 'DM Sans, sans-serif' }}>

      <div style={{ borderBottom: '1px solid #2a2a2a', padding: '1.2rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#0e0e0e', zIndex: 10 }}>
        <a href="/" style={{ color: '#555', fontFamily: 'DM Mono, monospace', fontSize: '11px', letterSpacing: '0.15em', textDecoration: 'none', textTransform: 'uppercase' }}>← listening notes</a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {saveMsg && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#c8d47a' }}>{saveMsg}</span>}
          {editMode ? (
            <>
              <button onClick={handleDelete} style={{ ...ghostBtn, color: '#ff6b6b', borderColor: '#ff6b6b33' }}>{confirmDelete ? 'confirm delete' : 'delete'}</button>
              <button onClick={() => { setEditMode(false); setConfirmDelete(false); }} style={ghostBtn}>cancel</button>
              <button onClick={handleSave} disabled={saving} style={accentBtn}>{saving ? 'saving…' : 'save'}</button>
            </>
          ) : (
            <button onClick={handleEditClick} style={ghostBtn}>edit</button>
          )}
        </div>
      </div>

      {showAuthPrompt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form onSubmit={handleAuth} style={{ background: '#161616', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '280px' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', letterSpacing: '0.1em', color: '#555', textTransform: 'uppercase' }}>password</div>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoFocus
              style={{ background: '#0e0e0e', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#e8e4dc', padding: '0.7rem 1rem', fontFamily: 'DM Mono, monospace', fontSize: '13px', outline: 'none' }} />
            {authError && <div style={{ color: '#c8d47a', fontFamily: 'DM Mono, monospace', fontSize: '11px' }}>{authError}</div>}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" onClick={() => setShowAuthPrompt(false)} style={ghostBtn}>cancel</button>
              <button type="submit" style={accentBtn}>enter</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '4rem 2rem 6rem' }}>

        {editMode ? (
          <div style={{ marginBottom: '2.5rem' }}>
            <Label>album art url</Label>
            <EditInput value={fields.album_art || ''} onChange={v => handleChange('album_art', v)} placeholder="paste image url…" />
            {fields.album_art && <img src={fields.album_art} alt="" style={{ width: '100%', maxWidth: '300px', borderRadius: '8px', marginTop: '1rem', display: 'block' }} />}
          </div>
        ) : fields.album_art ? (
          <div style={{ marginBottom: '3rem' }}>
            <img src={fields.album_art} alt={fields.album} style={{ width: '100%', maxWidth: '340px', display: 'block', borderRadius: '8px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} />
          </div>
        ) : null}

        <div style={{ marginBottom: '2.5rem' }}>
          {editMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <EditInput value={fields.album || ''} onChange={v => handleChange('album', v)} style={{ fontFamily: 'DM Serif Display, serif', fontSize: '2rem' }} />
              <EditInput value={fields.artist || ''} onChange={v => handleChange('artist', v)} />
              <EditInput value={fields.year || ''} onChange={v => handleChange('year', v)} placeholder="year" />
            </div>
          ) : (
            <>
              <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 400, lineHeight: 1.1, marginBottom: '0.5rem', color: '#e8e4dc' }}>{fields.album}</h1>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', letterSpacing: '0.1em', color: '#555', textTransform: 'uppercase' }}>{fields.artist}{fields.year ? ' · ' + fields.year : ''}</div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '3rem', paddingBottom: '2rem', borderBottom: '1px solid #2a2a2a' }}>
          {editMode ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <Label>rating</Label>
                <select value={fields.rating || ''} onChange={e => handleChange('rating', e.target.value)} style={selectStyle}>
                  <option value="">—</option>
                  {STAR_VALUES.map(v => <option key={v} value={v}>{STAR_LABELS[v]}</option>)}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', justifyContent: 'flex-end' }}>
                <Label>favorite</Label>
                <button
                  onClick={() => handleChange('favorite', !fields.favorite)}
                  style={{ ...ghostBtn, color: fields.favorite ? '#E8B84B' : '#555', borderColor: fields.favorite ? '#E8B84B55' : '#2a2a2a', padding: '0.45rem 1rem', fontSize: '13px' }}
                >
                  {fields.favorite ? '★ favorited' : '☆ favorite'}
                </button>
              </div>
            </>
          ) : (
            <>
              {fields.rating && <StarRating rating={fields.rating} size={20} />}
              {fields.relationship && <Chip>{fields.relationship}</Chip>}
              {fields.entry_type && <Chip>{fields.entry_type}</Chip>}
              {(fields.favorite === true || fields.favorite === 'true') && <Chip accent>Favorite</Chip>}
            </>
          )}
        </div>

        {(fields.background || editMode) && (
          <section style={{ marginBottom: '3rem' }}>
            <SectionLabel>background</SectionLabel>
            {editMode
              ? <EditTextarea value={fields.background || ''} onChange={v => handleChange('background', v)} rows={8} />
              : <div style={{ lineHeight: 1.8, color: '#a8a49c', fontSize: '0.95rem' }}>{fields.background}</div>
            }
          </section>
        )}

        {(fields.horizon || editMode) && (
          <section style={{ marginBottom: '3rem' }}>
            {editMode ? (
              <>
                <SectionLabel>horizon</SectionLabel>
                <EditInput value={fields.horizon || ''} onChange={v => handleChange('horizon', v)} placeholder="▁▂▃▆▇ or JSON array [4,3.5,5,4]" style={{ fontFamily: 'monospace' }} />
              </>
            ) : (
              <HorizonBar horizon={fields.horizon} />
            )}
          </section>
        )}

        {(fields.notes || editMode) && (
          <section style={{ marginBottom: '3rem' }}>
            <SectionLabel>notes</SectionLabel>
            {editMode
              ? <EditTextarea value={fields.notes || ''} onChange={v => handleChange('notes', v)} rows={10} />
              : <div style={{ lineHeight: 1.9, fontSize: '1.05rem', whiteSpace: 'pre-wrap' }}>{fields.notes}</div>
            }
          </section>
        )}

        {(tags.length > 0 || editMode) && (
          <section style={{ marginBottom: '3rem' }}>
            {editMode ? (
              <>
                <SectionLabel>tags (comma separated)</SectionLabel>
                <EditInput value={Array.isArray(fields.tags) ? fields.tags.join(', ') : (fields.tags || '')} onChange={v => handleChange('tags', v)} placeholder="jazz, 1970s, experimental…" />
              </>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {tags.map((tag, i) => (
                  <span key={i} style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#555', border: '1px solid #2a2a2a', borderRadius: '4px', padding: '0.3rem 0.6rem' }}>{tag}</span>
                ))}
              </div>
            )}
          </section>
        )}

        <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: '3rem', marginTop: '1rem' }}>
          <div id="comments" style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#444', marginBottom: '2rem' }}>Comments</div>
          <div style={{ color: '#333', fontFamily: 'DM Mono, monospace', fontSize: '11px' }}>— coming soon</div>
        </div>

      </div>
    </div>
  );
}

function Label({ children }) {
  return <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: '0.4rem' }}>{children}</div>;
}
function SectionLabel({ children }) {
  return <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#555', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid #2a2a2a' }}>{children}</div>;
}
function Chip({ children, accent }) {
  return <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', letterSpacing: '0.08em', border: '1px solid ' + (accent ? '#c8d47a44' : '#2a2a2a'), color: accent ? '#c8d47a' : '#a8a49c', borderRadius: '4px', padding: '0.3rem 0.7rem' }}>{children}</span>;
}
function EditInput({ value, onChange, placeholder, style = {} }) {
  return <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ background: '#161616', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#e8e4dc', padding: '0.6rem 0.8rem', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', outline: 'none', width: '100%', ...style }} />;
}
function EditTextarea({ value, onChange, rows = 6 }) {
  return <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} style={{ background: '#161616', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#e8e4dc', padding: '0.8rem', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', outline: 'none', width: '100%', resize: 'vertical', lineHeight: 1.7 }} />;
}

const ghostBtn = { fontFamily: 'DM Mono, monospace', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555', background: 'none', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer' };
const accentBtn = { fontFamily: 'DM Mono, monospace', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0e0e0e', background: '#c8d47a', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer' };
const selectStyle = { background: '#161616', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#e8e4dc', padding: '0.5rem 0.8rem', fontFamily: 'DM Mono, monospace', fontSize: '12px', outline: 'none' };
