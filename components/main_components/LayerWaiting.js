// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/LayerWaiting.js
// What is on the layer for the moment before the entry arrives.
//
// It is not a loading state in the usual sense. When you have arrived here by
// tapping a cover in the journal, the journal already knew that cover, the
// album, the artist and the year — it had loaded them to draw the wall — so
// this draws the record itself, at full size, in exactly the place the real
// first screen will draw it. See library/handoff.js for how they get here.
//
// Which means there is no transition to speak of. The layer opens with the
// album on it, the writing arrives underneath a few hundred milliseconds
// later, and the swap is invisible because the two are the same markup with
// the same classes at the same size. The wait stops being something to sit
// through and becomes the moment the page is already showing you what you
// asked for.
//
// The plain version — a square and two bars, pulsing — is still here and still
// correct for every other way of arriving: a link in somebody's notes, a QR
// code, the back button landing somewhere new. Nothing was handed over then,
// and inventing a cover would be worse than admitting the wait.
//
// The stars, the chips and the date are here too, and leaving them out was the
// mistake in the first version. The worry was that a score drawn from memory
// might correct itself a moment later — but this is the same row from the same
// request the wall was drawn from, so there is nothing to correct. What their
// absence did instead was make the open read as two events: a cover, and then
// half a second later everything that says what you thought of it.
//
// The same components the entry itself uses, not lookalikes. StarRating and
// Chip are cheap and this is the only way the two can be relied on to match.

'use client';
import { createPortal } from 'react-dom';
import { handedOver } from '../../library/handoff';
import SiteNav from './SiteNav';
import KeeperTools from './KeeperTools';
import { useLayerHeaderSlot } from './LayerEntry';
import StarRating from './StarRating';
import Chip from './Slug_Page/Chip';
import { fonts } from '../../library/sitewide_visuals';

export default function LayerWaiting({ slug, authed = false }) {
  const known = handedOver(slug);
  // The header, held still. The layer keeps a slot for it outside the content
  // that turns with a swipe (see LayerEntry), and the finished entry draws its
  // nav there — but the entry is a fetch away, and a header that vanished for
  // the length of that fetch on every swipe was the one thing still moving.
  // So the wait draws the same row into the same slot: the mark, the lights,
  // and for the keeper the pencil and the printer, inert until the entry
  // lands and takes the slot over with the working ones.
  const headerSlot = useLayerHeaderSlot();
  const header = headerSlot
    ? createPortal(
        <SiteNav tools={authed ? <KeeperTools onEdit={() => {}} slug={slug} /> : null} />,
        headerSlot,
      )
    : null;
  // The same expression FullPostPage uses. The real title shrinks with its own
  // length, set inline, so a stand-in using the stylesheet's plain clamp would
  // draw a long album name a step too large and the line would jump when the
  // entry arrived. See titleSize there; these two have to agree.
  const titleSize = known
    ? `clamp(1.25rem, ${(300 / ((known.album || '').length || 1)).toFixed(2)}vw, 2.1rem)`
    : null;

  if (!known) {
    return (<>
      {header}
      <div className="lay-wait" aria-hidden="true">
        <div className="lay-wait-art" />
        <div className="lay-wait-line lay-wait-line--title" />
        <div className="lay-wait-line lay-wait-line--byline" />
      </div>
    </>);
  }

  // The real first screen's classes, not lookalikes. If these drift the swap
  // becomes a flicker, and the whole value of this is that nothing moves.
  // The same three lines FullPostPage derives, off the same fields.
  const isMasterpiece = known.masterpiece || known.rating === 'Masterpiece';
  const displayRating = isMasterpiece ? 5 : parseFloat(known.rating) || 0;
  const listenLabel = known.listen_total > 1 ? `Listen ${known.listen_total}` : null;
  const postedOn = known.created_at
    ? new Date(known.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (<>
    {header}
    <div className="ln-screens">
      <section className="ln-screen-one">
        {known.album_art && (
          <div className="ln-screen-one-art">
            <img src={known.album_art} alt="" />
          </div>
        )}
        <h1 className="ln-screen-one-title" style={{ fontSize: titleSize }}>{known.album}</h1>
        <div className="ln-screen-one-artist">
          {known.artist}{known.year ? ' · ' + known.year : ''}
        </div>
        {displayRating > 0 && (
          /* No animate and no burst. Those are the rating arriving, and it has
             not arrived — it was already known before the layer opened. A
             flourish here would replay itself the moment the entry landed. */
          <StarRating rating={displayRating} size={24} glow={isMasterpiece} />
        )}
        <div className="ln-screen-one-chips">
          {listenLabel && <Chip>{listenLabel}</Chip>}
          {known.entry_type === 'Submission' && <Chip>Submission</Chip>}
          {known.favorite && <Chip tone="fav">Favorite</Chip>}
          {isMasterpiece && <Chip tone="mp">Masterpiece</Chip>}
        </div>
        {postedOn && (
          <div style={{ fontFamily: fonts.mono, fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
            Posted {postedOn}
          </div>
        )}
      </section>
    </div>
  </>);
}
