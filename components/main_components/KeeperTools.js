// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/KeeperTools.js
// The one thing only this journal's keeper can do to the page they are on:
// correct the writing.
//
// Top left of the header, quiet, in the corner — the same place and the same
// weight the About card gives its pencil, because they are the same kind of
// thing and should not look like two different ideas. The card's version is
// pinned to the card's own corner rather than drawn here; what matches is the
// treatment, not the markup.
//
// There was a printer beside the pencil, which opened the Instagram slide
// exporter on this record. The exporter went on 2026-09-06 — sharing happens
// from the entry's own link and from the card — and the printer went with it.
// If the share printer ever ships, this corner is where its button goes, and
// at a third tool the pencil becomes the menu.
//
// Nothing here decides whether it should be drawn. The page above does that on
// the server and simply does not render this for a visitor — see
// wristbandOnHand in library/wristband.js for why that is worth the trouble.
'use client';

import { Pencil } from '@phosphor-icons/react';

export default function KeeperTools({ onEdit }) {
  return (
    <button
      type="button"
      className="kt-tool"
      onClick={onEdit}
      aria-label="Correct this entry"
      title="Correct this entry"
    >
      <Pencil size={18} weight="regular" aria-hidden="true" />
    </button>
  );
}
