// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';

// components/main_components/IdentityCard.js
// The back of the cover.
//
// The landing page used to be one-sided, and everything a visitor might want
// to know about whose journal this is lived on a separate /about page nobody
// went to. This is that page, turned into an object: the card you'd be handed
// at the door.
//
// It is a column, not a form. An earlier version laid it out like a real ID —
// photo left, filled-in fields right, a swatch, a serial, fine print — and it
// was too much: eight dashed rules and a dozen small facts competing on one
// screen, and unreadable on a phone, where a card has to be tall rather than
// wide. What survived is the short list of things somebody actually wants:
// whose journal, how long, how many, why, and where else to find them.
//
// It carries no background of its own. The front of the cover is the beacon on
// the page's own colour, and turning something over should not change the
// colour of the room.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { arrivingAlone } from '../../library/handoff';
import { Check, Eye, EyeSlash, PushPin, UploadSimple, User, X } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useTheme } from './Lightswitch';
import { useListeningBeacon } from '../../hooks/useListeningBeacon';
import { useBookplate } from './Bookplate';
import CodeSlot from './CodeSlot';
import KeeperTools from './KeeperTools';

// ── The Ln. mark ──────────────────────────────────────────────────────────
// It sits at the top of the column, and it is the only mark on this side of the
// cover. It was knocked into the middle of the code for a while as well, which
// is a nice object and one mark too many for one card.
const MARK_BOX = { x: 76, y: 96, w: 241, h: 140 };
const MARK_GLYPHS = [
  { d: 'M 44.65625 0 C 37.46875 0 31.160156 -1.601562 25.734375 -4.8125 C 20.304688 -8.019531 16.097656 -12.28125 13.109375 -17.59375 C 10.128906 -22.90625 8.640625 -28.773438 8.640625 -35.203125 L 8.640625 -116.21875 L 36.53125 -116.21875 L 36.53125 -33.203125 C 36.53125 -30.546875 37.46875 -28.222656 39.34375 -26.234375 C 41.226562 -24.242188 43.550781 -23.25 46.3125 -23.25 L 77.03125 -23.25 L 77.03125 0 Z M 44.65625 0 ', transform: 'translate(73.734177, 220.794814)' },
  { d: 'M 91.96875 2 C 85 2 78.742188 0.476562 73.203125 -2.5625 C 67.671875 -5.613281 63.300781 -9.847656 60.09375 -15.265625 C 56.882812 -20.691406 55.28125 -26.835938 55.28125 -33.703125 L 55.28125 -84.5 C 55.28125 -86.269531 54.835938 -87.875 53.953125 -89.3125 C 53.066406 -90.75 51.90625 -91.910156 50.46875 -92.796875 C 49.03125 -93.679688 47.425781 -94.125 45.65625 -94.125 C 43.882812 -94.125 42.28125 -93.679688 40.84375 -92.796875 C 39.40625 -91.910156 38.269531 -90.75 37.4375 -89.3125 C 36.601562 -87.875 36.1875 -86.269531 36.1875 -84.5 L 36.1875 0 L 8.96875 0 L 8.96875 -82.515625 C 8.96875 -89.484375 10.539062 -95.625 13.6875 -100.9375 C 16.84375 -106.25 21.21875 -110.453125 26.8125 -113.546875 C 32.40625 -116.648438 38.6875 -118.203125 45.65625 -118.203125 C 52.738281 -118.203125 59.046875 -116.648438 64.578125 -113.546875 C 70.109375 -110.453125 74.476562 -106.25 77.6875 -100.9375 C 80.90625 -95.625 82.515625 -89.484375 82.515625 -82.515625 L 82.515625 -31.703125 C 82.515625 -29.929688 82.957031 -28.300781 83.84375 -26.8125 C 84.726562 -25.320312 85.859375 -24.160156 87.234375 -23.328125 C 88.617188 -22.492188 90.144531 -22.078125 91.8125 -22.078125 C 93.582031 -22.078125 95.210938 -22.492188 96.703125 -23.328125 C 98.203125 -24.160156 99.394531 -25.320312 100.28125 -26.8125 C 101.164062 -28.300781 101.609375 -29.929688 101.609375 -31.703125 L 101.609375 -116.21875 L 128.65625 -116.21875 L 128.65625 -33.703125 C 128.65625 -26.835938 127.050781 -20.691406 123.84375 -15.265625 C 120.632812 -9.847656 116.265625 -5.613281 110.734375 -2.5625 C 105.203125 0.476562 98.945312 2 91.96875 2 Z M 91.96875 2 ', transform: 'translate(153.915942, 220.794814)' },
];
// The period. It is the one part of the mark that carries a state: lit while
// something is playing.
const MARK_DOT = { cx: 297.0547, cy: 216.71875, r: 14.1328 };

