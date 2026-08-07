'use client';
import { fonts } from '../../../library/sitewide_visuals';
import { tx, bdr, lbl } from '../../../library/session_styles';
import SessionButton from '../SessionButton';
import HorizonChart from '../../main_components/HorizonChart';

// Step 2 — free-text album notes. The rating moved to the Score step so this
// screen is only writing; the horizon sits above it as a reminder of how the
// album actually went, track by track, while the impressions are being written.

export default function AlbumNotes({
  tracks,
  trackRatings,
  overallNotes,
  setOverallNotes,
  onNext,
}) {
  const list = tracks || [];
  const hasRatings = Object.values(trackRatings || {}).some(v => v > 0);

  return (
    <div style={{ width: '100%' }}>

      {list.length > 0 && hasRatings && (
        <div style={{ marginBottom: 26 }}>
          <div style={{ ...lbl, marginBottom: 10 }}>Listening Horizon</div>
          {/* No labels here — this is a glance at the album's shape while
              writing, not the screen where the shape gets studied. */}
          <HorizonChart tracks={list} trackRatings={trackRatings} height={46} color={tx(0.6)} />
        </div>
      )}

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
