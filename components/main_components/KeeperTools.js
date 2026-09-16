// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/KeeperTools.js
// The things only this journal's keeper can do to the entry they are reading,
// behind one mark.
//
// ── Why a menu now, when two glyphs were the argument against one ──────────
// This file used to say: two glyphs read at a glance and a menu does not, and
// a DotsThree would be one press to find out what is behind it, every time,
// for a set of two. The note ended "if a third tool ever appears, the pencil
// becomes the menu and nothing else moves." A third has — Delete, which was
// reachable only from inside a correction — and the rule it was waiting for
// is now the general one: no icons in headers, and an owner's tools live in a
// row on the desk or behind a ··· on the thing itself (Miyel's brief,
// 2026-09-15). Two glyphs in the corner were what made an entry read as a
// toolbar rather than as a page.
//
// ── It opens in the row ───────────────────────────────────────────────────
// Not as a panel over the page. An entry arrives on a sheet that claims
// sideways for the next record and down for closing itself, and a floating
// menu on top of that is a third surface competing for the same gestures —
// the nesting problem in NOTES, where a fixed panel inside a layer measures
// itself against the sheet rather than the window. Pressed, the mark becomes
// the tools, in the space it was already occupying. Pressed again, they go.
//
// ── What is in it ─────────────────────────────────────────────────────────
// The pencil corrects the writing. The printer makes something out of it — a
// card, a picture, a code. Delete ends it, and opens the correction's own
// confirmation rather than doing anything itself: the warning and the second
// press already exist there, and a destructive action should not get a
// shorter path just because it moved to a shorter menu.
//
// A visitor sees none of this. Sharing stays one path — press the album art,
// get the code and the address copied — and a second door to it here would
// need explaining and does not earn a control. Nothing in this file decides
// whether it is drawn: the page above does that on the server and simply does
// not render it for a visitor (library/wristband.js, wristbandOnHand).
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DotsThree, Pencil, Printer, Trash, X } from '@phosphor-icons/react';

export default function KeeperTools({ onEdit, slug, onPrint = null, onDelete = null }) {
  const [open, setOpen] = useState(false);

  // Escape closes it, and closing is all Escape does here — the sheet under
  // this has its own Escape and would otherwise take the entry away with the
  // menu still on screen.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = event => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setOpen(false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        className="kt-tool"
        onClick={() => setOpen(true)}
        aria-label="What you can do with this entry"
        aria-expanded={false}
        title="What you can do with this entry"
      >
        <DotsThree size={22} weight="bold" aria-hidden="true" />
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        className="kt-tool"
        onClick={() => setOpen(false)}
        aria-label="Close"
        aria-expanded
        title="Close"
      >
        <X size={17} weight="regular" aria-hidden="true" />
      </button>

      <button
        type="button"
        className="kt-tool"
        onClick={() => { setOpen(false); onEdit(); }}
        aria-label="Correct this entry"
        title="Correct this entry"
      >
        <Pencil size={18} weight="regular" aria-hidden="true" />
      </button>

      {onPrint ? (
        <button
          type="button"
          className="kt-tool"
          onClick={() => { setOpen(false); onPrint(); }}
          aria-label="Print this entry"
          title="Print this entry"
        >
          <Printer size={18} weight="regular" aria-hidden="true" />
        </button>
      ) : (
        /* The slug travels so the printer opens on this record rather than on
           whichever one happens to be first in the list. */
        <Link
          href={slug ? `/printer?entry=${encodeURIComponent(slug)}` : '/printer'}
          className="kt-tool"
          aria-label="Print this entry"
          title="Print this entry"
        >
          <Printer size={18} weight="regular" aria-hidden="true" />
        </Link>
      )}

      {onDelete && (
        <button
          type="button"
          className="kt-tool kt-tool--end"
          onClick={() => { setOpen(false); onDelete(); }}
          aria-label="Delete this entry"
          title="Delete this entry"
        >
          <Trash size={18} weight="regular" aria-hidden="true" />
        </button>
      )}
    </>
  );
}
