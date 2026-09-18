// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { entryTypeLabel } from '../../../library/entry_formatter';

// Step 0 — the record, and the way in. The cover, large and centred, because
// the art is the beauty here and needs no help; under it the title, the
// artist, what kind of listen this is, and the way on. The cover is also
// where the picked tile lands: the page measures it and flies the tapped
// cover onto it.
//
// ── Research came out, 2026-09-18 ─────────────────────────────────────────
// A web-searched briefing lived on this screen — cited prose, numbered
// sources, typing itself in a section at a time. It was the one thing in a
// listen that spent money per press and needed a key before it worked, and
// Miyel's call was that it is not something she could not do on her phone
// beside the record. The prompt, which was the work, is in
// docs/RETIRED-PROMPTS.md with the reason.
//
// What went with it: the typing reveal, the citation numbering, the sources
// list, and the line explaining that research was off on a copy with no key —
// which is now a sentence about nothing.
//
// This screen is being redesigned anyway (Miyel is briefing it), so what is
// left here is deliberately the plain thing: a cover, a name, what kind of
// listen it is, and the way in.

export default function AlbumScreen({
  album, artist, year, genre, entryType, receivedFrom, albumArt,
  resuming, coverRef, coverHidden,
  onNext,
}) {
  // "Start" the first time, "Resume" when you have been in and come back — a
  // draft picked up, or the album screen revisited mid-listen.
  const go = resuming ? 'Resume session →' : 'Start session →';

  return (
    <div className="ses-album">
      {/* The slot the picked cover lands in. Hidden for the half second the
          landing image is travelling towards it, so there is one cover on
          screen and not two. */}
      <div className="ses-album-art" ref={coverRef} style={{ opacity: coverHidden ? 0 : 1 }}>
        {albumArt && <img src={albumArt} alt="" />}
      </div>

      <h1 className="ses-title">{album}</h1>
      <div className="ses-byline">
        {artist}{year ? ` · ${year}` : ''}
      </div>

      {/* Everything about to be written to the row that isn't the writing
          itself. The type is decided by how the listen started — the inbox
          says Submission, anything else is the library — and the entry is
          where it gets corrected if that is wrong. */}
      <div className="ses-actions ses-actions--center" style={{ gap: 6 }}>
        <span className="ses-chip">{entryTypeLabel(entryType || 'Personal Library')}</span>
        {genre && <span className="ses-chip">{genre}</span>}
        {receivedFrom && <span className="ses-chip">from {receivedFrom}</span>}
      </div>

      {/* Quiet links, the way every screen in the listen moves on. */}
      <div className="ses-actions ses-actions--center" style={{ marginTop: 18, flexDirection: 'column', gap: 16 }}>
        <button type="button" className="ses-quiet" onClick={onNext}>{go}</button>
      </div>
    </div>
  );
}
