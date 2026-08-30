// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/Slug_Page/MiniCard.js
// The record, still on screen while you read about it.
//
// ── Why it exists ─────────────────────────────────────────────────────────
// An entry on a phone is two screens: a screen of album that holds still, and
// a screen of writing below it. The second one is a wall of text — album note,
// then a tracklist of notes — and once you have swiped down, the thing all of
// it is about has gone. This is the least of the record that still says which
// one it is, kept at the top of the reading: the art, the name, the artist,
// the score and the marks.
//
// ── It is the card a screen above, made small ─────────────────────────────
// Nothing here is new information. That is the point rather than a problem:
// this is not a second place to learn about the album, it is the same card
// shrunk to a line so the writing has something to sit under. Which is also
// why it is not a header in its own right and carries no controls — it says
// what you are reading and gives you the way back to it, and nothing else.
//
// ── The marks are stated here rather than shared ──────────────────────────
// Heart for a favourite, SketchLogo for a masterpiece, Fingerprint for a
// formative record, in --fav, --mp and --formative. Those three pairings are
// the site's, and they are already restated locally in ScoreScreen,
// SessionPreview, TrackNotes and HorizonChart rather than lifted somewhere
// common — the same call Chip.js writes down about the keeper's tools. There
// is a fourth copy in EntryMarks, in AlbumPreview.js, which is the closest to
// this one and is also a file NOTES has standing for deletion; importing from
// it would have given a dead component a reader and quietly settled a decision
// that is somebody else's to make. If AlbumPreview is ever kept, that is the
// moment to lift one set of marks out for everybody, not before.
//
// Formative reads the flag, which is now the only record of it — nine older
// entries carried it as relationship = 'Formative' and were migrated across
// before that column was dropped. Screen one's chip row did not show formative
// at all when this was written; it does now, and finding that gap is what
// turned up the fact that nothing on the site could set the flag in the first
// place.

'use client';
import { Heart, SketchLogo, Fingerprint } from '@phosphor-icons/react';
import StarRating from '../StarRating';

export default function MiniCard({ entry, coverSrc, rating = 0, masterpiece = false, onReturn }) {
  const favorite  = entry.favorite === true || entry.favorite === 'true';
  const formative = entry.formative === true || entry.formative === 'true';

  return (
    // A button, because the whole strip is the way back up to the record —
    // the art is the thing you would reach for, and making only the art
    // tappable would be a 44px target inside a bar that looks like one.
    <button
      type="button"
      className="ln-mini"
      onClick={onReturn}
      aria-label={`Back to ${entry.album}`}
    >
      <span className="ln-mini-art">
        {coverSrc
          ? <img src={coverSrc} alt="" />
          : <span className="ln-mini-none" aria-hidden="true">♪</span>}
      </span>

      <span className="ln-mini-said">
        <span className="ln-mini-album">{entry.album}</span>
        <span className="ln-mini-artist">{entry.artist}</span>
      </span>

      <span className="ln-mini-marks">
        {rating > 0 && (
          // No glow and no burst. Both are for the score arriving on screen
          // one; repeated up here on every scroll they would be a firework
          // going off beside somebody's reading.
          <StarRating rating={rating} size={11} glow={false} animate={false} />
        )}
        {(favorite || masterpiece || formative) && (
          <span className="ln-mini-flags">
            {favorite && (
              <span className="ln-mini-flag" style={{ color: 'var(--fav, #f0484f)' }}
                    role="img" aria-label="Favorite" title="Favorite">
                <Heart size={12} weight="fill" />
              </span>
            )}
            {masterpiece && (
              <span className="ln-mini-flag" style={{ color: 'var(--mp, #4a9bf0)' }}
                    role="img" aria-label="Masterpiece" title="Masterpiece">
                <SketchLogo size={12} weight="fill" />
              </span>
            )}
            {formative && (
              <span className="ln-mini-flag" style={{ color: 'var(--formative, #3fa96b)' }}
                    role="img" aria-label="Formative" title="Formative">
                <Fingerprint size={12} weight="bold" />
              </span>
            )}
          </span>
        )}
      </span>
    </button>
  );
}
