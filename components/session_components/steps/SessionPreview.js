'use client';
import { fonts } from '../../../library/sitewide_visuals';
import { tx, bdr, lbl } from '../../../library/session_styles';
import SessionButton from '../SessionButton';

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
          <div style={{ display: 'flex', gap: 3 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <span key={i} style={{ fontSize: 14, color: i <= Math.floor(rating) ? '#c8960a' : tx(0.15) }}>★</span>
            ))}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 1.8, color: tx(0.55), maxWidth: 380 }}>
          {output.background}
        </div>
      </div>

      <div style={{ ...lbl, marginBottom: 12 }}>Album Notes</div>
      <div style={{ fontFamily: fonts.sans, fontSize: 14, lineHeight: 1.9, color: tx(0.88), whiteSpace: 'pre-wrap', marginBottom: 28 }}>{output.album_notes}</div>

      {output.horizon && (
        <div style={{ textAlign: 'center', fontFamily: fonts.mono, fontSize: 18, letterSpacing: '0.06em', color: tx(0.18), margin: '24px 0' }}>{output.horizon}</div>
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
            <span key={i} style={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: tx(0.38), border: `1px solid ${bdr(0.1)}`, borderRadius: 20, padding: '3px 10px', background: 'rgba(255,255,255,0.4)' }}>#{t}</span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16 }}>
        {!saved ? (
          <SessionButton onClick={doSave} disabled={saving} accent style={{ padding: '12px 40px', fontSize: 12 }}>
            {saving ? 'Saving…' : 'Save to Site →'}
          </SessionButton>
        ) : (
          <>
            <span style={{ fontFamily: fonts.mono, fontSize: 11, color: '#6a7a18', letterSpacing: '0.1em' }}>✓ Saved</span>
            <a href="/dashboard" style={{ fontFamily: fonts.mono, fontSize: 11, color: tx(0.35), letterSpacing: '0.08em', textDecoration: 'none' }}>← Back to dashboard</a>
          </>
        )}
      </div>
    </div>
  );
}
