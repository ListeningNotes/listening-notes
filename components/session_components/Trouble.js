// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';

// Something in a listen went wrong. Miyel named this on 2026-09-18, after a
// draft save failed on her phone and the browser answered in its own voice:
//
//   Saving the draft failed: invalid input syntax for type integer: "4.5"
//
// in a black rounded box with a blue Close, over a screen that looks nothing
// like that. "It doesn't match our site, so we can add some kind of error
// dialogue." Three window.alert() calls inside a listen came out for this
// one — the draft failing to save, the preview failing to build, and the
// entry failing to save, which is the one that matters.
//
// ── Two sentences, in that order ──────────────────────────────────────────
// `says` is what it means for the person holding the phone, and it is the
// only thing set in reading type: what has happened, and whether their
// writing is safe. That second half is the whole job. The frightening part
// of a failed save is never the failure, it is not knowing what it took with
// it, and a message that answers that first can afford to be calm about the
// rest.
//
// `because` is the machine's own account, underneath, in the small label
// face. Kept rather than swallowed, because it is what gets read out to
// somebody who can fix it — that integer line is exactly how migration 019
// was found — and because a message with nothing behind it is a message you
// cannot act on. Small enough to ignore, present enough to quote.
//
// ── The shape ─────────────────────────────────────────────────────────────
// The band at the foot, which is the site's one place for something you act
// on: the entry's editing bar, the preview's Go back and Save to journal.
// Not a box in the middle of the screen — this software has no such thing,
// and inventing one for bad news would make the bad news feel bigger than it
// usually is.
//
// It sits above the preview's own bar (z-index) because the save that fails
// is pressed there, and the answer must not arrive underneath the button
// that asked for it.
export default function Trouble({ says, because, onClose }) {
  if (!says) return null;
  return (
    <div className="ses-trouble" role="alert">
      <p className="ses-trouble-says">{says}</p>
      {because && <p className="ses-trouble-because">{because}</p>}
      <button type="button" className="ln-pin" onClick={onClose}>Close</button>
    </div>
  );
}
