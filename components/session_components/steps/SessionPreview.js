// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { Heart, SketchLogo } from '@phosphor-icons/react';
import { fonts, colors } from '../../../library/sitewide_visuals';
import { tx, bdr, dk, lbl } from '../../../library/session_styles';
import { entryTypeLabel } from '../../../library/entry_formatter';
import SessionButton from '../SessionButton';
import HorizonChart from '../../main_components/HorizonChart';
import StarDisplay from '../../main_components/StarRating';

// Step 5 — formatted entry preview with save action.
// Three states: waiting to format / formatting in progress / formatted output ready.

// The two ways on from a finished entry. Accent is the post — that's the thing
// that was just made; the entries tab is where it gets corrected.
const savedLink = (accent) => ({
  fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.08em',
  textTransform: 'uppercase', textDecoration: 'none',
  color: accent ? tx(0.96) : tx(0.7),
  background: accent ? dk(0.58) : dk(0.42),
  border: `1px solid ${accent ? bdr(0.5) : bdr(0.16)}`,
  borderRadius: 50, padding: '10px 22px',
  boxShadow: accent ? `0 0 16px 2px rgba(255,255,255,0.3), 0 4px 14px ${dk(0.4)}` : `0 2px 8px ${dk(0.28)}`,
});

export default function SessionPreview({
  brief,
  albumArt,
  output,
  formatting,
  rating,
  Masterpiece,
  Favorite,
  entryType,
  relationship,
  saving,
  saved,
  savedEntry,
  overallNotes,
  tracks,
  trackRatings,
  trackFavorites,
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

          {/* Everything else about to be written to the row. These were all
              invisible until the entry existed, which is a bad time to find
              out the type is wrong or the mark didn't take. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
            {[relationship, entryTypeLabel(entryType)].filter(Boolean).map(t => (
              <span key={t} style={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: tx(0.45), border: `1px solid ${bdr(0.14)}`, borderRadius: 4, padding: '3px 8px' }}>{t}</span>
            ))}
            {Masterpiece && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: tx(0.7) }}>
                <SketchLogo size={13} weight="fill" color={colors.mp} />Masterpiece
              </span>
            )}
            {Favorite && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: tx(0.7) }}>
                <Heart size={13} weight="fill" color={colors.fav} />Favorite
              </span>
            )}
          </div>
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
          <HorizonChart tracks={tracks} trackRatings={trackRatings} favorites={trackFavorites} height={90} labels animate={false} />
        </div>
      )}

      {output.track_notes && (
        <>
          <div style={{ ...lbl, marginBottom: 12, marginTop: 4 }}>Track Notes</div>
          <div style={{ fontFamily: fonts.sans, fontSize: 14, lineHeight: 1.9, color: tx(0.72), whiteSpace: 'pre-wrap', marginBottom: 28 }}>{output.track_notes}</div>
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 8 }}>
        {!saved ? (
          <SessionButton onClick={doSave} disabled={saving} accent style={{ padding: '12px 40px', fontSize: 12 }}>
            {saving ? 'Saving…' : 'Save to Site →'}
          </SessionButton>
        ) : (
          // Saying "saved" and leaving you on the dashboard meant finding the
          // entry again by hand to check it. These go straight to the two
          // places you'd actually want: the post, and the row behind it.
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <span style={{ fontFamily: fonts.mono, fontSize: 11, color: tx(0.9), letterSpacing: '0.1em' }}>✓ Saved</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              {savedEntry?.slug && (
                <a href={`/entries/${savedEntry.slug}`} target="_blank" rel="noreferrer" style={savedLink(true)}>View the post →</a>
              )}
              <a href="/dashboard/entries" style={savedLink(false)}>Edit in entries</a>
            </div>
            <a href="/dashboard" style={{ fontFamily: fonts.mono, fontSize: 10, color: tx(0.32), letterSpacing: '0.08em', textDecoration: 'none' }}>← Back to dashboard</a>
          </div>
        )}
      </div>
    </div>
  );
}
