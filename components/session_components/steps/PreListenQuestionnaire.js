'use client';
import { fonts } from '../../../library/sitewide_visuals';

// Two sequential questions shown after an album is picked, before research fires.
// Q1 — relationship: First listen / Revisit / Formative / Study
// Q2 — source: Personal collection / Submission
//
// Props:
//   pendingAlbum   { album, artist, year, artUrl }
//   confirmPhase   'q1' | 'q2'
//   onPhaseChange  (phase) => void  — move between q1 ↔ q2 or back to grid (null)
//   onConfirm      (pendingAlbum) => void  — Q2 answered, fire research
//   setRelationship / setEntryType — write back into the session hook before confirm

export default function PreListenQuestionnaire({
  pendingAlbum,
  confirmPhase,
  onPhaseChange,
  onConfirm,
  setRelationship,
  setEntryType,
}) {
  const art = pendingAlbum?.artUrl;
  const label = pendingAlbum
    ? `${pendingAlbum.album}${pendingAlbum.year ? ` · ${pendingAlbum.year}` : ''}`
    : '';

  const sharedOverlay = {
    position: 'fixed', inset: 0, zIndex: 6,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'flex-start',
    paddingTop: 'calc(50vh - 110px)',
  };

  const optionBtn = {
    fontFamily: fonts.sans, fontWeight: 600, fontSize: 14, color: '#1a1520',
    background: 'rgba(245,242,236,0.72)', border: '1px solid rgba(26,21,32,0.18)',
    borderRadius: 32, padding: '11px 22px', cursor: 'pointer',
    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    transition: 'all 0.15s',
  };

  const backBtn = {
    marginTop: 32,
    fontFamily: fonts.mono, fontWeight: 600, fontSize: 10,
    letterSpacing: '0.1em', textTransform: 'uppercase',
    color: 'rgba(26,21,32,0.5)',
    background: 'rgba(245,242,236,0.6)', backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(26,21,32,0.12)',
    borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
  };

  function ArtAndLabel() {
    return (
      <>
        {art && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <img
              src={art}
              alt={pendingAlbum.album}
              style={{
                width: 220, height: 220, borderRadius: 16, objectFit: 'cover',
                animation: 'confirm-glow 2.4s ease-in-out infinite',
              }}
            />
          </div>
        )}
        <div style={{
          fontFamily: fonts.mono, fontWeight: 400, fontSize: 12,
          color: 'rgba(26,21,32,0.45)', letterSpacing: '0.06em', marginBottom: 8,
        }}>
          {label}
        </div>
      </>
    );
  }

  // ── Q1 — relationship ────────────────────────────────────────────────────
  if (confirmPhase === 'q1') {
    return (
      <div style={sharedOverlay}>
        <div style={{ textAlign: 'center' }}>
          <ArtAndLabel />
          <div style={{
            fontFamily: fonts.sans, fontWeight: 700, fontSize: 22,
            color: '#1a1520', marginBottom: 32, lineHeight: 1.3,
          }}>
            What's your relationship with this album?
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            {['First listen', 'Revisit', 'Formative', 'Study'].map(opt => (
              <button
                key={opt}
                onClick={() => { setRelationship(opt); onPhaseChange('q2'); }}
                style={optionBtn}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,242,236,0.95)'; e.currentTarget.style.borderColor = 'rgba(26,21,32,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,242,236,0.72)'; e.currentTarget.style.borderColor = 'rgba(26,21,32,0.18)'; }}
              >
                {opt}
              </button>
            ))}
          </div>
          <button onClick={() => onPhaseChange(null)} style={backBtn}>← back</button>
        </div>
      </div>
    );
  }

  // ── Q2 — source ──────────────────────────────────────────────────────────
  if (confirmPhase === 'q2') {
    return (
      <div style={sharedOverlay}>
        <div style={{ textAlign: 'center' }}>
          <ArtAndLabel />
          <div style={{
            fontFamily: fonts.sans, fontWeight: 700, fontSize: 22,
            color: '#1a1520', marginBottom: 32, lineHeight: 1.3,
          }}>
            Where's it from?
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            {['Personal collection', 'Submission'].map(opt => (
              <button
                key={opt}
                onClick={() => { setEntryType(opt); onConfirm(pendingAlbum); }}
                style={optionBtn}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,242,236,0.95)'; e.currentTarget.style.borderColor = 'rgba(26,21,32,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,242,236,0.72)'; e.currentTarget.style.borderColor = 'rgba(26,21,32,0.18)'; }}
              >
                {opt}
              </button>
            ))}
          </div>
          <button onClick={() => onPhaseChange('q1')} style={backBtn}>← back</button>
        </div>
      </div>
    );
  }

  return null;
}
