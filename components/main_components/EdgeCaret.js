// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/EdgeCaret.js
// One control in the row along the bottom of the cross: a mark for where you
// would land, and a small chevron under it for which way that is.
//
// A swipe is invisible. Nothing on a still screen tells you that the page
// continues to the left and to the right, and a navigation nobody discovers is
// a navigation that does not exist — so each direction that has something in
// it gets a control. Press it or swipe past it; both land in the same place,
// and the press is the one that teaches the swipe.
//
// The mark speaks and the chevron only points. That is why one is twice the
// size of the other: a chevron says something is over there, which is enough
// to make somebody swipe once and not enough to say whether it was worth it.
// The mark answers that, and it names the *destination* rather than the
// direction — pressing right from the card goes back to the beacon, so what
// sits above that chevron is the beacon's own mark, not the desk's. See
// HomeNav, which works out which mark belongs over which arrow.
//
// Three positions out of one component rather than three components: they are
// the same object doing the same job on a different axis, and written twice
// they drift — which is exactly how the site ended up with two nav rows that
// had to be merged back into SiteNav.

'use client';
import { CaretLeft, CaretRight, CaretDown } from '@phosphor-icons/react';

const GLYPH = {
  left: CaretLeft,
  right: CaretRight,
  down: CaretDown,
};

export default function EdgeCaret({ direction, onClick, label, icon: Mark, hidden = false }) {
  const Glyph = GLYPH[direction];
  if (!Glyph) return null;

  return (
    <button
      type="button"
      // Faded in place rather than unmounted. The row would otherwise reflow
      // every time a pane changed — the remaining controls sliding across to
      // re-centre themselves, so the thing you were about to press moves out
      // from under your thumb. The dot row learned this the hard way; see the
      // note at the top of DotNav.js.
      className={'edge-caret edge-caret--' + direction + (hidden ? ' edge-caret--away' : '')}
      onClick={onClick}
      aria-label={label}
      aria-hidden={hidden ? true : undefined}
      inert={hidden ? true : undefined}
      tabIndex={hidden ? -1 : undefined}
    >
      {Mark && <Mark size={21} weight="regular" aria-hidden="true" className="edge-caret-mark" />}
      <Glyph size={11} weight="bold" aria-hidden="true" className="edge-caret-arrow" />
    </button>
  );
}
