// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useState } from 'react';
import HorizonChart from '../../main_components/HorizonChart';
import TrackRow from '../TrackRow';

// The tracks: the label, the horizon, then every track as a row. The lower
// half of the session, under the record and its note — the entry page's own
// order, so the session is the page being filled in rather than a form that
// produces one (Miyel's brief, *the session becomes one screen*, 2026-09-29).
//
// ── The horizon builds here ───────────────────────────────────────────────
// The same bars the entry draws, the same heart above a favourite, in the
// same slot: under the Tracks label and above the rows. No titles under the
// bars, because every track is named in the list eight pixels below; on the
// entry the titles stay, since there only the tracks with notes get rows.
//
// ── What went, and why ────────────────────────────────────────────────────
// One track per screen, with the carets and the swipe between tracks, and
// the strip that stood over it as the way to move along the record. That
// layout was right for a list with an open text field in every row, which
// this is not: a row here is stars and a heart, and its note is a sheet
// (TrackRow.js, NoteSheet.js). The reversal is in DECISIONS, The session.
export default function TrackNotes({
  tracks,
  tracksLoading,
  trackNotes,
  trackRatings,
  setTrackRatings,
  trackFavorites,
  setTrackFavorites,
  onAir = null,
  putOnAir,
  onOpenNote,
  onLookAgain,
  onHandTracks,
}) {
  const list = tracks || [];

  // Typed in by hand, when there is no tracklist to be found. One title a
  // line, which is how anybody would write one out.
  const [typed, setTyped] = useState('');

  if (tracksLoading && !tracks) {
    return (
      <section className="ses-tracks" aria-busy="true">
        <span className="ses-label">Tracks</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }} aria-hidden="true">
          {[...Array(6)].map((_, k) => (
            <div key={k} className="ses-skel" style={{ animationDelay: `${k * 0.06}s` }} />
          ))}
        </div>
      </section>
    );
  }

  // ── When there is no tracklist ──────────────────────────────────────────
  // Two ways out, and neither is giving up on the record: ask again, or
  // write it out yourself. A listen with no tracklist is still a listen —
  // the record's stars and note stand above this either way.
  if (!list.length) {
    return (
      <section className="ses-tracks">
        <span className="ses-label">Tracks</span>
        <p className="ses-prose" style={{ color: 'var(--ink-soft)', marginTop: 14 }}>
          No tracklist found for this record.
        </p>
        <label className="ses-field" style={{ marginTop: 22 }}>
          <span className="ses-label">Type them in</span>
          <textarea
            className="ses-input ses-textarea"
            value={typed}
            onChange={e => setTyped(e.target.value)}
            placeholder={'One title a line'}
            rows={6}
          />
        </label>
        <div className="ses-actions ses-actions--center" style={{ marginTop: 18, flexDirection: 'column', gap: 16 }}>
          {typed.trim() && (
            <button type="button" className="ses-quiet ses-quiet--lead" onClick={() => onHandTracks?.(typed)}>
              Use these →
            </button>
          )}
          <button type="button" className="ses-quiet" onClick={onLookAgain}>Look again</button>
        </div>
      </section>
    );
  }

  // Where a disc changes. Only where a record has more than one; a
  // single-disc record never sees the word, because `disc` is only set past
  // one.
  const discBreak = list.map((t, k) => Boolean(t.disc) && t.disc !== list[k - 1]?.disc);

  return (
    <section className="ses-tracks">
      <span className="ses-label">Tracks</span>
      <div className="ses-horizon">
        <HorizonChart
          tracks={list} trackRatings={trackRatings} favorites={trackFavorites}
          height={56} color="var(--ink-soft)" emptyColor="var(--border)"
        />
      </div>
      <ol className="ses-rows">
        {list.map((t, k) => (
          <TrackRowWithDisc key={k} disc={discBreak[k] ? t.disc : null}>
            <TrackRow
              number={t.number || k + 1}
              title={t.title}
              rating={trackRatings[k] || 0}
              favorite={!!trackFavorites?.[k]}
              note={trackNotes[k] || ''}
              onAir={onAir === k}
              onPress={() => putOnAir?.(onAir === k ? null : k)}
              onRate={v => setTrackRatings(prev => ({ ...prev, [k]: v }))}
              onFavorite={() => setTrackFavorites(prev => ({ ...prev, [k]: !prev[k] }))}
              onNote={() => onOpenNote(k)}
            />
          </TrackRowWithDisc>
        ))}
      </ol>
    </section>
  );
}

function TrackRowWithDisc({ disc, children }) {
  if (!disc) return children;
  return (
    <>
      <li className="ses-label ses-rows-disc">Disc {disc}</li>
      {children}
    </>
  );
}
