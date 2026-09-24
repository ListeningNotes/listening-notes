// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/JournalCopy.js
// Back up your journal: the export, as a button in Settings.
//
// ── Why a button ──────────────────────────────────────────────────────────
// /api/export has handed over the whole journal since 2026-08-27, and nothing
// on the site led to it: a keeper had to type the address into a browser they
// were signed in on, and a journal on a home screen has no address bar. So
// every copy's one backup was a thing nobody could find (NOTES, 2026-09-23).
//
// ── Two presses, the printer's shape ──────────────────────────────────────
// Make a copy, then hand it over — Miyel's picture of it: "you click it and
// it copies it, holds it and you can export it wherever". It is also the only
// shape a phone allows. Safari opens the share sheet only straight after a
// press, and fetching the journal takes a moment, so one press that fetched
// and then shared would be refused; the printer found that first
// (hooks/usePress.js). Between the two presses the copy is held in this page
// and nowhere else — a copy kept inside the journal goes down with it.
//
// ── Where it goes ─────────────────────────────────────────────────────────
// On a phone, the share sheet: Mail, Save to Files, AirDrop. Emailing it to
// yourself is one press, and it is the phone that sends it — the journal
// never sends email (DECISIONS). On a computer, Downloads: a Mac's share
// sheet has nowhere to save a file, and a download is what somebody at a
// desk means by keeping a copy.
//
// ── What is in it ─────────────────────────────────────────────────────────
// Every table but the vault (app/api/export/route.js): the password and the
// key that signs you in never leave in a file, because a file travels. The
// line after the copy is made says what it holds, so pressing it is seeing
// a backup rather than trusting one.

'use client';

import { useState } from 'react';

export default function JournalCopy() {
  const [copy, setCopy] = useState(null);
  const [busy, setBusy] = useState(false);
  const [trouble, setTrouble] = useState('');

  // Fetches the whole journal and holds it as a file, ready to hand over.
  async function makeCopy() {
    setBusy(true);
    setTrouble('');
    try {
      const res = await fetch('/api/export', { cache: 'no-store' });
      if (res.status === 401) throw new Error('You’ve been signed out. Sign in again and press it once more.');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Your journal could not be copied. Try again.');
      }
      const blob = await res.blob();
      const tables = JSON.parse(await blob.text()).tables || {};
      // The name the export gives itself, so a copy made here and one
      // downloaded from the address are called the same thing.
      const name = res.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] || 'journal.json';
      const file = new File([blob], name, { type: 'application/json' });
      const entries = tables.entries?.length ?? 0;
      const people = tables.people?.length ?? 0;
      const size = blob.size < 1024 * 1024
        ? `${Math.max(1, Math.round(blob.size / 1024))} KB`
        : `${(blob.size / 1024 / 1024).toFixed(1)} MB`;
      setCopy({
        file,
        // A finger, and a share sheet that will take this file: a phone.
        // Asked of this file rather than of any file, because a sheet that
        // takes a picture need not take a journal.
        share: navigator.maxTouchPoints > 0 && Boolean(navigator.canShare?.({ files: [file] })),
        said: `Ready — ${entries} ${entries === 1 ? 'entry' : 'entries'}, ${people} ${people === 1 ? 'person' : 'people'} · ${size}`,
      });
    } catch (error) {
      setTrouble(error?.message || 'Your journal could not be copied. Try again.');
    }
    setBusy(false);
  }

  // Gives the held copy to the share sheet, or saves it to Downloads.
  async function handOver() {
    if (!copy) return;
    setTrouble('');
    try {
      if (copy.share) {
        await navigator.share({ files: [copy.file] });
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(copy.file);
        a.download = copy.file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }
    } catch (error) {
      // Closing the share sheet rejects, and being told about it would be an
      // error message for changing your mind.
      if (error?.name === 'AbortError') return;
      setTrouble('That could not be handed over from here.');
    }
  }

  return (
    <>
      <p className="st-note">
        Everything you’ve written, your card and your address book, in one
        file — email it to yourself, or keep it somewhere safe. Your password
        isn’t in it.
      </p>
      <div className="st-foot">
        {copy ? (
          <button type="button" className="st-save ln-word ln-word--on" onClick={handOver}>
            {copy.share ? 'Share' : 'Download'}
          </button>
        ) : (
          <button type="button" className="st-save ln-word ln-word--on" onClick={makeCopy} disabled={busy}>
            {busy ? 'Copying…' : 'Make a copy'}
          </button>
        )}
        {copy && !trouble && <span className="st-said" role="status">{copy.said}</span>}
        {trouble && <span className="st-trouble" role="alert">{trouble}</span>}
      </div>
    </>
  );
}
