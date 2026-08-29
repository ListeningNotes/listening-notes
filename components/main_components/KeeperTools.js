// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/KeeperTools.js
// The two things only this journal's keeper can do to the page they are on.
//
// Top left of the header, quiet, in the corner — the same place and the same
// weight the About card gives its pencil, because they are the same kind of
// thing and should not look like two different ideas. The card's version is
// pinned to the card's own corner rather than drawn here; what matches is the
// treatment, not the markup.
//
// ── Why two and not a menu ────────────────────────────────────────────────
// Two glyphs read at a glance and a menu does not. A `DotsThree` would be one
// press to find out what is behind it, every time, for a set of two — and it
// would be the second navigation on a page whose whole job is to be read. If a
// fourth or fifth tool ever appears, the pencil becomes the menu and nothing
// else has to move.
//
// ── Why these two ─────────────────────────────────────────────────────────
// The pencil corrects the writing. The printer makes something out of it — a
// card, a flyer, an image to post. They are the owner's half of a split that
// runs through the whole site: the printer takes the *contents* somewhere, so
// it is owner-only; copying a link passes along an *address*, so it belongs to
// everybody and lives at the foot of the entry instead.
//
// Nothing here decides whether it should be drawn. The page above does that on
// the server and simply does not render this for a visitor — see
// wristbandOnHand in library/wristband.js for why that is worth the trouble.

'use client';
import Link from 'next/link';
import { Pencil, Printer } from '@phosphor-icons/react';

export default function KeeperTools({ onEdit, slug }) {
  return (
    <>
      <button
        type="button"
        className="kt-tool"
        onClick={onEdit}
        aria-label="Correct this entry"
        title="Correct this entry"
      >
        <Pencil size={16} weight="bold" aria-hidden="true" />
      </button>

      {/* The slug travels so the printer opens on this record rather than on
          whichever one happens to be first in the list. Pressing print on an
          album and then having to find that album again is the kind of small
          rudeness that makes a tool feel like somebody else's. */}
      <Link
        href={slug ? `/dashboard/share?entry=${encodeURIComponent(slug)}` : '/dashboard/share'}
        className="kt-tool"
        aria-label="Print this entry"
        title="Print this entry"
      >
        <Printer size={16} weight="bold" aria-hidden="true" />
      </Link>
    </>
  );
}
