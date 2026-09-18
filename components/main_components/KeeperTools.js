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
// (Miyel, 2026-09-15).
//
// The corner is the top right on every surface that has one — the entry's
// header and the card's — so the tools always come out leftwards, and this
// file does not know or care which page it is on. `--kt-dir` in nav.css is
// the knob if a left-hand corner ever wants one.
//
// One exception, and it is measured rather than felt: the entry's row is the
// sitewide nav, which is 28px of padding either side of a centred mark, and
// three tools and a door reach 197px back from the right on a 375px phone
// while the mark ends at 212. So the row is told when the menu is open and
// takes its mark off the screen for as long as it is — the row becomes the
// menu, and comes back when it shuts. The card has two tools and 30px to
// spare, and keeps its mark. This is a DOM write rather than a prop because
// the row is two components away (FullPostPage builds the menu, SiteNav draws
// the row) and threading a boolean through both to hide one logo is more
// moving parts than the thing it moves.
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
import { DotsThree, EnvelopeSimple, Export, FilePlus, Pencil, Trash, UserCircle, X } from '@phosphor-icons/react';

// How long the tools take to file back in. It has to outlast the longest
// kt-file-in in nav.css or the last one is unmounted mid-stride and vanishes,
// which is the exact thing the animation exists to avoid.
//
// It was a flat 320ms, which was right for three tools and silently wrong for
// five: the rule in nav.css is `120ms + i × 30ms` of duration after
// `(i − 1) × 38ms` of delay, so the furthest of five finishes at 422ms and the
// last two would have blinked out. Worked out from the rule now rather than
// written down beside it, so adding a sixth cannot break it quietly.
// Deliberately quicker than opening: waiting for a menu to finish leaving is
// the one thing nobody wants.
const packingUp = n => 82 + 68 * n + 40;

// Two words per tool: the short one that prints under the glyph, and the whole
// sentence a screen reader and a tooltip get. The short one is not a caption of
// the long one — "Correct" under a pencil says the same thing in the space
// there is.
// Two words per tool: the short one that prints under the glyph, and the whole
// sentence a screen reader and a tooltip get. The short one is not a caption of
// the long one — "Correct" under a pencil says the same thing in the space
// there is — but the long one has to be unambiguous on its own, which is where
// Share earns its keep: the word is the one people reach for and the sentence
// says which kind of sharing it is.
const WORDS = {
  entry: {
    all:    'What you can do with this entry',
    edit:     ['Edit',      'Edit this entry'],
    print:    ['Share',     'Make a picture of this entry to share'],
    sender:   ['Credit',    'Say who sent you this record'],
    send:     ['Send',      'Send this record to somebody in your address book'],
    relisten: ['Relisten',  'Log another listen of this album'],
    remove:   ['Delete',    'Delete this entry'],
  },
  card: {
    all:    'What you can do with this card',
    edit:     ['Edit',  'Edit this card'],
    print:    ['Share', 'Make a picture of this card to share'],
    sender:   null,
    send:     null,
    relisten: null,
    remove:   null,
  },
};

