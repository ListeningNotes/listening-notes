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
// The stars, the chips and the posted date are deliberately absent from both.
// They are one line down, they arrive with the entry, and a rating drawn from
// memory that then corrected itself would undo the whole point of this.

'use client';
import { handedOver } from '../../library/handoff';

export default function LayerWaiting({ slug }) {
  const known = handedOver(slug);
  // The same expression FullPostPage uses. The real title shrinks with its own
  // length, set inline, so a stand-in using the stylesheet's plain clamp would
  // draw a long album name a step too large and the line would jump when the
  // entry arrived. See titleSize there; these two have to agree.
  const titleSize = known
    ? `clamp(1.25rem, ${(300 / ((known.album || '').length || 1)).toFixed(2)}vw, 2.1rem)`
    : null;

  if (!known) {
    return (
      <div className="lay-wait" aria-hidden="true">
        <div className="lay-wait-art" />
        <div className="lay-wait-line lay-wait-line--title" />
        <div className="lay-wait-line lay-wait-line--byline" />
      </div>
    );
  }

  // The real first screen's classes, not lookalikes. If these drift the swap
  // becomes a flicker, and the whole value of this is that nothing moves.
  return (
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
      </section>
    </div>
  );
}