// A month and a year, never a day. The card says how long the journal has been
// kept, and a precise date invites arithmetic that isn't the point. Printed
// in UTC so the month is the same on every reader's screen.
function monthAndYear(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' });
}

const SLOT_LABELS = { toCode: 'Show the code for this address', toPicture: 'Show the portrait' };

// What the browser holds as the visitor's own journal, for the Compare offer.
// Module-level so the store reads a stable function.

// `edit` is handed in rather than made here. The prompts print on the About
// pane below this card and are edited there, and one edit session cannot be
// two instances of the hook — so the pane owns it and the card is given it.
export default function IdentityCard({ stamps, authed = false, edit, pinned = null, onPickPin, onOpenCount, openCount = null }) {
  const settings = useBookplate();
  const {
    cover_name,
    keeper_name,
    portrait_url,
    portrait_position,
    site_address,
    founded_at,
    hidden_fields,
    rig_icon,
    portrait_code_url,
    portrait_code_stale,
  } = settings;
  const { isLive } = useListeningBeacon();
  // The code's dots are the page's ink, so the card asks for the file that
  // matches the page. The server renders light; a dark-page reader gets the
  // right one a moment after hydration.
  const { theme } = useTheme();
  const codeSrc = portrait_code_url ? `${portrait_code_url}&theme=${theme === 'dark' ? 'dark' : 'light'}` : '';

  // A journal with a portrait and no code, or a code an older build drew,
  // gets the current one the first time its owner opens it, rather than the
  // next time they happen to save the card. Once per page load, owner only.
  // The server says what happened in its log, and a press that faults
  // writes nothing.
  const router = useRouter();
  const pressed = useRef(false);
  useEffect(() => {
    if (!authed || !portrait_url || !site_address || pressed.current) return;
    if (portrait_code_url && !portrait_code_stale) return;
    pressed.current = true;
    fetch('/api/portrait/code', { method: 'POST' })
      .then(r => (r.ok ? router.refresh() : null))
      .catch(() => {});
  }, [authed, portrait_url, portrait_code_url, portrait_code_stale, site_address, router]);

  // Only ever true for the person who keeps the journal, and only the visible
  // half of that: the writing endpoints check the wristband for themselves.
  const editing = edit.editing;

  const records = stamps?.records ?? null;
  // The three counts, in their flags' own colours. Counted on the server with
  // the records (see /api/public/stamps). A zero is left off rather than
  // printed: a fresh journal saying 0 masterpieces is a boast in reverse, and
  // the row reads as two counts or one without complaint.
  const marks = [
    { word: 'masterpieces', n: stamps?.masterpieces ?? 0 },
    { word: 'formative', n: stamps?.formative ?? 0 },
  ].filter(m => m.n > 0);
  // Two of the three open a window of covers; albums does not (Miyel's brief,
  // 2026-09-15). Albums is the total, and a window of every record would be
  // the wall with its controls taken off — the wall is one swipe away. Only
  // the two flag counts open anything, which also says which of the numbers
  // mean something.
  //
  // They used to link to /archive with a filter in the address. That is
  // browsing, and nothing on this pane browses: the window is a glance, and
  // anybody who wants to browse masterpieces has the archive's own filter.
  const counts = [
    ...(records !== null ? [{ word: 'albums', n: records, opens: false }] : []),
    ...marks.map(m => ({ ...m, opens: true })),
  ];
  const genres = stamps?.genres ?? [];

  // Rows the keeper would rather not publish. Counted off the entries and never
  // editable — but not everyone wants to say how new they are or how few they
  // have logged, and a number you cannot take off is a number that stops people
  // keeping a card at all.
  const hiding = Array.isArray(hidden_fields) ? hidden_fields : [];
  const showing = key => editing || !hiding.includes(key);

  // Founded date if the keeper set one, otherwise the day the first record was
  // logged. The second is the more honest answer anyway: a listening journal
  // starts when someone writes in it, not when the database row was created.
  const since = monthAndYear(founded_at) || monthAndYear(stamps?.first_listen);



  // What the editor is currently showing, which is the draft rather than what

  // Escape closes it, because anything that covers the page has to have a way
  // out that is not hunting for the button that opened it.

  const address = site_address ? site_address.replace(/^https?:\/\//, '') : null;

  // ── Send and Add are not here any more ─────────────────────────────────
  // They were beside the name from the day the card was built: a filled Send
  // and an outlined Add, the two things a visitor can do about whose journal
  // this is. They moved to the foot of the beacon on 2026-09-19, where a
  // visitor lands, and Miyel's call the same hour was that keeping them here
  // as well is the same two controls one swipe apart — which is the argument
  // this project has already made twice, about the desk's copy of Start a
  // listen and about the row of pills that used to sit under the pinned
  // record. So the line is the name alone now, for everybody, which is the
  // shape the owner always saw. See CallingCard.js, which carries the press
  // that used to live here and the reason a journal can only ever copy its
  // own address rather than write into somebody else's book.
  // The square is a CodeSlot — the same one an entry's cover turns in. It
  // owns the turn, the copy and its pill, the corner mark and the wait; the
  // card owns which face is up. A card with no photograph starts on its
  // code, because an address with nothing to stand in front of it is still
  // an address.
  const canTurnSlot = Boolean(portrait_url && address);
  const [slotCode, setSlotCode] = useState(!portrait_url && Boolean(address));

  // ── Framing the picture ─────────────────────────────────────────────────
  // The slot is square and a photograph almost never is, so the browser crops
  // whatever is not in the middle — which for a photograph of a person is
  // frequently their head. This drags the picture inside its box.
  //
  // The arithmetic is real rather than a guessed sensitivity. Under
  // object-fit: cover the image is scaled until its shorter side fills the box,
  // and object-position runs 0% to 100% across exactly the overflow that
  // leaves. So a drag of forty pixels is worth forty pixels of overflow, and at
  // the ends the picture stops instead of sliding on under a finger.
  const dragFrom = useRef(null);
  const innerRef = useRef(null);
  // Which mark is being chosen, if any: 'rig', or the index of a link. One at a
  // time, so opening a second palette closes the first and the card never has

  function frameStart(event) {
    const img = event.currentTarget.querySelector('img');
    if (!img?.naturalWidth) return;
    const box = event.currentTarget.getBoundingClientRect();
    const cover = Math.max(box.width / img.naturalWidth, box.height / img.naturalHeight);
    dragFrom.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      overX: Math.max(0, img.naturalWidth * cover - box.width),
      overY: Math.max(0, img.naturalHeight * cover - box.height),
      fromX: edit.posX,
      fromY: edit.posY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function frameMove(event) {
    const from = dragFrom.current;
    if (!from) return;
    const clamp = v => Math.min(100, Math.max(0, v));
    // Dragging the picture down reveals what is above it, so the percentage
    // moves against the finger.
    if (from.overX) edit.setPosX(clamp(from.fromX - ((event.clientX - from.pointerX) / from.overX) * 100));
    if (from.overY) edit.setPosY(clamp(from.fromY - ((event.clientY - from.pointerY) / from.overY) * 100));
  }

  function frameEnd() {
    dragFrom.current = null;
  }

  // ── The slot ────────────────────────────────────────────────────────────
  // Editing shows the photo side and nothing else: the code is not a thing
  // being changed, and a box that turns to a QR halfway through choosing a
  // picture is a box arguing with you.
  const shownPortrait = editing ? edit.portrait : portrait_url;
  const face = shownPortrait
    ? <img
        src={shownPortrait}
        alt={keeper_name || 'The keeper'}
        draggable={false}
        style={{ objectPosition: editing ? edit.position : (portrait_position || '50% 50%') }}
      />
    : <span className="idc-portrait-empty" />;
  const slotProps = {
    picture: face,
    address: address ? `https://${address}` : '',
    codeSrc,
    backGlyph: <User size={12} weight="bold" />,
    labels: SLOT_LABELS,
  };

  let slot;
  if (editing) {
    const framing = Boolean(edit.portrait);
    // Same box, same size, same place. Only what pressing it does has changed.
    //
    // With no picture the whole box is the way to choose one; with a picture
    // the box is for moving it, so the label shrinks to its own pill and
    // leaves the rest free to drag. A label around the file input rather than
    // a button reaching for one: clicking a label opens its own input with no
    // script and nothing to hold a reference to, and the input stays in the
    // tab order so the box is reachable from a keyboard. image/* is what makes
    // an iPhone offer the camera and the photo library rather than a file
    // browser, which is the whole point — a picture of yourself is on your
    // phone, not at an address you can type.
    slot = (
      <CodeSlot
        {...slotProps}
        turnable={false}
        turned={false}
        className={'idc-portrait idc-portrait--turnable' + (framing ? ' idc-portrait--framing' : '')}
        onPointerDown={framing ? frameStart : undefined}
        onPointerMove={framing ? frameMove : undefined}
        onPointerUp={framing ? frameEnd : undefined}
        onPointerCancel={framing ? frameEnd : undefined}
      >
        {framing && <span className="idc-portrait-hint" aria-hidden="true">Drag to reframe</span>}
        <label className={'idc-portrait-hit' + (framing ? ' idc-portrait-hit--pill' : '')}>
          <input
            className="idc-file"
            type="file"
            accept="image/*"
            onChange={edit.choosePhoto}
            disabled={edit.busy}
          />
          {!framing && (
            <span className="ln-turn-badge" aria-hidden="true">
              <UploadSimple size={12} weight="bold" />
            </span>
          )}
          <span className="idc-portrait-said">
            {edit.busy ? 'Working…' : framing ? 'Replace' : 'Choose a photo'}
          </span>
        </label>
        {framing && (
          <button
            type="button"
            className="ln-turn-badge ln-turn-badge--drop"
            onClick={edit.removePhoto}
            disabled={edit.busy}
            aria-label="Remove the photo"
          >
            <X size={12} weight="bold" aria-hidden="true" />
          </button>
        )}
      </CodeSlot>
    );
  } else if (!portrait_url && !address) {
    // Nothing to show on either face. The box used to print anyway — an
    // empty square with two corner marks, the first thing on a new copy's
    // card and the thing that made it look broken. Absent instead; the
    // editor still draws it, because there it is the way to choose a photo.
    slot = null;
  } else if (!canTurnSlot) {
    slot = <CodeSlot {...slotProps} turnable={false} turned={slotCode} className="idc-portrait" />;
  } else {
    slot = <CodeSlot {...slotProps} turned={slotCode} onTurn={setSlotCode} className="idc-portrait" />;
  }

  // An eye, for a line that is counted and therefore cannot be written but can
  // be left off. Drawn only while editing.
  const eyeFor = key => editing && (
    <button
      type="button"
      className="idc-eye"
      onClick={() => edit.toggleHidden(key)}
      aria-pressed={edit.hidden.has(key)}
      aria-label={edit.hidden.has(key) ? 'Show this on the card' : 'Leave this off the card'}
    >
      {edit.hidden.has(key)
        ? <EyeSlash size={12} weight="regular" aria-hidden="true" />
        : <Eye size={12} weight="regular" aria-hidden="true" />}
    </button>
  );

  const off = key => (editing && edit.hidden.has(key) ? ' idc-off' : '');

  // ── The tools stay in the header when the header goes ───────────────────
  // Miyel, 2026-09-20: "the toolbar needs to stay in the header on scroll."
  // This row is the first thing on a pane that scrolls, so a screen into the
  // card the only door it has — Edit, Share, Settings — was above the window,
  // and the way back to it was to scroll the whole card up again.
  //
  // Sticky was the obvious answer and cannot work here: a sticky element is
  // held by its own containing block, which is the card object, and the card
  // object ends where the writing starts. It would let go a third of the way
  // down the page.
  //
  // So the row moves into the cross's bar instead, which is the header that
  // is already fixed up there, by the same trick a layer uses for its own
  // header (LayerEntry.js): a slot element of this component's making, put in
  // the bar and drawn into from here. One row, in one of two places, never
  // both — so the drawer's state, the editing buttons and everything else
  // about it exist once.
  //
  // Phones only, and the width is the question rather than the bar: the bar
  // exists on a desk too, where it sits over the *journal* and this card is
  // the left page. Tools posted into it there would be a door to one page
  // standing on another.
  const [barSlot, setBarSlot] = useState(null);
  useEffect(() => {
    const narrow = window.matchMedia('(max-width: 768px)');
    let slot = null;
    const fit = () => {
      const bar = document.querySelector('.hn-bar');
      if (narrow.matches && bar && !slot) {
        slot = document.createElement('div');
        slot.className = 'hn-bar-tools';
        bar.appendChild(slot);
        setBarSlot(slot);
      } else if ((!narrow.matches || !bar) && slot) {
        slot.remove();
        slot = null;
        setBarSlot(null);
      }
    };
    fit();
    narrow.addEventListener('change', fit);
    return () => {
      narrow.removeEventListener('change', fit);
      if (slot) slot.remove();
      setBarSlot(null);
    };
  }, []);

  // Whether this card's own header has gone under the bar. Measured against
  // the bar's own bottom edge rather than a number, so the notch is in it.
  const headRef = useRef(null);
  const [headGone, setHeadGone] = useState(false);
  useEffect(() => {
    const head = headRef.current;
    const bar = document.querySelector('.hn-bar');
    const scroller = head?.closest('.hn-pane');
    if (!head || !bar || !scroller) return undefined;
    const look = () => {
      setHeadGone(head.getBoundingClientRect().bottom <= bar.getBoundingClientRect().bottom);
    };
    look();
    scroller.addEventListener('scroll', look, { passive: true });
    return () => scroller.removeEventListener('scroll', look);
  }, []);

  const inBar = Boolean(barSlot && headGone);

  const toolsRow = authed && (editing ? (
    <>
      <button
        type="button"
        className="idc-tool idc-tool--keep"
        onClick={edit.save}
        disabled={edit.saving || edit.busy}
        aria-label="Save this card"
        title="Save"
      >
        <Check size={18} weight="regular" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="idc-tool"
        onClick={edit.cancel}
        disabled={edit.saving}
        aria-label="Stop editing without saving"
        title="Cancel"
      >
        <X size={18} weight="regular" aria-hidden="true" />
      </button>
    </>
  ) : (
    <KeeperTools what="card" onEdit={edit.begin} />
  ));

  // Whether each counted line has anything left on it. `showing` is the
  // keeper's own answer and is always true while editing, so the eye that
  // turns a line off is still reachable on the line it turned off.
  //
  // These were computed and then not asked, 2026-09-20: the counts drew on
  // "is there anything to count" alone and the genres drew on nothing at all,
  // so the eyes saved a preference that no reader's card ever read. Miyel:
  // "albums masterpieces and formative hiding option doesn't work... I think
  // genres should be hideable."
  const showCounts = (records !== null || marks.length > 0) && showing('albums');
  const showGenres = genres.length > 0 && showing('genres');
  const showSince = Boolean(since) && showing('since');

  // The photograph used to be lifted down the column by a measured spacer, to
  // land on exactly the same line as the beacon's album art on the other face
  // of the cover. There is no other face — the flip is gone — and the two
  // squares line up now by construction rather than by arithmetic: every pane
  // of the cross opens with the same mark at the same height, and the square
  // is the first thing under it. So the measurement, its ResizeObserver and
  // the spacer it fed all came out. See HomeNav.js for the crown that replaced
  // them.

  // Whether the soft bottom edge is telling the truth — see the note by the
  // measurement below.
  const [more, setMore] = useState(false);
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const check = () => setMore(el.scrollHeight - el.clientHeight - el.scrollTop > 2);
    check();
    el.addEventListener('scroll', check, { passive: true });
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', check);
      observer.disconnect();
    };
    // The counted rows arrive after the first paint and change how tall the
    // column is, so the measurement has to be taken again when they land.
  }, [stamps, records, since, editing]);

  return (
    <section className="idc" aria-label="About this journal">

      <div
        ref={innerRef}
        className={'idc-inner' + (more ? ' idc-inner--more' : '')}
      >
        {/* ── The header ───────────────────────────────────────────────────
            The mark in the middle, and one ··· at the right. No loose icons
            in a header still holds — a pencil and a printer sitting in the
            corner are what made this read as a toolbar — but a single mark
            that opens is not a row of tools, it is a door, and the entry next
            door already has exactly this one (Miyel, 2026-09-15). The same
            component draws both: KeeperTools.js.

            A visitor still sees a header with nothing in it but the mark. The
            ··· is the keeper's, and so is everything behind it.

            Save and Cancel are the exception and are not behind anything:
            they belong to a mode you entered on purpose and are gone the
            moment it ends, and a correction with no visible way to keep or
            abandon it is worse than a tidy header. Nothing here is a
            permission check — the writing endpoints check the wristband
            whatever is drawn. */}
        {inBar && createPortal(<div className="idc-tools">{toolsRow}</div>, barSlot)}

        <div className="idc-head" ref={headRef}>
          <svg
            viewBox={`${MARK_BOX.x} ${MARK_BOX.y} ${MARK_BOX.w} ${MARK_BOX.h}`}
            className="idc-mark"
            role="img"
            aria-label={cover_name}
          >
            {MARK_GLYPHS.map(glyph => (
              <path key={glyph.transform} d={glyph.d} transform={glyph.transform} />
            ))}
            <circle
              cx={MARK_DOT.cx}
              cy={MARK_DOT.cy}
              r={MARK_DOT.r}
              className={'hp-logo-mark-dot' + (isLive ? ' hp-logo-mark-dot--live' : '')}
            />
          </svg>

          <div className="idc-tools">{inBar ? null : toolsRow}</div>
        </div>

        {/* ── The object ───────────────────────────────────────────────────
            The portrait, full width and square, which makes it the same
            object an entry's album art is in the pane next door — a record
            there, a person here, measured the same (Miyel's brief,
            2026-09-15). The panes read as disjointed while the beacon and the
            entry had a square and this had a column of facts.

            Both 4:3 crops were tried against the real photograph and both
            lose: the clouds around the shoulders are doing real work and a
            shallower crop takes them. The photograph is the point and the
            writing starting below the fold is the trade, taken on purpose.

            The code stays in its corner, a little larger now that there is a
            photograph to carry it. */}
        <div className="idc-photo">{slot}</div>

        {/* The name, and under it how long. It shared this line with Send and
            Add until 2026-09-19; both are at the foot of the beacon now, where
            a visitor lands, and the note above pressAdd's old home says why
            they are not in two places. */}
        <div className="idc-ident">
          <div className="idc-ident-said">
            {(editing || cover_name) && (
              <h1 className="idc-name">
                {editing
                  ? <input
                      className="idc-name-input"
                      type="text"
                      value={edit.name}
                      onChange={e => edit.setName(e.target.value)}
                      placeholder="Your name"
                      aria-label="Name"
                    />
                  : cover_name}
              </h1>
            )}
            {showSince && (
              <p className={'idc-keeping' + off('since')}>
                Keeping since {since}{eyeFor('since')}
              </p>
            )}
          </div>

        </div>

        {/* ── Three counts ─────────────────────────────────────────────────
            How many records, how many were masterpieces, how many were
            formative — each in its own flag's colour, which is the first job
            those three tokens have had outside a mark on a record. Counts say
            how somebody listens in a way a genre list never does; the genres
            are still here, one line of them, below the fold.

            Typeset, not stamped. Stamps were tried the hour before and the
            answer is that with a photograph that size above them the photo is
            already the flourish. */}
        {showCounts && (
          <div className={'idc-counts' + off('albums')}>
            {counts.map(c => (
              c.opens ? (
                <button
                  key={c.word}
                  type="button"
                  className={'idc-count idc-count--' + c.word + (openCount === c.word ? ' idc-count--open' : '')}
                  onClick={() => onOpenCount(openCount === c.word ? null : c.word)}
                  aria-expanded={openCount === c.word}
                  title={`The ${c.n} records marked ${c.word === 'masterpieces' ? 'a masterpiece' : 'formative'}`}
                >
                  <b className="idc-count-n">{c.n}</b>
                  <span className="idc-count-word">{c.word}</span>
                </button>
              ) : (
                <div key={c.word} className={'idc-count idc-count--' + c.word}>
                  <b className="idc-count-n">{c.n}</b>
                  <span className="idc-count-word">{c.word}</span>
                </div>
              )
            ))}
            {eyeFor('albums')}
          </div>
        )}

        {/* Top genres: one line, under the counts and over the pinned record
            (Miyel, 2026-09-15). It is the last of the counted things — the
            numbers say how somebody listens and this says to what — so it
            belongs with them rather than down in the writing, which is where
            it sat for an hour. Computed, never chosen: what this journal
            listens to, not what its keeper would claim. */}
        {showGenres && (
          <p className={'idc-genres' + off('genres')}>
            <span className="idc-genres-label">Top genres</span>
            <span className="idc-genres-said">{genres.join(' · ')}</span>
            {eyeFor('genres')}
          </p>
        )}

        {/* ── The pinned record ────────────────────────────────────────────
            One album from the journal, as art, with its name beside it — the
            only image here besides the photograph (DECISIONS). On the same
            left edge as everything above it: it was the one centred row on
            the pane.

            While a correction is open it is a button rather than a link: the
            same art and the same two lines, but pressing it opens the search
            instead of going to the album. And it prints even when nothing is
            pinned, which it does not otherwise — an empty row is how an owner
            finds out the card can hold one at all. */}
        {(pinned || editing) && (
          editing ? (
            <button type="button" className="idc-pinned idc-pinned--pick" onClick={onPickPin}>
              {/* A pin rather than the word PINNED, beside the art (Miyel,
                  2026-09-15). The label was a third line of small caps over
                  an album and an artist, saying what the mark says in one
                  glyph. The word survives where it is actually needed — in
                  the row's own label, for anybody who cannot see the pin. */}
              <PushPin size={15} weight="fill" className="idc-pinned-mark" aria-hidden="true" />
              <span className="idc-pinned-art">
                {pinned?.album_art
                  ? <img src={pinned.album_art} alt="" />
                  : <span className="idc-pinned-none" aria-hidden="true">♪</span>}
              </span>
              <span className="idc-pinned-said">
                <span className="idc-pinned-album">{pinned ? pinned.album : 'Choose a record'}</span>
                <span className="idc-pinned-artist">{pinned ? pinned.artist : 'Nothing pinned'}</span>
              </span>
            </button>
          ) : (
            <Link
              href={`/entries/${pinned.slug}`}
              className="idc-pinned"
              aria-label={`Pinned: ${pinned.album} — ${pinned.artist}`}
              /* One record, and no wall behind it. This pane is a snapshot of
                 a person, not a second journal — see handoff.js. */
              onClick={() => arrivingAlone()}
            >
              <PushPin size={15} weight="fill" className="idc-pinned-mark" aria-hidden="true" />
              <span className="idc-pinned-art">
                {pinned.album_art
                  ? <img src={pinned.album_art} alt="" />
                  : <span className="idc-pinned-none" aria-hidden="true">♪</span>}
              </span>
              <span className="idc-pinned-said">
                <span className="idc-pinned-album">{pinned.album}</span>
                <span className="idc-pinned-artist">{pinned.artist}</span>
              </span>
            </Link>
          )
        )}

        {/* The link rows and the rig rows used to be here, under the button,
            while the card was the only surface an owner could edit. They are
            edited on the pane below now, inside the sections they actually
            print in — a field for something you cannot see while you type into
            it is a field you fill in blind. See About.js. */}
        {/* A quiet *Edit your card* used to sit here, because the header held
            nothing and the only other way in was a row on the desk. The ···
            at the top of the card is that way in now, in the corner every
            other surface keeps its tools in, and a second door a screen below
            it was one more line of writing on a page that is mostly writing
            (Miyel, 2026-09-15). The desk row stays: that is the one you use
            when you are not already here. */}

        {edit.trouble && <p className="idc-trouble">{edit.trouble}</p>}
      </div>

      {/* The rig used to come up from the bottom over this card, and does not
          any more: it is a section of the About pane a screen below, under its
          own heading, in the reading. A drawer over a card is what you build
          when the only surface you have is the card. */}
    </section>
  );
}
