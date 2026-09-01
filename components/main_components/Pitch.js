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
// that is not there.
//
// ── The source line ─────────────────────────────────────────────────────────
// It sat at the foot of the About pane and belongs here instead: that pane is
// the public page about a person and this is the public page about the
// software, and an offer of source is about the software.
//
// It has to stay on a *public* pane, though, and that is not a preference.
// AGPL §13 obliges a copy modified and run over a network to offer its source
// to the people using it — visitors, not the owner. Behind the wristband, on a
// settings page only its keeper can reach, the offer is not made to anyone it
// is owed to. So it lives here, in the smallest type on the site, on the one
// pane a stranger arrives at asking what this software is.

'use client';

const HOME = 'https://www.listeningnotes.blog/get';

import WritingAccess from './WritingAccess';

// Where this copy's source lives. §13 asks for the source of *the running
// program*, which for a modified copy is that copy's own repository and not
// this one — so an owner who has changed anything points this at their fork
// with NEXT_PUBLIC_SOURCE_URL. Defaulted to upstream, because the honest
// answer for an unmodified copy is upstream and nobody should have to think
// about compliance to install a journal.
//
// An environment variable and nothing else. This wanted a settings column
// once, and the answer is no: almost nobody modifies the code, anybody who
// does is already comfortable with environment variables, and a developer
// section in the settings would advertise a capability most owners neither
// need nor should have to think about. The settings page is about the journal,
// not about the software.
//
// The fallback was pointing at a repository that does not exist, which is the
// §13 offer being attempted and missed — worse than a link that is merely
// broken, because it looks discharged.
const SOURCE_URL =
  process.env.NEXT_PUBLIC_SOURCE_URL || 'https://github.com/ListeningNotes/listening-notes';

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

        {/* No version number: a version is a thing to keep current, and a line
            that goes stale is worse than a line that is simply true. */}
        <div className="pt-foot">
          <a className="pt-source" href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
            Source
          </a>
          {/* The visible way in, and the only one. Three taps on the mark is
              the everyday door; this is here for the day that gesture does not
              work on somebody's phone, and for the fact that a door only one
              person needs should still be findable by that person.

              This pane is what a logged-out visitor is shown, which is exactly
              and only when a sign-in line is any use. */}
          <WritingAccess label="Sign in" align="center" />
        </div>
      </div>
    </div>
  );
}
