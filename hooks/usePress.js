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
  const timer = useRef(null);
  const canSend = useSyncExternalStore(never, probeCanShare, onServer);

  const copyLink = useCallback(() => {
    if (!link || typeof navigator === 'undefined' || !navigator.clipboard) return Promise.resolve(false);
    return navigator.clipboard.writeText(link).then(() => true, () => false);
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

  const save = useCallback(async frameKey => {
    const pasted = copyLink();
    try {
      const blob = await compose(frameKey);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName(frameKey);
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      if (await pasted) say(COPIED); else setStatus('');
    } catch {
      say('A picture on this print could not be read, so it cannot be saved.', 4000);
    }
  }, [compose, fileName, copyLink, say]);

  const send = useCallback(async frameKey => {
    const pasted = copyLink();
    try {
      const blob = await compose(frameKey);
      const file = new File([blob], fileName(frameKey), { type: 'image/png' });
      await navigator.share({ files: [file] });
      if (await pasted) say(COPIED); else setStatus('');
    } catch (error) {
      // Cancelling the share sheet rejects, and being told about it would be
      // an error message for changing your mind.
      if (error?.name === 'AbortError') return;
      say('That could not be sent from here — save it instead.', 4000);
    }
  }, [compose, fileName, copyLink, say]);

  // The address alone, without a picture.
  const copy = useCallback(async () => {
    if (!link) return;
    if (await copyLink()) say(COPIED);
    else say(link, 6000);   // no clipboard here; showing it beats swallowing it
  }, [link, copyLink, say]);

  return { save, send, copy, status, canSend };
}
