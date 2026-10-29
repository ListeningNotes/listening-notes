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
// One tile per record (gatherAlbums in Journal.js), and the tile says what
// kind of thing is inside it, the way Finder's icons do — two shapes since
// 2026-10-13 and nothing else encoded in them: a card is a record with an
// album listen behind it, however many entries it holds; a page, its corner
// folded over, is a record known only by its track notes, however many. Flat,
// and the page's flap is the album's own colour: the cover, blurred down
// (.ln-fold-flap in base.css).
//
// The folder — a third shape for more than one entry, a tab standing up
// behind a lowered cover, 2026-09-24/25 — is gone (Miyel, 2026-10-13: "no
// more folder"): a record with any listen is the full card, and only a
// record that is nothing but track notes keeps the bent flap. The tabs at
// the foot still say what else is in a record. A page in a folder had gone
// before it, for saying two things at once. The argument is in the archive.
//
// Every tile opens an entry, growing out of the cover as an entry always
// has. A record with more than one opens its earliest — you are looking at
// history, so you start at the beginning — and the rest are a swipe away,
// with a tab for each at the foot of the screen (FolderFooter, useFolder).
// There is no page listing a record's entries.

'use client';
import Link from 'next/link';
import { handOff } from '../../library/handoff';
import StarRating from './StarRating';
import { Marks } from '../../app/directory/Directory';

export default function AlbumTile({ album, going = false, density = null }) {
  const face = album.face;
  const alone = album.all.length === 1;
  // A page is a record known only by its songs, however many; anything with
  // a listen behind it is a card, however many entries (2026-10-13).
  const folded = album.listens.length === 0;
  // The entry the tile opens: its only one, or a folder's earliest.
  const opens = album.all[album.all.length - 1];
  const href = `/entries/${opens.slug}`;

  // ── List, 2026-10-29 ──────────────────────────────────────────────────
  // Miyel: "list view might be nice on personal album wall. it could have
  // art on left but instead of friend on right stars and tags." The Friends
  // wall's rows (PeopleScreen.js), with the record's own stars and its marks
  // — her tags, the icons and not their names — where a friend's faces are.
  // The same press, the same hand-off, and the entry grows out of the cover
  // (data-tile-slug on the art), not the row.
  if (density === 'list') {
    const song = folded && face.song;
    const title = song ? face.song : face.album;
    const under = song ? `${face.album} · ${face.artist}` : [face.artist, face.year].filter(Boolean).join(' · ');
    return (
      <Link
        href={href}
        className={'ps-list ft-list' + (going ? ' ft--going' : '')}
        aria-label={title + (face.artist ? ' by ' + face.artist : '')}
        data-tile-key={album.key}
        data-tile-slugs={album.all.map(e => e.slug).join(' ')}
        onClick={() => handOff(opens)}
      >
        <span className={'ps-list-art' + (folded ? ' ln-fold' : '')} data-tile-slug={opens.slug}>
          {face.album_art
            ? <img src={face.album_art} alt="" loading="lazy" draggable={false} />
            : <span className="ft-placeholder">{(face.album || '?')[0]}</span>}
          {folded && (
            <span className="ln-fold-flap" aria-hidden="true">
              {face.album_art && <img src={face.album_art} alt="" loading="lazy" draggable={false} />}
            </span>
          )}
        </span>
        <span className="ps-list-words">
          <span className="ps-list-title">{title}</span>
          <span className="ps-list-meta">{under}</span>
        </span>
        <span className="ft-list-marks">
          {Number(face.rating_value) > 0 && <StarRating rating={Number(face.rating_value)} size={11} />}
          <Marks entry={face} size={13} />
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      /* `going` is this record being taken down: it shrinks where it stands
         for a third of a second and then the tiles after it file across into
         the space (closeTheGap in Journal.js). */
      className={'ft' + (going ? ' ft--going' : '') + (folded ? ' ft--page' : '')}
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
