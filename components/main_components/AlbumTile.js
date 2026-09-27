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
// inside it, by count, the way Finder's icons do — three shapes and nothing
// else encoded in them (Miyel's brief, 2026-09-25): a card is one album
// listen; a page, its corner folded over, is one track note and no listen;
// a folder is more than one entry, whatever the mix — two songs, two listens,
// a listen and a song. Flat, and the folder's tab and the page's flap are the
// album's own colour: the cover, blurred down (.ln-fold-flap and .ft-tab in
// base.css). A page in a folder was tried for an evening and retired: it said
// two things at once and broke the count.
//
// Every tile opens an entry, growing out of the cover as an entry always
// has. A folder opens its earliest — you are looking at history, so you start
// at the beginning — and the rest are a swipe away, with a tab for each at
// the foot of the screen (FolderFooter, useFolder). There is no page listing
// a folder's entries.

'use client';
import Link from 'next/link';
import { handOff } from '../../library/handoff';

export default function AlbumTile({ album, going = false }) {
  const face = album.face;
  const alone = album.all.length === 1;
  const folder = !alone;
  const folded = alone && album.notes.length === 1;
  // The entry the tile opens: its only one, or a folder's earliest.
  const opens = album.all[album.all.length - 1];
  const href = `/entries/${opens.slug}`;

  return (
    <Link
      href={href}
      /* `going` is this record being taken down: it shrinks where it stands
         for a third of a second and then the tiles after it file across into
         the space (closeTheGap in Journal.js). */
      className={'ft' + (going ? ' ft--going' : '') + (folder ? ' ft--folder' : '') + (folded ? ' ft--page' : '')}
      aria-label={face.album + (face.artist ? ' by ' + face.artist : '')
        + (alone && !folded ? '' : ', ' + [
          album.listens.length ? (album.listens.length === 1 ? '1 listen' : `${album.listens.length} listens`) : '',
          album.notes.length ? (album.notes.length === 1 ? '1 song' : `${album.notes.length} songs`) : '',
        ].filter(Boolean).join(' and '))}
      /* The entry it opens from, for the layer to grow out of (tileBoxOf);
         the record, for the wall to follow it by when it moves; and every
         entry behind it, so a listen or a note just saved finds the tile it
         landed on. */
      data-tile-slug={opens.slug}
      data-tile-key={album.key}
      data-tile-slugs={album.all.map(e => e.slug).join(' ')}
      /* On the way past, this leaves the cover and the two lines under it
         where the layer can pick them up — see library/handoff.js. The entry
         still has to be read from the database; this is only so the layer has
         something true to draw while that happens, instead of a grey square. */
      onClick={() => handOff(opens)}
    >
      <div className="ft-inner">
        {/* The folder's tab, behind the cover: the same picture, blurred to
            its colours. The browser already has it — it is the cover. */}
        {folder && (
          <span className="ft-tab" aria-hidden="true">
            {face.album_art && <img src={face.album_art} alt="" loading="lazy" draggable={false} />}
          </span>
        )}
        {/* Nothing sits on top of the art at rest — the wall is just the album
            covers. The favourite and masterpiece marks used to float here and
            were moved off deliberately; they belong on the entry, not over
            somebody's artwork. The fold is not a mark on the art: it is the
            corner of the page, turned over. */}
        <div className={'ft-face ft-face--front' + (folded ? ' ln-fold' : '')}>
          {face.album_art
            ? <img src={face.album_art} alt="" className="ft-art" loading="lazy" draggable={false} />
            : <div className="ft-placeholder">{(face.album || '?')[0]}</div>}
          {folded && (
            <span className="ln-fold-flap" aria-hidden="true">
              {face.album_art && <img src={face.album_art} alt="" loading="lazy" draggable={false} />}
            </span>
          )}
          <div className="ft-hover">
            <div className="ft-hover-album">{face.album}</div>
            <div className="ft-hover-artist">{face.artist}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
