// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/KeeperTools.js
// The things only this journal's keeper can do to the thing they are looking
// at, behind one mark.
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
// itself against the sheet rather than the window. Pressed, the mark stays
// exactly where it is and the tools come out from under it. Pressed again,
// they go back in.
//
// ── The door does not move ────────────────────────────────────────────────
// The first version swapped the ··· for an × at the other end of the group,
// so the thing you had just pressed jumped across the row before you could
// let go. The mark is the door: it stays in its corner, it turns into the ×,
// and the tools file out of it one at a time and file back in the same way
// (Miyel, 2026-09-15). Which end they file out towards is the surface's
// business, not this file's — the entry's header holds them at the left and
// the card holds them at the right, and the difference is one CSS line
// (`--kt-dir`) rather than a second order in here.
//
// ── What is in it ─────────────────────────────────────────────────────────
// On an entry: the pencil corrects the writing, the printer makes something
// out of it, and Delete ends it — opening the correction's own confirmation
// rather than doing anything itself, because the warning and the second press
// already exist there and a destructive action should not get a shorter path
// just because it moved to a shorter menu. On the card: the pencil and the
// printer, and nothing that ends anything. You cannot delete the card; it is
// the journal.
//
// A visitor sees none of this. Sharing stays one path — press the album art,
// get the code and the address copied — and a second door to it here would
// need explaining and does not earn a control. Nothing in this file decides
// whether it is drawn: the page above does that on the server and simply does
// not render it for a visitor (library/wristband.js, wristbandOnHand).
'use client';

import { cloneElement, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { DotsThree, Pencil, Printer, Trash, X } from '@phosphor-icons/react';

// How long the tools take to file back in. It has to outlast the longest
// animation in the closing half of kt-file-out (nav.css) or the last one
// vanishes mid-stride; it is deliberately quicker than opening, because
// waiting for a menu to finish leaving is the one thing nobody wants.
const PACKING_UP = 320;

const WORDS = {
  entry: {
    all:    'What you can do with this entry',
    edit:   'Correct this entry',
    print:  'Print this entry',
    remove: 'Delete this entry',
  },
  card: {
    all:    'What you can do with this card',
    edit:   'Edit this card',
    print:  'Print this card',
    remove: null,
  },
};

export default function KeeperTools({
  what = 'entry',
  onEdit,
  slug = null,
  onPrint = null,
  onDelete = null,
}) {
  const words = WORDS[what] || WORDS.entry;
  // 'shut' · 'out' — the tools are on their way out or already there · 'back'
  // — they are on their way in and still on screen.
  const [phase, setPhase] = useState('shut');
  const open = phase === 'out';
  const timer = useRef(null);

  const shut = () => {
    if (timer.current) clearTimeout(timer.current);
    setPhase('back');
    timer.current = setTimeout(() => setPhase('shut'), PACKING_UP);
  };
  const press = () => {
    if (timer.current) clearTimeout(timer.current);
    if (open) shut();
    else setPhase('out');
  };

  // Nothing here sets state — it only makes sure a menu that is taken off the
  // page mid-close does not come back to a component that has gone.
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // Escape closes it, and closing is all Escape does here — the sheet under
  // this has its own Escape and would otherwise take the entry away with the
  // menu still on screen.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = event => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      if (timer.current) clearTimeout(timer.current);
      setPhase('back');
      timer.current = setTimeout(() => setPhase('shut'), PACKING_UP);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open]);

  const tools = [];

  tools.push(
    <button
      key="edit"
      type="button"
      className="kt-tool kt-tool--out"
      onClick={() => { shut(); onEdit(); }}
      aria-label={words.edit}
      title={words.edit}
    >
      <Pencil size={18} weight="regular" aria-hidden="true" />
    </button>
  );

  tools.push(
    onPrint ? (
      <button
        key="print"
        type="button"
        className="kt-tool kt-tool--out"
        onClick={() => { shut(); onPrint(); }}
        aria-label={words.print}
        title={words.print}
      >
        <Printer size={18} weight="regular" aria-hidden="true" />
      </button>
    ) : (
      /* The slug travels so the printer opens on this record rather than on
         whichever one happens to be first in the list. */
      <Link
        key="print"
        href={slug ? `/printer?entry=${encodeURIComponent(slug)}` : '/printer'}
        className="kt-tool kt-tool--out"
        aria-label={words.print}
        title={words.print}
      >
        <Printer size={18} weight="regular" aria-hidden="true" />
      </Link>
    )
  );

  if (onDelete && words.remove) {
    tools.push(
      <button
        key="remove"
        type="button"
        className="kt-tool kt-tool--out kt-tool--end"
        onClick={() => { shut(); onDelete(); }}
        aria-label={words.remove}
        title={words.remove}
      >
        <Trash size={18} weight="regular" aria-hidden="true" />
      </button>
    );
  }

  // Two numbers per tool, and they are the whole animation. --kt-i is how many
  // boxes it is from the door, which is both how far it travels and how long
  // it takes. --kt-d is its turn in the queue going out: the one that ends up
  // furthest away leaves first and the rest stop short behind it, the way a
  // line of people coming through a door fills a room from the back.
  const filing = phase === 'shut' ? null : tools.map((tool, i) =>
    cloneElement(tool, { style: { '--kt-i': i + 1, '--kt-d': tools.length - (i + 1) } })
  );

  return (
    <div className={'kt-tools' + (phase === 'back' ? ' kt-tools--back' : '')}>
      <button
        type="button"
        className="kt-tool kt-tool--door"
        onClick={press}
        aria-label={open ? 'Close' : words.all}
        aria-expanded={open}
        title={open ? 'Close' : words.all}
      >
        {/* Both glyphs, stacked and turning past each other, because the mark
            is one object that opens rather than two that swap. */}
        <span className="kt-door">
          <DotsThree className="kt-door-dots" size={22} weight="bold" aria-hidden="true" />
          <X className="kt-door-x" size={17} weight="regular" aria-hidden="true" />
        </span>
      </button>
      {filing}
    </div>
  );
}
