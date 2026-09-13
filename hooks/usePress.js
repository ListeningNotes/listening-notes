// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// hooks/usePress.js
// The press, as a hook.
//
// The printer was a sheet of its own for a day — a scaled-down preview with
// rows of buttons under it — and it was the wrong shape for the front door
// of the site. Now the entry page's own first screen is the flyer, and what
// is left of the press is this: given a plate and the choices made on the
// page, make the picture at a chosen size, then save it, send it to the
// share sheet, or put the entry's address on the clipboard.
//
// ── The address travels with the picture ─────────────────────────────────
// A print carries no code: a story is viewed on the phone that would have to
// scan it. What carries a reader to the entry is the poster's link sticker,
// so making a print puts the address on the clipboard and says so in the
// cover's words. Copied FIRST, before the picture is drawn: Safari only
// writes the clipboard inside the tap that asked, and drawing takes long
// enough to fall out of that.
'use client';

import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import { FRAMES } from '../components/main_components/SharePrinter';

const COPIED = 'Copied — paste it anywhere';
const COPIED_MS = 2400;

// Whether this browser will take a file into its share sheet — phones will,
// most desktops will not — read as a client fact so the server, which has no
// navigator, hydrates the same markup. Asked once; the answer does not change.
const never = () => () => {};
const onServer = () => false;
let canShareFiles = null;
function probeCanShare() {
  if (canShareFiles === null) {
    try {
      const probe = new File([new Blob([''], { type: 'image/png' })], 'probe.png', { type: 'image/png' });
      canShareFiles = Boolean(navigator.canShare && navigator.canShare({ files: [probe] }));
    } catch {
      canShareFiles = false;
    }
  }
  return canShareFiles;
}

// Canvas cannot read CSS variables and the faces arrive from next/font, so
// the resolved family names are read off elements on the page that wear
// them — the title for the display face, the artist line for the label face.
function readFamilies(fonts) {
  const of = selector => {
    const el = selector && document.querySelector(selector);
    return getComputedStyle(el || document.body).fontFamily;
  };
  return { sans: of(fonts?.sans), mono: of(fonts?.mono) };
}

export function usePress({ plate, shown, ground, isDark, link, fonts }) {
  const [status, setStatus] = useState('');
  // The finished picture, shown on the paper for a phone that has no share
  // sheet to hand it to (a page on plain http gets none): iOS lets a held
  // finger add any picture on a page to Photos, and that works everywhere.
  const [picture, setPicture] = useState(null);
  const timer = useRef(null);
  const canSend = useSyncExternalStore(never, probeCanShare, onServer);

  // The clipboard, two ways: the modern one, which iOS gives only to pages
  // on https, and the old one — select a hidden field and copy — which works
  // on a dev copy over plain http too (Miyel's phone, 2026-09-13: "what does
  // Link do? nothing"). Either way inside the tap that asked.
  const copyLink = useCallback(() => {
    if (!link || typeof navigator === 'undefined') return Promise.resolve(false);
    const oldWay = () => {
      try {
        const field = document.createElement('textarea');
        field.value = link;
        field.setAttribute('readonly', '');
        field.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;font-size:16px';
        document.body.appendChild(field);
        field.focus();
        field.select();
        field.setSelectionRange(0, link.length);
        const done = document.execCommand('copy');
        field.remove();
        return done;
      } catch {
        return false;
      }
    };
    if (!navigator.clipboard) return Promise.resolve(oldWay());
    return navigator.clipboard.writeText(link).then(() => true, () => oldWay());
  }, [link]);
  const say = useCallback((line, ms = COPIED_MS) => {
    setStatus(line);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus(s => (s === line ? '' : s)), ms);
  }, []);

  // The picture: the plate drawn at the paper's size with the page's own
  // choices, no ghosts, no preview — the print itself.
  const compose = useCallback(async frameKey => {
    const frame = FRAMES[frameKey] || FRAMES.story;
    const art = await plate.load({ isDark });
    const out = document.createElement('canvas');
    out.width = frame.w;
    out.height = frame.h;
    const ctx = out.getContext('2d');
    plate.draw(ctx, frame, { art, shown, isDark, families: readFamilies(fonts), ground, preview: false });
    return new Promise((resolve, reject) => {
      out.toBlob(blob => (blob ? resolve(blob) : reject(new Error('empty'))), 'image/png');
    });
  }, [plate, shown, isDark, ground, fonts]);

  const fileName = useCallback(frameKey => {
    const frame = FRAMES[frameKey] || FRAMES.story;
    return `${plate?.fileName || 'print'}-${ground}-${frame.label.replace(':', 'x')}.png`;
  }, [plate, ground]);

  // Save. On a phone that takes a file into its share sheet, the sheet is
  // the way — iOS lets no page write to the camera roll, and the sheet has
  // Save Image one tap away, with Instagram beside it (Miyel, 2026-09-13:
  // a download showed a file preview of a picture already on screen). A
  // phone without the sheet — a page on plain http, like a dev copy on the
  // home network — gets the picture on the paper to hold and add to
  // Photos. A desktop gets a download.
  const save = useCallback(async frameKey => {
    const pasted = copyLink();
    try {
      const blob = await compose(frameKey);
      if (canSend) {
        const file = new File([blob], fileName(frameKey), { type: 'image/png' });
        await navigator.share({ files: [file] });
        if (await pasted) say(COPIED); else setStatus('');
      } else if (navigator.maxTouchPoints > 0) {
        const url = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
        setPicture(url);
        await pasted;
        // Said for as long as the picture is up; dismissing it clears it.
        clearTimeout(timer.current);
        setStatus('Touch and hold the picture to add it to Photos.');
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName(frameKey);
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        if (await pasted) say(COPIED); else setStatus('');
      }
    } catch (error) {
      // Cancelling the share sheet rejects, and being told about it would be
      // an error message for changing your mind.
      if (error?.name === 'AbortError') return;
      say('A picture on this print could not be read, so it cannot be saved.', 4000);
    }
  }, [compose, fileName, copyLink, say, canSend]);
  const dismissPicture = useCallback(() => { setPicture(null); setStatus(''); }, []);

  // The address alone, without a picture.
  const copy = useCallback(async () => {
    if (!link) return;
    if (await copyLink()) say(COPIED);
    else say(link, 6000);   // no clipboard here; showing it beats swallowing it
  }, [link, copyLink, say]);

  return { save, copy, status, canSend, picture, dismissPicture };
}
