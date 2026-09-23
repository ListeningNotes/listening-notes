// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// components/main_components/GiveSheet.js
// Giving somebody their own: a code to /get, for a friend standing right
// there (Miyel's brief, About, /get and Give, §3).
//
// ── Two audiences, two routes ─────────────────────────────────────────────
// A stranger gets the pitch from a journal's About pane. A keeper already has
// the pitch — their own journal, in their hand — and what they need is a fast
// way to hand /get to somebody who is looking at it. So this is a sheet, not
// a tab and not a pane, and the band stays four for keepers. It opens from
// the book's header beside Add, and only there: the brief put a second door
// on the card, and Miyel kept the one (2026-09-22) — Add and Give are the
// same errand, putting somebody in touch, and they stand together.
//
// ── What the code carries ─────────────────────────────────────────────────
// listeningnotes.blog/get, because there is exactly one place the software
// comes from, and `?gift=` with this journal's address — never `?from=`,
// which every page already reads as the *reader's* own journal and would
// file on the friend's phone as theirs (DECISIONS, 2026-09-22). Nothing reads
// the gift yet: the first friend is the brief's next step, and until it is
// built the line below promises nothing about it.
//
// ── What it never shows ───────────────────────────────────────────────────
// A count of how many people you have given it to, or who used it. The gift
// is a gift, not a referral scheme.
//
// The sheet is the send sheet's — its scrim, its rise from the foot, its pull
// strip and its numbers (SendSheet.js) — so it opens and puts itself away
// exactly as that one does, and there is nothing to type, so none of that
// sheet's keyboard machinery.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, Export, Gift } from '@phosphor-icons/react';
import { useBookplate } from './Bookplate';
import AddressCode from './AddressCode';
import { tidyJournal } from '../../library/return_address';

// Fixed, like the pitch pane's Get one: a copy that could point this
// somewhere else could quietly stand in for the original.
const GET = 'https://www.listeningnotes.blog/get';

// The layer's numbers, by name and by value — see SendSheet.js.
const FAR_ENOUGH = 0.2;
const FAST_ENOUGH = 0.3;

export default function GiveSheet({ open, onClose }) {
  const { site_address } = useBookplate();
  const journal = tidyJournal(site_address);
  const link = journal ? `${GET}?gift=${encodeURIComponent(journal)}` : GET;

  // "Copied" in place of the words for a moment — a silent clipboard write
  // reads as a button that did nothing (DECISIONS).
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  // Every way out comes through here, so the sheet is put back as it goes
  // rather than tidied after it has gone.
  const shut = useCallback(() => { setCopied(false); onClose?.(); }, [onClose]);

  // ── The pull ── the send sheet's, line for line: from a strip across the
  // top of the sheet, downwards only, a fifth of the way or a flick.
  const sheetRef = useRef(null);
  const [dragY, setDragY] = useState(0);
  const [held, setHeld] = useState(false);
  const pull = useRef(null);

  function grab(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pull.current = { y: event.clientY, at: event.timeStamp };
    setHeld(true);
    try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch { /* no capture, still a pull */ }
  }
  function move(event) {
    if (!pull.current) return;
    setDragY(Math.max(0, event.clientY - pull.current.y));
  }
  function release(event) {
    const from = pull.current;
    pull.current = null;
    setHeld(false);
    if (!from) return;
    const dy = Math.max(0, event.clientY - from.y);
    const ms = Math.max(1, event.timeStamp - from.at);
    const tall = sheetRef.current?.offsetHeight || window.innerHeight;
    setDragY(0);
    if (dy > tall * FAR_ENOUGH || dy / ms > FAST_ENOUGH) shut();
  }

  // Escape closes, like every other layer here.
  useEffect(() => {
    if (!open) return undefined;
    const key = e => { if (e.key === 'Escape') shut(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [open, shut]);

  if (!open) return null;

  // The phone's own share sheet where there is one; a laptop without it
  // gets Copy link alone rather than a button that does nothing.
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <>
      <div className="sn-scrim" onClick={shut} aria-hidden="true" />
      <section
        ref={sheetRef}
        className="sn-sheet gv-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Give someone their own"
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: held ? 'none' : undefined } : undefined}
      >
        <div
          className="sn-pull"
          onPointerDown={grab}
          onPointerMove={move}
          onPointerUp={release}
          onPointerCancel={release}
          aria-hidden="true"
        />
        <Gift size={30} weight="regular" className="gv-glyph" aria-hidden="true" />
        <h2 className="gv-head">Give someone their own</h2>
        {/* A plain line until the first friend is built. The brief's line —
            "when they set it up, you'll be the first person in their book" —
            is a promise a new copy cannot keep yet: nothing reads the gift. */}
        <p className="gv-line">Point their camera here. It opens the steps to their own copy.</p>

        {/* Large and on white, whatever the theme: a camera looks for dark on
            light (AddressCode). The plate is the white; the code draws none. */}
        <div className="gv-code">
          <AddressCode text={link} paper={null} />
        </div>

        <div className="gv-acts">
          <button
            type="button"
            className="gv-act"
            onClick={() => {
              navigator.clipboard?.writeText(link).then(() => setCopied(true), () => {});
            }}
          >
            <Copy size={18} weight="regular" aria-hidden="true" />
            {copied ? 'Copied' : 'Copy link'}
          </button>
          {canShare && (
            <button
              type="button"
              className="gv-act"
              onClick={() => { navigator.share({ title: 'Listening Notes', url: link }).catch(() => {}); }}
            >
              <Export size={18} weight="regular" aria-hidden="true" />
              Share
            </button>
          )}
        </div>
      </section>
    </>
  );
}
