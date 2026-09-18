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
// `says` is what it means for the person reading it, and it is the only thing
// set in reading type: what has happened, and whether their writing is safe.
// That second half is the whole job — the frightening part of a failed save
// is never the failure, it is not knowing what it took with it.
//
// Two sentences at most, and short ones. The first draft of this explained
// itself — "your writing is safe on this phone, and it is what a finished
// listen is built from" — and Miyel's answer was "cut the writing, I don't
// think even I understand it." A sentence about how the software works is a
// sentence somebody has to parse at the one moment they are least able to.
// Whatever is left over goes in `because`, or it goes nowhere.
//
// "This device" rather than "this phone", 2026-09-18. A copy runs wherever
// its keeper opens it, and telling somebody on a laptop that their writing is
// safe on their phone is telling them it is somewhere else.
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
