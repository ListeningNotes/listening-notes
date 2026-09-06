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

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, Eye, EyeSlash, Pencil, QrCode, UploadSimple, User, X } from '@phosphor-icons/react';
import QRCode from 'qrcode';
import { useListeningBeacon } from '../../hooks/useListeningBeacon';
import { useBookplate } from './Bookplate';

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

// ── The code ──────────────────────────────────────────────────────────────
// A plain one. It carried the Ln. mark knocked out of the middle for a while,
// which is a nice object and the wrong one for this slot: the mark is already
// at the top of the column, printed larger, and a code has one job.
//
// Losing the mark changes the numbers underneath it. Version 10 at correction
// level H was not carrying the URL — an address this short needs a fraction of
// that — it was carrying the redundancy a hole punched in the middle costs. No
// hole, no need: the encoder picks the smallest version that fits at level M,
// which for an address of this length is a quarter as many modules across the
// same box. Each one ends up several times larger, and a larger module is the
// only thing that actually makes a code easier to read.
//
// Ink and paper stay fixed rather than theme-aware. A camera looks for dark on
// light, and inverting the code for a dark page asks every scanner in the world
// to be one of the ones that cope.
const CODE_QUIET = 4;      // modules of margin, on all four sides
const CODE_INK = '#191917';
const CODE_PAPER = '#f5f4ef';

// Built once per address, at module scope. The two cards on the landing page —
// the desktop markup and the mobile markup — are separate trees asking for the
// same code, and an address only changes if its owner moves house.
const CODE_CACHE = new Map();

function buildCode(url) {
  if (CODE_CACHE.has(url)) return CODE_CACHE.get(url);
  let built = null;
  try {
    const { modules } = QRCode.create(url, { errorCorrectionLevel: 'M' });
    // Whole cells, no inset and no radius: neighbouring modules meet and read
    // as one block, which is what a scanner is looking at. One path rather than
    // a few hundred rects — same picture, one node.
    let d = '';
    for (let row = 0; row < modules.size; row++) {
      for (let col = 0; col < modules.size; col++) {
        if (modules.data[row * modules.size + col]) d += `M${col} ${row}h1v1h-1z`;
      }
    }
    built = { d, size: modules.size };
  } catch {
    // A card with no code on it is still a card; a card that throws while
    // rendering is a blank page.
    built = null;
  }
  CODE_CACHE.set(url, built);
  return built;
}

// A month and a year, never a day. The card says how long the journal has been
// kept, and a precise date invites arithmetic that isn't the point. UTC because
// created_at is a naive column read through a driver that shifts it by the
// reader's own offset — a month is coarse enough that no plausible offset can
// move it, which is the whole reason to print one.
function monthAndYear(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' });
}

