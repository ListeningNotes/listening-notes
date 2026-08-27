// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/FlipTile.js
// An album tile on the archive grid. Two behaviours, chosen by the page:
//
//   mode="modal" (desktop) — hovering washes the album/artist in over the
//     art, clicking hands off to the page, which opens EntryModal.
//   mode="flip" (phone)    — the modal is too big and too slow on a phone,
//     so the tile itself turns over to a blurred version of its own art
//     with the metadata card (AlbumPreview) on top. Tapping the back again
//     turns it face-up; the button on the back is the way through to the
//     full entry page.
//
// This is what makes the archive grid read differently from the homepage's
// recent-listens grid, where a tile is just a link straight to the entry.
//
// The rotation is the standard two-face setup: only .ft-inner rotates, and
// each face carries its own border-radius + overflow so nothing is clipped
// by a box that's mid-rotation — iOS Safari has a long history of tearing
// rounded corners off elements it's transforming in 3D (see the notes on
// .strip-tile in globals.css for the last round of that).

'use client';
import AlbumPreview from './AlbumPreview';

// How much to shrink the metadata card's type, per grid density. At the
// smallest step a phone tile is only ~85px across, so the card drops to its
// essentials (AlbumPreview hides the secondary lines below 0.75).
const META_SCALE = { large: 1, medium: 0.78, small: 0.6 };

export default function FlipTile({ entry, mode = 'modal', flipped = false, density = 'medium', onSelect }) {
  const canFlip = mode === 'flip';

  const art = entry.album_art
    ? <img src={entry.album_art} alt="" className="ft-art" loading="lazy" draggable={false} />
    : <div className="ft-placeholder">{(entry.album || '?')[0]}</div>;

  return (
    <div
      className={'ft' + (flipped ? ' ft--flipped' : '')}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(); }
      }}
      aria-label={entry.album + (entry.artist ? ' by ' + entry.artist : '')}
      data-tile-slug={entry.slug}
    >
      <div className="ft-inner">
        {/* Nothing sits on top of the art at rest — the grid is just the
            album covers. The favourite / masterpiece marks moved onto the
            metadata card (AlbumPreview), which is where they can be given
            a considered spot instead of floating over someone's artwork. */}
        <div className="ft-face ft-face--front">
          {art}
          {/* Desktop-only: the album/artist wash that fades in on hover.
              Kept off the flip build entirely — there's no hover on a
              phone, and it would show through the turning card. Just the
              two lines that say which record this is; the gem lives on the
              flipped card, and desktop has the modal for the rest. */}
          {!canFlip && (
            <div className="ft-hover">
              <div className="ft-hover-album">{entry.album}</div>
              <div className="ft-hover-artist">{entry.artist}</div>
            </div>
          )}
        </div>

        {canFlip && (
          <div className="ft-face ft-face--back">
            {entry.album_art && (
              <img src={entry.album_art} alt="" className="ft-art ft-art--blurred" loading="lazy" draggable={false} />
            )}
            <AlbumPreview entry={entry} scale={META_SCALE[density] ?? 1} />
          </div>
        )}
      </div>
    </div>
  );
}
