'use client';
import { fonts } from '../../../library/sitewide_visuals';
import { tx, bdr, lbl } from '../../../library/session_styles';
import SessionButton from '../SessionButton';
import StarRating from '../StarRating';

// Step 2 — overall star rating, Masterpiece/Favorite flags, and free-text album notes.

export default function AlbumNotes({
  rating,
  setRating,
  Masterpiece,
  setMasterpiece,
  Favorite,
  setFavorite,
  overallNotes,
  setOverallNotes,
  onNext,
}) {
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
        <StarRating value={rating} onChange={setRating} size={24} />
        <div style={{ width: 1, height: 20, background: bdr(0.1), flexShrink: 0 }} />
        {[['Masterpiece', Masterpiece, setMasterpiece], ['Favorite', Favorite, setFavorite]].map(([name, val, fn]) => (
          <label key={name} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={val}
              onChange={e => fn(e.target.checked)}
              style={{ accentColor: '#f0ede8', cursor: 'pointer', width: 15, height: 15 }}
            />
            <span style={{
              fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: val ? tx(0.95) : tx(0.35), transition: 'color 0.15s',
            }}>{name}</span>
          </label>
        ))}
      </div>

      <div style={{ borderTop: `1px solid ${bdr(0.07)}`, paddingTop: 20, marginBottom: 16 }}>
        <div style={{ ...lbl, marginBottom: 14 }}>Album Notes</div>
        <textarea
          ref={el => {
            // Size on mount too, so returning to this step doesn't clip long notes.
            if (!el) return;
            el.style.height = 'auto';
            el.style.height = el.scrollHeight + 'px';
          }}
          value={overallNotes}
          onChange={e => {
            setOverallNotes(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          placeholder="How does this album feel as a whole? Themes, impressions, context..."
          style={{
            fontFamily: fonts.mono, fontSize: 14, lineHeight: 2, color: tx(0.82),
            background: 'transparent', border: 'none', outline: 'none',
            resize: 'none', width: '100%', minHeight: 200, overflow: 'hidden',
            display: 'block', boxSizing: 'border-box',
          }}
        />
        <div style={{ ...lbl, marginTop: 8, textAlign: 'right' }}>{overallNotes.length} chars</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
        <SessionButton onClick={onNext} disabled={overallNotes.trim().length < 10} accent>Continue →</SessionButton>
      </div>
    </div>
  );
}
