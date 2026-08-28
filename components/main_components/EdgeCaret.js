// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/EdgeCaret.js
// The one control that says the cross has more than one pane.
//
// A swipe is invisible. Nothing on a still screen tells you that the page
// continues to the left and to the right, and a navigation nobody discovers is
// a navigation that does not exist — so each direction that has something in
// it gets a caret pinned to that edge. Press it or swipe past it; both land in
// the same place, and the press is the one that teaches the swipe.
//
// Three positions out of one component rather than three components: they are
// the same object doing the same job on a different axis, and written twice
// they drift — which is exactly how the site ended up with two nav rows that
// had to be merged back into SiteNav.
//
// The down caret is not a duplicate of the other two. Left and right say
// "there is another pane"; down says "this pane keeps going", which is the
// same sentence about a different axis and reads correctly as the same mark.

'use client';
import { CaretLeft, CaretRight, CaretDown } from '@phosphor-icons/react';

const GLYPH = {
  left: CaretLeft,
  right: CaretRight,
  down: CaretDown,
};

export default function EdgeCaret({ direction, onClick, label, hidden = false }) {
  const Glyph = GLYPH[direction];
  if (!Glyph) return null;

  return (
    <button
      type="button"
      // aria-hidden rather than unmounting: a caret that appears and
      // disappears as you swipe pulls the eye to the edge of the screen every
      // time the pane changes. It fades instead, and inert keeps the faded one
      // off the tab order so nobody lands on a control they cannot see.
      className={'edge-caret edge-caret--' + direction + (hidden ? ' edge-caret--away' : '')}
      onClick={onClick}
      aria-label={label}
      aria-hidden={hidden ? true : undefined}
      inert={hidden ? true : undefined}
      tabIndex={hidden ? -1 : undefined}
    >
      <Glyph size={22} weight="regular" aria-hidden="true" />
    </button>
  );
}
