// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// components/main_components/InviteSheet.js
// Inviting somebody to make a journal of their own: a code to the front
// door, for a friend standing right there. Give until 2026-10-21, when
// anyone could start a journal at the front door and a gift became an
// invitation (Miyel: "it doesn't feel like a gift anymore"; her words,
// Invite and the ticket).
//
// ── Two audiences, two routes ─────────────────────────────────────────────
// A stranger finds the front door by themselves. A keeper already has the
// pitch — their own journal, in their hand — and what they need is a fast
// way to hand the front door to somebody who is looking at it. So this is a
// sheet, not a tab and not a pane, and the band stays four for keepers. It
// opens from the ticket at the left of the book's header, opposite Add, and
// only there (Miyel, 2026-09-22): Add and Invite are the same errand,
// putting somebody in touch, and they face each other across the book's
// name.
//
// ── What the code carries ─────────────────────────────────────────────────
// The front door's Choose your address, because there is exactly one place
// the software comes from, and `?invite=` with this journal's address —
// never `?from=`, which every page already reads as the *reader's* own
// journal and would file on the friend's phone as theirs (DECISIONS,
// 2026-09-22). The front door says who invited them and hands the inviter
// on to the new journal's setup, which offers to add them and wave. Links
// made before say `?gift=`, and are read the same (inviterIn).
//
// ── What it never shows ───────────────────────────────────────────────────
// A count of how many people you have invited, or who came. An invitation
// is an invitation, not a referral scheme.
//
// The sheet is the send sheet's — its scrim, its rise from the foot, its pull
// strip and its numbers (SendSheet.js) — so it opens and puts itself away
// exactly as that one does, and there is nothing to type, so none of that
// sheet's keyboard machinery.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy, Export, Ticket } from '@phosphor-icons/react';
import { useBookplate } from './Bookplate';
import AddressCode from './AddressCode';
import { tidyJournal } from '../../library/return_address';

// Fixed, like the pitch pane's Get one was: a copy that could point this
// somewhere else could quietly stand in for the original. The front door
// itself, at the bare domain — www.'s /get is sent there, and a code that
// goes straight is one hop shorter on a phone's camera.
const GET = 'https://listeningnotes.blog/get';

// The layer's numbers, by name and by value — see SendSheet.js.
const FAR_ENOUGH = 0.2;
const FAST_ENOUGH = 0.3;

export default function InviteSheet({ open, onClose }) {
  const { site_address } = useBookplate();
  const journal = tidyJournal(site_address);
  const link = journal ? `${GET}?invite=${encodeURIComponent(journal)}` : GET;

  // A tick and "Link copied" in place of the glyph and the words for a
  // moment (Miyel, 2026-09-22) — a silent clipboard write reads as a button
  // that did nothing (DECISIONS). Back after two seconds, for a second copy.
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(false), 2000);
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

  // ── The band steps down while this is up ────────────────────────────────
  // One row at the foot of the screen at a time, as for the send sheet: on a
  // phone the band was standing over Copy link (Miyel, 2026-09-22). An
  // attribute and not a class, because the cross's class list is React's and
  // is rewritten whole on every render (SendSheet.js has the history).
  useEffect(() => {
    if (!open) return undefined;
    const cross = document.querySelector('.hn');
    cross?.toggleAttribute('data-giving', true);
    return () => cross?.removeAttribute('data-giving');
  }, [open]);

  // ── Where the visible window actually is ────────────────────────────────
  // The send sheet's, for the same reason: a fixed sheet is fixed to the
  // layout viewport, and in a home-screen install that is not the part of
  // the screen you can see. visualViewport says where that part is, so the
  // sheet is inset to match it — zero whenever nothing is in the way.
  useEffect(() => {
    if (!open) return undefined;
    const vv = window.visualViewport;
    const sheet = sheetRef.current;
    if (!vv || !sheet) return undefined;
    const sync = () => {
      const room = document.documentElement.clientHeight || window.innerHeight;
      sheet.style.setProperty('--sn-bottom', `${Math.max(0, Math.round(room - vv.offsetTop - vv.height))}px`);
      sheet.style.setProperty('--sn-room', `${Math.round(vv.height)}px`);
    };
    sync();
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
    };
  }, [open]);

  if (!open) return null;

  // One button, 2026-09-23: the phone's own share sheet, which already holds
  // Copy and Messages and the rest, so a Copy link beside it said the same
  // thing twice (Miyel). Where there is no share sheet — a laptop, mostly —
  // Copy link stands in, rather than a button that does nothing.
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <>
      <div className="sn-scrim" onClick={shut} aria-hidden="true" />
      <section
        ref={sheetRef}
        className="sn-sheet gv-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Invite someone"
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
        {/* The classes are the sheet's from when it was Give's (gv-). */}
        <Ticket size={30} weight="regular" className="gv-glyph" aria-hidden="true" />
        {/* Miyel, 2026-10-21: "Invite someone", over "Gift someone a
            journal" (2026-09-22), over the brief's "Give someone their own". */}
        <h2 className="gv-head">Invite someone</h2>
        {/* The code carries the inviter to the front door, the front door
            hands them on to the new journal's setup, and setup offers to add
            them, ticked. "Address book" and not the brief's "book" (Miyel,
            2026-09-23). */}
        <p className="gv-line">Point their camera here. When they set it up, you&rsquo;ll be the first person in their address book.</p>

        {/* Large and on white, whatever the theme: a camera looks for dark on
            light (AddressCode). The plate is the white; the code draws none. */}
        <div className="gv-code">
          <AddressCode text={link} paper={null} />
        </div>

        <div className="gv-acts">
          {canShare ? (
            <button
              type="button"
              className="gv-act"
              onClick={() => { navigator.share({ title: 'Listening Notes', url: link }).catch(() => {}); }}
            >
              <Export size={18} weight="regular" aria-hidden="true" />
              Share
            </button>
          ) : (
            <button
              type="button"
              className="gv-act"
              onClick={() => {
                navigator.clipboard?.writeText(link).then(() => setCopied(true), () => {});
              }}
            >
              {copied
                ? <Check size={18} weight="regular" aria-hidden="true" />
                : <Copy size={18} weight="regular" aria-hidden="true" />}
              <span aria-live="polite">{copied ? 'Link copied' : 'Copy link'}</span>
            </button>
          )}
        </div>
      </section>
    </>
  );
}
