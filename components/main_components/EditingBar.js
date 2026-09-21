// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// components/main_components/EditingBar.js
// The band at the foot that says what you are in the middle of, and the two
// words that end it.
//
// ── Why it is a component now, 2026-09-21 ─────────────────────────────────
// It was the same fifteen lines written out by hand in three files: an entry
// being corrected, the identity card being corrected, and a send being
// credited. They shared a stylesheet and nothing else, and the cost of that
// showed up twice in one day — turning the pills into words was the same edit
// made three times, and the session preview, which borrows this band under its
// own name, had quietly drifted into having no glyphs while the other three
// still did. Miyel: "yes make it one component."
//
// ── What it owns ──────────────────────────────────────────────────────────
// All of it, including Save and Cancel, because all three said exactly that
// and said it identically. A bar that only lent out its band and its label
// would have left the two words to drift the way the glyphs did. If something
// ever wants a different pair, that is the day it grows a prop — not before.
//
// ── What it does not own ──────────────────────────────────────────────────
// The session preview's foot. That is the same band by design and says so in
// its own file, but it is a different class at a different height over a
// different surface (`.ses-preview-bar`, z-index 220, outside the cross), and
// its words are Go back and Save to journal — a different act, deliberately
// worded differently. Borrowing the look is not the same as being the thing.
//
// ── And the band it changes places with ───────────────────────────────────
// On the card this bar takes the four doors' place rather than covering them:
// the doors drop out of the window as this rises, and on the way back this
// sinks first and they follow a beat later. That belongs to the card, because
// it is the only surface with a band to swap with — an entry has none — so it
// stays in About.js along with `going`, which is what keeps this mounted for
// the length of the way out. Unmounted on the frame it stops being wanted, a
// row does not leave, it vanishes.

export default function EditingBar({
  // What you are in the middle of. "Editing" on a correction, "Crediting" on
  // a send. It is the one thing on the bar that is not a button, and it is
  // what stops two borrowed controls reading as a toolbar that follows you
  // everywhere (SessionPreview.js made that argument first).
  word = 'Editing',
  onSave,
  onCancel,
  // Mid-save. The word becomes Saving and both controls stand down, so a
  // second press cannot start a second one.
  saving = false,
  // Any other reason Save cannot be pressed yet — the card waits on a picture
  // finishing, a credit waits on somebody being chosen. Cancel is never held
  // by it: getting out must not depend on the thing you are getting out of.
  held = false,
  // On its way down. See the note above; only the card has one.
  going = false,
}) {
  return (
    <div className={'ln-editing-bar' + (going ? ' ln-editing-bar--going' : '')}>
      <span className="ln-editing-label">{word}</span>
      <button type="button" className="ln-word ln-word--on" onClick={onSave} disabled={saving || held}>
        {saving ? 'Saving' : 'Save'}
      </button>
      <button type="button" className="ln-word" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </div>
  );
}
