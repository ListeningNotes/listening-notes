// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/AlbumTile.js
// An album on the journal wall. A cover, and a link to the record it is of.
//
// This replaced FlipTile, which did two different things depending on the
// screen: on a desktop, hovering washed the album and artist over the art and
// clicking opened EntryModal; on a phone, the tile turned over to a blurred
// copy of its own art with a metadata card on top, and the way through to the
// entry was a second tap on the back of the card.
//
// Both were answers to the same question — how do you find out more about a
// record without leaving the wall — and the layer answers it better than
// either. One tap opens the entry over the journal and it slides back off, so
// a card of metadata standing in for the entry has nothing left to do, and a
// second tap to reach the real thing is a step that no longer buys anything.
//
// The hover wash stays. It is the one part that was not standing in for the
// entry: it says which record your cursor is on, which a wall of art alone
// cannot, and it costs nothing on a phone because there is no hover there.
//
// A real <Link>, not a click handler that pushes. The layer is an intercepted
// route — see app/@layer — so the interception only happens on a client-side
// navigation the router makes itself. A hand-rolled push would land on the
// standalone page and the journal would unmount underneath it.

'use client';
import Link from 'next/link';

export default function AlbumTile({ entry }) {
  return (
    <Link
      href={`/entries/${entry.slug}`}
      className="ft"
      aria-label={entry.album + (entry.artist ? ' by ' + entry.artist : '')}
      data-tile-slug={entry.slug}
    >
      <div className="ft-inner">
        {/* Nothing sits on top of the art at rest — the wall is just the album
            covers. The favourite and masterpiece marks used to float here and
            were moved off deliberately; they belong on the entry, not over
            somebody's artwork. */}
        <div className="ft-face ft-face--front">
          {entry.album_art
            ? <img src={entry.album_art} alt="" className="ft-art" loading="lazy" draggable={false} />
            : <div className="ft-placeholder">{(entry.album || '?')[0]}</div>}
          <div className="ft-hover">
            <div className="ft-hover-album">{entry.album}</div>
            <div className="ft-hover-artist">{entry.artist}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
