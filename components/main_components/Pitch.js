// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/Pitch.js
// The right pane of the cross, seen by everyone who is not the owner.
//
// This is the growth mechanic and it is deliberately the quietest thing on the
// site. Somebody is holding the phone asking how you got this; the owner
// swipes right and hands it back. That is the whole mechanism — no banner, no
// footer link on every page, no interstitial. One pane, arrived at on purpose.
//
// It ships on every copy and cannot be turned off, which is the one thing here
// that is not the owner's choice. The reason is that a copy is free and the
// only thing asked in return is that the next person can find out where it
// came from. It is also why the address below is fixed rather than read from
// settings: there is exactly one Listening Notes at one address, and a copy
// that could point this button somewhere else is a copy that could quietly
// substitute itself for the original.
//
// The pane deliberately does not scroll. The three sentences are the whole
// pitch and there is no more of it — HomeNav measures the pane rather than
// being told, so no down caret is drawn and nothing promises a second screen
// that is not there. What sits at the foot instead is the source line, which
// is the same question this pane is already answering.

'use client';

const HOME = 'https://www.listeningnotes.blog/get';

export default function Pitch() {
  return (
    <div className="pt-pane">
      <div className="pt-body">
        <h1 className="pt-title">What this is</h1>

        {/* Three sentences, and the count is the design. Everything true about
            this software that a stranger needs in the ten seconds they are
            holding somebody else's phone: it is free, it is theirs, and the
            writing does not go anywhere. A fourth sentence is a pitch; three
            is an answer. */}
        <div className="pt-prose">
          <p>A listening journal you keep yourself.</p>
          <p>The software is free and you run your own copy of it, at your own address.</p>
          <p>Nobody hosts it, nobody counts your readers, and what you write stays in your own database.</p>
        </div>

        <a className="ln-pill pt-cta" href={HOME} target="_blank" rel="noopener noreferrer">
          Get Listening Notes
        </a>
      </div>
    </div>
  );
}
