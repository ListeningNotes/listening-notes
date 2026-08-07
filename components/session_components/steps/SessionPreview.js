'use client';
import { fonts } from '../../../library/sitewide_visuals';
import { tx, bdr, dk, lbl } from '../../../library/session_styles';
import SessionButton from '../SessionButton';
import HorizonChart from '../../main_components/HorizonChart';
import StarDisplay from '../../main_components/StarRating';

// Step 5 — formatted entry preview with save action.
// Three states: waiting to format / formatting in progress / formatted output ready.

export default function SessionPreview({
  brief,
  albumArt,
  output,
  formatting,
  rating,
  sessionTags,
  saving,
  saved,
  overallNotes,
  tracks,
  trackRatings,
  doFormat,
  doSave,
}) {
  // Not yet formatted
  if (!output && !formatting) {
    return (
      <div style={{ width: '100%' }}>
        <div style={{ textAlign: 'center', paddingTop: 60 }}>
          {albumArt && (
            <img src={albumArt} alt={brief?.album} style={{ width: 88, height: 88, borderRadius: 12, objectFit: 'cover', display: 'block', margin: '0 auto 24px', boxShadow: `0 10px 40px ${bdr(0.2)}` }} />
          )}
          <div style={{ fontFamily: fonts.serif, fontSize: 26, color: tx(0.85), marginBottom: 4, lineHeight: 1.1 }}>{brief?.album}</div>
          <div style={{ fontFamily: fonts.mono, fontSize: 11, color: tx(0.38), marginBottom: 48 }}>{brief?.artist}</div>
          <SessionButton onClick={doFormat} disabled={!overallNotes?.trim()} accent style={{ padding: '14px 44px', fontSize: 13 }}>
            Format My Notes →
          </SessionButton>
        </div>
      </div>
    );
  }

  // Formatting in progress
  if (formatting) {
    return (
      <div style={{ width: '100%' }}>
        <div style={{ textAlign: 'center', paddingTop: 80 }}>
          <div style={{ fontFamily: fonts.mono, fontSize: 11, color: tx(0.35), letterSpacing: '0.1em', marginBottom: 20 }}>Formatting notes…</div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: tx(0.25), animation: `ln-dot 1.4s ease-in-out ${i * 0.22}s infinite` }} />)}
          </div>
        </div>
      </div>
    );
  }

  // Output ready
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${bdr(0.08)}` }}>
        {albumArt && (
          <img src={albumArt} alt={brief?.album} style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover', flexShrink: 0, boxShadow: `0 6px 24px ${bdr(0.2)}` }} />
        )}
        <div>
          <div style={{ fontFamily: fonts.serif, fontSize: 22, color: tx(0.88), lineHeight: 1.05, marginBottom: 4 }}>{brief?.album}</div>
          <div style={{ fontFamily: fonts.mono, fontSize: 11, color: tx(0.38), marginBottom: 10 }}>
            {brief?.artist}{brief?.year ? ' · ' + brief.year : ''}
          </div>
          <StarDisplay rating={rating} size={16} />
        </div>
      </div>

      <div style={{ ...lbl, marginBottom: 12 }}>Album Notes</div>
      <div style={{ fontFamily: fonts.sans, fontSize: 14, lineHeight: 1.9, color: tx(0.88), whiteSpace: 'pre-wrap', marginBottom: 28 }}>{output.album_notes}</div>

      {/* Drawn, not typed. This used to render the ▁▂▃█ block characters as
          text, and the font fell back per-glyph — which is why the bars sat on
          different baselines. As flex children of one flex-end row they can't. */}
      {tracks?.length > 0 && (
        <div style={{ margin: '28px 0 8px' }}>
          <div style={{ ...lbl, marginBottom: 10 }}>Listening Horizon</div>
          <HorizonChart tracks={tracks} trackRatings={trackRatings} height={90} labels animate={false} />
        </div>
      )}

      {output.track_notes && (
        <>
          <div style={{ ...lbl, marginBottom: 12, marginTop: 4 }}>Track Notes</div>
          <div style={{ fontFamily: fonts.sans, fontSize: 14, lineHeight: 1.9, color: tx(0.72), whiteSpace: 'pre-wrap', marginBottom: 28 }}>{output.track_notes}</div>
        </>
      )}

      {sessionTags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 20, borderTop: `1px solid ${bdr(0.07)}`, marginBottom: 32 }}>
          {sessionTags.map((t, i) => (
            <span key={i} style={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: tx(0.7), border: `1px solid ${bdr(0.14)}`, borderRadius: 20, padding: '3px 10px', background: dk(0.42) }}>#{t}</span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 8 }}>
        {!saved ? (
          <SessionButton onClick={doSave} disabled={saving} accent style={{ padding: '12px 40px', fontSize: 12 }}>
            {saving ? 'Saving…' : 'Save to Site →'}
          </SessionButton>
        ) : (
          <>
            <span style={{ fontFamily: fonts.mono, fontSize: 11, color: tx(0.9), letterSpacing: '0.1em' }}>✓ Saved</span>
            <a href="/dashboard" style={{ fontFamily: fonts.mono, fontSize: 11, color: tx(0.35), letterSpacing: '0.08em', textDecoration: 'none' }}>← Back to dashboard</a>
          </>
        )}
      </div>
    </div>
  );
}