// The address, as the thing you point a phone at.
//
// Drawn by hand from the module matrix rather than handed to a hosted code
// service: a service would mean every journal running this software quietly
// telling a third party what its address is, every time somebody opened the
// card. The matrix is computed here and the picture is ours.
function AddressCode({ text }) {
  const code = useMemo(() => buildCode(text), [text]);
  if (!code) return null;

  const span = code.size + CODE_QUIET * 2;
  return (
    <svg
      className="idc-qr"
      viewBox={`${-CODE_QUIET} ${-CODE_QUIET} ${span} ${span}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`Scannable code for ${text}`}
    >
      {/* The quiet zone is part of the code, not padding around it — a scanner
          needs the clear margin to find the edges. Painting it here means the
          code carries its own margin wherever the box puts it. */}
      <rect x={-CODE_QUIET} y={-CODE_QUIET} width={span} height={span} fill={CODE_PAPER} />
      <path d={code.d} fill={CODE_INK} />
    </svg>
  );
}

// `edit` is handed in rather than made here. The prompts print on the About
// pane below this card and are edited there, and one edit session cannot be
// two instances of the hook — so the pane owns it and the card is given it.
export default function IdentityCard({ stamps, authed = false, edit, pinned = null, onPickPin }) {
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
  } = settings;
  const { isLive } = useListeningBeacon();

  // Only ever true for the person who keeps the journal, and only the visible
  // half of that: the writing endpoints check the wristband for themselves.
  const editing = edit.editing;

  const records = stamps?.records ?? null;
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

  const canTurnSlot = Boolean(portrait_url && address);
  const [slotCode, setSlotCode] = useState(!portrait_url && Boolean(address));

  // ── Turning it also puts the address on the clipboard ────────────────────
  // The code is for a phone pointed at the screen, and that only helps
  // somebody standing in front of it. The other half of the time what is
  // wanted is the address itself — to paste into a send form, into a message,
  // into somebody's notes — and reading a QR back into text by hand is not a
  // thing anybody does.
  //
  // So the press does both. The turn is what you asked for and the copy is
  // free, which means it has to say so: a clipboard write with nothing on
  // screen is indistinguishable from a button that did nothing, and that is
  // the whole reason this line exists.
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef(null);
  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  function turnSlot() {
    const showing = !slotCode;
    setSlotCode(showing);
    // Only on the way to the code. Turning back to the portrait is undoing
    // the press, and undoing it should not quietly copy anything.
    if (!showing) return;
    // Absent over plain http and in a browser that has never had it. Nothing
    // to fall back to that is not worse than saying nothing, so the turn
    // simply happens without the line.
    if (!navigator.clipboard?.writeText) return;
    navigator.clipboard.writeText(`https://${address}`).then(() => {
      setCopied(true);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2600);
    }).catch(() => {});
  }

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
  // Built here rather than inline, because inline it was an immediately-called
  // function inside the JSX and everything in one of those counts as render.
  //
  // Editing shows the photo side and nothing else: the code is not a thing
  // being changed, and a box that turns to a QR halfway through choosing a
  // picture is a box arguing with you.
  const showingCode = slotCode && !editing;
  const shownPortrait = editing ? edit.portrait : portrait_url;
  const slotFaces = (
    <>
      <span className={'idc-face-slot' + (showingCode ? '' : ' idc-face-slot--on')} aria-hidden={showingCode}>
        {shownPortrait
          ? <img
              src={shownPortrait}
              alt={keeper_name || 'The keeper'}
              draggable={false}
              style={{ objectPosition: editing ? edit.position : (portrait_position || '50% 50%') }}
            />
          : <span className="idc-portrait-empty" />}
      </span>
      {address && (
        <span
          className={'idc-face-slot idc-face-slot--code'
            + (portrait_code_url ? ' idc-face-slot--photo' : '')
            + (showingCode ? ' idc-face-slot--on' : '')}
          aria-hidden={!showingCode}
        >
          {/* The portrait made into the code, when there is one: the photograph
              fills the dark modules and the page shows through the rest, so
              there is no plate behind it and no frame around it — the ragged
              silhouette is the picture. Rendered with hard pixels, because the
              modules have to stay square at any size. Where no such picture
              could be built, the plain code stands in: a worse picture and a
              working one. */}
          {portrait_code_url
            ? <img className="idc-qr idc-qr--photo" src={portrait_code_url} alt={`Scannable code for ${address}`} />
            : <AddressCode text={`https://${address}`} />}
        </span>
      )}
    </>
  );

  // Showing the code made out of the portrait, the box stops being a box. No
  // stock behind it, no shadow under it and no rounded corner clipping it: the
  // page is the background, which is the whole point of the transparency, and a
  // radius on the clip would take a bite out of the quiet zone.
  const bareSlot = showingCode && Boolean(portrait_code_url);

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
      <div
        className={'idc-portrait idc-portrait--turnable' + (framing ? ' idc-portrait--framing' : '')}
        onPointerDown={framing ? frameStart : undefined}
        onPointerMove={framing ? frameMove : undefined}
        onPointerUp={framing ? frameEnd : undefined}
        onPointerCancel={framing ? frameEnd : undefined}
      >
        {slotFaces}
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
            <span className="idc-portrait-badge" aria-hidden="true">
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
            className="idc-portrait-badge idc-portrait-badge--drop"
            onClick={edit.removePhoto}
            disabled={edit.busy}
            aria-label="Remove the photo"
          >
            <X size={12} weight="bold" aria-hidden="true" />
          </button>
        )}
      </div>
    );
  } else if (!portrait_url && !address) {
    // Nothing to show on either face. The box used to print anyway — an
    // empty square with two corner marks, the first thing on a new copy's
    // card and the thing that made it look broken. Absent instead; the
    // editor still draws it, because there it is the way to choose a photo.
    slot = null;
  } else if (!canTurnSlot) {
    slot = <div className={'idc-portrait' + (bareSlot ? ' idc-portrait--bare' : '')}>{slotFaces}</div>;
  } else {
    slot = (
      <button
        type="button"
        className={'idc-portrait idc-portrait--turnable' + (bareSlot ? ' idc-portrait--bare' : '')}
        onClick={turnSlot}
        aria-pressed={slotCode}
        aria-label={slotCode ? 'Show the portrait' : 'Show the code for this address'}
      >
        {slotFaces}
        <span className="idc-portrait-badge" aria-hidden="true">
          {slotCode ? <User size={12} weight="bold" /> : <QrCode size={12} weight="bold" />}
        </span>
      </button>
    );
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

  // Whether the counted line under the name has anything left on it.
  const showAlbums = records != null && showing('albums');
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
        <div className="idc-head">
          {/* The site's own mark, small and in the corner. The dot on its
              period is lit while something is playing — the same fact the
              front of the cover carries, and the only thing on this side
              that moves. */}
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

          {/* Signed in, the card has this and nothing else it did not have
              before. Signed out it is not in the page at all, and the writing
              endpoints check the wristband regardless of what is drawn here. */}
          {authed && (
            <div className="idc-tools">
              {editing ? (
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
                <button
                  type="button"
                  className="idc-tool"
                  onClick={edit.begin}
                  aria-label="Edit this card"
                  title="Edit this card"
                >
                  <Pencil size={18} weight="regular" aria-hidden="true" />
                </button>
              )}
            </div>
          )}
        </div>

        {slot}

        {/* Only on a card where the press does something. A card with no
            address cannot copy one, and reserving a line on every card for a
            message that can never appear there would change the height of the
            card for nothing.

            Where it does exist the line is held open empty, so the name below
            does not jump down and back as it comes and goes. And the words
            themselves are added and removed rather than faded, because that is
            what makes role="status" read them out — a message that is always
            in the page and merely invisible is a message a screen reader has
            already been past. */}
        {canTurnSlot && (
          <p className="idc-copied" role="status">
            {copied ? 'Copied \u2014 paste it anywhere' : ''}
          </p>
        )}

        {/* cover_name, not keeper_name: this is the one place a person is
            reading the name, so it is allowed to be the ornamented one. The
            input beside it still edits keeper_name — see the note in
            IdentificationCardEditor. */}
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

        {/* The four facts, in one table. These two used to be a single small
            centred line under the name — "39 albums logged · Logging since
            March 2026" — set differently from the genres and the ask
            underneath them, which made four facts about one person read as two
            kinds of thing. They are the same kind of thing: a label and an
            answer. Now they are laid out like it, and the card is a glance at
            somebody before the reading starts below it. */}
        {showAlbums && (
          <p className={'idc-line' + off('albums')}>
            <span className="idc-line-label">Albums logged</span>
            <span className="idc-line-value">{records}</span>
            {eyeFor('albums')}
          </p>
        )}

        {showSince && (
          <p className={'idc-line' + off('since')}>
            <span className="idc-line-label">Logging since</span>
            <span className="idc-line-value">{since}</span>
            {eyeFor('since')}
          </p>
        )}


        {/* The bio used to sit here and does not any more. It was a paragraph
            about the keeper printed two hundred pixels above a longer, better
            paragraph about the keeper — the about writing runs directly under
            this card now, so the card was introducing what the next screen was
            about to say, in the keeper's own words, twice.
            What is left is a glance: a face, a name, four facts and the ways
            to reach them. The reading is below. */}

        {/* Labelled, and shaped like the ask directly under it. Unlabelled it
            was three words floating between the bio and the request with
            nothing saying what they were — a reader could as easily have taken
            them for the genres being asked for as the genres being played,
            which is precisely the distinction the pair exists to draw. */}
        {genres.length > 0 && showing('genres') && (
          <p className={'idc-line' + off('genres')}>
            <span className="idc-line-label">Top genres</span>
            <span className="idc-line-value">{genres.join(' · ')}</span>
            {eyeFor('genres')}
          </p>
        )}

        {/* ── The pinned record ────────────────────────────────────────────
            One album from the journal, as art, with its name beside it. It is
            the only image on this card besides the portrait and the reason the
            card does not read as all type and numbers — a face, three counted
            facts, and the record somebody is holding up.
            One, and the shape is the rule rather than a check: pinned_entry_id
            is a single column, so pinning a second unpins the first, and its
            foreign key clears the pin if the entry is ever deleted.
            Chosen here, from the card's own editor, because pinned_entry_id
            is a settings column like every other field on this card. It was
            pinned from the entry for one afternoon, on the argument that you
            recognise a record where you would have to remember it — true, and
            not worth an admin button sitting in the middle of the reading.

            While a correction is open the row is a button rather than a link:
            the same art and the same two lines, but pressing it opens the
            search instead of going to the album. And it prints even when
            nothing is pinned, which it does not otherwise — an empty row is
            how an owner finds out the card can hold one at all. */}
        {(pinned || editing) && (
          <p className="idc-line idc-pin-row">
            <span className="idc-line-label">Pinned album</span>
            {editing ? (
              <button type="button" className="idc-pin idc-pin--pick" onClick={onPickPin}>
                <span className="idc-pin-art">
                  {pinned?.album_art
                    ? <img src={pinned.album_art} alt="" />
                    : <span className="idc-pin-none" aria-hidden="true">♪</span>}
                </span>
                <span className="idc-pin-said">
                  <span className="idc-pin-album">{pinned ? pinned.album : 'Choose a record'}</span>
                  <span className="idc-pin-artist">{pinned ? pinned.artist : 'Nothing pinned'}</span>
                </span>
              </button>
            ) : (
              <Link
                href={`/entries/${pinned.slug}`}
                className="idc-pin"
                aria-label={`${pinned.album} — ${pinned.artist}`}
              >
                <span className="idc-pin-art">
                  {pinned.album_art
                    ? <img src={pinned.album_art} alt="" />
                    : <span className="idc-pin-none" aria-hidden="true">♪</span>}
                </span>
                <span className="idc-pin-said">
                  <span className="idc-pin-album">{pinned.album}</span>
                  <span className="idc-pin-artist">{pinned.artist}</span>
                </span>
              </Link>
            )}
          </p>
        )}

        {/* ── The one thing to do ──────────────────────────────────────────
            The rig's mark and the keeper's links used to stand in a row beside
            this button. Both have somewhere better to be: the rig is a section
            of the About pane a screen below, and the links sit at the foot of
            that same reading, where somebody who has just read about a person
            might want to go and find them. What is left here is the single
            action the card is for, which is why it can have the row to
            itself. */}
        <div className="idc-row" inert={editing ? true : undefined}>
          <Link href="/submit" className="ln-pill idc-send">Send an album</Link>
        </div>

        {/* The link rows and the rig rows used to be here, under the button,
            while the card was the only surface an owner could edit. They are
            edited on the pane below now, inside the sections they actually
            print in — a field for something you cannot see while you type into
            it is a field you fill in blind. See About.js. */}
        {edit.trouble && <p className="idc-trouble">{edit.trouble}</p>}
      </div>

      {/* The rig used to come up from the bottom over this card, and does not
          any more: it is a section of the About pane a screen below, under its
          own heading, in the reading. A drawer over a card is what you build
          when the only surface you have is the card. */}
    </section>
  );
}
