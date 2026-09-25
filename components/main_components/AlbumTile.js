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
//
// ── A record, not an entry, 2026-09-24 ───────────────────────────────────
// One tile per record (gatherAlbums in Journal.js), and the tile says what is
// inside it (the track-notes brief): plain for one album listen, fanned —
// stacked edges on the right — once there is more than one entry behind it,
// and dog-eared for a record known only by its songs. A second listen or a
// song marked on a record gives it the fan, and a listen takes the fold away
// (Miyel's brief of the same evening: "it gains the fan if it didn't have
// one, and loses the dog-ear if the new entry is a full listen"). So the fan
// says exactly what pressing it does — more than one thing, so the record's
// page — and a songs-only record with two songs wears both.
//
// With one thing behind it a tile opens that thing, growing out of the cover
// as an entry always has. With more, it opens the record's own page — every
// listen and every note, newest first (app/albums/[record]) — which grows out
// of the same cover (data-grows, library/handoff.js). Miyel, 2026-09-24: a
// page listing one thing would be a step with nothing to choose.

'use client';
import Link from 'next/link';
import { handOff } from '../../library/handoff';

export default function AlbumTile({ album, going = false }) {
  const face = album.face;
  const alone = album.all.length === 1;
  const fanned = album.all.length > 1;
  const folded = album.listens.length === 0;
  // The record's page is at its key with hyphens for spaces: the key is
  // letters, digits and single spaces, so it comes back exactly.
  const href = alone ? `/entries/${face.slug}` : `/albums/${album.key.replace(/ /g, '-')}`;

  return (
    <Link
      href={href}
      /* `going` is this record being taken down: it shrinks where it stands
         for a third of a second and then the tiles after it file across into
         the space (closeTheGap in Journal.js). */
      className={'ft' + (going ? ' ft--going' : '') + (fanned ? ' ft--fanned' : '')}
      aria-label={face.album + (face.artist ? ' by ' + face.artist : '')
        + (alone && !folded ? '' : ', ' + [
          album.listens.length ? (album.listens.length === 1 ? '1 listen' : `${album.listens.length} listens`) : '',
          album.notes.length ? (album.notes.length === 1 ? '1 song' : `${album.notes.length} songs`) : '',
        ].filter(Boolean).join(' and '))}
      /* The entry it opens from, for the layer to grow out of (tileBoxOf);
         the record, for the wall to follow it by when it moves; and every
         entry behind it, so a listen or a note just saved finds the tile it
         landed on. */
      data-tile-slug={face.slug}
      data-tile-key={album.key}
      data-tile-slugs={album.all.map(e => e.slug).join(' ')}
      data-grows={alone ? undefined : href}
      /* On the way past, this leaves the cover and the two lines under it
         where the layer can pick them up — see library/handoff.js. The entry
         still has to be read from the database; this is only so the layer has
         something true to draw while that happens, instead of a grey square. */
      onClick={alone ? () => handOff(face) : undefined}
    >
      <div className="ft-inner">
        {/* Nothing sits on top of the art at rest — the wall is just the album
            covers. The favourite and masterpiece marks used to float here and
            were moved off deliberately; they belong on the entry, not over
            somebody's artwork. The fold is not a mark on the art: it is the
            corner of the page, turned down. */}
        <div className={'ft-face ft-face--front' + (folded ? ' ln-fold' : '')}>
          {face.album_art
            ? <img src={face.album_art} alt="" className="ft-art" loading="lazy" draggable={false} />
            : <div className="ft-placeholder">{(face.album || '?')[0]}</div>}
          <div className="ft-hover">
            <div className="ft-hover-album">{face.album}</div>
            <div className="ft-hover-artist">{face.artist}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