export default function KeeperTools({
  what = 'entry',
  onEdit,
  slug = null,
  onPrint = null,
  onSender = null,
  onSend = null,
  onRelisten = null,
  onDelete = null,
}) {
  const words = WORDS[what] || WORDS.entry;
  // 'shut' · 'out' — the tools are on their way out or already there · 'back'
  // — they are on their way in and still on screen.
  const [phase, setPhase] = useState('shut');
  // Whether Delete has been pressed once. The first press arms it and changes
  // its word; the second does it. See the tool itself, below.
  const [sure, setSure] = useState(false);
  const open = phase === 'out';
  const timer = useRef(null);
  // How many tools there will be, worked out before anything needs it, so the
  // packing-up clock is the same number the animation uses. A plain value and
  // not a ref: it is decided by the props and read while closing.
  const count = 2
    + (onSender && words.sender ? 1 : 0)
    + (onSend && words.send ? 1 : 0)
    + (onRelisten && words.relisten ? 1 : 0)
    + (onDelete && words.remove ? 1 : 0);

  const shut = () => {
    if (timer.current) clearTimeout(timer.current);
    // Closing the drawer disarms Delete. An armed button that is still armed
    // when the drawer is opened again an hour later is a trap: you press the
    // one you meant to press first and it goes off.
    setSure(false);
    setPhase('back');
    timer.current = setTimeout(() => setPhase('shut'), packingUp(count));
  };
  const press = () => {
    if (timer.current) clearTimeout(timer.current);
    if (open) shut();
    else setPhase('out');
  };

  // Nothing here sets state — it only makes sure a menu that is taken off the
  // page mid-close does not come back to a component that has gone.
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // Tell the nav row, if this is in one, so it can get its mark out of the
  // way. Nothing happens on a card: there is no .sitenav-row over it.
  const mine = useRef(null);
  useEffect(() => {
    const row = mine.current && mine.current.closest('.sitenav-row');
    if (!row) return undefined;
    row.toggleAttribute('data-tooling', phase === 'out');
    return () => row.removeAttribute('data-tooling');
  }, [phase]);

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
      timer.current = setTimeout(() => setPhase('shut'), packingUp(count));
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, count]);

  // Nearest the door first, which is also the order they file out in:
  // Share, Edit, Credit, Send, Relisten, Delete (Miyel, 2026-09-17). Share is
  // nearest the door because it is the shortest reach and the most-used; the row
  // is reversed in CSS, so markup order is distance from the ··· and nothing
  // here has to know which corner it is in.
  //
  // A tool is a glyph, and a glyph over a word once there are more than three
  // of them. That is the brief's rule, driven off the count rather than off
  // which surface this is, so it cannot drift: two tools on a card stay
  // glyphs, because a pencil and a printer in a corner are learned in one
  // press and a word under each would be a toolbar. Five cannot be learned, so
  // five say what they are — the same glyph-over-a-word the band at the foot
  // uses, which means the pattern is familiar before anybody opens this.
  //
  // The word is drawn *and* the whole sentence stays on aria-label: "Print"
  // under a glyph is enough to choose by and not enough to hear read out.
  const withWords = count > 3;
  const box = (word, whole, glyph, extra = '') => ({
    className: 'kt-tool kt-tool--out' + (withWords ? ' kt-tool--said' : '') + extra,
    'aria-label': whole,
    title: whole,
    children: (
      <>
        {glyph}
        {withWords && <span className="kt-word">{word}</span>}
      </>
    ),
  });

  const tools = [];

  tools.push(
    onPrint ? (
      <button key="print" type="button" onClick={() => { shut(); onPrint(); }} {...box(...words.print, <Export size={22} weight="regular" aria-hidden="true" />)} />
    ) : (
      /* The slug travels so the printer opens on this record rather than on
         whichever one happens to be first in the list. */
      <Link key="print" href={slug ? `/printer?entry=${encodeURIComponent(slug)}` : '/printer'} {...box(...words.print, <Export size={22} weight="regular" aria-hidden="true" />)} />
    )
  );

  tools.push(
    <button key="edit" type="button" onClick={() => { shut(); onEdit(); }} {...box(...words.edit, <Pencil size={22} weight="regular" aria-hidden="true" />)} />
  );

  // Sent by left the correction on 2026-09-16 and is its own door now. It was
  // a field among fifteen others, which meant saying who gave you a record —
  // the one thing on an entry that is about somebody else — was filed under
  // fixing your own typos. It asks for no date (DECISIONS, 2026-09-14) and it
  // is the only tool here that is about a person.
  if (onSender && words.sender) {
    tools.push(
      <button key="sender" type="button" onClick={() => { shut(); onSender(); }} {...box(...words.sender, <UserCircle size={22} weight="regular" aria-hidden="true" />)} />
    );
  }

  // And Send, which opens the sheet a row in the address book opens, with this
  // record already in it. The two ways in differ only in which half is
  // answered before the sheet arrives.
  //
  // **An envelope, not a paper plane** (Miyel, 2026-09-17). The plane is what
  // every chat app uses for "transmit this", and sitting beside Share it made
  // both tools read as the same verb with no way to tell which object each
  // meant. An envelope is a letter to one person, which sharing is not — and
  // it is the mark this site already puts on a record that arrived this way
  // (DECISIONS, 2026-09-13: a sent record wears an envelope). Pressing an
  // envelope here is what makes one appear on their journal, which is as close
  // to a tool explaining itself as this row gets.
  //
  // EnvelopeSimple rather than the Envelope those marks use, deliberately:
  // Envelope is also the Inbox door on the desk, and a tool that sends should
  // not wear the mark of the room things arrive in.
  if (onSend && words.send) {
    tools.push(
      <button key="send" type="button" onClick={() => { shut(); onSend(); }} {...box(...words.send, <EnvelopeSimple size={22} weight="regular" aria-hidden="true" />)} />
    );
  }

  // Another listen of the same record. An album has many listens and they are
  // numbered from the entries that exist (DECISIONS): this never edits what is
  // here, it starts a new one — which is why the glyph is a page with a plus
  // on it (Miyel) rather than a repeat arrow. A repeat says the record is
  // going round again; a new page says what is actually being made.
  //
  // **Relisten**, settled on 2026-09-17 after *Log again*, *Revisit* and
  // *Relog*. It is the word DECISIONS already uses for exactly this — "a
  // relisten is a new entry; rewriting an old one falsifies the encounter" —
  // so the button and the rule it obeys are finally the same word. Revisit
  // lost for being a listen *type* on /key rather than a thing you do, and
  // Relog for being a coinage where a plain word existed — which is the whole reason it is a tool beside
  // Correct rather than something inside it. Editing is for typos; a relisten
  // is a new entry, and rewriting an old one falsifies the encounter.
  if (onRelisten && words.relisten) {
    tools.push(
      <button key="relisten" type="button" onClick={() => { shut(); onRelisten(); }} {...box(...words.relisten, <FilePlus size={22} weight="regular" aria-hidden="true" />)} />
    );
  }

  // ── Delete, twice ────────────────────────────────────────────────────────
  // The first press arms it and the word under the bin becomes "Sure?"; the
  // second press deletes. Miyel, 2026-09-18: "delete button on an entry post
  // just takes you to edit. this should turn into the ask, are you sure? then
  // when clicked again it deletes."
  //
  // It used to open a correction with a warning already showing at the foot of
  // it — which meant pressing Delete put you in edit mode, on a page-long form,
  // with the thing you asked for somewhere below the fold. The intent was
  // right and DECISIONS still holds: a destructive act does not get a shorter
  // path for moving to a shorter menu, and the confirmation opens in place
  // rather than as a dialog dismissed by reflex. Two presses on the button
  // itself is that, and it is the same shape a draft is discarded with in the
  // picker — × then "discard?" — so it is not a new thing to learn either.
  //
  // What it costs is the sentence that used to stand in front of this: that
  // the only way back is a backup. A word under a bin cannot say that. The
  // whole sentence is on the title and read out by a screen reader, the bin
  // fills and the box goes red, and the press is deliberate rather than
  // reflexive — which was the thing the warning was really buying.
  if (onDelete && words.remove) {
    tools.push(
      <button
        key="remove"
        type="button"
        onClick={() => {
          if (!sure) { setSure(true); return; }
          shut();
          onDelete();
        }}
        {...box(
          sure ? 'Sure?' : words.remove[0],
          sure ? 'Press again to delete this entry for good' : words.remove[1],
          <Trash size={22} weight={sure ? 'fill' : 'regular'} aria-hidden="true" />,
          ' kt-tool--end' + (sure ? ' kt-tool--sure' : ''),
        )}
      />
    );
  }

  // Two numbers per tool, and they are the whole animation. --kt-i is how many
  // boxes it is from the door, which is both how far it travels and how long
  // it takes. --kt-d is its turn in the queue going out: the one that ends up
  // furthest away leaves first and the rest stop short behind it, the way a
  // line of people coming through a door fills a room from the back.
  const drawn = tools.map((t, i) =>
    cloneElement(t, { style: { '--kt-i': i + 1, '--kt-d': tools.length - (i + 1) } })
  );

  const filing = phase === 'shut' ? null : drawn;

  return (
    <div ref={mine} className={'kt-tools' + (phase === 'back' ? ' kt-tools--back' : '')}>
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
