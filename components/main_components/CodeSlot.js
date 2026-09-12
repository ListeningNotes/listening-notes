// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/CodeSlot.js
// A square that holds a picture and turns into that picture's code.
//
// The card's portrait and an entry's cover do the same thing when pressed:
// the picture cross-fades to a code for an address, the address goes on the
// clipboard, a pill says so for a moment, and a small mark in the corner
// says the square turns. It was written twice — three times, counting the
// entry's desk-sized hero — and the copies had already started to differ,
// which is how the pill ended up with two hold times. This is the one
// definition, 2026-09-12, on Miyel's call.
//
// ── What the caller owns ──────────────────────────────────────────────────
// The box: its size, frame and radius come in on `className` (and `style`),
// because a portrait is 180px on a card and a cover is a screen wide on a
// phone. The picture itself comes in as `picture`, drawn however the surface
// needs it drawn — the card positions its photograph, the cover decodes
// synchronously so the layer never blinks. Whether it is turned is the
// caller's state too (`turned`, `onTurn`): the entry page grows the desk's
// box while the code shows, and a card with no photograph starts on its
// code. Anything else the surface wants over the square — the card's
// editing controls — comes in as children.
//
// ── What this owns ────────────────────────────────────────────────────────
// The two faces and their fade; the copy and its pill; the corner mark; the
// frame coming off while a code shows; and the wait. A pressed picture
// arrives from the server (`codeSrc`), and until it does the picture
// breathes, so the tap is seen to have landed without anything else on
// screen changing — Miyel's call over a plain code drawn at once. If the
// picture cannot be had, or there is none, a plain code stands in: drawn on
// the press's own grid, bare, in the page's ink, so something scannable
// always ships (AddressCode).
//
// ── Turning it copies the address, on the way to the code only ────────────
// The code is for a phone pointed at the screen; the rest of the time what
// is wanted is the address, to paste somewhere. So the turn does both, and
// says so: a clipboard write with nothing on screen is a button that did
// nothing. Turning back is undoing the press and copies nothing.

'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { QrCode } from '@phosphor-icons/react';
import QRCode from 'qrcode';
import AddressCode from './AddressCode';
import { CODE_QUIET, LEAST_VERSION } from '../../library/code_shape';

// How long the pill stays. 2.6s until 2026-09-12; a bit shorter on Miyel's
// call — long enough to read five words, short enough not to sit over the
// code while a phone is being pointed at it.
const COPIED_MS = 1800;

const DEFAULT_LABELS = { toCode: 'Show the code for this address', toPicture: 'Show the picture' };

// How much wider than the square the code's file is drawn, so the code
// itself fills the square and the quiet zone hangs off the edges, where the
// page is anyway. The file is the code plus its margin; the code's size
// follows the address, through the same encoder the press uses.
function spanOf(address) {
  if (!address) return 1;
  try {
    const least = 17 + LEAST_VERSION * 4;
    const size = Math.max(least, QRCode.create(address, { errorCorrectionLevel: 'H' }).modules.size);
    return (size + CODE_QUIET * 2) / size;
  } catch {
    return 1;
  }
}

export default function CodeSlot({
  className = '',
  style,
  picture,
  address = '',
  codeSrc = '',
  turned = false,
  onTurn,
  turnable = true,
  backGlyph = null,
  labels = DEFAULT_LABELS,
  children,
  ...rest
}) {
  // 'pressing' while the server's picture is on its way, 'pressed' once it
  // is on screen, 'plain' when there is none to wait for or it failed. A
  // picture that arrives later — the card's, after its owner's first press
  // — moves a plain slot back to waiting; a picture that merely changes
  // address (the dark page's file, a corrected cover) swaps in place.
  const [codeState, setCodeState] = useState(codeSrc ? 'pressing' : 'plain');
  const [srcFor, setSrcFor] = useState(codeSrc);
  if (srcFor !== codeSrc) {
    setSrcFor(codeSrc);
    if (!codeSrc) setCodeState('plain');
    else if (codeState === 'plain') setCodeState('pressing');
  }
  // The code face is drawn only once it has been asked for: most covers are
  // never turned, and a picture nobody asked for is a request nobody wanted.
  const [asked, setAsked] = useState(turned);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef(null);
  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  function turn() {
    const showing = !turned;
    onTurn?.(showing);
    if (!showing) return;
    setAsked(true);
    // Absent over plain http and in a browser that has never had it; the
    // turn simply happens without the line.
    if (!navigator.clipboard?.writeText) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), COPIED_MS);
    }).catch(() => {});
  }

  const span = useMemo(() => spanOf(address), [address]);
  const pressedOn = turned && codeState === 'pressed';
  const plainOn = turned && codeState === 'plain';
  const showingCode = pressedOn || plainOn;
  const pressing = turned && codeState === 'pressing';

  const Root = turnable ? 'button' : 'div';
  return (
    <Root
      className={'ln-slot' + (turnable ? ' ln-slot--turnable' : '') + (showingCode ? ' ln-slot--bare' : '') + (className ? ' ' + className : '')}
      style={style}
      type={turnable ? 'button' : undefined}
      onClick={turnable ? turn : undefined}
      aria-pressed={turnable ? turned : undefined}
      aria-label={turnable ? (turned ? labels.toPicture : labels.toCode) : undefined}
      {...rest}
    >
      <span
        className={'ln-slot-picture' + (showingCode ? ' ln-slot-picture--off' : '') + (pressing ? ' ln-slot-picture--pressing' : '')}
        aria-hidden={showingCode}
      >
        {picture}
      </span>
      {(asked || turned) && address && (
        <span
          className={'ln-slot-code' + (showingCode ? ' ln-slot-code--on' : '')}
          style={{ '--ln-code-span': span }}
          aria-hidden={!showingCode}
        >
          {/* Two pictures of one code, on one grid — same encoder, same
              level, same floor — so the pressed one fades in exactly over
              the plain one's modules. */}
          <AddressCode
            text={address}
            className={'ln-slot-plain' + (plainOn ? ' ln-slot-plain--on' : '')}
            level="H"
            least={LEAST_VERSION}
            ink="currentColor"
            paper={null}
          />
          {codeSrc && codeState !== 'plain' && (
            <img
              className={'ln-slot-pressed' + (pressedOn ? ' ln-slot-pressed--on' : '')}
              src={codeSrc}
              alt={`Scannable code for ${address}`}
              onLoad={() => setCodeState('pressed')}
              onError={() => setCodeState('plain')}
            />
          )}
        </span>
      )}
      {turnable && (
        <span className="ln-turn-badge" aria-hidden="true">
          {turned ? backGlyph : <QrCode size={12} weight="bold" />}
        </span>
      )}
      {/* The words are added and removed rather than faded, because that is
          what makes role="status" read them out — a message always in the
          page and merely invisible is one a screen reader has been past. */}
      {turnable && (
        <span className={'ln-copied' + (copied ? ' ln-copied--on' : '')} role="status">
          {copied ? 'Copied — paste it anywhere' : ''}
        </span>
      )}
      {children}
    </Root>
  );
}
