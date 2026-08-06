'use client';
import { fonts } from '../../../library/sitewide_visuals';
import { tx, bdr, dk, lbl } from '../../../library/session_styles';
import SessionButton from '../SessionButton';

// Step 4 — add, remove, and review tags before moving to preview.
// Shows a loading indicator while the format API call is still in flight.

export default function TagsEditor({
  sessionTags,
  setSessionTags,
  tagInput,
  setTagInput,
  formatting,
  onNext,
}) {
  function addTag(raw) {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, '-');
    if (!tag || sessionTags.includes(tag)) return;
    setSessionTags(prev => [...prev, tag]);
    setTagInput('');
  }

  function removeTag(tag) {
    setSessionTags(prev => prev.filter(t => t !== tag));
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{ ...lbl, marginBottom: 16 }}>Tags</div>

      {formatting && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {[0, 1, 2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: tx(0.25), animation: `ln-dot 1.4s ease-in-out ${i * 0.22}s infinite` }} />)}
        </div>
      )}

      {sessionTags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {sessionTags.map((tag, i) => (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: tx(0.78), border: `1px solid ${bdr(0.14)}`, borderRadius: 20,
              padding: '5px 12px', background: dk(0.42),
            }}>
              #{tag}
              <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tx(0.5), fontSize: 11, padding: 0, lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 36 }}>
        <input
          value={tagInput}
          onChange={e => setTagInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addTag(tagInput); }}
          placeholder="Add a tag..."
          style={{ flex: 1, background: dk(0.45), border: `1px solid ${bdr(0.16)}`, borderRadius: 20, padding: '9px 18px', fontFamily: fonts.mono, fontSize: 11, color: tx(0.9), outline: 'none' }}
        />
        <SessionButton onClick={() => addTag(tagInput)} disabled={!tagInput.trim()}>Add</SessionButton>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <SessionButton onClick={onNext} accent>Preview →</SessionButton>
      </div>
    </div>
  );
}
